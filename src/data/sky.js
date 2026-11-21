// Things a night owl can find with the telescope, for the night-sky pages of
// the journal. `w` is how likely each is to be what's in the eyepiece.
// The facts are real. Keep them true if you add more.
export const SKY = [
  { id: 'moon', name: 'The Moon', call: 'the Moon', w: 5,
    fact: 'The dark patches are wide plains of ancient lava, called maria. The same side of the Moon always faces the Earth.' },
  { id: 'bigdipper', name: 'The Big Dipper', call: 'the Big Dipper', w: 4,
    fact: 'Seven bright stars, part of the Great Bear. The two stars at the end of the bowl point the way to the North Star.' },
  { id: 'northstar', name: 'The North Star', call: 'the North Star', w: 3,
    fact: 'Polaris sits almost exactly above the Earth\'s north pole, so it hardly moves while all the other stars wheel around it.' },
  { id: 'orion', name: 'Orion', call: 'Orion', w: 4,
    fact: 'The hunter. Three stars in a row make his belt. The reddish star at his shoulder, Betelgeuse, is a giant hundreds of times wider than the Sun.' },
  { id: 'cassiopeia', name: 'Cassiopeia', call: 'Cassiopeia', w: 3,
    fact: 'Five stars in a W, or an M, depending on the time of night. It sits on the other side of the North Star from the Big Dipper.' },
  { id: 'pleiades', name: 'The Pleiades', call: 'the Pleiades', w: 3,
    fact: 'A cluster of young stars, also called the Seven Sisters. Most people can count six by eye; a telescope shows dozens.' },
  { id: 'jupiter', name: 'Jupiter', call: 'Jupiter', w: 3,
    fact: 'The biggest planet. A small telescope shows four of its moons as a row of bright dots. Galileo first spotted them in 1610.' },
  { id: 'saturn', name: 'Saturn', call: 'Saturn', w: 2.5,
    fact: 'Its rings are mostly chunks of water ice, some as small as dust and some as big as a house.' },
  { id: 'mars', name: 'Mars', call: 'Mars', w: 2.5,
    fact: 'It looks red because its dust is full of rust.' },
  { id: 'venus', name: 'Venus', call: 'Venus', w: 2.5,
    fact: 'The brightest thing in the night sky after the Moon. Through a telescope it shows phases, like a tiny moon.' },
  { id: 'milkyway', name: 'The Milky Way', call: 'the Milky Way', w: 3,
    fact: 'That pale band is our own galaxy seen from the inside: the light of billions of stars too far away to pick out one by one.' },
  { id: 'comet', name: 'A comet', call: 'a comet', w: 0.7,
    fact: 'A lump of ice and dust. Its tail always points away from the Sun, whichever way the comet is travelling.' },
];
export const SKY_BY_ID = Object.fromEntries(SKY.map(s => [s.id, s]));
