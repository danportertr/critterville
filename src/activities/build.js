// Help build whatever the town is working on: the campfire, a house (or
// something added onto one), the bridge, the swing set or the pool. What gets built next is decided in sim/world.js.
import { S } from '../state.js';
import { HOUSE, SWING, INK } from '../config.js';
import { TAU, rand } from '../util.js';
import { note } from '../journal.js';
import { box, line } from '../draw/primitives.js';
import { assignHomes } from '../world/town.js';
import { rebuildObs } from '../world/geometry.js';
import { news, nearby } from '../talk.js';
import { currentSite } from '../sim/world.js';
import { goTo, setAct, say } from '../sim/core.js';

// How much one work session adds, and what to announce when it's done.
const JOBS = {
  fire: { step: 0.26, done: 'The campfire is ready.' },
  house: { step: 0.1, done: 'A new house is finished!' },
  swing: { step: 0.1, done: 'The swing set is finished!' },
  monument: { step: 0.024, done: 'The monument is finished. Everybody had a hand in it.' },   // weeks of odd moments
  hammock: { step: 0.34, done: 'The hammock is up.' },
  tank: { step: 0.15, done: 'The fish tank is ready for its first fish.' },
  bridge: { step: 0.13, done: 'The bridge is finished. No more jumping, unless it\'s quicker.' },
  chimney: { step: 0.2, done: 'A house has a new chimney.' },
  annex: { step: 0.14, done: 'A house has a new side room.' },
  upstairs: { step: 0.12, done: 'A house has a new upstairs.' },
  pool: { step: 0.07, done: 'The pool is full. Last one in...' },
};

/** Somewhere to stand while working on a site. */
function standAt(s) {
  const a = rand(TAU), side = rand() < 0.5 ? -1 : 1;
  switch (s.kind) {
    case 'fire': return { x: s.x + Math.cos(a) * 34, y: s.y + Math.sin(a) * 16 };
    case 'pool': return { x: s.x + Math.cos(a) * (s.rx + 24), y: s.y + Math.sin(a) * (s.ry + 18) };
    case 'bridge': { const e = s.ends[side < 0 ? 0 : 1]; return { x: e.x + rand(-10, 10), y: e.y + rand(-6, 6) }; }
    case 'monument': return { x: s.x + side * rand(20, 66), y: s.y + rand(6, 22) };
    case 'hammock': return { x: s.x + side * rand(10, 40), y: s.y + rand(6, 12) };
    case 'tank': return { x: s.x + side * rand(30, 46), y: s.y + rand(4, 12) };
    case 'swing': return { x: s.x + side * rand(20, SWING.half + 10), y: s.y + rand(6, 14) };
    default: return { x: s.x + side * rand(24, HOUSE.w / 2 * HOUSE.scale + 14), y: s.y + rand(8, 16) };
  }
}

export default {
  id: 'build',
  weight() { const s = currentSite(); return !s ? 0 : s.kind === 'monument' && !s.adding ? 1 : 4; },   // the monument is a now-and-then job
  start(c) {
    const s = currentSite(), p = standAt(s);
    goTo(c, p.x, p.y, () => { c.dir = s.x > c.x ? 1 : -1; c.site = s; setAct(c, 'build', rand(4, 7)); });
  },
  states: {
    build: { mood: 'flat',
      finish(c) {
        const s = c.site;
        if (!s) return;
        if (s.adding) {   // an add-on to a finished house
          const job = JOBS[s.adding.what];
          if ((s.adding.progress += job.step) < 1) return;
          s.addons.push(s.adding.what); delete s.adding;
          rebuildObs(); note(job.done); c.hopV = 150; say(c, '!');
          return;
        }
        if (s.progress >= 1) return;
        s.progress += JOBS[s.kind].step;
        if (s.progress < 1) return;
        s.progress = 1;
        if (s.kind === 'house') assignHomes();
        note(JOBS[s.kind].done); c.hopV = 150; say(c, '!');
        news({ fire: 'a campfire!', house: 'a new house!', bridge: 'the bridge is done', swing: 'swings!', tank: 'a fish tank!', pool: 'the pool is full!', hammock: 'a hammock!', monument: 'the monument!' }[s.kind], nearby(c, 300));
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
