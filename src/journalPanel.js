// The journal you can open and read: the town's diary, and the fish book with
// a picture and a few true facts about everything the critters have caught.
import { S } from './state.js';
import { drawOn } from './draw/canvas.js';
import { drawFish, drawMystery } from './draw/fish.js';
import { localSpecies, waters, onJournalChange } from './journal.js';
import { SKY } from './data/sky.js';
import { drawSkyPicture } from './draw/sky.js';
import { partFor } from './data/music.js';
import { playNote, unlockAudio } from './audio.js';

const $btn = document.getElementById('journal-btn');
const $panel = document.getElementById('journal');
const $body = document.getElementById('journal-body');
const $tabs = [...$panel.querySelectorAll('[data-tab]')];
let tab = 'diary';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

function fishPicture(sp, seen) {
  const cv = el('canvas'), w = 150, h = 84, dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', seen ? `Drawing of ${sp.call}` : 'Something not seen yet');
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const scale = Math.min(2.6, 100 / ((sp.L || 26) + 12));
  drawOn(g, () => (seen ? drawFish : drawMystery)(sp, w / 2 + 4, h / 2 + 2, scale, 7));
  return cv;
}

function renderFish() {
  const ws = waters();
  $body.append(el('p', 'lede', `What lives in this town's ${ws.join(' and ')}, as far as the critters have found out. They always go back in the water, sooner or later.`));
  const grid = el('div', 'cards');
  for (const sp of localSpecies()) {
    const seen = S.journal.fish[sp.id], card = el('article', seen ? 'card' : 'card unseen');
    card.append(fishPicture(sp, seen));
    if (seen) {
      card.append(el('h3', '', sp.name), el('p', 'meta', sp.size), el('p', '', sp.fact),
        el('p', 'meta', `First caught by ${seen.by} in the ${seen.where} on day ${seen.day}.${S.tank && S.tank.fish.some(f => f.id === sp.id) ? ' One is in the tank right now.' : ''}`));
    } else {
      const where = sp.where.filter(w => ws.includes(w)).join(' or ');
      card.append(el('h3', '', '???'), el('p', 'meta', `Not met yet. Something in the ${where}${sp.when === 'dusk' ? ', around dusk' : ''}.`));
    }
    grid.append(card);
  }
  $body.append(grid);
}

function renderSky() {
  $body.append(el('p', 'lede', 'What the night owls have found through the telescope. All of it is really up there.'));
  const grid = el('div', 'cards');
  for (const o of SKY) {
    const seen = S.journal.sky[o.id], card = el('article', seen ? 'card' : 'card unseen');
    const cv = el('canvas'), w = 150, h = 84, dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', seen ? `Drawing of ${o.call}` : 'Something not found yet');
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    drawOn(g, () => drawSkyPicture(o.id, w, h, !!seen));
    card.append(cv);
    if (seen) card.append(el('h3', '', o.name), el('p', '', o.fact), el('p', 'meta', `First found by ${seen.by} on the night of day ${seen.day}.`));
    else card.append(el('h3', '', '???'), el('p', 'meta', 'Not found yet. Somebody has to stay up late.'));
    grid.append(card);
  }
  $body.append(grid);
}

const ROLES = ['melody', 'harmony', 'bass', 'counter', 'rhythm'];
const LOUDNESS = { melody: 1, harmony: 0.8, bass: 0.7, counter: 0.7, rhythm: 0.6 };
/**
 * Play a song through once, the way the town has learnt to play it: every part
 * that somebody has played, on the instrument they played it on. A brand new
 * tune that nobody has performed yet is just the melody on a plain whistle.
 */
function playSong(song) {
  unlockAudio();
  const parts = song.parts || {}, spb = 60 / song.bpm;
  const plain = { family: 'flute', wave: 'triangle', oct: 1, vib: 4, vibRate: 5, attack: 0.04, detune: 0 };
  setTimeout(() => {   // (a beat's grace for the audio to wake up on the first press)
    const roles = ROLES.filter(r => parts[r]);
    if (!roles.includes('melody')) for (const n of partFor(song, 'melody')) playNote(parts.harmony ? parts.harmony.voice : plain, n.midi, 0.1 + n.b * spb, n.d * spb, n.vel);
    for (const r of roles) for (const n of partFor(song, r)) playNote(parts[r].voice, n.midi, 0.1 + n.b * spb, n.d * spb, n.vel * LOUDNESS[r]);
  }, 120);
}
/** "reed whistle (melody), log drum (rhythm)" */
const lineUp = song => ROLES.filter(r => song.parts && song.parts[r]).map(r => `${song.parts[r].instrument} (${r})`).join(', ');
// The shows page: the town's songs (a repertoire, played again and again), the
// games it has invented, and the playbills of its plays (each performed once).
function renderSongs() {
  $body.append(el('h3', 'day', 'Songs'));
  if (!S.songs.length) $body.append(el('p', 'lede', 'No songs yet. Somebody has to make an instrument first, and then wait for evening.'));
  else $body.append(el('p', 'lede', 'Tunes the critters have made up. They play them in the evening. Each one fills out as more instruments join in, and that is how you hear it here.'));
  for (const song of S.songs) {
    const row = el('div', 'song'), text = el('div'), btn = el('button', '', '▶ play');
    text.append(el('h3', '', song.name), el('p', 'meta', `Made up by ${song.by} on day ${song.day}.`));
    if (lineUp(song)) text.append(el('p', 'meta', `Played so far on: ${lineUp(song)}.`));
    btn.addEventListener('click', () => playSong(song));
    row.append(text, btn); $body.append(row);
  }
  if (S.songs.length && !S.sound) $body.append(el('p', 'meta', 'Sound is switched off (the ♫ button).'));

  $body.append(el('h3', 'day', 'Games'));
  if (!S.games.length) $body.append(el('p', 'lede', 'No games of their own yet. Sooner or later a kickabout turns into something with rules, and then they play it again and again.'));
  for (const g of S.games) {
    const bill = el('div', 'playbill');
    bill.append(el('h3', '', g.name), el('p', 'meta', `Invented by ${g.by.join(' and ')} on day ${g.day}.${g.last > g.day ? ` Last played on day ${g.last}.` : ''}`), el('p', '', g.rule));
    $body.append(bill);
  }

  $body.append(el('h3', 'day', 'Plays'));
  if (!S.plays.length) return void $body.append(el('p', 'lede', 'No plays yet. Every so often the critters build a stage and put one on.'));
  $body.append(el('p', 'lede', 'Each one was written for the occasion and performed once.'));
  for (let i = S.plays.length - 1; i >= 0; i--) {   // newest first
    const p = S.plays[i], bill = el('div', 'playbill');
    bill.append(el('h3', '', p.title), el('p', 'meta', `Performed on day ${p.day}.`));
    const cast = el('ul');
    for (const c of p.cast) cast.append(el('li', '', `${c.role}: ${c.name}`));
    bill.append(cast, el('p', '', `Featuring ${p.twist}. ${p.ending}`));
    if (p.photos && p.photos.length) {   // pictures taken during the show
      const strip = el('div', 'photos');
      p.photos.forEach((src, n) => { const img = el('img'); img.src = src; img.alt = n ? `The curtain call of ${p.title}` : `A scene from ${p.title}`; strip.append(img); });
      bill.append(strip);
    }
    $body.append(bill);
  }
}

function renderDiary() {
  const diary = S.journal.diary;
  if (!diary.length) return void $body.append(el('p', 'lede', 'Nothing much has happened yet.'));
  let day = null, list = null;
  for (let i = diary.length - 1; i >= 0; i--) {   // newest first
    const e = diary[i];
    if (e.day !== day) { day = e.day; $body.append(el('h3', 'day', `Day ${day}`)); list = el('ul'); $body.append(list); }
    list.append(el('li', '', e.text));
  }
}

function render() {
  $body.textContent = '';
  for (const t of $tabs) t.classList.toggle('sel', t.dataset.tab === tab);
  (tab === 'fish' ? renderFish : tab === 'sky' ? renderSky : tab === 'songs' ? renderSongs : renderDiary)();
}
function open() { $panel.hidden = false; $btn.classList.remove('new'); $btn.textContent = 'journal'; render(); }
function close() { $panel.hidden = true; }

$btn.addEventListener('click', () => ($panel.hidden ? open() : close()));
document.getElementById('journal-close').addEventListener('click', close);
for (const t of $tabs) t.addEventListener('click', () => { tab = t.dataset.tab; render(); $body.scrollTop = 0; });
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

onJournalChange(kind => {
  if (!$panel.hidden) { if (kind === tab || kind === 'reset') render(); }
  else if (kind === 'fish' || kind === 'sky' || kind === 'songs') { $btn.classList.add('new'); $btn.textContent = 'journal •'; }   // something new to read
});
