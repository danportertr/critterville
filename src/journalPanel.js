// The journal you can open and read: the town's diary, and the fish book with
// a picture and a few true facts about everything the critters have caught.
import { S } from './state.js';
import { drawOn } from './draw/canvas.js';
import { drawFish, drawMystery } from './draw/fish.js';
import { localSpecies, waters, onJournalChange } from './journal.js';

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
  (tab === 'fish' ? renderFish : renderDiary)();
}
function open() { $panel.hidden = false; $btn.classList.remove('new'); $btn.textContent = 'journal'; render(); }
function close() { $panel.hidden = true; }

$btn.addEventListener('click', () => ($panel.hidden ? open() : close()));
document.getElementById('journal-close').addEventListener('click', close);
for (const t of $tabs) t.addEventListener('click', () => { tab = t.dataset.tab; render(); $body.scrollTop = 0; });
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

onJournalChange(kind => {
  if (!$panel.hidden) { if (kind === tab || kind === 'reset') render(); }
  else if (kind === 'fish') { $btn.classList.add('new'); $btn.textContent = 'journal •'; }   // something new to read
});
