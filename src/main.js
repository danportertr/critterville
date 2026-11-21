// Critterville: boot, resize, and the frame loop.
// Add ?speed=10 to the URL to fast-forward time.
import { S } from './state.js';
import { clamp } from './util.js';
import { cv } from './draw/canvas.js';
import { render } from './draw/render.js';
import { rebuildObs, placeBridge } from './world/geometry.js';
import { newTown, scatterDecor } from './world/town.js';
import { save, load } from './world/save.js';
import { updateWorld } from './sim/world.js';
import './activities/index.js';
import './input.js';
import './radio.js';
import './journalPanel.js';
import { startDiary } from './journal.js';
import { trigger } from './events/index.js';

const SPEED = clamp(parseFloat(new URLSearchParams(location.search).get('speed')) || 1, 0.1, 60);

function resize() {
  const w = innerWidth, h = innerHeight, oW = S.W, oH = S.H;
  if (w < 50 || h < 50) return;   // hidden or collapsed: wait for a real size
  S.dpr = Math.min(devicePixelRatio || 1, 2);
  S.zoom = clamp(Math.sqrt(w * h) / 1000, 0.5, 1.5);
  cv.width = Math.round(w * S.dpr); cv.height = Math.round(h * S.dpr);
  S.W = w / S.zoom; S.H = h / S.zoom;
  S.cap = clamp(Math.floor(S.W * S.H / 100000), 6, 9);   // a small town, on purpose
  if (!oW || !S.critters.length) return;
  // Stretch the existing town to fit the new window.
  const fx = S.W / oW, fy = S.H / oH;
  for (const o of [S.pond, S.pool, S.fire, S.ball, S.swing, S.tank, ...S.houses, ...S.trees, ...S.flowers, ...S.apples, ...S.arts, ...S.stones, ...S.rings, S.visitor, ...S.critters].filter(Boolean)) { o.x *= fx; o.y *= fy; }
  for (const c of S.critters) { c.tx *= fx; c.ty *= fy; if (c.bobx) { c.bobx *= fx; c.boby *= fy; } }
  if (S.pond) { S.pond.rx *= fx; S.pond.ry = S.pond.rx * 0.5; }
  if (S.stream) S.stream.pts = S.stream.pts.map(([x, y]) => [x * fx, y * fy]);
  placeBridge();
  if (S.pool) { S.pool.rx *= fx; S.pool.ry = S.pool.rx * 0.48; }
  rebuildObs(); scatterDecor();
}

let last = 0;
function frame(ts) {
  const dt = Math.min(0.1, (ts - last) / 1000 || 0);
  last = ts; S.now += dt; S.boil = Math.floor(S.now * 5);
  const steps = Math.ceil(SPEED);
  for (let i = 0; i < steps; i++) updateWorld(dt * SPEED / steps);
  render();
  requestAnimationFrame(frame);
}

addEventListener('resize', resize);
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// Start once the window has a real size (it can be 0×0 in a background tab or hidden pane).
function boot() {
  resize();
  if (!S.W) return void addEventListener('resize', boot, { once: true });
  if (!load()) { newTown(); startDiary(); }
  requestAnimationFrame(frame);
}
S.trigger = trigger;       // e.g. critterville.trigger('rain') | 'star' | 'wind' | 'ducks' | 'ring' | 'cart'
window.critterville = S;   // for poking around in the console
boot();
