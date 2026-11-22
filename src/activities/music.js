// Music. Some critters make themselves an instrument (finding a quiet spot to
// do it), and as evening comes on they play. Tunes get made up, named, and
// kept as the town's own songs. If one critter is already playing, others
// with instruments wander over and join in, each taking a different part:
// melody, harmony, bass, a rocking counter-line, rhythm. The rest come to
// listen and dance. The radio turns itself down while they play.
import { S, phase, built, isNight } from '../state.js';
import { STREAM_HALF } from '../config.js';
import { TAU, rand, irand, pick, dist } from '../util.js';
import { log } from '../ui.js';
import { playNote } from '../audio.js';
import { makeInstrument, makeSong, partFor, roleFor, kindOf } from '../data/music.js';
import { instrumentBody, instrumentAtMouth } from '../draw/instrument.js';
import { blob, line } from '../draw/primitives.js';
import { puff } from '../puffs.js';
import { streamPoint } from '../world/geometry.js';
import { note, journalChanged } from '../journal.js';
import { news, nearby } from '../talk.js';
import { duckRadio } from '../radio.js';
import { ACT, goTo, setAct, say, release, tick } from '../sim/core.js';

const now = () => performance.now() / 1000;                       // music runs on real time, whatever the game speed
const musicTime = () => { const p = phase(); return p > 0.5 && p < 0.74; };   // late afternoon through dusk

// ---- making an instrument ----
/** Somewhere pleasant to sit and whittle: under a tree, or by the water. */
function quietSpot(c) {
  const spots = S.trees.filter(t => t.grow === undefined).map(t => ({ x: t.x + (c.x < t.x ? -34 : 34) * t.size, y: t.y + 8 }));
  if (S.pond) { const a = rand(0.15, 0.85) * Math.PI; spots.push({ x: S.pond.x + Math.cos(a) * (S.pond.rx + 22), y: S.pond.y + Math.sin(a) * (S.pond.ry + 18) }); }
  if (S.stream) { const q = streamPoint(rand(0.25, 0.75)); spots.push({ x: q.x + q.nx * (STREAM_HALF + 20), y: q.y + q.ny * (STREAM_HALF + 20) }); }
  return pick(spots) || { x: c.x, y: c.y };
}
export const craft = {
  id: 'craft',
  weight: c => !c.instrument && S.critters.filter(o => o.instrument).length < Math.ceil(S.critters.length * 0.65) ? 0.4 : 0,
  start(c) {
    const p = quietSpot(c);
    goTo(c, p.x, p.y, () => { c.making = makeInstrument(irand(1e6)); setAct(c, 'whittle', rand(18, 26)); c.strikeT = 1; });
  },
  states: {
    whittle: {   // sat quietly, carving
      mood: 'small',
      update(c, dt) {
        if ((c.strikeT -= dt) <= 0) { puff('sawdust', c.x + c.dir * 14 * c.size, c.y - 24 * c.size); c.strikeT = rand(0.6, 1.1); }
        tick(c, dt);
      },
      finish(c) {
        const ins = c.instrument = c.making;
        c.making = null; c.hopV = 120; say(c, '♪', 1.6);
        playNote(ins.voice, ins.family === 'drum' ? 'kick' : 64, 0.05, 0.4);                 // try it out
        playNote(ins.voice, ins.family === 'drum' ? 'tap' : 67, 0.35, 0.5);
        note(`${c.name} made ${/^[aeiou]/.test(ins.name) ? 'an' : 'a'} ${ins.name}.`);
        news(`${c.name} made a ${ins.name}`, nearby(c, 300));
      },
      pose(c, p) { p.bob = -4; p.hl = [-7 + Math.sin(p.now * 7) * 3, -24]; p.hr = [8, -20]; },
      props(c, p) {   // a knife, and the thing taking shape
        blob(2, -20, 8, 4.5, c.making ? c.making.c2 : '#d2a273', c.seed + 6, 7, 0.1, 0.3, 2);
        line([p.HL, [p.HL[0] + 7, p.HL[1] + 3]], c.seed + 7, 2, '#888', 0.1);
      },
    },
  },
};

// ---- playing ----
function startBand(c) {
  const f = built(S.fire) ? S.fire : null, a = rand(TAU);
  const at = f ? { x: f.x + Math.cos(a) * 60, y: f.y + 30 + Math.abs(Math.sin(a)) * 16 } : { x: c.x, y: c.y };
  // Usually one of the town's own tunes; now and then, a new one.
  let song = S.songs.length && (S.songs.length >= 9 || rand() < 0.65) ? pick(S.songs) : null;
  if (!song) {
    song = makeSong(c); S.songs.push(song);
    note(`${c.name} made up ${kindOf(song)}. The town is calling it “${song.name}”.`);
    journalChanged('songs');
  }
  return (S.band = { song, x: at.x, y: at.y, members: [], coming: 0, t0: null, ends: S.clock + rand(48, 70), names: [] });
}
function joinBand(c, band) {
  const i = band.members.length + band.coming, side = i % 2 ? 1 : -1, n = Math.ceil(i / 2);
  band.coming++;
  c.cleanup = () => { band.coming = Math.max(0, band.coming - 1); };
  goTo(c, band.x + side * n * 56, band.y + (n % 2) * 10, () => {   // spread out in a row, room for elbows
    c.cleanup = null; band.coming = Math.max(0, band.coming - 1);
    if (S.band !== band || S.clock > band.ends - 5) return;
    const role = roleFor(c.instrument, band.members.map(m => m.role));
    const part = partFor(band.song, role), spb = 60 / band.song.bpm;
    if (band.t0 === null) { band.t0 = now() + 0.3; duckRadio(true); }
    // start from the next note that hasn't gone by yet
    const beat = (now() - band.t0) / spb, loop = Math.max(0, Math.floor(beat / band.song.beats));
    let idx = loop * part.length;
    while (band.t0 + (Math.floor(idx / part.length) * band.song.beats + part[idx % part.length].b) * spb < now()) idx++;
    band.members.push({ c, role, part, idx });
    // The song remembers who has played which part, so it fills out over time (the journal plays it back that way).
    const known = band.song.parts = band.song.parts || {};
    if (!known[role]) journalChanged('songs');
    known[role] = { voice: c.instrument.voice, instrument: c.instrument.name, by: c.name };
    if (!band.names.includes(c.name)) band.names.push(c.name);
    c.band = band; c.noteT = 9;
    setAct(c, 'perform', 999);
  });
}
export const perform = {
  id: 'perform',
  weight(c) {
    if (!c.instrument) return 0;
    const b = S.band;
    if (b && S.clock < b.ends - 12 && b.members.length + b.coming < 5) return 5;   // somebody's playing: go and join in
    return !b && musicTime() ? 2.6 : 0;
  },
  start(c) {
    if (!S.band) startBand(c);
    joinBand(c, S.band);
  },
  states: {
    perform: {
      mood: 'smile',
      update(c) { if (S.band !== c.band || S.clock > c.band.ends) setAct(c, 'idle', rand(0.5, 2)); },
      pose(c, p) {
        const f = c.instrument.family, k = Math.max(0, 0.22 - c.noteT) * 12, t = p.now, d = p.d;
        p.bob = k;
        if (f === 'flute') { p.hand(d, d * 24, -52); p.hand(-d, d * 12, -51); p.mouth = 'oh'; }
        else if (f === 'horn') { p.hand(d, d * 20, -40); p.mouth = 'oh'; }
        else if (f === 'strings') { p.hand(d, d * 7, -24 + Math.sin(t * 12) * (k > 0 ? 3 : 0.6)); p.hand(-d, -d * 16, -37); }
        else { const up = k > 0 ? 8 : 0, s = Math.sin(t * 9) > 0; p.hl = [-7 + (d > 0 ? 18 : 0) - 10, -30 - (s ? up : 0)]; p.hr = [7 + (d > 0 ? 18 : 0) + 4 - (d < 0 ? 28 : 0), -30 - (s ? 0 : up)]; }
      },
      props(c, p) { instrumentBody(c.instrument, p, c.seed + 6); },
      over(c, p) { instrumentAtMouth(c.instrument, p, c.seed + 6, -57 - p.bob); },
    },
    listening: {   // stood nearby, swaying along
      mood: 'smile',
      update(c, dt) { if (!S.band || (c.t -= dt) <= 0) setAct(c, 'idle', rand(0.5, 2)); },
      pose(c, p) { p.rock = Math.sin(p.now * 3 + c.seed) * 0.07; p.bob = Math.abs(Math.sin(p.now * 3 + c.seed)) * 1.5; },
    },
  },
};
/** Come and listen, or dance. */
export const audience = {
  id: 'musicAudience',
  weight: () => S.band && S.band.t0 !== null && S.clock < S.band.ends - 6 ? 3.2 : 0,
  start(c) {
    const b = S.band, a = Math.PI * rand(0.15, 0.85);
    c.nextWalk = 'skip';
    goTo(c, b.x + Math.cos(a) * rand(90, 150), b.y + 30 + Math.sin(a) * rand(30, 70), () => {
      if (S.band !== b) return;
      c.dir = b.x > c.x ? 1 : -1;
      if (rand() < 0.5) ACT.dance.start(c); else { setAct(c, 'listening', rand(8, 16)); if (rand() < 0.4) say(c, pick(['♥', '♪', 'lovely']), 1.4); }
    });
  },
};

/** Called every frame from sim/world.js: plays the notes that are due and winds the band up when it's time. */
export function updateMusic(dt) {
  for (const c of S.critters) if (c.noteT !== undefined) c.noteT += dt;
  const band = S.band;
  if (!band) return;
  band.members = band.members.filter(m => m.c.act === 'perform' && S.critters.includes(m.c));
  if (band.t0 !== null) {
    const spb = 60 / band.song.bpm, t = now();
    for (const m of band.members) {
      for (let guard = 0; guard < 16; guard++) {
        const n = m.part[m.idx % m.part.length], at = band.t0 + (Math.floor(m.idx / m.part.length) * band.song.beats + n.b) * spb;
        if (at > t + 0.15) break;
        if (at > t - 0.1) {
          playNote(m.c.instrument.voice, n.midi, at - t, n.d * spb, n.vel);
          m.c.noteT = 0;
          if (n.vel > 0.5 && rand() < 0.5) puff('note', m.c.x + rand(-8, 8), m.c.y - 92 * m.c.size, 0, m.c.instrument.c1);
        }
        m.idx++;
      }
    }
  }
  const over = S.clock > band.ends || (band.t0 !== null && !band.members.length && !band.coming) || (isNight() && phase() > 0.9);
  if (!over) return;
  S.band = null; duckRadio(false);
  for (const m of band.members) { release(m.c); setAct(m.c, 'idle', rand(1, 3)); m.c.hopV = 80; }
  for (const c of S.critters) if (c.act === 'listening' || (c.act === 'dance' && dist(c, band) < 220)) { if (rand() < 0.6) say(c, pick(['bravo!', 'more!', '♥', 'again!']), 1.5); c.hopV = rand(50, 110); }
  if (band.names.length > 1) note(`${band.names.slice(0, -1).join(', ')} and ${band.names[band.names.length - 1]} played “${band.song.name}” together.`);
  else if (band.names.length) log(`${band.names[0]} played “${band.song.name}”.`);
}
