// Go home to bed at night; wake up some time after dawn.
// Anyone without a house yet dozes off standing by the fire.
import { S, isNight } from '../state.js';
import { TAU, rand, pick } from '../util.js';
import { goTo, setAct, say } from '../sim/core.js';

export default {
  id: 'sleep',
  start(c) {
    const h = c.home, f = S.fire;
    if (h) return goTo(c, h.x, h.y + 7, () => { setAct(c, 'sleep', rand(0, 16)); c.hidden = true; });
    const a = rand(TAU);
    goTo(c, f.x + Math.cos(a) * 52, f.y + Math.sin(a) * 26, () => { setAct(c, 'sleep', rand(0, 10)); c.dir = f.x > c.x ? 1 : -1; });
  },
  states: {
    sleep: {
      update(c, dt) {
        if (isNight() || (c.t -= dt) > 0) return;
        c.hidden = false;
        setAct(c, 'idle', rand(0.5, 2));
        if (rand() < 0.35) say(c, pick(['☼', 'yawn', 'hi!']));
      },
      pose(c, p) { p.eyesClosed = true; p.bob = Math.sin(p.now * 1.2 + c.seed) * 0.8 - 1; p.hl = [-24, -9]; p.hr = [24, -9]; },
    },
  },
};
