// The few things you can do: say hi to a critter, ask a house who lives
// there, or drop a snack.
import { S } from './state.js';
import { HOUSE } from './config.js';
import { wallTop } from './draw/scenery.js';
import { irand, dist } from './util.js';
import { cv } from './draw/canvas.js';
import { hideHint, log } from './ui.js';
import { startDiary } from './journal.js';
import { about as aboutCart } from './events/cart.js';
import { label as sculptureLabel } from './activities/sculpture.js';
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

function artAt(p) {
  let best = null;
  for (const a of S.arts) if (a.progress >= 1 && a.dying === undefined && Math.abs(p.x - a.x) < 26 && p.y > a.y - 72 && p.y < a.y + 4 && (!best || a.y > best.y)) best = a;
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
  if (S.viewing && S.now < S.viewing.until) { S.viewing = null; return; }   // tap anywhere to put the painting down
  if (c) {
    say(c, c.name, 2); c.surprise = 0.5;
    if (c.act !== 'swing' && c.act !== 'swim') c.hopV = 170;
    if (isFree(c)) setAct(c, 'wave', 1.6);
    return;
  }
  const v = S.visitor;
  if (v && Math.abs(p.x - v.cartX) < 42 && p.y > v.y - 90 && p.y < v.y + 4) { S.sign = { x: v.cartX, y: v.y - 100, text: aboutCart(v), until: S.now + 4 }; return; }
  const art = artAt(p);
  if (art) {
    if (art.type === 'painting') { S.viewing = { art, until: S.now + 8 }; S.sign = null; }
    else S.sign = { x: art.x, y: art.y - 74, text: sculptureLabel(art), until: S.now + 4 };
    return;
  }
  const mon = S.monument;
  if (mon && Math.abs(p.x - mon.x) < 62 && p.y > mon.y - (mon.form === 'giant' ? 170 : 60) && p.y < mon.y + 24) {
    S.sign = { x: mon.x, y: mon.y - (mon.form === 'giant' ? 180 : 70), text: mon.progress < 1 ? `The town's monument, about ${Math.round(mon.progress * 100)}% done.` : "The town's monument. Everybody helped.", until: S.now + 4 };
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
cv.addEventListener('pointermove', e => { const p = toWorld(e); cv.style.cursor = critterAt(p) || artAt(p) || houseAt(p) ? 'pointer' : 'default'; });

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
