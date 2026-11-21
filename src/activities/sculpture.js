// Sculpture. Where a painting records something seen, a sculpture is a thing
// in the town: it has a material, it may do something, it weathers, and the
// critters use it and fuss over it.
//
//   statues      a critter, a totem or an arch, carved from stone or wood, or
//                from a fallen star (those glow at night)
//   sand         a sandcastle or sand critter by the water, gone with the next rain
//   working      one each of a sundial, weathervane, birdbath and bench
//   assemblage   a pile of things that have turned up in town
//
// Carving itself is the 'sculpt' state in art.js; this file decides what gets
// made, looks after the pieces afterwards, and has the critters' responses.
import { S, built, phase } from '../state.js';
import { DAY_LEN, STREAM_HALF, PETALS, HEADS } from '../config.js';
import { TAU, rand, irand, pick, clamp, dist } from '../util.js';
import { log } from '../ui.js';
import { ctx } from '../draw/canvas.js';
import { MATERIALS, STATUES, formOf, drawBenchFront } from '../draw/sculpture.js';
import { findSpot, rebuildObs, streamPoint } from '../world/geometry.js';
import { note } from '../journal.js';
import { goTo, setAct, say, release } from '../sim/core.js';

const WORKING = ['sundial', 'vane', 'birdbath', 'bench'];
const NAMES = { critter: 'statue of a critter', totem: 'totem', arch: 'arch', castle: 'sandcastle', sandcritter: 'sand critter', sundial: 'sundial', vane: 'weathervane', birdbath: 'birdbath', bench: 'bench', assemblage: 'pile of found things' };
const sculptures = () => S.arts.filter(a => a.type === 'sculpture' && a.progress >= 1 && a.dying === undefined);

function weighted(options) {
  let r = rand(options.reduce((s, o) => s + o[0], 0));
  for (const [w, v] of options) if ((r -= w) <= 0) return v;
  return options[0][1];
}
/** Somewhere on the bank, for things made of sand. */
function byTheWater() {
  if (S.pond && (!S.stream || rand() < 0.5)) { const a = rand(0.15, 0.85) * Math.PI; return { x: S.pond.x + Math.cos(a) * (S.pond.rx + 26), y: S.pond.y + Math.sin(a) * (S.pond.ry + 20) }; }
  const p = streamPoint(rand(0.2, 0.8));
  return { x: p.x + p.nx * (STREAM_HALF + 24), y: p.y + p.ny * (STREAM_HALF + 24) };
}
/** Odds and ends the town has come by, for an assemblage. */
function foundThings() {
  const have = ['apple'];
  if (S.journal.fish.boot) have.push('boot');
  if (S.critters.some(c => c.hat)) have.push('hat');
  if (S.stones.length) have.push('star');
  have.push('apple');
  const items = have.sort(() => rand() - 0.5).slice(0, 3);
  if (S.lastCart === 'balloon') items.push('balloon');   // tied on top
  return items;
}

/** Decide what to make. */
export function newSculpture(c) {
  const made = f => S.arts.some(a => a.type === 'sculpture' && formOf(a) === f && a.dying === undefined);
  const options = [[2.2, { form: pick(STATUES), material: pick(['stone', 'stone', 'wood']) }]];
  for (const f of WORKING) if (!made(f)) options.push([1.5, { form: f, material: f === 'bench' ? 'wood' : 'stone', keep: true }]);   // one of each, and they stay
  const stone = S.stones.find(s => !s.claimed);
  if (stone) options.push([1.6, { form: pick(STATUES), material: 'star', stoneSeed: stone.seed }]);
  if (S.pond || S.stream) options.push([1.1, { form: pick(['castle', 'sandcritter']), material: 'sand' }]);
  const things = foundThings();
  if (things.length > 2) options.push([1, { form: 'assemblage', material: 'stone', items: things }]);
  const what = weighted(options);
  let p;
  if (what.material === 'star') { stone.claimed = true; p = { x: stone.x, y: stone.y }; }
  else p = what.material === 'sand' ? byTheWater() : findSpot(26, 32, 25);
  return { type: 'sculpture', ...what, x: p.x, y: p.y, seed: irand(1e6), progress: 0, by: c.name, c1: pick(PETALS), c2: pick(HEADS), c3: pick(PETALS) };
}
/** The sculptor gave up part-way. */
export function abandon(a) {
  const s = S.stones.find(s => s.seed === a.stoneSeed);
  if (s) s.claimed = false;
}
/** "a wooden totem", "an arch carved from a fallen star"... */
export function describe(a) {
  const form = formOf(a), mat = a.material || 'stone', name = NAMES[form] || 'sculpture';
  if (!STATUES.includes(form)) return `${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name}`;
  return mat === 'star' ? `${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name} carved from a fallen star` : `a ${MATERIALS[mat].word} ${name}`;
}
/** The last chip falls. */
export function finished(a, c) {
  const form = formOf(a);
  a.born = S.clock;
  if (a.material === 'star') { const i = S.stones.findIndex(s => s.seed === a.stoneSeed); if (i >= 0) S.stones.splice(i, 1); rebuildObs(); }
  const verb = a.material === 'sand' ? 'built' : form === 'assemblage' ? 'put together' : form === 'bench' ? 'made' : 'carved';
  note(`${c.name} ${verb} ${describe(a)}${a.material === 'sand' ? ' by the water' : form === 'bench' ? ' out of a log' : ''}.`);
}

// ---- looking after them ----
export function updateSculptures(dt) {
  const raining = S.event && S.event.def.id === 'rain' && S.event.t < 55;
  for (const a of S.arts) {
    if (a.type !== 'sculpture' || a.progress < 1) continue;
    const form = formOf(a);
    if (form === 'vane') {   // whirls in a wind, otherwise drifts round idly
      a.spinV = (a.spinV || 0) + (S.wind * 9 + 0.25 - (a.spinV || 0)) * Math.min(1, dt);
      a.spin = ((a.spin || 0) + a.spinV * dt) % TAU;
    } else if (form === 'birdbath') a.water = clamp((a.water || 0) + (raining ? dt / 18 : -dt / (DAY_LEN * 1.6)), 0, 1);
  }
  for (const t of S.trees) if (t.topiary && S.clock > t.topiary.until) delete t.topiary;   // grown out
}
/** Rain: anything made of sand goes. */
export function washAway() {
  const gone = sculptures().filter(a => a.material === 'sand');
  for (const a of gone) a.dying = 1;
  if (gone.length) log(`The rain is washing away ${gone[0].by}'s ${NAMES[formOf(gone[0])]}.`);
}
/** Wind: the top comes off a tall cairn. */
export function topple() {
  const c = S.cairns.find(c => c.n > 3);
  if (!c) return;
  c.n -= 1 + irand(Math.min(3, c.n - 2));
  log('The wind knocked the top off the cairn.');
}

// ---- what critters do with them ----
const SEAT = 19;   // how far each seat is from the middle of the bench
const seatTaken = (a, i) => S.critters.some(c => c.act === 'sit' && c.bench === a && c.seat === i) || S.critters.some(c => c.benchWant === a && c.seat === i);
const TIME_WORDS = () => { const p = phase(); return p < 0.2 ? 'early!' : p < 0.4 ? 'noon-ish' : p < 0.6 ? 'getting on' : 'late!'; };

export const respond = {
  id: 'respond',
  weight: () => sculptures().length ? 1.2 : 0,
  start(c) {
    const a = pick(sculptures()), form = formOf(a), side = c.x < a.x ? -1 : 1;
    const stand = (then) => goTo(c, a.x + side * 30, a.y + 5, () => { c.dir = -side; then(); });
    const look = (words) => stand(() => { setAct(c, 'admire', rand(3, 5)); say(c, pick(words)); });
    if (form === 'bench') {
      const i = [0, 1].find(i => !seatTaken(a, i));
      if (i === undefined) return false;
      c.benchWant = a; c.seat = i;
      c.cleanup = () => { c.benchWant = null; };
      return goTo(c, a.x + (i ? SEAT : -SEAT), a.y + 6, () => {
        c.bench = a; c.benchWant = null; c.x = a.x + (i ? SEAT : -SEAT); c.y = a.y + 0.6; c.sink = -10; c.dir = i ? -1 : 1;
        setAct(c, 'sit', rand(12, 26));
      });
    }
    if (form === 'sundial') return look([TIME_WORDS(), 'hm', 'oh!']);
    if (form === 'vane') return look(S.wind ? ['whoa', 'wheee', '!'] : ['hm', 'still', '?']);
    if (form === 'birdbath') return look((a.water || 0) > 0.15 ? ['tweet?', 'hello', '♥'] : ['empty', 'hm', '?']);
    if (a.material === 'sand') return look(['ooh', 'careful', 'nice', '♥']);
    // A statue or a pile of things: leave a flower, lend it a hat, lean on it, or strike its pose.
    const r = rand();
    if (r < 0.3) return goTo(c, a.x + side * 20, a.y + 7, () => setAct(c, 'plant', 2.4));   // a flower at its foot
    if (r < 0.55 && c.hat && !a.hat && STATUES.includes(form)) return stand(() => {
      a.hat = c.hat; c.hat = null;
      setAct(c, 'admire', 3); say(c, '♥'); log(`${c.name} put a hat on the ${NAMES[form]}.`);
    });
    if (r < 0.75 && form === 'critter') return stand(() => { c.dir = side; setAct(c, 'pose', rand(4, 7)); say(c, pick(['ta-da', 'same!', '!'])); });
    if (r < 0.9) return goTo(c, a.x + side * 19, a.y + 3, () => { c.dir = -side; setAct(c, 'lean', rand(5, 9)); });
    look(['♥', 'ooh', 'hm', 'wow', 'nice']);
  },
  states: {
    sit: {    // on the bench, feet dangling
      mood: 'smile',
      finish(c) { c.sink = 0; c.y = c.bench.y + 7; c.hopV = 70; c.bench = null; release(c); },
      transform(c) { ctx.translate(c.x, c.y - 0.6 - 10); ctx.scale(c.size, c.size); return true; },
      pose(c, p) { const k = Math.sin(p.now * 3 + c.seed); p.hl = [-14, -13]; p.hr = [14, -13]; p.lf = Math.max(0, k) * 3; p.rf = Math.max(0, -k) * 3; },
      after(c) { drawBenchFront(c.bench); },
    },
    lean: {   // propped against it
      mood: 'small',
      pose(c, p) { p.rock = p.d * 0.13; p.hand(p.d, p.d * 20, -30); p.lx = -p.d * 2; p.rx = -p.d * 2; },
    },
    pose: { mood: 'big', pose(c, p) { p.bob = 0; } },   // arms out, just like the statue
  },
};

/** For the sign when you tap one. */
export const label = a => `${describe(a).replace(/^./, ch => ch.toUpperCase())} by ${a.by}${a.hat ? ', wearing a hat' : ''}.`;
