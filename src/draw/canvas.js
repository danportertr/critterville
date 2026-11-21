export const cv = document.getElementById('c');
// `ctx` is what every drawing function draws on. It's normally the main canvas,
// but can be pointed somewhere else for a moment (the fish book's pictures).
export let ctx = cv.getContext('2d');
const main = ctx;
export function drawOn(other, fn) {
  ctx = other;
  try { fn(); } finally { ctx = main; }
}
