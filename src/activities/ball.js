// Run over and boot a ball. (The cleverer things to do with one are in
// ballgames.js; a ball's own physics are in sim/world.js.)
import { TAU, rand, pick, dist } from '../util.js';
import { goTo, say } from '../sim/core.js';
import { nearestBall } from './ballgames.js';

export default {
  id: 'ball',
  weight: c => nearestBall(c) ? 0.55 : 0,
  start(c) {
    const b = nearestBall(c);
    c.nextWalk = 'skip';
    goTo(c, b.x, b.y + 1, () => {
      if (dist(c, b) > 26 || b.game || b.fly || b.held || b.roof != null) return;   // somebody else got there first
      const a = rand(TAU), v = rand(150, 260);
      b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v * 0.7; b.vz = rand(90, 170);
      c.hopV = 110; c.dir = b.vx > 0 ? 1 : -1;
      if (rand() < 0.3) say(c, pick(['!', 'ha', 'hup']));
    });
  },
};
