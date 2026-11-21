// Stand at the pond with a rod and wait.
import { S } from '../state.js';
import { INK } from '../config.js';
import { TAU, rand } from '../util.js';
import { log } from '../ui.js';
import { ctx } from '../draw/canvas.js';
import { blob, box, line, dot } from '../draw/primitives.js';
import { goTo, setAct, say, tick } from '../sim/core.js';

export default {
  id: 'fish',
  weight: () => S.critters.filter(o => o.act === 'fish').length < 3 ? 1 : 0,
  start(c) {
    const { pond } = S, a = rand(TAU), ca = Math.cos(a), sa = Math.sin(a);
    goTo(c, pond.x + ca * (pond.rx + 18), pond.y + sa * (pond.ry + 13), () => {
      c.dir = pond.x > c.x ? 1 : -1;
      setAct(c, 'fish', rand(14, 28)); c.catchT = rand(5, c.t - 2); c.caught = false; c.fishAnim = 0;
      c.bobx = pond.x + ca * pond.rx * 0.45; c.boby = pond.y + sa * pond.ry * 0.45;
    });
  },
  states: {
    fish: {
      update(c, dt) {
        c.fishAnim -= dt;
        if (!c.caught && (c.catchT -= dt) <= 0) {
          c.caught = true; c.fishAnim = 1.2; c.t = Math.min(c.t, 2.2);
          say(c, '!'); c.hopV = 90;
          if (rand() < 0.3) log(`${c.name} caught a fish and let it go.`);
        }
        tick(c, dt);
      },
      pose(c, p) { p.hand(p.d, p.d * 27, -30); },
      props(c, p) {
        const d = p.d, tip = [d * 58, -64], sd = c.seed;
        line([p.HD, tip], sd + 6, 2.2, INK, 0.3);
        const bx = (c.bobx - c.x) / c.size, by = (c.boby - c.y) / c.size + Math.sin(p.now * 3) * 1.2;
        ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.quadraticCurveTo((tip[0] + bx) / 2, by - 8, bx, by);
        ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
        dot(bx, by, 3.6); dot(bx, by, 2.2, '#ff6b6b');
        if (c.fishAnim > 0) {   // the catch pops out of the water
          const t = 1 - c.fishAnim / 1.2, fy = by - 10 - Math.sin(t * Math.PI) * 34;
          blob(bx, fy, 8, 4.5, '#8fd3ff', sd + 7, 7, 0.05, 0.4, 2);
          box([[bx - 7, fy], [bx - 13, fy - 4], [bx - 13, fy + 4]], '#8fd3ff', sd + 8, 0.3, 2);
          dot(bx + 4, fy - 1, 0.9);
        }
      },
    },
  },
};
