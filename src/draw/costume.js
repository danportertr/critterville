// Costumes and props for the theatre. A costume has a part that goes behind
// the actor (capes, tails, a great big star) and a part that goes on top
// (crowns, masks, a whole ghost sheet). All in critter-local coordinates,
// feet at (0, 0); `hy` is the middle of the head.
import { ctx } from './canvas.js';
import { INK } from '../config.js';
import { TAU } from '../util.js';
import { blob, box, line, tube, dot } from './primitives.js';
import { drawHat } from './cart.js';

export function costumeBack(kind, sd, hy) {
  switch (kind) {
    case 'king': box([[-12, -38], [12, -38], [20, -2], [-20, -2]], '#e0485a', sd, 0.6, 2.2); break;                      // cape
    case 'star': { const p = []; for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 17 : 38; p.push([Math.cos(t) * r, -38 + Math.sin(t) * r]); } box(p, '#ffe66d', sd, 0.6, 2.4); break; }
    case 'monster':
      tube([[8, -14], [24, -6], [34, -14]], 5, '#7fd66a', sd, 0.4);                                                        // tail
      for (let i = 0; i < 4; i++) box([[-9 + i * 6, hy - 16], [-6 + i * 6, hy - 27], [-3 + i * 6, hy - 16]], '#7fd66a', sd + 1 + i, 0.3, 2);   // spikes
      break;
    case 'cloud': for (const [x, y, r] of [[-20, -30, 11], [20, -32, 12], [-12, -46, 10], [14, -48, 10], [0, -20, 12]]) blob(x, y, r, r * 0.8, '#fff', sd + x, 8, 0.05, 0.4, 2.2); break;
    case 'duck': box([[-14, -14], [-24, -22], [-16, -24]], '#fff', sd, 0.3, 2.2); break;                                    // tail feathers
  }
}
export function costumeFront(kind, sd, hy, d) {
  switch (kind) {
    case 'king': box([[-11, hy - 15], [-12, hy - 27], [-6, hy - 21], [0, hy - 29], [6, hy - 21], [12, hy - 27], [11, hy - 15]], '#ffd93b', sd, 0.4, 2.2); dot(0, hy - 19, 1.6, '#e0485a'); break;
    case 'monster': for (const k of [-1, 1]) box([[k * 6, hy - 17], [k * 13, hy - 30], [k * 13, hy - 14]], '#fff', sd + k, 0.3, 2); break;   // horns
    case 'ghost': {   // a sheet over the lot, with two holes
      const pts = [[-20, hy - 16], [0, hy - 23], [20, hy - 16], [24, -8], [16, -2], [8, -8], [0, -2], [-8, -8], [-16, -2], [-24, -8]];
      box(pts, '#fff', sd, 0.8, 2.4);
      dot(d * 3, hy - 4, 2.2); dot(d * 10, hy - 3, 2.2);
      break;
    }
    case 'pirate':
      box([[-19, hy - 9], [-15, hy - 20], [0, hy - 23], [15, hy - 20], [19, hy - 9]], '#e0485a', sd, 0.4, 2.2);              // bandana
      line([[-19, hy - 9], [19, hy - 9]], sd + 1, 2.2, INK, 0.2);
      dot(d * 9, hy - 5.5, 3.2); line([[d * 9, hy - 5.5], [-d * 16, hy - 12]], sd + 2, 1.4, INK, 0.1);                       // eyepatch
      break;
    case 'knight':
      box([[-19, hy - 2], [-17, hy - 17], [0, hy - 23], [17, hy - 17], [19, hy - 2], [9, hy - 2], [9, hy - 9], [-9, hy - 9], [-9, hy - 2]], '#c6c8d2', sd, 0.4, 2.2);   // open-faced helmet
      tube([[0, hy - 22], [4, hy - 32], [-3, hy - 36]], 3, '#e0485a', sd + 1, 0.3);                                          // plume
      break;
    case 'thief': box([[-19, hy - 10], [19, hy - 10], [19, hy - 2], [-19, hy - 2]], '#333', sd, 0.4, 2); dot(d * 4.4, hy - 6, 1.7, '#fff'); dot(d * 9.6, hy - 5.4, 1.7, '#fff'); break;
    case 'duck':
      box([[d * 8, hy + 2], [d * 22, hy + 5], [d * 8, hy + 9]], '#ffa23d', sd, 0.3, 2);                                       // beak
      box([[-9, hy - 16], [-10, hy - 25], [-4, hy - 20], [0, hy - 26], [4, hy - 20], [10, hy - 25], [9, hy - 16]], '#ffd93b', sd + 1, 0.3, 2);
      break;
    case 'wizard': ctx.save(); ctx.translate(0, hy - 17); drawHat({ kind: 'wizard', color: '#3b3f73' }, d, sd); ctx.restore(); break;
    case 'tophat': ctx.save(); ctx.translate(0, hy - 17); drawHat({ kind: 'top', color: '#555' }, d, sd); ctx.restore(); break;
    case 'cloud': blob(0, hy - 18, 13, 7, '#fff', sd + 9, 8, 0.05, 0.4, 2.2); break;
  }
}
/** Something held in the hand at (x, y), pointing the way the actor faces (d). */
export function stageProp(kind, x, y, d, sd, t = 0) {
  switch (kind) {
    case 'sword': line([[x, y], [x + d * 4, y - 26]], sd, 3, '#c6c8d2', 0.2); line([[x, y], [x + d * 4, y - 26]], sd, 1, INK, 0.2); line([[x - d * 5, y - 5], [x + d * 6, y - 3]], sd + 1, 3, INK, 0.2); break;
    case 'rod': line([[x, y], [x + d * 22, y - 30]], sd, 2, INK, 0.3); line([[x + d * 22, y - 30], [x + d * 26, y - 12]], sd + 1, 1, INK, 0.2); break;
    case 'telescope': tube([[x - d * 2, y], [x + d * 16, y - 12]], 4, '#b7a6ff', sd, 0.2); break;
    case 'umbrella': line([[x, y + 4], [x, y - 26]], sd, 2, INK, 0.2); box([[x - 17, y - 24], [x - 10, y - 35], [x, y - 39], [x + 10, y - 35], [x + 17, y - 24]], '#8fd3ff', sd + 1, 0.4, 2.2); break;
    case 'lantern': line([[x, y], [x, y + 6]], sd, 1.6, INK, 0.1); box([[x - 4, y + 6], [x + 4, y + 6], [x + 4, y + 15], [x - 4, y + 15]], '#ffe98a', sd + 1, 0.3, 2); break;
    case 'hammer': line([[x, y], [x + d * 2, y - 14]], sd, 2.4, INK, 0.2); box([[x - d * 5, y - 18], [x + d * 8, y - 18], [x + d * 8, y - 12], [x - d * 5, y - 12]], '#bbb', sd + 1, 0.3, 2); break;
    case 'sack': blob(x, y + 8, 8, 9, '#c9966b', sd, 8, 0.1, 0.4, 2.2); line([[x - 3, y], [x + 3, y]], sd + 1, 2, INK, 0.2); break;
    case 'map': box([[x - 7, y - 10], [x + 8, y - 11], [x + 8, y], [x - 7, y + 1]], '#fff3b0', sd, 0.4, 2); line([[x - 4, y - 7], [x, y - 4], [x + 5, y - 7]], sd + 1, 1, '#e0485a', 0.2); break;
    case 'hat': ctx.save(); ctx.translate(x, y - 4); ctx.scale(0.7, 0.7); drawHat({ kind: 'top', color: '#ff8fc7' }, d, sd); ctx.restore(); break;
  }
}
