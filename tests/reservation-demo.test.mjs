import assert from 'node:assert/strict';
import test from 'node:test';
import { canReserve } from '../src/scripts/home/reservationRules.ts';

test('the illustrated reservation accepts sufficient inventory and blocks missing units', () => {
  assert.equal(canReserve(8, 3), true);
  assert.equal(canReserve(3, 3), true);
  assert.equal(canReserve(0, 3), false);
  assert.equal(canReserve(2, 3), false);
});

test('the demonstration cannot approve invalid quantities or invalid inventory', () => {
  for (const [stock, quantity] of [[8,0],[8,-1],[-1,3],[NaN,3],[8,Infinity],[8,1.5]]) {
    assert.equal(canReserve(stock, quantity), false);
  }
});
