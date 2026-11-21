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
import { BRIDGE } from '../config.js';
import { inEllipse, inStream, onBridge, bankSide } from '../world/geometry.js';

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
export function goTo(c, x, y, then) { c.act = 'walk'; c.tx = x; c.ty = y; c.then = then || null; c.walkT = 0; c.path = null; c.jump = null; }
// (c.carry, if set, is a function that draws whatever the critter is carrying as it walks.)
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
  c.carry = null;
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

/**
 * The stream is in the way. Critters don't wade: if there's a bridge within a
 * sensible detour they go round by it (c.path), otherwise they take a run at it
 * and jump (c.jump). Returns true if it started either.
 */
function crossStream(c, wx, wy) {
  const dx = wx - c.x, dy = wy - c.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  if (inStream(c.x, c.y) || !inStream(c.x + ux * 9, c.y + uy * 9) || onBridge(c.x + ux * 9, c.y + uy * 9)) return false;
  const b = S.bridge;
  if (b && b.progress >= 1 && !c.path) {
    const side = bankSide(c.x, c.y), near = b.ends.find(e => bankSide(e.x, e.y) === side), far = b.ends.find(e => e !== near);
    if (near && far && dist(c, near) < BRIDGE.detour) { c.path = [near, far]; return true; }
  }
  let k = 9;
  while (k < 170 && inStream(c.x + ux * k, c.y + uy * k, 3)) k += 4;   // find the far bank along our heading
  c.jump = { x0: c.x, y0: c.y, x1: c.x + ux * (k + 7), y1: c.y + uy * (k + 7), t: 0, dur: 0.45 + k * 0.004 };
  return true;
}

// ---- states every critter has, whatever it's up to ----
Object.assign(STATES, {
  idle: {},
  wait: {},     // standing still because someone is coming over to chat
  walk: {
    update(c, dt) {
      const j = c.jump;
      if (j) {   // mid-leap over the stream
        j.t = Math.min(1, j.t + dt / j.dur);
        c.x = j.x0 + (j.x1 - j.x0) * j.t; c.y = j.y0 + (j.y1 - j.y0) * j.t;
        c.hopY = Math.sin(j.t * Math.PI) * 26; c.hopV = 0;
        if (j.t >= 1) { c.jump = null; c.hopY = 0; }
        return;
      }
      c.phase += dt * c.speed * 0.24;
      const wp = c.path && c.path[0];
      if (crossStream(c, wp ? wp.x : c.tx, wp ? wp.y : c.ty)) return;
      if (wp) {   // heading for a waypoint (the bridge) on the way to the real target
        const tx = c.tx, ty = c.ty;
        c.tx = wp.x; c.ty = wp.y;
        if (step(c, dt)) c.path.shift();
        c.tx = tx; c.ty = ty;
        return;
      }
      if (step(c, dt)) { const f = c.then; c.then = null; setAct(c, 'idle', rand(0.4, 1.4)); if (f) f(); }
      else if ((c.walkT += dt) > 60) { c.then = null; setAct(c, 'idle', 1); }   // stuck: give up
    },
    pose(c, p) {
      if (c.jump) {   // arms up, knees up
        const a = Math.sin(c.jump.t * Math.PI);
        p.bob = a * 2; p.lf = p.rf = a * 6; p.lx = -3 * a; p.rx = 3 * a;
        p.hl = [-30, -30 - a * 26]; p.hr = [30, -30 - a * 26];
        return;
      }
      // One foot lifts and swings forward while the other pushes back; arms swing opposite.
      const sn = Math.sin(c.phase), cs = Math.cos(c.phase);
      p.rock = sn * 0.06; p.bob = Math.abs(cs) * 2;
      p.lf = Math.max(0, sn) * 6; p.rf = Math.max(0, -sn) * 6;
      p.lx = cs * 4.5 * p.d; p.rx = -cs * 4.5 * p.d;
      p.hl = [-31 - cs * 4 * p.d, -15 - sn * 5]; p.hr = [31 - cs * 4 * p.d, -15 + sn * 5];
      if (c.carry) p.hr = [27, -40];   // holding something up
    },
    props(c, p) { if (c.carry && !c.jump) c.carry(c, p);
    },
  },
  wave: { pose(c, p) { p.hr = [30 + Math.sin(p.now * 14) * 5, -57]; } },
});

export function updateCritter(c, dt) {
  if (!c.jump && (c.hopV || c.hopY)) { c.hopY += c.hopV * dt; c.hopV -= 700 * dt; if (c.hopY <= 0) { c.hopY = 0; c.hopV = 0; } }
  c.blinkT -= dt; c.blink -= dt;
  if (c.blinkT <= 0) { c.blink = 0.13; c.blinkT = rand(2, 6); }
  if (c.bubble && (c.bubble.t -= dt) <= 0) c.bubble = null;
  const st = STATES[c.act];
  if (st && st.update) st.update(c, dt); else tick(c, dt);
}
