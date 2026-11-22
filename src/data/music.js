// Instruments and songs, both made up on the spot.
//
// An instrument belongs to a family (which decides how it's held, drawn and
// roughly how it sounds) and has a `voice`: a handful of numbers picked from
// its seed that shape the sound, so every one is a little different.
//
// A song is a looping melody in some scale, with a chord per bar, made up in
// one of the STYLES below (a waltz, a jig, a shuffle, a round...). The style
// decides the scale, the time it's in, how the tune moves, and what the bass,
// the backing and the drums do. From that one tune each player derives their
// own part: see partFor().
import { S } from '../state.js';
import { hs, rand, irand, pick, clamp } from '../util.js';
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
const SCALES = {
  pentMaj: [0, 2, 4, 7, 9], pentMin: [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], harmMin: [0, 2, 3, 5, 7, 8, 11],
  spicy: [0, 1, 4, 5, 7, 8, 10], blues: [0, 3, 5, 6, 7, 10], whole: [0, 2, 4, 6, 8, 10], insen: [0, 1, 5, 7, 10], hira: [0, 2, 3, 7, 8],
};
// Chords (as scale degrees) for four bars, by how many notes the scale has.
const PROGS = {
  5: [[0, 2, 3, 0], [0, 3, 2, 0], [0, 0, 3, 2], [0, 4, 3, 0]],
  6: [[0, 2, 4, 0], [0, 0, 2, 4], [0, 2, 0, 4]],
  7: [[0, 3, 4, 0], [0, 5, 3, 4], [0, 4, 5, 3], [0, 0, 3, 4], [0, 3, 0, 4]],
};
const T = 1 / 3;
const arp = (offs, d, vel) => offs.map((o, i) => [i * d, o, d, vel]);
const offbeats = m => Array.from({ length: m }, (_, i) => [i + 0.5, i % 2 ? 4 : 2, 0.3, 0.4]);
const stabs = (...beats) => beats.flatMap(b => [[b, 2, 0.4, 0.4], [b, 4, 0.4, 0.4]]);
/**
 * The kinds of tune the critters make up.
 *   m        beats in a bar            unit    bars in a phrase (2 unless said)
 *   rhythms  ways to fill a bar (note lengths in beats; a negative one is a rest)
 *   steps    how the tune moves from note to note, in scale steps
 *   same     how likely a bar is to repeat the rhythm of the one before
 *   grace    how often a note gets a little flick before it
 *   bass, counter   [beat, scale steps above the bar's chord ('f' = a fifth), length, loudness]
 *   drums    [beat, 'kick' | 'tap' | 'shake', loudness]
 *   harmony  third | under | sparse | canon (the tune again, a bar behind)
 *   drone    stays on the home chord       swing   how late the off-beats come
 */
const STYLES = [
  { id: 'air', a: 'a slow air', m: 4, bpm: [62, 78], scales: ['major', 'pentMaj', 'lydian', 'minor'], names: ['The Slow Way Home', 'Evening in the Meadow', "%'s Air"],
    rhythms: [[2, 2], [2, 1, 1], [1, 1, 2], [3, 1], [1.5, 0.5, 2], [4]], steps: [-2, -1, -1, 0, 1, 1, 2, 3], same: 0.4, grace: 0.15, harmony: 'sparse',
    bass: [[0, 0, 3, 0.85], [3, 4, 1, 0.6]], counter: arp([0, 2, 4, 2, 0, 2, 4, 2], 0.5, 0.35), drums: [[0, 'kick', 0.6], [2, 'shake', 0.4], [3, 'shake', 0.3]] },
  { id: 'waltz', a: 'a waltz', m: 3, bpm: [104, 136], scales: ['major', 'minor', 'lydian', 'harmMin'], names: ['Waltz for Two Left Feet', "%'s Waltz", 'Round and Round the Fire'],
    rhythms: [[1, 1, 1], [2, 1], [1, 0.5, 0.5, 1], [3], [1.5, 0.5, 1], [2, 0.5, 0.5]], steps: [-3, -2, -1, -1, 1, 1, 2, 4], same: 0.5, harmony: 'third',
    bass: [[0, 0, 2.5, 0.9]], counter: stabs(1, 2), drums: [[0, 'kick', 0.9], [1, 'tap', 0.5], [2, 'tap', 0.5]] },
  { id: 'jig', a: 'a jig', m: 2, unit: 4, bpm: [96, 116], scales: ['dorian', 'major', 'mixo', 'pentMaj'], names: ['Muddy Feet Jig', "%'s Jig", 'Skipping Stones'],
    rhythms: [[2 * T, T, 2 * T, T], [T, T, T, T, T, T], [2 * T, T, 1], [1, 2 * T, T], [T, T, T, 1], [1, 1]], steps: [-2, -1, -1, 0, 1, 1, 2], same: 0.55, grace: 0.2, harmony: 'third',
    bass: [[0, 0, 1, 0.9], [1, 4, 1, 0.7]], counter: [[2 * T, 2, 0.3, 0.4], [1 + 2 * T, 4, 0.3, 0.4]],
    drums: [[0, 'kick', 1], [1, 'tap', 0.8], [T, 'shake', 0.35], [2 * T, 'shake', 0.5], [1 + T, 'shake', 0.35], [1 + 2 * T, 'shake', 0.5]] },
  { id: 'march', a: 'a march', m: 4, bpm: [108, 124], scales: ['major', 'mixo', 'pentMaj'], names: ['March of the Small Feet', "%'s March", 'Off to Find Apples'],
    rhythms: [[1, 1, 1, 1], [0.75, 0.25, 1, 0.75, 0.25, 1], [1, 0.75, 0.25, 2], [0.5, 0.5, 1, 0.5, 0.5, 1], [1, 1, 2]], steps: [-3, -2, -1, 0, 0, 1, 2, 3, 4], same: 0.5, harmony: 'third',
    bass: [[0, 0, 0.8, 0.9], [1, 4, 0.8, 0.7], [2, 0, 0.8, 0.9], [3, 4, 0.8, 0.7]], counter: offbeats(4),
    drums: [[0, 'kick', 1], [1, 'tap', 0.8], [2, 'kick', 0.9], [3, 'tap', 0.8], [3.5, 'tap', 0.4], [3.75, 'tap', 0.55]] },
  { id: 'shuffle', a: 'a shuffle', m: 4, swing: 0.17, bpm: [84, 104], scales: ['blues', 'pentMin', 'dorian'], names: ['Rainy Day Shuffle', 'The Grumbling Tummy Blues', "%'s Shuffle"],
    rhythms: [[1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 2], [-0.5, 0.5, 1, 0.5, 0.5, 1], [1.5, 0.5, 2], [1, 1, -0.5, 0.5, 1]], steps: [-2, -1, -1, 0, 1, 1, 2], same: 0.5, grace: 0.1, harmony: 'sparse',
    bass: [[0, 0, 1, 0.9], [1, 2, 1, 0.7], [2, 4, 1, 0.8], [3, 2, 1, 0.7]], counter: stabs(1, 3),
    drums: [[0, 'kick', 1], [1, 'tap', 0.8], [2, 'kick', 0.9], [3, 'tap', 0.8], ...[0.5, 1.5, 2.5, 3.5].map(b => [b, 'shake', 0.5])] },
  { id: 'reel', a: 'a reel', m: 4, bpm: [118, 136], scales: ['dorian', 'mixo', 'minor', 'pentMin'], names: ['Chasing the Ball', 'The Windy Day Reel', "%'s Reel"],
    rhythms: [[0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], [1, 0.5, 0.5, 0.5, 0.5, 1], [0.5, 0.5, 1, 0.5, 0.5, 1], [0.5, 0.5, 0.5, 0.5, 1, 1], [1, 1, 0.5, 0.5, 1]], steps: [-2, -1, -1, 0, 1, 1, 2], same: 0.5, grace: 0.12, harmony: 'third',
    bass: [[0, 0, 1.5, 0.9], [1.5, 0, 0.5, 0.6], [2, 4, 1.5, 0.8], [3.5, 4, 0.5, 0.6]], counter: offbeats(4),
    drums: [[0, 'kick', 1], [1, 'tap', 0.8], [2, 'kick', 0.9], [3, 'tap', 0.8], ...[0.5, 1.5, 2.5, 3.5].map(b => [b, 'shake', 0.45])] },
  { id: 'lullaby', a: 'a lullaby', m: 3, bpm: [72, 88], scales: ['pentMaj', 'major'], names: ['Lullaby for a Sleepy Town', 'Hammock Song', "%'s Lullaby"],
    rhythms: [[2, 1], [3], [1, 1, 1], [1, 2]], steps: [-2, -1, -1, -1, 0, 1, 2], same: 0.6, harmony: 'under',
    bass: [[0, 0, 3, 0.7]], counter: arp([0, 2, 4], 1, 0.3), drums: [[0, 'shake', 0.3], [2, 'shake', 0.2]] },
  { id: 'round', a: 'a round', m: 4, drone: true, bpm: [84, 100], scales: ['pentMaj', 'pentMin'], names: ['Follow Me Round', 'Round for the Fireside', "%'s Round"],
    rhythms: [[1, 1, 2], [1, 1, 1, 1], [2, 2], [0.5, 0.5, 1, 2], [1, 0.5, 0.5, 2]], steps: [-2, -1, -1, 1, 1, 2], same: 0.3, harmony: 'canon',
    bass: [[0, 0, 4, 0.7], [0, 'f', 4, 0.45]], counter: [[1, 2, 1, 0.3], [3, 4, 1, 0.3]], drums: [[0, 'kick', 0.6], [2, 'tap', 0.4]] },
  { id: 'lantern', a: 'a lantern song', m: 4, drone: true, bpm: [66, 82], scales: ['insen', 'hira'], names: ['Lantern Song', 'Moon on the Water', 'Paper Boats'],
    rhythms: [[2, -1, 1], [1, 1, -2], [3, 1], [1, -1, 1, 1], [0.5, 0.5, 3], [4]], steps: [-2, -1, -1, 0, 1, 1, 2], same: 0.3, grace: 0.3, harmony: 'sparse',
    bass: [[0, 0, 4, 0.7], [0, 'f', 4, 0.45]], counter: [[2.5, 0, 0.5, 0.35], [3, 2, 0.5, 0.35], [3.5, 4, 0.5, 0.35]], drums: [[0, 'kick', 0.5], [3, 'tap', 0.3], [3.5, 'tap', 0.4]] },
  { id: 'limp', a: 'a limping dance', m: 5, bpm: [108, 126], scales: ['spicy', 'dorian', 'harmMin'], names: ['The Limping Dance', 'One Shoe Off', 'Five Steps Home'],
    rhythms: [[1, 1, 1, 1, 1], [1, 1, 1, 2], [1, 0.5, 0.5, 1, 1, 1], [2, 1, 1, 1], [1, 2, 1, 1], [3, 2]], steps: [-2, -1, -1, 0, 1, 1, 2], same: 0.6, grace: 0.15, harmony: 'third',
    bass: [[0, 0, 2.5, 0.9], [3, 4, 1.5, 0.75]], counter: [[1, 2, 0.5, 0.4], [2, 4, 0.5, 0.4], [4, 2, 0.5, 0.4]],
    drums: [[0, 'kick', 1], [1, 'shake', 0.4], [2, 'shake', 0.4], [3, 'tap', 0.8], [4, 'shake', 0.4]] },
  { id: 'lopsided', a: 'a lopsided dance', m: 3.5, bpm: [112, 132], scales: ['dorian', 'spicy', 'mixo'], names: ['The Lopsided Dance', 'Seven Pebbles', 'Tripping Over Roots'],
    rhythms: [[1, 1, 1.5], [0.5, 0.5, 1, 1.5], [1, 1, 0.5, 0.5, 0.5], [2, 1.5], [1, 0.5, 0.5, 1.5]], steps: [-2, -1, -1, 0, 1, 1, 2], same: 0.6, harmony: 'third',
    bass: [[0, 0, 1.8, 0.9], [2, 4, 1.3, 0.75]], counter: [[1, 2, 0.4, 0.4], [2.5, 4, 0.4, 0.4], [3, 2, 0.4, 0.4]],
    drums: [[0, 'kick', 1], [1, 'tap', 0.6], [2, 'kick', 0.8], [2.5, 'shake', 0.4], [3, 'tap', 0.6]] },
  { id: 'sunny', a: 'a sunny tune', m: 4, bpm: [100, 116], scales: ['major', 'pentMaj', 'mixo'], names: ['Sunny Side of the Meadow', 'Apples in the Sun', "%'s Holiday"],
    rhythms: [[1.5, 1.5, 1], [0.5, 1, 1, 1, 0.5], [1.5, 1, 1.5], [0.5, 1, 0.5, 2], [1, 0.5, 1, 0.5, 1]], steps: [-2, -1, -1, 0, 1, 1, 2, 4], same: 0.55, harmony: 'third',
    bass: [[0, 0, 1.4, 0.9], [1.5, 4, 1.4, 0.7], [3, 0, 0.9, 0.8]], counter: [...stabs(0.5, 2.5), [2, 2, 0.4, 0.35], [3.5, 2, 0.4, 0.35]],
    drums: [[0, 'kick', 1], [1.5, 'kick', 0.7], [3, 'tap', 0.8], ...[0.5, 1, 2, 2.5, 3.5].map(b => [b, 'shake', 0.45])] },
  { id: 'dream', a: 'a dreamy tune', m: 4, bpm: [60, 74], scales: ['whole', 'lydian'], progs: [[0, 1, 0, 1], [0, 1, 0, 2]], names: ['Half Asleep', 'Cloud Watching', 'What the Fish Dreamt'],
    rhythms: [[2, 2], [1, 1, 2], [3, 1], [1, 3], [1, 1, 1, 1], [4]], steps: [-2, -2, -1, 1, 2, 2, 3], same: 0.3, harmony: 'third',
    bass: [[0, 0, 4, 0.6]], counter: arp([0, 2, 4, 6, 4, 2, 4, 2], 0.5, 0.3), drums: [[0, 'shake', 0.25], [2, 'shake', 0.2]] },
  { id: 'stomp', a: 'a stomp', m: 4, bpm: [92, 108], scales: ['pentMin', 'minor', 'dorian'], names: ['The Big Stomp', 'Stomping Song', 'Mud Up to the Knees'],
    rhythms: [[1, 1, 1, -1], [1, -1, 1, 1], [0.5, 0.5, 1, 2], [1, 1, 0.5, 0.5, 1], [2, 1, -1]], steps: [-2, -1, 0, 0, 1, 2, 3], same: 0.65, harmony: 'under',
    bass: [[0, 0, 0.5, 1], [1, 0, 0.5, 0.8], [2, 0, 0.5, 1], [2.5, 0, 0.5, 0.6], [3, 4, 0.5, 0.8]], counter: stabs(1, 3),
    drums: [[0, 'kick', 1], [1, 'kick', 0.9], [2, 'kick', 1], [3, 'tap', 1], [3.5, 'tap', 0.6]] },
];
const styleOf = song => STYLES.find(s => s.id === song.style);
/** "a waltz", "a jig"... or just "a tune" for the ones made before styles. */
export const kindOf = song => (styleOf(song) || { a: 'a tune' }).a;

/** Scale degree `deg` of `song` as a MIDI note (degrees past the top of the scale carry on up the octave). */
export function pitch(song, deg, oct = 0) {
  const n = song.scale.length;
  return song.root + 12 * oct + song.scale[((deg % n) + n) % n] + 12 * Math.floor(deg / n);
}
function songName(by, st) {
  const o = [`${by.name}'s Tune`, 'Fireside Song', 'Three Apples', 'Song for Nobody in Particular'];
  if (S.pond) o.push('Something in the Pond');
  if (S.stream) o.push('The Stream Song', 'Jumping the Stream');
  if (S.bridge) o.push('Bridge Song');
  if (S.ducks) o.push('Three Ducks');
  if (S.stones.length) o.push('Song for a Fallen Star');
  if (S.away.length || S.critters.some(c => c.story)) o.push('The Long Way Round');
  const unused = l => l.filter(n => !S.songs.some(s => s.name === n));
  const own = unused(st.names.map(n => n.replace('%', by.name))), free = unused(o);
  return (own.length && (rand() < 0.7 || !free.length) ? pick(own) : pick(free.length ? free : o)) || 'Untitled';
}
/** The nearest note of the bar's chord (its root, third or fifth, in scale steps) to `deg`. */
function chordTone(deg, chord, n) {
  let best = deg, far = 99;
  for (let k = -2; k <= 2; k++) for (const o of [0, 2, 4]) { const t = chord + o + n * k; if (Math.abs(t - deg) < far) { far = Math.abs(t - deg); best = t; } }
  return best;
}
/** One phrase: a walk through the scale over `chords` (one per bar), leaning on each bar's chord at its start. */
function phrase(st, n, chords, start) {
  const notes = [], lo = -2, hi = n + 2;
  let deg = start, prev = null;
  chords.forEach((chord, bar) => {
    const rhythm = prev && rand() < st.same ? prev : pick(st.rhythms);
    let b = bar * st.m, first = true;
    prev = rhythm;
    for (const d of rhythm) {
      if (d > 0) {
        if (first && rand() < 0.7) deg = chordTone(deg, chord, n);
        const note = { b, d, deg };
        if (st.grace && !first && d >= 0.5 && rand() < st.grace) note.g = 1;
        notes.push(note);
        deg = clamp(deg + pick(st.steps), lo, hi);
      }
      first = false; b += Math.abs(d);
    }
  });
  return notes;
}
/** The same phrase again, but going somewhere else in its last bar. */
function varied(A, st, n, bars) {
  const from = (bars - 1) * st.m - 0.001, out = A.map(x => ({ ...x }));
  let deg = null;
  for (const x of out) if (x.b >= from) { if (deg === null) deg = x.deg; else x.deg = deg; deg = clamp(deg + pick(st.steps), -2, n + 2); }
  return out;
}
const shifted = (A, by, n) => A.map(x => ({ ...x, deg: clamp(x.deg + by, -2, n + 2) }));
/** Make up a new tune in a style the town hasn't tried yet (if there is one): four phrases, ending at home. */
export function makeSong(by) {
  const fresh = STYLES.filter(s => !S.songs.some(o => o.style === s.id)), st = pick(fresh.length ? fresh : STYLES);
  const scale = SCALES[pick(st.scales)], n = scale.length, unit = st.unit || 2, bars = unit * 4, hold = unit / 2;
  // a chord for each bar: two four-chord turns, the second one coming home
  const progs = st.progs || PROGS[n], first = pick(progs), second = pick(progs).slice();
  if (!st.progs) second[2] = n === 5 ? 3 : 4;
  second[3] = 0;
  const chords = [...first, ...second].flatMap(ch => Array(hold).fill(st.drone ? 0 : ch));
  const of = u => chords.slice(u * unit, (u + 1) * unit);
  // four phrases: the first comes back, changed, sequenced or answered
  const A = phrase(st, n, of(0), pick([0, 2, n - 1])), B = phrase(st, n, of(2), pick([2, 3, 4]));
  const form = pick([[A, varied(A, st, n, unit), B, A], [A, shifted(A, pick([-1, 1, 2]), n), B, varied(A, st, n, unit)], [A, B, A, varied(B, st, n, unit)], [A, varied(A, st, n, unit), shifted(A, 2, n), A]]);
  const melody = form.flatMap((ph, u) => ph.map(x => ({ ...x, b: x.b + u * unit * st.m })));
  // come to rest on the home note for the back half of the last bar
  const beats = bars * st.m, lastBar = beats - st.m, rest = lastBar + (st.m >= 3 ? Math.floor(st.m / 2) : 0);
  while (melody.length > 1 && melody[melody.length - 1].b >= rest - 0.001) melody.pop();
  const end = melody[melody.length - 1];
  if (end.b + end.d > rest) end.d = rest - end.b;
  melody.push({ b: rest, d: beats - rest, deg: pick([0, 0, n]) });
  const [slow, fast] = st.bpm;
  return {
    id: ++S.songId, name: songName(by, st), by: by.name, day: Math.floor(S.clock / 300) + 1,
    style: st.id, meter: st.m, root: 53 + irand(11), scale, bpm: slow + irand(fast - slow + 1), beats, melody, chords,
  };
}

/** Tunes from before there were styles: four bars of four, one plain backing. */
function oldPart(song, role) {
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
  return out;
}
/**
 * One player's part in a song, as a list of { b: beat, d: beats long, midi, vel }.
 *   melody   the tune itself        harmony  the tune a little higher or lower, or a bar behind
 *   bass     the bottom of each bar counter  the backing: arpeggios, off-beats, stabs
 *   rhythm   kick / tap / shake
 * What the last three actually play depends on the song's style.
 */
export function partFor(song, role) {
  const st = styleOf(song);
  let out = [];
  if (!st) out = oldPart(song, role);
  else if (role === 'melody') {
    for (const n of song.melody) {
      if (n.g) out.push({ b: n.b - 0.13, d: 0.13, midi: pitch(song, n.deg + 1), vel: 0.5 });
      out.push({ b: n.b, d: n.d, midi: pitch(song, n.deg), vel: Math.abs(n.b % st.m) < 0.01 ? 1 : 0.85 });   // lean on the first beat of the bar
    }
  } else if (role === 'harmony') {
    const h = st.harmony;
    for (const n of song.melody) {
      if (h === 'canon') out.push({ b: (n.b + st.m) % song.beats, d: n.d, midi: pitch(song, n.deg), vel: 0.6 });
      else if (h !== 'sparse' || n.d >= 1) out.push({ b: n.b, d: n.d, midi: pitch(song, n.deg + (h === 'under' ? -2 : 2)), vel: 0.5 });
    }
  } else song.chords.forEach((root, bar) => {
    const b0 = bar * st.m;
    if (role === 'rhythm') for (const [b, hit, vel] of st.drums) out.push({ b: b0 + b, d: 0.25, midi: hit, vel });
    else for (const [b, up, d, vel] of role === 'bass' ? st.bass : st.counter) {
      const oct = role === 'bass' ? -1 : 0;
      out.push({ b: b0 + b, d, midi: up === 'f' ? pitch(song, root, oct) + 7 : pitch(song, root + up, oct), vel });
    }
  });
  if (st && st.swing) for (const n of out) if (Math.abs((n.b % 1) - 0.5) < 0.01) n.b += st.swing;   // off-beats come late
  return out.sort((p, q) => p.b - q.b);
}
/** Which part a newcomer takes, given their instrument and what the band already has. */
export function roleFor(instrument, taken) {
  if (instrument.family === 'drum') return 'rhythm';
  if (instrument.family === 'horn' && !taken.includes('bass')) return 'bass';
  return ['melody', 'harmony', 'bass', 'counter'].find(r => !taken.includes(r)) || 'counter';
}
