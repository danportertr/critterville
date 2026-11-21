// The theatre: a wooden stage with a painted backdrop and red curtains.
// It's drawn in two layers so the actors can stand between them:
// drawStageBack (platform, posts, backdrop), then the cast, then
// drawStageFront (the pelmet and curtains).
import { ctx } from './canvas.js';
import { INK, WOOD } from '../config.js';
import { TAU, clamp } from '../util.js';
import { box, line, tube } from './primitives.js';
import { drawBackdrop } from './scenery.js';

export const STAGE = { w: 196, h: 14, top: 132 };   // platform width and height; how tall the frame stands
const RED = '#e0485a';

export function drawStageBack(th) {
  const g = th.progress, sd = th.seed, w = STAGE.w / 2;
  ctx.save(); ctx.translate(th.x, th.y);
  ctx.fillStyle = 'rgba(0,0,0,.09)'; ctx.beginPath(); ctx.ellipse(0, 2, w + 12, 8, 0, 0, TAU); ctx.fill();
  if (g > 0.45) for (const k of [-1, 1]) tube([[k * (w - 4), -STAGE.h], [k * (w - 4), -STAGE.top * clamp((g - 0.45) / 0.3, 0.1, 1)]], 5, WOOD, sd + k, 0.4);
  if (g > 0.8) {   // the backdrop: a painted cloth, blank until there's a play to paint it for
    const x0 = -w + 12, y0 = -STAGE.top + 8, bw = 2 * w - 24, bh = STAGE.top - STAGE.h - 8;
    box([[x0, y0], [x0 + bw, y0], [x0 + bw, y0 + bh], [x0, y0 + bh]], '#fff', sd + 3, 0.6);
    if (th.play) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, bw, bh); ctx.clip();
      ctx.translate(0, y0); ctx.scale(bw / 48, bh / 42); ctx.translate(0, 70);   // scene pictures are drawn in a 48×42 box at (-24, -70)
      drawBackdrop(th.play.backdrop, sd);
      ctx.restore();
      box([[x0, y0], [x0 + bw, y0], [x0 + bw, y0 + bh], [x0, y0 + bh]], null, sd + 3, 0.6);
    }
  }
  box([[-w, 0], [w, 0], [w - 3, -STAGE.h], [-w + 3, -STAGE.h]], '#d9a878', sd + 4, 0.7);   // the platform
  for (let x = -w + 24; x < w; x += 24) line([[x, -1], [x - 0.5, -STAGE.h + 1]], sd + x, 1.4, INK, 0.2);
  ctx.restore();
}
export function drawStageFront(th) {
  const g = th.progress, sd = th.seed, w = STAGE.w / 2, top = -STAGE.top;
  if (g < 1) return;
  ctx.save(); ctx.translate(th.x, th.y);
  const open = th.phase === 'show' ? clamp(th.curtain || 0, 0, 1) : 0;   // curtains part for the show
  const edge = 14 + (1 - open) * (w - 14);                                 // how far in each curtain reaches
  for (const k of [-1, 1]) {
    const pts = [[k * w, top + 6], [k * (w - edge), top + 6], [k * (w - edge * (0.75 + 0.25 * (1 - open))), -STAGE.h - 2], [k * w, -STAGE.h - 2]];
    box(pts, RED, sd + 10 + k, 0.8);
    for (let i = 1; i < 4; i++) { const x = k * (w - edge * i / 4); line([[x, top + 8], [x - k * 2 * open, -STAGE.h - 4]], sd + 20 + i + k, 1.4, '#b8364a', 0.3); }
  }
  const pel = [[-w - 6, top - 6], [w + 6, top - 6], [w + 6, top + 10]];   // scalloped pelmet along the top
  for (let i = 6; i >= 0; i--) { const x = -w - 6 + (2 * w + 12) * i / 7; pel.push([x + (2 * w + 12) / 14, top + 16], [x, top + 10]); }
  box(pel, RED, sd + 30, 0.6);
  ctx.restore();
}
