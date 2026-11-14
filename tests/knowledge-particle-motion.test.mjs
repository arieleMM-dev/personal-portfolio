import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceParticleOffset } from '../src/scripts/home/knowledgeParticleMotion.ts';

test('only nearby particles repel away from the cursor and stay bounded', () => {
  const nearby={x:0,y:0,vx:0,vy:0},far={x:0,y:0,vx:0,vy:0};
  for(let i=0;i<120;i++){
    advanceParticleOffset(nearby,20,10,100,56,1/60);
    advanceParticleOffset(far,120,0,100,56,1/60);
  }
  assert.ok(nearby.x>10&&nearby.y>5);
  assert.ok(Math.hypot(nearby.x,nearby.y)<56);
  assert.deepEqual(far,{x:0,y:0,vx:0,vy:0});
});

test('the displaced particle returns smoothly and a stalled frame cannot destabilize the spring', () => {
  const particle={x:35,y:-20,vx:12,vy:-10};
  advanceParticleOffset(particle,999,999,100,56,10);
  assert.ok(Object.values(particle).every(Number.isFinite));
  for(let i=0;i<240;i++)advanceParticleOffset(particle,999,999,100,56,1/60);
  assert.ok(Math.hypot(particle.x,particle.y)<.001);
  assert.ok(Math.hypot(particle.vx,particle.vy)<.001);
});
