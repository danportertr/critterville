// Walk over to someone and have a little conversation.
import { S } from '../state.js';
import { CHAT } from '../config.js';
import { rand, pick, dist } from '../util.js';
import { goTo, setAct, say, release, tick } from '../sim/core.js';

export default {
  id: 'chat',
  weight: () => 2,
  start(c) {
    const o = S.critters.filter(o => o !== c && !o.hidden && o.act === 'idle' && !o.partner && dist(o, c) < 520)
      .sort((a, b) => dist(a, c) - dist(b, c))[0];
    if (!o) return false;
    c.partner = o; o.partner = c;
    setAct(o, 'wait', 30);
    goTo(c, o.x + (c.x < o.x ? -38 : 38), o.y + rand(-3, 3), () => {
      if (c.partner !== o || o.act !== 'wait') { c.partner = null; return; }
      c.dir = o.x > c.x ? 1 : -1; o.dir = -c.dir;
      setAct(c, 'chat', rand(5, 10)); setAct(o, 'chat', 999);   // the visitor leads and ends it
      c.lead = true; o.lead = false; c.chatT = 0.3; c.turn = true;
    });
  },
  states: {
    chat: {
      update(c, dt) {
        if (c.lead && c.partner && (c.chatT -= dt) <= 0) {
          say(c.turn ? c : c.partner, pick(CHAT), 1.2);
          c.turn = !c.turn; c.chatT = 1.4;
        }
        tick(c, dt);
      },
      finish: release,
      mood: 'small',
      pose(c, p) { if (c.bubble) { p.mouth = 'big'; p.hand(p.d, p.d * 32, -34 + Math.sin(p.now * 10) * 4); } },   // whoever's talking lights up
    },
  },
};
