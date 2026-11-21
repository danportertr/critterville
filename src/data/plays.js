// Plays. Each one starts from something that really happened in this town
// (a fallen star, the thing in the pond, somebody's adventure...) and then,
// because it's theatre, adds a twist that didn't: a dragon, a ghost, a duel.
//
// buildPlay() returns { title, backdrop, cast: [A, B, C], beats, summary }.
// Cast members are { role, costume, prop }. A beat is one moment on stage:
//   d      how long it lasts (seconds)
//   who    which cast member speaks (0, 1, 2), with `say` as the line
//   act    what each cast member is doing: { 0: 'speak', 2: 'roar' ... }
//   enter  cast members who come on at this point
//   move   where they stand: { 0: -50 } (stage is about -70..70)
//   mood   how the audience takes it: 'gasp', 'laugh', 'aww', 'clap'
//   photo  take a picture of the stage during this beat, for the playbill
import { S } from '../state.js';
import { rand, pick } from '../util.js';
import { PLACES } from '../events/journeys.js';

const someone = () => (pick(S.critters) || { name: 'Somebody' }).name;
const diaryHas = word => S.journal.diary.some(e => e.text.includes(word));

/** Stories this town has actually got to tell. */
function subjects() {
  const out = [{   // every town has this one
    title: 'How Critterville Began', backdrop: 'forest',
    A: { role: 'the First Critter', costume: 'traveller', prop: 'lantern', line: 'An empty meadow!' },
    B: { role: 'the Builder', costume: 'knight', prop: 'hammer', line: 'Let us build a fire.' },
    event: [1, 'And a house! And swings!'],
  }];
  if (S.stones.length || diaryHas('shooting star')) out.push({
    title: 'The Night the Star Fell', backdrop: 'star',
    A: { role: 'the Astronomer', costume: 'wizard', prop: 'telescope', line: 'I watch the sky all night.' },
    B: { role: 'the Star', costume: 'star', line: 'I am falling! Wheee!' },
    event: [0, 'It landed in our meadow!'],
  });
  if (S.rumour || diaryHas('carp') || diaryHas('got away')) out.push({
    title: 'The Monster of the Deep', backdrop: 'sea',
    A: { role: `${someone()} the Fisher`, costume: 'pirate', prop: 'rod', line: 'A fine day to fish.' },
    B: { role: 'a Worried Neighbour', costume: 'none', line: 'Something BIG is down there!' },
    event: [0, 'It was this big. No, THIS big!'],
  });
  const tale = S.critters.find(c => c.story) || (S.away[0] && { name: S.away[0].who.name, story: { place: S.away[0].place } });
  if (tale) {
    const place = PLACES.find(p => p.id === tale.story.place) || PLACES[0];
    out.push({
      title: `${tale.name} and ${place.name.replace(/^a /, 'the ').replace(/^the /, 'the ')}`, backdrop: place.id, hero: tale.name,
      A: { role: tale.name, costume: 'traveller', prop: 'map', line: `I am ${tale.name}. I am going far away!` },
      B: { role: 'a Stranger', costume: 'pirate', prop: 'sword', line: 'None may pass!' },
      event: [0, place.words[0]],
    });
  }
  if (S.lastCart === 'hat' || S.critters.some(c => c.hat)) out.push({
    title: 'The Stolen Hat', backdrop: 'city',
    A: { role: 'the Hatmaker', costume: 'tophat', prop: 'hat', line: 'My finest hat!' },
    B: { role: 'the Thief', costume: 'thief', prop: 'sack', line: 'Mine now. Ha ha!' },
    event: [0, 'Stop! Thief!'],
  });
  if (diaryHas('rain')) out.push({
    title: 'The Great Rain', backdrop: 'rain',
    A: { role: 'the Gardener', costume: 'none', prop: 'umbrella', line: 'Not a cloud in the sky.' },
    B: { role: 'the Cloud', costume: 'cloud', line: 'Drip. Drip. DRIP.' },
    event: [0, 'My sandcastle!'],
  });
  if (S.ducks) out.push({
    title: 'The Duck Queen', backdrop: 'pond',
    A: { role: 'the Duck Queen', costume: 'duck', line: 'Quack. I claim this pond.' },
    B: { role: 'her Loyal Knight', costume: 'knight', prop: 'sword', line: 'I shall guard the ducklings!' },
    event: [1, 'Who goes there?'],
  });
  if (S.pranked) out.push({
    title: 'The Prankster Strikes Again', backdrop: 'city',
    A: { role: `${S.pranked} the Prankster`, costume: 'thief', prop: 'sack', line: 'Hee hee hee!' },
    B: { role: 'a Neighbour', costume: 'none', line: 'My house is PURPLE!' },
    event: [1, 'And there are apples in the pool!'],
  });
  if (S.monument) out.push({
    title: 'The Giant Wakes', backdrop: 'mountains',
    A: { role: 'a Stonecarver', costume: 'none', prop: 'hammer', line: 'One more chip...' },
    B: { role: 'the Statue', costume: 'ghost', line: 'Who... woke... me?' },
    event: [0, 'It can talk!'],
  });
  return out;
}

/** The added drama. `C` is the third cast member, who arrives with the twist. */
const TWISTS = [
  { id: 'dragon', text: 'a dragon', C: { role: 'the Dragon', costume: 'monster' }, ending: 'The dragon was defeated, then invited to supper.' },
  { id: 'ghost', text: 'a ghost', C: { role: 'the Ghost', costume: 'ghost' }, ending: 'The ghost turned out to be very shy.' },
  { id: 'duel', text: 'a sword fight', C: { role: 'the Rival', costume: 'knight', prop: 'sword' }, ending: 'Nobody won the duel, and they shook hands.' },
  { id: 'twin', text: 'a long-lost twin', C: { role: 'the Long-Lost Twin', costume: 'same' }, ending: 'There was a great deal of hugging.' },
  { id: 'storm', text: 'a terrible storm', C: { role: 'the Storm', costume: 'cloud' }, ending: 'Everyone was blown about, and then the sun came out.' },
  { id: 'wedding', text: 'a royal wedding', C: { role: 'the Queen', costume: 'king' }, ending: 'It ended with a wedding, as these things do.' },
];
function twistBeats(t) {
  switch (t.id) {
    case 'dragon': return [
      { d: 3.2, who: 2, say: 'ROAR!', enter: [2], move: { 2: 55 }, act: { 0: 'cower', 1: 'cower', 2: 'roar' }, mood: 'gasp' },
      { d: 3.2, who: 0, say: 'Have at you!', act: { 0: 'fight', 1: 'cower', 2: 'roar' }, move: { 0: 15, 2: 40 } },
      { d: 3, who: 2, say: 'oof', act: { 0: 'cheer', 2: 'faint' }, mood: 'laugh' },
      { d: 3, who: 1, say: 'Stay for supper?', act: { 1: 'speak', 2: 'speak' }, mood: 'aww' }];
    case 'ghost': return [
      { d: 3.4, who: 2, say: 'WooOOOooo', enter: [2], move: { 2: 50 }, act: { 0: 'cower', 1: 'cower', 2: 'roar' }, mood: 'gasp' },
      { d: 3, who: 1, say: 'A g-g-ghost!', act: { 1: 'cower' } },
      { d: 3, who: 2, say: 'Sorry. I am shy.', act: { 0: 'speak', 1: 'speak', 2: 'bow' }, mood: 'laugh' },
      { d: 2.6, who: 0, say: 'Join us!', act: { 0: 'cheer' }, mood: 'aww' }];
    case 'duel': return [
      { d: 3, who: 2, say: 'I challenge you!', enter: [2], move: { 2: 45 }, act: { 2: 'speak' }, mood: 'gasp' },
      { d: 3.6, who: 0, say: 'En garde!', act: { 0: 'fight', 2: 'fight' }, move: { 0: 5, 2: 30 } },
      { d: 3, who: 1, say: 'I cannot watch!', act: { 0: 'fight', 1: 'faint', 2: 'fight' }, mood: 'laugh' },
      { d: 3, who: 2, say: 'A draw?', act: { 0: 'speak', 2: 'speak' }, mood: 'aww' }];
    case 'twin': return [
      { d: 3.2, who: 2, say: 'It is I!', enter: [2], move: { 2: 45 }, act: { 2: 'cheer' }, mood: 'gasp' },
      { d: 3, who: 0, say: 'My long-lost twin?!', act: { 0: 'cower' } },
      { d: 3, who: 2, say: 'We were parted as babies', act: { 2: 'speak' } },
      { d: 3, who: 0, say: 'Sibling!', act: { 0: 'hug', 2: 'hug' }, move: { 0: 18, 2: 32 }, mood: 'aww' }];
    case 'storm': return [
      { d: 3.2, who: 2, say: 'WHOOOSH', enter: [2], move: { 2: 50 }, act: { 0: 'blown', 1: 'blown', 2: 'roar' }, mood: 'gasp' },
      { d: 3, who: 1, say: 'Hold on!', act: { 0: 'blown', 1: 'blown', 2: 'roar' } },
      { d: 3, who: 0, say: 'We are doomed!', act: { 0: 'cower', 1: 'blown', 2: 'roar' }, mood: 'gasp' },
      { d: 3, who: 2, say: '...I am tired now.', act: { 0: 'cheer', 1: 'cheer', 2: 'bow' }, mood: 'laugh' }];
    default: return [
      { d: 3.2, who: 2, say: 'Make way!', enter: [2], move: { 2: 50 }, act: { 0: 'bow', 1: 'bow', 2: 'speak' }, mood: 'gasp' },
      { d: 3, who: 2, say: 'I must marry today.', act: { 2: 'speak' } },
      { d: 3, who: 1, say: 'Me? Oh! Yes!', act: { 1: 'cheer' }, move: { 1: 30, 2: 46 }, mood: 'aww' },
      { d: 3, who: 0, say: 'I do love a wedding', act: { 0: 'speak', 1: 'hug', 2: 'hug' }, mood: 'aww' }];
  }
}

export function buildPlay() {
  const s = pick(subjects()), t = pick(TWISTS);
  const C = { ...t.C, costume: t.C.costume === 'same' ? s.A.costume : t.C.costume };
  const twist = twistBeats(t);
  twist[1].photo = true;                                                          // the big moment
  const beats = [
    { d: 2.4, act: {}, move: { 0: -45, 1: 5 } },                                   // curtain up
    { d: 3.2, who: 0, say: s.A.line, act: { 0: 'speak' } },
    { d: 3.2, who: 1, say: s.B.line, act: { 1: 'speak' } },
    { d: 3.2, who: s.event[0], say: s.event[1], act: { [s.event[0]]: 'cheer' }, mood: rand() < 0.5 ? 'laugh' : 'gasp' },
    ...twist,
    { d: 2.6, who: 0, say: 'The End!', act: { 0: 'cheer', 1: 'cheer', 2: 'cheer' }, move: { 0: -40, 1: 0, 2: 40 } },
    { d: 5, act: { 0: 'bow', 1: 'bow', 2: 'bow' }, mood: 'clap', photo: true },      // and the curtain call
  ];
  return { title: s.title, backdrop: s.backdrop, hero: s.hero, cast: [s.A, s.B, C], beats, twist: t.text, ending: t.ending };
}
