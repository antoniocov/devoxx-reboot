import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStage, TILE, ROBOTS } from '../src/adventure/level.js';
import { buildTiles } from '../src/adventure/stages/tiles.js';
import { STAGES } from '../src/adventure/stages/index.js';

test('robots carry the spec masses', () => {
  assert.deepEqual(ROBOTS.map(r => [r.id, r.mass]), [['voxxy', 1], ['droid', 2], ['biggy', 5]]);
});
test('buildTiles makes a 16-row map with floor, gaps, platforms and stairs', () => {
  const data = buildTiles(20, api => { api.floor(0, 19); api.gap(5, 6); api.platform(2, 11, 3); api.stairs(10, 15, 12); });
  assert.equal(data.length, 16); assert.ok(data.every(row => row.length === 20));
  assert.equal(data[13][0], 1); assert.equal(data[13][5], -1); assert.equal(data[11][2], 3); assert.equal(data[14][0], 0);
  assert.equal(data[12][10], 2); assert.equal(data[11][13], 2); assert.equal(data[12][13], 0);
});
test('every shipped stage validates', () => {
  for (const stage of STAGES) assert.deepEqual(validateStage(stage), [], stage.id);
});
test('validateStage reports a blocked spawn and a dangling plate target', () => {
  const stage = structuredClone(STAGES[0]);
  stage.data[12][Math.floor(stage.spawn.x / TILE)] = 0;
  stage.fixtures.plates.push({ id: 'p-x', x: 100, threshold: 3, target: 'missing-door' });
  const errors = validateStage(stage);
  assert.ok(errors.some(e => /spawn/i.test(e))); assert.ok(errors.some(e => /missing-door/.test(e)));
});
test('validateStage rejects a pocket only one tile high, which Droid and Biggy cannot pass', () => {
  const stage = structuredClone(STAGES[0]);
  const col = Math.floor(stage.spawn.x / TILE);
  stage.data[11][col] = 3; // a platform one row above the floor's headroom row
  const errors = validateStage(stage);
  assert.ok(errors.some(e => /headroom/i.test(e) && e.includes(`column ${col}`)), JSON.stringify(errors));
});
