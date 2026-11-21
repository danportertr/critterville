// A rumour. One critter is sure it saw something enormous move in the water.
// Word gets round, people go and stare at the water, and after a day or so
// it turns out to have been a carp.
import { S } from '../state.js';
import { DAY_LEN } from '../config.js';
import { irand, dist } from '../util.js';
import { note } from '../journal.js';
import { news, outdoors, anyone } from '../talk.js';
import { say } from '../sim/core.js';

export default {
  id: 'rumour',
  can: () => !S.rumour && (S.pond || S.stream) && outdoors().length > 0,
  start() {
    const water = S.pond ? 'pond' : 'stream', at = S.pond || { x: S.W / 2, y: S.H / 2 };
    const seer = outdoors().sort((a, b) => dist(a, at) - dist(b, at))[0];
    say(seer, '!!', 2); seer.surprise = 1.5; seer.hopV = 120;
    const item = news(`something BIG in the ${water}`, [seer]);
    S.rumour = { water, seed: irand(1000), newsId: item.id, until: S.clock + 1.4 * DAY_LEN };
    note(`${seer.name} swears something enormous just moved in the ${water}.`);
    return { dur: 4 };
  },
};

/** Called every tick from sim/world.js: the truth comes out in the end. */
export function settleRumour() {
  const r = S.rumour;
  if (!r || S.clock < r.until) return;
  S.rumour = null;
  note(`The enormous thing in the ${r.water} turned out to be a carp. A big one, mind.`);
  news('it was just a carp', anyone(2));
}
