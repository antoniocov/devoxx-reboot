import test from 'node:test';
import assert from 'node:assert/strict';
import { noteFrequency, TRACKS } from '../src/adventure/music.js';

test('note names map to equal-tempered frequencies', () => {
  assert.equal(noteFrequency('A4'), 440);
  assert.ok(Math.abs(noteFrequency('F#5') - 739.99) < .01); assert.ok(Math.abs(noteFrequency('Bb4') - 466.16) < .01);
  assert.ok(Math.abs(noteFrequency('C5') - 523.25) < .01);
  assert.ok(Math.abs(noteFrequency('E2') - 82.41) < .01);
  assert.equal(noteFrequency('nope'), 0);
});
test('every stage track has aligned channels and only valid tokens', () => {
  for (const [id, track] of Object.entries(TRACKS)) {
    const length = track.lead.length;
    assert.ok(length % 16 === 0, `${id}: lead length ${length} is not whole bars`);
    for (const channel of ['harmony', 'arp', 'bass', 'drums']) assert.equal(track[channel].length, length, `${id}: ${channel} length`);
    for (const channel of ['lead', 'harmony', 'arp', 'bass']) for (const token of track[channel]) assert.ok(token === '.' || token === '^' || noteFrequency(token) > 0, `${id}: bad token ${token}`);
    for (const token of track.drums) assert.ok(['.', 'k', 's', 'h'].includes(token), `${id}: bad drum ${token}`);
    assert.ok(track.bpm >= 150 && track.bpm <= 170, `${id}: tempo ${track.bpm}`);
    if (!track.once) assert.equal(length, 256, `${id}: stage tunes are 16 bars`);
  }
});
