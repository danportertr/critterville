# Critterville

<img src="assets/critter.png" width="180" alt="A critter: pink head, yellow body, big smile">

A tiny town of little guys who walk around and do things. There isn't much to do except watch — it's something to leave running.

The town starts as an empty meadow: trees, a pond, a few flowers. The critters build everything else themselves — first a campfire, then houses, a swing set and a pool — and a few more move in until it's a small, settled town. There are no scores. The **journal** button opens the town's diary (who moved in, what got built, what was painted) a fish book (a picture and a few true facts about each kind of fish the critters have caught), and a night-sky page for what the night owls find through the telescope.

The critters:

- talk to each other, and not just noises: news of what's happened spreads from critter to critter, along with fish stories that grow in the telling, last night's dreams, and compliments
- make friends with whoever they talk to most, and sometimes go off to swim, fish or swing together
- swing on the swing set
- swim in the pool
- make sculptures: stone and wooden statues that gather moss, ones carved from a fallen star that glow, sandcastles that the next rain washes away, piles of found things, and working pieces (a sundial, a weathervane, a birdbath that fills in the rain, a bench to sit on)
- hang hats on statues, lean on them, leave flowers at their feet, and strike the same pose
- add stones to a cairn by the water, clip trees into shapes, and chip away for weeks at one big shared monument
- sometimes paint over an old picture, or take old art down, so the town doesn't silt up
- occasionally move away (everyone comes to wave them off), or set off on an adventure with a knapsack and come back days later with stories to tell and paint
- make paintings of what they can see from the easel: sometimes the whole view, sometimes a close-up or portrait, a colour-washed version, or something abstract (and go admire each other's)
- dance, sometimes in groups
- fish in the pond or the stream (a town has one or the other, sometimes both), plant flowers, pick apples, kick a ball around
- build the campfire, houses (and later add chimneys, side rooms and upstairs), a bridge, the swing set, a fish tank and the pool
- jump the stream until there's a bridge, then mostly use that
- keep a few of the fish they catch in the tank for a while, and come by to watch them
- string a hammock between two trees, two houses, or a house and a tree, if a pair happens to be the right distance apart, and take turns lying in it
- gather at the campfire in the evening and go home to sleep at night, except for the one or two night owls, who set up a telescope, fish in the dark, follow fireflies, and sleep in

Every day or three something rare happens that leaves the town a little different: a shower brings up flowers (and a rainbow), a shooting star lands and stays as a glowing stone, a windy spell leaves a seedling that grows into a new tree, a duck family moves onto the water, or a ring of mushrooms appears and everyone dances in it. Now and then there's a picnic, a hat blows away and gets brought back, a postcard arrives from someone who left, or a rumour goes round about something big in the water. Sometimes a traveller wheels a cart into town for a few days: a hatmaker (critters keep their hats), a balloon seller, or an ice cream cart.

You can tap a critter to say hi, tap a house to see who lives there, tap a painting to see it up close, or tap the ground to drop a snack. There's also a little ♪ radio button that plays a lofi internet radio stream (the critters dance more when it's on); the stations are listed in `src/config.js`. The town is saved in your browser, so it's still there when you come back.

## Which build am I looking at?

Click the "Critterville" title to show a small `build N`: the version the page is actually running. GitHub Pages lets browsers cache files for about ten minutes, so after an update the page checks for itself and shows a "build N is out: reload" button if it's behind. In the console, `critterville.version` gives the same number.

The number lives in `src/version.js`. Bump it by one whenever you commit a change.

## Running it

No build step and no dependencies: it's plain ES modules drawn on a canvas. Serve the folder with anything, for example:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000. Add `?speed=10` to the URL to fast-forward time.

## How the code is laid out

```
index.html
css/style.css
src/
  main.js            boot, resize, frame loop
  config.js          tunables, palettes, names
  state.js           the one shared world object + time of day
  util.js            maths and random helpers
  ui.js              stats line, event log, hint
  input.js           tapping critters, dropping snacks
  journal.js         the town's diary and fish records
  journalPanel.js    the journal you open and read
  data/fish.js       fish species and their facts
  data/sky.js        planets and constellations and their facts
  radio.js           the lofi radio button
  draw/
    primitives.js    wobbly hand-drawn shapes ("line boil")
    critter.js       drawing a critter and its speech bubble
    scenery.js       houses, trees, pond, stream, pool, swing set, artworks...
    fish.js          fish doodles
    props.js         things events leave behind, and hammocks
    render.js        one frame: depth sort, day/night wash, glows
  world/
    geometry.js      obstacles and finding empty spots
    town.js          generating a town; factories for houses and critters
    save.js          localStorage save/load
  sim/
    core.js          the critter brain: states, activities, walking
    world.js         clock, ball, growth, new arrivals
  activities/        one module per thing a critter can do
  events/            one module per rare event (rain, shooting star, wind, ducks, mushroom ring)
```

### Adding something for critters to do

Each file in `src/activities/` exports an activity:

```js
export default {
  id: 'nap',
  weight: c => 1,                 // how appealing right now (0 = not possible)
  start(c) { goTo(c, x, y, () => setAct(c, 'nap', 10)); },
  states: {
    nap: {
      pose(c, p) { p.eyesClosed = true; },   // optional hooks: update, finish, pose, props, transform, after
    },
  },
};
```

Register it in `src/activities/index.js` and critters will start doing it. The hooks are documented at the top of `src/sim/core.js`.
