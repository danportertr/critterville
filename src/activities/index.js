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
import build from './build.js';
import campfire from './campfire.js';
import sleep from './sleep.js';
import swing from './swing.js';
import swim from './swim.js';
import { art, admire } from './art.js';
import tank from './tank.js';
import hammock from './hammock.js';
import { stargaze } from '../events/star.js';
import { ringDance } from '../events/ring.js';

[wander, rest, chat, dance, fish, garden, snack, fruit, ball, build, campfire, sleep, swing, swim, art, admire, tank, hammock, stargaze, ringDance].forEach(register);
