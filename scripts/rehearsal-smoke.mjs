// Optional browser smoke test using an installed Chromium browser and its CDP pipe.
// No npm packages or browser downloads are needed.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const executable = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = await mkdtemp(path.join(tmpdir(), 'keynote-browser-'));
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
let nextId = 0;
let sessionId;
let buffer = '';
const pending = new Map();
const errors = [];
let processError;
browser.on('error', error => { processError = error; });
browser.stdio[4].on('data', data => {
  buffer += data.toString();
  let end;
  while ((end = buffer.indexOf('\0')) >= 0) {
    const chunk = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    if (!chunk) continue;
    const event = JSON.parse(chunk);
    if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.text + ': ' + (event.params.exceptionDetails.exception?.description || ''));
    if (event.method === 'Log.entryAdded' && event.params.entry.level === 'error') errors.push(event.params.entry.text);
    if (pending.has(event.id)) {
      const { resolve, reject, timer } = pending.get(event.id); pending.delete(event.id); clearTimeout(timer);
      if (event.error) reject(new Error(JSON.stringify(event.error))); else resolve(event.result);
    }
  }
});
function cdp(method, params = {}, target = sessionId) {
  return new Promise((resolve, reject) => {
    if (processError) { reject(processError); return; }
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(target ? { sessionId: target } : {}) }) + '\0');
  });
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const read = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).textContent`);
async function key(code, key, type = 'keyDown') {
  await cdp('Input.dispatchKeyEvent', { type, code, key });
}
async function screenshot(name, full = false) {
  const layout = await cdp('Page.getLayoutMetrics');
  const params = { format: 'png', captureBeyondViewport: full };
  if (full) params.clip = { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 };
  const result = await cdp('Page.captureScreenshot', params);
  await writeFile(`artifacts/${name}.png`, Buffer.from(result.data, 'base64'));
}

try {
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' }, null);
  ({ sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true }, null));
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Log.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: process.env.GAME_URL || 'http://127.0.0.1:5173/rehearsal.html' });
  await wait(650);
  assert.equal(await evaluate('document.title'), 'Devoxx Reboot — Three robots. One timeline.');
  assert.equal(await evaluate('document.querySelector("#play-button").disabled'), true);
  await mkdir('artifacts', { recursive: true });
  await screenshot('desktop');
  await click('#help-button'); assert.equal(await evaluate('document.querySelector("#help-dialog").open'), true);
  await evaluate('document.querySelector("#help-dialog").close()');
  await click('#record-button');
  await key('ArrowUp', 'ArrowUp'); await wait(550); await key('ArrowUp', 'ArrowUp', 'keyUp'); await wait(180);
  assert.match(await read('#mode-label'), /RECORDING/);
  await key('KeyR', 'r'); await key('KeyR', 'r', 'keyUp');
  assert.match(await read('[data-robot="0"] .track-state'), /SAVED/);
  for (const index of [1, 2]) {
    await click(`[data-robot="${index}"]`); await click('#record-button'); await wait(160);
    await click('#record-button');
  }
  assert.equal(await evaluate('document.querySelector("#play-button").disabled'), false);
  await click('#play-button'); await wait(220);
  assert.match(await read('#mode-label'), /RUNNING/);
  await click('#stop-button');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(250);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Mobile layout must not overflow horizontally');
  assert.match(await evaluate('document.querySelector("h1").innerText'), /show must/, 'Mobile title must keep spaces when the line break is hidden');
  await screenshot('mobile', true);
  await click('#reset-button'); await click('#reset-button');
  assert.equal(await evaluate('document.querySelector("#play-button").disabled'), true);
  assert.deepEqual(errors, [], 'Browser console must have no errors');
  console.log('Browser smoke passed: page, controls, recording, replay, help, mobile layout, reset, console.');
  console.log('Screenshots: artifacts/desktop.png and artifacts/mobile.png');
} finally {
  for (const { timer } of pending.values()) clearTimeout(timer);
  browser.kill('SIGTERM');
  await new Promise(resolve => { if (browser.exitCode !== null) resolve(); else { browser.once('exit', resolve); setTimeout(resolve, 3000); } });
  await rm(profile, { recursive: true, force: true });
}
