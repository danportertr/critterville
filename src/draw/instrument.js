// What the instruments look like while they're being played (or made).
// Drawn in critter-local coordinates. Flutes and horns go to the mouth, so
// they're drawn in front of the face; the rest sit in front of the body.
import { ctx } from './canvas.js';
import { INK } from '../config.js';
import { blob, box, line, tube, dot } from './primitives.js';

/** Things held low: drums, strings, a row of chimes. */
export function instrumentBody(ins, p, sd, beat = 0) {
  const d = p.d;
  if (ins.family === 'drum') {
    box([[d * 8, -6], [d * 30, -6], [d * 28, -24], [d * 10, -24]], ins.c2, sd, 0.4, 2.2);
    blob(d * 19, -24, 11.5, 4, '#fff3dc', sd + 1, 8, 0.03, 0.3, 2);
    line([[d * 10, -15], [d * 28, -15]], sd + 2, 1.6, ins.c1, 0.2);
  } else if (ins.family === 'strings') {
    blob(d * 6, -22, 10, 8.5, ins.c2, sd, 8, 0.06, 0.3, 2.2);
    tube([[d * 10, -26], [-d * 22, -40]], 2.4, ins.c2, sd + 1, 0.2);
    dot(d * 6, -22, 2.4); for (const k of [-1, 0, 1]) line([[d * 8, -23 + k * 1.6], [-d * 20, -39 + k * 1.2]], sd + 3 + k, 0.7, INK, 0.05);
    box([[-d * 21, -43], [-d * 25, -41], [-d * 23, -37]], ins.c1, sd + 2, 0.2, 1.6);
  } else if (ins.family === 'mallet') {
    for (const k of [-1, 1]) line([[d * (22 + k * 12), 0], [d * (22 + k * 9), -18]], sd + k, 2, INK, 0.2);
    for (let i = 0; i < 5; i++) box([[d * (9 + i * 6), -18], [d * (13.5 + i * 6), -18], [d * (13.5 + i * 6), -24 - (4 - i) * 1.4], [d * (9 + i * 6), -24 - (4 - i) * 1.4]], i % 2 ? ins.c1 : ins.c2, sd + 3 + i, 0.2, 1.8);
    for (const h of [p.HL, p.HR]) { line([h, [h[0] + d * 6, h[1] + 9]], sd + 9, 1.6, INK, 0.1); dot(h[0] + d * 6, h[1] + 9, 2.2, ins.c1); }
  }
}
/** Things blown: a flute held sideways, or a curly horn. */
export function instrumentAtMouth(ins, p, sd, hy) {
  const d = p.d, mx = d * 6, my = hy + 9;
  if (ins.family === 'flute') {
    tube([[mx, my], [mx + d * 30, my - 3]], 2.6, ins.c2, sd, 0.2);
    for (let i = 1; i < 4; i++) dot(mx + d * (8 + i * 6), my - 0.8 - i * 0.6, 0.9);
    line([[mx + d * 27, my - 5], [mx + d * 27, my - 0.5]], sd + 1, 2, ins.c1, 0.1);
  } else if (ins.family === 'horn') {
    tube([[mx, my], [mx + d * 12, my + 6], [mx + d * 24, my + 2], [mx + d * 27, my - 9]], 3.4, ins.c2, sd, 0.3);
    blob(mx + d * 28, my - 13, 7, 5, ins.c1, sd + 1, 8, 0.05, 0.3, 2.2);
  }
}
