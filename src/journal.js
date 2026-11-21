// The town's memory: a diary of things that happened and a book of the fish
// the critters have met. It's a record of experiences, not a score.
import { S, dayNum, isNight, isEvening } from './state.js';
import { SPECIES } from './data/fish.js';
import { rand } from './util.js';
import { log } from './ui.js';

const listeners = [];
/** Hooks for a first-ever catch (talk.js registers one, so it becomes news). */
export const onFirstCatch = [];
export const onJournalChange = fn => listeners.push(fn);
const changed = kind => listeners.forEach(fn => fn(kind));

export const newJournal = () => ({ fish: {}, diary: [] });

/** Show a message and write it in the diary. */
export function note(text) {
  log(text);
  S.journal.diary.push({ day: dayNum(), text });
  if (S.journal.diary.length > 120) S.journal.diary.shift();
  changed('diary');
}

/** First page of a new town's diary. */
export function startDiary() {
  const w = waters();
  note(`${S.critters.length} critters wandered into a meadow with ${w.length > 1 ? 'a pond and a stream' : 'a ' + w[0]}.`);
  changed('reset');
}

/** Which waters does this town have? */
export const waters = () => [S.pond && 'pond', S.stream && 'stream'].filter(Boolean);
/** The species that could ever turn up here. */
export const localSpecies = () => SPECIES.filter(sp => sp.where.some(w => waters().includes(w)));

/** A critter's line has gone tight in `water`: decide what's on it and remember it. */
export function catchFish(c, water) {
  const dusk = isEvening() || isNight();
  const pool = SPECIES.filter(sp => sp.where.includes(water) && (sp.when === 'any' || dusk));
  let r = rand(pool.reduce((s, sp) => s + sp.w * (sp.when === 'dusk' ? 2 : 1), 0)), sp = pool[0];
  for (const o of pool) { if ((r -= o.w * (o.when === 'dusk' ? 2 : 1)) <= 0) { sp = o; break; } }

  const seen = S.journal.fish[sp.id];
  if (!seen) {
    S.journal.fish[sp.id] = { day: dayNum(), by: c.name, where: water, times: 1 };
    note(`${c.name} caught ${sp.call} in the ${water}. That's a new one for the fish book.`);
    changed('fish');
    for (const fn of onFirstCatch) fn(c, sp);
  } else {
    seen.times++;
    if (!(S.tank && S.tank.progress >= 1) && rand() < 0.5) log(`${c.name} caught ${sp.call} and let it go.`);
  }
  return sp;
}
