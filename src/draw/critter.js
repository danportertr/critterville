// Draws one little guy. The base pose lives here; whatever the critter is
// currently doing (its state, see sim/core.js) can adjust the pose, add
// props, or take over the transform entirely (swinging, swimming).
import { ctx } from './canvas.js';
import { S } from '../state.js';
import { INK, LW, FONT } from '../config.js';
import { TAU } from '../util.js';
import { STATES } from '../sim/core.js';
import { inStream, onBridge } from '../world/geometry.js';
import { drawHat, drawBalloon } from './cart.js';

// Mouths. The big U is the full grin from the original doodle; most of the
// time a critter wears something quieter. Each is the curve, plus whether it
// gets the little serif caps at its ends. Coordinates are from the middle of the head.
const MOUTHS = {
  big: { curve: [[-4, -1], [-5.5, 7], [-3, 14], [3, 16.5], [8.5, 12], [11, 2]], caps: [[[-7.5, -1.2], [-1.5, -1]], [[9, 1], [13, 3]]] },
  smile: { curve: [[-3, 4], [-3.5, 8], [-0.5, 11.5], [4, 12], [7.5, 9.5], [8.5, 5]], caps: [[[-5.5, 3.8], [-0.8, 4]], [[7, 4.4], [10.2, 5.8]]] },
  small: { curve: [[-2, 7], [0, 9.5], [3.5, 10], [6.5, 8]], caps: [] },
  flat: { curve: [[-2.5, 8], [2, 8.8], [7, 8]], caps: [] },
  tiny: { curve: [[0.5, 8.5], [4.5, 9]], caps: [] },
  sad: { curve: [[-2, 10.5], [2.5, 7.8], [7, 10.5]], caps: [] },
  oh: { round: [2.5, 8.5, 3, 3.8] },
};
/** What a critter's face does when nothing in particular is going on: some are just smilier than others. */
const restingFace = c => (c.cheer > 0.8 ? 'big' : c.cheer > 0.45 ? 'smile' : c.cheer > 0.15 ? 'small' : 'flat');

const ARM = 28.2;  // shoulder-to-hand length when the arm is straight
const WADE = 8;   // how deep the stream is, in critter units
import { jit, wob, smooth, polyPath, blob, box, line, tube, dot } from './primitives.js';

export function drawCritter(c) {
  const st = STATES[c.act] || {}, sd = c.seed, s = c.size;
  let wading = false;
  ctx.save();
  if (st.transform && st.transform(c)) { /* the state placed the critter itself */ }
  else if (c.hopY < 1 && inStream(c.x, c.y, -5) && !onBridge(c.x, c.y)) {   // somehow standing in the stream: ankle-deep
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
    now: S.now, d: c.dir, bob: Math.sin(S.now * 2 + sd) * 0.5, rock: 0, lf: 0, rf: 0, lx: 0, rx: 0, ly: 0, ry: 0,   // per foot: lift, and stride offset across (x) and towards us (y)
    hl: [-33, -16], hr: [33, -16], eyesClosed: c.blink > 0,
    mouth: st.mood || restingFace(c),          // a state can set a mood, or change p.mouth in its pose
    hand(side, x, y) { if (side > 0) this.hr = [x, y]; else this.hl = [x, y]; },
  };
  if (st.pose) st.pose(c, p);
  if (c.surprise > 0) p.mouth = 'oh';
  if (c.settle > 0 && c.feet && c.act !== 'walk') {   // just stopped walking: feet ease back under the body
    const f = c.feet, k = c.settle;
    p.lx += f[0] * k; p.ly += f[1] * k; p.lf += f[2] * k; p.rx += f[3] * k; p.ry += f[4] * k; p.rf += f[5] * k;
  }
  const { bob, d } = p;
  ctx.rotate(p.rock);

  // Arms have a soft elbow: the arm is a fixed length, so when the hand comes
  // in closer than that, the middle bows outwards (and a little down). Held
  // straight out it's nearly a line, as in the original doodle.
  const arm = (sh, h, side, k) => {
    const dx = h[0] - sh[0], dy = h[1] - sh[1], d = Math.hypot(dx, dy) || 1;
    const bend = Math.sqrt(Math.max(0, ARM * ARM - d * d)) / 2;              // how far the elbow sticks out
    let nx = -dy / d, ny = dx / d;                                            // across the arm...
    if (nx * side + ny * 0.6 < 0) { nx = -nx; ny = -ny; }                     // ...on the outward, downward side
    const el = [sh[0] + dx / 2 + nx * bend, sh[1] + dy / 2 + ny * bend];
    return [sh, el, [h[0] + jit(sd + k, 0, 0.5), h[1] + jit(sd + k, 1, 0.5)]];   // only the hand wobbles, so the arm doesn't wriggle
  };
  const armL = arm([-11, -33 - bob], [p.hl[0], p.hl[1] - bob], -1, 1), armR = arm([11, -33 - bob], [p.hr[0], p.hr[1] - bob], 1, 2);
  const HL = p.HL = armL[2], HR = p.HR = armR[2];
  p.HD = d > 0 ? HR : HL;
  const fl = [-7 + p.lx + jit(sd + 3, 0, 0.4), -3 - p.lf + p.ly], fr = [7 + p.rx + jit(sd + 4, 0, 0.4), -3 - p.rf + p.ry];
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
  if (c.luggage === 'case') {            // a suitcase in the left hand
    const [x, y] = HL;
    box([[x - 8, y + 3], [x + 8, y + 3], [x + 8, y + 15], [x - 8, y + 15]], '#c9966b', sd + 40, 0.4, 2.2);
    line([[x - 3, y + 3], [x - 2, y - 1], [x + 2, y - 1], [x + 3, y + 3]], sd + 41, 1.8, INK, 0.2);
    line([[x - 8, y + 9], [x + 8, y + 9]], sd + 42, 1.6, INK, 0.2);
  } else if (c.luggage === 'knapsack') { // a bundle on the back, with a rolled blanket on top
    const x = -d * 13, y = -30 - bob;
    blob(x, y, 8, 10, '#8fb8ff', sd + 40, 8, 0.06, 0.3, 2.2);
    tube([[x - 6, y - 10], [x + 6, y - 10]], 3.4, '#ffab76', sd + 41, 0.3);
    line([[x + d * 5, y - 6], [d * 4, -34 - bob]], sd + 42, 1.8, INK, 0.2);
  }
  if (c.balloon) drawBalloon(c.balloon, HL[0], HL[1] - 4);

  // Head and face: two dot eyes off to one side and the big U.
  const hy = -57 - bob;
  blob(0, hy, 21 * c.hw, 20 * c.hh, c.head, sd + 10, 11, 0.07, 0.5);
  // The face sits to one side; when the critter turns, it slides across (c.look eases from -1 to 1).
  const m = Math.abs(c.look) < 0.35 ? (c.look < 0 ? -0.35 : 0.35) : c.look, fx = x => m * x * 0.95 + m * 1.5, fy = y => hy + y * 0.95 - 1;
  for (const [ex, ey] of [[3, -7], [7.6 + c.eyeGap, -5.6]]) {
    if (p.eyesClosed) line([[fx(ex - 1.6), fy(ey)], [fx(ex + 1.6), fy(ey + 0.4)]], sd + 11, 1.8, INK, 0.2);
    else dot(fx(ex) + jit(sd + 12, ex | 0, 0.2), fy(ey), 1.6);
  }
  const mouth = MOUTHS[p.mouth] || MOUTHS.smile, face = q => [fx(q[0]), fy(q[1])];
  if (mouth.round) blob(fx(mouth.round[0]), fy(mouth.round[1]), mouth.round[2], mouth.round[3], '#000', sd + 13, 7, 0.05, 0.2, 1);
  else {
    line(mouth.curve.map(face), sd + 13, 2.4, INK, 0.4);
    mouth.caps.forEach((cap, i) => line(cap.map(face), sd + 14 + i, 2.4, INK, 0.3));
  }
  if (c.hat) { ctx.save(); ctx.translate(0, hy - 17 * c.hh); drawHat(c.hat, m, sd + 60); ctx.restore(); }
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
