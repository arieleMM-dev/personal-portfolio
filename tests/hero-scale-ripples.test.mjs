import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createScaleRipples, SCALE_RIPPLE, SCALE_RIPPLE_GLSL } from '../src/scripts/webgl/hero/scaleRipples.ts';
import { createVideoCube, VIDEO_CUBE } from '../src/scripts/webgl/hero/videoCube.ts';

function seededRandom(seed = 71) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('local scale waves have randomized rests, bounded strength and visible, orthogonal face frames', () => {
  const waves = createScaleRipples(3.2, 20, seededRandom());
  const eye = new THREE.Vector3(15, 8, 20);
  const u = waves.uniforms;
  const events = [];
  for (let step = 0; step < 120 * 60; step++) {
    waves.update(step / 60, eye);
    if (waves.active && events.at(-1)?.start !== u.uRippleStart.value) {
      const n = u.uRippleNormal.value;
      const d = u.uRippleDirection.value;
      assert.ok(n.dot(eye.clone().normalize()) > 0.24);
      assert.ok(Math.abs(n.dot(d)) < 1e-12);
      assert.ok(Math.abs(d.length() - 1) < 1e-12);
      assert.ok(Math.abs(u.uRippleOrigin.value.dot(n) - 1.52) < 1e-12);
      assert.ok(u.uRippleAmplitude.value >= SCALE_RIPPLE.amplitudeMin && u.uRippleAmplitude.value <= SCALE_RIPPLE.amplitudeMax);
      assert.ok(u.uRippleDuration.value >= SCALE_RIPPLE.durationMin && u.uRippleDuration.value <= SCALE_RIPPLE.durationMax);
      events.push({ start: u.uRippleStart.value, duration: u.uRippleDuration.value, face: n.toArray().join(',') });
    }
  }
  assert.ok(events.length >= 9 && events.length <= 16);
  assert.ok(new Set(events.map((event) => event.face)).size >= 2);
  for (let i = 1; i < events.length; i++) {
    const rest = events[i].start - events[i - 1].start - events[i - 1].duration;
    assert.ok(rest >= SCALE_RIPPLE.restMin - 1e-10 && rest <= SCALE_RIPPLE.restMax + 1e-10);
  }
  assert.ok(new Set(events.map((event) => event.duration.toFixed(3))).size > 5);
});

test('random wave scheduling is independent of the frame rate', () => {
  const schedules = [30, 60, 144].map((fps) => {
    const waves = createScaleRipples(3.2, 20, seededRandom());
    const eye = new THREE.Vector3(0, 0, 20);
    const events = [];
    for (let frame = 0; frame < 100 * fps; frame++) {
      waves.update(frame / fps, eye);
      if (waves.active && events.at(-1) !== waves.uniforms.uRippleStart.value) events.push(waves.uniforms.uRippleStart.value);
    }
    return events;
  });
  assert.deepEqual(schedules[0], schedules[1]);
  assert.deepEqual(schedules[1], schedules[2]);
});

test('reduced motion cancels a wave and re-enabling or jumping the clock never replays an old event', () => {
  const waves = createScaleRipples(3.2, 20, () => 0.5);
  const eye = new THREE.Vector3(0, 0, 20);
  for (let i = 0; i <= 300; i++) waves.update(i / 60, eye);
  assert.equal(waves.active, true);
  waves.update(5, eye, false);
  assert.equal(waves.active, false);
  assert.equal(waves.uniforms.uRippleAmplitude.value, 0);
  waves.update(5, eye, true);
  assert.equal(waves.active, false);
  for (let i = 301; i <= 540; i++) waves.update(i / 60, eye);
  assert.equal(waves.active, false);
  waves.update(100, eye);
  assert.equal(waves.active, false);
  waves.update(0, eye);
  assert.equal(waves.active, false);
});

// Numerical reference of scaleRipple's spatial/temporal envelope. Complements
// browser GLSL compilation; these checks do not execute a shader on the GPU.
function sample(center, progress) {
  const smooth = THREE.MathUtils.smoothstep;
  const face = 1 - smooth(Math.abs(center.z - 1.52), 0.016, 0.08);
  const patch = 1 - smooth(Math.hypot(center.x, center.y), 1.4 * 0.62, 1.4);
  const envelope = smooth(progress, 0, 0.16) * (1 - smooth(progress, 0.78, 1));
  const q = (center.x - THREE.MathUtils.lerp(-1.95, 1.95, progress)) / 0.32;
  const crest = Math.exp(-q * q * 1.3);
  return (crest - 0.18 * Math.exp(-((q + 1.5) ** 2) * 1.6)) * face * patch * envelope;
}

test('a smooth crest travels across a finite face patch, followed by a small recoil and exact rest', () => {
  const left = new THREE.Vector3(-0.5, 0, 1.52);
  const right = new THREE.Vector3(0.5, 0, 1.52);
  assert.ok(sample(left, 0.35) > 0.8);
  assert.ok(sample(right, 0.65) > 0.8);
  assert.ok(Math.abs(sample(right, 0.35)) < 0.01);
  assert.ok(Math.abs(sample(left, 0.65)) < 0.01);
  assert.ok(sample(left, 0.51) < 0); // Following recoil, not a global pulse.
  for (let progress = 0; progress <= 1; progress += 0.01) {
    assert.equal(Math.abs(sample(new THREE.Vector3(0, 0, -1.52), progress)), 0);
    assert.equal(Math.abs(sample(new THREE.Vector3(0, 1.5, 1.52), progress)), 0);
    assert.ok(Math.abs(sample(left, progress)) <= 1);
  }
  for (const point of [left, right, new THREE.Vector3(0, 0, 1.52)]) {
    assert.equal(Math.abs(sample(point, 0)), 0);
    assert.equal(Math.abs(sample(point, 1)), 0);
    assert.ok(Math.abs(sample(point, 0.0001)) < 1e-6);
    assert.ok(Math.abs(sample(point, 0.9999)) < 1e-6);
  }
  assert.ok(SCALE_RIPPLE_GLSL.includes('crest - 0.18 * exp(-tail * tail * 1.6)'));
});

test('wave motion updates uniforms only; normals rotate while video UVs remain in rest space', () => {
  const cube = createVideoCube(new THREE.Texture(), seededRandom());
  const shader = { ...THREE.ShaderLib.physical, uniforms: {} };
  cube.projection.material.onBeforeCompile(shader, {});
  const matrixVersion = cube.voxels.instanceMatrix.version;
  const positionVersion = cube.voxels.geometry.attributes.position.version;
  const normalVersion = cube.voxels.geometry.attributes.normal.version;
  let sawWave = false;
  for (let step = 0; step < 1200; step++) {
    cube.update(step / 60);
    sawWave ||= cube.ripples.active;
  }
  assert.ok(sawWave);
  assert.equal(cube.voxels.instanceMatrix.version, matrixVersion);
  assert.equal(cube.voxels.geometry.attributes.position.version, positionVersion);
  assert.equal(cube.voxels.geometry.attributes.normal.version, normalVersion);
  assert.equal(shader.uniforms.uRippleTime, cube.ripples.uniforms.uRippleTime);
  assert.ok(shader.vertexShader.includes('objectNormal = rotateScale(objectNormal, rippleAxis, ripple.y)'));
  assert.ok(shader.vertexShader.includes('vProjectionNormal = normal;'));
  assert.ok(shader.vertexShader.indexOf('vRestPosition = cellCenter + position') < shader.vertexShader.indexOf('transformed = rotateScale'));
  assert.ok(shader.fragmentShader.includes('#include <transmission_fragment>'));
  assert.equal(VIDEO_CUBE.rotationSpeed, 0.04715);
  assert.ok(cube.voxels.boundingBox.max.x >= VIDEO_CUBE.size / 2 + 0.85 + SCALE_RIPPLE.amplitudeMax);
  cube.update(20, 0.5, true);
  assert.equal(cube.ripples.uniforms.uRippleAmplitude.value, 0);
});
