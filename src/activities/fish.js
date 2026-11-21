// Stand at the water with a rod and wait. Works at the pond or the stream;
// what bites depends on which (see journal.js and data/fish.js).
import { S, built } from '../state.js';
import { INK, STREAM_HALF } from '../config.js';
import { TAU, rand, pick } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { line, dot } from '../draw/primitives.js';
import { drawFish } from '../draw/fish.js';
import { streamPoint, topEdge } from '../world/geometry.js';
import { waters, catchFish } from '../journal.js';
import { goTo, setAct, say, tick } from '../sim/core.js';
import { stock } from './tank.js';

/** Somewhere to stand, and where the float will land. */
function fishingSpot() {
  const water = pick(waters());
  if (water === 'pond') {
    const { pond } = S, a = rand(TAU), ca = Math.cos(a), sa = Math.sin(a);
    return { water, x: pond.x + ca * (pond.rx + 18), y: pond.y + sa * (pond.ry + 13), bx: pond.x + ca * pond.rx * 0.45, by: pond.y + sa * pond.ry * 0.45 };
  }
  let p, side;
  for (let i = 0; i < 30; i++) {   // a bit of bank that's on screen
    p = streamPoint(rand(0.08, 0.92)); side = rand() < 0.5 ? -1 : 1;
    const y = p.y + p.ny * side * (STREAM_HALF + 14);
    if (p.x > 50 && p.x < S.W - 50 && y > topEdge() && y < S.H - 20) break;
  }
  return { water, x: p.x + p.nx * side * (STREAM_HALF + 14), y: p.y + p.ny * side * (STREAM_HALF + 14), bx: p.x, by: p.y };
}

export default {
  id: 'fish',
  weight: () => S.critters.filter(o => o.act === 'fish').length < 3 ? 1.1 : 0,
  start(c) {
    const s = fishingSpot();
    goTo(c, s.x, s.y, () => {
      c.dir = s.bx > c.x ? 1 : -1;
      setAct(c, 'fish', rand(14, 28)); c.catchT = rand(5, c.t - 2); c.caught = null; c.fishAnim = 0;
      c.water = s.water; c.bobx = s.bx; c.boby = s.by;
    });
  },
  states: {
    fish: {
      update(c, dt) {
        c.fishAnim -= dt;
        if (!c.caught && (c.catchT -= dt) <= 0) {
          c.caught = catchFish(c, c.water);
          c.fishAnim = 1.6; c.t = Math.min(c.t, 2.6);
          say(c, '!'); c.hopV = 90;
        }
        tick(c, dt);
      },
      finish(c) {   // if there's a tank, the catch goes in it
        if (!c.caught || !built(S.tank)) return;
        stock(c, c.caught, c.water);
        return true;
      },
      pose(c, p) { p.hand(p.d, p.d * 27, -30); },
      props(c, p) {
        const d = p.d, tip = [d * 58, -64];
        line([p.HD, tip], c.seed + 6, 2.2, INK, 0.3);
        const bx = (c.bobx - c.x) / c.size, by = (c.boby - c.y) / c.size + Math.sin(p.now * 3) * 1.2;
        ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.quadraticCurveTo((tip[0] + bx) / 2, by - 8, bx, by);
        ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
        dot(bx, by, 3.6); dot(bx, by, 2.2, '#ff6b6b');
        if (c.fishAnim > 0 && c.caught) {   // the catch pops out of the water
          const t = 1 - c.fishAnim / 1.6;
          drawFish(c.caught, bx, by - 12 - Math.sin(t * Math.PI) * 36, 0.85, c.seed + 7, d < 0);
        }
      },
    },
  },
};
