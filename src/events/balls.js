// A bag of balls turns up. For a day or so there are several to play with
// (and a lot more juggling); then they're gathered up again.
import { S, phase } from '../state.js';
import { DAY_LEN, PETALS } from '../config.js';
import { rand, pick } from '../util.js';
import { freePoint } from '../world/geometry.js';
import { makeBall } from '../world/town.js';
import { note } from '../journal.js';
import { news, outdoors } from '../talk.js';

export default {
  id: 'balls',
  can: () => S.ball && !S.extraBalls.length && phase() > 0.05 && phase() < 0.45,
  start() {
    const p = freePoint(30);
    for (let i = 0; i < 3; i++) S.extraBalls.push(Object.assign(makeBall(p.x, p.y), { color: pick(PETALS), vx: rand(-160, 160), vy: rand(-90, 90), vz: rand(120, 200), z: 4 }));
    S.ballsUntil = S.clock + rand(0.9, 1.4) * DAY_LEN;
    note('A net bag of balls has turned up from somewhere. Nobody is asking questions.');
    news('more balls!', outdoors());
    return { dur: 5 };
  },
};
