// The prankster. Every town has one (it's whoever has it in them: decided by
// seed). Most of the time they're like anybody else, but now and then they put
// on the prankster hat, and while it's on they get up to things: apples and
// fish in the pool, a house painted in spots, the pool dyed pink, a moustache
// on a statue, a painting hung upside down, party hats on the monument, the
// ball on a roof, the town's name changed. Then the hat comes off.
//
// Nobody minds much. After a while somebody good-natured comes along and puts
// each thing right (the `cleanUp` activity).
import { S, built, isNight } from '../state.js';
import { DAY_LEN, PETALS, HOUSE } from '../config.js';
import { TAU, rand, irand, pick, hs } from '../util.js';
import { log, setTownName, TOWN } from '../ui.js';
import { line, box, blob } from '../draw/primitives.js';
import { puff } from '../puffs.js';
import { wallTop, WILD } from '../draw/scenery.js';
import { note } from '../journal.js';
import { news, nearby } from '../talk.js';
import { goTo, setAct, say, tick } from '../sim/core.js';

/** The one critter in town with mischief in them. */
export function isPrankster(c) {
  let best = null, top = -1;
  for (const o of S.critters) { const v = hs(o.seed, 12); if (v > top) { top = v; best = o; } }
  return best === c;
}
const SILLY_NAMES = ['Goofyville', 'Sillytown', 'Wobbleton', 'Bananaville', 'Stinkytown', 'Pranksville', 'Bottomsville', 'Critterville?', 'Not Critterville', 'Mooseville'];
const LOUD = ['#ff4fa3', '#3fd6c4', '#b455ff', '#ffe23d', '#ff7a1a', '#55e06a'];
const sign = () => ({ x: 74 / S.zoom + 24, y: 44 / S.zoom + 90 });   // standing just under the town's name in the corner, brush at the ready

// Each prank: can it be done now, where to go to do it, what it does (returning what to say about it),
// where the result is (for whoever cleans up), and how to undo it.
const PRANKS = [
  { id: 'junk', w: 3,
    can: () => built(S.pool) && !(S.pool.junk && S.pool.junk.length),
    at: () => ({ x: S.pool.x + S.pool.rx + 26, y: S.pool.y + 10 }),
    go() { const what = S.tank && S.tank.fish.length && rand() < 0.5 ? 'fish' : 'apple'; S.pool.junk = Array.from({ length: 5 + irand(4) }, (_, i) => ({ what, a: rand(TAU), r: rand(0.15, 0.75), seed: irand(1000) })); S.pool.prankAt = S.clock; return what === 'fish' ? 'filled the pool with fish' : 'filled the pool with apples'; },
    where: () => S.pool.junk && S.pool.junk.length ? S.pool : null, when: () => S.pool.prankAt,
    undo() { S.pool.junk = []; return 'fished everything out of the pool'; } },
  { id: 'dye', w: 1.6,
    can: () => built(S.pool) && !S.pool.dye,
    at: () => ({ x: S.pool.x - S.pool.rx - 26, y: S.pool.y + 8 }),
    go() { S.pool.dye = pick(['#ff9ed2', '#9be86a', '#c79bff', '#ffb347']); S.pool.dyeAt = S.clock; return 'dyed the pool a funny colour'; },
    where: () => S.pool && S.pool.dye ? S.pool : null, when: () => S.pool.dyeAt,
    undo() { S.pool.dye = null; return 'got the pool back to blue'; } },
  { id: 'house', w: 2.6,
    can: () => S.houses.some(h => built(h) && !h.prank),
    pick: () => pick(S.houses.filter(h => built(h) && !h.prank)),
    at: h => ({ x: h.x + 62, y: h.y + 10 }),
    go(h) {
      const colors = LOUD.slice().sort(() => rand() - 0.5).slice(0, 5), style = pick(WILD);
      h.prank = { colors, wall: colors[0], roof: colors[1], style, roofStyle: pick(WILD.filter(w => w !== style)), seed: irand(1e6), at: S.clock };
      return { zigzag: 'painted a house in zigzags', checks: 'painted a house in checks', rainbow: 'painted a house in rainbow stripes', bubbles: 'covered a house in spots within spots', swirls: 'painted swirls all over a house', splat: 'splattered a house with paint', zebra: 'painted a house like a zebra, but louder', stars: 'covered a house in stars', waves: 'painted a house in wavy lines', harlequin: 'painted a house in diamonds' }[style];
    },
    where: () => S.houses.find(h => h.prank) || null, when: () => (S.houses.find(h => h.prank) || {}).prank?.at,
    undo() { const h = S.houses.find(h => h.prank); if (h) h.prank = null; return 'painted the house back the way it was'; }, paint: true },
  { id: 'moustache', w: 1.5,
    can: () => S.arts.some(faced),
    pick: () => pick(S.arts.filter(faced)),
    at: a => ({ x: a.x + 26, y: a.y + 5 }),
    go(a) { a.moustache = S.clock; return a.type === 'painting' ? 'drew a moustache on a portrait' : 'gave a statue a moustache'; },
    where: () => S.arts.find(a => a.moustache) || null, when: () => (S.arts.find(a => a.moustache) || {}).moustache,
    undo() { const a = S.arts.find(a => a.moustache); if (a) a.moustache = null; return 'wiped the moustache off'; } },
  { id: 'flip', w: 1.1,
    can: () => S.arts.some(a => a.type === 'painting' && a.progress >= 1 && !a.flipped && a.dying === undefined),
    pick: () => pick(S.arts.filter(a => a.type === 'painting' && a.progress >= 1 && !a.flipped && a.dying === undefined)),
    at: a => ({ x: a.x - 30, y: a.y + 4 }),
    go(a) { a.flipped = S.clock; return 'hung a painting upside down'; },
    where: () => S.arts.find(a => a.flipped) || null, when: () => (S.arts.find(a => a.flipped) || {}).flipped,
    undo() { const a = S.arts.find(a => a.flipped); if (a) a.flipped = null; return 'turned the painting the right way up'; } },
  { id: 'monument', w: 1.3,
    can: () => S.monument && S.monument.progress > 0.9 && !S.monument.hats,
    at: () => ({ x: S.monument.x + 50, y: S.monument.y + 14 }),
    go() { S.monument.hats = { color: pick(LOUD), at: S.clock }; return 'put a party hat on the monument'; },
    where: () => S.monument && S.monument.hats ? S.monument : null, when: () => S.monument.hats.at,
    undo() { S.monument.hats = null; return 'took the party hat off the monument'; } },
  { id: 'ball', w: 1,
    can: () => S.ball && S.ball.roof == null && S.houses.some(built),
    pick: () => pick(S.houses.filter(built)),
    at: h => ({ x: h.x - 50, y: h.y + 12 }),
    go(h) { S.ball.roof = S.houses.indexOf(h); S.ball.roofAt = S.clock; S.ball.vx = S.ball.vy = 0; S.ball.x = h.x - 24; S.ball.y = h.y; return 'threw the ball up onto a roof'; },
    where: () => S.ball && S.ball.roof != null ? S.houses[S.ball.roof] : null, when: () => S.ball.roofAt,
    undo() { const h = S.houses[S.ball.roof]; S.ball.roof = null; if (h) { S.ball.x = h.x - 60; S.ball.y = h.y + 16; S.ball.z = 60; S.ball.vx = -70; } return 'got the ball down off the roof'; } },   // (normally done with apples: see lobApples)
  { id: 'name', w: 1.8,
    can: () => S.townName === TOWN,
    at: sign,
    go() { S.townName = pick(SILLY_NAMES); S.nameAt = S.clock; setTownName(S.townName); return `changed the town's name to ${S.townName}`; },
    where: () => S.townName !== TOWN ? sign() : null, when: () => S.nameAt,
    undo() { S.townName = TOWN; setTownName(TOWN); return `put the town's name back to ${TOWN}`; }, paint: true },
];
function faced(a) {   // art with a face to draw on
  if (a.progress < 1 || a.moustache || a.dying !== undefined) return false;
  return a.type === 'sculpture' ? (a.form || a.style) === 'critter' : a.style === 'closeup' && a.subject && a.subject.k === 'critter';
}

// ---- the prankster ----
/** The hat comes off, and stays off until another day. */
function hatOff(c) {
  c.pranking = null; c.prank = null;
  S.prankCool = S.clock + rand(1.3, 2.6) * DAY_LEN;
  if (!c.hidden) say(c, pick(['phew', 'what?', '♪']), 1.6);
  if (c.act === 'idle') c.t = Math.max(c.t, 2);
  log(`${c.name} has taken the prankster hat off, and looks very innocent.`);
}
/**
 * A safety net, called every tick from sim/world.js: whatever else is going
 * on, the hat doesn't stay on past its time, overnight, or on anyone who
 * isn't the prankster (after a save and reload, say).
 */
export function updatePranks() {
  for (const c of S.critters) {
    if (!c.pranking || c.act === 'prank') continue;
    if (S.clock > (c.pranking.until || 0) + 25 || isNight() || c.hidden || !isPrankster(c)) hatOff(c);
  }
}
export const prankster = {
  id: 'prankster',
  weight(c) {
    if (c.pranking) return 1000;                                           // hat's on: nothing else matters
    return isPrankster(c) && !isNight() && S.clock > (S.prankCool || DAY_LEN * 0.6) && PRANKS.some(p => p.can()) ? 0.9 : 0;   // (how often is really set by the cooldown after each spree)
  },
  start(c) {
    if (!c.pranking) {   // on goes the hat, for a few pranks or a couple of minutes, whichever is sooner
      c.pranking = { left: 2 + irand(3), until: S.clock + rand(110, 160) };
      say(c, 'hee hee', 1.8); c.hopV = 120;
      note(`${c.name} has put on the prankster hat. Oh dear.`);
    }
    const open = PRANKS.filter(p => p.can());
    if (!open.length || c.pranking.left <= 0 || S.clock > c.pranking.until) return hatOff(c);   // ...and off it comes
    let r = rand(open.reduce((s, p) => s + p.w, 0)), prank = open[0];
    for (const p of open) if ((r -= p.w) <= 0) { prank = p; break; }
    const target = prank.pick ? prank.pick() : null, at = prank.at(target);
    c.nextWalk = 'sneak';
    goTo(c, at.x, at.y, () => { if (!c.pranking) return; c.prank = { prank, target }; c.dir = (target || prank.where() || at).x > c.x ? 1 : -1; setAct(c, 'prank', rand(3.5, 5)); c.strikeT = 0.3; });
  },
  states: {
    prank: {
      mood: 'big',
      update(c, dt) {
        if ((c.strikeT -= dt) <= 0) { puff('paint', c.x + c.dir * 28 * c.size, c.y - 34 * c.size, 0, pick(LOUD)); c.strikeT = 0.35; }
        tick(c, dt);
      },
      finish(c) {
        const { prank, target } = c.prank || {};
        c.prank = null;
        if (!c.pranking) return;
        c.pranking.left--;                                // (counts even if it came to nothing, so the hat always comes off)
        if (!prank || !prank.can()) return;
        const did = prank.go(target);
        S.pranked = c.name;
        say(c, pick(['hee hee', 'tee hee', 'ha!']), 1.6); c.hopV = 110;
        puff('confetti', c.x + c.dir * 30, c.y - 40);
        note(`Somebody has ${did}. Nobody is in any doubt who.`);
        news({ junk: 'look in the pool!', dye: 'the pool!', house: 'that house!!', moustache: 'a moustache!', flip: 'upside down!', monument: 'a party hat!', ball: 'the ball is on the roof', name: `we live in ${S.townName}?` }[prank.id], nearby(c, 260).filter(o => o !== c));
      },
      pose(c, p) { const q = Math.sin(p.now * 13); p.bob = -3 + Math.abs(q) * 2; p.hand(p.d, p.d * 27, -38 + q * 12); p.hand(-p.d, -p.d * 10, -30); },
      props(c, p) {   // a dripping brush
        const [x, y] = p.HD, tip = [x + p.d * 5, y - 12];
        line([p.HD, tip], c.seed + 6, 2.4, '#000', 0.2);
        box([[tip[0] - 4, tip[1] - 7], [tip[0] + 4, tip[1] - 7], [tip[0] + 4, tip[1]], [tip[0] - 4, tip[1]]], pick(LOUD), c.seed + 7, 0.3, 2);
      },
    },
  },
};

// ---- getting the ball down: apples ----
const roofBall = h => ({ x: h.x - 26, y: h.y - (wallTop(h) + HOUSE.roof * 0.45) * HOUSE.scale });
function lobApples(c, house) {
  S.fixing = true;
  c.cleanup = () => { S.fixing = false; };
  goTo(c, house.x - 118, house.y + 16, () => {
    c.dir = 1;
    c.lob = { house, thrown: 0, need: 2 + irand(3), t: 0.9, wind: 0 };   // it takes a few goes
    setAct(c, 'lob', 99);
    say(c, pick(['hm', 'oh dear', 'the ball!']), 1.4);
  });
}
/** Apples in flight. Called every tick from sim/world.js. */
export function updateShots(dt) {
  for (let i = S.shots.length - 1; i >= 0; i--) {
    const s = S.shots[i];
    if ((s.t += dt / s.dur) < 1) continue;
    S.shots.splice(i, 1);
    const c = s.by, h = s.house;
    if (s.hit && S.ball.roof != null) {   // got it
      puff('dust', s.x1, s.y1);
      S.ball.roof = null; S.ball.x = h.x - 40; S.ball.y = h.y + 16; S.ball.z = (wallTop(h) + HOUSE.roof * 0.45) * HOUSE.scale; S.ball.vx = -80; S.ball.vy = 20; S.ball.vz = 60;
      c.lob = null; c.cleanup = null; S.fixing = false;
      setAct(c, 'wave', 2); say(c, pick(['got it!', 'ha!', 'yes!']), 1.6); c.hopV = 130;
      log(`${c.name} knocked the ball off the roof with an apple.`);
    } else if (!s.hit && rand() < 0.4 && c.act === 'lob') say(c, pick(['missed', 'nearly', 'bother', 'hm']), 1);
    // either way the apple comes back down, and is somebody's snack
    if (S.apples.length < 6) S.apples.push({ x: h.x + rand(-80, -30), y: h.y + rand(10, 24), z: 90, vz: 0, seed: irand(1e6), claimed: null, eaten: false });
  }
}
export function drawShots() {
  for (const s of S.shots) {
    const x = s.x0 + (s.x1 - s.x0) * s.t, y = s.y0 + (s.y1 - s.y0) * s.t - Math.sin(s.t * Math.PI) * 46;
    blob(x, y, 4.8, 4.5, '#fb6540', 5, 7, 0.06, 0.2, 2);
    line([[x, y - 4], [x + 1.5, y - 7]], 6, 1.4, '#000', 0.1);
  }
}

// ---- everybody else, putting things right ----
const mess = () => PRANKS.map(p => ({ p, at: p.where() })).filter(m => m.at && S.clock - (m.p.when() || 0) > 50).sort((a, b) => (a.p.when() || 0) - (b.p.when() || 0));
export const cleanUp = {
  id: 'cleanUp',
  weight: c => !c.pranking && !isPrankster(c) && !S.fixing && mess().length ? 2.2 : 0,
  start(c) {
    const m = mess()[0];
    if (m.p.id === 'ball') return lobApples(c, m.at);   // the ball on the roof needs a different approach
    const spot = m.p.id === 'name' ? sign() : m.p.id === 'junk' || m.p.id === 'dye' ? { x: S.pool.x + S.pool.rx + 24, y: S.pool.y + 12 } : { x: m.at.x + 40, y: m.at.y + 8 };
    S.fixing = true;
    c.cleanup = () => { S.fixing = false; };
    goTo(c, spot.x, spot.y, () => { c.fix = m.p; c.dir = m.at.x > c.x ? 1 : -1; setAct(c, 'putRight', m.p.paint ? rand(6, 8) : rand(3.5, 5)); c.strikeT = 0.4; if (rand() < 0.6) say(c, pick(['tsk tsk', 'ha!', 'oh dear', 'honestly']), 1.5); });
  },
  states: {
    lob: {   // throwing apples at the ball on the roof until one knocks it off
      mood: 'flat',
      update(c, dt) {
        const l = c.lob;
        if (!l || S.ball.roof == null) return void setAct(c, 'idle', 1);
        l.wind = Math.max(0, l.wind - dt);
        if ((l.t -= dt) > 0) return;
        l.t = 1.7; l.wind = 0.45; l.thrown++;
        const hit = l.thrown >= l.need, aim = roofBall(l.house);
        S.shots.push({ x0: c.x + c.dir * 22 * c.size, y0: c.y - 52 * c.size, x1: aim.x + (hit ? 0 : rand(-26, 26)), y1: aim.y + (hit ? 0 : rand(-22, 6)), t: 0, dur: 0.75, hit, by: c, house: l.house });
        if (l.thrown === 1 && rand() < 0.7) say(c, pick(['hup!', 'right', 'watch this']), 1.2);
      },
      pose(c, p) {   // wind up, and throw
        const w = c.lob ? c.lob.wind / 0.45 : 0;
        p.hand(p.d, p.d * (10 + (1 - w) * 22), -50 - Math.sin(w * Math.PI) * 14); p.hand(-p.d, -p.d * 22, -22); p.rock = -p.d * 0.1 * w;
        p.mouth = w > 0 ? 'oh' : 'flat';
      },
      props(c, p) { if (c.lob && c.lob.wind <= 0) blob(p.HD[0], p.HD[1] - 6, 4.6, 4.3, '#fb6540', c.seed + 6, 7, 0.06, 0.2, 2); },   // the next apple, ready
    },
    putRight: {
      mood: 'smile',   // they don't mind
      update(c, dt) {
        if (c.fix && c.fix.paint && (c.strikeT -= dt) <= 0) { puff('paint', c.x + c.dir * 28 * c.size, c.y - 36 * c.size, 0, '#fff'); c.strikeT = 0.8; }
        tick(c, dt);
      },
      finish(c) {
        const p = c.fix;
        c.fix = null; S.fixing = false; c.cleanup = null;
        if (!p || !p.where()) return;
        const did = p.undo();
        say(c, pick(['there', '♥', 'all done', 'good as new']), 1.5); c.hopV = 80;
        log(`${c.name} ${did}.`);
      },
      pose(c, p) { p.bob = -2 + Math.sin(p.now * 6) * 1.5; p.hand(p.d, p.d * 26, -34 + Math.sin(p.now * 6) * 9); p.hand(-p.d, -p.d * 12, -26); },
    },
  },
};
