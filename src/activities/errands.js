// Small errands that other happenings set up:
//   a hat the wind took, to be found and carried back to its owner
//   a postcard to read
//   a picnic to join
//   a rumour about something in the water, to go and look into
import { S } from '../state.js';
import { STREAM_HALF, INK } from '../config.js';
import { TAU, rand, pick, dist } from '../util.js';
import { box, line } from '../draw/primitives.js';
import { drawHat } from '../draw/cart.js';
import { ctx } from '../draw/canvas.js';
import { streamPoint } from '../world/geometry.js';
import { note } from '../journal.js';
import { news, bond } from '../talk.js';
import { goTo, setAct, say, isFree } from '../sim/core.js';

// ---- lost and found ----
function carryBack(c, h, tries = 0) {
  const owner = S.critters.find(o => o.name === h.owner);
  if (!owner) {                      // they've left town: finders keepers
    if (!c.hat) c.hat = h.hat;
    S.lostHat = null; c.carry = null; c.cleanup = null;
    return;
  }
  goTo(c, owner.x + (c.x < owner.x ? -34 : 34), owner.y + 2, () => {
    if (S.lostHat !== h) return;
    if (owner.hidden || dist(c, owner) > 70) {
      if (tries < 5) return carryBack(c, h, tries + 1);   // they moved, or they're indoors: try again
      return;                                             // give up for now (cleanup puts the hat down here)
    }
    owner.hat = h.hat; S.lostHat = null; c.carry = null; c.cleanup = null;
    c.dir = owner.x > c.x ? 1 : -1;
    say(c, 'yours?', 1.6); say(owner, '♥', 2); owner.hopV = 130; owner.surprise = 0.6;
    setAct(c, 'idle', 2);
    bond(c, owner, 2);
    note(`${c.name} found ${owner.name}'s hat and brought it back.`);
    news(`${c.name} found the hat`, [c, owner]);
  });
  c.carry = (c, p) => { ctx.save(); ctx.translate(p.HR[0], p.HR[1] - 3); ctx.scale(0.7, 0.7); drawHat(h.hat, 1, c.seed + 8); ctx.restore(); };
  c.cleanup = () => { if (S.lostHat === h) { h.taken = null; h.held = false; h.x = c.x; h.y = c.y + 4; } };
}
export const findHat = {
  id: 'findHat',
  weight: c => S.lostHat && !S.lostHat.taken && !(S.lostHat.fly > 0) && c.name !== S.lostHat.owner ? 1.7 : 0,
  start(c) {
    const h = S.lostHat;
    h.taken = c.name;
    c.cleanup = () => { h.taken = null; };
    goTo(c, h.x - 8, h.y, () => { if (S.lostHat !== h) return; h.held = true; say(c, pick(['a hat!', 'whose?', 'oh!']), 1.4); carryBack(c, h); });
  },
};

// ---- postcards ----
/** Deliver any postcard that's due. Called every tick from sim/world.js. */
export function deliverMail() {
  const m = S.mail.find(m => S.clock > m.due);
  if (!m) return;
  const to = [S.critters.find(c => c.name === m.to), ...S.critters].find(c => c && isFree(c));
  if (!to) return;                   // nobody's free to read it just now
  S.mail.splice(S.mail.indexOf(m), 1);
  setAct(to, 'read', 5.5); say(to, 'a postcard!', 1.8); to.hopV = 90;
  note(`A postcard came from ${m.from}: “${m.line}”`);
  news(`a postcard from ${m.from}`, [to]);
}

// ---- picnics ----
export function joinPicnic(c) {
  const p = S.picnic, a = rand(TAU);
  goTo(c, p.x + Math.cos(a) * rand(64, 80), p.y + Math.sin(a) * rand(26, 36), () => {   // round the edge of the blanket, not on it
    if (S.picnic !== p) return;
    c.dir = p.x > c.x ? 1 : -1;
    setAct(c, 'eat', Math.min(rand(7, 14), Math.max(2, p.until - S.clock)));
    if (rand() < 0.4) say(c, pick(['yum', 'pass the apples', '♥', 'more?']), 1.4);
  });
}
export const picnicking = {
  id: 'picnicking',
  weight: () => S.picnic && S.picnic.until - S.clock > 8 ? 3.5 : 0,
  start: joinPicnic,
};

// ---- the thing in the water ----
export const investigate = {
  id: 'investigate',
  weight: c => S.rumour && c.knows && c.knows[S.rumour.newsId] ? 1.5 : 0,   // only if they've heard
  start(c) {
    let x, y;
    if (S.rumour.water === 'pond' && S.pond) { const a = rand(TAU); x = S.pond.x + Math.cos(a) * (S.pond.rx + 20); y = S.pond.y + Math.sin(a) * (S.pond.ry + 15); }
    else if (S.stream) { const p = streamPoint(rand(0.25, 0.75)), k = rand() < 0.5 ? -1 : 1; x = p.x + p.nx * k * (STREAM_HALF + 16); y = p.y + p.ny * k * (STREAM_HALF + 16); }
    else return false;
    goTo(c, x, y, () => { setAct(c, 'admire', rand(4, 7)); say(c, pick(['where?', '?', 'I saw it!', 'hm', 'nothing']), 1.6); });
  },
  states: {
    read: {   // holding a postcard up close
      mood: 'smile',
      pose(c, p) { p.hand(p.d, p.d * 13, -38); },
      props(c, p) { const [x, y] = p.HD; box([[x - 5, y - 9], [x + 6, y - 10], [x + 6, y - 2], [x - 5, y - 1]], '#fff', c.seed + 6, 0.3, 1.8); line([[x - 3, y - 6], [x + 3, y - 6.5]], c.seed + 7, 1, INK, 0.1); },
    },
  },
};
