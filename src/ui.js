// The few bits of DOM around the canvas.
const $stats = document.getElementById('stats');
const $log = document.getElementById('log');
const $hint = document.getElementById('hint');
let timer;

export function log(msg) {
  $log.textContent = msg;
  $log.classList.add('on');
  clearTimeout(timer);
  timer = setTimeout(() => $log.classList.remove('on'), 5000);
}
export const setStats = text => { $stats.textContent = text; };
export const hideHint = () => $hint.classList.add('off');
setTimeout(hideHint, 14000);
