// Types for the generated scene module (scripts/build-mailroute.mjs).
type Engine = { set(v: number): void; destroy(): void };
type Read = { textContent: string };
export declare const HL: {
	inject(root: Node): void;
	mk(tag: string, attrs: Record<string, string | number>, parent: Element): SVGElement;
	register(stage: Element, tick: (dt: number, now: number) => boolean): { wake(): void; unregister(): void };
};
export declare const spec: { mount(host: { stage: HTMLElement; svg: SVGElement; read: Read }, value: number): Engine };
