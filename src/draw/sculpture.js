// Sculptures, cairns, topiary and the town monument. Unlike paintings these
// are things in the world: they're made of something, some of them do
// something, and they change with time and weather.
import { ctx } from './canvas.js';
import { S, phase, nightAmt } from '../state.js';
import { INK, STONE } from '../config.js';
import { TAU, clamp, hs, shade } from '../util.js';
import { blob, box, line, tube, dot } from './primitives.js';
import { drawHat, drawBalloon } from './cart.js';
import { drawFish } from './fish.js';
import { SPECIES_BY_ID } from '../data/fish.js';

export const MATERIALS = {
  stone: { color: STONE, word: 'stone' },
  wood: { color: '#d2a273', word: 'wooden' },
  sand: { color: '#f2dfa8', word: 'sand' },
  star: { color: '#fff3a8', word: 'star-stone' },   // carved from a fallen star; glows at night
};
export const STATUES = ['critter', 'totem', 'arch'];          // carved from a block, stood on a plinth
export const SKY_FORMS = ['moon', 'star', 'planet'];          // made after a night at the telescope
export const DREAM_FORMS = { apple: 'apple', tree: 'treelegs', moon: 'moon' };   // dream id -> what gets carved
export const CARVED = [...STATUES, ...SKY_FORMS, 'apple', 'treelegs'];
const ON_PLINTH = new Set([...CARVED, 'assemblage']);
const HAT_AT = { critter: -54, totem: -58, arch: -56 };      // where a hat sits, if someone hangs one on it
export const formOf = a => a.form || a.style || 'totem';      // (old saves called it `style`)
const shadow = (rx, ry) => { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(0, 1, rx, ry, 0, 0, TAU); ctx.fill(); };
const column = (c, sd, top = -22) => box([[-6, 0], [6, 0], [4.5, top], [-4.5, top]], c, sd, 0.4, 2.2);

const FORMS = {
  critter(a, c) {
    box([[-7, -10], [7, -10], [7, -30], [-7, -30]], c, a.seed + 3, 0.4, 2.2);
    for (const k of [-1, 1]) tube([[k * 7, -26], [k * 17, -18]], 2.6, c, a.seed + 4 + k, 0.3);
    blob(0, -42, 13, 12.5, c, a.seed + 6, 9, 0.06, 0.3, 2.2);
    dot(2, -46, 1.1); dot(5, -45, 1.1); line([[-3, -42], [-3, -36], [1, -33], [6, -37], [6.5, -41]], a.seed + 7, 1.6, INK, 0.2);
    if (a.moustache) { ctx.strokeStyle = INK; ctx.lineWidth = 2; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(2, -41); ctx.quadraticCurveTo(2 + s * 5, -38, 2 + s * 9, -43.5); ctx.stroke(); } }
  },
  totem(a, c) {
    blob(0, -21, 12, 11, c, a.seed + 3, 9, 0.1, 0.3, 2.2);
    blob(0, -38, 9.5, 9, shade(c, 0.92), a.seed + 4, 8, 0.1, 0.3, 2.2);
    blob(0, -52, 7, 6.5, shade(c, 0.84), a.seed + 5, 7, 0.1, 0.3, 2.2);
    dot(-3, -22, 1.2); dot(3, -22, 1.2); dot(-2.4, -39, 1); dot(2.4, -39, 1);
  },
  arch(a, c) { tube([[-11, -11], [-13, -40], [0, -55], [13, -40], [11, -11]], 7, c, a.seed + 3, 0.5); },
  // ---- after the night sky, or a dream ----
  moon(a, c) {
    ctx.beginPath(); ctx.arc(0, -36, 20, -Math.PI * 0.42, Math.PI * 1.0); ctx.arc(8, -42, 16, Math.PI * 0.86, -Math.PI * 0.28, true); ctx.closePath();
    ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  },
  star(a, c) { const p = []; for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 9.5 : 22; p.push([Math.cos(t) * r, -35 + Math.sin(t) * r]); } box(p, c, a.seed + 3, 0.5, 2.4); },
  planet(a, c) {
    blob(0, -34, 15, 14.5, c, a.seed + 3, 10, 0.03, 0.3, 2.4);
    ctx.beginPath(); ctx.ellipse(0, -34, 26, 6.5, -0.28, -0.25, Math.PI + 0.25);
    ctx.lineWidth = 6.5; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = shade(c, 0.85); ctx.stroke();
  },
  apple(a, c) {
    blob(0, -29, 19, 18, c, a.seed + 3, 10, 0.05, 0.4, 2.4);
    line([[0, -46], [2, -54]], a.seed + 4, 2.6, INK, 0.2); blob(8, -53, 6, 3, c, a.seed + 5, 6, 0.1, 0.2, 2);
  },
  treelegs(a, c) {   // mid-stride
    for (const [x1, x2] of [[-3, -10], [3, 9]]) tube([[x1, -26], [x2, -13], [x2 + 5, -12]], 3.2, c, a.seed + 4 + x1, 0.3);
    box([[-4.5, -24], [4.5, -24], [4, -40], [-4, -40]], c, a.seed + 3, 0.3, 2.2);
    blob(0, -50, 15, 12.5, c, a.seed + 6, 9, 0.08, 0.4, 2.4);
  },
  castle(a, c) {
    for (const x of [-15, 9]) { box([[x, 0], [x + 7, 0], [x + 7, -22], [x, -22]], c, a.seed + x, 0.4, 2.2); box([[x - 1, -22], [x + 3.5, -29], [x + 8, -22]], c, a.seed + x + 1, 0.3, 2.2); }
    box([[-9, 0], [10, 0], [10, -14], [5, -14], [5, -17], [1, -17], [1, -14], [-4, -14], [-4, -17], [-9, -17]], c, a.seed + 2, 0.4, 2.2);
    box([[-2, 0], [-2, -7], [3, -7], [3, 0]], shade(c, 0.8), a.seed + 3, 0.2, 1.6);
    line([[12.5, -29], [12.5, -37]], a.seed + 4, 1.4, INK, 0.1); box([[12.5, -37], [18, -35], [12.5, -33]], a.c1, a.seed + 5, 0.2, 1.4);
  },
  sandcritter(a, c) {   // lying on its back, mostly a mound
    blob(-2, -5, 17, 6, c, a.seed + 2, 9, 0.08, 0.3, 2.2);
    blob(13, -9, 8, 7.5, c, a.seed + 3, 8, 0.06, 0.3, 2.2);
    dot(12, -11, 0.9); dot(15, -10.4, 0.9); line([[10, -8], [12, -5.5], [15.5, -7]], a.seed + 4, 1.4, INK, 0.2);
  },
  // ---- pieces that do something ----
  sundial(a, c) {   // the shadow goes round with the time of day
    column(c, a.seed + 2);
    blob(0, -24, 15, 5.5, shade(c, 1.06), a.seed + 3, 10, 0.03, 0.3, 2.2);
    const day = 1 - nightAmt(), t = Math.PI * (1 + clamp(phase() / 0.66, 0, 1));
    if (day > 0.05) { ctx.globalAlpha *= day; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(Math.cos(t) * 13, -24 + Math.sin(t) * 4.4); ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(60,60,90,.55)'; ctx.stroke(); ctx.globalAlpha /= day; }
    box([[0, -24], [0, -37], [7, -24]], shade(c, 0.75), a.seed + 4, 0.3, 2);
  },
  vane(a, c) {      // turns with the wind (a.spin, driven in activities/sculpture.js)
    tube([[0, 0], [0, -50]], 2.4, c, a.seed + 2, 0.3);
    box([[-5, 0], [5, 0], [3, -5], [-3, -5]], c, a.seed + 3, 0.3, 2);
    const k = Math.cos(a.spin || 0), w = 15 * k;
    line([[-w, -52], [w, -52]], a.seed + 4, 2.6, INK, 0.2);
    box([[w, -52], [w - 6 * k, -56], [w - 6 * k, -48]], a.c1, a.seed + 5, 0.2, 1.8);                 // arrowhead
    box([[-w, -52], [-w - 4 * k, -57], [-w + 5 * k, -52], [-w - 4 * k, -47]], a.c1, a.seed + 6, 0.2, 1.8);   // tail
    blob(0, -60, 2 + Math.abs(Math.sin(a.spin || 0)) * 5, 4.5, a.c2, a.seed + 7, 7, 0.05, 0.2, 1.8);  // the bird on top
  },
  birdbath(a, c) {  // fills in the rain; a small bird drops by when there's water
    column(c, a.seed + 2);
    blob(0, -26, 16, 6, c, a.seed + 3, 10, 0.03, 0.3, 2.2);
    const w = clamp(a.water || 0, 0, 1);
    if (w > 0.05) { ctx.fillStyle = '#a8dcf5'; ctx.beginPath(); ctx.ellipse(0, -27, 12 * (0.5 + w * 0.5), 3.6 * (0.5 + w * 0.5), 0, 0, TAU); ctx.fill(); }
    if (w > 0.15 && Math.sin(S.now * 0.13 + a.seed) > 0.35) {
      const hop = Math.abs(Math.sin(S.now * 5)) * 1.5, x = 9, y = -32 - hop;
      blob(x, y, 4.6, 3.8, '#8fb8ff', a.seed + 5, 7, 0.05, 0.2, 1.8); blob(x - 3.4, y - 3.4, 2.8, 2.6, '#8fb8ff', a.seed + 6, 6, 0.05, 0.2, 1.8);
      box([[x - 6, y - 4], [x - 9.5, y - 3], [x - 6, y - 2.4]], '#ffa23d', a.seed + 7, 0.1, 1.2); dot(x - 4, y - 4, 0.7);
    }
  },
  bench(a, c) { for (const x of [-30, 24]) box([[x, 0], [x + 6, 0], [x + 6, -9], [x, -9]], shade(c, 0.85), a.seed + x, 0.3, 2.2); benchPlank(a, c); },
  // ---- made from whatever has turned up in town ----
  assemblage(a) {
    let y = -10;
    for (const [i, item] of (a.items || ['apple']).entries()) {
      const sd = a.seed + 10 + i * 3;
      if (item === 'boot') { drawFish(SPECIES_BY_ID.boot, 0, y - 6, 1.05, sd); y -= 15; }
      else if (item === 'apple') { blob(i % 2 ? 2 : -2, y - 6, 6.5, 6, '#fb6540', sd, 7, 0.06, 0.3, 2.2); line([[0, y - 12], [1.5, y - 15]], sd + 1, 1.6, INK, 0.2); y -= 12; }
      else if (item === 'star') { const p = []; for (let j = 0; j < 10; j++) { const t = -Math.PI / 2 + j / 10 * TAU, r = j % 2 ? 4 : 8.5; p.push([Math.cos(t) * r, y - 8 + Math.sin(t) * r]); } box(p, '#fff3a8', sd, 0.3, 2); y -= 15; }
      else if (item === 'hat') { ctx.save(); ctx.translate(0, y - 1); ctx.scale(0.8, 0.8); drawHat({ kind: 'top', color: a.c1 }, 1, sd); ctx.restore(); y -= 14; }
      else if (item === 'balloon') drawBalloon({ color: a.c2, seed: a.seed % 100 }, 6, y, 0.7);
    }
  },
};
function benchPlank(a, c) { tube([[-36, -10], [36, -10]], 5.5, c, a.seed + 9, 0.3); }
/** The seat of a bench, drawn again over whoever is sitting on it. */
export function drawBenchFront(a) {
  ctx.save(); ctx.translate(a.x, a.y);
  benchPlank(a, MATERIALS[a.material || 'wood'].color);
  ctx.restore();
}

/**
 * Something half-made needs a proper top edge, or it just looks cut off. This
 * draws the shape again in solid ink, but only a thin strip of it at height y:
 * the result is an outline across the top of exactly as much as has been built.
 */
function workingEdge(x, y, w, drawInInk) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y - 1.3, w, 2.6); ctx.clip();
  drawInInk();
  ctx.restore();
}

export function drawSculpture(a) {
  const form = formOf(a), mat = a.material || 'stone', col = MATERIALS[mat].color, plinth = ON_PLINTH.has(form) && mat !== 'sand';
  ctx.save(); ctx.translate(a.x, a.y);
  if (a.dying !== undefined) ctx.globalAlpha = clamp(a.dying, 0, 1);
  shadow(18, 4);
  if (plinth) box([[-15, 0], [15, 0], [13, -10], [-13, -10]], '#f1efe6', a.seed + 1, 0.4);
  if (a.progress >= 1) FORMS[form](a, col);
  else if (CARVED.includes(form)) {    // carved out of a block, from the top down
    const cut = -60 + 50 * a.progress;
    const block = c => box([[-15, -10], [15, -10], [14, -58], [-14, -58]], c, a.seed + 2, 0.9);
    ctx.save(); ctx.beginPath(); ctx.rect(-40, cut, 80, -8 - cut); ctx.clip();
    block(col);
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-40, -80, 80, cut + 80); ctx.clip();
    FORMS[form](a, col);
    ctx.restore();
    workingEdge(-40, cut, 80, () => block(INK));          // the ledge where the uncut block begins
  } else {                             // built up from the ground
    const top = -75 * a.progress - 3;
    ctx.save(); ctx.beginPath(); ctx.rect(-50, top, 100, 75 * a.progress + 8); ctx.clip();
    FORMS[form](a, col);
    ctx.restore();
    workingEdge(-50, top, 100, () => FORMS[form](a, INK));   // as far as it's got
  }
  if (a.progress >= 1) {
    if (mat === 'stone' && a.born !== undefined) {   // stone gathers moss over the days
      const moss = clamp((S.clock - a.born) / 900 - 0.5, 0, 1);
      for (let i = 0; i < Math.round(moss * 5); i++) blob(-12 + hs(a.seed, i + 50) * 24, -2 - hs(a.seed, i + 60) * (plinth ? 22 : 10), 3.5, 2.4, '#9bd36a', a.seed + 70 + i, 6, 0.15, 0.2, 1.4);
    }
    if (a.hat && HAT_AT[form]) { ctx.save(); ctx.translate(0, HAT_AT[form]); ctx.scale(0.62, 0.62); drawHat(a.hat, 1, a.seed + 80); ctx.restore(); }
  }
  ctx.restore();
}

/** A pile of flat stones by the water that anyone passing may add to. */
export function drawCairn(c) {
  ctx.save(); ctx.translate(c.x, c.y);
  shadow(13, 3.5);
  for (let i = 0; i < c.n; i++) blob((hs(c.seed, i) - 0.5) * 4, -3 - i * 5.4, 11.5 - i * 0.85, 3.7, i % 2 ? '#d8d8e0' : '#c6c8d2', c.seed + i, 8, 0.1, 0.25, 2);
  ctx.restore();
}

/** The big shared project: a ring of standing stones, or a giant statue. */
export function drawMonument(m) {
  const g = m.progress, sd = m.seed;
  ctx.save(); ctx.translate(m.x, m.y);
  if (m.form === 'circle') {
    const n = 8, up = Math.max(1, Math.floor(g * (n + 1.5)));
    const order = [...Array(n).keys()].sort((p, q) => Math.sin(p / n * TAU + 0.4) - Math.sin(q / n * TAU + 0.4));   // back stones first
    for (const i of order) {
      if (i >= up) continue;
      const t = i / n * TAU + 0.4, x = Math.cos(t) * 56, y = Math.sin(t) * 21, h = 30 + hs(sd, i) * 12, w = 6 + hs(sd, i + 9) * 2.5;
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(x, y + 1, w + 4, 3, 0, 0, TAU); ctx.fill();
      box([[x - w, y], [x + w, y], [x + w - 1.5, y - h], [x - w + 1, y - h - 2]], i % 3 ? STONE : '#c9cbd6', sd + i, 0.7);
      if (m.hats && i % 2 === 0) { ctx.save(); ctx.translate(x, y - h - 1); ctx.scale(0.6, 0.6); drawHat({ kind: 'cone', color: m.hats.color }, 1, sd + 40 + i); ctx.restore(); }   // party hats, courtesy of the prankster
    }
    if (g >= 1) for (const i of [1, 2]) {   // lintels across the front pairs
      const p = j => { const t = j / n * TAU + 0.4; return [Math.cos(t) * 56, Math.sin(t) * 21 - 30 - hs(sd, j) * 12]; };
      const [x0, y0] = p(i), [x1, y1] = p(i + 1);
      tube([[x0, Math.min(y0, y1) - 3], [x1, Math.min(y0, y1) - 3]], 5.5, STONE, sd + 30 + i, 0.4);
    }
  } else {   // a giant critter, going up from the feet
    shadow(44, 8);
    if (g < 1) for (const x of [-46, 46]) line([[x, 2], [x, -150]], sd + x, 3, '#c9966b', 0.6);
    const giant = c => {
    ctx.scale(2.2, 2.2);
    for (const k of [-1, 1]) { tube([[k * 6.5, -13], [k * 7, -3]], 10, c, sd + k, 0.3); tube([[k * 7, -3], [k * 15, -2.5]], 7, c, sd + k + 3, 0.3); }
    // The arms go on whole, once the body has reached the shoulders. (Revealed from
    // the ground up like the rest, the hands would appear first, hanging in mid-air.)
    if (g > 0.52) for (const k of [-1, 1]) tube([[k * 11, -33], [k * 24, -24], [k * 33, -16]], 6, c, sd + k + 6, 0.3);
    box([[-12, -39], [12, -39], [12, -11], [-12, -11]], c, sd + 10, 0.4);
    blob(0, -57, 21, 20, c, sd + 11, 11, 0.06, 0.4);
    dot(4, -64, 1.6); dot(8.5, -62.6, 1.6);
    line([[-3, -58], [-4.5, -50], [-2, -43], [4, -40.5], [9.5, -45], [12, -55]], sd + 12, 2.4, INK, 0.3);
    if (m.hats && c !== INK) { ctx.save(); ctx.translate(0, -76); drawHat({ kind: 'cone', color: m.hats.color }, 1, sd + 40); ctx.restore(); }   // the prankster's been
    };
    const top = -172 * g - 2;
    ctx.save(); ctx.beginPath(); ctx.rect(-120, top, 240, 172 * g + 12); ctx.clip();   // (wide enough for the outstretched hands)
    giant(STONE);
    ctx.restore();
    if (g < 1) workingEdge(-120, top, 240, () => giant(INK));   // a flat top to whatever height it has reached
  }
  ctx.restore();
}

// ---- topiary: a tree's crown clipped into a shape (t.topiary), until it grows out ----
/** Draws the clipped crown in tree-local coordinates. Returns false if this tree isn't clipped. */
export function drawTopiary(t) {
  const tp = t.topiary;
  if (!tp) return false;
  const c = t.color, sd = t.seed + 90;
  if (tp.shape === 'ball') blob(0, -67, 30, 29, c, sd, 12, 0.02, 0.5);   // (low enough to sit on the trunk, which tops out at -42)
  else if (tp.shape === 'cone') box([[-27, -42], [-13, -78], [0, -114], [13, -78], [27, -42], [0, -38]], c, sd, 0.6);
  else if (tp.shape === 'tiers') { blob(0, -52, 28, 13, c, sd, 10, 0.03, 0.4); blob(0, -74, 20, 11.5, c, sd + 1, 9, 0.03, 0.4); blob(0, -94, 12.5, 10, c, sd + 2, 8, 0.03, 0.4); }
  else {   // 'critter': a leafy head, grinning
    blob(0, -65, 29, 27, c, sd, 12, 0.03, 0.5);
    dot(5, -74, 2); dot(11.5, -72, 2);
    line([[-5, -66], [-7, -55], [-3, -46], [5, -43], [12, -49], [15.5, -62]], sd + 3, 2.8, INK, 0.3);
  }
  return true;
}
