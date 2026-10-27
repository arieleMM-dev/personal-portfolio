import assert from 'node:assert/strict';
import test from 'node:test';
import { getScrambleFrame } from '../src/scripts/textScramble.ts';

test('the search preserves character slots and resolves exact Spanish/English labels', () => {
  for (const label of ['inicio', 'sobre mí', 'CONOCIMIENTOS', 'Silenciar audio', 'Resume atmosphere', 'Español / English']) {
    const original = Array.from(label);
    for (const progress of [0, 0.1, 0.4, 0.7, 0.95]) {
      const frame = Array.from(getScrambleFrame(label, progress, () => 0.5));
      assert.equal(frame.length, original.length);
      original.forEach((character, index) => {
        if (!/\p{L}/u.test(character)) assert.equal(frame[index], character);
      });
    }
    assert.equal(getScrambleFrame(label, 1), label);
    assert.equal(getScrambleFrame(label, 2), label);
  }
});

test('only a small frontier searches at once, with already resolved letters intact', () => {
  const label = 'conocimientos';
  const frame = getScrambleFrame(label, 0.5, () => 0);
  assert.ok(frame.startsWith('cono'));
  assert.ok(frame.includes('\u00a0'), 'later characters retain space until their turn');
  const searching = Array.from(frame).filter((letter, index) => letter !== '\u00a0' && letter !== label[index]);
  assert.ok(searching.length > 0 && searching.length <= 3);
  assert.notEqual(getScrambleFrame('INICIO', 0, () => 0), getScrambleFrame('INICIO', 0, () => 0.9));
});
