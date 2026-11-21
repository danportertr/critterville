// Everything that can end up on the end of a line, for the fish book.
//
//   where   which water it lives in: 'pond', 'stream' or both
//   when    'any', or 'dusk' for things that only bite in the evening
//   w       how common it is (bigger = more often)
//   kind    how it's drawn (draw/fish.js): a regular fish unless stated
//   L, h    body length and height; color/fin/pc/pc2 body, fins and markings
//   pat     markings: 'bars', 'spots', 'stripe', 'whiskers', 'spines', 'earspot'
//   call    how to say "caught ___" in a sentence
//
// The facts are real. Keep them true if you add more.
export const SPECIES = [
  { id: 'bluegill', name: 'Bluegill', call: 'a bluegill', where: ['pond'], when: 'any', w: 5, L: 18, h: 13, color: '#8fb8d9', fin: '#6f9cc4', pat: ['earspot'], pc: '#22304a',
    size: 'About the size of a hand.',
    fact: 'Named for the blue-black flap on its gill cover. The male sweeps out a saucer-shaped nest with his tail and guards the eggs until they hatch.' },
  { id: 'perch', name: 'Yellow perch', call: 'a yellow perch', where: ['pond'], when: 'any', w: 4, L: 20, h: 10, color: '#f3d55b', fin: '#ff9a5c', pat: ['bars'], pc: '#5b6b3a',
    size: 'A bit longer than a hand.',
    fact: 'Wears dark stripes for hiding among water plants. It lays its eggs in long jelly ribbons draped over the weeds.' },
  { id: 'pumpkinseed', name: 'Pumpkinseed', call: 'a pumpkinseed', where: ['pond'], when: 'any', w: 3, L: 16, h: 12, color: '#f2b35e', fin: '#7fd6a0', pat: ['spots', 'earspot'], pc: '#d9421f', pc2: '#ff6e45',
    size: 'Small enough to sit in a palm.',
    fact: 'A little sunfish freckled with orange. It has strong teeth in its throat for cracking open snails.' },
  { id: 'goldfish', name: 'Goldfish', call: 'a goldfish', where: ['pond'], when: 'any', w: 2, L: 14, h: 10, color: '#ffa23d', fin: '#ffc46b', pat: [],
    size: 'Finger-length, or much more in a big pond.',
    fact: 'Bred from plain, dull-coloured wild carp in China more than a thousand years ago. In a pond a goldfish can grow far bigger than it ever would in a bowl.' },
  { id: 'bass', name: 'Largemouth bass', call: 'a largemouth bass', where: ['pond'], when: 'any', w: 2, L: 24, h: 12, color: '#9fc97a', fin: '#7fae5e', pat: ['stripe'], pc: '#44603a',
    size: 'As long as a forearm.',
    fact: 'Its mouth opens so wide that the jaw reaches back past its eye. It catches prey by suddenly sucking in a gulp of water, fish and all.' },
  { id: 'carp', name: 'Common carp', call: 'a carp', where: ['pond'], when: 'any', w: 2, L: 26, h: 14, color: '#d9b56a', fin: '#c98f4f', pat: ['whiskers'], pc: '#6b5330',
    size: 'Big. Sometimes very big.',
    fact: 'Has two pairs of whiskers, called barbels, for tasting the mud as it roots around for food. Carp can live for decades.' },
  { id: 'catfish', name: 'Channel catfish', call: 'a catfish', where: ['pond'], when: 'dusk', w: 4, L: 26, h: 11, color: '#9aa3ad', fin: '#7d8690', pat: ['whiskers'], pc: '#4a5058',
    size: 'As long as an arm.',
    fact: 'Covered in taste buds from its whiskers to its tail, so it can find food in the dark by taste alone. Its skin is smooth, with no scales at all.' },
  { id: 'tadpole', name: 'Tadpole', call: 'a tadpole', kind: 'tadpole', where: ['pond'], when: 'any', w: 2, color: '#5b6b5a',
    size: 'Smaller than a fingertip.',
    fact: 'Not a fish! A baby frog. It breathes with gills at first, grows its back legs before its front ones, and slowly absorbs its own tail.' },

  { id: 'rainbow', name: 'Rainbow trout', call: 'a rainbow trout', where: ['stream'], when: 'any', w: 4, L: 22, h: 10, color: '#b9c9c0', fin: '#9fb3aa', pat: ['stripe', 'spots'], pc: '#ff8fb0', pc2: '#3a3a3a',
    size: 'As long as a forearm.',
    fact: 'Named for the pink stripe along its side. It needs cold water with plenty of oxygen. Rainbow trout that swim out to sea are called steelhead.' },
  { id: 'chub', name: 'Creek chub', call: 'a creek chub', where: ['stream'], when: 'any', w: 4, L: 16, h: 8, color: '#c9c7a8', fin: '#b3b08c', pat: ['stripe'], pc: '#6b6b55',
    size: 'About the size of a hand.',
    fact: 'The male builds a nest by digging a pit in the gravel and piling up a ridge of pebbles, carrying the stones one at a time in his mouth.' },
  { id: 'brook', name: 'Brook trout', call: 'a brook trout', where: ['stream'], when: 'any', w: 3, L: 20, h: 10, color: '#6f8f6a', fin: '#ff8a4a', pat: ['spots'], pc2: '#ffd36b',
    size: 'A bit longer than a hand.',
    fact: 'Really a kind of char, with wormy squiggles on its back and orange fins edged in white. It only lives where the water is cold and very clean.' },
  { id: 'sculpin', name: 'Sculpin', call: 'a sculpin', where: ['stream'], when: 'any', w: 2, L: 13, h: 8, color: '#b39a78', fin: '#9c8261', pat: ['spots'], pc2: '#7a6248',
    size: 'Finger-length, mostly head.',
    fact: 'Has no swim bladder, so instead of floating it sits on the bottom among the stones, where its mottled colours make it almost invisible.' },
  { id: 'crayfish', name: 'Crayfish', call: 'a crayfish', kind: 'crayfish', where: ['stream'], when: 'any', w: 2.5, color: '#e0705a',
    size: 'Finger-length, plus claws.',
    fact: 'Not a fish! A small freshwater cousin of the lobster. It walks forwards, but escapes backwards with a flick of its tail, and can regrow a lost claw.' },
  { id: 'salmon', name: 'Atlantic salmon', call: 'an Atlantic salmon', where: ['stream'], when: 'any', w: 0.8, L: 30, h: 11, color: '#c2cbd6', fin: '#a3afbd', pat: ['spots'], pc2: '#3a3a3a',
    size: 'As long as a leg.',
    fact: 'Grows up at sea, then returns to the very stream where it hatched, finding its way home by smell and leaping up waterfalls on the way.' },

  { id: 'stickleback', name: 'Three-spined stickleback', call: 'a stickleback', where: ['pond', 'stream'], when: 'any', w: 3, L: 11, h: 6, color: '#a9c7c9', fin: '#8fb0b3', pat: ['spines'], pc: '#33474a',
    size: 'Shorter than a finger.',
    fact: 'The male builds a nest out of plant bits stuck together with a glue made in his kidneys, then dances in zigzags to invite a female in.' },
  { id: 'pike', name: 'Northern pike', call: 'a pike', where: ['pond', 'stream'], when: 'any', w: 1, L: 30, h: 8, color: '#9bbf7a', fin: '#c98f4f', pat: ['spots'], pc2: '#f2f0c0',
    size: 'As long as a leg, mostly mouth.',
    fact: 'An ambush hunter. It hangs perfectly still among the weeds, then shoots forward in a burst. Its long snout is full of backward-pointing teeth.' },
  { id: 'eel', name: 'Eel', call: 'an eel', kind: 'eel', where: ['pond', 'stream'], when: 'dusk', w: 3, color: '#8a8f6a',
    size: 'As long as an arm, and wriggly.',
    fact: 'Hatches far out in the Sargasso Sea, drifts across the ocean as a see-through larva, lives for years in fresh water, then swims all the way back to lay its eggs.' },
  { id: 'boot', name: 'Old boot', call: 'an old boot', kind: 'boot', where: ['pond', 'stream'], when: 'any', w: 0.7, color: '#b06634',
    size: 'One boot.',
    fact: 'Not a fish. Somebody, somewhere, is hopping home.' },
];
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));
