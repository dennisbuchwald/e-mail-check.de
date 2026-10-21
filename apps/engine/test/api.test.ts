import { describe, expect, it } from 'vitest';
import type { MailResult } from '@emc/shared';
import { createApi } from '../src/api.ts';
import { TestService } from '../src/service.ts';
import { Store } from '../src/store.ts';
import { fakeResolver, fixture, GOOD_IP } from './helpers.ts';

function setup(now = () => new Date()) {
	const store = new Store(':memory:');
	const service = new TestService({
		store,
		testDomain: 'test.e-mail-check.de',
		testTtlMinutes: 60,
		now,
		deps: { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: async () => ({ score: 0, symbols: [] }), now },
	});
	const app = createApi({ service, resolver: fakeResolver(), rateLimit: { tests: 3, dns: 2 }, trustProxy: true, clientIp: (c) => c.req.header('x-test-ip') ?? '1.1.1.1' });
	return { store, service, app };
}

describe('API', () => {
	it('creates a test address and serves the result as noindex', async () => {
		const { app, service } = setup();
		const res = await app.request('/api/tests', { method: 'POST' });
		expect(res.status).toBe(201);
		const test = await res.json();
		expect(test.address).toMatch(/^[a-z2-9]{8}@test\.e-mail-check\.de$/);

		await service.handleMessage(test.address, fixture('gut.eml'), { ip: GOOD_IP, helo: 'mail.gut.example.test', sender: 'max@gut.example.test' });
		const status = await (await app.request(`/api/tests/${test.id}`)).json();
		expect(status.state).toBe('done');

		const r = await app.request(`/api/results/${status.resultId}`);
		expect(r.headers.get('x-robots-tag')).toContain('noindex');
		const result = (await r.json()) as MailResult;
		expect(result.score).toBe(10);
		// Only the summary is stored, never message content.
		expect(JSON.stringify(result)).not.toContain('Angebot für die neue Website');
	});

	it('keeps subject and From address in RAM only, never in the database', async () => {
		const { app, service, store } = setup();
		const test = await (await app.request('/api/tests', { method: 'POST' })).json();
		const res = (await service.handleMessage(test.address, fixture('gut.eml'), { ip: GOOD_IP, helo: 'x', sender: 'max@gut.example.test' }))!;
		const stored = store.getResult(res.id)!;
		expect(stored.mail.subject).toBeNull();
		expect(stored.mail.from).toBeNull();
		const served = (await (await app.request(`/api/results/${res.id}`)).json()) as MailResult;
		expect(served.mail.subject).toBe('Angebot Website');
		expect(served.mail.from).toBe('max@gut.example.test');
	});

	it('streams progress via SSE, replaying finished steps', async () => {
		const { app, service } = setup();
		const test = service.createTest();
		await service.handleMessage(test.address, fixture('gut.eml'), { ip: GOOD_IP, helo: 'x', sender: 'max@gut.example.test' });
		const res = await app.request(`/api/tests/${test.id}/events`);
		expect(res.headers.get('content-type')).toContain('text/event-stream');
		const text = await res.text();
		expect(text.match(/event: step/g)).toHaveLength(6);
		expect(text).toContain('event: done');
		// Live extras: who sent it, interim status and real values per check.
		const steps = [...text.matchAll(/event: step\ndata: (.+)/g)].map((m) => JSON.parse(m[1]));
		expect(steps[0].mail).toEqual({ from: 'max@gut.example.test', subject: 'Angebot Website' });
		expect(steps.find((e) => e.step === 'spf')).toMatchObject({ status: 'ok', detail: expect.stringContaining('gut.example.test erlaubt') });
		expect(steps.find((e) => e.step === 'reputation').detail).toMatch(/Sperrlisten abgefragt, alle sauber/);
	});

	it('serves the public counter without any number below 50', async () => {
		const { app, service } = setup();
		const test = service.createTest();
		await service.handleMessage(test.address, fixture('gut.eml'), { ip: GOOD_IP, helo: 'x', sender: 'max@gut.example.test' });
		const res = await app.request('/api/stats');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ testsToday: null });
	});

	it('rate-limits test creation per IP', async () => {
		const { app } = setup();
		const codes = [];
		for (let i = 0; i < 4; i++) codes.push((await app.request('/api/tests', { method: 'POST' })).status);
		expect(codes).toEqual([201, 201, 201, 429]);
		expect((await app.request('/api/tests', { method: 'POST', headers: { 'x-test-ip': '2.2.2.2' } })).status).toBe(201);
	});

	it('expires results after 7 days and purges them', async () => {
		let t = new Date('2026-10-21T10:00:00Z');
		const { app, service, store } = setup(() => t);
		const test = service.createTest();
		const result = (await service.handleMessage(test.address, fixture('gut.eml'), { ip: GOOD_IP, helo: 'x', sender: 'max@gut.example.test' }))!;
		expect((await app.request(`/api/results/${result.id}`)).status).toBe(200);
		t = new Date('2026-10-28T10:00:01Z');
		expect((await app.request(`/api/results/${result.id}`)).status).toBe(404);
		expect(store.purge(t)).toBeGreaterThan(0);
	});

	it('expires unused addresses', async () => {
		let t = new Date('2026-10-21T10:00:00Z');
		const { app, service } = setup(() => t);
		const test = service.createTest();
		t = new Date('2026-10-21T11:00:01Z');
		expect(service.acceptsRecipient(test.address)).toBe(false);
		expect((await (await app.request(`/api/tests/${test.id}`)).json()).state).toBe('expired');
	});

	it('validates DNS check input', async () => {
		const { app } = setup();
		expect((await app.request('/api/dns?domain=kein%20name')).status).toBe(400);
		expect((await app.request('/api/dns?domain=gut.example.test')).status).toBe(200);
		expect((await app.request('/api/tests/../../etc')).status).toBe(404);
	});
});
