// Stroll somewhere, usually not far. Also the fallback when nothing else works out.
import { S } from '../state.js';
import { clamp, rand } from '../util.js';
import { freePoint, topEdge } from '../world/geometry.js';
import { goTo, setAct } from '../sim/core.js';

export const wander = {
  id: 'wander',
  weight: () => 3.5,
  start(c) {
    const p = freePoint();
    if (rand() < 0.6) { p.x = clamp(c.x + rand(-260, 260), 40, S.W - 40); p.y = clamp(c.y + rand(-180, 180), topEdge(), S.H - 24); }
    goTo(c, p.x, p.y);
  },
};

export const rest = {
  id: 'rest',
  weight: () => 1,
  start(c) { setAct(c, 'idle', rand(2, 6)); },
};
