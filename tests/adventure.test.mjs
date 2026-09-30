import test from 'node:test';
import assert from 'node:assert/strict';
import { newProgress, grantCore, canFinish, loseLife } from '../src/adventure/level.js';

test('every robot has an essential mission item that other robots cannot unlock', () => {
  const roles = { power: 'biggy', relay: 'droid', lens: 'voxxy' };
  for (const [kind, correctRobot] of Object.entries(roles)) {
    for (const robot of Object.values(roles)) {
      const progress = newProgress();
      assert.equal(grantCore(progress, kind, robot), robot === correctRobot);
      assert.equal(progress.cores[kind], robot === correctRobot);
    }
  }
});
test('the final projector cannot finish with any essential item missing', () => {
  for (const missing of ['power', 'relay', 'lens']) {
    const progress = newProgress();
    for (const [kind, robot] of Object.entries({ power: 'biggy', relay: 'droid', lens: 'voxxy' })) if (kind !== missing) grantCore(progress, kind, robot);
    assert.equal(canFinish(progress), false);
  }
  const complete = newProgress();
  grantCore(complete, 'power', 'biggy'); grantCore(complete, 'relay', 'droid'); grantCore(complete, 'lens', 'voxxy');
  assert.equal(canFinish(complete), true);
  assert.equal(grantCore(complete, 'power', 'biggy'), false, 'A collected item cannot be awarded twice');
});
test('a new adventure does not inherit previous progress', () => {
  const oldRun = newProgress(); oldRun.cores.power = true; oldRun.coins = 25;
  const nextRun = newProgress(); assert.equal(nextRun.cores.power, false); assert.equal(nextRun.coins, 0);
});

test('a new run starts with three lives', () => {
  assert.equal(newProgress().lives, 3);
});
test('every respawn costs one life and reports game over only when none are left', () => {
  const progress = newProgress();
  assert.deepEqual(loseLife(progress), { gameOver: false, lives: 2 });
  assert.deepEqual(loseLife(progress), { gameOver: false, lives: 1 });
  assert.deepEqual(loseLife(progress), { gameOver: true, lives: 0 });
  assert.equal(progress.deaths, 3, 'Retries keep counting for the score');
  assert.deepEqual(loseLife(progress), { gameOver: true, lives: 0 }, 'Lives never go negative');
});
