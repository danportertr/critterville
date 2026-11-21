// A shower. While it rains, flowers come up and apples swell faster; when it
// stops there's a rainbow for a while.
import { S, phase } from '../state.js';
import { PETALS } from '../config.js';
import { rand, irand, pick, clamp, hs } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { freePoint } from '../world/geometry.js';
import { note } from '../journal.js';
import { say, isFree } from '../sim/core.js';
import { washAway } from '../activities/sculpture.js';
import { news, outdoors } from '../talk.js';

const RAIN = 55, RAINBOW = 70, BANDS = ['#ff6e6e', '#ffab5c', '#ffe66d', '#8fe3a0', '#8fc7ff', '#b7a6ff'];
const falling = e => clamp(e.t / 4, 0, 1) * clamp((RAIN - e.t) / 5, 0, 1);

export default {
  id: 'rain',
  can: () => phase() > 0.08 && phase() < 0.45,
  start() {
    for (const c of S.critters) if (isFree(c) && rand() < 0.6) say(c, pick(['rain!', 'oh!', 'drip']), 1.6);
    note('It started to rain.');
    washAway();
    return { dur: RAIN + RAINBOW, sproutT: 3, sprouted: 0 };
  },
  update(e, dt) {
    if (e.t > RAIN) {
      if (!e.cleared) { e.cleared = true; news('a rainbow!', outdoors()); note(`The rain stopped${e.sprouted ? ', and there are new flowers everywhere' : ''}. A rainbow came out.`); }
      return;
    }
    for (const t of S.trees) for (let i = 0; i < t.apples.length; i++) if (t.apples[i] < 1) t.apples[i] = Math.min(1, t.apples[i] + dt / 50);
    if ((e.sproutT -= dt) <= 0 && e.sprouted < 9) {
      e.sproutT = rand(3, 7); e.sprouted++;
      const p = freePoint(20);
      S.flowers.push({ x: p.x, y: p.y, seed: irand(1e6), color: pick(PETALS), age: 0 });
    }
  },
  overlay(e) {
    const { W, H } = S, k = falling(e);
    if (k > 0) {
      ctx.fillStyle = `rgba(105,125,170,${0.16 * k})`; ctx.fillRect(0, 0, W, H);
      // Each drop is aimed at its own spot on the ground, somewhere in the meadow.
      // It falls from above the screen to that spot, lands with a little ring,
      // and then a new drop starts for somewhere else.
      const FALL = 0.8;                                  // share of a drop's cycle spent falling; the rest is the splash
      const drops = [], rings = [];
      for (let i = 0; i < 90; i++) {
        const len = 2.2 + hs(13, i) * 1.1, t = S.now / len + hs(12, i), n = Math.floor(t), u = t - n;
        const lx = hs(16, i * 31 + n * 7) * W, ly = 70 + hs(17, i * 31 + n * 7) * (H - 80);   // where this one lands
        if (u < FALL) drops.push([lx + (FALL - u) * 14, ly - (FALL - u) / FALL * (H + 40), 3 + hs(14, i) * 1.4]);
        else rings.push([lx, ly, (u - FALL) / (1 - FALL)]);
      }
      ctx.fillStyle = `rgba(95,150,220,${0.75 * k})`; ctx.beginPath();
      for (const [x, y, r] of drops) {                   // teardrops: pointed on top, round underneath
        ctx.moveTo(x, y - r * 2.6);
        ctx.quadraticCurveTo(x + r * 1.5, y + r * 0.3, x, y + r);
        ctx.quadraticCurveTo(x - r * 1.5, y + r * 0.3, x, y - r * 2.6);
      }
      ctx.fill();
      ctx.lineWidth = 1.6;
      for (const [x, y, q] of rings) {                   // the splash: a ring that spreads and fades, and two flecks hopping up
        ctx.strokeStyle = ctx.fillStyle = `rgba(95,150,220,${0.7 * k * (1 - q)})`;
        ctx.beginPath(); ctx.ellipse(x, y, 2 + q * 10, 1 + q * 4, 0, 0, 7); ctx.stroke();
        for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(x + d * (3 + q * 6), y - Math.sin(q * Math.PI) * 7, 1.3, 0, 7); ctx.fill(); }
      }
    }
    if (e.t > RAIN - 4) {   // the rainbow fades in as the rain thins, and out at the end
      const a = clamp((e.t - RAIN + 4) / 8, 0, 1) * clamp((e.dur - e.t) / 10, 0, 1) * 0.42;
      const r = Math.min(W * 0.62, H * 0.7), cx = W / 2, cy = Math.min(H * 0.8, r + 60);
      ctx.lineWidth = 9; ctx.globalAlpha = a;
      BANDS.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r - i * 9, Math.PI, Math.PI * 2); ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
  },
};
