// The few things you can do: say hi to a critter, ask a house who lives
// there, or drop a snack.
import { S } from './state.js';
import { HOUSE } from './config.js';
import { wallTop } from './draw/scenery.js';
import { irand, dist } from './util.js';
import { cv } from './draw/canvas.js';
import { hideHint, log } from './ui.js';
import { startDiary } from './journal.js';
import { inEllipse, inStream, rebuildObs } from './world/geometry.js';
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

function houseAt(p) {
  let best = null;
  for (const h of S.houses) {
    if (h.progress < 1) continue;
    const k = HOUSE.scale, left = (h.addons.includes('annex') ? 92 : 62) * k, top = (wallTop(h) + HOUSE.roof) * k;
    if (p.x > h.x - left && p.x < h.x + 62 * k && p.y > h.y - top && p.y < h.y + 4 && (!best || h.y > best.y)) best = h;
  }
  return best;
}
/** "Mo, Pip and Zu live here." */
function whoLivesIn(h) {
  const names = S.critters.filter(c => c.home === h).map(c => c.name);
  if (!names.length) return 'Nobody lives here yet.';
  if (names.length === 1) return `${names[0]} lives here.`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} live here.`;
}

cv.addEventListener('pointerdown', e => {
  const p = toWorld(e), c = critterAt(p);
  hideHint();
  if (c) {
    say(c, c.name, 2); c.surprise = 0.5;
    if (c.act !== 'swing' && c.act !== 'swim') c.hopV = 170;
    if (isFree(c)) setAct(c, 'wave', 1.6);
    return;
  }
  const h = houseAt(p);
  if (h) {
    S.sign = { x: h.x, y: h.y - (wallTop(h) + HOUSE.roof) * HOUSE.scale - 6, text: whoLivesIn(h), until: S.now + 4 };
    return;
  }
  if ((S.pond && inEllipse(p.x, p.y, S.pond)) || inStream(p.x, p.y) || (S.pool && inEllipse(p.x, p.y, S.pool, 10)) || p.y < 60 || S.apples.length >= 6) return;
  const a = { x: p.x, y: p.y, z: 60, vz: 0, seed: irand(1e6), claimed: null, eaten: false };
  S.apples.push(a);
  const near = S.critters.filter(c => isFree(c) && !c.apple).sort((x, y) => dist(x, a) - dist(y, a))[0];
  if (near && dist(near, a) < 500) { ACT.snack.fetch(near, a); say(near, '!', 0.9); }
});
cv.addEventListener('pointermove', e => { const p = toWorld(e); cv.style.cursor = critterAt(p) || houseAt(p) ? 'pointer' : 'default'; });

// "new town" asks for a second tap instead of using a confirm() dialog,
// which embedded browsers tend to block.
const $reset = document.getElementById('reset');
let armed = null;
function disarm() { clearTimeout(armed); armed = null; $reset.textContent = 'new town'; $reset.classList.remove('armed'); }
$reset.addEventListener('click', () => {
  if (!armed) {
    $reset.textContent = 'start over?'; $reset.classList.add('armed');
    armed = setTimeout(disarm, 3500);
    return;
  }
  disarm();
  newTown(); rebuildObs(); save(); refreshStats(); log('A brand new meadow.');
  startDiary();
});
