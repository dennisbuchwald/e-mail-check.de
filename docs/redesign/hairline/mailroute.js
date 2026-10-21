/**
 * Mailroute: the way of one mail, as a belt from back left to front right.
 * A laptop sends it, a stamp seals it, a barrier with a lock lets it through,
 * a server rack with a clipboard looks it up, a closed tube carries it and a
 * sieve over a tray takes it in. The envelope is the only thing that travels;
 * the slider is its progress, 0 to 1. A ring beside each station fills once
 * the envelope has passed. The pointer leans the camera a little and names
 * the station under it.
 */
const { Cam, circ, clamp, facing, fillet, fit, hull, lerp, open, poly, prism, proj, rad, rings, ringAt, seg, spring, stepS, disposer, mk, place, pointer, register, solid, put } = HL;

const X = [-29, 40, 90, 140, 201, 273], NAMES = ["01 spf", "02 dkim", "03 dmarc", "04 rbl", "05 tls", "06 inbox"];
const EW = 11, EH = 15, BELT = 3;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const shift = (ring, dx, dy) => ring.map((q) => ({ ...q, u: q.u + dx, v: q.v + dy }));
const box = (P, f, x0, y0, x1, y1, z0, z1, r, b) => { const [o, i] = rings(x0, y0, x1, y1, r, b); return prism(P, f, o, i, z0, z1); };

/** Where the envelope is at progress p: station i at p = i / 5 along the belt, then a lift over the tray and a drop through the sieve. */
function travel(p) {
  const K = [[0, 6], [0.2, X[1]], [0.4, X[2]], [0.6, X[3]], [0.8, X[4]], [0.9, 242]];
  for (let k = 1; k < K.length; k++) if (p <= K[k][0]) return { x: lerp(K[k - 1][1], K[k][1], (p - K[k - 1][0]) / (K[k][0] - K[k - 1][0])), z: BELT };
  if (p <= 0.95) { const t = (p - 0.9) / 0.05; return { x: lerp(242, X[5], t), z: BELT + 37 * Math.sin((t * Math.PI) / 2) }; }
  const t = (p - 0.95) / 0.05;
  return { x: X[5], z: BELT + 37 - 32 * t * t };
}

/** The scene for one camera and one moment: every path, keyed by part. */
function scene(C, p) {
  const P = proj(C), f = facing(C), e = travel(p), out = {};
  const c = Math.cos(C.az), s = Math.sin(C.az), zf = Math.sqrt(1 - C.k * C.k);
  const seen = (ny, nz) => c * ny * zf + nz * C.k > 0;
  const plane = (pts, map) => poly(pts.map(([u, v]) => P(...map(u, v))));
  // the belt, with a dashed guide down its middle
  out.belt = box(P, f, -14, -10, 244, 10, 0, BELT, 10, 1.5);
  out.guide = seg(P(-2, 0, BELT), P(232, 0, BELT));
  // 01 laptop: a base with a pad, a screen leaning back with a mail window
  out.lapBase = box(P, f, -46, -16, -12, 16, 0, 2.4, 2.5, 1);
  out.lapPad = poly(ringAt(P, rings(-24, -6, -15, 6, 1.5, 0.5)[0], 2.4));
  const scr = (dx) => (u, v) => [-45 - v * Math.sin(rad(12)) + dx, u, 2.4 + v * Math.cos(rad(12))];
  const scrShape = fillet([[-15, 0], [15, 0], [15, 24], [-15, 24]], [1.5, 1.5, 2.5, 2.5]);
  out.lapBack = plane(scrShape, scr(-1.4));
  out.lapFace = plane(scrShape, scr(0));
  out.lapWin = plane(fillet([[-11, 5], [11, 5], [11, 20], [-11, 20]], [1, 1, 1, 1]), scr(0.1));
  out.lapText = [16.5, 12.5, 9.5, 6.5].map((v, k) => seg(P(...scr(0.1)(-9, v)), P(...scr(0.1)(k ? 4 - k * 3 : 9, v)))).join("");
  // 02 stamp: a post with an arm; the stamp drops onto the envelope as it passes under
  const hb = EH + BELT + 12 * sstep(0, 13, Math.abs(e.x - X[1]));
  out.post = box(P, f, 36, -30, 44, -22, 0, 58, 2, 1);
  out.arm = box(P, f, 36, -30, 44, 4, 52, 57, 2, 1);
  out.rod = prism(P, f, shift(circ(1.6, 16), 40, 0), null, hb + 7, 52);
  out.rubber = box(P, f, 33, -7, 47, 7, hb, hb + 2, 1.2, 0.6);
  out.grip = box(P, f, 35, -5, 45, 5, hb + 2, hb + 7, 2, 1);
  // 03 barrier: a pillar with a padlock; the arm swings up and the shackle lifts while the envelope passes
  const opn = sstep(52, 66, e.x) * (1 - sstep(112, 126, e.x)), a = rad(88 * opn);
  out.pillar = box(P, f, 85, -26, 95, -16, 0, 36, 2, 1);
  out.lockBody = box(P, f, 87.5, -16, 92.5, -13, 9, 16, 1.2, 0.6);
  const sh = 2.4 * opn, arc = [];
  for (let k = 0; k <= 12; k++) { const t = (Math.PI * k) / 12; arc.push(P(90 + 1.9 * Math.cos(t), -14.5, 16 + sh + 2.2 * Math.sin(t))); }
  out.shackle = open([P(91.9, -14.5, 15.5 + sh * 0.3), ...arc, P(88.1, -14.5, 16)]);
  const arm = (dx) => (u, v) => [dx, -15 + u * Math.cos(a) - v * Math.sin(a), 30 + u * Math.sin(a) + v * Math.cos(a)];
  const armShape = fillet([[0, -2], [33, -2], [33, 2], [0, 2]], [1.5, 1.5, 1.5, 1.5]);
  out.gate = poly(hull(armShape.map(([u, v]) => P(...arm(87.5)(u, v))).concat(armShape.map(([u, v]) => P(...arm(92.5)(u, v))))));
  out.gateHub = poly(circ(1.8, 16).map((q) => P(...arm(92.6)(q.u + 2.6, q.v))));
  out.gateStripes = [11, 19, 27].map((u) => seg(P(...arm(92.5)(u, -2)), P(...arm(92.5)(u + 3, 2)))).join("");
  out.armKey = opn > 0.5 ? -90 : 90;
  // 04 rack: blades with lights, one of them lit while the envelope passes; a clipboard leans beside it
  out.rack = box(P, f, 126, -54, 154, -28, 0, 60, 3, 1.5);
  out.blades = [10, 18, 26, 34, 42, 50].map((z) => seg(P(129, -28, z), P(151, -28, z))).join("");
  out.leds = [14, 22, 30, 38, 46].map((z) => P(148, -28, z));
  out.ledOn = Math.abs(e.x - X[3]) < 16;
  const clip = (dx) => (u, v) => [154.4 + dx, u, v];
  const board = fillet([[-50, 18], [-35, 18], [-35, 40], [-50, 40]], [1.2, 1.2, 1.2, 1.2]);
  out.boardBack = plane(board, clip(0));
  out.board = plane(board, clip(1.2));
  out.boardClip = plane(fillet([[-45.5, 38], [-39.5, 38], [-39.5, 42], [-45.5, 42]], [1, 1, 1, 1]), clip(1.4));
  out.boardText = [34, 30, 26, 22].map((v, k) => seg(P(...clip(1.4)(-48, v)), P(...clip(1.4)(k === 3 ? -42 : -37, v)))).join("");
  // 05 tube: closed, so the envelope is out of sight inside it; its open end faces the viewer
  const ring = (x, R) => circ(R, 48).map((q) => P(x, q.u, 12 + q.v));
  out.tube = poly(hull(ring(178, 12).concat(ring(224, 12))));
  out.tubeRim = poly(ring(224, 12));
  out.tubeIn = poly(ring(224, 10));
  out.bands = [188, 214].map((x) => open(circ(12.4, 48).filter((q) => seen(q.u, q.v)).map((q) => P(x, q.u, 12 + q.v)))).join("");
  // 06 tray with a sieve on top: the envelope lifts off the belt and drops through the mesh
  out.tray = box(P, f, 258, -15, 288, 15, 0, 20, 3, 1.5);
  out.slot = poly(fillet([[264, 9], [282, 9], [282, 12], [264, 12]], [1.4, 1.4, 1.4, 1.4]).map(([u, v]) => P(u, 15, v)));
  const rim = shift(circ(12, 48), X[5], 0);
  out.sieve = prism(P, f, rim, shift(circ(10.4, 48), X[5], 0), 20, 24);
  const mesh = [];
  for (let d = -8; d <= 8; d += 4) { const h = Math.sqrt(100 - d * d) - 0.6; mesh.push(seg(P(X[5] + d, -h, 21), P(X[5] + d, h, 21)), seg(P(X[5] - h, d, 21), P(X[5] + h, d, 21))); }
  out.mesh = mesh.join("");
  // the envelope: upright, a flap folded down its face, the seal once it has passed the stamp
  const env = (dy) => (u, v) => [e.x + u, dy, e.z + v];
  const shape = fillet([[-EW, 0], [EW, 0], [EW, EH], [-EW, EH]], [1.6, 1.6, 1.6, 1.6]);
  out.envBack = plane(shape, env(-0.8));
  out.envFace = plane(shape, env(0.8));
  out.envFlap = open([P(...env(0.8)(-EW + 1, EH - 1)), P(...env(0.8)(0, EH * 0.42)), P(...env(0.8)(EW - 1, EH - 1))]);
  out.seal = P(...env(0.9)(0, EH * 0.42 - 2.4));
  out.sealed = e.x > X[1];
  out.envKey = e.z > 24 && e.x > 250 ? 500 : e.x;
  out.envShown = !(e.x === X[5] && e.z < 24);
  // the rings beside the stations
  out.rings = [[-29, 22], [40, 15], [99, 16], [140, 15], [201, 17], [273, 21]].map(([x, y]) => P(x, y, 0));
  out.done = X.map((_, i) => (i < 5 ? p >= i / 5 + 0.1 : p >= 0.975));
  return out;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer(), REST_AZ = 45;
  const prog = spring(value, { eps: 0.0005 }), az = spring(REST_AZ, { eps: 0.01 });
  const EXT = [[-50, -54, 0], [288, -54, 0], [-50, 26, 0], [288, 26, 0], [140, -54, 62], [-46, 0, 28], [273, 0, 42]];
  const cam = (deg) => { const C = Cam(deg, 0.5, 1.25); fit(C, EXT, 200, 166); return C; };
  const C0 = cam(REST_AZ);

  const g = mk("g", {}, svg), groups = {}, el = {};
  const grp = (name, key) => (groups[name] = { g: mk("g", {}, g), key });
  const path = (gname, name, cls) => (el[name] = mk("path", { class: cls }, groups[gname].g));
  const sol = (gname, name) => (el[name] = solid(groups[gname].g));
  grp("belt", -300); sol("belt", "belt"); path("belt", "guide", "nf lo dash");
  grp("laptop", -200); sol("laptop", "lapBase"); path("laptop", "lapPad", "nf lo"); path("laptop", "lapBack", "lo"); path("laptop", "lapFace", "sil"); path("laptop", "lapWin", "nf"); path("laptop", "lapText", "nf lo");
  grp("post", -190); sol("post", "post"); sol("post", "arm");
  grp("pillar", -180); sol("pillar", "pillar"); sol("pillar", "lockBody"); path("pillar", "shackle", "nf sil");
  grp("gate", 90); path("gate", "gate", "sil"); path("gate", "gateStripes", "nf lo"); path("gate", "gateHub", "nf");
  grp("rack", -170); sol("rack", "rack"); path("rack", "blades", "nf lo");
  el.leds = [0, 1, 2, 3, 4].map(() => mk("circle", { r: 0.9, class: "dot off" }, groups.rack.g));
  grp("board", -160); path("board", "boardBack", "lo"); path("board", "board", "sil"); path("board", "boardClip", "nf"); path("board", "boardText", "nf lo");
  grp("stamp", 48); sol("stamp", "rod"); sol("stamp", "rubber"); sol("stamp", "grip");
  grp("tube", 222); path("tube", "tube", "sil"); path("tube", "bands", "nf lo"); path("tube", "tubeRim", "nf sil"); path("tube", "tubeIn", "nf lo");
  grp("tray", 230); sol("tray", "tray"); path("tray", "slot", "nf lo"); sol("tray", "sieve"); path("tray", "mesh", "nf lo");
  grp("env", 0); path("env", "envBack", "lo"); path("env", "envFace", "sil hi"); path("env", "envFlap", "nf");
  el.seal = mk("circle", { r: 1.3, class: "dot m" }, groups.env.g);
  grp("rings", 900);
  el.rings = X.map(() => mk("ellipse", { rx: 2.6, ry: 1.3, class: "nf lo" }, groups.rings.g));
  const pop = spring(0, { k: 260, c: 14 });

  const MAIN = ["lapFace", "rubber", "gate", "rack", "tube", "tray"];
  let act = -1, lastOrder = "";
  function draw() {
    const C = cam(az.x), S = scene(C, clamp(prog.x, 0, 1));
    for (const k in el) {
      const v = S[k], node = el[k];
      if (v === undefined || Array.isArray(node)) continue;
      if (node.sil) put(node, v); else node.setAttribute("d", v);
    }
    S.leds.forEach((q, i) => { place(el.leds[i], q); el.leds[i].setAttribute("class", i === 2 && S.ledOn ? "dot" : "dot off"); });
    place(el.seal, S.seal); el.seal.setAttribute("r", S.sealed && S.envShown ? 1.3 : 0);
    if (!S.envShown) ["envBack", "envFace", "envFlap"].forEach((k) => el[k].setAttribute("d", ""));
    S.rings.forEach((q, i) => {
      place(el.rings[i], q);
      const r = i === 5 ? 2.6 * (S.done[5] ? 1 + 0.6 * Math.max(0, pop.x) : 1) : 2.6;
      el.rings[i].setAttribute("rx", r); el.rings[i].setAttribute("ry", r / 2);
      el.rings[i].setAttribute("class", S.done[i] ? "dot ok" : "nf lo");
    });
    groups.gate.key = S.armKey; groups.env.key = S.envKey;
    const order = Object.values(groups).sort((a, b) => a.key - b.key);
    const sig = order.map((o) => o.key).join();
    if (sig !== lastOrder) { order.forEach((o) => g.appendChild(o.g)); lastOrder = sig; }
  }

  let wasDone = false;
  const B = register(stage, (dt) => {
    const m = [stepS(prog, dt), stepS(az, dt)].some(Boolean);
    const isDone = prog.x >= 0.975;
    if (isDone && !wasDone) { pop.x = 1; pop.v = 0; }
    wasDone = isDone;
    const mp = stepS(pop, dt);
    draw();
    return m || mp;
  });
  bag.add(B.unregister);

  const cx = X.map((x, i) => proj(C0)(x, i === 3 ? -40 : 0, 20)[0]);
  function setActive(i) {
    if (i === act) return;
    act = i;
    MAIN.forEach((k, j) => { const n = el[k].sil || el[k]; n.classList.toggle("hi", j === i); });
    el.envFace.classList.toggle("hi", i < 0);
    read.textContent = i < 0 ? "rest" : NAMES[i];
  }
  bag.add(pointer(stage, {
    move: ([sx]) => {
      let best = 0;
      cx.forEach((v, i) => { if (Math.abs(v - sx) < Math.abs(cx[best] - sx)) best = i; });
      setActive(best);
      az.t = REST_AZ + 3 * clamp((sx - 200) / 200, -1, 1);
      B.wake();
    },
    leave: () => { setActive(-1); az.t = REST_AZ; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren()); draw();

  return { set: (v) => { prog.t = clamp(v, 0, 1); B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "mailroute",
  means: "One mail on its way: past a stamp, a barrier, a rack and a tube into the tray; each station rings green once it is passed.",
  rules: [1, 5, 6, 8],
  range: [0, 0.5, 1],
  tour: [[120, 150], [230, 120], [330, 220], null],
  mount,
});
