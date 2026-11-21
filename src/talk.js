// What critters talk about.
//
// Things that happen in town become *news* (S.news). Each critter only knows
// the news it saw or has been told (c.knows), and telling someone is how it
// gets around: a shooting star seen by two night owls is all over town by
// lunchtime. Conversations also carry fish stories that grow in the telling,
// last night's dream, compliments, and now and then a plan to go and do
// something together. Critters who talk a lot become friends (c.friends).
import { S, built } from './state.js';
import { CHAT, DAY_LEN } from './config.js';
import { rand, pick, dist } from './util.js';
import { note } from './journal.js';
import { ACT, say } from './sim/core.js';

// ---- news ----
export const outdoors = () => S.critters.filter(c => !c.hidden && c.act !== 'sleep' && !c.leaving);
export const nearby = (p, r = 330) => outdoors().filter(c => dist(c, p) < r);
export const anyone = (n = 1) => outdoors().sort(() => rand() - 0.5).slice(0, n);

/** Something has happened. `who` is whoever saw it: only they know, until they tell someone. */
export function news(text, who = []) {
  const item = { id: ++S.newsId, text, clock: S.clock };
  S.news.push(item);
  if (S.news.length > 16) S.news.shift();
  for (const c of who) (c.knows = c.knows || {})[item.id] = true;
  return item;
}
const knows = (c, n) => !!(c.knows && c.knows[n.id]);

// ---- friends ----
const score = (a, b) => (a.friends && a.friends[b.name]) || 0;
/** Two critters have spent time together. */
export function bond(a, b, n = 1) {
  const before = score(a, b);
  for (const [p, q] of [[a, b], [b, a]]) { p.friends = p.friends || {}; p.friends[q.name] = (p.friends[q.name] || 0) + n; }
  if (before < 4 && score(a, b) >= 4) { note(`${a.name} and ${b.name} have become good friends.`); news(`${a.name} ♥ ${b.name}`, [a, b]); }
}
/** The name of whoever this critter is closest to, if they're still in town. */
export function bestFriend(c) {
  let best = null, top = 3.5;
  for (const o of S.critters) if (o !== c && score(c, o) > top) { top = score(c, o); best = o; }
  return best;
}
export const isFriend = (a, b) => score(a, b) >= 4;

// ---- what to say next ----
const TALE = ['it was so big', 'THIS big!', 'no, THIS big!', 'enormous!!', 'a monster!', 'big as a house!'];
// Dreams: `text` completes "I dreamt ...", and `title` is what a painting of it gets called.
// A dream stays with a critter for a day or so (c.lastDream) and may turn up
// in what they paint or carve, or in the hat they ask the hatmaker for.
export const DREAMS = [
  { id: 'fly', text: 'I could fly', title: 'a dream of flying' },
  { id: 'apple', text: 'of a giant apple', title: 'a dream of a giant apple' },
  { id: 'fish', text: 'I was a fish', title: 'a dream of being a fish' },
  { id: 'moon', text: 'the moon came down', title: 'the night the moon came down' },
  { id: 'bridge', text: 'of a bridge with no end', title: 'the bridge with no end' },
  { id: 'hat', text: 'my hat could talk', title: 'the talking hat' },
  { id: 'soup', text: 'it rained soup', title: 'the day it rained soup' },
  { id: 'tree', text: 'of a tree that walked', title: 'the tree that walked' },
  { id: 'small', text: 'I was very small', title: 'a dream of being very small' },
];
/** What's on this critter's mind lately: a dream from last night, something seen through the telescope. */
export const recentDream = c => (c.lastDream && S.clock - c.lastDream.clock < 1.2 * DAY_LEN ? DREAMS.find(d => d.id === c.lastDream.id) : null);
export const recentSky = c => (c.sawSky && S.clock - c.sawSky.clock < 1.5 * DAY_LEN ? c.sawSky.id : null);

function compliment(from, to) {
  const options = ['nice day', '♥', 'you look well'];
  if (to.hat) options.push('nice hat!', 'that hat!', 'nice hat!');
  if (to.madeArt && S.clock - to.madeArt < DAY_LEN) options.push('love your painting', 'so clever');
  if (S.cairns.some(k => k.n > 5)) options.push('that cairn!');
  if (S.monument) options.push(S.monument.progress < 1 ? 'coming along!' : 'we built that!');
  if (isFriend(from, to)) options.push('my friend!', '♥');
  return pick(options);
}
/**
 * One line of a conversation. `chat` is the lead critter, which holds the
 * conversation's bits of state (whose reaction is due, and so on).
 */
export function nextLine(speaker, listener, chat) {
  if (chat.react && chat.reactBy === speaker) { const t = chat.react; chat.react = null; return t; }
  const reply = words => { chat.react = pick(words); chat.reactBy = listener; };

  if (speaker.tale && S.clock < speaker.tale.until && rand() < 0.5) {   // the one that got away, bigger every time
    const t = speaker.tale, line = TALE[Math.min(t.size, TALE.length - 1)];
    if (++t.size === TALE.length) note(`By now, the fish ${speaker.name} lost was apparently as big as a house.`);
    speaker.spread = 1.8; reply(['no!', 'really?', 'wow', 'never!']);
    return line;
  }
  if (speaker.dream && rand() < 0.6) {
    const d = speaker.dream.text;
    speaker.dream = null; reply(['ha!', 'ooh', 'strange', 'me too!']);
    if (rand() < 0.35) note(`${speaker.name} dreamt ${d.replace(/^I was/, 'they were').replace(/^I /, 'they ').replace(/^my /, 'their ')}, and told ${listener.name} all about it.`);
    return `I dreamt ${d}`;
  }
  const fresh = S.news.filter(n => knows(speaker, n) && !knows(listener, n));
  if (fresh.length && rand() < 0.8) {
    const n = fresh[fresh.length - 1];
    (listener.knows = listener.knows || {})[n.id] = true;
    reply(['oh!', 'really?', 'wow', 'no way', 'I must see']);
    return n.text;
  }
  if (rand() < 0.35) { reply(['♥', 'thanks!', 'hehe', 'you too']); return compliment(speaker, listener); }
  return pick(CHAT);
}

// ---- plans ----
const PLANS = [
  { ask: 'swim?', ok: () => built(S.pool) && S.critters.filter(o => o.act === 'swim').length < 3, go: c => ACT.swim.start(c) },
  { ask: 'fish?', ok: () => S.critters.filter(o => o.act === 'fish').length < 2, go: c => ACT.fish.start(c) },
  { ask: 'swings?', ok: () => built(S.swing) && S.swing.seats.every(s => !s.user), go: c => ACT.swing.start(c) },
  { ask: 'kick about?', ok: () => !!S.ball, go: c => ACT.ball.start(c) },
  { ask: 'dance?', ok: () => true, go: (c, first) => { if (first) ACT.dance.start(c); } },   // (dancing sweeps up whoever's standing near)
];
/** Sometimes a chat ends with the two of them going off to do something. Returns true if so. */
export function makePlan(a, b) {
  const plan = pick(PLANS.filter(p => p.ok()));
  if (!plan || rand() > 0.3) return false;
  say(a, plan.ask, 1.6); say(b, pick(['ok!', 'yes!', "let's"]), 1.6);
  plan.go(b, false); plan.go(a, true);
  return true;
}

/** Old news stops being news. Called every tick from sim/world.js. */
export function updateTalk() {
  while (S.news.length && S.clock - S.news[0].clock > 2.5 * DAY_LEN) S.news.shift();
}

// A first catch of anything is worth telling people about.
import { onFirstCatch } from './journal.js';
onFirstCatch.push((c, sp) => news(sp.kind === 'boot' ? 'I caught a boot' : `I caught ${sp.call}!`, [c]));
