// Help build whatever the town is working on: the campfire, a house, the
// swing set or the pool. What gets built next is decided in sim/world.js.
import { S } from '../state.js';
import { HOUSE, SWING, INK } from '../config.js';
import { TAU, rand } from '../util.js';
import { note } from '../journal.js';
import { box, line } from '../draw/primitives.js';
import { assignHomes } from '../world/town.js';
import { currentSite } from '../sim/world.js';
import { goTo, setAct, say } from '../sim/core.js';

// How much one work session adds, and what to announce when it's done.
const JOBS = {
  fire: { step: 0.26, done: 'The campfire is ready.' },
  house: { step: 0.1, done: 'A new house is finished!' },
  swing: { step: 0.1, done: 'The swing set is finished!' },
  pool: { step: 0.07, done: 'The pool is full. Last one in...' },
};

/** Somewhere to stand while working on a site. */
function standAt(s) {
  const a = rand(TAU), side = rand() < 0.5 ? -1 : 1;
  switch (s.kind) {
    case 'fire': return { x: s.x + Math.cos(a) * 34, y: s.y + Math.sin(a) * 16 };
    case 'pool': return { x: s.x + Math.cos(a) * (s.rx + 24), y: s.y + Math.sin(a) * (s.ry + 18) };
    case 'swing': return { x: s.x + side * rand(20, SWING.half + 10), y: s.y + rand(6, 14) };
    default: return { x: s.x + side * rand(20, HOUSE.w / 2 + 16), y: s.y + rand(8, 16) };
  }
}

export default {
  id: 'build',
  weight: () => currentSite() ? 4 : 0,
  start(c) {
    const s = currentSite(), p = standAt(s);
    goTo(c, p.x, p.y, () => { c.dir = s.x > c.x ? 1 : -1; c.site = s; setAct(c, 'build', rand(4, 7)); });
  },
  states: {
    build: {
      finish(c) {
        const s = c.site;
        if (!s || s.progress >= 1) return;
        s.progress += JOBS[s.kind].step;
        if (s.progress < 1) return;
        s.progress = 1;
        if (s.kind === 'house') assignHomes();
        note(JOBS[s.kind].done); c.hopV = 150; say(c, '!');
      },
      pose(c, p) { p.hand(p.d, p.d * 28, -34 + Math.sin(p.now * 11) * 11); },
      props(c, p) {   // hammer
        const top = [p.HD[0] + p.d * 2, p.HD[1] - 13];
        line([p.HD, top], c.seed + 6, 2.4, INK, 0.2);
        box([[top[0] - 6, top[1] - 3], [top[0] + 6, top[1] - 3], [top[0] + 6, top[1] + 3], [top[0] - 6, top[1] + 3]], '#bbb', c.seed + 7, 0.3, 2);
      },
    },
  },
};
