// Go home to bed at night; wake up some time after dawn.
// Anyone without a house yet dozes off standing by the fire (or, before
// there's even a fire, right where they are).
import { S, isNight, built } from '../state.js';
import { TAU, rand, pick } from '../util.js';
import { goTo, setAct, say } from '../sim/core.js';
import { DREAMS } from '../talk.js';
import { isNightOwl } from './night.js';

const late = c => isNightOwl(c);

export default {
  id: 'sleep',
  start(c) {
    const h = c.home, f = S.fire;
    c.nextWalk = 'trudge';
    const lie = late(c) ? rand(30, 70) : rand(0, 16);   // night owls sleep in
    if (h) return goTo(c, h.x, h.y + 7, () => { setAct(c, 'sleep', lie); c.hidden = true; });
    if (!built(f)) { c.nextWalk = null; return setAct(c, 'sleep', rand(0, 10)); }   // nowhere to go: sleep on the spot
    const a = rand(TAU);
    goTo(c, f.x + Math.cos(a) * 52, f.y + Math.sin(a) * 26, () => { setAct(c, 'sleep', rand(0, 10)); c.dir = f.x > c.x ? 1 : -1; });
  },
  states: {
    sleep: { mood: 'tiny',
      update(c, dt) {
        if (isNight() || (c.t -= dt) > 0) return;
        c.hidden = false;
        setAct(c, 'idle', rand(0.5, 2));
        if (rand() < 0.35) say(c, pick(['☼', 'yawn', 'hi!']));
        if (rand() < 0.4) c.dream = pick(DREAMS);   // something to tell whoever they talk to first
      },
      pose(c, p) { p.eyesClosed = true; p.bob = Math.sin(p.now * 1.2 + c.seed) * 0.8 - 1; p.hl = [-24, -9]; p.hr = [24, -9]; },
    },
  },
};
