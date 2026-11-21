// Draws one little guy. The base pose lives here; whatever the critter is
// currently doing (its state, see sim/core.js) can adjust the pose, add
// props, or take over the transform entirely (swinging, swimming).
import { ctx } from './canvas.js';
import { S } from '../state.js';
import { INK, LW, FONT } from '../config.js';
import { TAU } from '../util.js';
import { STATES } from '../sim/core.js';
import { inStream } from '../world/geometry.js';

const WADE = 8;   // how deep the stream is, in critter units
import { jit, wob, smooth, polyPath, blob, box, line, dot } from './primitives.js';

export function drawCritter(c) {
  const st = STATES[c.act] || {}, sd = c.seed, s = c.size;
  let wading = false;
  ctx.save();
  if (st.transform && st.transform(c)) { /* the state placed the critter itself */ }
  else if (c.hopY < 1 && inStream(c.x, c.y, -5)) {   // ankle-deep in the stream
    wading = true;
    ctx.translate(c.x, c.y + WADE * s); ctx.scale(s, s);
    ctx.beginPath(); ctx.rect(-80, -160, 160, 160 - WADE); ctx.clip();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.09)';
    ctx.beginPath(); ctx.ellipse(c.x, c.y + 1, 20 * s * (1 - Math.min(0.5, c.hopY / 120)), 5 * s, 0, 0, TAU); ctx.fill();
    ctx.translate(c.x, c.y - c.hopY);
    ctx.scale(s, s);
  }

  // p is the pose: hand positions are relative to the feet, before body bob.
  const p = {
    now: S.now, d: c.dir, bob: Math.sin(S.now * 2 + sd) * 0.5, rock: 0, lf: 0, rf: 0, lx: 0, rx: 0,   // lf/rf: foot lift, lx/rx: foot stride
    hl: [-33, -16], hr: [33, -16], eyesClosed: c.blink > 0,
    hand(side, x, y) { if (side > 0) this.hr = [x, y]; else this.hl = [x, y]; },
  };
  if (st.pose) st.pose(c, p);
  const { bob, lf, rf, d } = p;
  ctx.rotate(p.rock);

  const arm = (sh, h, k) => wob([sh, [(sh[0] + h[0]) / 2, (sh[1] + h[1]) / 2 + 2], h], sd + k, 0.5);
  const armL = arm([-11, -33 - bob], [p.hl[0], p.hl[1] - bob], 1), armR = arm([11, -33 - bob], [p.hr[0], p.hr[1] - bob], 2);
  const HL = p.HL = armL[2], HR = p.HR = armR[2];
  p.HD = d > 0 ? HR : HL;
  const fl = [-7 + p.lx + jit(sd + 3, 0, 0.4), -3 - lf], fr = [7 + p.rx + jit(sd + 4, 0, 0.4), -3 - rf];
  const tubes = [
    [armL, 6], [armR, 6],
    [[HL, [HL[0] + 2.5, HL[1] - 7]], 3.5], [[HR, [HR[0] - 2.5, HR[1] - 7]], 3.5],     // thumbs
    [[[-6.5, -13 - bob], fl], 10], [[[6.5, -13 - bob], fr], 10],                      // legs
    [[fl, [fl[0] - 8, fl[1] + 0.5]], 7], [[fr, [fr[0] + 8, fr[1] + 0.5]], 7],         // feet
  ];
  const torso = wob([[-12, -39 - bob], [12, -39 - bob], [12, -11 - bob], [-12, -11 - bob]], sd + 5, 0.5);

  // Everything in ink first, slightly fat, then the fill colour on top:
  // the result is one continuous outlined body, like the original doodle.
  ctx.strokeStyle = INK; ctx.fillStyle = INK;
  for (const [pts, w] of tubes) { smooth(pts, false); ctx.lineWidth = w + LW * 2; ctx.stroke(); }
  dot(HL[0], HL[1], 4.6 + LW); dot(HR[0], HR[1], 4.6 + LW);
  polyPath(torso); ctx.lineWidth = LW * 2; ctx.stroke(); ctx.fill();
  ctx.strokeStyle = c.body;
  for (const [pts, w] of tubes) { smooth(pts, false); ctx.lineWidth = w; ctx.stroke(); }
  dot(HL[0], HL[1], 4.6, c.body); dot(HR[0], HR[1], 4.6, c.body);
  polyPath(torso); ctx.fillStyle = c.body; ctx.fill();

  if (st.props) st.props(c, p);

  // Head and face: two dot eyes off to one side and the big U.
  const hy = -57 - bob;
  blob(0, hy, 21 * c.hw, 20 * c.hh, c.head, sd + 10, 11, 0.07, 0.5);
  const m = d >= 0 ? 1 : -1, fx = x => m * x * 0.95 + m * 1.5, fy = y => hy + y * 0.95 - 1;
  for (const [ex, ey] of [[3, -7], [7.6 + c.eyeGap, -5.6]]) {
    if (p.eyesClosed) line([[fx(ex - 1.6), fy(ey)], [fx(ex + 1.6), fy(ey + 0.4)]], sd + 11, 1.8, INK, 0.2);
    else dot(fx(ex) + jit(sd + 12, ex | 0, 0.2), fy(ey), 1.6);
  }
  line([[-4, -1], [-5.5, 7], [-3, 14], [3, 16.5], [8.5, 12], [11, 2]].map(q => [fx(q[0]), fy(q[1])]), sd + 13, 2.4, INK, 0.4);
  line([[fx(-7.5), fy(-1.2)], [fx(-1.5), fy(-1)]], sd + 14, 2.4, INK, 0.3);
  line([[fx(9), fy(1)], [fx(13), fy(3)]], sd + 15, 2.4, INK, 0.3);
  ctx.restore();

  if (wading) line([[c.x - 15 * s, c.y + 1], [c.x - 7 * s, c.y - 1.5], [c.x, c.y + 1], [c.x + 7 * s, c.y - 1.5], [c.x + 15 * s, c.y + 1]], sd + 31, 2.4, '#fff', 0.7);
  if (st.after) st.after(c);
}

export function drawBubble(c) {
  const b = c.bubble, x = c.x, y = c.y - c.hopY + (c.sink || 0) - 88 * c.size;
  ctx.font = FONT;
  const w = Math.max(30, ctx.measureText(b.text).width + 20);
  ctx.globalAlpha = Math.max(0, Math.min(1, b.t * 4));
  box([[x - 5, y - 6], [x + 6, y - 6], [x + 1, y + 6]], '#fff', c.seed + 20, 0.4, 2.2);
  blob(x, y - 18, w / 2, 14, '#fff', c.seed + 21, 10, 0.03, 0.5, 2.2);
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 3.5, y - 7.5, 8, 4);
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(b.text, x, y - 17);
  ctx.globalAlpha = 1;
}
