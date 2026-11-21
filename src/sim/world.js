// Everything that happens on its own: the clock, the ball, growing things, new arrivals.
import { S, phase, dayNum, isNight, built } from '../state.js';
import { clamp, rand, hash } from '../util.js';
import { HOUSE, SWING } from '../config.js';
import { log, setStats } from '../ui.js';
import { note } from '../journal.js';
import { inEllipse, rebuildObs, freePoint, topEdge } from '../world/geometry.js';
import { newHouse, newCritter, assignHomes, planFire, planPool, planSwing, planBridge, planAddon, planTank, planMonument, makeBall } from '../world/town.js';
import { save } from '../world/save.js';
import { updateCritter, goTo, setAct, say } from './core.js';
import { updateEvents } from '../events/index.js';
import { updateRings } from '../events/ring.js';
import { updateVisitor } from '../events/cart.js';
import { updateSculptures } from '../activities/sculpture.js';
import { updateJourneys } from '../events/journeys.js';
import { updateTalk, news, nearby, anyone } from '../talk.js';
import { deliverMail } from '../activities/errands.js';
import { settleRumour } from '../events/rumour.js';
import { updateTheatre } from '../events/theatre.js';
import { updatePuffs } from '../puffs.js';
import { updateMusic } from '../activities/music.js';
import { updateShots } from '../activities/prank.js';
import { DAY_LEN } from '../config.js';
import { planHammock, between, shape as hangHammock } from '../activities/hammock.js';

let lastPhase = null, townT = 0, arriveT = 45, saveT = 15, nextAddon = 0;

export function refreshStats() {
  // No scores: this isn't a game about getting more of anything.
  const p = phase();
  setStats(`day ${dayNum()} · ${p < 0.3 ? 'morning' : p < 0.6 ? 'afternoon' : p < 0.72 ? 'evening' : p < 0.96 ? 'night' : 'dawn'}`);
}

function updateBall(dt) {
  const b = S.ball;
  if (!b || b.roof != null || !(b.vx || b.vy || b.z > 0)) return;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= 600 * dt;
  b.spin += b.vx * dt * 0.08;
  if (b.z <= 0) { b.z = 0; b.vz = b.vz < -60 ? -b.vz * 0.5 : 0; const f = Math.pow(0.12, dt); b.vx *= f; b.vy *= f; }
  if (b.x < 16 || b.x > S.W - 16) { b.vx *= -0.8; b.x = clamp(b.x, 16, S.W - 16); }
  if (b.y < topEdge() || b.y > S.H - 12) { b.vy *= -0.8; b.y = clamp(b.y, topEdge(), S.H - 12); }
  for (const o of S.obs) if (inEllipse(b.x, b.y, o)) {
    const ex = (b.x - o.x) / o.rx, ey = (b.y - o.y) / o.ry, l = Math.hypot(ex, ey) || 1e-3, v = Math.hypot(b.vx, b.vy) * 0.6;
    b.x = o.x + ex / l * o.rx; b.y = o.y + ey / l * o.ry;
    b.vx = ex / l * v; b.vy = ey / l * v;
  }
  if (Math.hypot(b.vx, b.vy) < 4 && b.z === 0) b.vx = b.vy = 0;
}

function fade(list, dt, onRemove) {
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i];
    if (o.dying !== undefined && (o.dying -= dt * 0.5) <= 0) { list.splice(i, 1); if (onRemove) onRemove(); }
  }
}

/** Anything planned but not finished. Critters work on one thing at a time. */
export const currentSite = () => {
  const th = S.theatre;   // a stage going up, or coming down again, takes priority
  if (th && (th.phase === 'building' || th.phase === 'striking')) return th;
  return [S.fire, S.bridge, S.swing, S.tank, S.pool, ...S.hammocks, ...S.houses].find(o => o && (o.progress < 1 || o.adding));   // (not the monument: that's its own slow job, see build.js)
};

// The town plan: a fire to gather round, somewhere to sleep, then the fun stuff,
// and enough houses for everyone. Once that's done the town is finished, apart
// from the odd home improvement, and the critters just get on with enjoying it.
function growTown() {
  if (!currentSite()) {
    const beds = S.houses.length * HOUSE.residents, n = S.critters.length;
    let msg = null, hammock;
    if (!S.fire) { planFire(); msg = 'The critters are making a campfire.'; }
    else if (!S.houses.length) { newHouse(0); msg = 'The first house is going up.'; }
    else if (S.stream && !S.bridge) { planBridge(); msg = 'Tired of jumping the stream, the critters start on a bridge.'; }
    else if (!S.swing) { planSwing(); msg = 'Somebody had an idea: a swing set.'; }
    else if (beds < n && S.houses.length < 2) { newHouse(0); msg = 'A new house is going up.'; }
    else if (!S.tank) { planTank(); msg = 'The critters are making a fish tank.'; }
    else if (!S.pool) { planPool(); msg = 'The critters are digging a pool.'; }
    else if (beds < n && S.houses.length < 3) { newHouse(0); msg = 'A new house is going up.'; }
    else if ((hammock = planHammock())) msg = `There's just the right gap for a hammock ${between(hammock)}.`;
    else if (!S.monument) { const m = planMonument(); msg = m.form === 'circle' ? 'The critters have started on something big: a ring of standing stones.' : 'The critters have started on something big: an enormous statue.'; }
    else if (S.clock > nextAddon) {   // the town is finished; now and then somebody improves a house
      nextAddon = S.clock + rand(240, 520);
      const h = planAddon();
      if (h) msg = { chimney: 'One of the houses is getting a chimney.', annex: 'One of the houses is getting a side room.', upstairs: 'One of the houses is getting an upstairs.' }[h.adding.what];
    }
    if (msg) { rebuildObs(); note(msg); }
  }
  if (!S.ball && S.houses.some(built)) {   // turns up in the moving boxes
    const h = S.houses.find(built);
    S.ball = makeBall(h.x - 30, h.y + 14); S.ball.vx = -60; S.ball.vz = 120;
    note('Someone found a ball!');
  }
  refreshStats();
}
function arrive() {
  if (S.critters.length + S.away.length >= S.cap || isNight()) return;   // (beds are kept for anyone off adventuring)
  const p = freePoint();
  const c = newCritter(rand() < 0.5 ? -30 : S.W + 30, clamp(p.y, 130, S.H - 30));
  S.critters.push(c); assignHomes();
  goTo(c, p.x, p.y, () => { setAct(c, 'wave', 1.8); say(c, 'hi!'); });
  note(`${c.name} moved in.`);
  news(`${c.name} moved in`, anyone(2));
}

export function updateWorld(dt) {
  S.clock += dt;
  const p = phase();
  if (lastPhase !== null) {
    if (lastPhase < 0.6 && p >= 0.6) for (const c of S.critters) c.owl = rand() < 0.3;   // who stays up tonight
    if (p < lastPhase) log(`Day ${dayNum()} in Critterville.`);
  }
  lastPhase = p;

  for (const c of S.critters) updateCritter(c, dt);
  updateEvents(dt); updateRings(dt); updateVisitor(dt); updateSculptures(dt); updateJourneys(); updateTalk(); deliverMail(); settleRumour(); updateTheatre(dt); updatePuffs(dt); updateMusic(dt); updateShots(dt);
  const lh = S.lostHat; if (lh && lh.fly > 0) lh.fly -= dt;   // a hat on the wind
  for (const c of S.critters) if (c.balloon && S.clock > c.balloon.until) {   // a balloon gets away
    S.floaters.push({ ...c.balloon, x: c.x - 30 * c.size, y: c.y - 60 * c.size, t: 0 });
    c.balloon = null;
    if (!c.hidden) { say(c, 'oh!'); c.surprise = 1; }
  }
  for (let i = S.floaters.length - 1; i >= 0; i--) { const f = S.floaters[i]; f.t += dt; f.y -= 34 * dt; f.x += Math.sin(f.t * 1.5 + f.seed) * 12 * dt + S.wind * 60 * dt; if (f.y < -80) S.floaters.splice(i, 1); }
  for (const h of S.hammocks) hangHammock(h);
  updateBall(dt);

  if (S.swing) for (const seat of S.swing.seats) {
    const going = seat.user && seat.user.act === 'swing';
    seat.amp += ((going ? SWING.maxAngle : 0) - seat.amp) * Math.min(1, dt * 0.9);
    seat.angle = seat.amp * Math.sin(S.clock * 2.4);
  }
  for (const a of S.apples) if (a.z > 0 || a.vz) { a.z += a.vz * dt; a.vz -= 700 * dt; if (a.z <= 0) { a.z = 0; a.vz = 0; } }
  for (const f of S.flowers) f.age += dt;
  fade(S.flowers, dt);
  fade(S.arts, dt, rebuildObs);
  // Apples swell from a bud to ripe over a couple of minutes. A picked spot goes
  // negative first, so there's a pause before the next bud shows.
  for (const t of S.trees) if (t.grow !== undefined) {   // a seedling, growing up over a few days
    t.grow += dt / (DAY_LEN * 3);
    if (t.grow >= 1) { delete t.grow; rebuildObs(); }
  }
  for (const t of S.trees) for (let i = 0; i < t.apples.length; i++) if (t.apples[i] < 1 && !(t.grow < 0.8)) t.apples[i] = Math.min(1, t.apples[i] + dt / (110 + hash(t.seed + i) * 80));
  for (const f of S.flies) {
    f.a += (hash(f.seed + Math.floor(S.now * 2)) - 0.5) * 24 * dt;
    f.x += Math.cos(f.a) * 30 * dt; f.y += Math.sin(f.a) * 18 * dt + Math.sin(S.now * 5 + f.seed) * 0.3;
    if (f.x < 10 || f.x > S.W - 10 || f.y < 60 || f.y > S.H - 10) {
      f.a = Math.atan2(S.H / 2 - f.y, S.W / 2 - f.x); f.x = clamp(f.x, 10, S.W - 10); f.y = clamp(f.y, 60, S.H - 10);
    }
  }

  if ((townT -= dt) <= 0) { townT = 5; growTown(); }
  if ((arriveT -= dt) <= 0) { arriveT = rand(90, 200); arrive(); }
  if ((saveT -= dt) <= 0) { saveT = 15; save(); }
}
