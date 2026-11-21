// Help build whatever the town is working on: the campfire, a house (or
// something added onto one), the bridge, the swing set or the pool. What gets built next is decided in sim/world.js.
import { S } from '../state.js';
import { HOUSE, SWING, INK, WOOD } from '../config.js';
import { TAU, rand, pick } from '../util.js';
import { note } from '../journal.js';
import { box, line, blob } from '../draw/primitives.js';
import { pileSpot } from '../draw/site.js';
import { puff } from '../puffs.js';
import { assignHomes, beds, livingIn } from '../world/town.js';
import { rebuildObs } from '../world/geometry.js';
import { news, nearby, isFriend } from '../talk.js';
import { currentSite } from '../sim/world.js';
import { goTo, setAct, say, tick, isFree } from '../sim/core.js';

// How much one work session adds, and what to announce when it's done.
const JOBS = {
  fire: { step: 0.26, done: 'The campfire is ready.' },
  house: { step: 0.1, done: 'A new house is finished!' },
  swing: { step: 0.1, done: 'The swing set is finished!' },
  stage: { step: 0.075, done: 'The stage is up, curtains and all.' },
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
    case 'stage': return { x: s.x + side * rand(30, 104), y: s.y + rand(6, 16) };
    case 'monument': return { x: s.x + side * rand(20, 66), y: s.y + rand(6, 22) };
    case 'hammock': return { x: s.x + side * rand(10, 40), y: s.y + rand(6, 12) };
    case 'tank': return { x: s.x + side * rand(30, 46), y: s.y + rand(4, 12) };
    case 'swing': return { x: s.x + side * rand(20, SWING.half + 10), y: s.y + rand(6, 14) };
    default: return { x: s.x + side * rand(24, HOUSE.w / 2 * HOUSE.scale + 14), y: s.y + rand(8, 16) };
  }
}

// What the work looks like depends on the job and how far along it is.
//   hammer  the default      saw     cutting planks at a sawhorse (early carpentry)
//   dig     the pool         chisel  stone: the campfire ring, the monument
//   paint   the last stretch of a house, or a new room
function jobFor(s) {
  if (s.kind === 'pool') return 'dig';
  if (s.kind === 'monument' || s.kind === 'fire') return 'chisel';
  if (s.adding) return s.adding.progress > 0.7 ? 'paint' : pick(['hammer', 'hammer', 'saw']);
  if (s.kind === 'house') return s.progress > 0.84 ? 'paint' : s.progress < 0.3 ? pick(['saw', 'hammer']) : 'hammer';
  if (s.phase === 'striking') return 'hammer';
  return s.progress < 0.5 && rand() < 0.45 ? 'saw' : 'hammer';
}
function workOn(c, s) {
  const begin = () => {
    const p = standAt(s);
    goTo(c, p.x, p.y, () => { c.carry = null; c.dir = s.x > c.x ? 1 : -1; c.site = s; c.job = jobFor(s); c.strikeT = 0.3; setAct(c, 'build', rand(4, 7)); });
  };
  // Often they fetch a plank (or a stone) from the pile first and carry it over.
  const pile = !s.adding && s.phase !== 'striking' && s.progress < 0.9 && rand() < 0.45 && pileSpot(s);
  if (!pile) return begin();
  goTo(c, pile.x + (c.x < pile.x ? -16 : 16), pile.y + 3, () => {
    c.carry = (c, p) => {
      const [x, y] = p.HR;
      if (pile.stone) blob(x, y - 6, 7, 5, '#d8d8e0', c.seed + 6, 7, 0.1, 0.3, 2);
      else box([[x - 20, y - 5], [x + 18, y - 9], [x + 18, y - 5.5], [x - 20, y - 1.5]], WOOD, c.seed + 6, 0.3, 2);
    };
    begin();   // (the load is put down when they arrive)
  });
}
/**
 * The monument is a long, slow job done in odd moments. It's separate from the
 * ordinary building site so that it never has to wait its turn behind a
 * hammock, a chimney or a stage: somebody can always go and put in a session.
 */
/** Something's finished: confetti, and whoever is standing about gives a cheer. */
function celebrate(c, s) {
  puff('confetti', s.x, s.y - 50); puff('confetti', s.x - 30, s.y - 30); puff('confetti', s.x + 30, s.y - 30);
  for (const o of S.critters) if (o !== c && isFree(o) && Math.hypot(o.x - s.x, o.y - s.y) < 260) { setAct(o, 'wave', rand(1.5, 3)); if (rand() < 0.6) say(o, pick(['hooray!', 'yay', '♥', 'done!']), 1.6); o.hopV = rand(60, 130); }
}
export const monumentWork = {
  id: 'monumentWork',
  weight: () => S.monument && S.monument.progress < 1 ? 1.3 : 0,
  start(c) { workOn(c, S.monument); },
};

/**
 * A house that's just got bigger has room for somebody else. A friend of the
 * people who live there moves in from across town (but nobody's left living
 * on their own because of it).
 */
function moveIn(h) {
  const here = livingIn(h);
  if (here.length >= beds(h)) return;
  const could = S.critters.filter(c => c.home && c.home !== h && livingIn(c.home).length > 2);
  const c = could.find(c => here.some(o => isFriend(c, o))) || (rand() < 0.5 ? pick(could) : null);
  if (!c) return;
  c.home = h;
  const host = here.find(o => isFriend(c, o));
  note(host ? `Now there's room, ${c.name} has moved in with ${host.name}.` : `Now there's room, ${c.name} has moved into the bigger house.`);
}

export default {
  id: 'build',
  weight: () => currentSite() ? 4 : 0,
  start(c) { workOn(c, currentSite()); },
  states: {
    build: { mood: 'flat',
      update(c, dt) {   // every blow, stroke or shovelful throws something up
        if ((c.strikeT -= dt) <= 0) {
          const x = c.x + c.dir * 30 * c.size, y = c.y - 20 * c.size, s = c.site;
          if (c.job === 'dig') { puff('dirt', x, c.y - 8, -c.dir); c.strikeT = 1.05; }
          else if (c.job === 'saw') { puff('sawdust', c.x + c.dir * 34 * c.size, c.y - 20 * c.size); c.strikeT = 0.4; }
          else if (c.job === 'chisel') { puff('chips', x, c.y - 30 * c.size, -c.dir); c.strikeT = 0.57; }
          else if (c.job === 'paint') { puff('paint', x, y - 16, 0, s && (s.color || '#fff')); c.strikeT = 0.9; }
          else { puff('dust', x, y); c.strikeT = 0.571; }
        }
        tick(c, dt);
      },
      finish(c) {
        const s = c.site;
        if (!s) return;
        if (s.adding) {   // an add-on to a finished house
          const job = JOBS[s.adding.what];
          if ((s.adding.progress += job.step) < 1) return;
          s.addons.push(s.adding.what); delete s.adding;
          rebuildObs(); note(job.done); c.hopV = 150; say(c, '!');
          celebrate(c, s);
          moveIn(s);
          return;
        }
        if (s.phase === 'striking') {   // the play's over: the stage comes down a bit at a time
          if ((s.progress -= 0.12) > 0) return;
          if (S.theatre === s) S.theatre = null;
          rebuildObs(); note('The stage has been packed away until the next play.');
          return;
        }
        if (s.progress >= 1) return;
        s.progress += JOBS[s.kind].step;
        if (s.progress < 1) return;
        s.progress = 1;
        if (s.kind === 'house') assignHomes();
        note(JOBS[s.kind].done); c.hopV = 150; say(c, '!');
        celebrate(c, s);
        news({ fire: 'a campfire!', house: 'a new house!', bridge: 'the bridge is done', swing: 'swings!', tank: 'a fish tank!', pool: 'the pool is full!', hammock: 'a hammock!', monument: 'the monument!', stage: 'the stage is up!' }[s.kind], nearby(c, 300));
      },
      pose(c, p) {
        const d = p.d, t = p.now;
        if (c.job === 'saw') { p.bob = -3; p.hand(d, d * (22 + Math.sin(t * 8) * 9), -24); p.hand(-d, d * 8, -20); }
        else if (c.job === 'dig') { const q = Math.sin(t * 3); p.bob = -2 + q * 3; p.rock = d * (0.1 - q * 0.08); p.hand(d, d * 22, -14 - q * 10); p.hand(-d, d * 8, -26 - q * 8); }
        else if (c.job === 'chisel') { p.hand(d, d * (24 + Math.sin(t * 11) * 4), -36); p.hand(-d, d * 12, -44 + Math.sin(t * 11) * 6); }
        else if (c.job === 'paint') p.hand(d, d * 27, -40 + Math.sin(t * 3.5) * 16);
        else p.hand(d, d * 28, -34 + Math.sin(t * 11) * 11);
      },
      props(c, p) {
        const d = p.d, [x, y] = p.HD, sd = c.seed + 6;
        if (c.job === 'saw') {          // a plank on a sawhorse, and the saw going back and forth
          for (const k of [-1, 1]) { line([[d * 30 + k * 9, 0], [d * 30 + k * 3, -17]], sd + k, 2.2, INK, 0.2); line([[d * 30 - k * 9, 0], [d * 30 - k * 3, -17]], sd + k + 3, 2.2, INK, 0.2); }
          box([[d * 12, -21], [d * 48, -22], [d * 48, -18], [d * 12, -17]], WOOD, sd + 8, 0.3, 2);
          box([[x - d * 2, y - 2], [x + d * 15, y - 4], [x + d * 15, y + 3], [x - d * 2, y + 1]], '#c6c8d2', sd + 9, 0.2, 1.6);
        } else if (c.job === 'dig') {   // a shovel
          const tip = [x + d * 9, y + 17];
          line([[p.HL[0] * 0.5 + p.HR[0] * 0.5, Math.min(p.HL[1], p.HR[1]) - 6], tip], sd, 2.4, INK, 0.2);
          box([[tip[0] - 5, tip[1] - 2], [tip[0] + 5, tip[1] - 2], [tip[0] + 3, tip[1] + 8], [tip[0] - 3, tip[1] + 8]], '#bbb', sd + 1, 0.3, 2);
        } else if (c.job === 'chisel') { // chisel in one hand, mallet in the other
          line([[x, y], [x + d * 10, y + 2]], sd, 2.6, INK, 0.2);
          const m = d > 0 ? p.HL : p.HR; box([[m[0] - 5, m[1] - 9], [m[0] + 5, m[1] - 9], [m[0] + 5, m[1] - 2], [m[0] - 5, m[1] - 2]], WOOD, sd + 1, 0.3, 2);
        } else if (c.job === 'paint') {  // a roller
          line([[x, y], [x + d * 3, y - 12]], sd, 2.2, INK, 0.2);
          box([[x - d * 3, y - 17], [x + d * 10, y - 17], [x + d * 10, y - 11], [x - d * 3, y - 11]], (c.site && c.site.color) || '#fff', sd + 1, 0.3, 2);
        } else {                         // a hammer
          const top = [x + d * 2, y - 13];
          line([p.HD, top], sd, 2.4, INK, 0.2);
          box([[top[0] - 6, top[1] - 3], [top[0] + 6, top[1] - 3], [top[0] + 6, top[1] + 3], [top[0] - 6, top[1] + 3]], '#bbb', sd + 1, 0.3, 2);
        }
      },
    },
  },
};
