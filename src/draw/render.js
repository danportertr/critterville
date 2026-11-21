// One frame: ground, depth-sorted things, the time-of-day wash, then glows and bubbles.
import { ctx } from './canvas.js';
import { S, phase, nightAmt, built } from '../state.js';
import { INK, PAPER, FONT, HOUSE } from '../config.js';
import { wallTop } from './scenery.js';
import { clamp, lerp, smoothstep, hs } from '../util.js';
import { drawCritter, drawBubble } from './critter.js';
import { box } from './primitives.js';
import * as sc from './scenery.js';
import { drawStone, drawDucks, drawRing, drawHammock } from './props.js';
import { drawCart, drawBalloon } from './cart.js';
import { drawCairn, drawMonument } from './sculpture.js';
import { drawEventOverlay } from '../events/index.js';

const TINTS = [[0, [255, 233, 220]], [0.05, [255, 255, 255]], [0.58, [255, 255, 255]], [0.66, [255, 214, 186]], [0.74, [140, 147, 214]], [0.93, [140, 147, 214]], [1, [255, 233, 220]]];
function tint(p) {
  for (let i = 1; i < TINTS.length; i++) if (p <= TINTS[i][0]) {
    const [a, ca] = TINTS[i - 1], [b, cb] = TINTS[i], t = (p - a) / (b - a);
    return `rgb(${ca.map((v, k) => Math.round(lerp(v, cb[k], t))).join(',')})`;
  }
  return '#fff';
}
function glow(x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function zzz(x, y, seed) {
  for (let i = 0; i < 2; i++) {
    const t = (S.now * 0.35 + i * 0.5 + hs(seed, 1)) % 1;
    ctx.globalAlpha = Math.sin(t * Math.PI) * 0.8;
    ctx.fillText('z', x + t * 14 + Math.sin(t * 9) * 2, y - t * 30);
  }
  ctx.globalAlpha = 1;
}

export function render() {
  const n = nightAmt(), p = phase(), { W, H } = S;
  ctx.setTransform(S.dpr * S.zoom, 0, 0, S.dpr * S.zoom, 0, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  for (const t of S.tufts) sc.drawTuft(t);
  if (S.stream) sc.drawStream();
  if (S.bridge) sc.drawBridge();
  if (S.pond) sc.drawPond();
  if (S.pool) sc.drawPool();
  if (S.ducks) drawDucks();
  for (const r of S.rings) drawRing(r);

  // Everything standing on the ground, back to front.
  const lit = new Set(S.critters.filter(c => c.hidden && c.home).map(c => c.home));
  const fireLit = clamp(Math.max(n, p < 0.9 ? smoothstep(0.58, 0.64, p) : 0), 0, 1);
  const items = [];
  if (S.fire) items.push([S.fire.y, sc.drawFire, fireLit]);
  if (S.ball) items.push([S.ball.y, sc.drawBall]);
  if (S.swing) items.push([S.swing.y, sc.drawSwing, S.swing]);
  if (S.tank) items.push([S.tank.y, sc.drawTank, S.tank]);
  for (const h of S.houses) items.push([h.y, sc.drawHouse, h, lit.has(h)]);
  for (const t of S.trees) items.push([t.y, sc.drawTree, t]);
  for (const f of S.flowers) items.push([f.y, sc.drawFlower, f]);
  for (const a of S.apples) items.push([a.y, sc.drawApple, a]);
  for (const a of S.arts) items.push([a.y, sc.drawArt, a]);
  for (const s of S.stones) if (!s.claimed) items.push([s.y, drawStone, s]);
  for (const c of S.cairns) if (c.n) items.push([c.y, drawCairn, c]);
  if (S.monument) items.push([S.monument.y, drawMonument, S.monument]);
  if (S.visitor) { items.push([S.visitor.y, drawCart, S.visitor]); items.push([S.visitor.owner.y, drawCritter, S.visitor.owner]); }
  for (const h of S.hammocks) if (h.A) items.push([h.y, drawHammock, h]);
  for (const c of S.critters) if (!c.hidden) items.push([c.y, drawCritter, c]);
  items.sort((a, b) => a[0] - b[0]);
  for (const it of items) it[1](it[2], it[3]);
  for (const f of S.flies) sc.drawButterfly(f, n);
  for (const f of S.floaters) drawBalloon(f, f.x, f.y);

  // Time-of-day wash, then the things that glow through it.
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = tint(p); ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  if (n > 0.02) {
    ctx.globalCompositeOperation = 'screen';
    if (built(S.fire)) glow(S.fire.x, S.fire.y - 14, 150 + Math.sin(S.now * 9) * 6, '255,205,130', 0.6 * n);
    for (const h of lit) for (const k of [-1, 1]) glow(h.x + k * 37, h.y - 50, 50, '255,205,130', 0.45 * n);
    for (const f of S.flies) glow(f.x, f.y, 9, '230,255,140', (0.5 + 0.5 * Math.sin(S.now * 2 + f.seed)) * n);   // fireflies
    for (const a of S.arts) if (a.material === 'star' && a.progress >= 1) glow(a.x, a.y - 34, 46 + Math.sin(S.now * 2 + a.seed) * 3, '255,244,170', 0.5 * n);   // so do things carved from them
    for (const s of S.stones) glow(s.x, s.y - 8, 38 + Math.sin(S.now * 2 + s.seed) * 3, '255,244,170', 0.55 * n);   // fallen stars glow
    ctx.globalCompositeOperation = 'source-over';
    for (const h of lit) sc.drawHouseLights(h, n);
  }

  drawEventOverlay();

  ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
  for (const h of lit) zzz(h.x - 62, h.y - (wallTop(h) + HOUSE.roof * 0.6) * HOUSE.scale, h.seed);
  for (const c of S.critters) {
    if (c.act === 'sleep' && !c.hidden) { ctx.fillStyle = INK; zzz(c.x + 16 * c.size, c.y - 80 * c.size, c.seed); }
    if (c.act === 'hammock') { ctx.fillStyle = INK; zzz(c.ham.M[0] + c.dir * 24 * c.size, c.ham.M[1] - 26, c.seed); }   // asleep in the hammock
    if (c.bubble && !c.hidden) drawBubble(c);
  }
  if (S.sign && S.now < S.sign.until) {   // the note over a tapped house
    const s = S.sign, w = ctx.measureText(s.text).width + 28;
    const x = clamp(s.x, w / 2 + 8, W - w / 2 - 8), y = Math.max(22, s.y);
    ctx.globalAlpha = clamp((s.until - S.now) * 3, 0, 1);
    box([[x - w / 2, y - 14], [x + w / 2, y - 15], [x + w / 2 + 1, y + 14], [x - w / 2 - 1, y + 13]], '#fff', 4242, 0.6, 2.2);
    ctx.fillStyle = INK; ctx.fillText(s.text, x, y + 1);
    ctx.globalAlpha = 1;
  }
  const vw = S.viewing;
  if (vw && S.now < vw.until) {   // a painting you tapped, held up close
    const k = Math.min(7, (W - 40) / 48, (H - 150) / 42), al = clamp((vw.until - S.now) * 3, 0, 1);
    ctx.globalAlpha = al * 0.35; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = al;
    sc.drawPaintingLarge(vw.art, W / 2, H / 2 - 14, k);
    const cap = vw.art.name ? `“${vw.art.name}”, by ${vw.art.by}` : `${(vw.art.title || vw.art.of || 'a painting').replace(/^./, ch => ch.toUpperCase())}, painted by ${vw.art.by}`, tw = ctx.measureText(cap).width + 28, cy = H / 2 - 14 + 21 * k + 26;
    box([[W / 2 - tw / 2, cy - 14], [W / 2 + tw / 2, cy - 15], [W / 2 + tw / 2 + 1, cy + 14], [W / 2 - tw / 2 - 1, cy + 13]], '#fff', 4243, 0.6, 2.2);
    ctx.fillStyle = INK; ctx.fillText(cap, W / 2, cy + 1);
    ctx.globalAlpha = 1;
  }
  sc.drawSky(n);
}
