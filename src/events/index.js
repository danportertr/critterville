// Rare events. Every day or three, something unusual happens that leaves the
// town a little different: flowers after rain, a fallen star, a seedling, ducks,
// a traveller with a cart.
//
// An event is { id, can(), start(), update?(e, dt), overlay?(e), end?(e) }:
//   can()       is now a sensible moment for it?
//   start()     returns the running event's data; must include `dur` (seconds)
//   update      runs every tick while it lasts (e.t counts up to e.dur)
//   overlay     draws over the whole scene (rain, a streak across the sky...)
//   end         whatever it leaves behind
// To add one, write a module next to these and put it in the list below.
import { S } from '../state.js';
import { DAY_LEN } from '../config.js';
import { rand, pick } from '../util.js';
import rain from './rain.js';
import star from './star.js';
import wind from './wind.js';
import ducks from './ducks.js';
import ring from './ring.js';
import cart from './cart.js';
import { farewell, adventure } from './journeys.js';

const EVENTS = [rain, star, wind, ducks, ring, cart, farewell, adventure];
const later = () => S.clock + rand(1.2, 2.6) * DAY_LEN;

function begin(def) {
  S.event = { def, t: 0, ...def.start() };
  S.recent = { id: def.id, kind: def.id === 'cart' && S.visitor ? S.visitor.kind : undefined, clock: S.clock };   // painters remember it for a while
}
/** Make something happen right now (handy from the console: critterville.trigger('rain')). */
export function trigger(id) {
  const def = EVENTS.find(d => d.id === id);
  if (def && !S.event) begin(def);
  return !!def;
}

export function updateEvents(dt) {
  const e = S.event;
  if (e) {
    e.t += dt;
    if (e.def.update) e.def.update(e, dt);
    if (e.t >= e.dur) { S.event = null; if (e.def.end) e.def.end(e); S.nextEvent = later(); }
    return;
  }
  if (!S.nextEvent) S.nextEvent = later();
  if (S.clock < S.nextEvent) return;
  const ready = EVENTS.filter(d => d.can());
  if (ready.length) begin(pick(ready)); else S.nextEvent = S.clock + 20;   // wrong time of day: look again shortly
}

export function drawEventOverlay() {
  const e = S.event;
  if (e && e.def.overlay) e.def.overlay(e);
}
