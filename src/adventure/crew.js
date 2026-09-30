// The crew: three robots that are always present. One is active, the others follow or stay parked on a job.
import { HEIGHT, ROBOTS } from './level.js';
import { followDecision, shouldRecall, stackMass } from './rules.js';

const Phaser = window.Phaser;
const FEET = 48; // sprite centre to feet, for every robot sheet

export class Crew {
  constructor(scene, stage, hooks = {}) {
    this.scene = scene; this.stage = stage; this.hooks = hooks;
    this.width = stage.widthTiles * 48;
    this.extraBodies = () => [];
    this.group = scene.physics.add.group();
    this.robots = ROBOTS.map((spec, index) => {
      const sprite = this.group.create(Math.max(spec.width / 2 + 4, stage.spawn.x - index * 70), stage.spawn.y, spec.id, 8);
      sprite.setDepth(10).setCollideWorldBounds(true).setMaxVelocity(720, 1100).setDragX(spec.drag);
      sprite.body.setSize(spec.width, spec.height).setOffset(64 - spec.width / 2, 112 - spec.height);
      const robot = { id: spec.id, index, spec, sprite, state: 'follow', standingOn: null, onRobot: false, fallSpeed: 0, job: null, stuckSince: 0, jumps: 0, facing: 1, dazedUntil: 0, recallUntil: 0, lastGrounded: -1000, jumpBuffer: -1000, jumpWasDown: false };
      sprite.robot = robot;
      return robot;
    });
    this.active = -1;
    this.switchTo(hooks.initial ?? 0, { silent: true });
  }
  get player() { return this.robots[this.active].sprite; }
  get robot() { return this.robots[this.active]; }
  get(id) { return this.robots.find(robot => robot.id === id); }
  forEach(fn) { this.robots.forEach(fn); }
  onFloor(sprite) { return (sprite.body.blocked.down || sprite.body.touching.down || sprite.robot?.onRobot) && sprite.body.velocity.y >= 0; }
  feetY(robot, feet) { return feet - FEET; }

  // Robots never block each other sideways, but any robot can stand on another one.
  // Runs right after the physics step: riders are snapped onto their carrier and travel with it.
  resolveStacks() {
    for (const robot of this.robots) { robot.standingOn = null; robot.onRobot = false; }
    const sorted = [...this.robots].sort((a, b) => b.sprite.body.top - a.sprite.body.top);
    for (const rider of sorted) {
      const A = rider.sprite.body;
      let carrier = null;
      for (const other of this.robots) {
        if (other === rider || other.standingOn === rider.id || !other.sprite.body.enable) continue;
        const B = other.sprite.body;
        if (A.right > B.left + 4 && A.left < B.right - 4 && A.bottom >= B.top - 10 && A.bottom <= B.top + 16 && A.velocity.y >= B.velocity.y - 1) {
          if (!carrier || B.top < carrier.sprite.body.top) carrier = other;
        }
      }
      if (!carrier) continue;
      // Adjust the body only: Phaser copies the body's frame delta onto the sprite in postupdate.
      const B = carrier.sprite.body;
      A.y -= A.bottom - B.top; A.x += B.deltaX();
      A.velocity.y = Math.min(A.velocity.y, Math.max(0, B.velocity.y));
      rider.standingOn = carrier.id; rider.onRobot = true;
    }
    const charging = this.scene.charging;
    if (charging) {
      const pusher = this.get(charging), P = pusher.sprite.body;
      for (const other of this.robots) {
        if (other === pusher || other.standingOn === pusher.id) continue;
        const O = other.sprite.body;
        if (O.right > P.left && O.left < P.right && O.bottom > P.top + 8 && O.top < P.bottom - 8) { other.sprite.setVelocity(P.velocity.x, -140); other.standingOn = null; other.onRobot = false; }
      }
    }
  }
  switchTo(index, { silent } = {}) {
    const target = this.robots[index];
    if (!target || index === this.active) return false;
    const now = this.scene.clock ?? 0;
    if (now < target.dazedUntil) { this.hooks.toast?.(`${target.spec.name} needs a second to recover.`, 1500); return false; }
    if (now < target.recallUntil) { this.scene.tweens.killTweensOf(target.sprite); target.sprite.setAlpha(1); target.recallUntil = 0; }
    if (target.job === 'wait') this.unpark(target);
    const previous = this.robots[this.active];
    if (previous) { previous.state = previous.job ? 'parked' : 'follow'; previous.stuckSince = now; }
    this.active = index; target.state = 'active';
    this.robots.forEach(robot => robot.sprite.setDepth(robot === target ? 11 : 10));
    this.scene.cameras.main.startFollow(target.sprite, true, .09, .12, -180, 100);
    if (!silent) {
      this.hooks.burst?.(target.sprite.x, target.sprite.y, Phaser.Display.Color.HexStringToColor(target.spec.color).color, 14);
      this.hooks.tone?.(350 + index * 100); this.hooks.toast?.(`${target.spec.name} · ${target.spec.ability}`, 1700);
    }
    this.hooks.onSwitch?.(target, previous);
    return true;
  }
  park(robot, job) { robot.job = job; if (robot.state !== 'active') robot.state = 'parked'; robot.sprite.setAccelerationX(0); robot.sprite.setVelocityX(0); }
  unpark(robot) { robot.job = null; robot.sprite.setDragX(robot.spec.drag); if (robot.state !== 'active') robot.state = 'follow'; }
  bodies() { return [...this.robots.map(robot => ({ id: robot.id, standingOn: robot.standingOn })), ...this.extraBodies()]; }
  stackMassOn(id) { return stackMass({ id }, this.bodies()); }
  animate(robot, onFloor) {
    const p = robot.sprite;
    if (robot.job === 'bridge') { p.anims.stop(); p.setFrame(12); return; }
    if (!onFloor) { p.anims.stop(); p.setFrame(9); }
    else if (Math.abs(p.body.velocity.x) > 20) p.play(`${robot.id}-run`, true);
    else { p.anims.stop(); p.setFrame(8); }
  }

  // Player-controlled robot: buffered jumps, coyote time, variable height, Voxxy's second jump.
  updateActive(input) {
    const robot = this.robot, spec = robot.spec, p = robot.sprite, now = this.scene.clock;
    const onFloor = this.onFloor(p);
    if (onFloor) { robot.lastGrounded = now; robot.jumps = 0; }
    if (robot.job) {
      const wants = input.left || input.right || input.jump;
      if (!wants || !(this.hooks.tryUnpark?.(robot) ?? true)) { p.setAccelerationX(0); robot.jumpWasDown = input.jump; return onFloor; }
    }
    if (input.jump && !robot.jumpWasDown) robot.jumpBuffer = now;
    if (now - robot.jumpBuffer < 125) {
      const grounded = onFloor || (now - robot.lastGrounded < 110 && robot.jumps === 0);
      const extraJump = robot.id === 'voxxy' && robot.jumps === 1;
      if (grounded || extraJump) {
        p.setVelocityY(-(grounded ? spec.jump : 530)); robot.jumps = grounded ? 1 : 2;
        robot.jumpBuffer = -1000; robot.lastGrounded = -1000; robot.standingOn = null; robot.onRobot = false;
        this.hooks.burst?.(p.x, p.y + 42, 0xc5c3a2, grounded ? 6 : 12); this.hooks.tone?.(grounded ? 320 : 490, .07);
      }
    }
    // Releasing jump early produces a shorter, controllable hop.
    if (!input.jump && robot.jumpWasDown && p.body.velocity.y < -200) p.setVelocityY(p.body.velocity.y * .52);
    robot.jumpWasDown = input.jump;
    const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
    if (direction) robot.facing = direction;
    if (input.charging) { p.setAccelerationX(0); p.setVelocityX(robot.facing * input.chargeSpeed); p.anims.stop(); p.setFrame(11); }
    else {
      p.setAccelerationX(direction * spec.acceleration);
      if (Math.abs(p.body.velocity.x) > spec.speed) p.setVelocityX(Math.sign(p.body.velocity.x) * spec.speed);
      this.animate(robot, onFloor);
    }
    p.setFlipX(robot.facing < 0);
    return onFloor;
  }
  tileAt(x, y) { return this.scene.map.getTileAtWorldXY(x, y, false, this.scene.cameras.main, this.scene.floorLayer)?.collides ?? false; }
  updateFollower(robot, now) {
    const leader = this.player, p = robot.sprite, spec = robot.spec;
    const onFloor = this.onFloor(p);
    const toward = Math.sign(leader.x - p.x) || robot.facing;
    const probeX = p.x + toward * (spec.width / 2 + 10);
    const wallTile = this.scene.map.getTileAtWorldXY(probeX, p.body.bottom - 24, false, this.scene.cameras.main, this.scene.floorLayer);
    const crateAhead = this.scene.physics.overlapRect(probeX - 4, p.body.bottom - 40, 8, 36, true, true).some(body => ['crate', 'case'].includes(body.gameObject?.texture?.key));
    const wallAhead = Boolean(wallTile?.collides) || crateAhead;
    const gapAhead = onFloor && !this.tileAt(probeX + toward * 16, p.body.bottom + 8) && !this.tileAt(probeX + toward * 16, p.body.bottom + 56);
    // Room to land on top of whatever is in the way: two free tiles above the obstacle.
    const obstacleTop = wallTile?.collides ? wallTile.pixelY : p.body.bottom - 84;
    const freeAbove = !this.tileAt(probeX, obstacleTop - 24) && !this.tileAt(probeX, obstacleTop - 72);
    const carrying = this.robot.standingOn === robot.id;
    const decision = followDecision({ follower: { x: p.x, y: p.body.bottom }, leader: { x: leader.x, y: leader.body.bottom }, blockedAhead: wallAhead || gapAhead, freeAbove, onFloor, leaderGrounded: this.onFloor(leader) });
    const direction = carrying ? 0 : decision.direction, jump = decision.jump && !carrying;
    if (direction) robot.facing = direction;
    p.setAccelerationX(direction * spec.acceleration);
    if (!direction && onFloor) p.setVelocityX(p.body.velocity.x * .8);
    if (Math.abs(p.body.velocity.x) > spec.speed) p.setVelocityX(Math.sign(p.body.velocity.x) * spec.speed);
    if (jump) { p.setVelocityY(-spec.jump); robot.standingOn = null; }
    const progressing = !direction || Math.abs(p.body.velocity.x) > 12 || !onFloor;
    if (progressing) robot.stuckSince = now;
    this.animate(robot, onFloor); p.setFlipX(robot.facing < 0);
  }
  recall(robot) {
    const now = this.scene.clock, s = robot.sprite;
    robot.recallUntil = now + 520; robot.stuckSince = now; robot.standingOn = null;
    s.setVelocity(0, 0); s.setAccelerationX(0);
    // Place immediately (the game state never waits on a tween); the fade-in is only cosmetic.
    this.hooks.burst?.(s.x, s.y, 0x9ad7df, 8);
    this.placeBehindLeader(robot); s.setAlpha(0);
    this.scene.tweens.add({ targets: s, alpha: 1, duration: 320 });
  }
  placeBehindLeader(robot) {
    const leader = this.player, s = robot.sprite;
    const x = Phaser.Math.Clamp(leader.x - this.robot.facing * (leader.body.halfWidth + robot.spec.width / 2 + 14), robot.spec.width / 2 + 2, this.width - robot.spec.width / 2 - 2);
    s.body.reset(x, leader.body.bottom - FEET); robot.standingOn = null;
    this.hooks.burst?.(x, s.y, 0x9ad7df, 10); this.hooks.tone?.(520, .08);
  }
  update() {
    const now = this.scene.clock;
    for (const robot of this.robots) {
      const vy = robot.sprite.body.velocity.y;
      if (this.onFloor(robot.sprite)) robot.fallSpeed = 0; else if (vy > 0) robot.fallSpeed = Math.max(robot.fallSpeed ?? 0, vy);
    }
    for (const robot of this.robots) {
      if (robot.state === 'active' || now < robot.recallUntil) continue;
      if (robot.job) {
        const grounded = this.onFloor(robot.sprite), distance = Math.abs(this.player.x - robot.sprite.x);
        robot.sprite.setAccelerationX(0); if (robot.job === 'wait' && grounded) robot.sprite.setDragX(robot.spec.drag);
        this.animate(robot, grounded); robot.sprite.setFlipX(robot.facing < 0);
        // A launched robot rejoins once the leader has moved on; an abandoned bridge stands up so recall can fetch Droid.
        if (robot.job === 'wait' && grounded && (distance < 200 || distance > 1900)) this.unpark(robot);
        // A launched Voxxy flaps once at the top of her arc, the way a player would.
        if (robot.job === 'wait' && !grounded && robot.id === 'voxxy' && robot.jumps === 1 && robot.sprite.body.velocity.y > -45) { robot.sprite.setVelocityY(-530); robot.jumps = 2; this.hooks.burst?.(robot.sprite.x, robot.sprite.y + 42, 0xc5c3a2, 10); this.hooks.tone?.(490, .07); }
        else if (robot.job === 'bridge' && distance > 1200) this.hooks.abandonBridge?.(robot);
        continue;
      }
      this.updateFollower(robot, now);
      if (shouldRecall({ follower: { x: robot.sprite.x, y: robot.sprite.y, state: robot.state, stuckSince: robot.stuckSince }, leader: { x: this.player.x }, levelHeight: HEIGHT, now })) this.recall(robot);
    }
  }
  respawnAll(point) {
    let offset = 0;
    for (const robot of this.robots) {
      const s = robot.sprite;
      const x = robot.state === 'active' ? point.x : point.x - (++offset) * 60;
      s.body.reset(Math.max(robot.spec.width / 2 + 2, x), point.y); s.setAcceleration(0, 0); s.setVelocity(0, 0); s.setAlpha(1);
      robot.jumps = 0; robot.jumpBuffer = -1000; robot.lastGrounded = -1000; robot.standingOn = null; robot.stuckSince = this.scene.clock;
      robot.recallUntil = 0; robot.dazedUntil = 0; robot.job = null; if (robot.state !== 'active') robot.state = 'follow';
      this.scene.tweens.killTweensOf(s);
    }
    this.hooks.onRespawn?.();
  }
}
