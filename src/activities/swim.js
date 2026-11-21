// Jump in the pool and paddle about. Only head and arms show above the water.
import { S, isEvening, built } from '../state.js';
import { TAU, rand, pick } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { line } from '../draw/primitives.js';
import { goTo, setAct, say, tick } from '../sim/core.js';

const DEPTH = 31;   // how much of the critter is under water, in critter units
const edge = (a, k) => ({ x: S.pool.x + Math.cos(a) * (S.pool.rx * k), y: S.pool.y + Math.sin(a) * (S.pool.ry * k) });
function paddleTo(c) { const p = edge(rand(TAU), rand(0.1, 0.72)); c.tx = p.x; c.ty = p.y; }

export default {
  id: 'swim',
  weight: () => built(S.pool) && !isEvening() && S.critters.filter(o => o.act === 'swim').length < 4 ? 1.3 : 0,
  start(c) {
    const { pool } = S, a = rand(TAU);
    goTo(c, pool.x + Math.cos(a) * (pool.rx + 24), pool.y + Math.sin(a) * (pool.ry + 18), () => {
      Object.assign(c, edge(a, 0.72));
      c.sink = DEPTH * c.size;
      setAct(c, 'swim', rand(14, 30)); paddleTo(c);
      say(c, pick(['!', 'splash', 'brr']), 1);
    });
  },
  states: {
    swim: {
      update(c, dt) {
        const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
        if (d < 4) paddleTo(c);
        else { c.x += dx / d * 20 * dt; c.y += dy / d * 14 * dt; if (Math.abs(dx) > 3) c.dir = dx > 0 ? 1 : -1; }
        tick(c, dt);
      },
      finish(c) {   // climb out at the nearest bit of edge
        const { pool } = S, a = Math.atan2((c.y - pool.y) / pool.ry, (c.x - pool.x) / pool.rx);
        c.x = pool.x + Math.cos(a) * (pool.rx + 24); c.y = pool.y + Math.sin(a) * (pool.ry + 18);
        c.sink = 0; c.hopV = 120;
      },
      transform(c) {
        ctx.translate(c.x, c.y + DEPTH * c.size);
        ctx.scale(c.size, c.size);
        ctx.beginPath(); ctx.rect(-80, -160, 160, 160 - DEPTH); ctx.clip();
        return true;
      },
      pose(c, p) {
        const q = Math.sin(p.now * 6 + c.seed) * 4;
        p.bob = Math.sin(p.now * 3 + c.seed) * 1.5;
        p.hl = [-31, -37 + q]; p.hr = [31, -37 - q];
      },
      after(c) {   // the waterline
        const w = 19 * c.size;
        line([[c.x - w, c.y + 1], [c.x - w / 2, c.y - 2], [c.x, c.y + 1], [c.x + w / 2, c.y - 2], [c.x + w, c.y + 1]], c.seed + 30, 2.6, '#fff', 0.8);
      },
    },
  },
};
