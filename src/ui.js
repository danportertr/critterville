// The few bits of DOM around the canvas.
import { VERSION } from './version.js';
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

// ---- which build is this? ----
// The number under the title is the build the page is actually running. A
// moment after loading, the page also asks the server (bypassing the browser
// cache) what the newest build is, and says so if this isn't it.
const $version = document.getElementById('version');
$version.textContent = `build ${VERSION.n}`;
$version.title = `Built ${VERSION.at}`;
export async function checkForNewer() {
  try {
    const text = await (await fetch(`src/version.js?fresh=${Date.now()}`, { cache: 'no-store' })).text();
    const latest = +(text.match(/n:\s*(\d+)/) || [])[1];
    if (!(latest > VERSION.n)) return;
    $version.classList.add('stale');
    $version.textContent = `build ${VERSION.n} · `;
    const a = document.createElement('a');
    a.textContent = `build ${latest} is out: reload`;
    a.onclick = () => location.reload();
    $version.append(a);
  } catch (e) { /* offline: never mind */ }
}
setTimeout(checkForNewer, 3000);
setInterval(checkForNewer, 10 * 60 * 1000);   // and now and then, for a page left running
