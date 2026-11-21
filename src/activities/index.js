// Everything a critter can decide to do. To add something new: write a module
// next to these that exports an activity (see sim/core.js for the shape) and
// register it here.
import { register } from '../sim/core.js';
import { wander, rest } from './wander.js';
import chat from './chat.js';
import dance from './dance.js';
import fish from './fish.js';
import garden from './garden.js';
import { snack, fruit } from './snack.js';
import ball from './ball.js';
import build, { monumentWork } from './build.js';
import campfire from './campfire.js';
import sleep from './sleep.js';
import swing from './swing.js';
import swim from './swim.js';
import { art, admire, repaint, tidy } from './art.js';
import tank from './tank.js';
import hammock from './hammock.js';
import { respond } from './sculpture.js';
import topiary from './topiary.js';
import cairn from './cairn.js';
import { stargaze } from '../events/star.js';
import { ringDance } from '../events/ring.js';
import { shop } from '../events/cart.js';
import { story } from '../events/journeys.js';
import { findHat, picnicking, investigate } from './errands.js';
import { stargaze as telescope, isNightOwl, nightLife } from './night.js';
import { nightHooks } from '../sim/core.js';
import { playgoer } from '../events/theatre.js';
import { craft, perform, audience as musicAudience } from './music.js';
import { prankster, cleanUp } from './prank.js';

[wander, rest, chat, dance, fish, garden, snack, fruit, ball, build, campfire, sleep, swing, swim, art, admire, repaint, tidy, tank, hammock, respond, topiary, cairn, stargaze, ringDance, shop, story, findHat, picnicking, investigate, telescope, playgoer, monumentWork, craft, perform, musicAudience, prankster, cleanUp].forEach(register);

nightHooks.life = c => isNightOwl(c) && nightLife(c);
