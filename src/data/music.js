// Instruments and songs, both made up on the spot.
//
// An instrument belongs to a family (which decides how it's held, drawn and
// roughly how it sounds) and has a `voice`: a handful of numbers picked from
// its seed that shape the sound, so every one is a little different.
//
// A song is a short looping melody in some scale, with a chord per bar. From
// that one tune each player derives their own part: see partFor().
import { S } from '../state.js';
import { hs, rand, irand, pick } from '../util.js';
import { PETALS } from '../config.js';

const KINDS = {
  flute: ['reed whistle', 'willow flute', 'bark pipe', 'hollow-stem flute'],
  strings: ['three-string twanger', 'gourd lute', 'plank banjo', 'apple-wood fiddle'],
  mallet: ['pebble xylophone', 'bottle chimes', 'thumb piano', 'stick glockenspiel'],
  drum: ['gourd drum', 'log drum', 'bucket drum', 'rattle drum'],
  horn: ['bark horn', 'shell horn', 'bent-tube horn', 'snail-shell horn'],
};
export const FAMILIES = Object.keys(KINDS);

export function makeInstrument(seed) {
  const r = i => hs(seed, i);
  // Mostly whatever the town has least of, so a band has a bit of everything.
  const have = f => S.critters.filter(c => c.instrument && c.instrument.family === f).length;
  const family = r(1) < 0.3 ? FAMILIES[Math.floor(r(2) * FAMILIES.length)] : FAMILIES.slice().sort((a, b) => have(a) - have(b) || hs(seed, a.length) - hs(seed, b.length))[0];
  const voice = { family, detune: (r(3) - 0.5) * 26 };
  if (family === 'flute') Object.assign(voice, { wave: r(4) < 0.55 ? 'sine' : 'triangle', oct: r(5) < 0.6 ? 1 : 2, vib: 2 + r(6) * 6, vibRate: 4 + r(7) * 3.5, attack: 0.03 + r(8) * 0.06 });
  else if (family === 'strings') Object.assign(voice, { wave: ['triangle', 'sawtooth', 'square'][Math.floor(r(4) * 3)], oct: r(5) < 0.5 ? 0 : 1, decay: 0.35 + r(6) * 0.6, cutoff: 1200 + r(7) * 2600 });
  else if (family === 'mallet') Object.assign(voice, { harm: [2.76, 3, 4, 5.4][Math.floor(r(4) * 4)], oct: r(5) < 0.5 ? 1 : 2, decay: 0.25 + r(6) * 0.5 });
  else if (family === 'horn') Object.assign(voice, { wave: r(4) < 0.6 ? 'sawtooth' : 'square', oct: -1, cutoff: 480 + r(5) * 760, attack: 0.05 + r(6) * 0.07 });
  else Object.assign(voice, { tone: 80 + r(4) * 100, snap: 900 + r(5) * 2600, decay: 0.12 + r(6) * 0.2 });
  return { family, name: KINDS[family][Math.floor(r(9) * 4)], seed, voice, c1: PETALS[Math.floor(r(10) * PETALS.length)], c2: ['#d2a273', '#c9966b', '#e9c9a0', '#b08a5a'][Math.floor(r(11) * 4)] };
}

// ---- songs ----
const SCALES = [[0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10]];   // major and minor pentatonic, major, minor
const RHYTHMS = [[1, 1, 1, 1], [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 0.5, 0.5, 1], [1.5, 0.5, 1, 1], [2, 1, 1], [1, 1, 2], [0.5, 0.5, 0.5, 0.5, 2]];
/** Scale degree `deg` of `song` as a MIDI note (degrees past the top of the scale carry on up the octave). */
export function pitch(song, deg, oct = 0) {
  const n = song.scale.length;
  return song.root + 12 * oct + song.scale[((deg % n) + n) % n] + 12 * Math.floor(deg / n);
}
function phrase(start, top) {   // two bars: a little walk up and down the scale
  const notes = [];
  let b = 0, deg = start;
  for (const rhythm of [pick(RHYTHMS), pick(RHYTHMS)]) for (const d of rhythm) {
    notes.push({ b, d, deg });
    b += d; deg = Math.max(-1, Math.min(top, deg + pick([-2, -1, -1, 0, 1, 1, 2])));
  }
  return notes;
}
function songName(by) {
  const o = [`${by.name}'s Tune`, 'Fireside Song', 'Three Apples', 'Evening in the Meadow', 'The Slow Way Home', 'Song for Nobody in Particular'];
  if (S.pond) o.push('Pond Waltz', 'Something in the Pond');
  if (S.stream) o.push('The Stream Song', 'Jumping the Stream');
  if (S.bridge) o.push('Bridge Song');
  if (S.ducks) o.push('Lullaby for the Ducks', 'Three Ducks');
  if (S.stones.length) o.push('Song for a Fallen Star');
  if (S.monument) o.push('March of the Monument');
  if (S.critters.some(c => c.hat)) o.push("The Hatmaker's Jig");
  if (S.away.length || S.critters.some(c => c.story)) o.push('The Long Way Round');
  const free = o.filter(n => !S.songs.some(s => s.name === n));
  return pick(free.length ? free : o) || 'Untitled';
}
/** Make up a new tune: 4 bars, form A A' B A-ish, ending at home. */
export function makeSong(by) {
  const scale = pick(SCALES), top = scale.length + 2;
  const A = phrase(pick([0, 2, scale.length - 1]), top), B = phrase(pick([2, 3, 4]), top);
  const second = rand() < 0.5 ? A.map(n => ({ ...n })) : B;
  const melody = [...A, ...second.map(n => ({ ...n, b: n.b + 8 }))];
  const last = melody[melody.length - 1];
  last.deg = pick([0, scale.length]); last.d = 16 - last.b;   // come to rest on the home note
  const five = scale.length === 5;
  return {
    id: ++S.songId, name: songName(by), by: by.name, day: Math.floor(S.clock / 300) + 1,
    root: 55 + irand(9), scale, bpm: 78 + irand(30), beats: 16, melody,
    chords: [0, five ? 2 : 3, five ? 3 : 4, 0],   // which scale degree each bar leans on
  };
}

/**
 * One player's part in a song, as a list of { b: beat, d: beats long, midi, vel }.
 *   melody   the tune itself        harmony  the tune, a third or so higher, quieter
 *   bass     the bar's home note    counter  a rocking pattern through the chord
 *   rhythm   kick / tap / shake
 */
export function partFor(song, role) {
  const out = [];
  if (role === 'melody') for (const n of song.melody) out.push({ b: n.b, d: n.d, midi: pitch(song, n.deg), vel: 1 });
  else if (role === 'harmony') for (const n of song.melody) out.push({ b: n.b, d: n.d, midi: pitch(song, n.deg + 2), vel: 0.55 });
  else song.chords.forEach((root, bar) => {
    const b = bar * 4;
    if (role === 'bass') out.push({ b, d: 2, midi: pitch(song, root, -1), vel: 0.9 }, { b: b + 2, d: 2, midi: pitch(song, root + 2, -1), vel: 0.7 });
    else if (role === 'counter') [0, 2, 4, 2].forEach((up, i) => out.push({ b: b + i, d: 1, midi: pitch(song, root + up), vel: 0.45 }));
    else out.push({ b, d: 0.5, midi: 'kick', vel: 1 }, { b: b + 1, d: 0.5, midi: 'tap', vel: 0.8 }, { b: b + 2, d: 0.5, midi: 'kick', vel: 0.9 }, { b: b + 3, d: 0.5, midi: 'tap', vel: 0.8 },
      ...[0.5, 1.5, 2.5, 3.5].map(o => ({ b: b + o, d: 0.25, midi: 'shake', vel: 0.5 })));
  });
  return out.sort((p, q) => p.b - q.b);
}
/** Which part a newcomer takes, given their instrument and what the band already has. */
export function roleFor(instrument, taken) {
  if (instrument.family === 'drum') return 'rhythm';
  if (instrument.family === 'horn' && !taken.includes('bass')) return 'bass';
  return ['melody', 'harmony', 'bass', 'counter'].find(r => !taken.includes(r)) || 'counter';
}
