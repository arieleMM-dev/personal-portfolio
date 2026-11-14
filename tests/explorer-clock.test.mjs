import test from 'node:test';
import assert from 'node:assert/strict';
import { createExplorerClock, EXPLORER_DURATION } from '../src/scripts/home/explorerClock.ts';

test('the visible countdown and the four process phases share the same active clock', () => {
  const clock = createExplorerClock();
  assert.deepEqual(clock.state(),{index:0,progress:0,phase:0});
  clock.advance(EXPLORER_DURATION/2);
  assert.deepEqual(clock.state(),{index:0,progress:.5,phase:2});
  clock.advance(EXPLORER_DURATION/2);
  assert.deepEqual(clock.state(),{index:1,progress:0,phase:0});
  clock.advance(EXPLORER_DURATION*2+2250);
  assert.deepEqual(clock.state(),{index:0,progress:.25,phase:1});
});
test('pausing retains remaining time and selecting a stage restarts its countdown', () => {
  const clock=createExplorerClock();clock.advance(1234);const before=clock.state();
  clock.advance(60000,false);assert.deepEqual(clock.state(),before);
  clock.advance(NaN);clock.advance(-10);assert.deepEqual(clock.state(),before);
  clock.select(2);assert.deepEqual(clock.state(),{index:2,progress:0,phase:0});
  clock.advance(EXPLORER_DURATION);assert.equal(clock.state().index,0);
  for(const args of [[0,9000],[1,0],[2,Infinity]])assert.throws(()=>createExplorerClock(...args),RangeError);
});
