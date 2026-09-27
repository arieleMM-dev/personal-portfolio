import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createMonolith, MONOLITH } from '../src/scripts/webgl/hero/monolith.ts';
import { createCircuitMaterial } from '../src/scripts/webgl/hero/circuitMaterial.ts';
import { createDistantPillars } from '../src/scripts/webgl/hero/distantPillars.ts';
import { createDataParticles, DATA_PARTICLES } from '../src/scripts/webgl/hero/particles.ts';

test('solid physical monolith floats above the water and breathes within a bounded range', () => {
  const monolith = createMonolith();
  const body = monolith.group.getObjectByName('circuit-monolith-body');
  assert.ok(body.material instanceof THREE.MeshPhysicalMaterial);
  assert.equal(body.material.transmission, 0);
  assert.ok(body.material.metalness > 0.7 && body.material.roughness < 0.25);
  for (let time = 0; time < 120; time += 0.5) {
    monolith.update(time);
    assert.ok(monolith.group.position.y - MONOLITH.height / 2 > 0.8);
    assert.ok(body.material.emissiveIntensity >= 2.15 && body.material.emissiveIntensity <= 3.25);
    assert.ok(Math.abs(monolith.group.position.y - MONOLITH.centerY) <= MONOLITH.floatAmplitude + 1e-10);
  }
});

test('procedural circuits preserve the physical shader and share a live time uniform', () => {
  const circuits = createCircuitMaterial();
  const shader = {
    vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    uniforms: {},
  };
  circuits.material.onBeforeCompile(shader, {});
  assert.ok(shader.vertexShader.includes('vCircuitPosition = position;'));
  assert.ok(shader.fragmentShader.includes('totalEmissiveRadiance *= circuitEmission(boardUV);'));
  assert.ok(shader.fragmentShader.includes('#include <lights_physical_pars_fragment>'));
  circuits.update(14);
  assert.equal(shader.uniforms.uCircuitTime.value, 14);
});

test('six sparse pillars stay behind and beside the monolith with restrained emission', () => {
  const pillars = createDistantPillars();
  const bodies = pillars.group.children.filter((child) => child.name.startsWith('data-pillar-'));
  assert.equal(bodies.length, 6);
  assert.equal(bodies.filter((body) => body.position.x < 0).length, 3);
  assert.ok(new Set(bodies.map((body) => body.scale.y)).size > 3);
  for (const body of bodies) {
    assert.ok(body.position.z <= -30 && Math.abs(body.position.x) >= 17);
  }
  pillars.update(12);
  assert.ok(bodies.every((body) => body.material.emissiveIntensity < 0.16));
  const windows = pillars.group.getObjectByName('distant-server-status-lights');
  assert.ok(windows instanceof THREE.InstancedMesh);
  assert.equal(windows.count, 42);
});

test('fireflies spawn at the water and animate on the GPU without position uploads', () => {
  const particles = createDataParticles(0.03);
  const { geometry, material } = particles.points;
  const positions = geometry.getAttribute('position');
  assert.equal(positions.count, DATA_PARTICLES.count);
  for (let index = 0; index < positions.count; index++) {
    assert.ok(Math.abs(positions.getY(index) - DATA_PARTICLES.birthY) < 1e-6);
  }
  const version = positions.version;
  particles.update(28);
  particles.setPixelRatio(1.25);
  assert.equal(material.uniforms.uTime.value, 28);
  assert.equal(material.uniforms.uPixelRatio.value, 1.25);
  assert.equal(positions.version, version);
  assert.ok(material.vertexShader.includes('float life = fract('));
  assert.ok(material.vertexShader.includes('1.0 - smoothstep(0.48, 1.0, life)'));
});
