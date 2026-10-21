/**
 * Mailroute: the way of one mail, as a belt from back left to front right.
 * A laptop sends it, a stamp seals it, a barrier with a lock lets it through,
 * a server rack with a clipboard looks it up, a closed tube carries it and a
 * sieve over a tray takes it in; at the end it rises, turns to the viewer and
 * becomes the logo with its green check. The envelope is the only thing that
 * travels. The slider is its progress, 0 to 1: it waits at every station for
 * the station's own moment, all of them pure functions of progress, so they
 * run forwards and backwards. Only the markers' bounce and the final pop run
 * on time, once their threshold is crossed. The pointer leans the camera a
 * little and names the station under it.
 *
 * Grown past the skill's 200 lines on purpose (STARTSEITE-WEG-FEINSCHLIFF-PROMPT.md):
 * eleven small moments in one scene. Classes beyond the kernel's palette
 * (ink, knock, ko, shadow, mk-*, badge, check, pulse, seal) are styled by the page.
 */
const { Cam, bezier, circ, clamp, facing, fillet, fit, hull, lerp, open, poly, prism, proj, rad, reducedMotion, rings, ringAt, rrect, seg, spring, stepS, disposer, mk, place, pointer, register, solid, put } = HL;

const X = [-32, 44, 100, 152, 225, 301], NAMES = ["01 spf", "02 dkim", "03 dmarc", "04 rbl", "05 tls", "06 inbox"];
const EW = 15, EH = 22, TURN = -34, BELT = 3, LID = rad(102), HX = -48, HZ = 2.6;
const POP = bezier(0.34, 1.56, 0.64, 1), EASE = bezier(0.32, 0.72, 0, 1);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const bump = (a, b, c, d, v) => sstep(a, b, v) * (1 - sstep(c, d, v));
const shift = (ring, dx, dy) => ring.map((q) => ({ ...q, u: q.u + dx, v: q.v + dy }));
const box = (P, f, x0, y0, x1, y1, z0, z1, r, b) => { const [o, i] = rings(x0, y0, x1, y1, r, b); return prism(P, f, o, i, z0, z1); };
const rr = (u0, v0, u1, v1, r) => rrect(u0, v0, u1, v1, r, 3).map((q) => [q.u, q.v]);
/** The phase of station i's moment: 0 when the envelope arrives, 1 when it leaves. */
const phase = (p, i) => clamp((p - (i / 5 - 0.045)) / 0.09, 0, 1);

/** Where the envelope is at progress p, how it is turned (deg) and how large it is. */
function travel(p) {
  if (p < 0.1) { const t = sstep(0.05, 0.1, p); return { x: lerp(-20, 2, t), z: BELT, s: t ? 0.45 + 0.55 * POP(t) : 0, rot: TURN, hidden: t === 0 }; }
  const N = [[0.1, 2], [0.155, X[1]], [0.245, X[1]], [0.355, 74], [0.445, 74], [0.555, X[3]], [0.645, X[3]], [0.755, X[4]], [0.845, X[4]], [0.88, 262]];
  for (let k = 1; k < N.length; k++) if (p <= N[k][0]) return { x: lerp(N[k - 1][1], N[k][1], EASE((p - N[k - 1][0]) / (N[k][0] - N[k - 1][0]))), z: BELT, s: 1, rot: TURN };
  if (p <= 0.93) { const t = (p - 0.88) / 0.05; return { x: lerp(262, X[5], t), z: BELT + 49 * Math.sin((t * Math.PI) / 2), s: 1, rot: TURN }; }
  if (p <= 0.975) { const t = clamp((p - 0.93) / 0.025, 0, 1); return { x: X[5], z: 52 - 44 * t * t, s: 1, rot: TURN }; }
  const t = EASE(clamp((p - 0.975) / 0.02, 0, 1));
  return { x: X[5], z: lerp(8, 42, t), s: 1, rot: lerp(TURN, -45, t), front: t };
}

/** The scene for one camera and one moment: every path, keyed by part. */
function scene(C, p, lite) {
  const P = proj(C), f = facing(C), e = travel(p), out = {}, on = (v) => (lite ? 0 : v);
  const c = Math.cos(C.az), zf = Math.sqrt(1 - C.k * C.k);
  const seen = (ny, nz) => c * ny * zf + nz * C.k > 0;
  const plane = (pts, map) => poly(pts.map(([u, v]) => P(...map(u, v))));
  const ph = X.map((_, i) => phase(p, i)), ph0 = clamp(p / 0.1, 0, 1);
  // the belt, with a dashed guide down its middle
  out.belt = box(P, f, -12, -12, 262, 12, 0, BELT, 12, 1.5);
  out.guide = seg(P(2, 0, BELT), P(248, 0, BELT));
  // 01 laptop: base with keyboard and trackpad, a hinge, a lid open at 102° with bezel and a mail window
  out.lapBase = box(P, f, HX, -23, -16, 23, 0, HZ, 3, 1.1);
  const keys = [];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 10; k++) keys.push(poly(rr(HX + 3.2 + r * 3.4, -18.6 + k * 3.72, HX + 6.1 + r * 3.4, -15.4 + k * 3.72, 0.5).map(([x, y]) => P(x, y, HZ))));
  out.lapKeys = keys.join("");
  out.lapKb = poly(rr(HX + 2.4, -19.4, HX + 17.6, 19.4, 1.2).map(([x, y]) => P(x, y, HZ)));
  out.lapPad = poly(rr(-30, -7.5, -21, 7.5, 1.4).map(([x, y]) => P(x, y, HZ)));
  const hinge = (y) => circ(1.4, 16).map((q) => P(HX + q.u, y, HZ + q.v));
  out.lapHinge = poly(hull(hinge(-17).concat(hinge(17))));
  const lid = (w) => (u, v) => [HX + v * Math.cos(LID) + w * Math.sin(LID), u, HZ + v * Math.sin(LID) - w * Math.cos(LID)];
  const lidShape = rr(-23, 0, 23, 32, 2.6);
  out.lapLid = poly(hull(lidShape.map(([u, v]) => P(...lid(0.9)(u, v))).concat(lidShape.map(([u, v]) => P(...lid(-0.9)(u, v))))));
  out.lapBezel = plane(rr(-21.4, 2.6, 21.4, 30.4, 1.6), lid(0.95));
  out.lapWin = plane(rr(-15, 6, 15, 27, 1.4), lid(1));
  out.lapBar = seg(P(...lid(1)(-15, 23.6)), P(...lid(1)(15, 23.6)));
  out.lapTo = seg(P(...lid(1)(-13, 20.6)), P(...lid(1)(-10.5, 20.6))) + seg(P(...lid(1)(-8.5, 20.6)), P(...lid(1)(7, 20.6)));
  const typed = lite ? 3 : clamp(ph0 / 0.4, 0, 1) * 3;
  out.lapText = [[16.6, 24], [13.6, 20], [10.6, 12]].map(([v, L], k) => { const t = clamp(typed - k, 0, 1); return t ? seg(P(...lid(1)(-13, v)), P(...lid(1)(-13 + L * t, v))) : ""; }).join("");
  const press = on(bump(0.4, 0.45, 0.5, 0.56, ph0));
  out.lapSend = plane(rr(6 + press * 0.4, 7.2 + press * 0.3, 13 - press * 0.4, 10.4 - press * 0.3, 1), lid(1 - press * 0.5));
  out.lapPressed = press > 0.3;
  // 02 stamp: a post with an arm; the stamp drops, presses the envelope flat for a beat and rises
  const d1 = on(sstep(0, 0.3, ph[1]) * (1 - sstep(0.6, 0.95, ph[1]))), q1 = on(bump(0.28, 0.36, 0.42, 0.56, ph[1]));
  const sq = 1 - 0.14 * q1, top = BELT + EH * sq, hb = lerp(top + 11, top, d1);
  out.post = box(P, f, 40, -34, 48, -26, 0, 64, 2, 1);
  out.arm = box(P, f, 40, -34, 48, 4, 58, 63, 2, 1);
  out.rod = prism(P, f, shift(circ(1.8, 16), 44, 0), null, hb + 8, 58);
  out.rubber = box(P, f, 35, -9, 53, 9, hb, hb + 2.4, 1.2, 0.6);
  out.grip = box(P, f, 37.5, -6.5, 50.5, 6.5, hb + 2.4, hb + 8, 2, 1);
  const k1 = q1 * 8;
  out.strikes = k1 > 0.4 ? [[-1, EH - 1, -1, 0.7], [1, EH - 1, 1, 0.7], [-1, EH - 8, -1, 0], [1, EH - 8, 1, 0]].map(([sx, v, dx, dv]) => seg(P(e.x + sx * (EW + 2), 1.2, BELT + v * sq), P(e.x + sx * (EW + 2) + dx * k1, 1.2, BELT + v * sq + dv * k1))).join("") : "";
  // 03 barrier: the lock clicks open, then the arm swings up; it closes again behind the envelope
  const shk = sstep(0.355, 0.38, p) * (1 - sstep(0.52, 0.55, p)), opn = sstep(0.37, 0.43, p) * (1 - sstep(0.52, 0.56, p)), a = rad(88 * opn);
  out.pillar = box(P, f, 95, -30, 105, -19, 0, 40, 2, 1);
  out.lockBody = box(P, f, 97.2, -19, 102.8, -15.6, 25, 32, 1.3, 0.6);
  const lift = 2.6 * shk, arc = [];
  for (let k = 0; k <= 12; k++) { const t = (Math.PI * k) / 12; arc.push(P(100 + 2 * Math.cos(t), -17.3, 32 + lift + 2.4 * Math.sin(t))); }
  out.shackle = open([P(102, -17.3, 31.5 + lift * 0.4), ...arc, P(98, -17.3, 32)]);
  const arm = (dx) => (u, v) => [dx, -18 + u * Math.cos(a) - v * Math.sin(a), 18 + u * Math.sin(a) + v * Math.cos(a)];
  const armShape = rr(-2.4, -2.2, 38, 2.2, 1.6);
  out.gate = poly(hull(armShape.map(([u, v]) => P(...arm(97.5)(u, v))).concat(armShape.map(([u, v]) => P(...arm(102.5)(u, v))))));
  out.gateHub = poly(circ(1.8, 16).map((q) => P(...arm(102.6)(q.u, q.v))));
  out.gateStripes = [12, 21, 30].map((u) => seg(P(...arm(102.5)(u, -2.2)), P(...arm(102.5)(u + 3.4, 2.2)))).join("");
  out.armKey = opn > 0.5 ? -90 : 100;
  // 04 rack: the lights run down one after the other, three rows on the clipboard tick off
  out.rack = box(P, f, 138, -60, 166, -32, 0, 64, 3, 1.5);
  out.blades = [10, 18, 26, 34, 42, 50, 58].map((z) => seg(P(141, -32, z), P(163, -32, z))).join("");
  out.leds = [14, 22, 30, 38, 46, 54].map((z) => P(160, -32, z));
  out.ledOn = out.leds.map((_, k) => !lite && bump(0.08 + k * 0.1, 0.1 + k * 0.1, 0.2 + k * 0.1, 0.22 + k * 0.1, ph[3]) > 0.5);
  const clip = (dx) => (u, v) => [166.4 + dx, u, v];
  out.boardBack = plane(rr(-57, 18, -37, 44, 1.2), clip(0));
  out.board = plane(rr(-57, 18, -37, 44, 1.2), clip(1.2));
  out.boardClip = plane(rr(-50, 41.5, -44, 46, 1), clip(1.4));
  const ticks = lite ? (ph[3] > 0 ? 3 : 0) : [0.35, 0.55, 0.75].filter((t) => ph[3] >= t).length;
  out.boardText = [36, 31, 26].map((v, k) => (k < ticks ? open([P(...clip(1.4)(-55, v)), P(...clip(1.4)(-53.8, v - 1.3)), P(...clip(1.4)(-51.4, v + 1.4))]) : "") + seg(P(...clip(1.4)(-49.6, v)), P(...clip(1.4)(-39.5, v)))).join("") + seg(P(...clip(1.4)(-55, 21.5)), P(...clip(1.4)(-45, 21.5)));
  // 05 tube: closed; a pulse runs through it with the envelope, which comes out with a small lock beside it
  const TR = 15, ring = (x, R) => circ(R, 48).map((q) => P(x, q.u, TR + q.v));
  const front = (x, R) => open(circ(R, 48).filter((q) => seen(q.u, q.v)).map((q) => P(x, q.u, TR + q.v)));
  out.tube = poly(hull(ring(200, TR).concat(ring(250, TR))));
  out.tubeRim = poly(ring(250, TR));
  out.tubeIn = poly(ring(250, TR - 2.2));
  out.bands = front(208, TR + 0.4) + front(242, TR + 0.4);
  const pulse = on(ph[4] > 0 && ph[4] < 1 ? 1 : 0);
  const px = 203 + 44 * ph[4];
  out.pulse = pulse ? front(px, TR + 0.5) : "";
  // 06 tray with a sieve on top: it gives way once as the envelope lands, then springs back
  const give = on(Math.sin(clamp((p - 0.955) / 0.02, 0, 1) * Math.PI) * 2.2), tt = 22 - give;
  out.tray = box(P, f, 284, -17, 318, 17, 0, tt, 3, 1.5);
  out.slot = poly(rr(291, 9, 311, 12.6, 1.6).map(([u, v]) => P(u, 17, v * (tt / 22))));
  out.sieve = prism(P, f, shift(circ(14, 48), X[5], 0), shift(circ(12.4, 48), X[5], 0), tt, tt + 5);
  const mesh = [];
  for (let d = -9; d <= 9; d += 4.5) { const h = Math.sqrt(144 - d * d) - 0.6; mesh.push(seg(P(X[5] + d, -h, tt + 1), P(X[5] + d, h, tt + 1)), seg(P(X[5] - h, d, tt + 1), P(X[5] + h, d, tt + 1))); }
  out.mesh = mesh.join("");
  // the envelope: ink, the logo's flap knocked out in white, squashed by the stamp, turned to the viewer at the end
  const R = rad(e.rot), W = EW * e.s * (1 + 0.05 * q1), Hh = EH * e.s * sq * lerp(1, 1 / zf, e.front || 0);
  const env = (dy) => (u, v) => [e.x + u * Math.cos(R) - dy * Math.sin(R), u * Math.sin(R) + dy * Math.cos(R), e.z + v];
  const shape = rr(-W, 0, W, Hh, Hh * 0.21);
  out.envBack = plane(shape, env(-1));
  out.envFace = plane(shape, env(1));
  out.envFlap = open([[-0.581, 0.677], [0, 0.387], [0.581, 0.677]].map(([u, v]) => P(...env(1.05)(u * W, v * Hh))));
  const bl = P(...env(1)(-W, 0)), br = P(...env(1)(W, 0)), tr = P(...env(1)(W, Hh)), sw = Math.hypot(br[0] - bl[0], br[1] - bl[1]);
  out.flapW = r2(sw * (9 / 86));
  out.seal = P(...env(1.1)(0, 0.62 * Hh));
  out.sealed = !lite && p > 0.21 && p < 0.97;
  out.envKey = e.z > 24 && e.x > 270 ? 500 : e.x;
  out.envShown = !e.hidden && !(e.x === X[5] && e.z < tt + 4);
  out.shadow = out.envShown && e.z < 30 ? { c: P(e.x, 0, e.z > BELT + 1 ? tt + 5 : BELT), rx: W * C.S * 0.78, ry: W * C.S * 0.2 } : null;
  out.speed = !lite && p > 0.06 && p < 0.13 ? [5, 11, 17].map((v, k) => { const L = 9 * bump(0.06, 0.08, 0.1, 0.13, p) * (1 - k * 0.2); return seg(P(e.x - W - 2 - L, 0, BELT + v), P(e.x - W - 2, 0, BELT + v)); }).join("") : "";
  // the small lock that rides beside the envelope once it is out of the tube
  const lk = on(bump(0.866, 0.872, 0.885, 0.9, p));
  out.encLock = lk ? (() => { const o = (u, v) => P(...env(1)(W + 3 + 1.7 * u * lk, Hh - 9 + 1.7 * v * lk)); const sh = []; for (let k = 0; k <= 10; k++) { const t = (Math.PI * k) / 10; sh.push(o(2.5 + 1.8 * Math.cos(t), 4 + 1.9 * Math.sin(t))); } return poly(rr(0, 0, 5, 4, 0.8).map(([u, v]) => o(u, v))) + open([o(4.3, 4), ...sh.slice(1, -1), o(0.7, 4)]); })() : "";
  // the logo's green check: top right of the turned envelope, in the logo's proportions
  out.finale = e.rot <= -44.9;
  const u = sw / 86;
  out.badge = { c: [tr[0] + 2 * u, tr[1] - 4 * u], r: 18 * u, ko: 25 * u, check: [[-7.5, 0.5], [-2, 6], [7.5, -4.5]].map(([dx, dy]) => [tr[0] + 2 * u + dx * u, tr[1] - 4 * u + dy * u]), w: 5 * u };
  // the markers: upright circles in front of the stations
  out.markers = [[-32, 31], [44, 22], [100, 24], [152, 22], [225, 22], [301, 26]].map(([x, y]) => P(x, y, 0));
  out.done = X.map((_, i) => (i === 0 ? p >= 0.1 : i < 5 ? ph[i] >= 1 : p >= 0.99));
  return out;
}
const r2 = (n) => Math.round(n * 100) / 100;

function mount({ stage, svg, read }, value) {
  const bag = disposer(), REST_AZ = 45, lite = stage.dataset.lite === "1";
  const prog = spring(value, { eps: 0.0005 }), az = spring(REST_AZ, { eps: 0.01 });
  const EXT = [[318, -17, 0], [318, 17, 0], [301, 26, 0], [-52, 32, 0], [-48, -23, 0], [138, -60, 64], [166, -60, 64], [44, -34, 64], [-55, 23, 34], [-55, -23, 34], [301, 0, 68]];
  const cam = (deg) => { const C = Cam(deg, 0.5, 1.32); fit(C, EXT, 200, 160); return C; };
  const C0 = cam(REST_AZ);

  const g = mk("g", {}, svg), groups = {}, el = {};
  const grp = (name, key) => (groups[name] = { g: mk("g", {}, g), key });
  const path = (gname, name, cls) => (el[name] = mk("path", { class: cls }, groups[gname].g));
  const sol = (gname, name) => (el[name] = solid(groups[gname].g));
  grp("belt", -300); sol("belt", "belt"); path("belt", "guide", "nf lo dash"); el.shadowEl = mk("ellipse", { class: "shadow", rx: 0, ry: 0 }, groups.belt.g);
  grp("laptop", -200); sol("laptop", "lapBase"); path("laptop", "lapKb", "nf lo"); path("laptop", "lapKeys", "nf lo"); path("laptop", "lapPad", "nf"); path("laptop", "lapHinge", "sil");
  path("laptop", "lapLid", "sil"); path("laptop", "lapBezel", "nf"); path("laptop", "lapWin", "nf"); path("laptop", "lapBar", "nf lo"); path("laptop", "lapTo", "nf lo"); path("laptop", "lapText", "nf"); path("laptop", "lapSend", "nf sil");
  grp("post", -190); sol("post", "post"); sol("post", "arm");
  grp("pillar", -180); sol("pillar", "pillar"); sol("pillar", "lockBody"); path("pillar", "shackle", "nf sil");
  grp("gate", 100); path("gate", "gate", "sil"); path("gate", "gateStripes", "nf lo"); path("gate", "gateHub", "nf");
  grp("rack", -170); sol("rack", "rack"); path("rack", "blades", "nf lo");
  el.leds = [0, 1, 2, 3, 4, 5].map(() => mk("circle", { r: 0.95, class: "dot off" }, groups.rack.g));
  grp("board", -160); path("board", "boardBack", "lo"); path("board", "board", "sil"); path("board", "boardClip", "nf"); path("board", "boardText", "nf");
  grp("stamp", 48); sol("stamp", "rod"); sol("stamp", "rubber"); sol("stamp", "grip");
  grp("tube", 250); path("tube", "tube", "sil"); path("tube", "bands", "nf lo"); path("tube", "pulse", "nf sil"); path("tube", "tubeRim", "nf sil"); path("tube", "tubeIn", "nf lo");
  grp("tray", 260); sol("tray", "tray"); path("tray", "slot", "nf lo"); sol("tray", "sieve"); path("tray", "mesh", "nf lo");
  grp("env", 0); path("env", "speed", "nf lo"); path("env", "strikes", "nf sil"); path("env", "envBack", "lo"); path("env", "envFace", "ink"); path("env", "envFlap", "knock");
  el.seal = mk("circle", { r: 0, class: "seal" }, groups.env.g); path("env", "encLock", "nf sil");
  el.ko = mk("circle", { r: 0, class: "ko" }, groups.env.g); el.badge = mk("circle", { r: 0, class: "badge" }, groups.env.g);
  el.check = mk("path", { class: "check", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, groups.env.g);
  el.ring = mk("circle", { r: 0, class: "pulse", opacity: 0 }, groups.env.g);
  grp("markers", 900);
  el.markers = X.map(() => { const gm = mk("g", {}, groups.markers.g); return { g: gm, open: mk("circle", { r: 4.2, class: "mk-open" }, gm), fill: mk("circle", { r: 0, class: "mk-done" }, gm), tick: mk("path", { class: "mk-check", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, gm) }; });

  // time-based pops: a marker bounces in when its station is done, the logo's check pops at the very end
  const since = X.map(() => null);
  let finaleAt = null;
  const age = (t0, now) => (t0 === null ? -1 : reducedMotion() ? 1e9 : now - t0);
  const attr = (node, k, v) => { const s = String(v); if (node.getAttribute(k) !== s) node.setAttribute(k, s); };

  const MAIN = ["lapLid", "rubber", "gate", "rack", "tube", "tray"];
  let act = -1, lastOrder = "";
  function draw(now) {
    const C = cam(az.x), S = scene(C, clamp(prog.x, 0, 1), lite);
    for (const k in el) {
      const v = S[k], node = el[k];
      if (typeof v !== "string" && !(v && v.sil !== undefined)) continue;
      if (node.sil) { attr(node.sil, "d", v.sil); attr(node.cr, "d", v.crease); } else attr(node, "d", v);
    }
    S.leds.forEach((q, i) => { place(el.leds[i], q); attr(el.leds[i], "class", S.ledOn[i] ? "dot" : "dot off"); });
    el.lapSend.classList.toggle("hi", S.lapPressed);
    attr(el.envFlap, "stroke-width", S.flapW);
    place(el.seal, S.seal); attr(el.seal, "r", S.sealed && S.envShown ? 1.9 : 0);
    if (!S.envShown) ["envBack", "envFace", "envFlap", "speed", "strikes", "encLock"].forEach((k) => attr(el[k], "d", ""));
    if (S.shadow) { place(el.shadowEl, S.shadow.c); attr(el.shadowEl, "rx", r2(S.shadow.rx)); attr(el.shadowEl, "ry", r2(S.shadow.ry)); } else attr(el.shadowEl, "rx", 0);
    // markers
    let busy = false;
    S.markers.forEach((q, i) => {
      if (S.done[i] && since[i] === null) since[i] = now;
      if (!S.done[i]) since[i] = null;
      const m = el.markers[i], t = age(since[i], now), cy = q[1] - 6.5;
      attr(m.open, "cx", r2(q[0])); attr(m.open, "cy", r2(cy)); attr(m.open, "r", since[i] === null ? 4.2 : 0);
      const s = t < 0 ? 0 : POP(clamp(t / 550, 0, 1)), k = t < 0 ? 0 : EASE(clamp((t - 300) / 350, 0, 1));
      attr(m.fill, "cx", r2(q[0])); attr(m.fill, "cy", r2(cy)); attr(m.fill, "r", r2(4.4 * s));
      attr(m.tick, "d", `M${r2(q[0] - 1.9)} ${r2(cy + 0.1)}L${r2(q[0] - 0.5)} ${r2(cy + 1.5)}L${r2(q[0] + 2)} ${r2(cy - 1.3)}`);
      attr(m.tick, "stroke-dashoffset", r2(1 - k));
      if (t >= 0 && t < 650) busy = true;
    });
    // the finale: knockout ring and green badge pop, the check draws, one pulse ring
    if (S.finale && S.envShown) { if (finaleAt === null) finaleAt = now; } else finaleAt = null;
    const b = S.badge, tf = age(finaleAt, now), sp = tf < 0 ? 0 : POP(clamp(tf / 550, 0, 1));
    for (const [node, r] of [[el.ko, b.ko], [el.badge, b.r]]) { place(node, b.c); attr(node, "r", r2(r * sp)); }
    attr(el.check, "d", "M" + b.check.map((pt) => r2(pt[0]) + " " + r2(pt[1])).join("L")); attr(el.check, "stroke-width", r2(b.w));
    attr(el.check, "stroke-dashoffset", tf < 0 ? 1 : r2(1 - EASE(clamp((tf - 400) / 350, 0, 1))));
    const tp = tf < 0 ? 0 : clamp((tf - 650) / 700, 0, 1);
    place(el.ring, b.c); attr(el.ring, "r", r2(b.r * (1 + 0.9 * tp))); attr(el.ring, "opacity", tf < 650 || tp >= 1 ? 0 : r2(1 - tp));
    if (tf >= 0 && tf < 1400) busy = true;
    groups.gate.key = S.armKey; groups.env.key = S.envKey;
    const order = Object.values(groups).sort((x, y) => x.key - y.key);
    const sig = order.map((o) => o.key).join();
    if (sig !== lastOrder) { order.forEach((o) => g.appendChild(o.g)); lastOrder = sig; }
    return busy;
  }

  const B = register(stage, (dt, now) => {
    const m = [stepS(prog, dt), stepS(az, dt)].some(Boolean);
    return draw(now) || m;
  });
  bag.add(B.unregister);

  const cx = X.map((x, i) => proj(C0)(x, i === 3 ? -46 : 0, 20)[0]);
  function setActive(i) {
    if (i === act) return;
    act = i;
    MAIN.forEach((k, j) => { const n = el[k].sil || el[k]; n.classList.toggle("hi", j === i); });
    read.textContent = i < 0 ? "rest" : NAMES[i];
  }
  bag.add(pointer(stage, {
    move: ([sx]) => {
      let best = 0;
      cx.forEach((v, i) => { if (Math.abs(v - sx) < Math.abs(cx[best] - sx)) best = i; });
      setActive(best);
      az.t = REST_AZ + 2 * clamp((sx - 200) / 200, -1, 1);
      B.wake();
    },
    leave: () => { setActive(-1); az.t = REST_AZ; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren()); draw(performance.now());

  return { set: (v) => { prog.t = clamp(v, 0, 1); B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "mailroute",
  means: "One mail on its way: stamped, let through, looked up, sent through a tube into the tray, where it becomes the logo with its check.",
  rules: [1, 5, 6, 8],
  range: [0, 0.5, 1],
  tour: [[120, 150], [230, 120], [330, 220], null],
  mount,
});
