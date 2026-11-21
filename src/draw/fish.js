// Doodles of the things in data/fish.js. Used for the catch popping out of the
// water and for the pictures in the fish book.
import { ctx } from './canvas.js';
import { INK } from '../config.js';
import { hs } from '../util.js';
import { blob, box, line, tube, dot } from './primitives.js';

const LW = 1.8;

function regularFish(sp, sd) {
  const L = sp.L, h = sp.h, a = L / 2, pat = sp.pat || [];
  box([[-a + 2, 0], [-a - 6, -h * 0.5], [-a - 4.5, 0], [-a - 6, h * 0.5]], sp.fin, sd + 1, 0.3, LW);          // tail
  box([[-a * 0.3, -h * 0.4], [a * 0.1, -h * 0.85], [a * 0.35, -h * 0.4]], sp.fin, sd + 2, 0.3, LW);            // back fin
  if (pat.includes('spines')) for (const x of [-2, 1, 4]) line([[x, -h * 0.45], [x - 1.5, -h * 0.95]], sd + 30 + x, 1.4, sp.pc, 0.2);
  blob(0, 0, a, h / 2, sp.color, sd, 9, 0.05, 0.3, LW);
  box([[a * 0.1, h * 0.15], [-a * 0.2, h * 0.6], [a * 0.3, h * 0.35]], sp.fin, sd + 3, 0.3, 1.4);              // side fin
  if (pat.includes('bars')) for (let i = 0; i < 4; i++) { const x = -a * 0.55 + i * a * 0.35; line([[x, -h * 0.36], [x - 0.6, h * 0.12]], sd + 10 + i, 1.8, sp.pc, 0.2); }
  if (pat.includes('stripe')) line([[-a * 0.75, 0.3], [0, -0.5], [a * 0.5, 0.3]], sd + 15, 2, sp.pc, 0.3);
  if (pat.includes('spots')) for (let i = 0; i < 7; i++) dot((hs(sd, i) - 0.55) * L * 0.7, (hs(sd, i + 20) - 0.6) * h * 0.55, 0.9, sp.pc2 || sp.pc);
  if (pat.includes('earspot')) dot(a * 0.42, -0.5, 1.7, sp.pc);
  if (pat.includes('whiskers')) for (const k of [-1, 1]) line([[a - 1, 1.5], [a + 3, 2.5 + k * 2.5], [a + 5, 2 + k * 4]], sd + 40 + k, 1.2, INK, 0.2);
  dot(a * 0.68, -h * 0.12, 1.2);
}
const KINDS = {
  eel(sp, sd) {
    tube([[-15, 2], [-9, -3], [-2, 3], [6, -2], [13, 1]], 4.5, sp.color, sd, 0.4);
    dot(11.5, -0.2, 1);
  },
  tadpole(sp, sd) {
    tube([[-3, 0], [-8, -2.5], [-12, 1.5], [-15, -1]], 1.6, sp.color, sd + 1, 0.3);   // a green tail to match
    blob(1, 0, 5, 4.2, sp.color, sd, 8, 0.05, 0.3, LW);
    dot(3.4, -1, 0.9, '#fff');
  },
  crayfish(sp, sd) {
    for (const k of [-1, 1]) {
      line([[6, k * 2], [11, k * 5]], sd + 5 + k, 1.6, INK, 0.2);                                              // arms
      blob(13, k * 6, 3.4, 2.4, sp.color, sd + 2 + k, 7, 0.1, 0.3, LW);                                       // claws
      line([[8, k * 1], [15, k * 1.5], [19, k * 3.5]], sd + 8 + k, 1, INK, 0.2);                              // feelers
      for (const x of [-2, 1, 4]) line([[x, k * 3], [x - 1, k * 6.5]], sd + 20 + x + k, 1.3, INK, 0.2);       // legs
    }
    for (let i = 0; i < 3; i++) blob(-6 - i * 3.6, 0, 2.8 - i * 0.3, 3.4 - i * 0.5, sp.color, sd + 12 + i, 7, 0.05, 0.3, LW);   // tail
    blob(2, 0, 7, 4, sp.color, sd, 9, 0.05, 0.3, LW);
    dot(7.2, -1.6, 0.9); dot(7.2, 1.6, 0.9);
  },
  boot(sp, sd) {
    box([[-6, -10], [1, -10], [1, -2], [9, -1], [10, 5], [-6, 5]], sp.color, sd, 0.5, LW);
    line([[-6, 5.5], [10, 5.5]], sd + 1, 2.6, INK, 0.3);
    for (const y of [-6, -3]) line([[-2, y], [1, y + 0.5]], sd + 2 + y, 1.2, '#fff3b0', 0.2);
  },
};

/** Draw species `sp` centred on (x, y), facing right (or left if flip). */
export function drawFish(sp, x, y, scale = 1, seed = 1, flip = false) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(flip ? -scale : scale, scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  (KINDS[sp.kind] || regularFish)(sp, seed);
  ctx.restore();
}
/** The same shape in flat grey, for something nobody has caught yet. */
export function drawMystery(sp, x, y, scale = 1, seed = 1) {
  const grey = '#e2dfd6';
  drawFish({ ...sp, color: grey, fin: grey, pat: (sp.pat || []).filter(p => p === 'spines' || p === 'whiskers'), pc: '#bbb' }, x, y, scale, seed);
}
