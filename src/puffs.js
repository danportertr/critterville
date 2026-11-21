// Little bits that fly off things: dust from a hammer blow, sawdust, clods of
// earth, stone chips, confetti. They live for a second or so and aren't saved.
import { S } from './state.js';
import { ctx } from './draw/canvas.js';
import { TAU, rand, pick } from './util.js';

const KINDS = {
  dust: { n: 3, colors: ['#d9d2c0', '#c9c2b0'], r: [2, 3.6], up: [10, 40], out: 26, g: -8, life: 0.7 },        // drifts up and fades
  sawdust: { n: 4, colors: ['#f2d58a', '#e6c06a'], r: [1, 1.8], up: [10, 50], out: 30, g: 240, life: 0.6 },
  dirt: { n: 3, colors: ['#b08a5a', '#9a744a'], r: [2, 3.4], up: [90, 150], out: 70, g: 420, life: 0.8 },      // thrown over the shoulder
  chips: { n: 3, colors: ['#c6c8d2', '#aeb1bd'], r: [1.4, 2.4], up: [50, 110], out: 60, g: 380, life: 0.6 },
  paint: { n: 2, colors: null, r: [1.2, 2], up: [0, 20], out: 14, g: 200, life: 0.5 },
  confetti: { n: 16, colors: ['#ff8fc7', '#ffe66d', '#8fd3ff', '#b7a6ff', '#8fe3b0', '#ff8f8f'], r: [1.6, 2.6], up: [120, 240], out: 110, g: 300, life: 1.6 },
};
/** Throw up a puff of `kind` at (x, y). `dir` biases which way it flies; `color` overrides the usual colours. */
export function puff(kind, x, y, dir = 0, color) {
  const k = KINDS[kind];
  if (S.puffs.length > 160) return;
  for (let i = 0; i < k.n; i++) S.puffs.push({
    x, y, vx: rand(-1, 1) * k.out + dir * k.out * 0.6, vy: -rand(k.up[0], k.up[1]), g: k.g,
    r: rand(k.r[0], k.r[1]), color: color || pick(k.colors), life: k.life * rand(0.7, 1.2), age: 0,
  });
}
export function updatePuffs(dt) {
  for (let i = S.puffs.length - 1; i >= 0; i--) {
    const p = S.puffs[i];
    p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
    if (p.age >= p.life) S.puffs.splice(i, 1);
  }
}
export function drawPuffs() {
  for (const p of S.puffs) {
    ctx.globalAlpha = Math.min(1, (1 - p.age / p.life) * 2);
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
