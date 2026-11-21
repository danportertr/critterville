// Comings and goings.
//
//   moving away   Now and then somebody packs a suitcase and leaves for good.
//                 Everyone who's free comes to wave them off. (Someone new
//                 will move in eventually: see arrive() in sim/world.js.)
//   an adventure  Somebody shoulders a knapsack and sets off. A few days
//                 later they're back, and for a while they tell stories
//                 about where they went and paint it from memory.
//
// Critters who are away on an adventure wait in S.away until it's time.
import { S, isNight, phase } from '../state.js';
import { DAY_LEN } from '../config.js';
import { TAU, rand, pick, clamp, dist } from '../util.js';
import { freePoint, topEdge } from '../world/geometry.js';
import { hydrate, assignHomes } from '../world/town.js';
import { note } from '../journal.js';
import { goTo, setAct, say, release, isFree, tick } from '../sim/core.js';

export const PLACES = [
  { id: 'mountains', name: 'the mountains', words: ['so high!', 'snow!', 'an eagle', 'echo... echo'] },
  { id: 'sea', name: 'the sea', words: ['waves!', 'a whale!', 'salty', 'so blue'] },
  { id: 'desert', name: 'the desert', words: ['so hot', 'sand!', 'a cactus', 'the stars!'] },
  { id: 'city', name: 'a big city', words: ['so tall!', 'lights!', 'noisy', 'a train!'] },
  { id: 'forest', name: 'a deep forest', words: ['huge trees', 'an owl', 'so quiet', 'moss'] },
  { id: 'island', name: 'a far-off island', words: ['a boat!', 'palm trees', 'crabs', 'coconuts'] },
];
const placeOf = id => PLACES.find(p => p.id === id) || PLACES[0];
/** The fields that describe a critter for good (also what gets saved). */
export const keep = c => ({ name: c.name, seed: c.seed, size: c.size, head: c.head, body: c.body, hat: c.hat, hatFrom: c.hatFrom, story: c.story, x: c.x, y: c.y });

// ---- leaving ----
function setOff(kind) {
  const c = pick(S.critters.filter(isFree));
  if (!c) return { dur: 1 };
  release(c);
  c.x = clamp(c.x, 90, S.W - 90); c.y = clamp(c.y, topEdge() + 30, S.H - 40);
  c.luggage = kind === 'moving' ? 'case' : 'knapsack'; c.leaving = kind;
  setAct(c, 'goodbye', 15);
  say(c, kind === 'moving' ? 'goodbye!' : 'off I go!', 2.5);
  note(kind === 'moving' ? `${c.name} has packed a suitcase. ${c.name} is moving away.` : `${c.name} has packed a knapsack and is off on an adventure.`);
  const friends = S.critters.filter(o => o !== c && isFree(o));
  friends.forEach((o, i) => {   // everyone who's free gathers round to wave
    const a = Math.PI * (0.15 + 0.7 * (i + 0.5) / friends.length) + (i % 2 ? Math.PI : 0);
    o.nextWalk = 'trot';
    goTo(o, c.x + Math.cos(a) * rand(58, 84), c.y + Math.sin(a) * rand(22, 34), () => {
      if (c.act !== 'goodbye') return;
      o.dir = c.x > o.x ? 1 : -1; o.sad = kind === 'moving';
      setAct(o, 'seeoff', c.t + rand(3, 6));
    });
  });
  return { dur: 20 };
}
function gone(c) {
  release(c);
  const i = S.critters.indexOf(c);
  if (i >= 0) S.critters.splice(i, 1);
  if (c.leaving === 'adventure') {
    const place = pick(PLACES);
    S.away.push({ who: keep(c), place: place.id, back: S.clock + rand(1.6, 3) * DAY_LEN });
  } else note(`${c.name} has gone. The town feels a little quieter.`);
}

export const farewell = {
  id: 'farewell',
  can: () => S.critters.length >= 7 && phase() > 0.1 && phase() < 0.5 && Math.random() < 0.35,   // rare, even among rare things
  start: () => setOff('moving'),
};
export const adventure = {
  id: 'adventure',
  can: () => S.critters.length >= 5 && !S.away.length && phase() > 0.05 && phase() < 0.45,
  start: () => setOff('adventure'),
};

// ---- coming back ----
/** Called every tick from sim/world.js. */
export function updateJourneys() {
  const i = S.away.findIndex(a => S.clock > a.back);
  if (i < 0 || isNight()) return;
  const { who, place } = S.away.splice(i, 1)[0], p = freePoint(), where = placeOf(place);
  const c = hydrate({ ...who, home: -1, x: rand() < 0.5 ? -30 : S.W + 30, y: clamp(p.y, 130, S.H - 30) });
  c.luggage = 'knapsack';
  c.story = { place, until: S.clock + 2.5 * DAY_LEN };
  S.critters.push(c); assignHomes();
  goTo(c, p.x, p.y, () => { c.luggage = null; setAct(c, 'wave', 2.5); say(c, "I'm back!", 2.2); });
  note(`${c.name} is back from ${where.name}, full of stories.`);
}

// ---- telling everyone about it ----
export const story = {
  id: 'story',
  weight: c => c.story && S.clock < c.story.until ? 2.2 : 0,
  start(c) {
    const f = S.fire && S.fire.progress >= 1 ? S.fire : null, a = rand(TAU);
    const spot = f ? { x: f.x + Math.cos(a) * 54, y: f.y + Math.sin(a) * 26 } : { x: c.x, y: c.y };
    goTo(c, spot.x, spot.y, () => {
      const t = rand(11, 17);
      setAct(c, 'tell', t); c.wordT = 0.4;
      const crowd = S.critters.filter(o => o !== c && isFree(o) && dist(o, c) < 420).slice(0, 5);
      crowd.forEach((o, i) => {
        const b = Math.PI * (0.1 + 0.8 * (i + 0.5) / crowd.length);
        goTo(o, c.x + Math.cos(b) * rand(52, 76), c.y + Math.sin(b) * rand(22, 32), () => { if (c.act === 'tell') { o.dir = c.x > o.x ? 1 : -1; setAct(o, 'listen', c.t + rand(0, 2)); } });
      });
    });
  },
  states: {
    goodbye: {   // the one who's leaving: a last wave, then the long walk to the edge of the screen
      mood: 'smile',
      update(c, dt) { if ((c.wordT = (c.wordT || 2.5) - dt) <= 0) { say(c, pick(c.leaving === 'moving' ? ['goodbye!', 'miss you all', 'bye!'] : ['bye!', 'back soon', 'see you!']), 1.6); c.wordT = 3.2; } tick(c, dt); },
      finish(c) {
        goTo(c, c.x < S.W / 2 ? -50 : S.W + 50, c.y, () => gone(c));
        return true;
      },
      pose(c, p) { p.hr = [30 + Math.sin(p.now * 9) * 5, -57]; if (c.leaving === 'moving') p.mouth = 'small'; },
    },
    seeoff: {    // everybody else, waving
      update(c, dt) { if ((c.wordT = (c.wordT || rand(0.5, 3)) - dt) <= 0) { say(c, pick(c.sad ? ['bye...', 'stay!', 'write!', '♥'] : ['bye!', 'have fun!', 'good luck', '♥']), 1.5); c.wordT = rand(3, 5); } tick(c, dt); },
      finish(c) { c.sad = false; },
      pose(c, p) { p.hl = [-30 - Math.sin(p.now * 8 + c.seed) * 5, -56]; p.mouth = c.sad ? 'sad' : 'big'; },
    },
    tell: {      // back from an adventure, holding forth
      mood: 'big',
      update(c, dt) { if ((c.wordT -= dt) <= 0) { say(c, pick(placeOf(c.story && c.story.place).words), 1.5); c.wordT = 1.9; } tick(c, dt); },
      pose(c, p) { const q = Math.sin(p.now * 5 + c.seed); p.hl = [-30, -40 - q * 12]; p.hr = [30, -40 + q * 12]; },
    },
    listen: {
      mood: 'oh',
      update(c, dt) { if (Math.random() < dt * 0.22) say(c, pick(['ooh', 'wow', 'really?', 'no!', '♥']), 1.2); tick(c, dt); },
    },
  },
};
