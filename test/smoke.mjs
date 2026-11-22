// Smoke test: boot the real game with a pretend browser, then fast-forward a
// few brand new towns through several weeks at different screen sizes. It
// fails if anything throws, if a critter ends up somewhere impossible, or if a
// town won't survive being saved and loaded again.
//
//   npm test                     the usual run
//   node test/smoke.mjs 60 7     60 days per town, random seed 7
//
// There's no real canvas or page here: every drawing and DOM call lands on a
// stand-in that accepts anything. So this catches crashes and stuck logic, not
// things that merely look wrong.
const DAYS = +process.argv[2] || 30, SEED = +process.argv[3] || 1;
const SIZES = [[390, 844, 'phone'], [1280, 800, 'laptop'], [820, 1180, 'tablet']];
const STEP = 1 / 30, DAY = 300;

// ---- a pretend browser ----
// One object that can be called, read, written and looped over, and always
// hands back itself (or something harmless).
const fake = new Proxy(function () {}, {
  get(_, k) {
    if (k === Symbol.toPrimitive) return hint => (hint === 'number' ? 0 : '');
    if (k === Symbol.iterator) return function* () {};
    if (k === 'then') return undefined;                 // not a promise
    if (k === 'width' || k === 'height' || k === 'length') return 0;
    if (k === 'toDataURL') return () => 'data:,';
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'hidden') return false;
    return fake;
  },
  set: () => true,
  apply: () => fake,
  construct: () => fake,
});
const listeners = {};
const store = new Map();
Object.assign(globalThis, {
  window: globalThis, document: fake, Audio: fake, AudioContext: fake, Image: fake,
  location: { search: '', href: 'http://localhost/', reload() {} },
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => void store.set(k, String(v)), removeItem: k => void store.delete(k) },
  addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
  removeEventListener() {},
  requestAnimationFrame() {},          // the test drives time itself
  fetch: () => new Promise(() => {}),  // no network
  devicePixelRatio: 2, innerWidth: SIZES[0][0], innerHeight: SIZES[0][1],
});

// The same "random" numbers every run, so a failure can be reproduced.
let seed = SEED;
Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---- the real game ----
await import('../src/main.js');
const { S } = await import('../src/state.js');
const { updateWorld } = await import('../src/sim/world.js');
const { render } = await import('../src/draw/render.js');
const { newTown } = await import('../src/world/town.js');
const { save, load } = await import('../src/world/save.js');
const { startDiary } = await import('../src/journal.js');

const day = () => Math.floor(S.clock / DAY) + 1;
function fail(what, err) {
  console.error(`\nFAILED on day ${day()} (${S.W | 0}x${S.H | 0}, seed ${SEED}): ${what}`);
  if (err) console.error(err.stack || err);
  process.exit(1);
}
const about = c => `${c.name} [${c.act}${c.leaving ? ' leaving' : ''}${c.hidden ? ' hidden' : ''}${c.luggage ? ' ' + c.luggage : ''}${c.then ? ' then' : ''}] at ${c.x | 0},${c.y | 0} heading for ${c.tx | 0},${c.ty | 0}${process.env.DEBUG ? ` walkT ${c.walkT} jump ${JSON.stringify(c.jump)} path ${JSON.stringify(c.path)} then ${String(c.then).slice(0, 400)}` : ''}`;
function check() {
  for (const c of S.critters) {
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) fail(`${c.name} is at ${c.x},${c.y} while doing "${c.act}"`);
    if (c.leaving || c.luggage) continue;   // setting off on a journey, or just back from one: allowed to be off the edge
    if (c.x < -60 || c.x > S.W + 60 || c.y < -60 || c.y > S.H + 60) fail(`left the screen: ${about(c)}`);
  }
  for (const b of [S.ball, ...S.extraBalls]) if (b && !(Number.isFinite(b.x) && Number.isFinite(b.y))) fail('a ball is nowhere');
}

if (!S.critters.length) fail('the game booted without a town');
let total = 0;
for (const [w, h, name] of SIZES) {
  globalThis.innerWidth = w; globalThis.innerHeight = h;
  for (const fn of listeners.resize || []) fn();
  newTown(); startDiary();
  const seen = new Set(), events = new Set(), stuck = new Map(), ballGames = new Set(), crowds = [];
  let crowd = -1;
  const t0 = Date.now();
  for (let i = 0; i < DAYS * DAY / STEP; i++) {
    S.now += STEP; S.boil = Math.floor(S.now * 5);
    try { updateWorld(STEP); } catch (e) { fail('the simulation threw', e); }
    for (const g of S.ballGames) ballGames.add(g);
    if (i % 15 === 0) {
      try { render(); } catch (e) { fail('drawing threw', e); }
      check();
      for (const c of S.critters) seen.add(c.act);
      if (S.event) events.add(S.event.def.id);
      // how many turned up to watch each play (the biggest audience it had)
      if (S.theatre && S.theatre.phase === 'show') crowd = Math.max(crowd, S.critters.filter(c => c.act === 'audience').length);
      else if (crowd >= 0) { crowds.push(crowd); crowd = -1; }
    }
    if (i % 900 === 0) {   // every half minute: is anybody doing the same thing in the same place as two days ago?
      for (const c of S.critters) {
        const key = `${c.act}@${c.x | 0},${c.y | 0}`, was = stuck.get(c);
        if (was && was.key === key) { if (S.clock - was.since > 2 * DAY) fail(`stuck for two days: ${about(c)}`); }
        else stuck.set(c, { key, since: S.clock });
      }
    }
    if (i % (5 * DAY / STEP) === 0 && i) {   // every five days: put the town away and get it out again
      const before = { clock: S.clock, critters: S.critters.filter(c => !c.leaving).length, houses: S.houses.length };   // (someone in the middle of moving away isn't saved)
      try { save(); if (!load()) fail('a saved town would not load'); } catch (e) { fail('saving and loading threw', e); }
      if (S.critters.length !== before.critters || S.houses.length !== before.houses) fail(`loading changed the town: ${JSON.stringify(before)} became ${S.critters.length} critters, ${S.houses.length} houses`);
    }
  }
  if (crowds.length >= 3 && crowds.reduce((a, b) => a + b, 0) / crowds.length < 2.5) fail(`hardly anyone watches the plays (audiences: ${crowds.join(' ')})`);
  total += seen.size;
  console.log(`ok  ${name.padEnd(7)} ${w}x${h}  ${DAYS} days in ${((Date.now() - t0) / 1000).toFixed(1)}s  ${S.critters.length} critters, ${S.houses.length} houses, ${S.plays.length} plays (audiences: ${crowds.join(' ') || 'none'}), ${S.games.length} games invented (${[...ballGames].filter(g => g.named).length} of ${ballGames.size} ball games were one of the town's own), ${seen.size} kinds of activity, events: ${[...events].join(' ') || 'none'}`);
}
if (total < 30) fail('hardly anything happened, which is suspicious');
console.log('\nAll towns ran without trouble.');
process.exit(0);
