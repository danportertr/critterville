# Critterville

<img src="assets/critter.png" width="180" alt="A critter: pink head, yellow body, big smile">

A tiny town of little guys who walk around and do things. There isn't much to do except watch — it's something to leave running.

The town starts as an empty meadow: trees, a pond, a few flowers. The critters build everything else themselves — first a campfire, then houses, a swing set and a pool — and a few more move in until it's a small, settled town. There are no scores. The **journal** button opens the town's diary (who moved in, what got built, what was painted) and a fish book: a picture and a few true facts about each kind of fish the critters have caught.

The critters:

- talk to each other
- swing on the swing set
- swim in the pool
- make sculptures, and paintings of whatever they can see from the easel (and go admire each other's)
- dance, sometimes in groups
- fish in the pond or the stream (a town has one or the other, sometimes both), plant flowers, pick apples, kick a ball around
- build the campfire, houses (and later add chimneys, side rooms and upstairs), a bridge, the swing set, a fish tank and the pool
- jump the stream until there's a bridge, then mostly use that
- keep a few of the fish they catch in the tank for a while, and come by to watch them
- gather at the campfire in the evening and go home to sleep at night

You can tap a critter to say hi, tap a house to see who lives there, or tap the ground to drop a snack. There's also a little ♪ radio button that plays a lofi internet radio stream (the critters dance more when it's on); the stations are listed in `src/config.js`. The town is saved in your browser, so it's still there when you come back.

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
  radio.js           the lofi radio button
  draw/
    primitives.js    wobbly hand-drawn shapes ("line boil")
    critter.js       drawing a critter and its speech bubble
    scenery.js       houses, trees, pond, stream, pool, swing set, artworks...
    fish.js          fish doodles
    render.js        one frame: depth sort, day/night wash, glows
  world/
    geometry.js      obstacles and finding empty spots
    town.js          generating a town; factories for houses and critters
    save.js          localStorage save/load
  sim/
    core.js          the critter brain: states, activities, walking
    world.js         clock, ball, growth, new arrivals
  activities/        one module per thing a critter can do
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
