// The simulation has no DOM, clock, randomness, or rendering dependencies.
// Recorded inputs are executed at exactly 60 ticks per second.
export const HZ = 60;
export const DT = 1 / HZ;
export const DURATION = 18;
export const TICKS = HZ * DURATION;
export const INPUT = Object.freeze({ UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8, ACTION: 16 });
export const ROBOTS = Object.freeze([
  { name: 'Biggy', color: '#dda274', x: 515, y: 577, radius: 20, speed: 128, acceleration: 170, drag: 3.5, target: { x: 332, y: 373 }, job: 'Reach the orange pressure pad in Zaal 2. Press E to brace and hold the keynote door open.' },
  { name: 'Droid', color: '#8dc5dc', x: 566, y: 577, radius: 14, speed: 155, acceleration: 490, drag: 10, target: { x: 797, y: 365 }, job: 'Reach the blue panel in Zaal 11. Press E to connect and supply power to the projector.' },
  { name: 'Voxxy', color: '#ff9658', x: 612, y: 577, radius: 13, speed: 205, acceleration: 920, drag: 13, target: { x: 309, y: 134 }, job: 'Enter Zaal 1 through Biggy’s open door. Reach the projector and press E. Droid must be connected.' },
]);
export const ROOMS = Object.freeze([
  { x: 220, y: 75, w: 250, h: 190, name: 'ZAAL 1', sub: 'THE KEYNOTE', side: 'left' },
  { x: 220, y: 285, w: 250, h: 210, name: 'ZAAL 2', sub: 'BACKUP SYSTEMS', side: 'left' },
  { x: 650, y: 75, w: 285, h: 190, name: 'ZAAL 12', sub: 'STANDBY', side: 'right' },
  { x: 650, y: 285, w: 285, h: 210, name: 'ZAAL 11', sub: 'POWER CONTROL', side: 'right' },
]);
export const FLOORS = Object.freeze([
  { x: 480, y: 65, w: 145, h: 530 },
  { x: 270, y: 530, w: 575, h: 115 },
  ...ROOMS,
  { x: 455, y: 143, w: 40, h: 76 },
  { x: 455, y: 347, w: 40, h: 96 },
  { x: 615, y: 143, w: 45, h: 76 },
  { x: 615, y: 347, w: 45, h: 96 },
]);
export const GATE = Object.freeze({ x: 468, y: 143, w: 14, h: 76 });
// Solid seat banks keep the navigable space consistent with what is drawn.
export const SEATS = Object.freeze([
  { x: 250, y: 208, w: 157, h: 29 },
  { x: 250, y: 440, w: 157, h: 29 },
  { x: 686, y: 110, w: 200, h: 29 },
  { x: 686, y: 213, w: 200, h: 29 },
  { x: 686, y: 439, w: 200, h: 29 },
]);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function intersects(x, y, radius, rect) {
  return Math.hypot(x - clamp(x, rect.x, rect.x + rect.w), y - clamp(y, rect.y, rect.y + rect.h)) < radius;
}
export function canOccupy(x, y, radius, gateOpen) {
  for (let n = 0; n < 16; n++) {
    const angle = n * Math.PI / 8;
    if (!FLOORS.some(r => inRect(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, r))) return false;
  }
  if (SEATS.some(r => intersects(x, y, radius, r))) return false;
  return gateOpen || !intersects(x, y, radius, GATE);
}
export function createWorld() {
  return {
    tick: 0, door: false, power: false, charge: 0, won: false, events: [],
    robots: ROBOTS.map(r => ({ x: r.x, y: r.y, vx: 0, vy: 0, docked: false, distance: 0, trail: [] })),
  };
}
export function stepWorld(world, commands = []) {
  if (world.won) return world;
  world.events = [];
  for (let i = 0; i < ROBOTS.length; i++) {
    const spec = ROBOTS[i];
    const p = world.robots[i];
    const input = commands[i] || 0;
    let dx = Number(Boolean(input & INPUT.RIGHT)) - Number(Boolean(input & INPUT.LEFT));
    let dy = Number(Boolean(input & INPUT.DOWN)) - Number(Boolean(input & INPUT.UP));
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      p.docked = false;
      const length = Math.hypot(dx, dy);
      dx /= length; dy /= length;
      const differenceX = dx * spec.speed - p.vx;
      const differenceY = dy * spec.speed - p.vy;
      const difference = Math.hypot(differenceX, differenceY);
      const rate = Math.min(1, spec.acceleration * DT / (difference || 1));
      p.vx += differenceX * rate;
      p.vy += differenceY * rate;
    } else {
      p.vx *= Math.exp(-spec.drag * DT);
      p.vy *= Math.exp(-spec.drag * DT);
      if (Math.hypot(p.vx, p.vy) < .15) p.vx = p.vy = 0;
    }
    const oldX = p.x, oldY = p.y;
    if (canOccupy(p.x + p.vx * DT, p.y, spec.radius, world.door)) p.x += p.vx * DT;
    else p.vx = 0;
    if (canOccupy(p.x, p.y + p.vy * DT, spec.radius, world.door)) p.y += p.vy * DT;
    else p.vy = 0;
    p.distance += Math.hypot(p.x - oldX, p.y - oldY);
    if (world.tick % 6 === 0 && Math.hypot(p.x - oldX, p.y - oldY) > .1) p.trail.push({ x: p.x, y: p.y });
    if (input & INPUT.ACTION) {
      const near = Math.hypot(p.x - spec.target.x, p.y - spec.target.y) <= 43;
      if (!near) world.events.push({ robot: i, text: `Get closer to ${i === 0 ? 'the orange pad' : i === 1 ? 'the blue panel' : 'the projector'} to interact.` });
      else if (Math.hypot(p.vx, p.vy) > 45) world.events.push({ robot: i, text: 'Let go of movement and slow down before connecting.' });
      else {
        p.docked = !p.docked;
        p.vx = p.vy = 0;
        world.events.push({ robot: i, text: p.docked ? `${spec.name} is in position. Save the take with R.` : `${spec.name} disconnected.` });
      }
    }
  }
  // If power is lost with a robot in the doorway, the safety sensor holds it open.
  const occupied = world.robots.some((p, i) => intersects(p.x, p.y, ROBOTS[i].radius + 2, GATE));
  world.door = world.robots[0].docked || occupied;
  world.power = world.robots[1].docked;
  const allReady = world.robots.every(p => p.docked);
  world.charge = allReady ? Math.min(1, world.charge + DT / 1.2) : 0;
  world.won = world.charge >= 1;
  world.tick++;
  return world;
}

export class Session {
  constructor() {
    this.selected = 0;
    this.tracks = [null, null, null];
    this.mode = 'plan';
    this.world = createWorld();
    this.draft = [];
    this.lastResult = null;
  }
  select(index) {
    if (this.mode !== 'plan' || index < 0 || index > 2) return false;
    this.selected = index;
    this.world = createWorld();
    return true;
  }
  record() {
    if (this.mode !== 'plan') return false;
    this.mode = 'record';
    this.world = createWorld();
    this.draft = [];
    this.lastResult = null;
    return true;
  }
  save() {
    if (this.mode !== 'record' || !this.draft.length) return false;
    this.tracks[this.selected] = [...this.draft];
    this.mode = 'plan';
    return true;
  }
  play() {
    if (this.mode !== 'plan' || !this.tracks.every(Boolean)) return false;
    this.mode = 'play';
    this.world = createWorld();
    this.lastResult = null;
    return true;
  }
  stop() {
    this.mode = 'plan';
    this.world = createWorld();
    this.draft = [];
  }
  clear() {
    this.tracks = [null, null, null];
    this.stop();
    this.lastResult = null;
  }
  step(input = 0) {
    if (this.mode !== 'record' && this.mode !== 'play') return;
    const tick = this.world.tick;
    const commands = this.tracks.map(track => track?.[tick] || 0);
    if (this.mode === 'record') {
      commands[this.selected] = input;
      this.draft.push(input);
    }
    stepWorld(this.world, commands);
    // Win only after running the complete shared plan, never during rehearsal.
    if (this.mode === 'record') {
      if (this.world.won || this.world.tick >= TICKS) this.save();
    } else if (this.world.won || this.world.tick >= TICKS) {
      this.lastResult = { won: this.world.won, time: this.world.tick / HZ };
      this.mode = 'finished';
    }
  }
}
