import { TILE, HEIGHT, FLOOR, GRAVITY, ROBOTS, LIVES, newProgress, grantCore, canFinish, resultScore, loseLife } from './level.js';
import { STAGES } from './stages/index.js';
import { boltKnockback } from './rules.js';
import { loadUnlocked, saveUnlocked, loadBest, saveBest, resetProgress } from './progress.js';
import { createMusic } from './music.js';
import { makeArt, decorate } from './art.js';
import { Crew } from './crew.js';
import { Mechanics } from './mechanics.js';

const Phaser = window.Phaser;
const $ = selector => document.querySelector(selector);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = { left: false, right: false, jump: false, ability: false };
let scene;
let chosenRobot = 0;
let chosenStage = 0;
let runProgress = null;
let audio;
let sound = false;
let toastTimer;
const music = createMusic();
function musicLabel() { $('#music').setAttribute('aria-pressed', String(music.enabled)); $('#music span').textContent = music.unavailable ? 'Music unavailable' : music.enabled ? 'Music on' : 'Music off'; }
let zoneTimer;
const timeLabel = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

function tone(frequency = 440, duration = .09, type = 'sine', volume = .045) {
  if (!sound || !audio) return;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.4, audio.currentTime + duration);
  gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
}
function toast(message, duration = 3200) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, duration);
}
function focusGame() { $('#game').focus({ preventScroll: true }); }
function clearInput() {
  Object.keys(touch).forEach(key => { touch[key] = false; });
  if (scene?.keys) Object.values(scene.keys).forEach(key => key.reset());
  if (scene?.crew) scene.crew.robot.jumpWasDown = false;
}
function zoneBanner(stage) {
  clearTimeout(zoneTimer);
  $('#zone-subtitle').textContent = `STAGE 0${stage.index} / 0${STAGES.length}`;
  $('#zone-name').textContent = stage.title;
  $('#zone-banner').hidden = false;
  zoneTimer = setTimeout(() => { $('#zone-banner').hidden = true; }, 2800);
}

class Adventure extends Phaser.Scene {
  constructor() { super('Adventure'); }
  preload() {
    this.load.image('foyer', 'assets/kinepolis-foyer.png');
    this.load.once('loaderror', () => { $('#loading p').textContent = 'The scenery could not load. Please refresh after starting the local server.'; });
  }
  init(data) {
    this.stageIndex = Math.min(STAGES.length - 1, Math.max(0, data?.stage ?? chosenStage));
    this.carried = data?.progress ?? null;
    this.autoStart = Boolean(data?.autoStart);
  }
  create() {
    scene = this;
    this.stage = STAGES[this.stageIndex]; this.width = this.stage.widthTiles * TILE;
    // Progress (items, sparks, retries, total time) carries across stages within one run.
    this.progress = this.carried ?? newProgress(); this.stageStart = this.progress.elapsed; this.progress.won = false;
    const f = this.stage.fixtures;
    this.layout = { data: this.stage.data, spawn: this.stage.spawn, checkpoints: this.stage.checkpoints, coins: f.coins, exit: f.exit };
    this.clock = 0; this.mode = 'intro'; this.paused = false;
    this.actionUntil = 0; this.chargeSpeed = 510; this.abilityCooldown = [0, 0, 0]; this.invulnerableUntil = 0;
    this.checkpoint = { ...this.layout.spawn }; this.checkpointIndex = -1;
    this.zone = 0; this.lastHUD = -1000; this.hints = new Set();
    makeArt(this); decorate(this, this.stage);
    this.map = this.make.tilemap({ data: this.layout.data, tileWidth: TILE, tileHeight: TILE });
    const tileset = this.map.addTilesetImage('cinema-tiles');
    this.floorLayer = this.map.createLayer(0, tileset, 0, 0).setDepth(1);
    this.floorLayer.setCollisionBetween(0, 7);
    this.physics.world.setBounds(0, -200, this.width, HEIGHT + 500, true, true, false, false);

    this.crew = new Crew(this, this.stage, { initial: chosenRobot, toast, tone, burst: (x, y, color, count) => this.burst(x, y, color, count) });
    this.physics.add.collider(this.crew.group, this.floorLayer);
    this.shadow = this.add.ellipse(this.player.x, FLOOR - 3, 51, 10, 0x050d16, .3).setDepth(2);
    this.coins = this.physics.add.staticGroup();
    for (const position of this.layout.coins) {
      const coin = this.coins.create(position.x, position.y, 'spark').setDepth(6);
      coin.body.setCircle(13, 5, 5);
      if (!reducedMotion) this.tweens.add({ targets: coin, scaleX: .55, duration: 850, yoyo: true, repeat: -1, delay: position.x % 500 });
    }
    this.physics.add.overlap(this.crew.group, this.coins, (sprite, coin) => {
      if (!coin.active || this.mode !== 'play' || sprite !== this.player) return;
      coin.disableBody(true, true); this.progress.coins++; this.burst(coin.x, coin.y, 0xffd297, 7); tone(680 + this.progress.coins % 4 * 110, .065);
    });
    this.mechanics = new Mechanics(this, this.stage, this.crew, {
      toast, tone, burst: (x, y, color, count) => this.burst(x, y, color, count), reward: message => this.reward(message), hint: (key, message) => this.hint(key, message),
      hitDrone: drone => this.hitDrone(drone), hitBolt: (direction, mass) => this.hitBolt(direction, mass), exit: () => this.exitPressed(),
    });
    this.mechanics.create();
    this.crew.hooks.tryUnpark = robot => robot.job === 'bridge' ? this.mechanics.standUp(robot, true) : (this.crew.unpark(robot), true);
    this.crew.hooks.onRespawn = () => this.mechanics.respawn();
    this.crew.hooks.abandonBridge = robot => this.mechanics.standUp(robot, false);
    this.flags = this.layout.checkpoints.map(x => {
      const pole = this.add.rectangle(x, FLOOR - 37, 4, 74, 0x728f99).setDepth(3);
      const flag = this.add.triangle(x + 17, FLOOR - 64, 0, 0, 32, 12, 0, 24, 0x719499).setDepth(3);
      const light = this.add.circle(x, FLOOR - 76, 4, 0xeab677).setDepth(3);
      return { x, pole, flag, light };
    });
    for (const sign of this.stage.signs) this.label(sign.x, sign.y, sign.text, sign.color);
    this.keys = this.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', space: 'SPACE', w: 'W', up: 'UP', ability: 'E', restart: 'R', esc: 'ESC' });
    this.cameras.main.setBounds(0, 0, this.width, 720);
    this.cameras.main.startFollow(this.player, true, .09, .12, -180, 100);
    this.cameras.main.setDeadzone(100, 90);
    this.introCrew = ROBOTS.map((robot, index) => this.add.sprite(785 + index * 158, 474, robot.id, 8).setScale(index === 1 ? 1.75 : 1.9).setDepth(25).setScrollFactor(0));
    if (!reducedMotion) this.tweens.add({ targets: this.introCrew, y: '+=3', yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.InOut' });
    this.physics.pause();
    document.querySelectorAll('[data-portrait]').forEach(element => {
      const c = element.getContext('2d'); c.clearRect(0, 0, 128, 128);
      c.drawImage(this.textures.get(ROBOTS[Number(element.dataset.portrait)].id).getSourceImage(), 128 * 8, 0, 128, 128, 0, 0, 128, 128);
    });
    $('#loading').hidden = true; $('#result').hidden = true; $('#pause').disabled = true;
    renderStageList(this.stageIndex);
    if (this.autoStart) { $('#intro').hidden = true; this.start(); } else $('#intro').hidden = false;
    this.updateHUD();
    this.events.once('shutdown', () => { clearTimeout(toastTimer); clearTimeout(zoneTimer); $('#toast').hidden = true; $('#zone-banner').hidden = true; });
  }
  label(x, y, value, color = '#d7c4a1') {
    return this.add.text(x, y, value, { fontFamily: 'monospace', fontSize: 13, color, backgroundColor: '#102838d9', padding: { x: 10, y: 7 } }).setDepth(4);
  }
  get player() { return this.crew.player; }
  get selected() { return this.crew.active; }
  get facing() { return this.crew.robot.facing; }
  get jumps() { return this.crew.robot.jumps; }
  set jumps(value) { this.crew.robot.jumps = value; }
  get crates() { return this.mechanics.heavy; }
  get drones() { return this.mechanics.drones; }
  get terminals() { return this.mechanics.terminals; }
  get charging() { return this.selected === 2 && this.clock < this.actionUntil ? 'biggy' : null; }
  switchRobot(index) {
    if (this.mode === 'won' || this.mode === 'over' || this.paused || index === this.selected) return;
    if (!this.crew.switchTo(index, { silent: this.mode !== 'play' })) return;
    chosenRobot = index; this.actionUntil = 0;
    this.updateHUD();
  }
  start() {
    if (this.mode !== 'intro') return;
    this.mode = 'play'; this.physics.resume(); this.introCrew.forEach(sprite => sprite.destroy());
    $('#intro').hidden = true; $('#pause').disabled = false; clearInput(); focusGame();
    zoneBanner(this.stage); tone(480, .14); music.play(this.stage.music);
  }
  hint(key, message) {
    if (this.hints.has(key)) return;
    this.hints.add(key); toast(message, 4100);
  }
  burst(x, y, color, count = 12) {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const particle = this.add.rectangle(x, y, 3 + i % 3, 3 + i % 3, color).setDepth(12);
      const angle = i / count * Math.PI * 2;
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * (25 + i % 4 * 9), y: y + Math.sin(angle) * (25 + i % 4 * 9) + 12, alpha: 0, rotation: 2, duration: 450, onComplete: () => particle.destroy() });
    }
  }
  reward(message) {
    this.burst(this.player.x, this.player.y - 20, 0xffd49a, 25);
    toast(message, 4400); tone(820, .2); this.progress.health = 3; this.updateHUD();
  }
  missingItem() {
    const names = { power: 'Biggy’s power cell', relay: 'Droid’s power link', lens: 'Voxxy’s projector lens' };
    const required = this.stage.requires ?? [];
    const missing = required.find(kind => !this.progress.cores[kind]);
    return missing ? names[missing] : null;
  }
  exitPressed() {
    const missing = this.missingItem();
    if (missing) { toast(`Still missing ${missing}. Follow the route back to collect it.`, 5000); return; }
    const finale = this.stage.fixtures.finale;
    if (finale) {
      if (this.selected !== 0) { toast('Only Voxxy is delicate enough to restart the projector. Press 1.', 3200); return; }
      if (!this.mechanics.finaleHeld) { toast('The stage plate must be held down by Biggy while the projector restarts.', 3600); return; }
      if (!this.mechanics.terminals.every(t => t.connected)) { toast('Droid must be connected to the projector terminal first.', 3600); return; }
      this.win(); return;
    }
    if (this.stageIndex === STAGES.length - 1) this.win(); else this.stageComplete();
  }
  stageComplete() {
    if (this.mode !== 'play') return;
    this.mode = 'won'; this.physics.pause(); clearInput();
    this.crew.forEach(robot => { if (robot.sprite !== this.player) { robot.sprite.setVisible(false); } });
    this.burst(this.player.x, this.player.y - 60, 0xffd89d, 30);
    saveUnlocked(Math.max(loadUnlocked(), this.stageIndex + 2));
    this.showResult({ eyebrow: `STAGE 0${this.stage.index} CLEARED`, title: this.stage.clearTitle ?? 'Onward!', copy: this.stage.clearCopy ?? 'The whole crew made it through.', final: false });
    tone(760, .3); music.jingle('stage');
  }
  showResult({ eyebrow, title, copy, final, over = false }) {
    const stageScore = resultScore({ ...this.progress, elapsed: this.progress.elapsed - this.stageStart });
    const best = over ? loadBest(this.stage.id) : saveBest(this.stage.id, stageScore);
    $('#result-eyebrow').textContent = eyebrow; $('#result-title').textContent = title; $('#result-copy').innerHTML = copy;
    $('#final-score').textContent = stageScore.toLocaleString(); $('#final-time').textContent = timeLabel(this.progress.elapsed - this.stageStart);
    $('#final-coins').textContent = String(this.progress.coins);
    $('#best-score').textContent = `STAGE BEST  ${best.toLocaleString()}  ·  TOTAL TIME ${timeLabel(this.progress.elapsed)}  ·  ${this.progress.deaths} RETRIES`;
    $('#next-stage').hidden = final || over; $('#replay').hidden = !final; $('#try-again').hidden = !over;
    $('#toast').hidden = true; $('#zone-banner').hidden = true; $('#result').hidden = false; $('#pause').disabled = true;
    (over ? $('#try-again') : final ? $('#replay') : $('#next-stage')).focus({ preventScroll: true }); this.updateHUD();
  }
  ability() {
    if (this.mode !== 'play' || this.paused) return;
    this.mechanics.ability();
  }
  hitDrone(drone) {
    if (!drone.active || this.mode !== 'play') return;
    const p = this.player;
    const stomp = p.body.velocity.y > 60 && p.body.bottom < drone.body.top + 25;
    if (stomp || (this.selected === 2 && this.clock < this.actionUntil)) {
      drone.disableBody(true, true); this.burst(drone.x, drone.y, 0x93c6d1, 15);
      if (stomp) { p.setVelocityY(-380); this.jumps = 1; }
      this.progress.coins += 2; tone(210, .12, 'triangle'); return;
    }
    if (this.loseEnergy({ x: drone.x, y: drone.y, vx: p.x < drone.x ? -250 : 250, vy: -280 })) this.hint('drone', 'Careful! Jump onto cleaning bots and swoopers, or charge through with Biggy.');
  }
  hitBolt(direction, mass) {
    const shove = boltKnockback(mass, direction);
    if (this.loseEnergy({ vx: shove.vx, vy: shove.vy })) this.hint('bolt', mass >= 5 ? 'Bolts barely move Biggy. Charge through them!' : 'Sentry bolt! Jump over them, or send Biggy through.');
  }
  // Every energy loss goes through here so the feedback is the same whatever the cause.
  // `all` empties the bar (falling off the stage) and ignores the post-hit grace period.
  // Returns true when the crew is still standing afterwards, so callers can add a hint.
  loseEnergy({ x = this.player.x, y = this.player.y, vx, vy, all = false } = {}) {
    if (this.mode !== 'play' || (!all && this.clock < this.invulnerableUntil)) return false;
    const p = this.player;
    this.progress.health = all ? 0 : this.progress.health - 1; this.invulnerableUntil = this.clock + 1500;
    if (vx !== undefined) { p.setVelocity(vx, vy); this.crew.robot.standingOn = null; this.crew.robot.onRobot = false; }
    this.damageFlash(x, y, all);
    if (this.progress.health <= 0) this.respawn();
    return this.mode === 'play' && this.progress.health > 0;
  }
  damageFlash(x, y, all) {
    const p = this.player;
    if (!reducedMotion) { this.cameras.main.flash(160, 255, 90, 60, false); this.cameras.main.shake(100, .003); }
    p.setTint(0xff5a48); this.time.delayedCall(240, () => { if (p.active) p.clearTint(); });
    this.burst(x, y, 0xff7a5c, 14);
    $('#health').classList.remove('hit'); void $('#health').offsetWidth; $('#health').classList.add('hit');
    const label = all ? 'OUT OF BOUNDS' : `−1 · ${this.progress.health} LEFT`;
    const marker = this.add.text(p.x, Math.min(p.body.top - 26, HEIGHT - 40), label, { fontFamily: 'monospace', fontSize: 15, color: '#ffb3a0', backgroundColor: '#2a0d0dcc', padding: { x: 8, y: 4 } }).setOrigin(.5).setDepth(30);
    this.tweens.add({ targets: marker, y: marker.y - 50, alpha: 0, duration: 1100, onComplete: () => marker.destroy() });
    tone(110, .15, 'triangle');
    this.updateHUD();
  }
  respawn() {
    if (this.mode !== 'play') return;
    const { gameOver, lives } = loseLife(this.progress);
    if (gameOver) { this.gameOver(); return; }
    this.progress.health = 3;
    this.crew.respawnAll(this.checkpoint);
    this.actionUntil = 0; this.invulnerableUntil = this.clock + 1700;
    this.cameras.main.centerOn(this.player.x + 180, 360);
    toast(`Back at your checkpoint. ${lives === 1 ? 'Last life' : `${lives} lives left`}, items safe. Keep going!`, 2700); tone(220, .13); this.updateHUD();
  }
  gameOver() {
    this.mode = 'over'; this.physics.pause(); clearInput();
    this.player.anims.stop(); this.player.setFrame(9); this.player.setAlpha(1);
    this.burst(this.player.x, Math.min(this.player.y, HEIGHT - 40), 0xff7a5c, 30);
    this.showResult({ eyebrow: 'GAME OVER', title: 'The curtain falls.', copy: 'The crew is out of lives.<br>Try this stage again with a fresh crew.', final: false, over: true });
    tone(90, .5, 'triangle'); music.jingle('over');
  }
  win() {
    if (this.mode !== 'play') return;
    this.mode = 'won'; this.progress.won = true; this.physics.pause();
    this.player.anims.stop(); this.player.setFrame(8); clearInput();
    if (this.screen) { this.screen.setFillStyle(0xe9dab7); this.screenTitle.setText('HELLO, DEVOXX.').setColor('#2d454c'); this.screenSubtitle.setText('THE SHOW IS YOURS.').setColor('#617477'); }
    this.burst(this.player.x, this.player.y - 100, 0xffd89d, 40);
    saveUnlocked(STAGES.length);
    this.showResult({ eyebrow: 'HELLO, DEVOXX.', title: 'Right on cue.', copy: 'Three very different robots.<br>One spectacular opening night.', final: true });
    tone(880, .4); music.jingle('win');
  }
  updateHUD() {
    document.querySelectorAll('[data-robot]').forEach(element => {
      const selected = Number(element.dataset.robot) === this.selected;
      element.classList.toggle('selected', selected); element.setAttribute('aria-pressed', String(selected));
    });
    for (const [kind, complete] of Object.entries(this.progress.cores)) $(`[data-core="${kind}"]`).classList.toggle('complete', complete);
    for (const robot of this.crew.robots) {
      const chip = $(`[data-chip="${robot.index}"]`);
      chip.className = robot.state; chip.dataset.state = robot.state === 'active' ? 'YOU' : robot.job ? robot.job.toUpperCase() : robot.state.toUpperCase();
    }
    $('#coins').textContent = String(this.progress.coins).padStart(2, '0');
    const health = $('#health');
    health.innerHTML = `<small>ENERGY</small>${'<i class="on"></i>'.repeat(this.progress.health)}${'<i></i>'.repeat(3 - this.progress.health)}`;
    health.setAttribute('aria-label', `${this.progress.health} energy remaining`); health.classList.toggle('low', this.progress.health <= 1);
    const lives = $('#lives');
    lives.innerHTML = `<small>LIVES</small>${'<i class="on"></i>'.repeat(this.progress.lives)}${'<i></i>'.repeat(Math.max(0, LIVES - this.progress.lives))}`;
    lives.setAttribute('aria-label', `${this.progress.lives} lives remaining`); lives.classList.toggle('low', this.progress.lives <= 1);
    $('#run-time').textContent = timeLabel(this.progress.elapsed);
    $('#chapter-number').textContent = `0${this.stage.index}`; $('#chapter-title').textContent = this.stage.title;
    const objective = this.mode === 'intro' ? 'Choose your first robot. The cinema is counting on you.' : this.mode === 'over' ? 'Out of lives. Try this stage again, or pick another stage.' : this.mode === 'won' ? (this.stage.fixtures.finale ? 'The keynote is live. You saved opening night.' : 'Stage cleared. On to the next one!') : (this.stage.objective?.(this.progress) ?? (this.missingItem() ? `Find ${this.missingItem()} in this stage.` : 'Everything collected. Reach the exit door on the right and press E.'));
    $('#objective').innerHTML = `<span class="status-dot"></span>${objective}`;
  }
  update(_time, delta) {
    if (!this.player) return;
    const pressed = key => Phaser.Input.Keyboard.JustDown(this.keys[key]);
    if (pressed('esc') && this.mode === 'play') { togglePause(); return; }
    if (this.mode !== 'play' || this.paused) return;
    this.clock += Math.min(delta, 100); this.progress.elapsed += Math.min(delta, 100) / 1000;
    if (pressed('restart')) this.respawn();
    const p = this.player;
    const left = this.keys.left.isDown || this.keys.a.isDown || touch.left;
    const right = this.keys.right.isDown || this.keys.d.isDown || touch.right;
    const jump = this.keys.space.isDown || this.keys.w.isDown || this.keys.up.isDown || touch.jump;
    if (pressed('ability') || touch.ability) { touch.ability = false; this.ability(); }
    if (this.mode !== 'play') return;
    this.crew.resolveStacks();
    const onFloor = this.crew.updateActive({ left, right, jump, charging: this.clock < this.actionUntil, chargeSpeed: this.chargeSpeed ?? 510 });
    this.crew.update();
    this.mechanics.update();
    p.setAlpha(this.clock < this.invulnerableUntil && Math.floor(this.clock / 95) % 2 === 0 ? .45 : 1);
    this.shadow.setPosition(p.x, p.body.bottom + 3).setAlpha(onFloor ? .32 : .1);
    for (let i = 0; i < this.flags.length; i++) {
      const flag = this.flags[i];
      if (i > this.checkpointIndex && Math.abs(p.x - flag.x) < 42 && onFloor && Math.abs(p.body.bottom - FLOOR) < 8) {
        this.checkpointIndex = i; this.checkpoint = { x: flag.x, y: FLOOR - 48 };
        flag.flag.setFillStyle(0xf2bb7e); flag.light.setFillStyle(0xd3edb3);
        this.progress.health = 3; toast('Checkpoint! Your crew can recharge here.', 1700); tone(630, .12);
      }
    }
    if (p.y > HEIGHT + 40) this.loseEnergy({ y: HEIGHT - 30, all: true });
    if (this.stageIndex === 0 && p.x > 550) this.hint('jump', 'Hold Space for a higher jump. Voxxy can jump a second time in the air.');
    if (Math.abs(p.x - this.stage.fixtures.exit.x) < 160) this.hint('exit', this.stage.fixtures.finale ? 'The projector. Biggy on the plate, Droid connected, then Voxxy presses E.' : 'The exit door. Press E and the whole crew moves on.');
    if (this.clock - this.lastHUD > 100) { this.updateHUD(); this.lastHUD = this.clock; }
  }
}

function suspend() {
  if (!scene || scene.mode !== 'play') return;
  scene.paused = true; scene.physics.pause(); scene.tweens.pauseAll(); clearInput(); music.pause();
}
function resume() {
  if (!scene || scene.mode !== 'play') return;
  scene.paused = false; scene.physics.resume(); scene.tweens.resumeAll(); clearInput(); focusGame(); music.resume();
}
function togglePause() {
  if (!scene || scene.mode !== 'play' || $('#help-dialog').open) return;
  if ($('#pause-dialog').open) { $('#pause-dialog').close(); resume(); }
  else { suspend(); $('#pause-dialog').showModal(); }
}
$('#start').addEventListener('click', () => scene?.start());
document.querySelectorAll('[data-robot]').forEach(button => button.addEventListener('click', () => {
  scene?.switchRobot(Number(button.dataset.robot)); focusGame();
}));
$('#pause').addEventListener('click', togglePause);
$('#resume').addEventListener('click', togglePause);
$('#pause-dialog').addEventListener('cancel', event => { event.preventDefault(); togglePause(); });
$('#help').addEventListener('click', () => { suspend(); $('#help-dialog').showModal(); });
for (const selector of ['.close-dialog', '.close-help']) $(selector).addEventListener('click', () => $('#help-dialog').close());
$('#help-dialog').addEventListener('close', () => { if (!$('#pause-dialog').open) resume(); });
function loadStage(stage, { progress = null, autoStart = false } = {}) {
  if ($('#pause-dialog').open) $('#pause-dialog').close();
  if (!scene) return;
  chosenStage = stage; scene.tweens.resumeAll(); clearInput(); $('#result').hidden = true;
  scene.scene.restart({ stage, progress, autoStart });
}
function renderStageList(current) {
  const unlocked = loadUnlocked(), list = $('#stage-list'); list.innerHTML = '';
  STAGES.forEach((stage, index) => {
    const button = document.createElement('button');
    const locked = index >= unlocked;
    button.type = 'button'; button.className = `${index === current ? 'current' : ''} ${locked ? 'locked' : ''}`.trim();
    button.disabled = locked; button.dataset.stage = String(index);
    button.innerHTML = `<b>${stage.title}</b><small>STAGE 0${stage.index}${locked ? ' · LOCKED' : loadBest(stage.id) ? ` · BEST ${loadBest(stage.id).toLocaleString()}` : ''}</small>`;
    button.addEventListener('click', () => loadStage(index));
    list.appendChild(button);
  });
  const reset = document.createElement('button');
  reset.type = 'button'; reset.className = 'reset'; reset.innerHTML = '<b>New adventure</b><small>RESET UNLOCKS</small>';
  reset.addEventListener('click', () => { resetProgress(); loadStage(0); });
  list.appendChild(reset);
}
// Robot switching listens to the DOM directly: event.key works on every keyboard layout and the numeric keypad,
// unlike Phaser's legacy keyCode mapping.
document.addEventListener('keydown', event => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  if (document.querySelector('dialog[open]') || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  const index = { 1: 0, 2: 1, 3: 2 }[event.key] ?? { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[event.code];
  if (index === undefined || !scene) return;
  event.preventDefault(); scene.switchRobot(index);
});
$('#restart').addEventListener('click', () => loadStage(scene?.stageIndex ?? 0));
$('#replay').addEventListener('click', () => loadStage(0));
$('#try-again').addEventListener('click', () => loadStage(scene?.stageIndex ?? 0, { autoStart: true }));
$('#next-stage').addEventListener('click', () => loadStage(Math.min(STAGES.length - 1, (scene?.stageIndex ?? 0) + 1), { progress: scene?.progress ?? null, autoStart: true }));
$('#stage-select').addEventListener('click', () => loadStage(scene?.stageIndex ?? 0));
$('#to-select').addEventListener('click', () => loadStage(scene?.stageIndex ?? 0));
$('#music').addEventListener('click', () => {
  music.toggle(); musicLabel();
  if (music.unavailable) toast('Music is unavailable in this browser. You can still play.');
  if (music.enabled && scene?.mode === 'play' && !scene.paused) music.play(scene.stage.music);
  focusGame();
});
musicLabel();
$('#sound').addEventListener('click', async () => {
  try {
    audio ??= new AudioContext(); await audio.resume(); sound = !sound;
    $('#sound').setAttribute('aria-pressed', String(sound)); $('#sound span').textContent = sound ? 'Sound on' : 'Sound off'; tone(600);
  } catch { toast('Sound is unavailable in this browser. You can still play.'); }
});
$('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $('.game-shell').requestFullscreen();
  } catch { toast('Fullscreen is unavailable here. The game works in this window.'); }
  focusGame();
});
document.querySelectorAll('[data-hold]').forEach(button => {
  const action = button.dataset.hold;
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touch[action] = true; });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => { touch[action] = false; });
});
document.querySelector('[data-action="ability"]').addEventListener('click', () => { touch.ability = true; });
document.addEventListener('visibilitychange', () => {
  clearInput();
  if (document.hidden && scene?.mode === 'play' && !scene.paused) { suspend(); if (!$('#pause-dialog').open && !$('#help-dialog').open) $('#pause-dialog').showModal(); }
});
window.addEventListener('blur', clearInput);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game', backgroundColor: '#102334',
  width: 1280, height: 720,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: true, powerPreference: 'low-power' },
  physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, fps: 60, fixedStep: true, debug: false } },
  scene: Adventure,
});
// Explicitly opt-in inspection for the local browser integration test.
if (new URLSearchParams(location.search).has('test')) window.__KEYNOTE_GAME__ = game;
window.addEventListener('error', event => {
  if (!$('#loading').hidden) $('#loading p').textContent = `The game could not start: ${event.message}`;
});
