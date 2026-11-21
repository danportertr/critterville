// The only two things you can do: say hi to a critter, or drop a snack.
import { S } from './state.js';
import { irand, dist } from './util.js';
import { cv } from './draw/canvas.js';
import { hideHint, log } from './ui.js';
import { inEllipse } from './world/geometry.js';
import { newTown } from './world/town.js';
import { save } from './world/save.js';
import { ACT, say, setAct, isFree } from './sim/core.js';
import { refreshStats } from './sim/world.js';

const toWorld = e => ({ x: e.clientX / S.zoom, y: e.clientY / S.zoom });

function critterAt(p) {
  let best = null;
  for (const c of S.critters) {
    if (c.hidden) continue;
    const y = c.y + (c.sink || 0);
    if (Math.abs(p.x - c.x) < 26 * c.size && p.y > y - 84 * c.size - c.hopY && p.y < y + 6 && (!best || c.y > best.y)) best = c;
  }
  return best;
}

cv.addEventListener('pointerdown', e => {
  const p = toWorld(e), c = critterAt(p);
  hideHint();
  if (c) {
    say(c, c.name, 2);
    if (c.act !== 'swing' && c.act !== 'swim') c.hopV = 170;
    if (isFree(c)) setAct(c, 'wave', 1.6);
    return;
  }
  if (inEllipse(p.x, p.y, S.pond) || inEllipse(p.x, p.y, S.pool, 10) || p.y < 60 || S.apples.length >= 6) return;
  const a = { x: p.x, y: p.y, z: 60, vz: 0, seed: irand(1e6), claimed: null, eaten: false };
  S.apples.push(a);
  const near = S.critters.filter(c => isFree(c) && !c.apple).sort((x, y) => dist(x, a) - dist(y, a))[0];
  if (near && dist(near, a) < 500) { ACT.snack.fetch(near, a); say(near, '!', 0.9); }
});
cv.addEventListener('pointermove', e => { cv.style.cursor = critterAt(toWorld(e)) ? 'pointer' : 'default'; });

document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Start over with a brand new town?')) return;
  newTown(); save(); refreshStats(); log('A brand new town!');
});
