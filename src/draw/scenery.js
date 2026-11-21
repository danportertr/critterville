// Everything in town that isn't a critter.
import { ctx } from './canvas.js';
import { S } from '../state.js';
import { INK, LW, HOUSE, SWING, WOOD, STONE } from '../config.js';
import { TAU, clamp, hs } from '../util.js';
import { jit, wob, smooth, polyPath, blobPts, paint, blob, box, line, tube, dot } from './primitives.js';

const shadow = (x, y, rx, ry) => { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
const WINDOW = [[22, -26], [22, -44], [38, -44], [38, -26]];

export function drawHouse(h, lit) {
  const sd = h.seed, p = h.progress, W = HOUSE.w, H = HOUSE.h;
  ctx.save(); ctx.translate(h.x, h.y);
  const wallH = H * clamp(p / 0.7, 0.12, 1);
  box([[-W / 2, 0], [W / 2, 0], [W / 2, -wallH], [-W / 2, -wallH]], p < 1 ? '#fff' : h.color, sd, 0.8);
  if (p < 1) {   // scaffolding
    for (const x of [-W / 2 - 9, W / 2 + 9]) line([[x, 2], [x + jit(sd, 9, 1), -H - 14]], sd + (x | 0), 3, WOOD, 0.6);
    line([[-W / 2 - 12, -wallH - 4], [W / 2 + 12, -wallH - 4]], sd + 3, 3, WOOD, 0.6);
  }
  if (p > 0.7) box([[-W / 2 - 11, -H], [0, -H - 42], [W / 2 + 11, -H]], p < 1 ? '#fff' : h.roof, sd + 1, 0.9);
  if (p >= 1) {
    box([[-11, 0], [-11, -30], [11, -30], [11, 0]], WOOD, sd + 2, 0.6);
    dot(6, -14, 1.8);
    box(WINDOW, lit ? '#ffe98a' : '#fff', sd + 4, 0.5, 2.2);
  }
  ctx.restore();
}
export function drawLitWindow(h, alpha) {
  ctx.save(); ctx.translate(h.x, h.y); ctx.globalAlpha = alpha;
  box(WINDOW, '#ffe98a', h.seed + 4, 0.5, 2.2);
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
  ctx.save(); ctx.translate(t.x, t.y); ctx.scale(t.size, t.size);
  shadow(0, 1, 30, 5);
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
  t.apples.forEach((g, i) => drawAppleOnTree(APPLE_SPOTS[i][0], APPLE_SPOTS[i][1], g, sd + 30 + i * 3));
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

// ---- art: paintings on easels and sculptures on plinths ----
const CANVAS = [[-17, -60], [17, -60], [17, -28], [-17, -28]];
const PAINTINGS = {
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
export function drawArt(a) {
  ctx.save(); ctx.translate(a.x, a.y);
  if (a.dying !== undefined) ctx.globalAlpha = clamp(a.dying, 0, 1);
  shadow(0, 1, 18, 4);
  if (a.type === 'painting') {
    for (const [x, y] of [[-15, 0], [15, 0], [3, -7]]) line([[0, -56], [x, y]], a.seed + x, 3, INK, 0.4);
    box(CANVAS, '#fff', a.seed + 1, 0.4, 2.4);
    const els = PAINTINGS[a.style](a), n = Math.ceil(a.progress * els.length - 0.001);
    ctx.save(); polyPath(wob(CANVAS, a.seed + 1, 0.4)); ctx.clip();
    for (let i = 0; i < n; i++) els[i]();
    ctx.restore();
    polyPath(wob(CANVAS, a.seed + 1, 0.4)); paint(null, 2.4);
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

export function drawFlower(f) {
  const g = clamp(f.age / 14, 0.15, 1);
  ctx.globalAlpha = f.dying !== undefined ? clamp(f.dying, 0, 1) : 1;
  line([[f.x, f.y], [f.x + 1, f.y - 8 * g], [f.x, f.y - 16 * g]], f.seed, 2.4, '#5fb86a', 0.4);
  if (g > 0.4) {
    const r = 5.5 * g, cy = f.y - 16 * g - 2;
    blob(f.x, cy, r, r, f.color, f.seed + 1, 7, 0.14, 0.4, 2);
    dot(f.x, cy, 1.6 * g, '#ffb300');
  }
  ctx.globalAlpha = 1;
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
