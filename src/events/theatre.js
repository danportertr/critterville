// The theatre. Every so often the critters spend the best part of a day
// building a stage, put on a play about something that really happened in
// town (with improvements: see data/plays.js), and then take it all down.
//
// S.theatre goes through four phases:
//   building   a building site like any other (activities/build.js)
//   ready      curtains closed, waiting for daylight and three free actors
//   show       the cast work through the play's beats while everyone watches
//   striking   the site again, in reverse, until there's nothing left
import { S, phase, isNight } from '../state.js';
import { irand, rand, pick, clamp } from '../util.js';
import { ctx } from '../draw/canvas.js';
import { STAGE } from '../draw/stage.js';
import { findSpot, rebuildObs } from '../world/geometry.js';
import { buildPlay } from '../data/plays.js';
import { note, journalChanged } from '../journal.js';
import { news, outdoors } from '../talk.js';
import { goTo, setAct, say, release, isFree } from '../sim/core.js';

const LIFT = STAGE.h - 2;   // how far up the actors stand

export default {
  id: 'theatre',
  can: () => !S.theatre && S.critters.length >= 5 && phase() < 0.3,
  start() {
    const p = findSpot(118, 104, 16);
    S.theatre = { kind: 'stage', x: p.x, y: p.y, seed: irand(1e6), progress: 0, phase: 'building' };
    S.flowers = S.flowers.filter(f => Math.abs(f.x - p.x) > 104 || Math.abs(f.y - p.y + 20) > 34);
    rebuildObs();
    note('The critters are building a stage. There is going to be a play!');
    news('a play!', outdoors());
    return { dur: 5 };
  },
};

// ---- the audience ----
function seat(th, i) {   // two rows, well in front so nobody blocks the stage
  const row = i % 2, col = Math.floor(i / 2), side = col % 2 ? 1 : -1, n = Math.ceil(col / 2);
  return { x: th.x + side * (22 + n * 44) - (row ? 20 : 0), y: th.y + 74 + row * 28 };
}
function takeSeat(c, th) {
  const i = th.seats++;
  const p = seat(th, i);
  c.nextWalk = 'trot';
  goTo(c, p.x, p.y, () => { if (S.theatre === th && th.phase === 'show') setAct(c, 'audience', 999); });
}
export const playgoer = {
  id: 'playgoer',
  // During the show, find a seat. Before it (curtains still closed), drift over
  // and hang about in front of the stage, so there's a cast and a crowd to hand.
  weight() { const th = S.theatre; return !th ? 0 : th.phase === 'show' && th.seats < 14 ? 6 : th.phase === 'ready' ? 8 : 0; },
  start(c) {
    const th = S.theatre;
    if (th.phase === 'show') return takeSeat(c, th);
    goTo(c, th.x + rand(-130, 130), th.y + rand(64, 120), () => { if (S.theatre === th && th.phase === 'ready') { setAct(c, 'gather', 120); if (rand() < 0.3) say(c, pick(['soon?', 'a play!', 'shh', '♥']), 1.4); } });
  },
  states: {
    gather: {   // hanging about in front of the closed curtain until it's time
      mood: 'smile',
      update(c, dt) { if (!S.theatre || S.theatre.phase !== 'ready' || (c.t -= dt) <= 0) setAct(c, 'idle', rand(0.3, 2)); },
    },
    audience: {
      update(c) { if (!S.theatre || S.theatre.phase !== 'show') setAct(c, 'idle', rand(0.5, 3)); },
      pose(c, p) {
        const m = S.theatre && S.theatre.mood, t = p.now * 14 + c.seed;
        if (m === 'clap') { const k = Math.abs(Math.sin(t)) * 6; p.hl = [-4 - k, -40]; p.hr = [4 + k, -40]; p.mouth = 'big'; p.bob = Math.abs(Math.sin(t * 0.5)) * 2; }
        else if (m === 'gasp') { p.mouth = 'oh'; p.hl = [-13, -52]; p.hr = [13, -52]; }
        else if (m === 'laugh') { p.mouth = 'big'; p.bob = Math.abs(Math.sin(t * 0.6)) * 2.5; }
        else if (m === 'aww') { p.mouth = 'smile'; p.hl = [-10, -34]; p.hr = [10, -34]; }
        else p.mouth = 'small';
      },
    },
    // On stage. The play's beats set c.acting; this just strikes the pose and walks to the mark.
    act: {
      update(c, dt) {
        const th = S.theatre;
        if (!th || th.phase !== 'show') return;
        const to = th.x + c.mark, dx = to - c.x;
        c.striding = Math.abs(dx) > 1.5;
        if (c.striding) { c.x += Math.sign(dx) * Math.min(Math.abs(dx), 46 * dt); c.dir = Math.sign(dx); c.phase += dt * 9; }
        else if (c.faceTo !== undefined) c.dir = c.faceTo;
      },
      transform(c) { ctx.translate(c.x, c.y - LIFT - c.hopY); ctx.scale(c.size, c.size); return true; },
      pose(c, p) {
        const t = p.now, q = Math.sin(t * 9 + c.seed);
        if (c.striding) { const s = Math.sin(c.phase); p.lf = Math.max(0, s) * 5; p.rf = Math.max(0, -s) * 5; p.bob = Math.abs(s) * 1.5; }
        switch (c.acting) {
          case 'speak': p.mouth = 'big'; p.hand(p.d, p.d * 32, -38 + q * 4); break;
          case 'cheer': p.mouth = 'big'; p.hl = [-28, -54 - q * 4]; p.hr = [28, -54 + q * 4]; p.bob = Math.abs(q) * 3; break;
          case 'roar': p.mouth = 'oh'; p.hl = [-34, -50 + q * 3]; p.hr = [34, -50 - q * 3]; p.rock = q * 0.06; break;
          case 'fight': p.mouth = 'flat'; p.hand(p.d, p.d * (30 + q * 5), -40 + Math.cos(t * 9) * 8); p.rock = p.d * 0.08; p.bob = Math.abs(q) * 2; break;
          case 'cower': p.mouth = 'oh'; p.bob = -5; p.hl = [-12, -62]; p.hr = [12, -62]; p.rock = Math.sin(t * 30) * 0.02; break;
          case 'faint': p.mouth = 'tiny'; p.eyesClosed = true; p.rock = -p.d * 1.35; p.bob = -16; p.hl = [-30, -20]; p.hr = [30, -20]; break;
          case 'bow': p.mouth = 'smile'; p.bob = -7 + Math.sin(t * 2.5) * 3; p.rock = p.d * (0.25 + Math.sin(t * 2.5) * 0.12); p.hl = [-22, -12]; p.hr = [22, -12]; break;
          case 'hug': p.mouth = 'big'; p.hand(p.d, p.d * 30, -34); p.hand(-p.d, p.d * 22, -30); break;
          case 'blown': p.mouth = 'oh'; p.rock = 0.25 + q * 0.08; p.hl = [-34, -40]; p.hr = [30, -46]; break;
          default: p.mouth = 'small';
        }
      },
    },
  },
};

// ---- running the show ----
function raiseCurtain(th) {
  const free = S.critters.filter(c => isFree(c) || c.act === 'gather');   // whoever has turned up, plus anyone at a loose end
  if (free.length < 3) return false;
  const play = buildPlay(), lead = free.find(c => c.name === play.hero);
  const cast = [lead, ...free.filter(c => c !== lead).sort(() => rand() - 0.5)].filter(Boolean).slice(0, 3);
  Object.assign(th, { phase: 'show', play, cast, beat: -1, t: 0, curtain: 0, mood: null, seats: 0, wait: 16, settle: 7 });
  cast.forEach((c, i) => {
    const part = play.cast[i];
    release(c);
    c.role = part; c.mark = [-45, 5, 95][i]; c.acting = null;
    c.nextWalk = 'trot';
    goTo(c, th.x + (i === 1 ? 20 : -60 + i * 60), th.y + 8, () => {   // up the steps and into costume
      if (S.theatre !== th) return;
      c.costume = part.costume === 'none' ? null : part.costume; c.stageProp = part.prop || null;
      if (part.costume === 'traveller') { c.costume = null; c.luggage = 'knapsack'; }
      c.x = th.x + (i === 2 ? 130 : c.mark); c.y = th.y - 1; c.sink = -LIFT; c.offstage = i === 2;   // the third waits in the wings
      setAct(c, 'act', 999);
    });
  });
  free.filter(c => !cast.includes(c)).forEach(c => takeSeat(c, th));
  note(`Curtain up! Tonight: “${play.title}”.`);
  return true;
}
function playBeat(th, b) {
  const [A, B, C] = th.cast;
  for (const c of th.cast) c.acting = null;
  for (const [i, how] of Object.entries(b.act || {})) if (th.cast[i]) th.cast[i].acting = how;
  for (const [i, x] of Object.entries(b.move || {})) if (th.cast[i]) th.cast[i].mark = x;
  for (const i of b.enter || []) if (th.cast[i]) { th.cast[i].offstage = false; th.cast[i].x = th.x + 112; }
  if (b.who !== undefined && th.cast[b.who]) say(th.cast[b.who], b.say, b.d - 0.3);
  // everybody faces whoever is speaking
  const speaker = th.cast[b.who];
  for (const c of th.cast) c.faceTo = speaker && c !== speaker ? (speaker.x > c.x ? 1 : -1) : c === A ? 1 : c === C ? -1 : (B && C && !C.offstage ? 1 : -1);
  th.mood = b.mood || null;
  if (b.photo) th.photoT = 1.1;   // a moment for everyone to get into position, then: click
  if (b.mood) for (const c of S.critters) if (c.act === 'audience' && rand() < 0.45) {
    say(c, pick({ gasp: ['oh!', 'no!', '!!'], laugh: ['ha ha', 'hee', 'ha!'], aww: ['aww', '♥'], clap: ['bravo!', 'more!', '♥', 'hooray'] }[b.mood]), 1.4);
    if (b.mood === 'clap') c.hopV = rand(40, 100);
  }
}
function curtainDown(th) {
  const names = th.cast.map((c, i) => `${c.name} as ${th.play.cast[i].role}`);
  // Keep the playbill (the journal's shows page lists them).
  S.plays.push({ title: th.title, day: Math.floor(S.clock / 300) + 1, cast: th.cast.map((c, i) => ({ name: c.name, role: th.play.cast[i].role })), twist: th.twist, ending: th.ending, photos: th.photos || [] });
  th.photos = null;
  if (S.plays.length > 20) S.plays.shift();
  S.plays.slice(0, -6).forEach(p => { p.photos = []; });   // pictures are only kept for the last few (they take up room)
  journalChanged('songs');
  for (const c of th.cast) {
    c.costume = c.stageProp = c.role = null; c.luggage = null; c.offstage = false; c.acting = null; c.sink = 0;
    c.y = th.y + 10; setAct(c, 'idle', rand(1, 3)); c.hopV = 90;
  }
  th.phase = 'striking'; th.play = null; th.cast = null; th.mood = null;
  note(`The play was “${th.title}”, with ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}. There was ${th.twist}. ${th.ending}`);
  news('what a play!', outdoors());
}
/** Called every tick from sim/world.js. */
export function updateTheatre(dt) {
  const th = S.theatre;
  if (!th) return;
  if (th.phase === 'building' && th.progress >= 1) { th.phase = 'ready'; th.wait = 12; th.patience = 75; }
  else if (th.phase === 'ready') {
    // Hold the curtain until most of the town has drifted over (or we've waited long enough).
    th.patience = (th.patience === undefined ? 75 : th.patience) - dt;
    const here = S.critters.filter(c => c.act === 'gather').length;
    const crowd = here >= Math.min(6, S.critters.length * 0.6) || th.patience <= 0;
    if ((th.wait -= dt) <= 0 && !isNight() && !(crowd && raiseCurtain(th))) th.wait = 3;
  }
  else if (th.phase === 'show') {
    if (th.cast.some(c => !S.critters.includes(c))) return void curtainDown(Object.assign(th, { title: th.play.title, twist: 'an interruption', ending: 'It had to stop early.' }));
    const ready = th.cast.every(c => c.act === 'act');
    if (th.beat < 0) {   // waiting for the cast to get into costume
      if ((th.settle -= dt) > 0) return;             // give the audience a moment to find their seats
      if (!ready && (th.wait -= dt) > 0) return;
      if (!ready) for (const c of th.cast) if (c.act !== 'act') { release(c); c.x = th.x + c.mark; c.y = th.y - 1; c.sink = -LIFT; c.costume = c.role.costume === 'none' || c.role.costume === 'traveller' ? null : c.role.costume; c.stageProp = c.role.prop || null; setAct(c, 'act', 999); }
      th.beat = 0; th.t = 0; playBeat(th, th.play.beats[0]);
    }
    th.curtain = clamp(th.curtain + dt * 0.8, 0, 1);
    if (th.photoT > 0 && (th.photoT -= dt) <= 0) th.wantPhoto = true;   // (render.js takes it, once this frame is drawn)
    if ((th.t += dt) >= th.play.beats[th.beat].d) {
      th.t = 0;
      if (++th.beat >= th.play.beats.length) return void curtainDown(Object.assign(th, { title: th.play.title, twist: th.play.twist, ending: th.play.ending }));
      playBeat(th, th.play.beats[th.beat]);
    }
  }
}
