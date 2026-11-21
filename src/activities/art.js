// Make a painting or a sculpture. A painting shows what the painter can see
// from the easel: the trees, water, houses and critters around it. Finished pieces stay around town as a
// little open-air gallery (oldest ones fade once there are too many), and
// other critters wander over to admire them.
import { S, built } from '../state.js';
import { INK, VIEW, HEADS, PETALS } from '../config.js';
import { clamp, rand, irand, pick } from '../util.js';
import { log } from '../ui.js';
import { line, dot } from '../draw/primitives.js';
import { findSpot, rebuildObs } from '../world/geometry.js';
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
  for (const h of S.houses) if (built(h)) see('house', h, { c: h.color, c2: h.roof });
  for (const f of S.flowers) see('flower', f, { c: f.color });
  for (const o of S.arts) if (o !== a && o.progress >= 1) see('art', o);
  for (const o of S.critters) if (o !== painter && !o.hidden) see('critter', o, { c: o.head, c2: o.body, name: o.name });
  if (built(S.fire)) see('fire', S.fire);
  if (built(S.swing)) see('swing', S.swing);
  els.sort((p, q) => p.y - q.y);
  // water lies flat on the ground, so it goes down first
  if (built(S.pool)) see('pool', S.pool, { rx: S.pool.rx, ry: S.pool.ry });
  see('pond', S.pond, { rx: S.pond.rx, ry: S.pond.ry });
  return els.filter(e => e.k === 'pond' || e.k === 'pool').concat(els.filter(e => e.k !== 'pond' && e.k !== 'pool'));
}
/** A few words for what a painting is mostly of: the nearest thing worth naming. */
function subjectOf(view) {
  const NAMES = { pond: 'the pond', pool: 'the pool', tree: 'an apple tree', house: 'a house', swing: 'the swing set', fire: 'the campfire', art: 'someone else\'s art' };
  const near = view.filter(e => e.k !== 'flower').sort((p, q) => Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y))[0];
  if (!near) return view.length ? 'some flowers' : 'the meadow';
  return near.k === 'critter' ? near.name : NAMES[near.k];
}

function newArt(c) {
  const p = findSpot(22, 32, 25), type = rand() < 0.55 ? 'painting' : 'sculpture';
  const a = { type, x: p.x, y: p.y, seed: irand(1e6), progress: 0, by: c.name, c1: pick(PETALS), c2: pick(HEADS), c3: pick(PETALS) };
  if (type === 'sculpture') a.style = pick(['critter', 'totem', 'arch']);
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
  log(a.type === 'sculpture' ? `${c.name} finished a sculpture.` : `${c.name} painted ${subjectOf(a.view)}.`);
  const finished = S.arts.filter(o => o.progress >= 1 && o.dying === undefined);
  if (finished.length > artCap()) finished[0].dying = 1;
}

export const art = {
  id: 'art',
  weight: () => inProgress() < 2 ? 0.7 : 0,
  start(c) {
    const a = newArt(c);
    S.arts.push(a); rebuildObs();
    c.art = a;
    c.cleanup = () => { const i = S.arts.indexOf(a); if (i >= 0 && a.progress < 1) { S.arts.splice(i, 1); rebuildObs(); } };   // abandoned
    goTo(c, a.x - (a.type === 'painting' ? 35 : 29), a.y + 3, () => {
      c.dir = 1;
      if (a.type === 'painting') a.view = lookAround(a, c);
      setAct(c, a.type === 'painting' ? 'paint' : 'sculpt', rand(12, 20)); c.artDur = c.t;
    });
  },
  states: {
    paint: {
      update: work, finish: done,
      pose(c, p) { p.hand(1, 19 + Math.sin(p.now * 5) * 4, -43 + Math.cos(p.now * 7) * 6); },
      props(c, p) {   // brush
        const tip = [p.HD[0] + 9, p.HD[1] - 3];
        line([p.HD, tip], c.seed + 6, 2, INK, 0.2); dot(tip[0], tip[1], 2.6); dot(tip[0], tip[1], 1.6, c.art.c1);
      },
    },
    sculpt: {
      update: work, finish: done,
      pose(c, p) { p.hand(1, 17 + Math.sin(p.now * 11) * 5, -40 + c.art.progress * 14); },
      props(c, p) { line([p.HD, [p.HD[0] + 9, p.HD[1] + 1]], c.seed + 6, 2.6, INK, 0.2); },   // chisel
    },
  },
};

export const admire = {
  id: 'admire',
  weight: () => S.arts.some(a => a.progress >= 1) ? 0.8 : 0,
  start(c) {
    const a = pick(S.arts.filter(a => a.progress >= 1)), side = c.x < a.x ? -1 : 1;
    goTo(c, a.x + side * 32, a.y + 5, () => { c.dir = -side; setAct(c, 'admire', rand(3, 5)); say(c, pick(['♥', 'ooh', 'hm', 'wow', '?', 'nice'])); });
  },
  states: { admire: {} },
};
