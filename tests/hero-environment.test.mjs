import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createMonolith, MONOLITH } from '../src/scripts/webgl/hero/monolith.ts';
import { createCircuitMaterial } from '../src/scripts/webgl/hero/circuitMaterial.ts';
import { createCityscape, CITYSCAPE } from '../src/scripts/webgl/hero/cityscape.ts';
import { createOceanLighting } from '../src/scripts/webgl/hero/environment.ts';
import { HERO_PALETTE } from '../src/scripts/webgl/hero/palette.ts';
import { createDataParticles, DATA_PARTICLES } from '../src/scripts/webgl/hero/particles.ts';

test('standard obsidian monolith floats above the water and breathes within a bounded range', () => {
  const monolith = createMonolith();
  const body = monolith.group.getObjectByName('circuit-monolith-body');
  assert.ok(body.material instanceof THREE.MeshStandardMaterial);
  assert.ok(!(body.material instanceof THREE.MeshPhysicalMaterial));
  assert.equal(body.material.color.getHex(), HERO_PALETTE.obsidian);
  assert.equal(body.material.emissive.getHex(), HERO_PALETTE.circuit);
  assert.ok(body.material.metalness < 0.2 && body.material.roughness >= 0.3);
  for (let time = 0; time < 120; time += 0.5) {
    monolith.update(time);
    assert.ok(monolith.group.position.y - MONOLITH.height / 2 > 0.8);
    assert.ok(body.material.emissiveIntensity >= 2.15 && body.material.emissiveIntensity <= 3.25);
    assert.ok(Math.abs(monolith.group.position.y - MONOLITH.centerY) <= MONOLITH.floatAmplitude + 1e-10);
  }
});

test('procedural circuits mask the standard material emission without introducing another hue', () => {
  const circuits = createCircuitMaterial();
  const shader = {
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    uniforms: {},
  };
  circuits.material.onBeforeCompile(shader, {});
  assert.ok(shader.vertexShader.includes('vCircuitPosition = position;'));
  assert.ok(shader.fragmentShader.includes('totalEmissiveRadiance *= circuitEmission(boardUV);'));
  assert.ok(shader.fragmentShader.includes('float circuitEmission(vec2 uv)'));
  assert.ok(shader.fragmentShader.includes('#include <lights_physical_pars_fragment>'));
  circuits.update(14);
  assert.equal(shader.uniforms.uCircuitTime.value, 14);
});

test('distant city uses a single static instanced mesh with varied heights and reproducible transforms', () => {
  const city = createCityscape(new THREE.Color(HERO_PALETTE.fog));
  assert.ok(city instanceof THREE.InstancedMesh);
  assert.equal(city.count, CITYSCAPE.rows * CITYSCAPE.perRow);
  assert.equal(city.count, 84);
  assert.equal(city.instanceMatrix.usage, THREE.StaticDrawUsage);
  assert.ok(city.boundingSphere && city.boundingBox);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const heights = new Set();
  let left = 0;
  for (let index = 0; index < city.count; index++) {
    city.getMatrixAt(index, matrix);
    matrix.decompose(position, quaternion, scale);
    heights.add(Math.round(scale.y));
    if (position.x < 0) left++;
    assert.ok(position.z <= CITYSCAPE.nearZ && position.z > -300);
    assert.ok(scale.y >= 4 && scale.y <= 22);
    assert.ok(Math.abs(position.y - scale.y / 2 + 0.2) < 1e-5);
    // Even the closest/tallest buildings remain horizon-scale, not foreground blocks.
    assert.ok(scale.y / (18 - position.z) < 0.125);
  }
  assert.ok(heights.size > 12);
  assert.equal(left, city.count / 2);
  assert.deepEqual(city.instanceMatrix.array, createCityscape(new THREE.Color()).instanceMatrix.array);
});

test('city ground mist uses instanced world-space height while preserving distance fog', () => {
  const fogColor = new THREE.Color(HERO_PALETTE.fog);
  const city = createCityscape(fogColor);
  const shader = { ...THREE.ShaderLib.standard, uniforms: {} };
  city.material.onBeforeCompile(shader, {});
  assert.equal(shader.uniforms.uCityFogColor.value, fogColor);
  assert.ok(shader.vertexShader.includes('cityPosition = instanceMatrix * cityPosition;'));
  assert.ok(shader.fragmentShader.includes('#include <fog_fragment>'));
  assert.ok(shader.fragmentShader.includes('smoothstep(0.0, bankHeight, vCityWorldPosition.y)'));
  assert.ok(shader.fragmentShader.includes('groundMist * 0.98'));
});

test('the low cyan directional light and Water sun share the same angle and radiance', () => {
  const scene = new THREE.Scene();
  const lighting = createOceanLighting(scene);
  const ambient = scene.getObjectByName('dim-blue-ambient');
  assert.ok(ambient instanceof THREE.AmbientLight);
  assert.ok(ambient.intensity > 0 && ambient.intensity < 0.25);
  assert.ok(lighting.key instanceof THREE.DirectionalLight);
  assert.equal(lighting.key.target.position.y, 0);
  assert.equal(lighting.key.target.parent, scene);
  const direction = lighting.key.position.clone().sub(lighting.key.target.position).normalize();
  assert.ok(direction.distanceTo(lighting.sunDirection) < 1e-10);
  const elevation = THREE.MathUtils.radToDeg(Math.asin(direction.y));
  assert.ok(elevation > 5 && elevation < 12);
  assert.deepEqual(lighting.sunColor, lighting.key.color.clone().multiplyScalar(lighting.key.intensity * 0.6));
});

test('palette, monolith lights and materials contain only blue/cyan or neutral channels', () => {
  const colors = Object.entries(HERO_PALETTE)
    .filter(([key]) => key !== 'fogDensity').map(([, value]) => new THREE.Color(value));
  createMonolith().group.traverse((object) => {
    if (object instanceof THREE.Light) colors.push(object.color);
    if (object instanceof THREE.Mesh) colors.push(object.material.color, object.material.emissive);
  });
  for (const color of colors) {
    assert.ok(color.b >= color.g && color.g >= color.r, `non-blue color: ${color.getHexString()}`);
  }
});

test('fireflies spawn at the water and animate on the GPU without position uploads', () => {
  const particles = createDataParticles(HERO_PALETTE.fogDensity);
  const { geometry, material } = particles.points;
  assert.ok(material instanceof THREE.PointsMaterial);
  assert.equal(material.color.getHex(), 0x00aaff);
  assert.equal(material.depthWrite, false);
  assert.equal(material.blending, THREE.AdditiveBlending);
  const shader = { ...THREE.ShaderLib.points, uniforms: {} };
  material.onBeforeCompile(shader, {});
  const positions = geometry.getAttribute('position');
  assert.equal(positions.count, DATA_PARTICLES.count);
  for (let index = 0; index < positions.count; index++) {
    assert.ok(Math.abs(positions.getY(index) - DATA_PARTICLES.birthY) < 1e-6);
  }
  const version = positions.version;
  particles.update(28);
  particles.setPixelRatio(1.25);
  assert.equal(shader.uniforms.uTime.value, 28);
  assert.equal(shader.uniforms.uPixelRatio.value, 1.25);
  assert.equal(positions.version, version);
  assert.ok(shader.vertexShader.includes('float life = fract('));
  assert.ok(shader.vertexShader.includes('1.0 - smoothstep(0.48, 1.0, life)'));
  assert.ok(shader.fragmentShader.includes('diffuseColor.a *='));
  assert.ok(shader.fragmentShader.includes('#include <colorspace_fragment>'));
});
