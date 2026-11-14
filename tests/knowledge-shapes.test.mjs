import assert from 'node:assert/strict';
import test from 'node:test';
import { getKnowledgePoint, getKnowledgeColor } from '../src/scripts/home/knowledgeShapes.ts';

test('laptop, mobile and infrastructure have stable 3D correspondence and distinct silhouettes', () => {
  const count = 1920;
  const shapes = [0,1,2].map(shape => Array.from({length:count},(_,i)=>getKnowledgePoint(shape,i,count)));
  shapes.forEach((points,shape) => {
    assert.equal(points.length,count);
    assert.ok(points.every(point=>point.length===3));
    assert.ok(points.flat().every(n=>Number.isFinite(n)&&Math.abs(n)<1));
    assert.ok(new Set(points.map(p=>p.join(','))).size>count*.9);
    assert.deepEqual(points,Array.from({length:count},(_,i)=>getKnowledgePoint(shape,i,count)));
    for(let i=0;i<count;i++)assert.match(getKnowledgeColor(shape,i,count),/^#[\da-f]{6}$/i);
  });
  assert.notDeepEqual(shapes[0],shapes[1]);assert.notDeepEqual(shapes[1],shapes[2]);
});
