// Walk over to someone and have a conversation. What gets said (news, fish
// stories, dreams, compliments) and what comes of it (friendship, plans) is in talk.js.
import { S } from '../state.js';
import { rand, dist } from '../util.js';
import { goTo, setAct, say, release, tick } from '../sim/core.js';
import { nextLine, bond, makePlan, isFriend } from '../talk.js';

export default {
  id: 'chat',
  weight: () => 2,
  start(c) {
    // Whoever's nearest, though a friend is worth walking a bit further for.
    const near = o => dist(o, c) * (isFriend(c, o) ? 0.45 : 1);
    const o = S.critters.filter(o => o !== c && !o.hidden && o.act === 'idle' && !o.partner && dist(o, c) < 560)
      .sort((a, b) => near(a) - near(b))[0];
    if (!o) return false;
    c.partner = o; o.partner = c;
    setAct(o, 'wait', 30);
    goTo(c, o.x + (c.x < o.x ? -38 : 38), o.y + rand(-3, 3), () => {
      if (c.partner !== o || o.act !== 'wait') { c.partner = null; return; }
      c.dir = o.x > c.x ? 1 : -1; o.dir = -c.dir;
      setAct(c, 'chat', rand(5, 10)); setAct(o, 'chat', 999);   // the visitor leads and ends it
      c.lead = true; o.lead = false; c.chatT = 0.3; c.turn = true; c.react = null;
    });
  },
  states: {
    chat: {
      update(c, dt) {
        c.spread = (c.spread || 0) - dt;
        if (c.lead && c.partner && (c.chatT -= dt) <= 0) {
          const [who, to] = c.turn ? [c, c.partner] : [c.partner, c];
          say(who, nextLine(who, to, c), 1.5);
          c.turn = !c.turn; c.chatT = 1.7;
        }
        tick(c, dt);
      },
      finish(c) {
        const o = c.partner;
        release(c);
        if (!o) return;
        bond(c, o);
        return makePlan(c, o);   // true if they've gone off to do something together
      },
      mood: 'small',
      pose(c, p) {
        if (c.spread > 0) { const w = 26 + Math.min(5, c.tale ? c.tale.size : 2) * 3; p.mouth = 'big'; p.hl = [-w, -34]; p.hr = [w, -34]; }   // "THIS big"
        else if (c.bubble) { p.mouth = 'big'; p.hand(p.d, p.d * 32, -34 + Math.sin(p.now * 10) * 4); }                                      // whoever's talking lights up
      },
    },
  },
};
