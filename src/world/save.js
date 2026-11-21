// The town lives in localStorage so it's still there when you come back.
import { S } from '../state.js';
import { SAVE_KEY, SAVE_VERSION } from '../config.js';
import { clamp } from '../util.js';
import { rebuildObs, placeBridge } from './geometry.js';
import { newJournal } from '../journal.js';
import { restore as restoreHammock } from '../activities/hammock.js';
import { restoreVisitor } from '../events/cart.js';
import { keep } from '../events/journeys.js';
import { setTownName } from '../ui.js';
import { hydrate, makeSwing, makeBall, assignHomes, scatterDecor } from './town.js';

export function save() {
  if (!S.W || !S.critters.length) return;
  const data = {
      v: SAVE_VERSION, W: S.W, H: S.H, clock: S.clock, journal: S.journal, pond: S.pond, stream: S.stream, tank: S.tank, nextEvent: S.nextEvent, away: S.away, townName: S.townName, pranked: S.pranked, songs: S.songs, songId: S.songId, plays: S.plays,
      theatre: S.theatre && { kind: 'stage', x: S.theatre.x, y: S.theatre.y, seed: S.theatre.seed, progress: S.theatre.progress, phase: S.theatre.phase === 'show' ? 'ready' : S.theatre.phase, wait: 8 }, news: S.news, newsId: S.newsId, mail: S.mail, rumour: S.rumour,
      lostHat: S.lostHat && { ...S.lostHat, taken: null, held: false }, cairns: S.cairns, monument: S.monument, recent: S.recent, lastCart: S.lastCart,
      visitor: S.visitor && S.visitor.state === 'open' ? { kind: S.visitor.kind, seed: S.visitor.seed, x: S.visitor.x, y: S.visitor.y, d: S.visitor.d, until: S.visitor.until } : null, hammocks: S.hammocks.map(h => ({ kind: 'hammock', a: h.a, b: h.b, seed: h.seed, progress: h.progress })), stones: S.stones, rings: S.rings, ducks: S.ducks, bridge: S.bridge && { kind: 'bridge', t: S.bridge.t, seed: S.bridge.seed, progress: S.bridge.progress }, pool: S.pool, fire: S.fire,
      swing: S.swing && { x: S.swing.x, y: S.swing.y, seed: S.swing.seed, progress: S.swing.progress },
      houses: S.houses, trees: S.trees,
      flowers: S.flowers.filter(f => f.dying === undefined),
      arts: S.arts.filter(a => a.progress >= 1 && a.dying === undefined),
      ball: S.ball && { x: S.ball.x, y: S.ball.y, roof: S.ball.roof, roofAt: S.ball.roofAt },
      critters: S.critters.filter(c => !c.leaving).map(c => ({ ...keep(c), home: S.houses.indexOf(c.home) })),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }
  catch (e) {   // probably out of room: the plays' photographs are the bulky part, so try again without them
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, plays: S.plays.map(p => ({ ...p, photos: [] })) })); }
    catch (e2) { /* private mode etc: the town just won't persist */ }
  }
}

/** Returns false if there is nothing usable saved. */
export function load() {
  let d;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  if (!d || !(d.v >= 3) || !d.critters || !d.critters.length || !(d.W > 50 && d.H > 50)) return false;
  const fx = S.W / d.W, fy = S.H / d.H;
  const mv = o => { if (o) { o.x *= fx; o.y *= fy; } return o; };
  S.clock = d.clock || 0;
  S.pond = mv(d.pond) || null; if (S.pond) { S.pond.rx *= fx; S.pond.ry = S.pond.rx * 0.5; }
  S.stream = d.stream || null; if (S.stream) S.stream.pts = S.stream.pts.map(([x, y]) => [x * fx, y * fy]);
  S.bridge = S.stream && d.bridge ? d.bridge : null; placeBridge();
  S.journal = { ...newJournal(), ...d.journal };   // (older saves have no `sky`: newJournal supplies it)
  S.pool = mv(d.pool) || null; if (S.pool) { S.pool.rx *= fx; S.pool.ry = S.pool.rx * 0.48; }
  S.fire = mv(d.fire) || null;
  S.event = null; S.wind = 0; S.recent = d.recent || null; S.nextEvent = d.nextEvent || 0;
  S.stones = (d.stones || []).map(mv); S.rings = (d.rings || []).map(mv); S.ducks = d.ducks || null;
  S.tank = mv(d.tank) || null;
  S.swing = mv(d.swing) ? makeSwing(d.swing.x, d.swing.y, d.swing.seed, d.swing.progress) : null;
  S.houses = d.houses.map(mv); for (const h of S.houses) h.addons = h.addons || [];
  S.trees = d.trees.map(mv);
  for (const t of S.trees) if (!t.apples) t.apples = [Math.random(), Math.random(), Math.random()];   // towns saved before apples grew
  S.flowers = d.flowers.map(mv); S.arts = (d.arts || []).map(mv);
  S.theatre = mv(d.theatre) || null;
  S.townName = d.townName || 'Critterville'; setTownName(S.townName); S.pranked = d.pranked || null; S.fixing = false;
  S.plays = d.plays || [];
  S.songs = d.songs || []; S.songId = d.songId || 0; S.band = null;
  S.away = d.away || []; S.news = d.news || []; S.newsId = d.newsId || 0; S.mail = d.mail || []; S.rumour = d.rumour || null; S.picnic = null;
  S.lostHat = mv(d.lostHat) || null;
  for (const a of S.arts) a.busy = false;
  S.cairns = (d.cairns || []).map(mv); S.monument = mv(d.monument) || null;
  for (const s of S.stones) s.claimed = false;
  S.apples = []; S.floaters = []; S.lastCart = d.lastCart || null;
  S.visitor = restoreVisitor(mv(d.visitor));
  S.hammocks = (d.hammocks || []).map(restoreHammock).filter(Boolean);
  S.ball = mv(d.ball) ? Object.assign(makeBall(d.ball.x, d.ball.y), { roof: d.ball.roof == null ? null : d.ball.roof, roofAt: d.ball.roofAt }) : null;
  S.critters = d.critters.map(c => hydrate(mv(c)));
  for (const c of S.critters) { c.x = clamp(c.x, 20, S.W - 20); c.y = clamp(c.y, 90, S.H - 10); }
  rebuildObs(); assignHomes(); scatterDecor();
  return true;
}
