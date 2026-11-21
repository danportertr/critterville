// Everything that happens on its own: the clock, the ball, growing things, new arrivals.
import { S, phase, dayNum, isNight } from '../state.js';
import { clamp, rand, hash } from '../util.js';
import { HOUSE, SWING } from '../config.js';
import { log, setStats } from '../ui.js';
import { inEllipse, rebuildObs, freePoint, topEdge } from '../world/geometry.js';
import { newHouse, newCritter, assignHomes } from '../world/town.js';
import { save } from '../world/save.js';
import { updateCritter, goTo, setAct, say } from './core.js';

let lastPhase = null, townT = 0, arriveT = 45, saveT = 15;

export function refreshStats() {
  setStats(`day ${dayNum()} · ${S.critters.length} critters · ${S.flowers.length} flowers · ${S.stats.fish} fish · ${S.stats.art} artworks`);
}

function updateBall(dt) {
  const b = S.ball;
  if (!(b.vx || b.vy || b.z > 0)) return;
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

function growTown() {
  const done = S.houses.filter(h => h.progress >= 1).length;
  if (!S.houses.some(h => h.progress < 1) && done * HOUSE.residents < S.critters.length && S.houses.length < 10) {
    newHouse(0); rebuildObs(); log('A new house is going up.');
  }
  refreshStats();
}
function arrive() {
  if (S.critters.length >= S.cap || isNight()) return;
  const p = freePoint();
  const c = newCritter(rand() < 0.5 ? -30 : S.W + 30, clamp(p.y, 130, S.H - 30));
  S.critters.push(c); assignHomes();
  goTo(c, p.x, p.y, () => { setAct(c, 'wave', 1.8); say(c, 'hi!'); });
  log(`${c.name} moved in!`);
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
  updateBall(dt);

  for (const seat of S.swing.seats) {
    const going = seat.user && seat.user.act === 'swing';
    seat.amp += ((going ? SWING.maxAngle : 0) - seat.amp) * Math.min(1, dt * 0.9);
    seat.angle = seat.amp * Math.sin(S.clock * 2.4);
  }
  for (const a of S.apples) if (a.z > 0 || a.vz) { a.z += a.vz * dt; a.vz -= 700 * dt; if (a.z <= 0) { a.z = 0; a.vz = 0; } }
  for (const f of S.flowers) f.age += dt;
  fade(S.flowers, dt);
  fade(S.arts, dt, rebuildObs);
  for (const t of S.trees) if (t.fruit < 3 && (t.regrow -= dt) <= 0) { t.fruit++; t.regrow = rand(40, 100); }
  for (const f of S.flies) {
    f.a += (hash(f.seed + Math.floor(S.now * 2)) - 0.5) * 24 * dt;
    f.x += Math.cos(f.a) * 30 * dt; f.y += Math.sin(f.a) * 18 * dt + Math.sin(S.now * 5 + f.seed) * 0.3;
    if (f.x < 10 || f.x > S.W - 10 || f.y < 60 || f.y > S.H - 10) {
      f.a = Math.atan2(S.H / 2 - f.y, S.W / 2 - f.x); f.x = clamp(f.x, 10, S.W - 10); f.y = clamp(f.y, 60, S.H - 10);
    }
  }

  if ((townT -= dt) <= 0) { townT = 5; growTown(); }
  if ((arriveT -= dt) <= 0) { arriveT = rand(70, 150); arrive(); }
  if ((saveT -= dt) <= 0) { saveT = 15; save(); }
}
