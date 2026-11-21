// The sound the critters' instruments make, synthesised with Web Audio (no
// sound files). Browsers only allow audio after the visitor has clicked or
// pressed something, so nothing plays until then; the music still happens on
// screen. Each instrument's `voice` (data/music.js) shapes its sound, so no
// two are quite alike.
import { S } from './state.js';

let ac = null, master = null, noise = null;

/** Call from any click or key press: creates (or wakes) the audio context. */
export function unlockAudio() {
  try {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.2;
      const squash = ac.createDynamicsCompressor();
      master.connect(squash); squash.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { /* no audio here: the music is just silent */ }
}
export const audioReady = () => !!ac && ac.state === 'running' && S.sound;
const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

function envelope(attack, hold, release, peak) {
  const g = ac.createGain(), t = env.t;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  g.connect(master);
  return g;
}
const env = { t: 0 };
function osc(type, freq, detune, out, stop) {
  const o = ac.createOscillator();
  o.type = type; o.frequency.value = freq; o.detune.value = detune || 0;
  o.connect(out); o.start(env.t); o.stop(stop);
  return o;
}
function hiss(out, stop, rate = 1) {
  const n = ac.createBufferSource();
  n.buffer = noise; n.loop = true; n.playbackRate.value = rate;
  n.connect(out); n.start(env.t); n.stop(stop);
}

/**
 * Play one note. `inSeconds` is how far in the future it should sound, `dur`
 * its length in seconds, `vel` its loudness (0..1). For drums, `midi` is
 * 'kick', 'tap' or 'shake' instead of a pitch.
 */
export function playNote(voice, midi, inSeconds, dur, vel = 1) {
  if (!audioReady()) return;
  const t = env.t = ac.currentTime + Math.max(0, inSeconds), v = voice, f = typeof midi === 'number' ? hz(midi + 12 * (v.oct || 0)) : 0;
  switch (v.family) {
    case 'flute': {       // a pure tone with a wobble, soft at the start
      const g = envelope(v.attack, Math.max(0.02, dur - v.attack), 0.09, 0.5 * vel), o = osc(v.wave, f, v.detune, g, t + dur + 0.2);
      const lfo = ac.createOscillator(), depth = ac.createGain();
      lfo.frequency.value = v.vibRate; depth.gain.value = v.vib; lfo.connect(depth); depth.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.2);
      break;
    }
    case 'strings': {     // plucked: bright at first, dying away
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(v.cutoff, t); lp.frequency.exponentialRampToValueAtTime(400, t + v.decay);
      const g = envelope(0.005, 0.01, v.decay, 0.55 * vel); lp.connect(g);
      osc(v.wave, f, v.detune, lp, t + v.decay + 0.1);
      break;
    }
    case 'mallet': {      // struck: a clear tone plus a ringing overtone
      const g = envelope(0.003, 0.01, v.decay, 0.6 * vel), g2 = ac.createGain(); g2.gain.value = 0.3; g2.connect(g);
      osc('sine', f, v.detune, g, t + v.decay + 0.1); osc('sine', f * v.harm, 0, g2, t + v.decay * 0.5 + 0.05);
      break;
    }
    case 'horn': {        // buzzy and low, swelling in
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = v.cutoff; lp.Q.value = 2;
      const g = envelope(v.attack, Math.max(0.02, dur - v.attack), 0.12, 0.4 * vel); lp.connect(g);
      osc(v.wave, f, v.detune, lp, t + dur + 0.2);
      break;
    }
    default: {            // drums
      if (midi === 'kick') {
        const g = envelope(0.004, 0.01, v.decay, 0.9 * vel), o = osc('sine', v.tone, 0, g, t + v.decay + 0.1);
        o.frequency.setValueAtTime(v.tone * 1.8, t); o.frequency.exponentialRampToValueAtTime(v.tone * 0.5, t + v.decay);
      } else {
        const bp = ac.createBiquadFilter(), tap = midi === 'tap';
        bp.type = tap ? 'bandpass' : 'highpass'; bp.frequency.value = tap ? v.snap : 5000; bp.Q.value = tap ? 1.5 : 0.7;
        const g = envelope(0.002, 0.005, tap ? 0.09 : 0.04, (tap ? 0.5 : 0.22) * vel); bp.connect(g);
        hiss(bp, t + 0.2, tap ? 1 : 1.6);
      }
    }
  }
}
