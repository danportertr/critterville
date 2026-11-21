// Run over and boot the ball. (The ball's own physics are in sim/world.js.)
import { S } from '../state.js';
import { TAU, rand, pick, dist } from '../util.js';
import { goTo, say } from '../sim/core.js';

export default {
  id: 'ball',
  weight: () => 0.9,
  start(c) {
    const b = S.ball;
    goTo(c, b.x, b.y + 1, () => {
      if (dist(c, b) > 26) return;   // somebody else got there first
      const a = rand(TAU), v = rand(150, 260);
      b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v * 0.7; b.vz = rand(90, 170);
      c.hopV = 110; c.dir = b.vx > 0 ? 1 : -1;
      if (rand() < 0.3) say(c, pick(['!', 'ha', 'hup']));
    });
  },
};
