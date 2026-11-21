export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
export const irand = n => Math.floor(Math.random() * n);
export const pick = a => a[irand(a.length)];
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Darken (k < 1) a #rrggbb colour. */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(clamp(v * k, 0, 255)).toString(16).padStart(2, '0')).join('');
}

// Cheap integer hash -> 0..1. Used for all the "drawn by hand" wobble.
export function hash(n) {
  n |= 0;
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}
// Stable randomness for a given shape (does not change frame to frame).
export const hs = (seed, i) => hash(seed * 7919 + i * 104729 + 12345);
