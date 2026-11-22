// Things to do with a ball besides kicking it somewhere.
//
//   ring      two to four critters pass it round, counting
//   keepy     one critter keeps it up with its head
//   bat       one throws, one whacks it with a stick, somebody runs after it
//   dribble   pushing it along with a stick
//   balance   standing on it, for as long as that lasts
//   juggle    three little balls (no big ball needed)
//
// Now and then a game that went well gets a name and a silly extra rule, and
// becomes one of the town's own games (S.games). Like the town's songs, those
// are a small repertoire: once a game exists it's what gets played, again and
// again, and a new one is only invented once in a long while.
//
// A ball in a game is moved by script, not physics: throwBall() sends it
// along an arc (ball.fly), and sim/world.js follows that until it lands.
import { S } from '../state.js';
import { WOOD, PETALS } from '../config.js';
import { TAU, rand, irand, pick, clamp, dist } from '../util.js';
import { log } from '../ui.js';
import { ctx } from '../draw/canvas.js';
import { line, blob } from '../draw/primitives.js';
import { freePoint, topEdge, inEllipse, inStream } from '../world/geometry.js';
import { note, journalChanged } from '../journal.js';
import { news } from '../talk.js';
import { goTo, setAct, say, release, isFree, tick } from '../sim/core.js';

export const allBalls = () => [S.ball, ...S.extraBalls].filter(Boolean);
const spare = b => b.roof == null && !b.game && !b.fly && !b.held;
/** The nearest ball that nobody is using. */
export const nearestBall = c => allBalls().filter(spare).sort((a, b) => dist(a, c) - dist(b, c))[0];
/** Send a ball through the air to `to`, taking `dur` seconds and rising `h`; `then` runs when it lands. */
export function throwBall(b, to, dur, h, then) { b.vx = b.vy = b.vz = 0; b.fly = { x0: b.x, y0: b.y, x1: to.x, y1: to.y, t: 0, dur, h, then }; }

// ---- the town's own games ----
const NAMES = ['Splonk', 'Wibble', 'Bonkers', 'Hup', 'Roly-Poly', 'Tumbletoss', 'Flumpball', 'Niff-Naff', 'Whackadoo', 'Ploink', 'Boing', 'Scrumble'];
const BASICS = { ring: 'Stand in a ring and keep the ball going', bat: 'One throws, one whacks it with a stick, and then somebody runs', keepy: 'Keep it off the ground using only your head' };
const TWISTS = [
  { text: 'you have to hop whenever the ball is in the air', hop: true },
  { text: 'you shout your own name when you hit it', shout: true },
  { text: "nobody is allowed to say the word 'ball'" },
  { text: 'whoever drops it has to wear a flower' },
  { text: 'you may only use your left foot', not: 'keepy' },
  { text: 'it only counts if a duck is watching' },
  { text: 'the winner is whoever laughs last' },
];
const today = () => Math.floor(S.clock / 300) + 1;
/** The town's game of this kind, if it has one: that's nearly always what gets played. */
const known = kind => { const g = S.games.filter(g => g.kind === kind); return g.length && rand() < 0.92 ? pick(g) : null; };
/** How keen critters are on this kind of game: keener when it's one of their own. */
const keen = kind => (S.games.some(g => g.kind === kind) ? 1.7 : 1);
function maybeInvent(game) {
  // New games are rare: never two within a few days, and a kind that already has one hardly ever gets another.
  const newest = Math.max(0, ...S.games.map(g => g.day));
  if (game.named || S.games.length >= 5 || (S.games.length && today() - newest < 4)) return null;
  if (rand() > (S.games.some(g => g.kind === game.kind) ? 0.06 : 0.3)) return null;
  const twist = pick(TWISTS.filter(t => t.not !== game.kind)), free = NAMES.filter(n => !S.games.some(g => g.name === n));
  const made = { name: pick(free.length ? free : NAMES), kind: game.kind, by: game.players.map(p => p.name), day: today(), last: today(), rule: `${BASICS[game.kind]}, and ${twist.text}.`, hop: !!twist.hop, shout: !!twist.shout };
  S.games.push(made);
  const who = made.by.length > 1 ? `${made.by.slice(0, -1).join(', ')} and ${made.by[made.by.length - 1]}` : made.by[0];
  note(`${who} invented a game called ${made.name}. ${made.rule}`);
  news(`a new game: ${made.name}!`, game.players);
  journalChanged('songs');
  return made;
}

// ---- games in progress ----
function leave(p, game) {
  const i = game.players.indexOf(p);
  if (i >= 0) game.players.splice(i, 1);
  game.joined = game.joined.filter(q => q !== p);
  p.game = null;
}
function finish(game, ok) {
  const i = S.ballGames.indexOf(game);
  if (i >= 0) S.ballGames.splice(i, 1);
  game.ball.game = null; game.over = true;
  const names = game.players.map(p => p.name);
  for (const p of game.players.slice()) { p.game = null; p.cleanup = null; if (p.act === 'ballgame') { setAct(p, 'idle', rand(1, 3)); if (ok) { p.hopV = rand(70, 120); if (rand() < 0.5) say(p, pick(['yay', 'again!', 'ha!', '♥']), 1.4); } } }
  if (!ok || !names.length) return;
  const made = maybeInvent(game);
  if (made || !game.named) return;
  const g = game.named, who = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  if (g.last !== today() && rand() < 0.5) note(`${who} played ${g.name}.`); else log(`${who} played ${g.name}.`);   // (the diary hears about it once a day at most)
  g.last = today(); journalChanged('songs');
}
function begin(c, kind, mates, spots, extra = {}) {
  const b = extra.ball, game = { kind, ball: b, players: [c, ...mates], joined: [], count: 0, wait: 0.6, deadline: S.clock + 18, named: known(kind), ...extra };
  b.game = game; b.vx = b.vy = 0;
  S.ballGames.push(game);
  game.players.forEach((p, i) => {
    if (p !== c) release(p);
    p.cleanup = () => { leave(p, game); if (!game.over && game.started && game.joined.length < game.need) finish(game, false); };
    p.nextWalk = 'skip';
    goTo(p, spots[i].x, spots[i].y, () => { if (game.over) return; game.joined.push(p); p.game = game; p.kickT = 0; setAct(p, 'ballgame', 999); });
  });
  return game;
}
const feet = (p, from) => ({ x: p.x + (from && from.x < p.x ? -10 : 10), y: p.y + 2 });
/** Somewhere near the ball with room for a game: clear of houses, trees and water. */
function centre(b) {
  for (let i = 0; i < 80; i++) {
    const r = i * 4, a = rand(TAU), p = { x: clamp(b.x + Math.cos(a) * r, 110, S.W - 110), y: clamp(b.y + Math.sin(a) * r * 0.7, topEdge() + 60, S.H - 70) };
    if (!S.obs.some(o => inEllipse(p.x, p.y, o, 74)) && !inStream(p.x, p.y, 50)) return p;
  }
  return freePoint(50);
}

export const ring = {
  id: 'ballRing',
  weight: c => nearestBall(c) ? 0.9 * keen('ring') : 0,
  start(c) {
    const b = nearestBall(c); if (!b) return false;
    const mates = S.critters.filter(o => o !== c && isFree(o) && dist(o, b) < 430).sort((p, q) => dist(p, b) - dist(q, b)).slice(0, pick([1, 1, 2, 3]));
    if (!mates.length) return false;
    const o = centre(b), n = mates.length + 1, R = n === 2 ? 64 : 72;
    begin(c, 'ring', mates, [c, ...mates].map((p, i) => { const a = n === 2 ? (i ? 0 : Math.PI) : -Math.PI / 2 + i / n * TAU; return { x: o.x + Math.cos(a) * R, y: o.y + Math.sin(a) * R * 0.55 }; }), { ball: b, need: 2, goal: 8 + irand(9) });
  },
};
export const keepy = {
  id: 'ballKeepy',
  weight: c => nearestBall(c) ? 0.4 * keen('keepy') : 0,
  start(c) { const b = nearestBall(c); if (!b) return false; begin(c, 'keepy', [], [{ x: b.x, y: b.y + 1 }], { ball: b, need: 1, goal: 8 + irand(14) }); },
};
export const bat = {
  id: 'ballBat',
  weight: c => nearestBall(c) ? 0.45 * keen('bat') : 0,
  start(c) {
    const b = nearestBall(c); if (!b) return false;
    const mate = S.critters.filter(o => o !== c && isFree(o) && dist(o, b) < 430).sort((p, q) => dist(p, b) - dist(q, b))[0];
    if (!mate) return false;
    const o = centre(b), side = o.x > S.W / 2 ? -1 : 1;   // hit towards the roomier side
    begin(c, 'bat', [mate], [{ x: o.x - side * 55, y: o.y }, { x: o.x + side * 55, y: o.y }], { ball: b, need: 2, side, strikes: 0 });   // players[0] bats, players[1] pitches
  },
};

/** Called every tick from sim/world.js: runs every ball game that's going on. */
export function updateBallGames(dt) {
  for (const c of S.critters) {
    if (c.kickT > 0) c.kickT -= dt;
    const b = c.dribbling;
    if (b) {   // pushing a ball along with a stick
      if (c.act !== 'walk' || b.roof != null) { b.held = null; c.dribbling = null; c.carry = null; }
      else { b.x = c.x + c.hx * 32; b.y = c.y + c.hy * 12 + 2; b.z = 0; b.spin += c.v * dt * 0.08 * (c.hx < 0 ? -1 : 1); }
    }
  }
  for (const game of S.ballGames.slice()) {
    const b = game.ball, live = game.joined.filter(p => p.act === 'ballgame');
    if (!game.started) {
      if (live.length < game.players.length && S.clock < game.deadline) continue;
      if (live.length < game.need) { finish(game, false); continue; }
      game.started = true; game.players = live.slice(); game.joined = live;
      game.holder = game.kind === 'bat' ? live[1] : live[0];
      if (game.named) say(live[0], `${game.named.name}!`, 1.6);   // everyone knows this one
      throwBall(b, feet(game.holder), 0.5, 18);
      continue;
    }
    if (live.length < game.need) { finish(game, false); continue; }
    if (b.fly || (game.wait -= dt) > 0) continue;
    const rule = game.named || {}, hopAll = () => { if (rule.hop) for (const p of live) p.hopV = 95; };
    const hit = p => { p.kickT = 0.35; if (rule.shout) say(p, p.name, 0.8); };

    if (game.kind === 'ring') {
      const from = game.holder, to = pick(live.filter(p => p !== from)), miss = game.count > 3 && rand() < 0.07;
      from.dir = to.x > from.x ? 1 : -1; from.hopV = 55; hit(from); hopAll();
      const aim = miss ? { x: clamp(to.x + (to.x - from.x) * 0.9, 20, S.W - 20), y: to.y + rand(-30, 30) } : feet(to, from);
      throwBall(b, aim, 0.5 + dist(from, to) / 300, 22 + rand(32), () => {
        if (miss) { say(to, pick(['oops', 'ah!', 'mine?']), 1.2); return finish(game, game.count > 5); }
        game.holder = to; game.wait = 0.28; to.hopV = 35;
        if (++game.count % 5 === 0) say(to, `${game.count}!`, 0.9);
        if (game.count >= game.goal) finish(game, true);
      });
    } else if (game.kind === 'keepy') {
      const p = live[0], drop = game.count > 3 && rand() < 0.09;
      p.kickT = 0.3; p.hopV = 45; hit(p);
      throwBall(b, drop ? { x: p.x + pick([-1, 1]) * rand(40, 70), y: p.y + rand(-10, 20) } : { x: p.x + rand(-5, 5), y: p.y + 1 }, 0.8, 62, () => {
        if (drop) { say(p, pick(['oops', 'bother']), 1.2); return finish(game, game.count > 6); }
        game.wait = 0.05;
        if (++game.count % 5 === 0) say(p, `${game.count}!`, 0.9);
        if (game.count >= game.goal) finish(game, true);
      });
    } else {   // bat: the pitcher throws, the batter swings
      const [batter, pitcher] = game.players, good = game.strikes >= 2 || rand() < 0.7;
      pitcher.dir = batter.x > pitcher.x ? 1 : -1; batter.dir = -pitcher.dir; pitcher.kickT = 0.3;
      throwBall(b, { x: batter.x + batter.dir * 16, y: batter.y - 1 }, 0.6, 14, () => {
        batter.kickT = 0.4;
        if (!good) { game.strikes++; say(batter, pick(['missed', 'again!', 'hm']), 1); game.wait = 0.5; return throwBall(b, feet(pitcher), 0.7, 20); }
        hit(batter); hopAll(); say(batter, pick(['crack!', 'whack!', 'ha!']), 1);
        const far = { x: clamp(batter.x + game.side * rand(210, 330), 30, S.W - 30), y: clamp(batter.y + rand(-90, 90), topEdge() + 10, S.H - 20) };
        throwBall(b, far, 1.25, 84, () => {});
        finish(game, true);
        release(pitcher); pitcher.nextWalk = 'trot'; goTo(pitcher, far.x, far.y + 2);   // and off the pitcher goes after it
        setAct(batter, 'wave', 2.2);
      });
      game.wait = 99;
    }
  }
  // the extra balls go back in the bag when their time is up
  if (S.extraBalls.length && S.clock > S.ballsUntil) {
    const n = S.extraBalls.length;
    S.extraBalls = S.extraBalls.filter(b => b.game || b.fly || b.held);
    if (!S.extraBalls.length && n) log('The extra balls have been gathered up and put away.');
  }
}

export const dribble = {
  id: 'ballDribble',
  weight: c => nearestBall(c) ? 0.4 : 0,
  start(c) {
    const b = nearestBall(c);
    if (!b) return false;
    goTo(c, b.x - 20, b.y, () => {
      if (!spare(b) || dist(c, b) > 40) return;
      b.held = c; c.dribbling = b;
      c.cleanup = () => { if (b.held === c) b.held = null; c.dribbling = null; c.carry = null; };
      c.carry = (c, p) => line([p.HR, [c.hx * 29 / c.size, (c.hy * 12 - 5) / c.size]], c.seed + 6, 2.8, WOOD, 0.2);   // the stick, down to the ball
      const to = freePoint(20);
      goTo(c, to.x, to.y);
    });
  },
};
export const balance = {
  id: 'ballBalance',
  weight: c => nearestBall(c) ? 0.3 : 0,
  start(c) {
    const b = nearestBall(c);
    if (!b) return false;
    goTo(c, b.x, b.y + 1, () => {
      if (!spare(b) || dist(c, b) > 30) return;
      b.held = c; c.onBall = b; c.x = b.x; c.y = b.y + 0.5; c.sink = -15;
      c.cleanup = () => { if (b.held === c) b.held = null; c.onBall = null; c.sink = 0; };
      setAct(c, 'balance', rand(6, 11)); say(c, pick(['whoa', 'look!', 'steady']), 1.4);
    });
  },
  states: {
    ballgame: {   // in a ring, heading, or batting: waiting for the ball and hitting it
      mood: 'smile',
      update(c) { if (!c.game || c.game.over) setAct(c, 'idle', rand(0.5, 2)); else if (c.game.ball && !(c.kickT > 0)) c.dir = c.game.ball.x > c.x ? 1 : -1; },
      pose(c, p) {
        const g = c.game, k = c.kickT > 0 ? Math.sin(c.kickT / 0.35 * Math.PI) : 0;
        if (g && g.kind === 'keepy') { p.bob = k * 4; p.hl = [-30, -30]; p.hr = [30, -30]; p.mouth = 'small'; return; }
        if (g && g.kind === 'bat' && g.players[0] === c) { p.hand(p.d, p.d * (8 + k * 26), -40 + k * 6); p.hand(-p.d, p.d * 2, -36); p.rock = -p.d * 0.1 + p.d * k * 0.3; return; }
        if (p.d > 0) { p.rf = k * 9; p.rx = k * 9; } else { p.lf = k * 9; p.lx = -k * 9; }
        p.bob = Math.abs(Math.sin(p.now * 5 + c.seed)) * 1.5;
      },
      props(c, p) {   // the batter's stick
        const g = c.game;
        if (!g || g.kind !== 'bat' || g.players[0] !== c) return;
        const k = c.kickT > 0 ? Math.sin(c.kickT / 0.35 * Math.PI) : 0, a = -1.2 + k * 2.1;
        line([p.HD, [p.HD[0] + p.d * Math.sin(a + 1.2) * 26 + p.d * 4, p.HD[1] - Math.cos(a + 1.2) * 26]], c.seed + 6, 3.2, WOOD, 0.2);
      },
    },
    balance: {   // standing on the ball, arms out
      mood: 'oh',
      finish(c) { const b = c.onBall; if (b) { b.held = null; b.vx = -c.dir * 90; b.vz = 40; } c.onBall = null; c.sink = 0; c.cleanup = null; c.x += c.dir * 18; c.hopV = 130; say(c, pick(['ta-da', 'oof', 'ha!']), 1.3); },
      transform(c) { ctx.translate(c.x, c.y - 15 - c.hopY); ctx.rotate(Math.sin(S.now * 5 + c.seed) * 0.13); ctx.scale(c.size, c.size); return true; },
      pose(c, p) { const q = Math.sin(p.now * 5 + c.seed); p.hl = [-34, -30 + q * 9]; p.hr = [34, -30 - q * 9]; p.lf = Math.max(0, q) * 2; p.rf = Math.max(0, -q) * 2; },
    },
    juggle: {    // three little balls going round
      mood: 'flat',
      update(c, dt) { tick(c, dt); },
      finish(c) { if (rand() < 0.45) { say(c, pick(['oops', 'drat']), 1.2); } else { say(c, pick(['ta-da', '♪']), 1.3); c.hopV = 110; } },
      pose(c, p) { const q = Math.sin(p.now * 7.5); p.hl = [-25, -30 + q * 4]; p.hr = [25, -30 - q * 4]; },
      over(c, p) {   // (drawn last, so the balls pass in front of the face, not behind the head)
        for (let i = 0; i < 3; i++) {
          const u = (p.now * 1.2 + i / 3) % 1, x = -25 + 50 * u, y = -34 - Math.pow(Math.sin(u * Math.PI), 0.7) * 86;   // hand to hand, up over the top of the head
          blob(i % 2 ? -x : x, y, 4.2, 4.2, (c.jugglers || PETALS)[i % 3], c.seed + 6 + i, 7, 0.03, 0.2, 1.8);
        }
      },
    },
  },
};
export const juggle = {
  id: 'juggle',
  weight: () => (S.extraBalls.length ? 1.6 : 0.35),   // much more of it when there are spare balls about
  start(c) { c.jugglers = [pick(PETALS), pick(PETALS), pick(PETALS)]; setAct(c, 'juggle', rand(9, 15)); if (rand() < 0.4) say(c, 'watch!', 1.2); },
};
