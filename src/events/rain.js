// A shower. While it rains, flowers come up and apples swell faster; when it
// stops there's a rainbow for a while.
import { S, phase } from '../state.js';
import { PETALS } from '../config.js';
import { rand, irand, pick, clamp, hs } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { freePoint } from '../world/geometry.js';
import { note } from '../journal.js';
import { say, isFree } from '../sim/core.js';

const RAIN = 55, RAINBOW = 70, BANDS = ['#ff6e6e', '#ffab5c', '#ffe66d', '#8fe3a0', '#8fc7ff', '#b7a6ff'];
const falling = e => clamp(e.t / 4, 0, 1) * clamp((RAIN - e.t) / 5, 0, 1);

export default {
  id: 'rain',
  can: () => phase() > 0.08 && phase() < 0.45,
  start() {
    for (const c of S.critters) if (isFree(c) && rand() < 0.6) say(c, pick(['rain!', 'oh!', 'drip']), 1.6);
    note('It started to rain.');
    return { dur: RAIN + RAINBOW, sproutT: 3, sprouted: 0 };
  },
  update(e, dt) {
    if (e.t > RAIN) {
      if (!e.cleared) { e.cleared = true; note(`The rain stopped${e.sprouted ? ', and there are new flowers everywhere' : ''}. A rainbow came out.`); }
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
      ctx.strokeStyle = `rgba(80,110,170,${0.6 * k})`; ctx.lineWidth = 1.7; ctx.beginPath();
      for (let i = 0; i < 80; i++) {
        const x = ((hs(11, i) * 1.2 + S.now * 0.03) % 1.2) * W - 20, y = ((hs(12, i) + S.now * (1.3 + hs(13, i) * 0.7)) % 1) * (H + 40) - 20;
        ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13);
      }
      ctx.stroke();
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
