// A little lofi radio: plays an internet radio stream, off until you press it.
// Stations are listed in config.js. When it's on, the critters dance more.
import { S } from './state.js';
import { STATIONS } from './config.js';
import { log } from './ui.js';

const $toggle = document.getElementById('radio-toggle');
const $next = document.getElementById('radio-next');
const audio = new Audio();
audio.preload = 'none';
audio.volume = 0.6;

let station = 0, failures = 0;
try { station = (parseInt(localStorage.getItem('critterville-station'), 10) || 0) % STATIONS.length; } catch (e) { /* no storage */ }

function show() {
  $toggle.textContent = S.music ? `♪ ${STATIONS[station].name}` : '♪ radio';
  $toggle.classList.toggle('on', S.music);
  $toggle.setAttribute('aria-pressed', S.music);
  $next.hidden = !S.music || STATIONS.length < 2;
}
function play() {
  S.music = true;
  audio.src = STATIONS[station].url;   // (re)connect so we join the stream live rather than resume a stale buffer
  audio.play().catch(() => {});        // failures arrive via the 'error' event
  show();
}
function stop() {
  S.music = false;
  audio.pause(); audio.removeAttribute('src'); audio.load();
  show();
}
function tune(step) {
  station = (station + step + STATIONS.length) % STATIONS.length;
  try { localStorage.setItem('critterville-station', station); } catch (e) { /* no storage */ }
  play();
}

audio.addEventListener('playing', () => { failures = 0; log(`On the radio: ${STATIONS[station].credit}`); });
audio.addEventListener('error', () => {
  if (!S.music) return;
  if (++failures < STATIONS.length) return tune(1);   // try the next one
  failures = 0; stop(); log("The radio can't find a signal right now.");
});
$toggle.addEventListener('click', () => (S.music ? stop() : play()));
$next.addEventListener('click', () => tune(1));
show();
