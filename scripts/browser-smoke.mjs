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
  const keyCode = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Space: 32, Escape: 27 }[code] || key.toUpperCase().charCodeAt(0);
  await cdp('Input.dispatchKeyEvent', { type, code, key, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
}
async function screenshot(name, full = false) {
  const layout = await cdp('Page.getLayoutMetrics');
  const params = { format: 'png', captureBeyondViewport: full };
  if (full) params.clip = { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 };
  const result = await cdp('Page.captureScreenshot', params);
  await writeFile(`artifacts/${name}.png`, Buffer.from(result.data, 'base64'));
}

// The in-page driver ticks the Phaser scene by hand so long routes run quickly and deterministically.
const DRIVER = `(() => {
  const game = window.__KEYNOTE_GAME__;
  const D = window.__drive = { time: 0, frames: 0 };
  D.scene = () => game.scene.getScene('Adventure');
  D.tick = () => { const s = D.scene(); D.time += 1000 / 60; D.frames++; s.sys.events.emit('preupdate', D.time, 1000 / 60); s.sys.events.emit('update', D.time, 1000 / 60); s.update(D.time, 1000 / 60); s.sys.events.emit('postupdate', D.time, 1000 / 60); };
  D.release = () => { const s = D.scene(); s.keys.a.isDown = s.keys.d.isDown = s.keys.space.isDown = false; };
  D.settle = (n = 60) => { D.release(); for (let i = 0; i < n; i++) D.tick(); };
  D.ability = () => { D.scene().keys.ability._justDown = true; D.tick(); };
  D.switchTo = index => { D.scene().switchRobot(index); D.tick(); if (D.scene().selected !== index) throw new Error('Could not switch to robot ' + index); };
  D.place = (id, x, y) => { const s = D.scene(), r = s.crew.get(id); r.sprite.body.reset(x, y); r.sprite.setVelocity(0, 0); r.sprite.setAcceleration(0, 0); r.stuckSince = s.clock; D.tick(); };
  D.grounded = p => (p.body.blocked.down || p.body.touching.down || D.scene().crew.robot.onRobot) && p.body.velocity.y >= 0;
  D.moveTo = (x, { jumping = true, climb = false, budget = 3000 } = {}) => {
    const s = D.scene(); let jumpReset = false; D.maxX = s.player.x;
    while (Math.abs(s.player.x - x) > 8 && budget-- > 0) {
      const p = s.player, direction = Math.sign(x - p.x), grounded = D.grounded(p);
      s.keys.d.isDown = direction > 0; s.keys.a.isDown = direction < 0;
      const front = p.x + direction * 65;
      const wall = s.map.getTilesWithinWorldXY(front - 6, p.body.top + 3, 12, p.body.height - 6, { isColliding: true }, s.cameras.main, s.floorLayer).length > 0;
      const ground = s.map.getTileAtWorldXY(front, p.body.bottom + 6, false, s.cameras.main, s.floorLayer);
      const obstacle = [...s.crates.getChildren(), ...s.mechanics.cases.getChildren()].some(c => c.active && direction * (c.x - p.x) > 0 && Math.abs(c.x - p.x) < 130);
      const drone = s.drones.getChildren().some(c => c.active && direction * (c.x - p.x) > 0 && Math.abs(c.x - p.x) < 125) || s.mechanics.bolts.getChildren().some(b => b.active && Math.abs(b.x - p.x) < 150 && b.y > p.body.top - 12 && b.y < p.body.bottom + 4 && Math.sign(p.x - b.x) === Math.sign(b.body.velocity.x));
      const supportAhead = s.map.getTilesWithinWorldXY(p.x + direction * 45 - 3, p.body.bottom, 6, 800 - p.body.bottom, { isColliding: true }, s.cameras.main, s.floorLayer).length > 0;
      const bridge = s.mechanics.bridge, onBridge = bridge && p.x > bridge.left - 20 && p.x < bridge.right - 40;
      if (!jumping) s.keys.space.isDown = false;
      else if (grounded) { s.keys.space.isDown = (wall || (!ground?.collides && !onBridge) || obstacle || drone || climb) && !s.crew.robot.jumpWasDown; jumpReset = false; }
      else if (s.selected === 0 && s.jumps === 1 && p.body.velocity.y > -45 && (climb || !supportAhead)) { s.keys.space.isDown = jumpReset; jumpReset = true; }
      else s.keys.space.isDown = s.jumps > 0;
      D.tick(); D.maxX = Math.max(D.maxX ?? 0, s.player.x);
    }
    D.release();
    if (budget <= 0) throw new Error('Route blocked heading to ' + x + ' at ' + s.player.x.toFixed(1) + ',' + s.player.y.toFixed(1) + ' robot ' + s.selected + ' maxX=' + Math.round(D.maxX) + ' deaths=' + s.progress.deaths + ' checkpoint=' + s.checkpoint.x + ' ' + JSON.stringify(D.crew()));
  };
  D.run = code => { game.loop.sleep(); try { return (new Function('D', 's', code))(D, D.scene()); } finally { D.release(); game.loop.wake(); } };
  D.crew = () => D.scene().crew.robots.map(r => ({ id: r.id, state: r.state, job: r.job, x: Math.round(r.sprite.x), y: Math.round(r.sprite.y), on: r.standingOn }));
  return true;
})()`;

try {
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' }, null);
  ({ sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true }, null));
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Log.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
  const url = new URL(process.env.GAME_URL || 'http://127.0.0.1:5173'); url.searchParams.set('test', '1');
  await cdp('Page.navigate', { url: url.href });
  let ready = false;
  for (let tries = 0; tries < 60; tries++) {
    await wait(100);
    ready = await evaluate('Boolean(window.__KEYNOTE_GAME__?.scene.getScene("Adventure")?.player?.active)');
    if (ready || errors.length) break;
  }
  assert.deepEqual(errors, [], 'Startup must be error-free');
  assert.ok(ready, 'Phaser scene should finish loading');
  assert.equal(await evaluate('document.title'), 'Devoxx Reboot — A Devoxx robot adventure');
  assert.equal(await evaluate(DRIVER), true);
  const drive = code => evaluate(`window.__drive.run(${JSON.stringify(code)})`).catch(error => { throw new Error(`${error.message}`); });
  const state = () => evaluate(`(() => { const s = window.__KEYNOTE_GAME__.scene.getScene('Adventure'); return { x: s.player.x, y: s.player.y, robot: s.selected, jumps: s.jumps, mode: s.mode, paused: s.paused, stage: s.stageIndex, progress: s.progress, crew: window.__drive.crew() }; })()`);
  const tap = async (code, value) => { await key(code, value); await wait(45); await key(code, value, 'keyUp'); };
  await mkdir('artifacts', { recursive: true });
  await screenshot('adventure-intro');

  // Page UI: crew, stage select locks, help, robot selection, pause.
  assert.equal(await evaluate('window.__KEYNOTE_GAME__.scene.getScene("Adventure").crew.robots.length'), 3, 'All three robots exist in the world');
  assert.equal(await evaluate('document.querySelectorAll("#stage-list button.locked").length'), 3, 'Stages 2 to 4 start locked');
  assert.equal(await evaluate('document.querySelector("[data-stage=\\"1\\"]").disabled'), true, 'A locked stage cannot be opened');
  await click('[data-robot="1"]'); assert.equal((await state()).robot, 1, 'Starting robot is selectable');
  await click('[data-robot="0"]');
  await click('#help'); assert.equal(await evaluate('document.querySelector("#help-dialog").open'), true);
  await evaluate('document.querySelector("#help-dialog").close()');
  await click('#start'); await wait(150);
  await key('ArrowRight', 'ArrowRight'); await wait(500); await key('ArrowRight', 'ArrowRight', 'keyUp');
  assert.ok((await state()).x > 260, 'Right input must move the robot');
  // Robot switching goes through the DOM keydown listener, so it is exercised with real key events, not switchRobot().
  await tap('Digit2', '2'); assert.equal((await state()).robot, 1, 'Key 2 switches to Droid');
  await tap('Digit3', '3'); assert.equal((await state()).robot, 2, 'Key 3 switches to Biggy');
  await tap('Numpad1', '1'); assert.equal((await state()).robot, 0, 'Keypad 1 switches to Voxxy');
  await tap('Digit2', '&'); assert.equal((await state()).robot, 1, 'Key 2 switches on layouts where the key prints another character');
  await tap('Digit1', '1');
  await key('Space', ' '); await wait(220); await key('Space', ' ', 'keyUp');
  assert.ok((await state()).y < 555, 'Jump input must lift the robot');
  await wait(60); await tap('Space', ' ');
  assert.equal((await state()).jumps, 2, 'Voxxy has a second jump');
  await wait(700);
  await click('#pause'); const pausedX = (await state()).x;
  await wait(150); assert.equal((await state()).x, pausedX); assert.equal((await state()).paused, true);
  await click('#resume'); assert.equal((await state()).paused, false);
  // Energy is one shared bar: a hit flashes the robot, and switching robots keeps the remaining cells.
  await drive('s.invulnerableUntil = 0; s.hitBolt(1, 1);');
  assert.equal((await state()).progress.health, 2, 'A sentry bolt costs one energy cell');
  assert.equal(await evaluate('window.__KEYNOTE_GAME__.scene.getScene("Adventure").player.isTinted'), true, 'The robot flashes red when hit');
  await drive('D.switchTo(2); D.switchTo(0);');
  assert.equal((await state()).progress.health, 2, 'Switching robots keeps the shared energy');
  // Lives: three respawns end the run with a game over, and "Try again" restarts the stage with a fresh run.
  assert.equal((await state()).progress.lives, 3, 'A run starts with three lives');
  await drive('s.respawn(); s.respawn();');
  assert.equal((await state()).progress.lives, 1, 'Each respawn costs a life');
  assert.equal((await state()).mode, 'play', 'The run continues while lives remain');
  await drive('s.respawn();');
  assert.equal((await state()).mode, 'over', 'No lives left means game over');
  assert.equal(await evaluate('document.querySelector("#result").hidden'), false, 'The game over card is shown');
  assert.equal(await read('#result-eyebrow'), 'GAME OVER');
  await click('#try-again'); await wait(500);
  assert.equal((await state()).mode, 'play', 'Try again restarts the stage');
  assert.equal((await state()).progress.lives, 3, 'A fresh run restores the lives');
  assert.equal((await state()).progress.health, 3, 'A fresh run restores the energy');
  await click('#music'); assert.equal(await evaluate('document.querySelector("#music").getAttribute("aria-pressed")'), 'true', 'Music toggles on');
  await click('#music'); assert.equal(await evaluate('document.querySelector("#music").getAttribute("aria-pressed")'), 'false', 'Music toggles off');

  // Stage 1 — Arrival: stack on Biggy, launch across the turnstile pit, Biggy latches plate 5, exit.
  const arrival = await drive(`
    D.settle(5); D.moveTo(560); D.settle(30);
    D.switchTo(2); D.moveTo(880); D.settle(90);
    D.place('voxxy', s.crew.get('biggy').sprite.x, s.crew.get('biggy').sprite.y - 70); D.settle(20);
    if (s.crew.get('voxxy').standingOn !== 'biggy') throw new Error('Voxxy should stand on Biggy: ' + JSON.stringify(D.crew()));
    s.crew.get('biggy').facing = 1; D.ability();
    const trace = []; D.release();
    for (let i = 0; i < 90; i++) { D.tick(); const v = s.crew.get('voxxy'); if (i >= 40 && i <= 48) trace.push(i + ' bd=' + v.sprite.body.blocked.down + ' td=' + v.sprite.body.touching.down + ' onR=' + v.onRobot + ' on=' + v.standingOn + ' rc=' + v.recallUntil + ' d=' + s.progress.deaths + ' bx=' + Math.round(s.crew.get('biggy').sprite.x) + ' '); if (i % 6 === 0) trace.push(i + ':' + Math.round(v.sprite.x) + ',' + Math.round(v.sprite.y) + ' v' + Math.round(v.sprite.body.velocity.x) + ',' + Math.round(v.sprite.body.velocity.y) + ' ' + v.job + '/' + v.state + ' j' + v.jumps); }
    const landed = s.crew.get('voxxy').sprite.x;
    if (landed < 1400) throw new Error('TRACE ' + trace.join(' | '));
    if (landed < 1400) throw new Error('Launch did not clear the pit: ' + landed + ' ' + JSON.stringify(D.crew()) + ' actionUntil=' + s.actionUntil + ' clock=' + s.clock.toFixed(0) + ' cooldown=' + JSON.stringify(s.abilityCooldown) + ' bvx=' + s.crew.get('biggy').sprite.body.velocity.x.toFixed(0));
    D.switchTo(0); D.moveTo(1600); D.settle(260);
    if (Math.abs(s.crew.get('biggy').sprite.x - s.player.x) > 600) throw new Error('Biggy was not recalled: ' + JSON.stringify(D.crew()));
    D.switchTo(2); D.moveTo(1760); D.settle(50);
    if (s.map.getTileAt(41, 12, false, s.floorLayer)) throw new Error('Plate 5 did not open the arrival door');
    D.switchTo(0); D.moveTo(2260, { jumping: false }); D.settle(40); D.ability(); D.settle(5);
    return { mode: s.mode, frames: D.frames, deaths: s.progress.deaths };`);
  assert.equal(arrival.mode, 'won', `Arrival must be completed by driving: ${JSON.stringify(arrival)}`);
  assert.equal(await evaluate('document.querySelector("#result").hidden'), false, 'Stage result card appears');
  assert.equal(await evaluate('document.querySelector("#next-stage").hidden'), false, 'Next stage button appears');
  await screenshot('stage-arrival-clear');
  await click('#next-stage'); await wait(900);
  assert.equal((await state()).stage, 1, 'Next stage loads the exhibition hall');
  assert.equal((await state()).mode, 'play', 'The next stage starts immediately');

  // Enemies: a sentry bolt hurts and shoves Voxxy; Biggy's charge destroys the sentry.
  const enemies = await drive(`
    D.settle(5); const health = s.progress.health;
    D.switchTo(0); D.place('voxxy', 2250, 576); D.place('droid', 1600, 576); D.place('biggy', 1550, 576); D.settle(200);
    const hurt = s.progress.health < health, shoved = s.player.x < 2240;
    const sentries = s.mechanics.sentries.countActive();
    D.switchTo(2); D.place('biggy', 2340, 576); D.settle(30); s.crew.get('biggy').facing = 1; D.ability(); D.settle(40);
    const destroyed = s.mechanics.sentries.countActive() < sentries;
    if (!(hurt && shoved && destroyed)) throw new Error('Sentry checks: hurt=' + hurt + ' shoved=' + shoved + ' destroyed=' + destroyed + ' bolts=' + s.mechanics.bolts.countActive() + ' ' + JSON.stringify(D.crew()));
    D.place('biggy', 200, 576); D.place('voxxy', 130, 576); D.place('droid', 60, 576); s.progress.health = 3; D.settle(10);
    return true;`);
  assert.equal(enemies, true, 'Sentries fire, hurt, shove by mass, and fall to Biggy');
  // Stage 2 — The exhibition hall: push a case onto plate 3, smash the power case, Voxxy on Droid on the ledge plate.
  const hall = await drive(`
    D.settle(5); D.switchTo(2); D.moveTo(1080, { jumping: false }); D.settle(40);
    if (s.map.getTileAt(27, 12, false, s.floorLayer)) throw new Error('The pushed case did not open the booth door: ' + JSON.stringify(s.mechanics.cases.getChildren().map(c => [Math.round(c.x), c.standingOn])));
    D.moveTo(1400); D.settle(10); D.ability(); D.moveTo(1560, { jumping: false }); D.settle(30);
    if (!s.progress.cores.power) throw new Error('Biggy did not recover the power cell');
    D.moveTo(1600, { jumping: false }); D.settle(10); D.ability(); D.settle(40);
    D.switchTo(1); D.moveTo(2060); D.settle(20); D.moveTo(2200); D.settle(30);
    if (s.player.body.bottom > 500) throw new Error('Droid did not reach the ledge: ' + s.player.body.bottom);
    D.place('voxxy', s.player.x, s.player.y - 90); D.settle(40);
    if (s.map.getTileAt(68, 12, false, s.floorLayer)) throw new Error('Voxxy on Droid did not open the exit door: ' + JSON.stringify(D.crew()) + ' mass=' + s.crew.stackMassOn('ledge-plate'));
    D.switchTo(0); D.moveTo(3380, { jumping: false }); D.settle(40); D.ability(); D.settle(5);
    return { mode: s.mode, frames: D.frames, deaths: s.progress.deaths };`);
  assert.equal(hall.mode, 'won', `The hall must be completed by driving: ${JSON.stringify(hall)}`);
  await screenshot('stage-hall-clear');
  await click('#next-stage'); await wait(900);
  assert.equal((await state()).stage, 2, 'Next stage loads the staircase');

  // Stage 3 — The staircase: Droid bridges the broken landing, Voxxy crosses, Droid is fetched, terminal, exit.
  const stairs = await drive(`
    D.settle(5); D.moveTo(1000); D.settle(40);
    D.switchTo(1); D.moveTo(1040); D.settle(70); s.crew.get('droid').facing = 1; D.ability(); D.settle(10);
    if (!s.mechanics.bridge) throw new Error('Droid did not lie down on the landing: ' + JSON.stringify(D.crew()) + ' toast=' + document.querySelector('#toast').textContent + ' onFloor=' + s.crew.onFloor(s.player) + ' cooldown=' + JSON.stringify(s.abilityCooldown) + ' clock=' + s.clock.toFixed(0) + ' bottom=' + s.player.body.bottom + ' bd=' + s.player.body.blocked.down + ' vy=' + s.player.body.velocity.y);
    D.switchTo(0); D.moveTo(1180, { jumping: false }); D.settle(10);
    if (s.crew.get('voxxy').standingOn !== 'bridge') throw new Error('Voxxy is not on the bridge: ' + JSON.stringify(D.crew()));
    D.moveTo(1640); D.settle(30);
    if (s.player.body.bottom > 400) throw new Error('Voxxy did not land on the far block: ' + s.player.body.bottom);
    D.moveTo(2400); D.settle(300);
    if (Math.abs(s.crew.get('droid').sprite.x - s.player.x) > 700) throw new Error('Droid was not fetched after the bridge: ' + JSON.stringify(D.crew()));
    D.switchTo(1); D.moveTo(2980); D.settle(60); D.ability(); D.settle(20);
    if (!s.progress.cores.relay) throw new Error('Droid did not connect the power link');
    if (!s.map.getTileAt(67, 13, false, s.floorLayer)?.collides) throw new Error('Powered bridge tiles missing');
    D.switchTo(0); D.moveTo(3560, { jumping: false }); D.settle(40); D.ability(); D.settle(5);
    return { mode: s.mode, frames: D.frames, deaths: s.progress.deaths };`);
  assert.equal(stairs.mode, 'won', `The staircase must be completed by driving: ${JSON.stringify(stairs)}`);
  await screenshot('stage-staircase-clear');
  await click('#next-stage'); await wait(900);
  assert.equal((await state()).stage, 3, 'Next stage loads the auditorium');

  // Stage 4 — The keynote: spring up to the lens, then the three-robot finale.
  const finale = await drive(`
    D.settle(5); D.moveTo(1760); D.settle(30);
    // Hop onto the seat spring, ride the bounce, and add Voxxy's air jump near the apex.
    // Drop onto the cushion (the player's hop), ride the bounce right, and flap once near the apex.
    D.place('voxxy', 1836, 300); D.release();
    let bounced = false, jumped = false;
    for (let i = 0; i < 200 && !(jumped && D.grounded(s.player)); i++) {
      if (!bounced && s.player.body.velocity.y < -700) bounced = true;
      if (bounced && !jumped && s.player.body.velocity.y > -45) { s.keys.space.isDown = true; jumped = true; }
      s.keys.d.isDown = bounced && s.player.x < 2000;
      D.tick(); s.keys.space.isDown = false;
    }
    if (!bounced) throw new Error('The seat spring did not launch Voxxy: ' + JSON.stringify(D.crew()) + ' fs=' + s.crew.get('voxxy').fallSpeed);
    D.release(); D.settle(20);
    if (s.player.body.bottom > 300) throw new Error('Voxxy did not reach the balcony: bottom ' + s.player.body.bottom.toFixed(0));
    D.moveTo(2064); D.settle(30);
    if (!s.progress.cores.lens) throw new Error('Voxxy did not take the lens');
    D.switchTo(2); D.moveTo(2700); D.settle(30);
    if (!s.mechanics.finaleHeld) throw new Error('Biggy is not holding the stage plate: ' + JSON.stringify(D.crew()));
    D.switchTo(1); D.settle(5);
    if (s.crew.get('biggy').job !== 'hold') throw new Error('Biggy should stay parked on the momentary plate: ' + JSON.stringify(D.crew()));
    D.moveTo(2800); D.settle(60); D.ability(); D.settle(20);
    if (!s.mechanics.terminals[0].connected) throw new Error('Droid did not connect the projector terminal: ' + JSON.stringify(D.crew()) + ' toast=' + document.querySelector('#toast').textContent + ' bottom=' + s.player.body.bottom + ' bridge=' + Boolean(s.mechanics.bridge) + ' cooldown=' + JSON.stringify(s.abilityCooldown) + ' clock=' + s.clock.toFixed(0) + ' deaths=' + s.progress.deaths);
    D.switchTo(0); D.moveTo(2980, { jumping: false }); D.settle(40); D.ability(); D.settle(5);
    return { mode: s.mode, won: s.progress.won, frames: D.frames, deaths: s.progress.deaths, toast: document.querySelector('#toast').textContent, held: s.mechanics.finaleHeld, selected: s.selected, x: Math.round(s.player.x), crew: D.crew(), cores: s.progress.cores };`);
  assert.equal(finale.won, true, `The finale must be completed by driving: ${JSON.stringify(finale)}`);
  assert.equal(await evaluate('document.querySelector("#replay").hidden'), false, 'Final result shows the replay button');
  await screenshot('adventure-finale');
  assert.equal(await evaluate('document.querySelectorAll("#stage-list button.locked").length'), 0, 'All stages unlocked after the finale');
  await click('#replay'); await wait(400);
  assert.equal((await state()).mode, 'intro'); assert.equal((await state()).stage, 0);

  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(350);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Mobile layout must not overflow horizontally');
  await screenshot('adventure-mobile', true);
  assert.deepEqual(errors, [], 'Browser console must have no errors');
  console.log('Browser checks passed: loading, stage locks, robot selection, keyboard switching, movement, double jump, pause, music toggle, hit flash, shared energy, lives and game over, all four stages driven end to end (launch, case push, stacked plate, bridge, recall, terminal, spring, three-robot finale), replay, mobile layout, console.');
  console.log('Screenshots: artifacts/adventure-*.png and artifacts/stage-*.png');
} finally {
  for (const { timer } of pending.values()) clearTimeout(timer);
  browser.kill('SIGTERM');
  await new Promise(resolve => { if (browser.exitCode !== null) resolve(); else { browser.once('exit', resolve); setTimeout(resolve, 3000); } });
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
