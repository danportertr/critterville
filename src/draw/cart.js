// Visiting carts and the things critters get from them: hats and balloons.
import { ctx } from './canvas.js';
import { S } from '../state.js';
import { INK, WOOD } from '../config.js';
import { TAU } from '../util.js';
import { blob, box, line, tube, dot, smooth, wob, paint } from './primitives.js';

export const HAT_KINDS = ['top', 'cone', 'beanie', 'straw', 'cap', 'crown'];

/**
 * A hat, drawn with (0, 0) at the top of the wearer's head. `look` is which
 * way they're facing (-1..1), for hats with a front.
 */
export function drawHat(hat, look = 1, seed = 1) {
  const c = hat.color, lw = 2.2;
  switch (hat.kind) {
    case 'top':
      box([[-10, 1], [-9, -17], [9, -17], [10, 1]], c, seed, 0.4, lw);
      tube([[-16, 1], [16, 1]], 2.6, c, seed + 1, 0.3);
      line([[-9.5, -4], [9.5, -4]], seed + 2, 2.4, '#fff', 0.2);
      break;
    case 'cone':
      box([[-9, 3], [0, -22], [9, 3]], c, seed, 0.4, lw);
      line([[-5.5, -6], [5, -9]], seed + 2, 2, '#fff', 0.2);
      blob(0, -23, 3.2, 3.2, '#fff', seed + 1, 6, 0.05, 0.3, 1.8);
      break;
    case 'beanie':
      smooth(wob([[-17, 5], [-16, -5], [-8, -12], [8, -12], [16, -5], [17, 5], [0, 2]], seed, 0.4), true); paint(c, lw);
      line([[-16.5, 2], [0, -1], [16.5, 2]], seed + 2, 2.2, '#fff', 0.2);
      blob(0, -13, 3.6, 3.4, '#fff', seed + 1, 6, 0.05, 0.3, 1.8);
      break;
    case 'straw':
      blob(0, 2, 25, 5.5, '#ffe08a', seed, 10, 0.03, 0.4, lw);
      smooth(wob([[-11, 1], [-9, -9], [0, -12], [9, -9], [11, 1]], seed + 1, 0.3), true); paint('#ffe08a', lw);
      line([[-10, -2], [10, -2]], seed + 2, 2.6, c, 0.2);
      break;
    case 'cap': {
      const d = look < 0 ? -1 : 1;
      box([[d * 10, 3], [d * 27, 4], [d * 12, -3]], c, seed + 1, 0.3, lw);
      smooth(wob([[-14, 4], [-12, -7], [0, -11], [12, -7], [14, 4], [0, 2]], seed, 0.3), true); paint(c, lw);
      dot(0, -11, 1.6);
      break;
    }
    default:   // 'crown': a ring of flowers
      line([[-16, 3], [-9, -3], [0, -5], [9, -3], [16, 3]], seed, 2.2, '#5fb86a', 0.3);
      [[-13, 0], [-6, -4], [1, -5], [8, -3.5], [14, 0.5]].forEach(([x, y], i) => blob(x, y, 3.2, 3.2, i % 2 ? '#ffe833' : c, seed + 1 + i, 6, 0.1, 0.2, 1.6));
  }
}

/** A balloon on a string, held at (x, y) in whatever space we're drawing in. */
export function drawBalloon(b, x, y, k = 1) {
  const sway = Math.sin(S.now * 1.6 + b.seed) * 3 * k, bx = x - 3 * k + sway, by = y - 44 * k;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sway * 0.4 + 3 * k, y - 22 * k, bx, by + 11 * k);
  ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
  box([[bx - 2 * k, by + 13 * k], [bx + 2 * k, by + 13 * k], [bx, by + 10 * k]], b.color, b.seed, 0.2, 1.6);
  blob(bx, by, 9 * k, 11 * k, b.color, b.seed + 1, 9, 0.04, 0.4, 2.2);
  line([[bx - 4 * k, by - 5 * k], [bx - 5.5 * k, by - 1 * k]], b.seed + 2, 1.6, '#fff', 0.2);
}

const CONE = (x, y, color, seed) => { box([[x - 3.5, y - 6], [x + 3.5, y - 6], [x, y + 4]], '#f0c27a', seed, 0.2, 1.6); blob(x, y - 9, 4.4, 4.2, color, seed + 1, 7, 0.06, 0.3, 1.8); };
export { CONE as drawCone };

/** The cart itself: wheels, a wooden box, a striped awning, and its wares. */
export function drawCart(v) {
  const sd = v.seed, d = v.d, kind = v.kind;
  ctx.save(); ctx.translate(v.cartX, v.y);
  ctx.fillStyle = 'rgba(0,0,0,.09)'; ctx.beginPath(); ctx.ellipse(0, 1, 40, 6, 0, 0, TAU); ctx.fill();
  line([[d * 28, -24], [d * 46, -22]], sd + 9, 3, INK, 0.3);                                   // handle
  for (const x of [-26, 26]) line([[x, -36], [x + (x < 0 ? -2 : 2), -72]], sd + x, 3, WOOD, 0.3);
  box([[-31, -13], [31, -13], [29, -37], [-29, -37]], WOOD, sd, 0.6);
  line([[-29, -25], [29, -25]], sd + 1, 1.8, INK, 0.3);
  for (const x of [-19, 19]) {                                                                // wheels turn as it rolls
    blob(x, -9, 9.5, 9.5, '#e9c9a0', sd + 2 + x, 9, 0.03, 0.3, 2.4);
    const a = v.cartX / 9.5;
    for (let i = 0; i < 3; i++) line([[x + Math.cos(a + i * 1.05) * 8, -9 + Math.sin(a + i * 1.05) * 8], [x - Math.cos(a + i * 1.05) * 8, -9 - Math.sin(a + i * 1.05) * 8]], sd + 20 + i + x, 1.4, INK, 0.1);
    dot(x, -9, 2);
  }
  box([[-38, -68], [38, -68], [31, -86], [-31, -86]], v.canopy, sd + 3, 0.7);                 // awning
  for (const x of [-19, 0, 19]) line([[x * 1.05, -69], [x * 0.85, -85]], sd + 30 + x, 3, '#fff', 0.2);
  if (kind === 'hat') {
    [['top', '#444', -18], ['cone', '#ff8fc7', 0], ['straw', '#ff6e45', 18]].forEach(([k, c, x], i) => { ctx.save(); ctx.translate(x, -39); ctx.scale(0.62, 0.62); drawHat({ kind: k, color: c }, 1, sd + 40 + i); ctx.restore(); });
  } else if (kind === 'balloon') {
    ['#ff8f8f', '#ffe66d', '#8fd3ff', '#b7a6ff'].forEach((c, i) => drawBalloon({ color: c, seed: sd + i * 7 }, -24 + i * 4, -70, 0.8 + (i % 2) * 0.12));
  } else {
    CONE(-14, -42, '#ff8fc7', sd + 50); CONE(0, -43, '#fff3b0', sd + 52); CONE(14, -42, '#b7f0c0', sd + 54);
  }
  ctx.restore();
}
