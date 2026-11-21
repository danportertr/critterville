// A cairn by the water. Nobody makes it exactly: somebody puts one stone on
// another, and after that anyone who feels like it adds to the pile. (A windy
// spell can take the top off: see activities/sculpture.js.)
import { S } from '../state.js';
import { STREAM_HALF } from '../config.js';
import { rand, irand, pick } from '../util.js';
import { rebuildObs, streamPoint } from '../world/geometry.js';
import { note } from '../journal.js';
import { goTo, setAct, say } from '../sim/core.js';

const TALLEST = 10;

function start() {
  let p;
  if (S.stream) { const q = streamPoint(rand(0.25, 0.75)), side = rand() < 0.5 ? -1 : 1; p = { x: q.x + q.nx * side * (STREAM_HALF + 20), y: q.y + q.ny * side * (STREAM_HALF + 20) }; }
  else { const a = rand(0.2, 0.8) * Math.PI; p = { x: S.pond.x + Math.cos(a) * (S.pond.rx + 22), y: S.pond.y + Math.sin(a) * (S.pond.ry + 18) }; }
  const c = { x: p.x, y: p.y, seed: irand(1e6), n: 0 };
  S.cairns.push(c);
  return c;
}

export default {
  id: 'cairn',
  weight: () => (S.pond || S.stream) && (!S.cairns.length || S.cairns.some(c => c.n < TALLEST)) ? 0.5 : 0,
  start(c) {
    const pile = S.cairns.find(k => k.n < TALLEST) || start(), side = c.x < pile.x ? -1 : 1;
    goTo(c, pile.x + side * 17, pile.y + 3, () => { c.dir = -side; c.pile = pile; setAct(c, 'stack', 2.6); });
  },
  states: {
    stack: {
      mood: 'flat',
      finish(c) {
        const pile = c.pile;
        if (!pile || pile.n >= TALLEST) return;
        pile.n++;
        if (pile.n === 1) { rebuildObs(); note(`${c.name} balanced one stone on another by the water.`); }
        else if (pile.n === 6) note('The pile of stones by the water is getting tall. Everyone seems to add to it.');
        else if (pile.n === TALLEST) { say(c, pick(['!', 'tall'])); c.hopV = 100; }
      },
      pose(c, p) { p.bob = -5; p.hand(p.d, p.d * 17, -14 - (c.pile ? c.pile.n * 4 : 0) + Math.sin(p.now * 6) * 1.5); },   // reaching to the top of the pile
    },
  },
};
