// Visitors with carts. Now and then a traveller wheels a cart into town, sets
// up for a few days, and then moves on:
//   the hatmaker        every critter can pick up a hat, which they keep
//   the balloon seller  a balloon to carry about until it drifts off
//   the ice cream cart  a cone
// The cart and its owner live in S.visitor; the owner is drawn like a critter
// but isn't one of the townsfolk and is steered by hand here.
import { S, phase, dayNum } from '../state.js';
import { DAY_LEN, HEADS, BODIES, PETALS } from '../config.js';
import { rand, irand, pick } from '../util.js';
import { log } from '../ui.js';
import { findSpot, rebuildObs, inStream } from '../world/geometry.js';
import { hydrate } from '../world/town.js';
import { note } from '../journal.js';
import { goTo, setAct, say } from '../sim/core.js';
import { news, nearby, recentDream } from '../talk.js';
import { isNightOwl } from '../activities/night.js';
import { HAT_KINDS } from '../draw/cart.js';

export const CARTS = {
  hat: { who: 'hatmaker', canopy: '#b7a6ff', hat: { kind: 'top', color: '#555' }, arrive: 'A hatmaker has wheeled a cart into town.' },
  balloon: { who: 'balloon seller', canopy: '#ff8f8f', hat: { kind: 'cap', color: '#ffe66d' }, arrive: 'A balloon seller has turned up with a cart.' },
  ice: { who: 'ice cream seller', canopy: '#8fd3ff', hat: { kind: 'beanie', color: '#ff8fc7' }, arrive: 'An ice cream cart has rolled into town.' },
};
const GAP = 46;   // how far the owner stands from the cart

function makeOwner(v) {
  const o = hydrate({ name: CARTS[v.kind].who, seed: v.seed, size: 1.1, head: pick(HEADS), body: pick(BODIES), x: 0, y: v.y + 2, home: -1, hat: CARTS[v.kind].hat });
  o.dir = o.look = o.hx = v.d;
  return o;
}
/** Bring back a saved visitor (already set up and open). */
export function restoreVisitor(d) {
  if (!d || !CARTS[d.kind]) return null;
  const v = { ...d, state: 'open', canopy: CARTS[d.kind].canopy, cartX: d.x, queue: [] };
  v.owner = makeOwner(v); v.owner.x = v.x + v.d * GAP;
  return v;
}

export default {
  id: 'cart',
  can: () => !S.visitor && phase() > 0.04 && phase() < 0.45,
  start() {
    const kind = pick(Object.keys(CARTS).filter(k => k !== S.lastCart));
    S.lastCart = kind;
    // Somewhere to set up that can be reached from an edge without crossing the stream.
    let p, d;
    for (let i = 0; i < 40; i++) {
      p = findSpot(56, 44, 30); d = rand() < 0.5 ? 1 : -1;
      let dry = true;
      for (let x = d > 0 ? 0 : S.W; d > 0 ? x < p.x + 50 : x > p.x - 50; x += d * 12) if (inStream(x, p.y, 4)) { dry = false; break; }
      const lineEnd = p.x - d * 270;   // leave room for customers to line up
      if (dry && lineEnd > 30 && lineEnd < S.W - 30) break;
    }
    const v = S.visitor = { kind, seed: irand(1e6), x: p.x, y: p.y, d, state: 'arriving', until: S.clock + rand(2.4, 3.4) * DAY_LEN, canopy: CARTS[kind].canopy, queue: [] };
    v.owner = makeOwner(v);
    v.owner.x = d > 0 ? -40 : S.W + 40; v.cartX = v.owner.x - d * GAP;
    return { dur: 5 };
  },
};

/** Walk the owner (and so the cart) along by hand. Returns true once past `toX`. */
function roll(v, dt, toX) {
  const o = v.owner, step = o.speed * 0.9 * dt;
  o.act = 'walk'; o.walk = 'stroll'; o.v = o.speed * 0.9;
  o.x += v.d * step; o.phase += Math.PI * step / (2 * o.gait.stride * o.size);
  v.cartX = o.x - v.d * GAP;
  return v.d > 0 ? o.x >= toX : o.x <= toX;
}
/** Called every tick from sim/world.js. */
export function updateVisitor(dt) {
  const v = S.visitor;
  if (!v) return;
  const o = v.owner;
  o.blinkT -= dt; o.blink -= dt; if (o.blinkT <= 0) { o.blink = 0.13; o.blinkT = rand(2, 6); }
  o.y = v.y + 2;
  if (v.state === 'arriving') {
    if (roll(v, dt, v.x + v.d * GAP)) { v.state = 'open'; o.act = 'idle'; o.settle = 1; v.cartX = v.x; rebuildObs(); note(CARTS[v.kind].arrive); news({ hat: 'a hatmaker!', balloon: 'balloons!', ice: 'ice cream!' }[v.kind], nearby(v, 360)); }
  } else if (v.state === 'open') {
    o.x = v.x + v.d * GAP; v.cartX = v.x;
    const busy = S.critters.some(c => c.act === 'shop');
    o.act = busy ? 'wave' : 'idle';
    if (S.clock > v.until && !busy) { v.state = 'leaving'; rebuildObs(); note(`The ${CARTS[v.kind].who} packed up the cart and moved on.`); }
  } else if (roll(v, dt, v.d > 0 ? S.W + 120 : -120)) S.visitor = null;
}

// ---- what the critters get ----
const wants = (c, v) => (v.kind === 'hat' ? c.hatFrom !== v.seed : v.kind === 'balloon' ? !c.balloon : !(c.treatT > S.clock));

// Customers form an orderly line along the front of the cart, leading away from
// the owner. Only whoever is at the head of it is served; when they leave,
// everyone shuffles up one place.
const LINE = { max: 5, gap: 42, first: 48 };   // spacing, and how far the head of the line stands from the cart
function place(v, i) {
  const end = v.x - v.d * (LINE.first + LINE.max * LINE.gap), y = v.y + 6 + (i % 2) * 2;
  if (end > 30 && end < S.W - 30) return { x: v.x - v.d * (LINE.first + i * LINE.gap), y };
  return { x: v.x + v.d * (GAP + (i + 1) * LINE.gap), y };   // no room that side: line up past the owner instead
}
const open = v => S.visitor === v && v.state === 'open';

/** Send a critter to wherever its place in the line now is. */
function takePlace(c, v) {
  const p = place(v, v.queue.indexOf(c));
  goTo(c, p.x, p.y, () => {
    if (!open(v) || !v.queue.includes(c)) return;
    const q = place(v, v.queue.indexOf(c));
    if (Math.hypot(q.x - c.x, q.y - c.y) > 5) return takePlace(c, v);   // the line moved while we were walking
    c.dir = v.d; setAct(c, 'queue', 150);
  });
  c.cleanup = () => leave(c, v);   // (goTo doesn't clear this, but set it again to be safe)
}
function leave(c, v) {
  const i = v.queue.indexOf(c);
  if (i < 0) return;
  v.queue.splice(i, 1);
  for (const o of v.queue) if (o.act === 'queue') takePlace(o, v);   // everyone behind shuffles up
}

export const shop = {
  id: 'shop',
  weight(c) { const v = S.visitor; return v && v.state === 'open' && S.clock < v.until && v.queue.length < LINE.max && wants(c, v) ? 1.8 : 0; },
  start(c) {
    const v = S.visitor;
    v.queue.push(c);
    c.nextWalk = 'skip';
    takePlace(c, v);
  },
  states: {
    queue: {   // standing in line, arms by their sides so everyone fits
      mood: 'small',
      pose(c, p) { p.hl = [-21, -9]; p.hr = [21, -9]; },
      update(c, dt) {
        const v = S.visitor;
        if (!v || !open(v) || !v.queue.includes(c)) return void setAct(c, 'idle', 0.5);
        if (v.queue[0] === c && !S.critters.some(o => o.act === 'shop')) return void setAct(c, 'shop', rand(2.5, 4));   // our turn
        if ((c.t -= dt) <= 0) setAct(c, 'idle', 0.5);   // given up waiting
      },
    },
    shop: {    // at the front, being served
      mood: 'smile',
      pose(c, p) { p.hl = [-21, -9]; p.hr = [21, -9]; p.hand(p.d, p.d * 26, -34 + Math.sin(p.now * 5) * 3); },   // reaching for it
      finish(c) {
        const v = S.visitor;
        if (!v) return;
        leave(c, v); c.cleanup = null;
        c.hopV = 120;
        if (v.kind === 'hat') {
          // The hatmaker works to order, and what's on a critter's mind shows:
          // last night's dream, or (for night owls especially) the stars.
          const dream = recentDream(c), dreamHat = dream && { apple: 'apple', fish: 'fishhat', fly: 'cloud' }[dream.id];
          const starry = isNightOwl(c) ? 0.75 : Object.keys(S.journal.sky).length ? 0.15 : 0;
          const kind = dreamHat && rand() < 0.75 ? dreamHat : rand() < starry ? 'wizard' : pick(HAT_KINDS);
          c.hat = { kind, color: pick(PETALS) }; c.hatFrom = v.seed;
          say(c, '♥');
          log(kind === dreamHat ? `${c.name} described a dream to the hatmaker and got a hat to match.` : kind === 'wizard' ? `${c.name} got a hat covered in stars.` : `${c.name} got a new hat.`);
        } else if (v.kind === 'balloon') {
          c.balloon = { color: pick(PETALS), seed: irand(1000), until: S.clock + rand(0.5, 1.1) * DAY_LEN };
          say(c, '♥'); log(`${c.name} got a balloon.`);
        } else {
          c.treat = pick(['#ff8fc7', '#fff3b0', '#b7f0c0', '#c9a27a']); c.treatT = S.clock + DAY_LEN * 0.6;
          setAct(c, 'eat', 4); say(c, 'yum');
          return true;
        }
      },
    },
  },
};

/** "The hatmaker. Here until day 12." */
export const about = v => `The ${CARTS[v.kind].who}'s cart${v.state === 'open' ? `. Here until about day ${dayNum() + Math.max(0, Math.ceil((v.until - S.clock) / DAY_LEN))}.` : '.'}`;
