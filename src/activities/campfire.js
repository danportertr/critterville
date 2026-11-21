// Gather round the fire in the evening. Night owls stay up by it for a while.
import { S, isEvening } from '../state.js';
import { TAU, rand } from '../util.js';
import { goTo, setAct } from '../sim/core.js';

function sit(c, lo, hi) {
  const f = S.fire, a = rand(TAU);
  goTo(c, f.x + Math.cos(a) * rand(44, 60), f.y + Math.sin(a) * rand(20, 30), () => { c.dir = f.x > c.x ? 1 : -1; setAct(c, 'warm', rand(lo, hi)); });
}

export default {
  id: 'campfire',
  weight: () => isEvening() ? 5 : 0,
  start(c) { sit(c, 8, 20); },
  startOwl(c) { c.owl = false; sit(c, 18, 40); },
  states: {
    warm: { pose(c, p) { const q = Math.sin(p.now * 3 + c.seed); p.hl = [-27, -27 + q]; p.hr = [27, -27 - q]; } },
  },
};
