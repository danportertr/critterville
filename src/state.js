// The one shared, mutable world. Everything else reads and writes this.
import { DAY_LEN } from './config.js';
import { smoothstep } from './util.js';

export const S = {
  W: 0, H: 0, zoom: 1, dpr: 1,     // world size (in world units) and view scale
  now: 0, boil: 0, clock: 0,       // real seconds, line-boil frame, in-game seconds
  critters: [], houses: [], trees: [], flowers: [], apples: [], arts: [], tufts: [], flies: [],
  pond: null, pool: null, fire: null, ball: null, swing: null,
  obs: [],                         // ellipses critters walk around
  stats: { fish: 0, planted: 0, art: 0 },
  cap: 10,                         // max population for this screen size
};

export const phase = () => (S.clock % DAY_LEN) / DAY_LEN;      // 0 = dawn
export const dayNum = () => Math.floor(S.clock / DAY_LEN) + 1;
export const isNight = () => { const p = phase(); return p >= 0.72 && p < 0.96; };
export const isEvening = () => { const p = phase(); return p >= 0.6 && p < 0.72; };
export const nightAmt = () => { const p = phase(); return smoothstep(0.66, 0.74, p) * (1 - smoothstep(0.93, 1, p)); };
