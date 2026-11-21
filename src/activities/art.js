// Make a painting or a sculpture. Finished pieces stay around town as a
// little open-air gallery (oldest ones fade once there are too many), and
// other critters wander over to admire them.
import { S } from '../state.js';
import { INK, HEADS, BODIES, PETALS, GREENS } from '../config.js';
import { clamp, rand, irand, pick } from '../util.js';
import { log } from '../ui.js';
import { line, dot } from '../draw/primitives.js';
import { findSpot, rebuildObs } from '../world/geometry.js';
import { goTo, setAct, say, tick } from '../sim/core.js';

const artCap = () => clamp(Math.round(S.W * S.H / 150000), 2, 7);
const inProgress = () => S.arts.filter(a => a.progress < 1).length;

function newArt(c) {
  const p = findSpot(22, 32, 25), type = rand() < 0.55 ? 'painting' : 'sculpture';
  const a = { type, x: p.x, y: p.y, seed: irand(1e6), progress: 0, by: c.name, c1: pick(PETALS), c2: pick(BODIES), c3: pick(BODIES) };
  if (type === 'sculpture') { a.style = pick(['critter', 'totem', 'arch']); a.c2 = pick(HEADS); a.c3 = pick(PETALS); }
  else {
    a.style = pick(['portrait', 'landscape', 'abstract']);
    if (a.style === 'portrait') { const m = pick(S.critters); a.c1 = m.head; a.c2 = m.body; a.of = m === c ? 'a self-portrait' : `a portrait of ${m.name}`; }
    if (a.style === 'landscape') { a.c1 = pick(GREENS); a.c2 = pick(GREENS); }
  }
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
  log(a.type === 'sculpture' ? `${c.name} finished a sculpture.` : `${c.name} painted ${a.of || (a.style === 'landscape' ? 'a landscape' : 'something abstract')}.`);
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
    goTo(c, a.x - 29, a.y + 3, () => {
      c.dir = 1;
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
