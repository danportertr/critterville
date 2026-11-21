// A duck and her ducklings turn up on the water one morning, and stay.
import { S, phase } from '../state.js';
import { irand } from '../util.js';
import { note } from '../journal.js';
import { news, anyone } from '../talk.js';

export default {
  id: 'ducks',
  can: () => !S.ducks && (S.pond || S.stream) && phase() > 0.03 && phase() < 0.4,
  start() {
    const water = S.pond ? 'pond' : 'stream';
    S.ducks = { water, seed: irand(1000) };
    note(`A duck and two ducklings have moved onto the ${water}.`);
    news('ducks!', anyone(2));
    return { dur: 6 };
  },
};
