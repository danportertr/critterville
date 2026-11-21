// Everything in town that isn't a critter.
import { ctx } from './canvas.js';
import { S } from '../state.js';
import { INK, LW, HOUSE, SWING, TANK, VIEW, STREAM_HALF, BRIDGE, WOOD, STONE } from '../config.js';
import { SPECIES_BY_ID } from '../data/fish.js';
import { drawFish } from './fish.js';
import { streamPoint } from '../world/geometry.js';
import { TAU, clamp, hs, shade } from '../util.js';
import { jit, wob, smooth, polyPath, blobPts, paint, blob, box, line, tube, dot } from './primitives.js';

const shadow = (x, y, rx, ry) => { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
// ---- houses ----
// Drawn from the middle of the doorstep. Walls pinch in at the waist, the roof
// overhangs, and the door is a darker shade of the walls. A house can grow
// add-ons (h.addons): a chimney, a side room ('annex') and an upstairs.
const GLASS = '#dff4fd', GLOW = '#ffe98a';
const has = (h, what) => (h.addons || []).includes(what);
/** How far the walls go up, including an upstairs. */
export const wallTop = h => HOUSE.h + (has(h, 'upstairs') ? HOUSE.upstairs : 0);

const WINDOWS = [[[-38, -50], [-27, -52], [-25, -32], [-37, -30]], [[24, -52], [36, -52], [33, -34], [22, -33]]];
const UP_WINDOWS = [[[-37, -104], [-25, -105], [-24, -89], [-36, -88]], [[23, -105], [35, -104], [34, -88], [22, -89]]];
const ANNEX_WINDOW = [[-76, -29], [-61, -30], [-60, -14], [-75, -13]];
function panes(h, fill) {
  const sd = h.seed;
  WINDOWS.forEach((w, i) => box(w, fill, sd + 40 + i, 0.5, 2.2));
  box([[-13, -48], [10, -50], [11, -30], [-11, -27]], fill, sd + 44, 0.5, 2.2);                  // the pane in the door
  if (has(h, 'upstairs')) UP_WINDOWS.forEach((w, i) => box(w, fill, sd + 46 + i, 0.5, 2.2));
  if (has(h, 'annex')) box(ANNEX_WINDOW, fill, sd + 49, 0.5, 2.2);
  blob(-3, -wallTop(h) + 17, 7.5, 6.5, fill, sd + 50, 8, 0.06, 0.4, 2.2);                             // round window under the eaves
}
function annex(h, wall, roof) {
  box([[-86, 0], [-46, 0], [-46, -43], [-85, -41]], wall, h.seed + 60, 0.7);
  box([[-93, -35], [-46, -63], [-45, -38]], roof, h.seed + 61, 0.7);
}
function chimney(h, wall, cap, top) {
  box([[24, -top - 14], [24, -top - 43], [47, -top - 41], [47, -top + 2]], wall, h.seed + 62, 0.6);
  box([[19, -top - 43], [53, -top - 40], [52, -top - 49], [18, -top - 52]], cap, h.seed + 63, 0.6);
}
function roofShape(h, fill, top) {
  // The underside dips below the top of the walls, so the roof sits on the house with no gap.
  box([[-69, -top + 9], [-30, -top - 26], [-1, -top - HOUSE.roof + 2], [28, -top - 26], [62, -top + 8], [30, -top + 4], [0, -top + 2], [-35, -top + 5]], fill, h.seed + 1, 0.9);
}

export function drawHouse(h, lit) {
  const sd = h.seed, p = h.progress, done = p >= 1, top = wallTop(h);
  const wall = done ? h.color : '#fff', roof = done ? h.roof : '#fff', door = shade(h.color, 0.8);
  ctx.save(); ctx.translate(h.x, h.y); ctx.scale(HOUSE.scale, HOUSE.scale);
  shadow(0, 2, 60, 6);
  const adding = h.adding, pole = (x, hgt) => line([[x, 2], [x + jit(sd, 9, 1), -hgt]], sd + (x | 0), 3, WOOD, 0.6);
  if (!done || adding) { pole(-62, top + 20); pole(60, top + 20); }                              // scaffolding
  if (has(h, 'annex')) annex(h, wall, roof);
  else if (adding && adding.what === 'annex') { pole(-92, 60); if (adding.progress > 0.4) annex(h, '#fff', '#fff'); }

  const k = done ? 1 : clamp(p / 0.7, 0.12, 1), y = v => -v * k;                                 // walls rise as it's built
  let wtop = top;
  if (adding && adding.what === 'upstairs') wtop = top + HOUSE.upstairs * clamp(adding.progress / 0.8, 0, 1);
  if (has(h, 'chimney')) chimney(h, wall, door, wtop);
  else if (adding && adding.what === 'chimney' && adding.progress > 0.4) chimney(h, '#fff', '#fff', wtop);
  box([[-49, 0], [-44, y(28)], [-45, y(wtop - 25)], [-50, y(wtop)], [48, y(wtop)], [44, y(wtop - 25)], [42, y(28)], [47, 0]], wall, sd, 0.8);
  if (done || p > 0.7) roofShape(h, roof, wtop);
  if (done) {
    box([[-19, 0], [-21, -30], [-22, -56], [20, -58], [17, -30], [22, 0]], door, sd + 2, 0.6);
    panes(h, lit ? GLOW : GLASS);
    dot(11, -22, 2.8); dot(11, -22, 1.5, '#ffd93b');
    if (lit && has(h, 'chimney')) for (let i = 0; i < 2; i++) {                                  // someone's home: smoke
      const t = (S.now * 0.22 + i * 0.5 + hs(sd, 3)) % 1;
      ctx.globalAlpha = Math.sin(t * Math.PI);
      blob(38 + t * 20, -top - 58 - t * 30, 6 + t * 6, 5 + t * 4, '#e0e0e0', sd + 70 + i, 8, 0.12, 0.6, 2.2);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
/** Just the windows, glowing: drawn again over the night-time wash. */
export function drawHouseLights(h, alpha) {
  ctx.save(); ctx.translate(h.x, h.y); ctx.scale(HOUSE.scale, HOUSE.scale); ctx.globalAlpha = alpha;
  panes(h, GLOW);
  ctx.restore();
}

// Apple tree: a cloud of lobes with little curls where they meet, a flared
// trunk, and three spots where apples grow (t.apples holds each one's growth,
// 0..1; see sim/world.js). Lobes are [cx, cy, rx, ry]; coordinates are from the
// middle of the trunk's base.
const LOBES = [[0.5, -99, 19.5, 21], [-21, -73, 22, 15], [21, -75, 19, 15], [-16, -47, 18, 13], [16, -50, 17, 14]];
const CURLS = [[-16, -86], [15, -87], [-31, -60], [31, -62], [0, -39]];   // where lobes meet on the outline
export const APPLE_SPOTS = [[-2, -81], [-17, -58], [14, -59]];
const TRUNK_L = [[-8, -42], [-9, -23], [-14, -10], [-26, -1]], TRUNK_R = [[8.5, -42], [9, -23], [13, -10], [26, -3]];

function drawAppleOnTree(x, y, g, seed) {
  if (g <= 0) return;                       // not budded yet
  const k = 0.25 + 0.75 * Math.min(1, g), r = 6 * k;
  const color = g < 0.55 ? '#c5e85a' : g < 0.9 ? '#f5b04a' : '#fb6540';   // green, turning, ripe
  tube([[x, y - r * 0.7], [x + 1, y - r * 1.7]], 1.4 * k, '#7a3b1e', seed + 1, 0.2);
  blob(x + r * 0.95, y - r * 1.25, 3.2 * k, 1.9 * k, '#c9ec6a', seed + 2, 6, 0.1, 0.2, 1.6);
  blob(x, y, r, r * 0.95, color, seed, 7, 0.06, 0.3, 2.2);
}

export function drawTree(t) {
  const sd = t.seed;
  const k = t.size * (t.grow || 1);   // seedlings (t.grow < 1) are small
  ctx.save(); ctx.translate(t.x, t.y); ctx.scale(k, k);
  shadow(0, 1, 30, 5);
  if (S.wind) ctx.rotate(S.wind * (0.05 + 0.02 * Math.sin(S.now * 5 + sd)));   // leaning in the wind
  // trunk: filled shape, outlined only down its two sides
  const L = wob(TRUNK_L, sd, 0.6), R = wob(TRUNK_R, sd + 1, 0.6);
  polyPath([...L, ...R.slice().reverse()]); ctx.fillStyle = '#b06634'; ctx.fill();
  ctx.lineWidth = LW; ctx.strokeStyle = INK;
  smooth(L, false); ctx.stroke(); smooth(R, false); ctx.stroke();
  // crown: every lobe in fat ink, then every lobe in green, so they merge into one outline
  const lobes = LOBES.map((l, i) => blobPts(l[0], l[1], l[2], l[3], 9, sd + 2 + i, 0.06, 0.7));
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = LW * 2;
  for (const pts of lobes) { smooth(pts, true); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = t.color;
  for (const pts of lobes) { smooth(pts, true); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, -70, 20, 24, 0, 0, TAU); ctx.fill();
  for (const [i, [jx, jy]] of CURLS.entries()) {   // the outline hooks inwards a little at each join
    const dx = -jx, dy = -68 - jy, d = Math.hypot(dx, dy), vx = dx / d, vy = dy / d, m = i % 2 ? -1 : 1;
    line([[jx, jy], [jx + vx * 7 - vy * m, jy + vy * 7 + vx * m], [jx + vx * 5 - vy * 4.5 * m, jy + vy * 5 + vx * 4.5 * m]], sd + 20 + i, LW, INK, 0.3);
  }
  if (!(t.grow < 0.8)) t.apples.forEach((g, i) => drawAppleOnTree(APPLE_SPOTS[i][0], APPLE_SPOTS[i][1], g, sd + 30 + i * 3));
  ctx.restore();
}

function ripples(w, n, rx, ry) {
  for (let i = 0; i < n; i++) {
    const t = (S.now * 0.12 + i / n) % 1, x = w.x + (hs(w.seed, 30 + i) - 0.5) * rx, y = w.y + (hs(w.seed, 40 + i) - 0.5) * ry;
    ctx.globalAlpha = Math.sin(t * Math.PI) * 0.75;
    line([[x - 9, y], [x, y - 2.5], [x + 9, y]], w.seed + 50 + i, 2, '#fff', 0.5);
  }
  ctx.globalAlpha = 1;
}
export function drawPond() {
  const p = S.pond;
  blob(p.x, p.y, p.rx, p.ry, '#a8dcf5', p.seed, 14, 0.08, 0.9);
  ripples(p, 3, p.rx, p.ry * 0.8);
  blob(p.x - p.rx * 0.45, p.y + p.ry * 0.3, 9, 5.5, '#8fe3b0', p.seed + 60, 7, 0.05, 0.4, 2);
  blob(p.x + p.rx * 0.3, p.y - p.ry * 0.4, 7, 4.5, '#8fe3b0', p.seed + 61, 7, 0.05, 0.4, 2);
}
export function drawStream() {
  const st = S.stream, pts = wob(st.pts, st.seed, 0.8);
  smooth(pts, false);
  ctx.lineWidth = STREAM_HALF * 2 + LW * 2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = STREAM_HALF * 2; ctx.strokeStyle = '#a8dcf5'; ctx.stroke();
  for (let i = 0; i < 9; i++) {   // ripples drifting downstream
    let t = (S.now * 0.012 * st.flow + i / 9 + hs(st.seed, i) * 0.05) % 1; if (t < 0) t += 1;
    const p = streamPoint(t), off = (hs(st.seed, i + 20) - 0.5) * STREAM_HALF * 1.1;
    const x = p.x + p.nx * off, y = p.y + p.ny * off;
    ctx.globalAlpha = 0.8;
    line([[x - p.tx * 7, y - p.ty * 7], [x + p.nx * 1.5, y + p.ny * 1.5], [x + p.tx * 7, y + p.ty * 7]], st.seed + 50 + i, 2, '#fff', 0.4);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 4; i++) {   // a few stones
    const p = streamPoint(0.12 + i * 0.23 + hs(st.seed, i + 40) * 0.1), off = (hs(st.seed, i + 60) - 0.5) * STREAM_HALF;
    blob(p.x + p.nx * off, p.y + p.ny * off, 5 + hs(st.seed, i + 70) * 3, 3.5, '#ddd', st.seed + 80 + i, 7, 0.1, 0.3, 2);
  }
}
/** Planks across the stream. They go down one at a time from one bank as it's built. */
export function drawBridge() {
  const b = S.bridge, n = 7, r = BRIDGE.reach, laid = Math.round(clamp(b.progress, 0, 1) * n);
  const at = (along, across) => [b.x + b.nx * along + b.tx * across, b.y + b.ny * along + b.ty * across];
  for (let i = 0; i < laid; i++) {
    const a0 = -r + i * 2 * r / n, a1 = a0 + 2 * r / n - 1.5, w = BRIDGE.half;
    box([at(a0, -w), at(a1, -w), at(a1, w), at(a0, w)], i % 2 ? '#d9a878' : WOOD, b.seed + i, 0.5, 2.2);
  }
  if (b.progress >= 1) for (const k of [-1, 1]) tube([at(-r - 2, k * BRIDGE.half), at(0, k * (BRIDGE.half + 3)), at(r + 2, k * BRIDGE.half)], 2.5, '#d9a878', b.seed + 20 + k, 0.4);   // rails
}
export function drawPool() {
  const p = S.pool, g = p.progress;
  if (g < 1) {   // being dug: a growing hole, then the rim goes on
    const k = clamp(g / 0.7, 0.15, 1);
    if (g > 0.7) blob(p.x, p.y, p.rx + 10, p.ry + 9, '#fff', p.seed, 16, 0.01, 0.6);
    blob(p.x, p.y, p.rx * k, p.ry * k, '#e6cfa8', p.seed + 1, 14, 0.06, 0.9, g > 0.7 ? 2.2 : undefined);
    blob(p.x + p.rx + 26, p.y + p.ry * 0.5, 16 * k, 9 * k, '#e6cfa8', p.seed + 7, 8, 0.15, 0.6);   // spoil heap
    return;
  }
  blob(p.x, p.y, p.rx + 10, p.ry + 9, '#fff', p.seed, 16, 0.01, 0.6);                 // tiled rim
  blob(p.x, p.y, p.rx, p.ry, '#74dbe8', p.seed + 1, 16, 0.01, 0.5, 2.2);              // water
  ripples(p, 4, p.rx * 1.2, p.ry);
  box([[p.x - p.rx - 30, p.y - 7], [p.x - p.rx + 26, p.y - 7], [p.x - p.rx + 26, p.y + 5], [p.x - p.rx - 30, p.y + 5]], '#ffd36b', p.seed + 2, 0.6);   // diving board
  for (const k of [0, 14]) {   // ladder
    const x = p.x + p.rx * 0.55 + k, y = p.y - p.ry * 0.8;
    line([[x, y + 9], [x, y - 9], [x + 5, y - 13], [x + 9, y - 7]], p.seed + 3 + k, 3, INK, 0.3);
  }
}

export function drawFire(lit) {
  const f = S.fire;
  ctx.save(); ctx.translate(f.x, f.y);
  if (f.progress > 0.3) tube([[15, 0], [-15, -6]], 6, WOOD, f.seed - 1);
  if (f.progress > 0.6) tube([[-15, 0], [15, -6]], 6, WOOD, f.seed + 1);
  if (f.progress < 1) for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4; blob(Math.cos(a) * 24, Math.sin(a) * 10 - 1, 4, 3, '#ddd', f.seed + 10 + i, 6, 0.1, 0.3, 2); }   // ring of stones
  if (f.progress >= 1 && lit > 0.05) {
    const g = (0.6 + lit * 0.4) * (1 + Math.sin(S.now * 7) * 0.05);
    smooth(wob([[-11 * g, -6], [-9 * g, -20 * g], [-2, -38 * g], [8 * g, -22 * g], [11 * g, -6], [0, -2]], f.seed + 5, 2), true); paint('#ffab45');
    smooth(wob([[-5 * g, -6], [-3, -22 * g], [5 * g, -8], [0, -4]], f.seed + 6, 1.4), true); paint('#ffe66d', 2);
  }
  ctx.restore();
}

export function drawSwing(sw) {
  const { barH, rope, half } = SWING, red = '#ff8f8f';
  const g = sw.progress;
  ctx.save(); ctx.translate(sw.x, sw.y);
  if (g < 1) {   // going up: one A-frame, then the other, then the bar, then the seats
    for (const k of [-1, 1]) {
      if (g > (k < 0 ? 0.15 : 0.4)) { tube([[k * half, -barH], [k * (half - 13), -10]], 5, red, sw.seed + k + 5, 0.4); tube([[k * half, -barH], [k * (half + 14), 0]], 6, red, sw.seed + k + 9, 0.4); }
    }
    if (g > 0.65) tube([[-half - 3, -barH], [half + 3, -barH]], 6, red, sw.seed, 0.4);
    else tube([[-half + 20, 4], [half - 20, 8]], 6, red, sw.seed, 0.4);   // the bar, waiting on the ground
    ctx.restore();
    return;
  }
  shadow(0, 2, half + 16, 6);
  for (const k of [-1, 1]) tube([[k * half, -barH], [k * (half - 13), -10]], 5, red, sw.seed + k + 5, 0.4);   // back legs
  for (const seat of sw.seats) {
    ctx.save(); ctx.translate(seat.dx, -barH); ctx.rotate(seat.angle);
    for (const x of [-12, 12]) line([[x, 0], [x, rope]], sw.seed + seat.dx + x, 1.8, INK, 0.2);
    box([[-15, rope - 3], [15, rope - 3], [15, rope + 3], [-15, rope + 3]], '#ffd36b', sw.seed + seat.dx, 0.3, 2.2);
    ctx.restore();
  }
  tube([[-half - 3, -barH], [half + 3, -barH]], 6, red, sw.seed, 0.4);                                        // top bar
  for (const k of [-1, 1]) tube([[k * half, -barH], [k * (half + 14), 0]], 6, red, sw.seed + k + 9, 0.4);     // front legs
  ctx.restore();
}

/** The fish tank: a stand, a glass box of water, and whoever's living in it. */
export function drawTank(t) {
  const { w, h, legs } = TANK, g = t.progress, sd = t.seed, top = -legs - h;
  ctx.save(); ctx.translate(t.x, t.y);
  shadow(0, 2, w / 2 + 6, 5);
  for (const k of [-1, 1]) tube([[k * (w / 2 - 6), 0], [k * (w / 2 - 8), -legs]], 4, WOOD, sd + k, 0.4);
  if (g > 0.3) box([[-w / 2 - 4, -legs + 3], [w / 2 + 4, -legs + 3], [w / 2 + 4, -legs - 3], [-w / 2 - 4, -legs - 3]], WOOD, sd + 3, 0.5);
  if (g > 0.6) {
    const glass = [[-w / 2, -legs - 3], [w / 2, -legs - 3], [w / 2, top], [-w / 2, top]];
    box(glass, g >= 1 ? '#c9ecf8' : '#fff', sd + 4, 0.5);
    if (g >= 1) {
      ctx.save(); polyPath(glass); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, top - 2, w, 7);                                     // air above the waterline
      ctx.fillStyle = '#e9d9a8'; ctx.fillRect(-w / 2, -legs - 9, w, 8);                                // gravel
      line([[-w / 2 + 9, -legs - 8], [-w / 2 + 6 + Math.sin(S.now * 1.3) * 2, -legs - 20], [-w / 2 + 10, -legs - 30]], sd + 5, 2.4, '#7fd66a', 0.3);
      t.fish.forEach((f, i) => {
        const sp = SPECIES_BY_ID[f.id];
        if (!sp) return;
        const sc = Math.min(0.55, 15 / (sp.L || 26));
        if (sp.kind === 'boot') return drawFish(sp, w / 2 - 12, -legs - 13, 0.55, f.seed);            // sits on the bottom
        const ph = S.now * (0.25 + hs(f.seed, 1) * 0.25) + hs(f.seed, 2) * 9, span = w / 2 - 12;
        const x = Math.sin(ph) * span, y = top + 13 + (i % 3) * 9 + Math.sin(ph * 2.3 + i) * 2;
        drawFish(sp, x, y, sc, f.seed, Math.cos(ph) < 0);
      });
      ctx.restore();
      polyPath(wob(glass, sd + 4, 0.5)); paint(null);
    }
  }
  ctx.restore();
}

// ---- art: paintings on easels and sculptures on plinths ----
const CANVAS = [[-22, -68], [22, -68], [22, -30], [-22, -30]];

// A painted miniature of one thing the painter could see (a.view, captured in
// activities/art.js). x/y are offsets from the easel in world units.
function mini(el) {
  const px = el.x / VIEW.rx * 18, py = -43 + el.y / VIEW.ry * 11;   // leave headroom: things are drawn upwards from their base
  if (el.k === 'pond' || el.k === 'pool' || el.k === 'stream' || el.k === 'bridge') return miniShape(el, px, py);
  ctx.save(); ctx.translate(px, py); ctx.scale(1.25, 1.25);   // a little bigger than life, so it reads
  miniShape(el, 0, 0);
  ctx.restore();
}
function miniShape(el, x, y) {
  const fill = (c) => { ctx.fillStyle = c; ctx.fill(); };
  const oval = (cx, cy, rx, ry, c) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); fill(c); };
  const rect = (rx, ry, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(rx, ry, w, h); };
  switch (el.k) {
    case 'stream':
      ctx.beginPath();
      el.pts.forEach(([sx, sy], i) => ctx[i ? 'lineTo' : 'moveTo'](sx / VIEW.rx * 18, -43 + sy / VIEW.ry * 11));
      ctx.lineWidth = 3.4; ctx.strokeStyle = '#a8dcf5'; ctx.lineJoin = 'round'; return ctx.stroke();
    case 'pond': return oval(x, y, el.rx / VIEW.rx * 21, el.ry / VIEW.ry * 18, '#a8dcf5');
    case 'pool': oval(x, y, el.rx / VIEW.rx * 21 + 1, el.ry / VIEW.ry * 18 + 1, '#fff'); return oval(x, y, el.rx / VIEW.rx * 21, el.ry / VIEW.ry * 18, '#74dbe8');
    case 'tree': rect(x - 0.9, y - 5, 1.8, 5, '#b06634'); oval(x - 2, y - 6.6, 2.6, 2.3, el.c); oval(x + 2, y - 6.6, 2.6, 2.3, el.c); oval(x, y - 8.6, 2.8, 2.6, el.c); oval(x - 1, y - 7, 0.7, 0.7, '#fb6540'); return oval(x + 1.4, y - 6.4, 0.7, 0.7, '#fb6540');
    case 'house': {
      const add = el.add || [], top = add.includes('upstairs') ? 8 : 5.5;
      if (add.includes('annex')) { rect(x - 7.5, y - 3.2, 4, 3.2, el.c); ctx.beginPath(); ctx.moveTo(x - 8.2, y - 3); ctx.lineTo(x - 3.6, y - 5.2); ctx.lineTo(x - 3.6, y - 3); ctx.closePath(); fill(el.c2); }
      if (add.includes('chimney')) rect(x + 1.6, y - top - 5, 1.8, 4, el.c);
      rect(x - 4, y - top, 8, top, el.c);
      rect(x - 1.2, y - 3.2, 2.4, 3.2, shade(el.c, 0.8));
      ctx.beginPath(); ctx.moveTo(x - 5.4, y - top + 0.6); ctx.lineTo(x, y - top - 4.2); ctx.lineTo(x + 5.4, y - top + 0.6); ctx.closePath(); return fill(el.c2);
    }
    case 'bridge':
      ctx.beginPath();
      el.pts.forEach(([sx, sy], i) => ctx[i ? 'lineTo' : 'moveTo'](sx / VIEW.rx * 18, -43 + sy / VIEW.ry * 11));
      ctx.lineWidth = 2.6; ctx.strokeStyle = WOOD; ctx.lineCap = 'butt'; ctx.stroke(); ctx.lineCap = 'round'; return;
    case 'tank': rect(x - 2.6, y - 1.6, 0.8, 1.6, WOOD); rect(x + 1.8, y - 1.6, 0.8, 1.6, WOOD); rect(x - 3.2, y - 5.2, 6.4, 3.6, '#8fd8ee'); return oval(x + 0.6, y - 3.4, 1, 0.6, '#ffa23d');
    case 'swing': ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 5, y - 9); ctx.lineTo(x + 5, y - 9); ctx.lineTo(x + 6, y); ctx.lineWidth = 1.3; ctx.strokeStyle = '#ff8f8f'; return ctx.stroke();
    case 'fire': rect(x - 2, y - 0.6, 4, 1.2, '#b06634'); return oval(x, y - 2, 1.4, 2, '#ffab45');
    case 'critter': rect(x - 1.2, y - 3.4, 2.4, 3.4, el.c2); return oval(x, y - 5, 2, 1.9, el.c);
    case 'flower': return oval(x, y - 1, 1.1, 1.1, el.c);
    case 'art': return rect(x - 1.5, y - 4, 3, 3, '#d9d0ff');
  }
}

const PAINTINGS = {
  view: a => [
    () => { ctx.fillStyle = '#f3fbdc'; ctx.fillRect(-24, -70, 48, 42); },
    ...a.view.map(el => () => mini(el)),
  ],
  portrait: a => [
    () => { ctx.fillStyle = a.c3; ctx.fillRect(-20, -62, 40, 36); },
    () => box([[-7, -36], [7, -36], [8, -26], [-8, -26]], a.c2, a.seed + 3, 0.3, 1.6),
    () => blob(0, -46, 9.5, 9, a.c1, a.seed + 4, 8, 0.06, 0.3, 1.8),
    () => { dot(1.5, -49, 1); dot(4, -48.4, 1); line([[-2, -46], [-2, -41], [1, -39], [4, -42], [4.5, -45.5]], a.seed + 5, 1.4, INK, 0.2); },
  ],
  landscape: a => [
    () => { ctx.fillStyle = '#c8f0ff'; ctx.fillRect(-20, -62, 40, 36); },
    () => blob(8, -51, 5, 5, '#ffe66d', a.seed + 3, 7, 0.04, 0.3, 1.6),
    () => blob(-6, -27, 20, 12, a.c1, a.seed + 4, 9, 0.1, 0.3, 1.8),
    () => blob(12, -25, 14, 9, a.c2, a.seed + 5, 8, 0.1, 0.3, 1.8),
  ],
  abstract: a => [0, 1, 2, 3, 4].map(i => () =>
    blob((hs(a.seed, i) - 0.5) * 24, -44 + (hs(a.seed, i + 9) - 0.5) * 22, 4 + hs(a.seed, i + 20) * 6, 4 + hs(a.seed, i + 30) * 6, [a.c1, a.c2, a.c3][i % 3], a.seed + 3 + i, 7, 0.2, 0.3, 1.6)),
};
const SCULPTURES = {
  critter: a => {
    box([[-7, -10], [7, -10], [7, -30], [-7, -30]], STONE, a.seed + 3, 0.4, 2.2);
    for (const k of [-1, 1]) line([[k * 7, -26], [k * 17, -18]], a.seed + 4 + k, 5, INK, 0.3), line([[k * 7, -26], [k * 17, -18]], a.seed + 4 + k, 2.2, STONE, 0.3);
    blob(0, -42, 13, 12.5, STONE, a.seed + 6, 9, 0.06, 0.3, 2.2);
    dot(2, -46, 1.1); dot(5, -45, 1.1); line([[-3, -42], [-3, -36], [1, -33], [6, -37], [6.5, -41]], a.seed + 7, 1.6, INK, 0.2);
  },
  totem: a => {
    blob(0, -21, 12, 11, a.c1, a.seed + 3, 9, 0.1, 0.3, 2.2);
    blob(0, -38, 9.5, 9, a.c2, a.seed + 4, 8, 0.1, 0.3, 2.2);
    blob(0, -52, 7, 6.5, a.c3, a.seed + 5, 7, 0.1, 0.3, 2.2);
  },
  arch: a => tube([[-11, -11], [-13, -40], [0, -55], [13, -40], [11, -11]], 7, a.c1, a.seed + 3, 0.5),
};
/** The canvas itself: frame, and as much of the picture as has been painted so far. */
function paintCanvas(a, lw) {
  box(CANVAS, '#fff', a.seed + 1, 0.4, lw);
  const els = PAINTINGS[a.style](a), n = Math.ceil(a.progress * els.length - 0.001);
  ctx.save(); polyPath(wob(CANVAS, a.seed + 1, 0.4)); ctx.clip();
  for (let i = 0; i < n; i++) els[i]();
  ctx.restore();
  polyPath(wob(CANVAS, a.seed + 1, 0.4)); paint(null, lw);
}
/** A painting held up close: the same picture, k times bigger, centred on (x, y). */
export function drawPaintingLarge(a, x, y, k) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(0, 49);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(-21, -66, 46, 40);   // drop shadow
  paintCanvas(a, 3.2 / k);
  ctx.restore();
}
export function drawArt(a) {
  ctx.save(); ctx.translate(a.x, a.y);
  if (a.dying !== undefined) ctx.globalAlpha = clamp(a.dying, 0, 1);
  shadow(0, 1, 18, 4);
  if (a.type === 'painting') {
    for (const [x, y] of [[-16, 0], [16, 0], [3, -7]]) line([[0, -60], [x, y]], a.seed + x, 3, INK, 0.4);
    paintCanvas(a, 2.4);
  } else {
    box([[-15, 0], [15, 0], [13, -10], [-13, -10]], '#f1efe6', a.seed + 1, 0.4);
    const cut = -60 + 50 * a.progress;   // carved from the top down
    if (a.progress < 1) {
      ctx.save(); ctx.beginPath(); ctx.rect(-40, cut, 80, -8 - cut); ctx.clip();
      box([[-15, -10], [15, -10], [14, -58], [-14, -58]], STONE, a.seed + 2, 0.9);
      ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(-40, -80, 80, cut + 80); ctx.clip();
    SCULPTURES[a.style](a);
    ctx.restore();
  }
  ctx.restore();
}

// Flower: four soft petals round a yellow middle, a stubby stem and one leaf
// with a darker edge. No ink outline. It sprouts (stem and leaf) and then blooms.
const PETAL_AT = [[0.3, -4.2], [3.9, 0], [0.5, 4], [-4, 0.8]];
const LEAF = [[0, -4], [2.5, -6.5], [6.2, -7], [4.5, -3.5], [3.5, -0.8], [0.8, 0]];
export function drawFlower(f) {
  const g = clamp(f.age / 14, 0.15, 1), bloom = clamp((g - 0.4) / 0.6, 0, 1), sd = f.seed;
  const color = f.color === '#ffffff' ? '#ff6e45' : f.color;
  ctx.save(); ctx.translate(f.x, f.y);
  const k = 1.25 * (0.5 + 0.5 * g) * (hs(sd, 1) < 0.5 ? -1 : 1);
  ctx.scale(k, Math.abs(k));
  ctx.globalAlpha = f.dying !== undefined ? clamp(f.dying, 0, 1) : 1;
  smooth(wob(LEAF, sd, 0.2), true); ctx.fillStyle = '#adeb3c'; ctx.fill();
  line(LEAF, sd, 1.2, '#77dd1a', 0.2);
  line([[0.5, 0], [-0.5, -3], [-1.5, -6.5]], sd + 1, 3.6, '#adeb3c', 0.2);
  if (bloom > 0) {
    ctx.translate(-2.2, -11); ctx.scale(bloom, bloom);
    ctx.fillStyle = color;
    for (const [n, [px, py]] of PETAL_AT.entries()) { smooth(blobPts(px, py, 3.6, 3.6, 7, sd + 2 + n, 0.1, 0.25), true); ctx.fill(); }
    smooth(blobPts(0, 0, 2.8, 2.6, 7, sd + 8, 0.08, 0.2), true); ctx.fillStyle = '#ffe833'; ctx.fill();
  }
  ctx.restore();
}
export function drawApple(a) {
  const y = a.y - a.z;
  blob(a.x, y - 5, 6, 5.6, '#ff6b6b', a.seed, 7, 0.05, 0.3, 2.2);
  line([[a.x, y - 10], [a.x + 2, y - 14]], a.seed + 1, 2, INK, 0.2);
}
export function drawBall() {
  const b = S.ball, y = b.y - 8 - b.z, r = b.spin;
  shadow(b.x, b.y + 1, 8, 2.5);
  blob(b.x, y, 8, 8, '#fff', 77, 8, 0.02, 0.3, 2.4);
  line([[b.x - 7 * Math.cos(r), y - 7 * Math.sin(r)], [b.x + 3 * Math.sin(r), y - 3 * Math.cos(r)], [b.x + 7 * Math.cos(r), y + 7 * Math.sin(r)]], 78, 2.4, '#ff8fc7', 0.2);
}
// Grass: two flat green blades, no outline. Some tufts are mirrored or a bit bigger.
const BLADE_TALL = [[-1.6, -11], [0.3, -7], [1.5, -1], [-2.4, 0.2], [-4.4, -1], [-2.2, -6]];
const BLADE_SHORT = [[4.6, -6.2], [4, -3.2], [4.6, -0.2], [2.4, 0.2], [1.2, -1.2], [2.6, -4]];
export function drawTuft(t) {
  const m = (hs(t.seed, 1) < 0.5 ? -1 : 1) * (1.1 + hs(t.seed, 2) * 0.6), k = Math.abs(m);
  ctx.fillStyle = '#adeb3c';
  for (const [n, blade] of [BLADE_TALL, BLADE_SHORT].entries()) {
    smooth(wob(blade.map(p => [t.x + p[0] * m, t.y + p[1] * k]), t.seed + n, 0.25), true);
    ctx.fill();
  }
}
export function drawButterfly(f, night) {
  if (night >= 0.5) return;
  const flap = Math.abs(Math.sin(S.now * 12 + f.seed)) * 5 + 1.5;
  ctx.globalAlpha = 1 - night * 2;
  for (const k of [-1, 1]) box([[f.x, f.y], [f.x + k * flap, f.y - 5], [f.x + k * flap, f.y + 4]], f.color, f.seed + k, 0.2, 1.6);
  ctx.globalAlpha = 1;
}
export function drawSky(night) {
  const x = S.W - 44, y = 44;
  if (night < 0.5) {
    ctx.globalAlpha = 1 - night * 2;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + S.now * 0.1; line([[x + Math.cos(a) * 19, y + Math.sin(a) * 19], [x + Math.cos(a) * 26, y + Math.sin(a) * 26]], 900 + i, 2.6, INK, 0.3); }
    blob(x, y, 14, 14, '#ffe66d', 910, 9, 0.04, 0.4);
  } else {
    ctx.globalAlpha = night * 2 - 1;
    blob(x, y, 14, 14, '#fff7c7', 911, 9, 0.04, 0.4);
    dot(x - 4, y - 3, 2.4, '#e8dfa6'); dot(x + 5, y + 4, 3, '#e8dfa6');
  }
  ctx.globalAlpha = 1;
}
