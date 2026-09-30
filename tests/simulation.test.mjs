import test from 'node:test';
import assert from 'node:assert/strict';
import { Session, createWorld, stepWorld, ROBOTS, INPUT, TICKS, DT, canOccupy, GATE } from '../src/simulation.js';

function ticks(session, count, input = 0) {
  for (let i = 0; i < count; i++) session.step(input);
}
function driveAxis(session, axis, target) {
  const p = session.world.robots[session.selected];
  const spec = ROBOTS[session.selected];
  const velocity = axis === 'x' ? 'vx' : 'vy';
  const direction = Math.sign(target - p[axis]);
  const key = axis === 'x' ? (direction > 0 ? INPUT.RIGHT : INPUT.LEFT) : (direction > 0 ? INPUT.DOWN : INPUT.UP);
  let timeout = 650;
  // Account for the robot coasting after input is released.
  const coast = () => p[velocity] * DT / Math.expm1(spec.drag * DT);
  while (direction * (target - p[axis] - coast()) > 0 && timeout-- > 0 && session.mode === 'record') session.step(key);
  assert.ok(timeout > 0, `${spec.name} blocked on ${axis}, at ${p[axis]}, heading to ${target}`);
  ticks(session, Math.ceil(5 / spec.drag / DT));
  assert.ok(Math.abs(p[axis] - target) < 5, `${spec.name} stopped at ${p[axis]}, expected near ${target}`);
}
export function recordSolution() {
  const session = new Session();
  session.record();
  driveAxis(session, 'y', 373); driveAxis(session, 'x', 332);
  session.step(INPUT.ACTION); assert.equal(session.world.robots[0].docked, true); session.save();
  session.select(1); session.record();
  driveAxis(session, 'y', 373); driveAxis(session, 'x', 797);
  session.step(INPUT.ACTION); assert.equal(session.world.robots[1].docked, true); session.save();
  session.select(2); session.record();
  driveAxis(session, 'y', 181); driveAxis(session, 'x', 309); driveAxis(session, 'y', 134);
  session.step(INPUT.ACTION); assert.equal(session.world.robots[2].docked, true); session.save();
  return session;
}

test('a recorded three-robot solution wins and replays identically', () => {
  const session = recordSolution();
  assert.ok(session.play()); ticks(session, TICKS);
  assert.equal(session.lastResult.won, true);
  assert.ok(session.lastResult.time < 18);
  const final = JSON.stringify(session.world);
  session.stop(); session.play(); ticks(session, TICKS);
  assert.equal(JSON.stringify(session.world), final);
});
test('all three distinct roles are required to finish the mission', () => {
  const complete = recordSolution();
  for (let index = 0; index < 3; index++) {
    const session = new Session();
    session.tracks = complete.tracks.map((track, i) => i === index ? [0] : [...track]);
    assert.ok(session.play()); ticks(session, TICKS);
    assert.equal(session.lastResult.won, false, `Should not win without ${ROBOTS[index].name}`);
  }
});
test('closed doors, cinema walls and seat banks block movement', () => {
  assert.equal(canOccupy(GATE.x, 181, 13, false), false);
  assert.equal(canOccupy(GATE.x, 181, 13, true), true);
  assert.equal(canOccupy(440, 275, 13, true), false);
  assert.equal(canOccupy(280, 220, 13, true), false);
  const world = createWorld();
  for (let i = 0; i < 400; i++) stepWorld(world, [INPUT.LEFT, 0, 0]);
  assert.ok(world.robots[0].x >= 290);
});
test('Biggy accelerates more slowly and coasts farther than Voxxy', () => {
  const w = createWorld();
  for (let i = 0; i < 20; i++) stepWorld(w, [INPUT.UP, 0, INPUT.UP]);
  assert.ok(Math.abs(w.robots[0].vy) < Math.abs(w.robots[2].vy));
  w.robots[0].vy = w.robots[2].vy = -90;
  const positions = [w.robots[0].y, w.robots[2].y];
  for (let i = 0; i < 25; i++) stepWorld(w);
  assert.ok(positions[0] - w.robots[0].y > (positions[1] - w.robots[2].y) * 2);
});
test('interacting away from a station cannot activate it; movement disconnects', () => {
  const w = createWorld();
  stepWorld(w, [INPUT.ACTION, INPUT.ACTION, INPUT.ACTION]);
  assert.ok(w.robots.every(p => !p.docked));
  Object.assign(w.robots[0], ROBOTS[0].target);
  stepWorld(w, [INPUT.ACTION]); assert.equal(w.door, true);
  stepWorld(w, [INPUT.RIGHT]); assert.equal(w.robots[0].docked, false); assert.equal(w.door, false);
});
test('cancelling a replacement take preserves the previous recording', () => {
  const session = new Session();
  session.record(); ticks(session, 15, INPUT.UP); session.save();
  const original = [...session.tracks[0]];
  session.record(); ticks(session, 10, INPUT.DOWN); session.stop();
  assert.deepEqual(session.tracks[0], original);
  assert.equal(session.select(1), true);
  session.record(); assert.equal(session.select(2), false);
  assert.equal(session.play(), false);
});
test('recordings stop at 18 seconds and empty plans cannot run', () => {
  const session = new Session();
  assert.equal(session.play(), false);
  session.record(); ticks(session, TICKS + 60);
  assert.equal(session.mode, 'plan'); assert.equal(session.tracks[0].length, TICKS);
  session.clear(); assert.deepEqual(session.tracks, [null, null, null]);
});
