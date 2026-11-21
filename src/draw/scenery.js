// Everything in town that isn't a critter.
import { ctx } from './canvas.js';
import { S } from '../state.js';
import { INK, LW, HOUSE, SWING, TANK, VIEW, STREAM_HALF, BRIDGE, WOOD, STONE } from '../config.js';
import { SPECIES_BY_ID } from '../data/fish.js';
import { drawFish } from './fish.js';
import { drawHat } from './cart.js';
import { drawSculpture, drawTopiary } from './sculpture.js';
import { drawSkyPicture } from './sky.js';
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
// The underside dips below the top of the walls, so the roof sits on the house with no gap.
const roofPts = top => [[-69, -top + 9], [-30, -top - 26], [-1, -top - HOUSE.roof + 2], [28, -top - 26], [62, -top + 8], [30, -top + 4], [0, -top + 2], [-35, -top + 5]];
function roofShape(h, fill, top) { box(roofPts(top), fill, h.seed + 1, 0.9); }

/**
 * The prankster's idea of decorating: a wild pattern filling the box from
 * (x0, y0) to (x1, y1). (The caller clips it to the wall or the roof.)
 */
export const WILD = ['zigzag', 'checks', 'rainbow', 'bubbles', 'swirls', 'splat', 'zebra', 'stars', 'waves', 'harlequin'];
function wild(style, cols, seed, x0, y0, x1, y1) {
  const col = i => cols[((i % cols.length) + cols.length) % cols.length], r = i => hs(seed, i), w = x1 - x0, h = y1 - y0;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const starAt = (x, y, R, c) => { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i / 10 * TAU, q = i % 2 ? R * 0.45 : R; ctx.lineTo(x + Math.cos(t) * q, y + Math.sin(t) * q); } ctx.fill(); };
  switch (style) {
    case 'zigzag':
      for (let row = 0, y = y0 - 4; y < y1 + 10; y += 9, row++) { ctx.strokeStyle = col(row + 1); ctx.lineWidth = 5; ctx.beginPath(); for (let x = x0 - 6, i = 0; x < x1 + 8; x += 8, i++) ctx.lineTo(x, y + (i % 2 ? 6 : 0)); ctx.stroke(); }
      break;
    case 'checks':
      for (let i = 0; i * 11 < w + 11; i++) for (let j = 0; j * 11 < h + 11; j++) if ((i + j) % 2) { ctx.fillStyle = col(1 + ((i * 3 + j) % 3)); ctx.fillRect(x0 + i * 11, y0 + j * 11, 11, 11); }
      break;
    case 'rainbow':
      for (let i = 0; i * 9 < w + 30; i++) { ctx.strokeStyle = col(i + 1); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x0 + i * 9 - 16, y1 + 4); ctx.lineTo(x0 + i * 9 + 4, y0 - 4); ctx.stroke(); }
      break;
    case 'bubbles':
      for (let i = 0; i < 22; i++) { const x = x0 + r(i) * w, y = y0 + r(i + 40) * h, R = 3 + r(i + 80) * 7; ctx.fillStyle = col(i + 1); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.fillStyle = col(i + 2); ctx.beginPath(); ctx.arc(x, y, R * 0.45, 0, TAU); ctx.fill(); }
      break;
    case 'swirls':
      for (let i = 0; i < 7; i++) { const x = x0 + r(i) * w, y = y0 + r(i + 40) * h; ctx.strokeStyle = col(i + 1); ctx.lineWidth = 3.4; ctx.beginPath(); for (let t = 0; t < 4.2 * Math.PI; t += 0.3) ctx.lineTo(x + Math.cos(t) * t * 1.15, y + Math.sin(t) * t * 1.15); ctx.stroke(); }
      break;
    case 'splat':
      for (let i = 0; i < 12; i++) {
        const x = x0 + r(i) * w, y = y0 + r(i + 40) * h, R = 4 + r(i + 80) * 6;
        ctx.fillStyle = ctx.strokeStyle = col(i + 1);
        ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        for (let k = 0; k < 5; k++) { const t = r(i * 7 + k) * TAU, d = R + 2 + r(i * 9 + k) * 6; ctx.beginPath(); ctx.arc(x + Math.cos(t) * d, y + Math.sin(t) * d, 1 + r(i + k) * 1.6, 0, TAU); ctx.fill(); }
        ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r(i + 5) - 0.5) * 3, y + R + 6 + r(i + 6) * 12); ctx.stroke();   // a drip
      }
      break;
    case 'zebra':
      for (let i = -2; i * 13 < w + 40; i++) { ctx.strokeStyle = col(1 + (i & 1)); ctx.lineWidth = 6; ctx.beginPath(); for (let y = y0 - 4; y <= y1 + 4; y += 6) ctx.lineTo(x0 + i * 13 + Math.sin(y * 0.16 + i) * 6 + (y - y0) * 0.25, y); ctx.stroke(); }
      break;
    case 'stars':
      for (let i = 0; i < 16; i++) starAt(x0 + r(i) * w, y0 + r(i + 40) * h, 4 + r(i + 80) * 5, col(i + 1));
      break;
    case 'waves':
      for (let row = 0, y = y0 - 2; y < y1 + 8; y += 8, row++) { ctx.strokeStyle = col(row + 1); ctx.lineWidth = 4.5; ctx.beginPath(); for (let x = x0 - 4; x <= x1 + 4; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.22 + row * 1.3) * 3.5); ctx.stroke(); }
      break;
    default:   // harlequin: diamonds
      for (let i = -1; i * 14 < w + 14; i++) for (let j = -1; j * 18 < h + 18; j++) {
        const x = x0 + i * 14 + (j % 2 ? 7 : 0), y = y0 + j * 9 + 9;
        ctx.fillStyle = col(1 + ((i + j * 2) % 4 + 4) % 4); ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 7, y); ctx.fill();
      }
  }
}
/** Paint a wild pattern inside the outline `pts` (already-wobbled points), then redraw the outline. */
function wildFill(pts, style, cols, seed) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  ctx.save(); polyPath(pts); ctx.clip();
  wild(style, cols, seed, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
  ctx.restore();
  polyPath(pts); paint(null);
}

export function drawHouse(h, lit) {
  const sd = h.seed, p = h.progress, done = p >= 1, top = wallTop(h);
  const pr = done && h.prank;   // repainted by the prankster
  const wall = pr ? pr.wall : done || p > 0.86 ? h.color : '#fff', roof = pr ? pr.roof : done ? h.roof : '#fff', door = shade(pr ? pr.wall : h.color, 0.8);   // paint goes on last
  ctx.save(); ctx.translate(h.x, h.y); ctx.scale(HOUSE.scale, HOUSE.scale);
  shadow(0, 2, 60, 6);
  const adding = h.adding, pole = (x, hgt) => line([[x, 2], [x + jit(sd, 9, 1), -hgt]], sd + (x | 0), 3, WOOD, 0.6);
  if (adding) { pole(-62, top + 20); pole(60, top + 20); }                                       // scaffolding for an add-on
  if (has(h, 'annex')) annex(h, wall, roof);
  else if (adding && adding.what === 'annex') { pole(-92, 60); if (adding.progress > 0.4) annex(h, '#fff', '#fff'); }

  if (!done) {   // the timber frame goes up first, and the walls are filled in inside it
    const f = clamp(p / 0.28, 0.15, 1), post = x => tube([[x, 0], [x, -top * f]], 3, WOOD, sd + 90 + x, 0.4);
    post(-47); post(45); post(-1);
    if (f >= 1) {
      tube([[-49, -top], [47, -top]], 3, WOOD, sd + 93, 0.4);
      tube([[-47, -4], [-1, -top + 4]], 2.4, WOOD, sd + 94, 0.4);                                // a brace
      for (const [x0, x1] of [[-58, -1], [56, -1]]) tube([[x0, -top + 2], [x1, -top - HOUSE.roof + 4]], 3, WOOD, sd + 95 + x0, 0.4);   // rafters
    }
    for (const x of [52, 60]) line([[x + 8, 2], [x - 6, -top * 0.9]], sd + 97 + x, 2.2, INK, 0.3);   // a ladder against the side
    for (let i = 1; i < 6; i++) line([[59 - i * 2.2, 2 - i * top * 0.15], [67 - i * 2.2, 2 - i * top * 0.15]], sd + 99 + i, 1.8, INK, 0.2);
  }
  const k = done ? 1 : clamp((p - 0.22) / 0.48, 0.02, 1), y = v => -v * k;                       // walls rise as it's built
  let wtop = top;
  if (adding && adding.what === 'upstairs') wtop = top + HOUSE.upstairs * clamp(adding.progress / 0.8, 0, 1);
  if (has(h, 'chimney')) chimney(h, wall, door, wtop);
  else if (adding && adding.what === 'chimney' && adding.progress > 0.4) chimney(h, '#fff', '#fff', wtop);
  const wallPts = [[-49, 0], [-44, y(28)], [-45, y(wtop - 25)], [-50, y(wtop)], [48, y(wtop)], [44, y(wtop - 25)], [42, y(28)], [47, 0]];
  box(wallPts, wall, sd, 0.8);
  const loud = pr && (pr.colors || [pr.wall, pr.roof, pr.dots, pr.wall]);   // (older saves had three colours)
  if (pr) wildFill(wob(wallPts, sd, 0.8), WILD.includes(pr.style) ? pr.style : 'bubbles', loud, (pr.seed || sd) + 1);
  if (done || p > 0.7) roofShape(h, roof, wtop);
  if (pr) wildFill(wob(roofPts(wtop), sd + 1, 0.9), WILD.includes(pr.roofStyle) ? pr.roofStyle : 'zigzag', loud.slice().reverse(), (pr.seed || sd) + 2);   // the roof gets a different one
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
  if (drawTopiary(t)) { ctx.restore(); return; }   // clipped into a shape: no lobes, no apples showing
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
  blob(p.x, p.y, p.rx, p.ry, p.dye || '#74dbe8', p.seed + 1, 16, 0.01, 0.5, 2.2);     // water (dyed, if the prankster's been)
  ripples(p, 4, p.rx * 1.2, p.ry);
  for (const j of p.junk || []) {   // ...and whatever they tipped in, bobbing about
    const a = j.a + S.now * 0.1 * (j.seed % 2 ? 1 : -1), x = p.x + Math.cos(a) * p.rx * j.r, y = p.y + Math.sin(a) * p.ry * j.r + Math.sin(S.now * 2 + j.seed) * 1.2;
    if (j.what === 'fish') drawFish(SPECIES_BY_ID.goldfish, x, y, 0.6, j.seed, Math.cos(a) > 0);
    else { blob(x, y, 5, 4.6, '#fb6540', j.seed, 7, 0.06, 0.2, 2); line([[x, y - 4], [x + 1.5, y - 7.5]], j.seed + 1, 1.6, INK, 0.1); }
  }
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
  // The same scene with a wash of one colour over it.
  tinted: a => [
    ...PAINTINGS.view(a),
    () => { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = a.tint.color; ctx.fillRect(-24, -70, 48, 42); ctx.globalCompositeOperation = 'source-over'; },
  ],
  // One thing from the view, filling the canvas.
  closeup: a => {
    const el = a.subject, bg = a.bg || '#fff3b0';
    if (el.k === 'critter') return [
      ...PAINTINGS.portrait({ ...a, c1: el.c, c2: el.c2, c3: bg }),
      () => { if (el.hat) { ctx.save(); ctx.translate(0, -56.5); ctx.scale(0.55, 0.55); drawHat(el.hat, 1, a.seed + 9); ctx.restore(); } },
    ];
    if (el.k === 'fish') {
      const sp = SPECIES_BY_ID[el.id];
      return [
        () => { ctx.fillStyle = '#c9ecf8'; ctx.fillRect(-24, -70, 48, 42); },
        () => { for (let i = 0; i < 5; i++) dot(-18 + hs(a.seed, i) * 36, -64 + hs(a.seed, i + 9) * 30, 1 + hs(a.seed, i + 20), '#fff'); },
        () => { if (sp) drawFish(sp, 1, -49, Math.min(1.6, 36 / ((sp.L || 26) + 12)), a.seed); },
      ];
    }
    if (el.k === 'sky') return [() => { ctx.save(); ctx.translate(-24, -70); drawSkyPicture(el.id, 48, 42); ctx.restore(); }];
    if (el.k === 'dream') return (DREAM_PICS[el.id] || DREAM_PICS.fly)(a, el, bg);
    if (el.k === 'adventure') return (FAR_PLACES[el.place] || FAR_PLACES.mountains)(a);
    if (el.k === 'event') return (EVENT_PICS[el.id === 'cart' ? el.kind : el.id] || EVENT_PICS.rain)(a, bg);
    const k = { tree: 3.3, house: 2.5, tank: 5, swing: 3.2, fire: 6, flower: 4.6 }[el.k] || 3;
    return [
      () => { ctx.fillStyle = bg; ctx.fillRect(-24, -70, 48, 42); },
      () => { ctx.fillStyle = shade(bg, 0.9); ctx.fillRect(-24, -37, 48, 9); },
      () => { ctx.save(); ctx.translate(0, -34); ctx.scale(k, k); if (el.k === 'flower') bigFlower(el); else miniShape(el, 0, 0); ctx.restore(); },
    ];
  },
  portrait: a => [
    () => { ctx.fillStyle = a.c3; ctx.fillRect(-24, -70, 48, 42); },
    () => box([[-9, -37], [9, -37], [11, -27], [-11, -27]], a.c2, a.seed + 3, 0.3, 1.6),
    () => blob(0, -46.5, 12, 11.5, a.c1, a.seed + 4, 8, 0.06, 0.3, 1.8),
    () => { dot(2, -50.5, 1.2); dot(5.2, -49.7, 1.2); line([[-2.5, -46.5], [-2.5, -40.5], [1.5, -38], [5.5, -41.5], [6, -46]], a.seed + 5, 1.6, INK, 0.2); },
  ],
  landscape: a => [
    () => { ctx.fillStyle = '#c8f0ff'; ctx.fillRect(-24, -70, 48, 42); },
    () => blob(8, -51, 5, 5, '#ffe66d', a.seed + 3, 7, 0.04, 0.3, 1.6),
    () => blob(-6, -27, 20, 12, a.c1, a.seed + 4, 9, 0.1, 0.3, 1.8),
    () => blob(12, -25, 14, 9, a.c2, a.seed + 5, 8, 0.1, 0.3, 1.8),
  ],
  // No subject at all: just the colours of whatever was around, arranged.
  abstract: a => {
    const pal = a.palette || [a.c1, a.c2, a.c3], col = i => pal[i % pal.length], r = i => hs(a.seed, i);
    const fillBox = (c, x0, y0, x1, y1) => { ctx.fillStyle = c; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); };
    switch (a.variant) {
      case 'stripes':
        return [0, 1, 2, 3, 4, 5].map(i => () => {
          const x = -24 + i * 8;
          ctx.fillStyle = col(i); ctx.beginPath();
          ctx.moveTo(x + r(i) * 3, -70); ctx.lineTo(x + 9 + r(i + 9) * 3, -70); ctx.lineTo(x + 9 + r(i + 20) * 3, -28); ctx.lineTo(x + r(i + 30) * 3, -28); ctx.fill();
        });
      case 'grid': {
        const xs = [-24, -15 + r(1) * 8, 2 + r(2) * 8, 24], ys = [-70, -60 + r(3) * 6, -46 + r(4) * 6, -28], cells = [];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (r(10 + i * 3 + j) < 0.55) cells.push(() => fillBox(col(i * 3 + j), xs[i], ys[j], xs[i + 1], ys[j + 1]));
        return [
          () => fillBox('#fff', -24, -70, 24, -28),
          ...cells,
          () => { ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); for (const x of xs.slice(1, 3)) { ctx.moveTo(x, -70); ctx.lineTo(x, -28); } for (const y of ys.slice(1, 3)) { ctx.moveTo(-24, y); ctx.lineTo(24, y); } ctx.stroke(); },
        ];
      }
      case 'rings': {
        const cx = (r(1) - 0.5) * 16, cy = -49 + (r(2) - 0.5) * 10;
        return [0, 1, 2, 3, 4, 5].map(i => () => { ctx.fillStyle = col(i); ctx.beginPath(); ctx.ellipse(cx, cy, 34 - i * 5.5, 30 - i * 5, 0, 0, TAU); ctx.fill(); });
      }
      default:
        return [() => fillBox('#fff', -24, -70, 24, -28), ...[0, 1, 2, 3, 4, 5].map(i => () =>
          blob((r(i) - 0.5) * 30, -49 + (r(i + 9) - 0.5) * 26, 4 + r(i + 20) * 8, 4 + r(i + 30) * 7, col(i), a.seed + 3 + i, 7, 0.2, 0.3, 1.6))];
    }
  },
};
// Paintings of rare events (see src/events/), done from memory.
const fillAll = c => () => { ctx.fillStyle = c; ctx.fillRect(-24, -70, 48, 42); };
const disc = (x, y, rx, ry, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
const EVENT_PICS = {
  rain: () => [
    fillAll('#e4f1ff'),
    () => ['#ff6e6e', '#ffab5c', '#ffe66d', '#8fe3a0', '#8fc7ff', '#b7a6ff'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(0, -30, 32 - i * 3.2, Math.PI, TAU); ctx.stroke(); }),
    () => { for (const [x, y, r] of [[-15, -60, 5], [-9, -63, 6], [-3, -60, 5]]) disc(x, y, r, r * 0.8, '#fff'); },
    () => { for (const [x, y] of [[-14, -52], [-8, -50], [-3, -53]]) disc(x, y, 0.9, 1.6, '#6fa8e6'); },
  ],
  star: a => [
    fillAll('#3b3f73'),
    () => { for (let i = 0; i < 9; i++) disc(-22 + hs(a.seed, i) * 44, -68 + hs(a.seed, i + 9) * 34, 0.7, 0.7, '#fff'); },
    () => { ctx.strokeStyle = '#fff3a8'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-20, -66); ctx.lineTo(0, -51); ctx.stroke(); },
    () => { ctx.fillStyle = '#fff3a8'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 4 : 9.5; ctx.lineTo(5 + Math.cos(t) * r, -46 + Math.sin(t) * r); } ctx.fill(); },
  ],
  wind: () => [
    fillAll('#eef7ff'),
    ...[-60, -49, -38].map((y, i) => () => { ctx.strokeStyle = '#8fa3b8'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-20, y); ctx.quadraticCurveTo(0, y - 5, 12 - i * 5, y); ctx.arc(12 - i * 5, y - 3, 3, Math.PI / 2, -Math.PI * 0.9, true); ctx.stroke(); }),
    () => { disc(15, -58, 3, 1.6, '#adeb3c'); disc(-10, -43, 3, 1.6, '#ff8fc7'); disc(8, -34, 3, 1.6, '#adeb3c'); },
  ],
  ducks: () => [
    fillAll('#a8dcf5'),
    () => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; for (const [x, y] of [[-14, -34], [10, -36], [-2, -62]]) { ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x, y - 2, x + 5, y); ctx.stroke(); } },
    () => { disc(2, -44, 11, 7, '#fff'); disc(11, -54, 5, 5, '#fff'); ctx.fillStyle = '#ffa23d'; ctx.beginPath(); ctx.moveTo(15, -55); ctx.lineTo(21, -53); ctx.lineTo(15, -51); ctx.fill(); disc(12.5, -55, 0.9, 0.9, INK); },
    () => { disc(-14, -40, 5.5, 3.6, '#ffe66d'); disc(-10, -45, 2.8, 2.8, '#ffe66d'); },
  ],
  ring: (a, bg) => [
    fillAll(bg),
    () => { ctx.fillStyle = shade(bg, 0.9); ctx.fillRect(-24, -37, 48, 9); },
    () => { ctx.fillStyle = '#fff'; ctx.fillRect(-3.5, -47, 7, 14); },
    () => { ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.ellipse(0, -46, 14, 11, 0, Math.PI, TAU); ctx.fill(); disc(-6, -51, 2, 1.6, '#fff'); disc(4, -53, 1.8, 1.4, '#fff'); disc(7, -48.5, 1.4, 1.1, '#fff'); },
  ],
  hat: (a, bg) => [fillAll(bg), () => { ctx.save(); ctx.translate(0, -40); ctx.scale(1.5, 1.5); drawHat({ kind: 'top', color: a.c1 }, 1, a.seed); ctx.restore(); }],
  balloon: a => [
    fillAll('#e4f1ff'),
    ...[[-10, -52, a.c1], [0, -57, a.c2], [10, -51, a.c3]].map(([x, y, c]) => () => { ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(0, -31); ctx.stroke(); disc(x, y, 6, 7.5, c); }),
  ],
  ice: (a, bg) => [
    fillAll(bg),
    () => { ctx.fillStyle = '#f0c27a'; ctx.beginPath(); ctx.moveTo(-7, -46); ctx.lineTo(7, -46); ctx.lineTo(0, -31); ctx.fill(); },
    () => { disc(0, -50, 8, 7, '#ff8fc7'); disc(0, -59, 6, 5.5, '#fff3b0'); },
  ],
};
// Dreams, painted the morning after. `el.c` and `el.c2` are the dreamer's own colours.
const me = (el, x, y, k = 1) => { ctx.fillStyle = el.c2; ctx.fillRect(x - 3 * k, y, 6 * k, 8 * k); disc(x, y - 3.5 * k, 5 * k, 4.8 * k, el.c); disc(x + 1.2 * k, y - 4.6 * k, 0.6 * k, 0.6 * k, INK); disc(x + 2.8 * k, y - 4.2 * k, 0.6 * k, 0.6 * k, INK); };
const DREAM_PICS = {
  fly: (a, el) => [
    fillAll('#cfe6ff'), band('#b5e8a8', -33, -28),
    () => { for (const [x, y] of [[-14, -40], [12, -62]]) { disc(x, y, 6, 3.2, '#fff'); disc(x + 4, y - 2, 5, 3, '#fff'); disc(x - 4, y - 1, 4, 2.6, '#fff'); } },
    () => { ctx.save(); ctx.translate(-1, -50); ctx.rotate(-0.5); me(el, 0, 0, 1.2); ctx.strokeStyle = el.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(10, 2); ctx.stroke(); ctx.restore(); },
  ],
  apple: (a, el, bg) => [
    fillAll(bg), band(shade(bg, 0.9), -34, -28),
    () => { disc(-3, -46, 15, 14, '#fb6540'); ctx.strokeStyle = '#7a3b1e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -59); ctx.lineTo(-1, -64); ctx.stroke(); disc(3, -62, 3.4, 1.8, '#adeb3c'); },
    () => me(el, 16, -38, 0.7),
  ],
  fish: (a, el) => [
    fillAll('#c9ecf8'),
    () => { for (let i = 0; i < 5; i++) disc(-18 + hs(a.seed, i) * 36, -64 + hs(a.seed, i + 9) * 30, 1 + hs(a.seed, i + 20), 1 + hs(a.seed, i + 20), '#fff'); },
    () => { tri([[-10, -48], [-20, -56], [-18, -48], [-20, -40]], el.c); disc(1, -48, 13, 8, el.c); disc(6, -51, 0.9, 0.9, INK); disc(9, -50.4, 0.9, 0.9, INK); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(3, -48); ctx.quadraticCurveTo(6, -42, 10, -47); ctx.stroke(); },
  ],
  moon: () => [
    fillAll('#3b3f73'), band('#56705a', -36, -28),
    () => { for (let i = 0; i < 8; i++) disc(-22 + i * 6.3, -66 + (i * 7 % 13), 0.7, 0.7, '#fff'); },
    () => { disc(2, -41, 12, 12, '#f4f1dc'); disc(-2, -44, 3, 2.6, '#d6d3bd'); disc(6, -38, 2.2, 2, '#d6d3bd'); },
  ],
  bridge: () => [
    fillAll('#ffe9dc'), band('#a8dcf5', -44, -28),
    () => tri([[-16, -28], [16, -28], [1.5, -58], [-1.5, -58]], '#c9966b'),
    () => { ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 0.9; for (let i = 0; i < 7; i++) { const y = -30 - i * 4.2, w = 15 - i * 2.1; ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke(); } },
  ],
  hat: (a, el, bg) => [
    fillAll(bg),
    () => { ctx.save(); ctx.translate(-5, -38); ctx.scale(1.3, 1.3); drawHat({ kind: 'top', color: '#555' }, 1, a.seed); ctx.restore(); },
    () => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-10, -44); ctx.quadraticCurveTo(-5, -40, 0, -44); ctx.stroke(); },
    () => { disc(12, -58, 8, 5.5, '#fff'); for (const x of [9, 12, 15]) disc(x, -58, 0.8, 0.8, INK); },
  ],
  soup: () => [
    fillAll('#eef7ff'),
    () => { for (let i = 0; i < 9; i++) disc(-20 + hs(5, i) * 40, -66 + hs(6, i) * 22, 1.3, 2.2, '#ffab45'); },
    () => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, -38, 15, 9, 0, 0, Math.PI); ctx.fill(); disc(0, -38, 15, 3.4, '#ffab45'); },
  ],
  tree: (a, el, bg) => [
    fillAll(bg), band(shade(bg, 0.9), -32, -28),
    () => { ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (const [x1, x2] of [[-2, -8], [2, 7]]) { ctx.beginPath(); ctx.moveTo(x1, -40); ctx.lineTo(x2, -32); ctx.lineTo(x2 + 4, -32); ctx.stroke(); } },
    () => { ctx.fillStyle = '#b06634'; ctx.fillRect(-3, -52, 6, 13); disc(0, -57, 11, 9, '#adeb3c'); disc(-3, -57, 1.4, 1.4, '#fb6540'); disc(4, -60, 1.4, 1.4, '#fb6540'); },
  ],
  small: (a, el) => [
    fillAll('#e6f7d0'), band('#b5e8a8', -33, -28),
    () => { ctx.fillStyle = '#7fd66a'; ctx.fillRect(-4, -52, 3, 22); for (const [x, y] of [[-2.5, -62], [4, -56], [-2.5, -50], [-9, -56]]) disc(x, y, 5, 5, '#ff8fc7'); disc(-2.5, -56, 3.6, 3.6, '#ffe833'); },
    () => me(el, 13, -35, 0.45),
  ],
};

// Places a critter has been on an adventure, painted from memory once they're home.
const tri = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.fill(); };
const band = (c, y0, y1) => () => { ctx.fillStyle = c; ctx.fillRect(-24, y0, 48, y1 - y0); };
const FAR_PLACES = {
  mountains: () => [
    fillAll('#dff0ff'), () => disc(14, -60, 4.5, 4.5, '#ffe66d'),
    () => { tri([[-26, -28], [-8, -60], [8, -28]], '#aab2c8'); tri([[-13.5, -50], [-8, -60], [-2.6, -50], [-6, -47], [-9.5, -50.5]], '#fff'); },
    () => { tri([[-4, -28], [11, -52], [26, -28]], '#c3c9da'); tri([[6.6, -45], [11, -52], [15.4, -45], [12, -43.5]], '#fff'); },
    band('#b5e8a8', -32, -28),
  ],
  sea: () => [
    fillAll('#dff0ff'), band('#7fc4fd', -48, -28),
    () => { disc(-2, -46, 12, 6, '#4a78b8'); tri([[-13, -46], [-21, -53], [-19, -45], [-22, -41]], '#4a78b8'); disc(4, -48, 0.9, 0.9, '#fff'); },
    () => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -53); ctx.quadraticCurveTo(k * 2, -60, k * 5, -57); ctx.stroke(); } },
    () => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; for (const [x, y] of [[-16, -34], [10, -37], [16, -31], [-4, -31]]) { ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.quadraticCurveTo(x, y - 2, x + 4, y); ctx.stroke(); } },
  ],
  desert: () => [
    fillAll('#ffe9c2'), () => disc(-13, -59, 5.5, 5.5, '#ffab45'),
    () => { disc(-10, -30, 24, 10, '#f2c879'); disc(16, -28, 20, 9, '#eab960'); },
    () => { ctx.fillStyle = '#7fd66a'; ctx.fillRect(7, -52, 4, 18); ctx.fillRect(1.5, -46, 3, 7); ctx.fillRect(1.5, -41, 6, 3); ctx.fillRect(13.5, -49, 3, 6); ctx.fillRect(11, -45, 5, 3); },
  ],
  city: a => [
    fillAll('#e9e4ff'),
    ...[[-22, 9, 26], [-12, 8, 36], [-3, 9, 22], [7, 7, 32], [15, 9, 18]].map(([x, w, h], i) => () => {
      ctx.fillStyle = i % 2 ? '#9aa3c4' : '#b7bfdc'; ctx.fillRect(x, -28 - h, w, h);
      ctx.fillStyle = '#ffe98a'; for (let y = -30 - h + 5; y < -32; y += 6) for (let dx = 2; dx < w - 2; dx += 3.5) if (hs(a.seed, i * 50 + y + dx) > 0.35) ctx.fillRect(x + dx, y, 1.6, 2.4);
    }),
  ],
  forest: () => [
    fillAll('#d9f2c4'), band('#b8dba0', -34, -28),
    ...[-17, -6, 5, 16].map((x, i) => () => { ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - 2, -62, 4, 34); disc(x, -62 + (i % 2) * 4, 8, 9, i % 2 ? '#4f9a54' : '#3f8a4c'); }),
    () => { disc(0, -44, 2.6, 3, '#8a5a34'); disc(-1, -45, 0.7, 0.7, '#fff'); disc(1, -45, 0.7, 0.7, '#fff'); },
  ],
  island: () => [
    fillAll('#dff0ff'), band('#7fc4fd', -44, -28),
    () => disc(-4, -34, 15, 5, '#f2dfa8'),
    () => { ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, -36); ctx.quadraticCurveTo(-2, -48, -6, -56); ctx.stroke(); for (const [dx, dy] of [[-8, -2], [8, -1], [-5, 4], [6, 4], [0, -5]]) disc(-6 + dx * 0.7, -56 + dy * 0.6, 5, 2, '#5fb86a'); },
    () => { tri([[11, -38], [21, -38], [19, -35], [13, -35]], '#c9966b'); tri([[15.5, -39], [15.5, -48], [20, -40]], '#fff'); },
  ],
};
/** A scene for the theatre's backdrop, in the same 48×42 box paintings use. */
export function drawBackdrop(id, seed) {
  const a = { seed, c1: '#ff8fc7', c2: '#8fd3ff', c3: '#ffe66d' };
  const steps = id === 'star' ? EVENT_PICS.star(a) : id === 'rain' ? EVENT_PICS.rain(a) : id === 'pond' ? EVENT_PICS.ducks(a).slice(0, 2) : (FAR_PLACES[id] || FAR_PLACES.forest)(a);
  for (const step of steps) step();
}
function bigFlower(el) {
  ctx.fillStyle = '#7fd66a'; ctx.fillRect(-0.4, -4, 0.8, 4);
  ctx.beginPath(); ctx.ellipse(1.3, -1.6, 1.3, 0.7, -0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = el.c === '#ffffff' ? '#ff6e45' : el.c;
  for (const [x, y] of [[0, -6.6], [1.5, -5.2], [0, -3.8], [-1.5, -5.2]]) { ctx.beginPath(); ctx.arc(x, y, 1.25, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#ffe833'; ctx.beginPath(); ctx.arc(0, -5.2, 0.95, 0, TAU); ctx.fill();
}
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
/** A fine curly moustache, for drawing on things. */
export function moustache(x, y, k) {
  ctx.strokeStyle = INK; ctx.lineWidth = 2 * k; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 5 * k, y + 3 * k, x + s * 9 * k, y - 2.5 * k); ctx.stroke(); }
}
export function drawArt(a) {
  if (a.type === 'sculpture') return drawSculpture(a);
  ctx.save(); ctx.translate(a.x, a.y);
  if (a.dying !== undefined) ctx.globalAlpha = clamp(a.dying, 0, 1);
  shadow(0, 1, 18, 4);
  if (a.type === 'painting') {
    for (const [x, y] of [[-16, 0], [16, 0], [3, -7]]) line([[0, -60], [x, y]], a.seed + x, 3, INK, 0.4);
    if (a.flipped) { ctx.translate(0, -49); ctx.rotate(Math.PI); ctx.translate(0, 49); }   // hung upside down
    paintCanvas(a, 2.4);
    if (a.moustache) moustache(a.flipped ? 0 : 2, -41, 1);
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
export function drawBall(b) {
  const y = b.y - 8 - b.z, r = b.spin;
  if (b.roof == null) shadow(b.x, b.y + 1, 8, 2.5);
  blob(b.x, y, 8, 8, '#fff', 77, 8, 0.02, 0.3, 2.4);
  line([[b.x - 7 * Math.cos(r), y - 7 * Math.sin(r)], [b.x + 3 * Math.sin(r), y - 3 * Math.cos(r)], [b.x + 7 * Math.cos(r), y + 7 * Math.sin(r)]], 78, 2.4, b.color || '#ff8fc7', 0.2);
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
