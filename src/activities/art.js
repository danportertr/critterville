// Make a painting or a sculpture. A painting starts from what the painter can
// see from the easel (the trees, water, houses and critters around it), though
// what they make of it varies: see chooseStyle. Finished pieces stay around town as a
// little open-air gallery (oldest ones fade once there are too many), and
// other critters wander over to admire them.
import { S, built } from '../state.js';
import { INK, VIEW, DAY_LEN, HEADS, BODIES, PETALS } from '../config.js';
import { SPECIES_BY_ID } from '../data/fish.js';
import { clamp, rand, irand, pick } from '../util.js';
import { log } from '../ui.js';
import { line, dot } from '../draw/primitives.js';
import { findSpot, rebuildObs } from '../world/geometry.js';
import { note } from '../journal.js';
import { newSculpture, abandon, finished as sculptureFinished } from './sculpture.js';
import { goTo, setAct, say, tick } from '../sim/core.js';

const artCap = () => clamp(Math.round(S.W * S.H / 220000), 2, 5);
const inProgress = () => S.arts.filter(a => a.progress < 1).length;

/**
 * What can be seen from the easel: everything within VIEW of it, as a list of
 * {k: kind, x, y, colours...} with positions relative to the easel, sorted back
 * to front. The painting is a miniature of this (draw/scenery.js).
 */
function lookAround(a, painter) {
  const els = [];
  const see = (k, o, extra) => {
    const x = o.x - a.x, y = o.y - a.y;
    if (Math.abs(x) < VIEW.rx && Math.abs(y) < VIEW.ry) els.push({ k, x: Math.round(x), y: Math.round(y), ...extra });
  };
  for (const t of S.trees) see('tree', t, { c: t.color });
  for (const h of S.houses) if (built(h)) see('house', h, { c: h.color, c2: h.roof, add: h.addons.slice() });
  if (built(S.tank)) see('tank', S.tank);
  for (const f of S.flowers) see('flower', f, { c: f.color });
  for (const o of S.arts) if (o !== a && o.progress >= 1) see('art', o);
  for (const o of S.critters) if (o !== painter && !o.hidden) see('critter', o, { c: o.head, c2: o.body, name: o.name });
  if (built(S.fire)) see('fire', S.fire);
  if (built(S.swing)) see('swing', S.swing);
  els.sort((p, q) => p.y - q.y);
  // water lies flat on the ground, so it goes down first
  if (built(S.pool)) see('pool', S.pool, { rx: S.pool.rx, ry: S.pool.ry });
  if (S.pond) see('pond', S.pond, { rx: S.pond.rx, ry: S.pond.ry });
  if (S.stream) {   // the stretch of stream that's in view
    const pts = S.stream.pts.map(([x, y]) => [Math.round(x - a.x), Math.round(y - a.y)]).filter(([x, y]) => Math.abs(x) < VIEW.rx * 1.6 && Math.abs(y) < VIEW.ry * 1.3);
    if (pts.length > 1 && pts.some(([x, y]) => Math.abs(x) < VIEW.rx && Math.abs(y) < VIEW.ry)) els.push({ k: 'stream', x: pts[0][0], y: Math.min(...pts.map(q => Math.abs(q[1]))), pts });
  }
  if (built(S.bridge)) {   // drawn as a plank across the stream
    const b = S.bridge, r = 30, x = b.x - a.x, y = b.y - a.y;
    if (Math.abs(x) < VIEW.rx && Math.abs(y) < VIEW.ry) els.push({ k: 'bridge', x: Math.round(x), y: Math.round(y), pts: [[x - b.nx * r, y - b.ny * r], [x + b.nx * r, y + b.ny * r]].map(q => q.map(Math.round)) });
  }
  const flat = e => e.k === 'pond' || e.k === 'pool' || e.k === 'stream' || e.k === 'bridge';
  const order = { stream: 0, pond: 0, pool: 0, bridge: 1 };
  return els.filter(flat).sort((p, q) => order[p.k] - order[q.k]).concat(els.filter(e => !flat(e)));
}
/** A few words for what a painting is mostly of: the nearest thing worth naming. */
function subjectOf(view) {
  const NAMES = { stream: 'the stream', bridge: 'the bridge', tank: 'the fish tank', pond: 'the pond', pool: 'the pool', tree: 'an apple tree', house: 'a house', swing: 'the swing set', fire: 'the campfire', art: 'someone else\'s art' };
  const far = e => e.k === 'stream' ? e.y : Math.hypot(e.x, e.y);
  const near = view.filter(e => e.k !== 'flower').sort((p, q) => far(p) - far(q))[0];
  if (!near) return view.length ? 'some flowers' : 'the meadow';
  return near.k === 'critter' ? near.name : NAMES[near.k];
}

// Not every painting is a faithful view. Having looked around, the painter
// settles on a style:
//   view      the whole scene, as it is
//   closeup   one subject filling the canvas: something nearby, a portrait of
//             anyone in town, a fish, or a recent rare event (see closeUpSubject)
//   tinted    the scene under a wash of one colour
//   abstract  no subject, just the colours of what was around: blobs, stripes, a grid or rings
const WASHES = [['blue', '#a9c8ff'], ['pink', '#ffb3d6'], ['green', '#b5e8a8'], ['gold', '#ffe08a'], ['violet', '#c9bbff']];
const CLOSE = ['tree', 'house', 'critter', 'tank', 'swing', 'fire', 'flower'];
function weighted(options) {
  let r = rand(options.reduce((s, o) => s + o[0], 0));
  for (const [w, v] of options) if ((r -= w) <= 0) return v;
  return options[0][1];
}
/**
 * Something to paint a close-up of: a thing near the easel, anyone in town
 * (a portrait, hat and all), a fish from the fish book, or whatever unusual
 * thing happened lately.
 */
function closeUpSubject(a, painter) {
  const far = e => Math.hypot(e.x, e.y), options = [];
  a.view.filter(e => CLOSE.includes(e.k)).sort((p, q) => far(p) - far(q)).slice(0, 3).forEach(e => options.push([1.5, e]));
  for (const o of S.critters) if (o !== painter) options.push([0.45, { k: 'critter', c: o.head, c2: o.body, name: o.name, hat: o.hat }]);
  for (const id of Object.keys(S.journal.fish)) options.push([0.5, { k: 'fish', id }]);
  if (S.recent && S.clock - S.recent.clock < 2.5 * DAY_LEN) options.push([4, { k: 'event', id: S.recent.id, kind: S.recent.kind }]);
  return options.length ? weighted(options) : null;
}
function chooseStyle(a, painter) {
  const r = rand(), subject = r < 0.34 && closeUpSubject(a, painter);
  a.bg = pick(BODIES.filter(c => c !== '#ffffff'));
  if (subject) { a.style = 'closeup'; a.subject = subject; a.title = titleOf(a); }   // named from the start, so a portrait always says who it's of
  else if (r < 0.52) {
    a.style = 'abstract'; a.variant = pick(['blobs', 'stripes', 'grid', 'rings']);
    const seen = [...new Set(a.view.flatMap(e => [e.c, e.c2]).filter(c => c && c !== '#ffffff'))];
    a.palette = [...seen, a.c1, a.c2, a.c3].sort(() => rand() - 0.5).slice(0, 5);
    a.name = abstractName(a, painter);
  } else if (r < 0.66 && a.view.length > 1) { a.style = 'tinted'; const w = pick(WASHES); a.tint = { name: w[0], color: w[1] }; }
  else a.style = 'view';
}
// Abstract paintings get proper titles, the way abstract paintings do.
const HUES = { '#ff6e45': 'orange', '#ff8fc7': 'pink', '#b7a6ff': 'violet', '#8fd3ff': 'blue', '#7fc4fd': 'blue', '#ffab76': 'peach', '#f5a8ff': 'lilac', '#adeb3c': 'green', '#9fe64a': 'green', '#bdee4c': 'green', '#ffe66d': 'yellow', '#ff8f8f': 'red', '#ffd6e6': 'pink', '#ee9450': 'orange' };
function abstractName(a, painter) {
  const things = ['the pond', 'apples', 'the wind', 'soup', 'a hat', 'the ball', 'Tuesday', 'rain', 'the swings', 'ducks', 'the moon', 'nothing much'];
  if (S.stream) things.push('the stream');
  const thing = pick(things), n = 1 + irand(40), hue = HUES[a.palette[0]] || 'several colours';
  return pick([
    `Composition No. ${n}`,
    `Untitled (${pick(['again', 'but pink', 'for now', 'ask me later', 'it has a title really'])})`,
    `What ${thing} was thinking`,
    `${pick(['Two', 'Three', 'Five', 'Eleven'])} feelings about ${thing}`,
    `The sound of ${thing}`,
    `Study in ${hue}`,
    `${pick(['Afternoon', 'Breakfast', 'A nap', 'Yesterday', 'The meadow'])}, ${pick(['sideways', 'from memory', 'roughly', 'if you squint', 'in a hurry'])}`,
    `Not ${thing}`,
    `${painter.name}'s mood, ${pick(['mornings', 'lately', 'on the whole'])}`,
    `${hue[0].toUpperCase() + hue.slice(1)}, then ${pick(['more of it', 'a surprise', 'a long pause', 'lunch'])}`,
    `Everything at once (small version)`,
  ]);
}
const EVENT_TITLES = { rain: 'the rainbow', star: 'the shooting star', wind: 'a windy day', ducks: 'the ducks', ring: 'a mushroom', hat: 'a very fine hat', balloon: 'some balloons', ice: 'an ice cream' };
function titleOf(a) {
  const s = a.subject;
  if (a.style === 'abstract') return a.name || 'something abstract';
  if (a.style === 'tinted') return `${subjectOf(a.view)} in ${a.tint.name}`;
  if (a.style !== 'closeup') return subjectOf(a.view);
  if (s.k === 'critter') return `a portrait of ${s.name}`;
  if (s.k === 'fish') return (SPECIES_BY_ID[s.id] || { call: 'a fish' }).call;
  if (s.k === 'event') return EVENT_TITLES[s.id === 'cart' ? s.kind : s.id] || 'something that happened';
  return s.k === 'flower' ? 'a flower, up close' : `${subjectOf([s])}, up close`;
}

function newArt(c) {
  const p = findSpot(22, 32, 25), type = rand() < 0.55 ? 'painting' : 'sculpture';
  const a = { type, x: p.x, y: p.y, seed: irand(1e6), progress: 0, by: c.name, c1: pick(PETALS), c2: pick(HEADS), c3: pick(PETALS) };
  if (type === 'sculpture') return newSculpture(c);
  else { a.style = 'view'; a.view = []; }   // filled in when the painter gets there and looks around
  return a;
}
function work(c, dt) {
  c.art.progress = clamp(1 - c.t / c.artDur, 0, 0.99);
  tick(c, dt);
}
function done(c) {
  const a = c.art;
  a.progress = 1; c.cleanup = null; c.art = null;
  c.hopV = 140; say(c, pick(['♥', 'ta-da', '!']));
  if (a.type === 'painting') a.title = titleOf(a);
  if (a.type === 'sculpture') sculptureFinished(a, c);
  else note(a.name ? `${c.name} painted an abstract and called it “${a.name}”.` : `${c.name} painted ${a.title}.`);
  const finished = S.arts.filter(o => o.progress >= 1 && o.dying === undefined && !o.keep);   // (working pieces stay for good)
  if (finished.length > artCap()) finished[0].dying = 1;
}

export const art = {
  id: 'art',
  weight: () => inProgress() < 2 ? 0.7 : 0,
  start(c) {
    const a = newArt(c);
    S.arts.push(a); rebuildObs();
    c.art = a;
    c.cleanup = () => { const i = S.arts.indexOf(a); if (i >= 0 && a.progress < 1) { S.arts.splice(i, 1); abandon(a); rebuildObs(); } };   // abandoned
    goTo(c, a.x - (a.type === 'painting' ? 35 : 29), a.y + 3, () => {
      c.dir = 1;
      if (a.type === 'painting') { a.view = lookAround(a, c); chooseStyle(a, c); }
      setAct(c, a.type === 'painting' ? 'paint' : 'sculpt', rand(12, 20)); c.artDur = c.t;
    });
  },
  states: {
    paint: { mood: 'flat',
      update: work, finish: done,
      pose(c, p) { p.hand(1, 19 + Math.sin(p.now * 5) * 4, -43 + Math.cos(p.now * 7) * 6); },
      props(c, p) {   // brush
        const tip = [p.HD[0] + 9, p.HD[1] - 3];
        line([p.HD, tip], c.seed + 6, 2, INK, 0.2); dot(tip[0], tip[1], 2.6); dot(tip[0], tip[1], 1.6, c.art.c1);
      },
    },
    sculpt: { mood: 'flat',
      update: work, finish: done,
      pose(c, p) { p.hand(1, 17 + Math.sin(p.now * 11) * 5, -40 + c.art.progress * 14); },
      props(c, p) { line([p.HD, [p.HD[0] + 9, p.HD[1] + 1]], c.seed + 6, 2.6, INK, 0.2); },   // chisel
    },
  },
};

const hung = a => a.type === 'painting' && a.progress >= 1;   // (sculptures get their own attention: see sculpture.js)

export const admire = {
  id: 'admire',
  weight: () => S.arts.some(hung) ? 0.8 : 0,
  start(c) {
    const a = pick(S.arts.filter(hung)), side = c.x < a.x ? -1 : 1;
    goTo(c, a.x + side * 32, a.y + 5, () => { c.dir = -side; setAct(c, 'admire', rand(3, 5)); say(c, pick(['♥', 'ooh', 'hm', 'wow', '?', 'nice'])); });
  },
  states: { admire: { mood: 'smile' } },
};
