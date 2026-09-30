import test from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../src/adventure/rules.js';
import { MASS, stackMass, plateHeld, gratingBreaks, springImpulse, pushSpeed, bridgeBuckles, launchImpulse, shouldRecall, followDecision } from '../src/adventure/rules.js';

test('masses match the spec', () => { assert.deepEqual(MASS, { voxxy: 1, droid: 2, biggy: 5, case: 3 }); });
test('stack mass sums the chain of robots standing on a base', () => {
  const bodies = [{ id: 'droid', standingOn: 'plate' }, { id: 'voxxy', standingOn: 'droid' }, { id: 'biggy', standingOn: null }];
  assert.equal(stackMass({ id: 'plate' }, bodies), 3);
  assert.equal(stackMass({ id: 'droid' }, bodies), 1);
  assert.equal(stackMass({ id: 'biggy' }, bodies), 0);
});
test('a case counts as mass 3 on a plate', () => { assert.equal(stackMass({ id: 'plate' }, [{ id: 'case', standingOn: 'plate' }]), 3); });
test('bodies may carry an explicit mass, and robots can stand on them', () => {
  const bodies = [{ id: 'case-0', mass: 3, standingOn: 'plate' }, { id: 'voxxy', standingOn: 'case-0' }];
  assert.equal(stackMass({ id: 'plate' }, bodies), 4);
});
test('plates, gratings and bridges read thresholds', () => {
  assert.equal(plateHeld(3, 3), true); assert.equal(plateHeld(2, 3), false); assert.equal(plateHeld(5, 5), true);
  assert.equal(gratingBreaks(5), true); assert.equal(gratingBreaks(3), false);
  assert.equal(bridgeBuckles(5), true); assert.equal(bridgeBuckles(4), false);
});
test('springs launch lighter robots higher, about five tiles for Voxxy', () => {
  assert.equal(springImpulse(1), -850); assert.equal(springImpulse(2), -425); assert.equal(springImpulse(5), -170);
  assert.ok(850 * 850 / (2 * 1500) < 250, 'Voxxy stays under the level ceiling');
});
test('push speed depends on mass and charging', () => {
  assert.equal(pushSpeed(1, false), 0); assert.equal(pushSpeed(2, false), 60); assert.equal(pushSpeed(5, false), 150); assert.equal(pushSpeed(5, true), 510);
});
test('launch impulse throws Voxxy farther than Droid', () => {
  assert.deepEqual(launchImpulse('voxxy', 1), { vx: 560, vy: -640 });
  assert.deepEqual(launchImpulse('droid', -1), { vx: -280, vy: -640 });
  assert.equal(launchImpulse('biggy', 1), null);
});
test('followers are recalled when far behind, fallen or stuck, never when parked', () => {
  const base = { leader: { x: 3000 }, levelHeight: 768, now: 10000 };
  assert.equal(shouldRecall({ ...base, follower: { x: 1000, y: 600, state: 'follow', stuckSince: 10000 } }), true);
  assert.equal(shouldRecall({ ...base, follower: { x: 2900, y: 900, state: 'follow', stuckSince: 10000 } }), true);
  assert.equal(shouldRecall({ ...base, follower: { x: 2900, y: 600, state: 'follow', stuckSince: 6000 } }), true);
  assert.equal(shouldRecall({ ...base, follower: { x: 2900, y: 600, state: 'follow', stuckSince: 9000 } }), false);
  assert.equal(shouldRecall({ ...base, follower: { x: 100, y: 900, state: 'parked', stuckSince: 0 } }), false);
});
test('follow decision walks toward the leader and jumps over obstacles', () => {
  assert.deepEqual(followDecision({ follower: { x: 100, y: 600 }, leader: { x: 400, y: 600 }, blockedAhead: false, freeAbove: true, onFloor: true }), { direction: 1, jump: false });
  assert.deepEqual(followDecision({ follower: { x: 450, y: 600 }, leader: { x: 400, y: 600 }, blockedAhead: false, freeAbove: true, onFloor: true }), { direction: 0, jump: false });
  assert.deepEqual(followDecision({ follower: { x: 100, y: 600 }, leader: { x: 400, y: 600 }, blockedAhead: true, freeAbove: true, onFloor: true }), { direction: 1, jump: true });
  assert.deepEqual(followDecision({ follower: { x: 340, y: 600 }, leader: { x: 400, y: 500 }, blockedAhead: false, freeAbove: true, onFloor: true }), { direction: 0, jump: true });
  assert.deepEqual(followDecision({ follower: { x: 100, y: 600 }, leader: { x: 400, y: 600 }, blockedAhead: true, freeAbove: true, onFloor: false }), { direction: 1, jump: false });
});
test('followers wait under an airborne leader instead of jumping into it', () => {
  const base = { blockedAhead: false, freeAbove: true, onFloor: true };
  assert.deepEqual(followDecision({ ...base, follower: { x: 400, y: 600 }, leader: { x: 400, y: 500 }, leaderGrounded: false }), { direction: 0, jump: false });
  assert.deepEqual(followDecision({ ...base, follower: { x: 410, y: 600 }, leader: { x: 400, y: 500 }, leaderGrounded: true }), { direction: 0, jump: false });
  assert.deepEqual(followDecision({ ...base, follower: { x: 340, y: 600 }, leader: { x: 400, y: 500 }, leaderGrounded: true }), { direction: 0, jump: true });
});
test('a sentry bolt knocks light robots back much farther than Biggy', () => {
  const { boltKnockback } = rules;
  assert.deepEqual(boltKnockback(1, 1), { vx: 420, vy: -300 });
  assert.deepEqual(boltKnockback(5, -1), { vx: -84, vy: -120 });
  assert.equal(boltKnockback(5, 1).vx, 420 / 5);
});
