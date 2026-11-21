// Little pictures of the things in data/sky.js, for the journal. Each is drawn
// in a w×h box on whatever `ctx` currently points at.
import { ctx } from './canvas.js';
import { TAU, hs } from '../util.js';

const star = (x, y, r = 1.6, c = '#fff') => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
const disc = (x, y, rx, ry, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
function joined(pts, close) {
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath();
  pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
  if (close) ctx.closePath();
  ctx.stroke();
  for (const [x, y, r] of pts) star(x, y, r || 2);
}
const PICS = {
  moon: () => { disc(0, 0, 24, 24, '#f4f1dc'); for (const [x, y, r] of [[-8, -7, 7], [6, -10, 5], [-3, 8, 8], [11, 5, 4]]) disc(x, y, r, r * 0.85, '#d6d3bd'); for (const [x, y] of [[14, -8], [-15, 4], [4, 17]]) disc(x, y, 1.6, 1.6, '#c2bfa9'); },
  bigdipper: () => joined([[-34, -6], [-22, -11], [-11, -8], [0, -3], [2, 10], [18, 13], [21, -1], [0, -3]]),
  northstar: () => { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; for (const r of [12, 20, 28]) { ctx.beginPath(); ctx.arc(0, 0, r, 0.4, 2.2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r, 3.5, 5.3); ctx.stroke(); } ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(-Math.cos(a) * 8, -Math.sin(a) * 8); ctx.stroke(); } star(0, 0, 3.4); },
  orion: () => { joined([[-14, -24, 2.6], [12, -22], [5, -3], [16, 22, 2.4], [-12, 24], [-5, 1], [-14, -24]]); star(-14, -24, 2.8, '#ffb199'); joined([[-5, 1], [0, -1], [5, -3]]); },
  cassiopeia: () => joined([[-30, -10], [-16, 9], [-1, -4], [14, 11], [29, -8]]),
  pleiades: () => { disc(0, 0, 20, 14, 'rgba(160,190,255,.18)'); for (const [x, y, r] of [[-9, -4, 2.4], [-2, 2, 2.6], [6, -3, 2.2], [11, 5, 2], [-5, 8, 1.8], [2, -8, 1.8], [-13, 3, 1.4], [9, -9, 1.2], [15, -1, 1.2], [-1, 11, 1.1]]) star(x, y, r, '#cfe0ff'); },
  jupiter: () => { disc(-8, 0, 17, 16, '#e8cfa6'); ctx.fillStyle = '#c99a6b'; for (const y of [-7, 1, 8]) ctx.fillRect(-24, y, 32, 3); disc(-2, 3, 3.4, 2.2, '#d9775a'); ctx.globalCompositeOperation = 'destination-over'; ctx.globalCompositeOperation = 'source-over'; for (const x of [16, 23, 31, 38]) star(x, 0, 1.3); },
  saturn: () => { ctx.strokeStyle = '#e9dcae'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 30, 8, -0.3, Math.PI, TAU); ctx.stroke(); disc(0, 0, 14, 13, '#f0d98f'); ctx.beginPath(); ctx.ellipse(0, 0, 30, 8, -0.3, 0, Math.PI); ctx.stroke(); },
  mars: () => { disc(0, 0, 18, 18, '#e0795a'); disc(-5, 3, 7, 4, '#c9603f'); disc(7, -5, 4, 3, '#c9603f'); disc(0, -15, 7, 3, '#fff'); },
  venus: () => { disc(0, 0, 17, 17, '#fff7dc'); disc(8, -2, 16, 17, '#2f3463'); },
  milkyway: () => { for (let i = 0; i < 150; i++) { const t = hs(7, i) * 2 - 1, s = (hs(8, i) - 0.5) * (1 - Math.abs(t) * 0.5) * 22; star(t * 52 + s * 0.4, t * -18 + s, 0.5 + hs(9, i) * 0.9, `rgba(255,255,255,${0.35 + hs(10, i) * 0.6})`); } },
  comet: () => { const g = ctx.createLinearGradient(14, -8, -40, 16); g.addColorStop(0, 'rgba(200,225,255,.9)'); g.addColorStop(1, 'rgba(200,225,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(16, -12); ctx.lineTo(-42, 8); ctx.lineTo(-36, 24); ctx.lineTo(18, -4); ctx.fill(); star(16, -8, 4.5); },
};
/** Draw sky object `id` on a night-blue card w wide and h tall, with (0, 0) at its top left. */
export function drawSkyPicture(id, w, h, found = true) {
  ctx.fillStyle = '#2f3463'; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 10); ctx.fill();
  for (let i = 0; i < 14; i++) star(hs(3, i) * w, hs(4, i) * h, 0.6, 'rgba(255,255,255,.5)');   // background stars
  if (!found) return;
  ctx.save(); ctx.translate(w / 2, h / 2);
  (PICS[id] || PICS.moon)();
  ctx.restore();
}
