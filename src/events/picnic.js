// A picnic. Somebody spreads a blanket and everyone who's free drifts over
// to sit around it and eat apples for a while.
import { S, phase } from '../state.js';
import { irand } from '../util.js';
import { findSpot } from '../world/geometry.js';
import { note } from '../journal.js';
import { news } from '../talk.js';
import { isFree } from '../sim/core.js';
import { joinPicnic } from '../activities/errands.js';

export default {
  id: 'picnic',
  can: () => !S.picnic && S.critters.length >= 4 && phase() > 0.15 && phase() < 0.5,
  start() {
    const p = findSpot(70, 40, 6), guests = S.critters.filter(isFree);
    S.picnic = { x: p.x, y: p.y, seed: irand(1e6), until: S.clock + 85 };
    S.flowers = S.flowers.filter(f => Math.hypot((f.x - p.x) / 50, (f.y - p.y) / 20) > 1);
    guests.forEach(joinPicnic);
    note('Somebody has spread a blanket on the grass. A picnic!');
    news('a picnic!', guests);
    return { dur: 85 };
  },
  end() { S.picnic = null; },
};
