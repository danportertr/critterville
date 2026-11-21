// The critter brain.
//
// A critter is always in exactly one *state* (c.act): 'idle', 'walk', 'fish'...
// A state is a small object of optional hooks:
//   update(c, dt)   run each tick instead of the default countdown of c.t
//   finish(c)       the countdown ran out; return true if you set the next state yourself
//   pose(c, p)      adjust the drawn pose          (see draw/critter.js)
//   props(c, p)     draw held things, in critter-local coordinates
//   transform(c)    take over where/how the critter is drawn; return true
//   after(c)        draw on top afterwards, in world coordinates
//
// An *activity* (src/activities/*.js) is something a critter can decide to do:
//   { id, weight(c), start(c), states: {...} }
// weight() says how appealing it is right now (0 = not possible) and start()
// sends the critter off, usually with goTo(...) and then setAct(...).
import { S, isNight, built } from '../state.js';
import { rand, dist } from '../util.js';
import { inEllipse } from '../world/geometry.js';

export const STATES = {};
export const ACT = {};
const list = [];

export function register(activity) {
  ACT[activity.id] = activity;
  list.push(activity);
  Object.assign(STATES, activity.states);
}

export function say(c, text, t = 1.5) { c.bubble = { text, t }; }
export function setAct(c, act, t) { c.act = act; c.t = t; }
export function goTo(c, x, y, then) { c.act = 'walk'; c.tx = x; c.ty = y; c.then = then || null; c.walkT = 0; }
/** Can we interrupt this critter without breaking something it's in the middle of? */
export const isFree = c => !c.hidden && !c.partner && (c.act === 'idle' || (c.act === 'walk' && !c.then));

/** Let go of anything the critter had reserved (a snack, a chat partner, a swing seat...). */
export function release(c) {
  if (c.apple) { if (c.apple.claimed === c) c.apple.claimed = null; c.apple = null; }
  const p = c.partner;
  if (p) {
    c.partner = null;
    if (p.partner === c) { p.partner = null; if (p.act === 'chat' || p.act === 'wait') setAct(p, 'idle', rand(0.5, 2)); }
  }
  if (c.cleanup) { const f = c.cleanup; c.cleanup = null; f(); }
}

export const tick = (c, dt) => { if ((c.t -= dt) <= 0) finish(c); };

export function finish(c) {
  if (c.act === 'idle') return choose(c);
  const st = STATES[c.act];
  if (st && st.finish && st.finish(c) === true) return;
  setAct(c, 'idle', rand(0.6, 2.6));
}

/** Pick the next thing to do. */
export function choose(c) {
  release(c);
  if (isNight()) return c.owl && built(S.fire) ? ACT.campfire.startOwl(c) : ACT.sleep.start(c);
  const snack = S.apples.filter(a => !a.claimed && !a.eaten && dist(a, c) < 450).sort((a, b) => dist(a, c) - dist(b, c))[0];
  if (snack) return ACT.snack.fetch(c, snack);

  const opts = [];
  let total = 0;
  for (const a of list) { const w = a.weight ? a.weight(c) : 0; if (w > 0) { opts.push([w, a]); total += w; } }
  let r = rand(total);
  for (const [w, a] of opts) {
    if ((r -= w) > 0) continue;
    if (a.start(c) !== false) return;
    break;
  }
  ACT.wander.start(c);
}

/** One step towards (c.tx, c.ty), sliding around obstacles. True on arrival. */
export function step(c, dt, speed = c.speed) {
  const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy), sp = speed * dt;
  if (d <= Math.max(3, sp)) { c.x = c.tx; c.y = c.ty; return true; }
  let nx = c.x + dx / d * sp, ny = c.y + dy / d * sp;
  for (const o of S.obs) {
    if (!inEllipse(nx, ny, o) || inEllipse(c.tx, c.ty, o)) continue;
    const ex = (nx - o.x) / o.rx, ey = (ny - o.y) / o.ry, k = 1 / Math.sqrt(ex * ex + ey * ey || 1e-6);
    const tx = -ey * k * o.rx, ty = ex * k * o.ry, tl = Math.hypot(tx, ty) || 1, along = tx * dx + ty * dy;
    const sgn = Math.abs(along) < 0.01 * d ? (c.seed & 1 ? 1 : -1) : Math.sign(along);
    nx = o.x + ex * k * o.rx + tx / tl * sgn * sp * 0.9;
    ny = o.y + ey * k * o.ry + ty / tl * sgn * sp * 0.9;
  }
  if (Math.abs(dx) > 3) c.dir = dx > 0 ? 1 : -1;
  c.x = nx; c.y = ny;
  return false;
}

// ---- states every critter has, whatever it's up to ----
Object.assign(STATES, {
  idle: {},
  wait: {},     // standing still because someone is coming over to chat
  walk: {
    update(c, dt) {
      c.phase += dt * c.speed * 0.24;
      if (step(c, dt)) { const f = c.then; c.then = null; setAct(c, 'idle', rand(0.4, 1.4)); if (f) f(); }
      else if ((c.walkT += dt) > 60) { c.then = null; setAct(c, 'idle', 1); }   // stuck: give up
    },
    pose(c, p) {
      // One foot lifts and swings forward while the other pushes back; arms swing opposite.
      const sn = Math.sin(c.phase), cs = Math.cos(c.phase);
      p.rock = sn * 0.06; p.bob = Math.abs(cs) * 2;
      p.lf = Math.max(0, sn) * 6; p.rf = Math.max(0, -sn) * 6;
      p.lx = cs * 4.5 * p.d; p.rx = -cs * 4.5 * p.d;
      p.hl = [-31 - cs * 4 * p.d, -15 - sn * 5]; p.hr = [31 - cs * 4 * p.d, -15 + sn * 5];
    },
  },
  wave: { pose(c, p) { p.hr = [30 + Math.sin(p.now * 14) * 5, -57]; } },
});

export function updateCritter(c, dt) {
  if (c.hopV || c.hopY) { c.hopY += c.hopV * dt; c.hopV -= 700 * dt; if (c.hopY <= 0) { c.hopY = 0; c.hopV = 0; } }
  c.blinkT -= dt; c.blink -= dt;
  if (c.blinkT <= 0) { c.blink = 0.13; c.blinkT = rand(2, 6); }
  if (c.bubble && (c.bubble.t -= dt) <= 0) c.bubble = null;
  const st = STATES[c.act];
  if (st && st.update) st.update(c, dt); else tick(c, dt);
}
