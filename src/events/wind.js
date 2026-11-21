// A windy spell. Trees lean, the ball rolls off, and afterwards a seedling
// turns up somewhere and slowly grows into a new apple tree.
import { S, phase } from '../state.js';
import { GREENS } from '../config.js';
import { rand, irand, pick, clamp, hs } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { findSpot, rebuildObs } from '../world/geometry.js';
import { note } from '../journal.js';
import { topple } from '../activities/sculpture.js';
import { freePoint } from '../world/geometry.js';
import { news, nearby, outdoors, anyone } from '../talk.js';
import { say } from '../sim/core.js';

export default {
  id: 'wind',
  can: () => phase() > 0.05 && phase() < 0.55,
  start() {
    note('The wind is getting up.');
    const owner = !S.lostHat && pick(outdoors().filter(c => c.hat));
    if (owner) {   // there goes somebody's hat (activities/errands.js gets it back)
      const p = freePoint(20);
      S.lostHat = { hat: owner.hat, owner: owner.name, x: p.x, y: p.y, from: { x: owner.x, y: owner.y - 70 * owner.size }, fly: 2.6, taken: null, held: false };
      owner.hat = null; say(owner, 'my hat!', 2); owner.surprise = 1.5;
      note(`The wind took ${owner.name}'s hat.`);
      news(`${owner.name} lost a hat`, nearby(owner));
    }
    return { dur: 45, dir: rand() < 0.5 ? -1 : 1 };
  },
  update(e, dt) {
    S.wind = e.dir * clamp(e.t / 5, 0, 1) * clamp((e.dur - e.t) / 6, 0, 1);
    const b = S.ball;
    if (b) { b.vx += S.wind * 70 * dt; if (b.z === 0 && Math.abs(b.vx) > 30 && rand() < dt) b.vz = 60; }
    for (const f of S.flies) f.x += S.wind * 50 * dt;
  },
  end() {
    S.wind = 0;
    topple();
    if (S.trees.length >= 8) return void note('The wind dropped.');
    const size = rand(1.1, 1.4), p = findSpot(44 * size * 0.6, 54 * size * 0.6, 52 * size * 0.6);
    S.trees.push({ x: p.x, y: p.y, seed: irand(1e6), size, color: pick(GREENS), apples: [-1, -1.4, -1.8], grow: 0.12 });
    rebuildObs();
    note('The wind dropped. It must have carried a seed: there is a seedling that was not there before.');
    news('a seedling!', anyone(1));
  },
  overlay(e) {
    const { W, H } = S, k = Math.abs(S.wind), d = e.dir;
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {   // gusts
      const u = (hs(21, i) + S.now * (0.35 + hs(22, i) * 0.3)) % 1, x = (d > 0 ? u : 1 - u) * (W + 240) - 120, y = hs(23, i) * H, l = 30 + hs(24, i) * 40;
      ctx.strokeStyle = `rgba(120,130,150,${0.38 * k * Math.sin(u * Math.PI)})`;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + d * l / 2, y - 6, x + d * l, y + Math.sin(S.now * 3 + i) * 3); ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {   // petals and leaves going by
      const u = (hs(31, i) + S.now * (0.22 + hs(32, i) * 0.2)) % 1, x = (d > 0 ? u : 1 - u) * (W + 80) - 40, y = hs(33, i) * H + Math.sin(S.now * 4 + i * 2) * 14;
      ctx.fillStyle = i % 2 ? '#ff8fc7' : '#adeb3c'; ctx.globalAlpha = k;
      ctx.beginPath(); ctx.ellipse(x, y, 3.4, 2, S.now * 5 + i, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};
