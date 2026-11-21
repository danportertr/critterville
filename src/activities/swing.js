// Hop on a free seat of the swing set and swing for a while.
// The seat's motion is driven in sim/world.js so it keeps swaying after they hop off.
import { S } from '../state.js';
import { SWING } from '../config.js';
import { rand } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { goTo, setAct, say, release } from '../sim/core.js';

export default {
  id: 'swing',
  weight: () => S.swing.seats.some(s => !s.user) ? 1.3 : 0,
  start(c) {
    const sw = S.swing, seat = sw.seats.filter(s => !s.user)[rand() < 0.5 ? 0 : sw.seats.filter(s => !s.user).length - 1];
    seat.user = c; c.seat = seat;
    c.cleanup = () => { seat.user = null; };
    goTo(c, sw.x + seat.dx, sw.y + 5, () => {
      c.x = sw.x + seat.dx; c.y = sw.y + 1; c.sink = -36;   // sink: where bubbles sit while off the ground
      setAct(c, 'swing', rand(12, 24));
      if (rand() < 0.4) say(c, 'whee');
    });
  },
  states: {
    swing: {
      finish(c) { c.sink = 0; c.y = S.swing.y + 6; c.hopV = 130; release(c); },
      transform(c) {   // hang from the bar and rotate with the seat
        ctx.translate(S.swing.x + c.seat.dx, S.swing.y - SWING.barH);
        ctx.rotate(c.seat.angle);
        ctx.translate(0, SWING.rope + 11 * c.size);
        ctx.scale(c.size, c.size);
        return true;
      },
      pose(c, p) {
        const k = 12 / c.size, a = c.seat.angle;
        p.bob = 0; p.hl = [-k - 1, -46]; p.hr = [k + 1, -46];
        p.lf = Math.max(0, a) * 8; p.rf = Math.max(0, -a) * 8;   // little leg kicks
      },
    },
  },
};
