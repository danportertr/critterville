// Break into a dance. Anyone standing around nearby might join in.
import { S, isEvening } from '../state.js';
import { rand, dist } from '../util.js';
import { setAct, say, tick, isFree } from '../sim/core.js';

export default {
  id: 'dance',
  weight: () => (isEvening() ? 1.5 : 0.7) * (S.music ? 3 : 1),   // they like the radio
  start(c) {
    const t = rand(6, 11);
    setAct(c, 'dance', t); c.noteT = 0;
    for (const o of S.critters) if (o !== c && isFree(o) && dist(o, c) < 190 && rand() < 0.65) { setAct(o, 'dance', t + rand(-1, 1)); o.noteT = rand(1); }
  },
  states: {
    dance: {
      update(c, dt) {
        if ((c.noteT -= dt) <= 0) { say(c, '♪', 0.9); c.noteT = rand(1.6, 3); }
        tick(c, dt);
      },
      pose(c, p) {
        const q = Math.sin(p.now * 9 + c.seed);
        p.rock = q * 0.13; p.bob = Math.abs(q) * 3;
        p.lf = Math.max(0, q) * 4; p.rf = Math.max(0, -q) * 4;
        p.hl = [-30, -50 - q * 9]; p.hr = [30, -50 + q * 9];
      },
    },
  },
};
