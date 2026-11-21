// Help hammer together whichever house is under construction.
import { S } from '../state.js';
import { HOUSE, INK } from '../config.js';
import { rand } from '../util.js';
import { log } from '../ui.js';
import { box, line } from '../draw/primitives.js';
import { assignHomes } from '../world/town.js';
import { goTo, setAct, say } from '../sim/core.js';

export default {
  id: 'build',
  weight: () => S.houses.some(h => h.progress < 1) ? 3.5 : 0,
  start(c) {
    const h = S.houses.find(h => h.progress < 1), side = rand() < 0.5 ? -1 : 1;
    goTo(c, h.x + side * rand(20, HOUSE.w / 2 + 16), h.y + rand(8, 16), () => { c.dir = -side; c.site = h; setAct(c, 'build', rand(4, 7)); });
  },
  states: {
    build: {
      finish(c) {
        const h = c.site;
        if (!h || h.progress >= 1) return;
        h.progress += 0.11;
        if (h.progress >= 1) { h.progress = 1; assignHomes(); log('A new house is finished!'); c.hopV = 150; say(c, '!'); }
      },
      pose(c, p) { p.hand(p.d, p.d * 28, -34 + Math.sin(p.now * 11) * 11); },
      props(c, p) {   // hammer
        const top = [p.HD[0] + p.d * 2, p.HD[1] - 13];
        line([p.HD, top], c.seed + 6, 2.4, INK, 0.2);
        box([[top[0] - 6, top[1] - 3], [top[0] + 6, top[1] - 3], [top[0] + 6, top[1] + 3], [top[0] - 6, top[1] + 3]], '#bbb', c.seed + 7, 0.3, 2);
      },
    },
  },
};
