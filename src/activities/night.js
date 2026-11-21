// Night owls. Most critters go to bed at nightfall, but one or two in any town
// are happier in the dark: they set up a telescope, fish for the things that
// only bite at night, follow fireflies, or sit up by the fire. They turn in
// shortly before dawn and sleep late.
import { S, phase, built } from '../state.js';
import { rand, pick, hs } from '../util.js';
import { SKY } from '../data/sky.js';
import { tube, line, dot } from '../draw/primitives.js';
import { INK } from '../config.js';
import { freePoint } from '../world/geometry.js';
import { note, journalChanged } from '../journal.js';
import { news } from '../talk.js';
import { ACT, goTo, setAct, say, tick } from '../sim/core.js';

/** The one or two critters in town who are most nocturnal (it's in their nature: decided by seed). */
export function isNightOwl(c) {
  const order = S.critters.slice().sort((a, b) => hs(a.seed, 8) - hs(b.seed, 8));
  return order.indexOf(c) < Math.max(1, Math.round(S.critters.length * 0.2));
}
const BEDTIME = 0.9;   // night runs from 0.72 to 0.96 of the day; owls turn in a little before it ends

/** What a night owl does next, while it's still properly night. Returns false once it's time for bed. */
export function nightLife(c) {
  if (phase() >= BEDTIME) return false;
  const options = [[3, () => stargaze.start(c)], [1.4, () => ACT.wander.start(c)], [1.2, () => ACT.fish.start(c)], [1.2, () => fireflies(c)]];
  if (built(S.fire)) options.push([1.6, () => ACT.campfire.start(c)]);
  if (c.instrument && !S.band && phase() < 0.84) options.push([1.4, () => ACT.perform.start(c)]);   // a quiet tune in the small hours
  if (S.critters.some(o => o !== c && !o.hidden && o.act === 'idle')) options.push([2, () => ACT.chat.start(c)]);   // company, if anyone else is up
  let r = rand(options.reduce((s, o) => s + o[0], 0));
  for (const [w, go] of options) if ((r -= w) <= 0) { if (go() !== false) return true; break; }
  ACT.wander.start(c);
  return true;
}
function fireflies(c) {
  const f = pick(S.flies);
  goTo(c, f.x, Math.max(120, f.y + 40), () => { setAct(c, 'admire', rand(4, 8)); say(c, pick(['✦', 'ooh', 'so many', '♥']), 1.6); });
}

export const stargaze = {
  id: 'stargaze2',   // (never picked by weight: only night owls do it, via nightLife)
  start(c) {
    const p = freePoint(30);
    goTo(c, p.x, p.y, () => { c.dir = rand() < 0.5 ? -1 : 1; setAct(c, 'telescope', rand(16, 30)); c.lookT = rand(5, 10); });
  },
  states: {
    telescope: {
      mood: 'small',
      update(c, dt) {
        if ((c.lookT -= dt) <= 0) {   // something swims into view
          c.lookT = rand(9, 16);
          let r = rand(SKY.reduce((s, o) => s + o.w, 0)), found = SKY[0];
          for (const o of SKY) if ((r -= o.w) <= 0) { found = o; break; }
          c.surprise = 0.7; c.sawSky = { id: found.id, clock: S.clock };   // it may show up in their art
          if (!S.journal.sky[found.id]) {
            S.journal.sky[found.id] = { day: Math.floor(S.clock / 300) + 1, by: c.name };
            say(c, pick(['oh!', 'look!', '★']), 1.8); c.hopV = 80;
            note(`${c.name} found ${found.call} through the telescope.`);
            news(`I saw ${found.call}!`, [c]);
            journalChanged('sky');
          } else say(c, pick(['★', 'there!', 'hm', '✦']), 1.4);
        }
        tick(c, dt);
      },
      pose(c, p) { p.hand(p.d, p.d * 24, -62); p.bob = 0; },   // one hand steadying the tube
      props(c, p) {   // the tripod stands behind...
        const d = p.d, sd = c.seed + 50;
        for (const x of [17, 28, 39]) line([[d * 28, -80], [d * x, 0]], sd + x, 2.2, INK, 0.2);
      },
      over(c, p) {    // ...and the tube comes up to the outer eye, leaving the other one showing
        const d = p.d, sd = c.seed + 50, eye = [d * (9.8 + c.eyeGap), -63.6];
        line([eye, [d * 14, -68]], sd + 2, 4, INK, 0.1);                       // the eyepiece
        tube([[d * 14.5, -68.5], [d * 43, -95]], 5.5, '#b7a6ff', sd, 0.2);
        tube([[d * 38, -91], [d * 45, -97]], 7.5, '#d9d0ff', sd + 1, 0.2);     // the wide end
        dot(d * 28, -80, 2.4);
      },
    },
  },
};
