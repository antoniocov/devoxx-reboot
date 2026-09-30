// Fixtures that read stack mass: plates and doors, gratings, springs, pushable cases, Droid's bridge, Biggy's launch,
// plus the mission fixtures (heavy cases, terminals and bridges, the lens, drones and the exit).
import { TILE, TILES, FLOOR, ROBOTS, grantCore } from './level.js';
import { MASS, plateHeld, gratingBreaks, springImpulse, pushSpeed, bridgeBuckles, launchImpulse } from './rules.js';

const Phaser = window.Phaser;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Mechanics {
  constructor(scene, stage, crew, hooks) {
    this.scene = scene; this.stage = stage; this.crew = crew; this.hooks = hooks;
    this.bridge = null; this.finaleHeld = false;
    crew.extraBodies = () => this.cases.getChildren().filter(c => c.active).map(c => ({ id: c.id, mass: MASS.case, standingOn: c.standingOn }));
  }
  create() {
    const { scene, crew } = this, f = this.stage.fixtures, map = scene.map, layer = scene.floorLayer;
    this.doors = (f.doors ?? []).map(door => ({ ...door, open: false, latched: false }));
    for (const door of this.doors) this.setDoor(door, false);
    this.plates = scene.physics.add.staticGroup();
    for (const data of f.plates ?? []) {
      const y = data.y ?? FLOOR;
      const plate = this.plates.create(data.x, y - 8, `plate-${data.threshold}`).setDepth(3);
      Object.assign(plate, { id: data.id, threshold: data.threshold, target: data.target, momentary: Boolean(data.momentary), top: y, held: false, latched: false });
      plate.body.setSize(96, 12).setOffset(0, 4);
    }
    this.gratings = (f.gratings ?? []).map((g, i) => ({ ...g, id: `grating-${i}`, broken: false }));
    for (const g of this.gratings) for (let i = 0; i < g.length; i++) map.putTileAt(TILES.GRATING, g.col + i, g.row, true, layer).setCollision(true);
    this.springs = scene.physics.add.staticGroup();
    for (const data of f.springs ?? []) for (let i = 0; i < (data.length ?? 1); i++) {
      const spring = this.springs.create(data.x + i * TILE, data.y, 'spring').setDepth(4);
      spring.body.setSize(44, 12).setOffset(2, 2);
    }
    scene.physics.add.collider(crew.group, this.springs, (a, b) => this.bounce(a.robot ? a : b, a.robot ? b : a), (a, b) => {
      const sprite = a.robot ? a : b, spring = a.robot ? b : a; // cushions only catch robots arriving from above
      return sprite.body.bottom <= spring.body.top + 12 && sprite.body.velocity.y >= 0;
    });
    this.cases = scene.physics.add.group();
    (f.cases ?? []).forEach((data, i) => {
      const box = this.cases.create(data.x, data.y, 'case').setDepth(5);
      box.id = `case-${i}`; box.standingOn = null;
      box.setCollideWorldBounds(true).setMaxVelocity(300, 1100).setDragX(2000); box.body.setSize(44, 46).setOffset(2, 2);
    });
    scene.physics.add.collider(this.cases, layer); scene.physics.add.collider(this.cases, this.cases);
    scene.physics.add.collider(crew.group, this.cases, null, (a, b) => this.pushCase(a.robot ? a : b, a.robot ? b : a));
    this.heavy = scene.physics.add.staticGroup();
    for (const data of f.heavyCases ?? []) { const crate = this.heavy.create(data.x, data.y, 'crate').setDepth(5); crate.core = Boolean(data.core); }
    scene.physics.add.collider(crew.group, this.heavy, (a, b) => { const sprite = a.robot ? a : b; if (sprite === crew.player) this.smash(a.robot ? b : a); });
    scene.physics.add.collider(this.cases, this.heavy);
    this.terminals = (f.terminals ?? []).map(data => ({ ...data, connected: false, object: scene.add.image(data.x, data.y, 'terminal').setDepth(4) }));
    this.lens = null;
    if (f.lens) {
      this.lens = scene.physics.add.staticImage(f.lens.x, f.lens.y, 'lens').setDepth(5); this.lens.body.setCircle(28, 6, 6);
      this.lensGlow = scene.add.image(f.lens.x, f.lens.y, 'glow').setScale(.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
      scene.physics.add.overlap(crew.group, this.lens, (a, b) => this.takeLens(a.robot ? a : b));
    }
    this.drones = scene.physics.add.group({ allowGravity: false });
    for (const data of f.drones ?? []) {
      const drone = this.drones.create(data.x, data.y + 15, 'drone').setDepth(6);
      drone.body.setSize(51, 32).setOffset(10, 12); drone.route = data; drone.setVelocityX(data.speed);
    }
    scene.physics.add.overlap(crew.group, this.drones, (a, b) => { const sprite = a.robot ? a : b; if (sprite === crew.player) this.hooks.hitDrone(a.robot ? b : a); });
    this.exit = scene.add.image(f.exit.x, FLOOR - 50, 'terminal').setDepth(5);
    // Sentry projectors fire slow bolts on a timer; swoopers dive at the active robot and return to their perch.
    this.sentries = scene.physics.add.staticGroup();
    (f.sentries ?? []).forEach((data, i) => {
      const sentry = this.sentries.create(data.x, data.y, 'sentry').setDepth(6).setFlipX(data.facing < 0);
      Object.assign(sentry, { facing: data.facing ?? -1, interval: data.interval ?? 1700, nextShot: 600 + i * 450, lens: data.y });
    });
    this.bolts = scene.physics.add.group({ allowGravity: false });
    scene.physics.add.collider(this.bolts, layer, bolt => this.popBolt(bolt));
    scene.physics.add.overlap(crew.group, this.bolts, (a, b) => { const sprite = a.robot ? a : b, bolt = a.robot ? b : a; if (sprite === crew.player) this.boltHit(bolt); });
    scene.physics.add.overlap(crew.group, this.sentries, (a, b) => { const sprite = a.robot ? a : b; if (sprite === crew.player) this.touchSentry(a.robot ? b : a); });
    this.swoopers = scene.physics.add.group({ allowGravity: false });
    for (const data of f.swoopers ?? []) {
      const swooper = this.swoopers.create(data.x, data.y, 'swooper').setDepth(6);
      swooper.body.setSize(44, 28).setOffset(13, 14); Object.assign(swooper, { home: { x: data.x, y: data.y }, range: data.range ?? 360, mode: 'perch', restUntil: 0 });
    }
    scene.physics.add.overlap(crew.group, this.swoopers, (a, b) => { const sprite = a.robot ? a : b; if (sprite === crew.player) this.hooks.hitDrone(a.robot ? b : a); });
  }
  popBolt(bolt) { if (!bolt.active) return; this.hooks.burst(bolt.x, bolt.y, 0xffc27a, 6); bolt.destroy(); }
  boltHit(bolt) {
    if (!bolt.active) return;
    const robot = this.crew.robot;
    if (this.scene.charging === 'biggy') { this.popBolt(bolt); this.hooks.hint('bolt-biggy', 'Biggy’s charge shrugs the bolts off.'); return; }
    const direction = Math.sign(bolt.body.velocity.x) || 1;
    this.popBolt(bolt); this.hooks.hitBolt(direction, MASS[robot.id]);
  }
  touchSentry(sentry) {
    if (!sentry.active) return;
    const p = this.crew.player, stomp = p.body.velocity.y > 60 && p.body.bottom < sentry.body.top + 22;
    if (stomp || this.scene.charging === 'biggy') {
      sentry.destroy(); this.hooks.burst(sentry.x, sentry.y, 0xf0a860, 18); this.hooks.tone(150, .18, 'triangle');
      if (stomp) { p.setVelocityY(-380); this.crew.robot.jumps = 1; }
      this.scene.progress.coins += 3; this.hooks.toast('Sentry down! +3 sparks', 1500);
    } else this.hooks.hint('sentry', 'A sentry projector. Jump on it with Voxxy, or charge it with Biggy.');
  }
  updateEnemies(now) {
    for (const sentry of this.sentries.getChildren()) {
      if (!sentry.active || now < sentry.nextShot) continue;
      sentry.nextShot = now + sentry.interval;
      if (Math.abs(sentry.x - this.crew.player.x) > 900) continue;
      const bolt = this.bolts.create(sentry.x + sentry.facing * 28, sentry.lens, 'bolt').setDepth(7).setFlipX(sentry.facing < 0);
      bolt.body.setSize(18, 8).setOffset(4, 2); bolt.setVelocityX(sentry.facing * 260); bolt.diesAt = now + 3200;
      this.hooks.tone(720, .05, 'square', .02); sentry.setTint(0xffd9a0); this.scene.time.delayedCall(120, () => sentry.active && sentry.clearTint());
    }
    for (const bolt of this.bolts.getChildren()) if (bolt.active && now > bolt.diesAt) bolt.destroy();
    const target = this.crew.player;
    for (const swooper of this.swoopers.getChildren()) {
      if (!swooper.active) continue;
      const dx = target.x - swooper.x, dy = target.body.center.y - swooper.y;
      if (swooper.mode === 'perch') {
        swooper.setVelocity((swooper.home.x - swooper.x) * 2, (swooper.home.y - swooper.y) * 2 + Math.sin(now / 300) * 18);
        if (now > swooper.restUntil && Math.abs(dx) < swooper.range && dy > 40) { swooper.mode = 'dive'; swooper.diveUntil = now + 900; this.hooks.tone(300, .12, 'sawtooth', .03); }
      } else if (swooper.mode === 'dive') {
        const length = Math.hypot(dx, dy) || 1;
        swooper.setVelocity(dx / length * 330, dy / length * 330);
        if (now > swooper.diveUntil || length < 24) { swooper.mode = 'return'; swooper.restUntil = now + 2200; }
      } else {
        const hx = swooper.home.x - swooper.x, hy = swooper.home.y - swooper.y, length = Math.hypot(hx, hy) || 1;
        swooper.setVelocity(hx / length * 220, hy / length * 220);
        if (length < 12) swooper.mode = 'perch';
      }
      swooper.setFlipX(swooper.body.velocity.x < 0);
    }
  }
  // ---- helpers -------------------------------------------------------------------------------
  standingOnRect(robot, left, right, top, tolerance = 8) {
    const body = robot.sprite.body;
    return body.velocity.y >= -1 && Math.abs(body.bottom - top) <= tolerance && body.right > left + 4 && body.left < right - 4;
  }
  now() { return this.scene.clock; }
  setDoor(door, open) {
    for (let r = 0; r < door.height; r++) {
      const row = door.row - r;
      if (open) this.scene.map.removeTileAt(door.col, row, true, true, this.scene.floorLayer);
      else this.scene.map.putTileAt(TILES.DOOR, door.col, row, true, this.scene.floorLayer).setCollision(true);
    }
    door.open = open;
  }
  // ---- per-frame ---------------------------------------------------------------------------
  update() {
    const { crew } = this, now = this.now();
    // Robots on pushable cases, cases on plates, robots on plates and gratings feed the mass chain.
    for (const box of this.cases.getChildren()) {
      if (!box.active) continue;
      box.standingOn = null;
      for (const plate of this.plates.getChildren()) if (Math.abs(box.body.bottom - plate.top) <= 8 && box.body.right > plate.body.left + 4 && box.body.left < plate.body.right - 4) box.standingOn = plate.id;
      for (const robot of crew.robots) if (!robot.standingOn && this.standingOnRect(robot, box.body.left, box.body.right, box.body.top)) { robot.standingOn = box.id; robot.onRobot = true; }
    }
    for (const robot of crew.robots) {
      if (robot.standingOn) continue;
      for (const plate of this.plates.getChildren()) if (this.standingOnRect(robot, plate.body.left, plate.body.right, plate.top)) robot.standingOn = plate.id;
      if (robot.standingOn) continue;
      for (const g of this.gratings) if (!g.broken && this.standingOnRect(robot, g.col * TILE, (g.col + g.length) * TILE, g.row * TILE)) robot.standingOn = g.id;
      if (robot.standingOn) continue;
      if (this.bridge && this.standingOnRect(robot, this.bridge.left, this.bridge.right, this.bridge.top)) robot.standingOn = 'bridge';
    }
    for (const plate of this.plates.getChildren()) {
      const mass = crew.stackMassOn(plate.id);
      const held = plateHeld(mass, plate.threshold);
      if (held && !plate.latched && !plate.momentary) { plate.latched = true; this.hooks.tone(560, .12); }
      const active = held || plate.latched;
      if (active !== plate.held) {
        plate.held = active; plate.setTint(active ? 0xc7ffd8 : 0xffffff);
        if (plate.target === 'finale') this.finaleHeld = active;
        else { const door = this.doors.find(d => d.id === plate.target); if (door) this.setDoor(door, active); }
        if (active) { this.hooks.burst(plate.x, plate.top - 6, 0xb8f5c9, 10); this.hooks.toast(plate.latched ? `Plate ${plate.threshold} pressed. The shutter is open.` : 'Plate held down.', 1800); }
      }
      if (!active && mass > 0 && mass < plate.threshold) this.hooks.hint(`plate-${plate.id}`, `This plate needs weight ${plate.threshold}. Stack robots or push a case onto it.`);
      // A robot left standing on a momentary plate keeps holding it until the player takes it away.
      if (plate.momentary) for (const robot of crew.robots) {
        if (robot.standingOn === plate.id && robot.state === 'follow') { crew.park(robot, 'hold'); this.hooks.toast(`${robot.spec.name} holds the plate.`, 1600); }
      }
    }
    for (const g of this.gratings) {
      if (g.broken) continue;
      if (gratingBreaks(crew.stackMassOn(g.id))) {
        g.broken = true;
        for (let i = 0; i < g.length; i++) { this.scene.map.removeTileAt(g.col + i, g.row, true, true, this.scene.floorLayer); this.hooks.burst((g.col + i) * TILE + 24, g.row * TILE + 24, 0x8fa5aa, 10); }
        if (!reducedMotion) this.scene.cameras.main.shake(140, .004);
        this.hooks.tone(80, .25, 'triangle'); this.hooks.toast('Too heavy! The grating gives way under Biggy.', 2400);
      }
    }
    if (this.bridge) this.updateBridge(now);
    this.updateEnemies(now);
    for (const drone of this.drones.getChildren()) {
      if (!drone.active) continue;
      if (drone.x > drone.route.max) drone.setVelocityX(-drone.route.speed);
      if (drone.x < drone.route.min) drone.setVelocityX(drone.route.speed);
      drone.setFlipX(drone.body.velocity.x < 0);
    }
  }
  // ---- springs -----------------------------------------------------------------------------
  bounce(sprite, spring) {
    const robot = sprite.robot;
    if (!sprite.body.touching.down || robot.fallSpeed < 120) return;
    const mass = MASS[robot.id] + this.crew.stackMassOn(robot.id);
    const impulse = springImpulse(mass);
    sprite.setVelocityY(impulse); robot.jumps = 1; robot.fallSpeed = 0; robot.standingOn = null; robot.onRobot = false;
    for (const rider of this.crew.robots) if (rider.standingOn === robot.id) { rider.sprite.setVelocityY(impulse); rider.standingOn = null; rider.onRobot = false; }
    if (!reducedMotion) this.scene.tweens.add({ targets: spring, scaleY: .55, duration: 90, yoyo: true });
    this.hooks.tone(mass <= 1 ? 640 : mass <= 2 ? 360 : 140, .14, mass >= 5 ? 'triangle' : 'sine');
    if (robot === this.crew.robot) this.hooks.hint('spring', mass >= 5 ? 'Biggy is far too heavy to bounce.' : mass >= 2 ? 'Droid gets a small hop. Voxxy would fly.' : 'Boing! Light robots bounce high. Press jump again in the air.');
  }
  // ---- pushable cases ------------------------------------------------------------------------
  pushCase(sprite, box) {
    const robot = sprite.robot, R = sprite.body, C = box.body;
    if (R.bottom <= C.top + 14 && R.velocity.y >= 0) { box.body.immovable = true; return true; }
    const charging = this.scene.charging === robot.id;
    const speed = pushSpeed(MASS[robot.id], charging);
    box.body.immovable = true;
    if (speed === 0) { if (robot === this.crew.robot) this.hooks.hint('case-light', 'Too heavy for Voxxy. Droid can shove it slowly, Biggy quickly.'); return true; }
    const direction = Math.sign(box.x - sprite.x) || robot.facing;
    if (Math.sign(R.velocity.x) === direction || charging) { box.setVelocityX(direction * speed); if (robot === this.crew.robot) this.hooks.hint('case-push', `${robot.spec.name} pushes the case. Get it onto a plate.`); }
    return true;
  }
  // ---- heavy cases, terminals, lens, exit -------------------------------------------------------
  smash(crate) {
    if (!crate.active) return;
    if (this.scene.charging !== 'biggy') { this.hooks.hint(crate.core ? 'crate-core' : 'crate', crate.core ? 'That marked case holds our power cell. Press 3 for Biggy, then E to charge.' : 'Heavy case ahead. Switch to Biggy (3), then press E to charge through it.'); return; }
    crate.disableBody(true, true); this.hooks.burst(crate.x, crate.y, 0xc8a47b, 20);
    if (!reducedMotion) this.scene.cameras.main.shake(120, .003);
    this.hooks.tone(95, .16, 'triangle');
    if (crate.core && grantCore(this.scene.progress, 'power', 'biggy')) this.hooks.reward('Power cell recovered! Bring it to the projector.');
  }
  takeLens(sprite) {
    if (!this.lens?.active) return;
    if (grantCore(this.scene.progress, 'lens', sprite.robot.id)) {
      this.lens.disableBody(true, true); this.lensGlow.setVisible(false);
      this.hooks.reward('Projector lens recovered. Take the crew to the big screen!');
    } else if (sprite === this.crew.player && sprite.robot.id !== 'voxxy' && !this.scene.progress.cores.lens) this.hooks.hint('lens-role', 'Switch to Voxxy (1) to retrieve the delicate projector lens.');
  }
  connectTerminal() {
    const p = this.crew.player;
    const terminal = this.terminals.find(t => Math.abs(t.x - p.x) < 110 && Math.abs(p.body.bottom - (t.floor ?? FLOOR)) < 90);
    if (!terminal) return false;
    if (terminal.connected) { this.hooks.toast('Already connected. Keep going!', 1500); return true; }
    terminal.connected = true; terminal.object.setTint(0xaaffec);
    const bridge = (this.stage.fixtures.bridges ?? []).find(b => b.id === terminal.target);
    if (bridge) {
      for (let col = bridge.start; col <= bridge.end; col++) this.scene.map.putTileAt(TILES.BRIDGE, col, bridge.row, true, this.scene.floorLayer).setCollision(true);
      this.scene.floorLayer.setCollisionBetween(0, 7, true, true);
    }
    if (terminal.core) grantCore(this.scene.progress, 'relay', 'droid');
    this.hooks.reward(terminal.message ?? 'Power link restored. The bridge is online!');
    return true;
  }
  nearExit() {
    const p = this.crew.player, exit = this.stage.fixtures.exit;
    return Math.abs(p.x - exit.x) < 105 && Math.abs(p.body.bottom - FLOOR) < 75;
  }
  // ---- Droid's bridge ------------------------------------------------------------------------
  toggleBridge() {
    const droid = this.crew.get('droid');
    if (this.bridge) return this.standUp(droid, true);
    const p = droid.sprite;
    if (!this.crew.onFloor(p) || droid.standingOn) { this.hooks.toast('Droid needs solid ground to lie down.', 1600); return false; }
    const facing = droid.facing, feet = p.body.bottom, start = facing > 0 ? p.body.right - 6 : p.body.left - 138;
    // The walking surface sits 2 px above Droid's feet so robots step onto it without hitting a lip.
    this.bridge = { left: start, right: start + 144, top: feet - 2, droidX: p.x, droidY: p.y, facing, wobbleUntil: 0 };
    this.bridge.body = this.scene.physics.add.staticImage(start + 72, feet + 6, 'plate-3').setVisible(false);
    this.bridge.body.body.setSize(144, 14).setOffset(-24, 0);
    this.bridge.collider = this.scene.physics.add.collider(this.crew.group, this.bridge.body);
    this.bridge.caseCollider = this.scene.physics.add.collider(this.cases, this.bridge.body);
    p.body.enable = false; p.setFrame(12); p.anims.stop();
    p.setPosition(start + 72, feet - 24); p.setFlipX(facing < 0);
    this.crew.park(droid, 'bridge');
    this.hooks.burst(start + 72, feet - 10, 0x9ad7df, 12); this.hooks.tone(240, .18);
    this.hooks.toast('Droid lies down as a bridge. Light robots can cross. Biggy cannot.', 2600);
    return true;
  }
  standUp(droid, byPlayer) {
    const load = this.crew.stackMassOn('bridge');
    if (load > 0) { if (byPlayer) this.hooks.toast('Someone is standing on Droid’s back.', 1500); return false; }
    this.removeBridge(false);
    return true;
  }
  removeBridge(buckled) {
    const droid = this.crew.get('droid'), p = droid.sprite, b = this.bridge;
    if (!b) return;
    b.collider.destroy(); b.caseCollider.destroy(); b.body.destroy();
    this.scene.tweens.killTweensOf(p); p.setAngle(0);
    p.body.enable = true; p.body.reset(b.droidX, b.droidY); p.setFrame(8);
    this.bridge = null; this.crew.unpark(droid);
    for (const robot of this.crew.robots) if (robot.standingOn === 'bridge') { robot.standingOn = null; robot.onRobot = false; }
    if (buckled) { droid.dazedUntil = this.now() + 1000; this.hooks.tone(120, .3, 'triangle'); this.hooks.toast('Too heavy! Droid buckles under Biggy. Find Biggy another way across.', 3200); }
    else this.hooks.tone(300, .1);
  }
  updateBridge(now) {
    const b = this.bridge, mass = this.crew.stackMassOn('bridge');
    if (bridgeBuckles(mass) && !b.wobbleUntil) {
      b.wobbleUntil = now + 350;
      if (!reducedMotion) this.scene.tweens.add({ targets: this.crew.get('droid').sprite, angle: b.facing * 6, duration: 70, yoyo: true, repeat: 4 });
      this.hooks.tone(160, .3, 'triangle');
    }
    if (b.wobbleUntil && now >= b.wobbleUntil) this.removeBridge(true);
  }
  // ---- Biggy's launch ------------------------------------------------------------------------
  launchRiders() {
    const biggy = this.crew.get('biggy');
    let launched = false;
    for (const rider of this.crew.robots) {
      if (rider.standingOn !== 'biggy') continue;
      const impulse = launchImpulse(rider.id, biggy.facing);
      if (!impulse) continue;
      rider.sprite.setVelocity(impulse.vx, impulse.vy); rider.standingOn = null; rider.onRobot = false; rider.jumps = 1; rider.lastGrounded = -1000;
      // Fly without drag and wait where you land: the player switches to the launched robot to continue.
      rider.sprite.setDragX(0); rider.job = 'wait'; if (rider.state !== 'active') rider.state = 'parked';
      this.hooks.burst(rider.sprite.x, rider.sprite.y + 30, 0xffd9a5, 16); launched = true;
    }
    if (launched) { this.hooks.tone(520, .2); this.hooks.hint('launch', 'Launched! Voxxy can still jump once in the air.'); }
    return launched;
  }
  // ---- E ------------------------------------------------------------------------------------
  ability() {
    const { crew, scene } = this, robot = crew.robot, p = crew.player;
    if (scene.clock < scene.abilityCooldown[crew.active]) return;
    if (robot.id === 'droid') {
      scene.abilityCooldown[crew.active] = scene.clock + 500;
      if (this.bridge) { this.standUp(robot, true); return; }
      if (this.connectTerminal()) return;           // a terminal beside the exit still counts as a terminal
      if (this.nearExit()) { this.hooks.exit(); return; }
      this.toggleBridge();
      return;
    }
    if (this.nearExit() && !robot.job) { this.hooks.exit(); return; }
    const biggy = robot.id === 'biggy';
    scene.actionUntil = scene.clock + (biggy ? 480 : 210); scene.chargeSpeed = biggy ? 510 : 650;
    scene.abilityCooldown[crew.active] = scene.clock + (biggy ? 950 : 760);
    p.setAccelerationX(0); p.setVelocityX(robot.facing * scene.chargeSpeed);
    if (!biggy && p.body.velocity.y > 0) p.setVelocityY(0);
    // With someone on his back Biggy plants his feet and throws: a short lunge instead of a full charge.
    if (biggy && this.launchRiders()) { scene.actionUntil = scene.clock + 160; scene.chargeSpeed = 140; p.setVelocityX(robot.facing * 140); }
    this.hooks.burst(p.x - robot.facing * 15, p.y + 28, biggy ? 0xe5ac77 : 0xffd9a5, 8);
    this.hooks.tone(biggy ? 130 : 450, .1, 'triangle');
  }
  respawn() { if (this.bridge) this.removeBridge(false); }
}
