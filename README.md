# Critterville

<img src="assets/critter.png" width="180" alt="A critter: pink head, yellow body, big smile">

A tiny town of little guys who walk around and do things. There isn't much to do except watch — it's something to leave running.

The town starts as an empty meadow: trees, a pond, a few flowers. The critters build everything else themselves — first a campfire, then houses, a swing set and a pool — and a few more move in until it's a small, settled town. There are no scores and nothing to collect.

The critters:

- talk to each other
- swing on the swing set
- swim in the pool
- make paintings and sculptures (and go admire each other's)
- dance, sometimes in groups
- fish in the pond, plant flowers, pick fruit, kick a ball around
- build the campfire, houses, swing set and pool
- gather at the campfire in the evening and go home to sleep at night

You can tap a critter to say hi, or tap the ground to drop a snack. The town is saved in your browser, so it's still there when you come back.

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
  draw/
    primitives.js    wobbly hand-drawn shapes ("line boil")
    critter.js       drawing a critter and its speech bubble
    scenery.js       houses, trees, pond, pool, swing set, artworks...
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
