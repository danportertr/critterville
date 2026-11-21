// A shooting star comes down at night and stays where it lands: a small pale
// stone that glows after dark. Critters come and look at it.
import { S, isNight } from '../state.js';
import { rand, irand, pick, clamp, lerp } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { findSpot, rebuildObs } from '../world/geometry.js';
import { note } from '../journal.js';
import { goTo, setAct, say } from '../sim/core.js';

const FALL = 1.7;

export default {
  id: 'star',
  can: () => isNight() && S.stones.length < 3,
  start() {
    const to = findSpot(16, 12, 4);
    return { dur: FALL + 2.2, from: { x: to.x + rand(-1, 1) * S.W * 0.5, y: -30 }, to };
  },
  update(e) {
    if (e.t < FALL || e.landed) return;
    e.landed = true;
    S.stones.push({ x: e.to.x, y: e.to.y, seed: irand(1e6) });
    rebuildObs();
    for (const c of S.critters) if (!c.hidden && c.act !== 'sleep') { say(c, '!'); c.surprise = 1.2; }
    note('A shooting star came down in the meadow. It is still glowing.');
  },
  overlay(e) {
    const k = clamp(e.t / FALL, 0, 1), q = k * k;   // speeds up as it falls
    const x = lerp(e.from.x, e.to.x, q), y = lerp(e.from.y, e.to.y, q);
    if (k < 1) {
      const tx = lerp(e.from.x, e.to.x, Math.max(0, q - 0.16)), ty = lerp(e.from.y, e.to.y, Math.max(0, q - 0.16));
      const g = ctx.createLinearGradient(tx, ty, x, y);
      g.addColorStop(0, 'rgba(255,250,200,0)'); g.addColorStop(1, 'rgba(255,250,200,1)');
      ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    } else {   // the flash where it lands
      const f = clamp((e.t - FALL) / 0.9, 0, 1);
      ctx.globalAlpha = (1 - f) * 0.8; ctx.fillStyle = '#fffbe0';
      ctx.beginPath(); ctx.arc(e.to.x, e.to.y - 6, 10 + f * 70, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
  },
};

/** Going to have a look at a fallen star. */
export const stargaze = {
  id: 'stargaze',
  weight: () => S.stones.length ? 0.6 : 0,
  start(c) {
    const s = pick(S.stones), side = c.x < s.x ? -1 : 1;
    goTo(c, s.x + side * 26, s.y + 4, () => { c.dir = -side; setAct(c, 'admire', rand(3, 6)); say(c, pick(['★', 'ooh', 'warm', '?', 'wow'])); });
  },
};
