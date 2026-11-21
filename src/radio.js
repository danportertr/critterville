// A little radio: plays SomaFM (somafm.com, listener-supported internet radio),
// off until you press it. The channels are listed in config.js. When it's on,
// the critters dance more, and the ticker says what's playing.
import { S } from './state.js';
import { STATIONS } from './config.js';
import { log } from './ui.js';

const $toggle = document.getElementById('radio-toggle');
const $next = document.getElementById('radio-next');
const audio = new Audio();
audio.preload = 'none';
audio.volume = 0.6;

let station = 0, failures = 0, host = 0, lastSong = '';
const HOSTS = ['ice1', 'ice2', 'ice5'];   // SomaFM's stream servers: if one won't answer, try the next
const streamUrl = () => `https://${HOSTS[host]}.somafm.com/${STATIONS[station].id}-128-mp3`;
/** Turn the radio right down while the critters are playing, and back up after. */
export function duckRadio(on) { audio.volume = on ? 0.1 : 0.6; }
try { station = (parseInt(localStorage.getItem('critterville-station'), 10) || 0) % STATIONS.length; } catch (e) { /* no storage */ }

function show() {
  $toggle.textContent = S.music ? `♪ ${STATIONS[station].name}` : '♪ radio';
  $toggle.classList.toggle('on', S.music);
  $toggle.setAttribute('aria-pressed', S.music);
  $next.hidden = !S.music || STATIONS.length < 2;
}
function play() {
  S.music = true;
  audio.src = streamUrl();   // (re)connect so we join the stream live rather than resume a stale buffer
  audio.play().catch(() => {});        // failures arrive via the 'error' event
  show();
}
function stop() {
  S.music = false;
  audio.pause(); audio.removeAttribute('src'); audio.load();
  show();
}
function tune(step) {
  station = (station + step + STATIONS.length) % STATIONS.length; host = 0; lastSong = '';
  try { localStorage.setItem('critterville-station', station); } catch (e) { /* no storage */ }
  play();
}

/** Ask SomaFM what's on, and say so if it's changed. */
function nowPlaying() {
  if (!S.music) return;
  const st = STATIONS[station];
  fetch(`https://somafm.com/songs/${st.id}.json`, { cache: 'no-store' }).then(r => r.json()).then(d => {
    const song = d && d.songs && d.songs[0];
    if (!song || !S.music || STATIONS[station] !== st) return;
    const text = `${song.artist}: ${song.title}`;
    if (text !== lastSong) { lastSong = text; log(`♪ ${text} (${st.title}, SomaFM)`); }
  }).catch(() => {});   // no programme guide today: the music still plays
}
setInterval(nowPlaying, 45000);

audio.addEventListener('playing', () => { failures = 0; log(`On the radio: ${STATIONS[station].title}, from SomaFM`); nowPlaying(); });
audio.addEventListener('error', () => {
  if (!S.music) return;
  if (++host < HOSTS.length) return play();           // same channel, another server
  host = 0;
  if (++failures < 2) return tune(1);                 // try one more channel, then stop asking
  failures = 0; stop(); log("The radio can't find a signal right now.");
});
$toggle.addEventListener('click', () => (S.music ? stop() : play()));
$next.addEventListener('click', () => tune(1));
show();

// ---- the critters' own music: can it be heard? ----
import { unlockAudio } from './audio.js';
const $sound = document.getElementById('sound-btn');
try { S.sound = localStorage.getItem('critterville-sound') !== 'off'; } catch (e) { /* no storage */ }
function showSound() { $sound.textContent = S.sound ? '♫ on' : '♫ off'; $sound.classList.toggle('off', !S.sound); $sound.setAttribute('aria-pressed', S.sound); }
$sound.addEventListener('click', () => {
  S.sound = !S.sound;
  try { localStorage.setItem('critterville-sound', S.sound ? 'on' : 'off'); } catch (e) { /* no storage */ }
  showSound();
});
showSound();
// Browsers won't play anything until the visitor has done something, so wake the audio on the first click or key.
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, unlockAudio, { passive: true });
