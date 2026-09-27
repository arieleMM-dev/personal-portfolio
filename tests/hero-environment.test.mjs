import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createMonolith, MONOLITH } from '../src/scripts/webgl/hero/monolith.ts';
import { createCircuitMaterial } from '../src/scripts/webgl/hero/circuitMaterial.ts';
import { createCityscape, CITYSCAPE } from '../src/scripts/webgl/hero/cityscape.ts';
import { createOceanLighting } from '../src/scripts/webgl/hero/environment.ts';
import { HERO_PALETTE } from '../src/scripts/webgl/hero/palette.ts';
import { createDataParticles, DATA_PARTICLES } from '../src/scripts/webgl/hero/particles.ts';
import { getHeartbeat, HEARTBEAT } from '../src/scripts/webgl/hero/heartbeat.ts';
import { createTowerBurstScheduler, getTowerBurstEnvelope, TOWER_BURST } from '../src/scripts/webgl/hero/towerBursts.ts';

function seededRandom(seed = 17) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('transmissive blue monolith and central light share exactly one bounded heartbeat', () => {
  const monolith = createMonolith();
  const body = monolith.group.getObjectByName('circuit-monolith-body');
  assert.ok(body.material instanceof THREE.MeshPhysicalMaterial);
  assert.ok(body.material.transmission > 0.5 && body.material.transmission < 0.8);
  assert.equal(body.material.opacity, 1);
  assert.ok(body.material.thickness > 0 && body.material.ior > 1);
  assert.equal(body.material.color.getHex(), HERO_PALETTE.crystal);
  assert.equal(body.material.emissive.getHex(), HERO_PALETTE.circuit);
  assert.ok(body.material.metalness < 0.1 && body.material.roughness < 0.25);
  const core = monolith.group.getObjectByName('monolith-heart-light');
  assert.ok(core instanceof THREE.PointLight);
  assert.equal(core.position.length(), 0);
  assert.ok(MONOLITH.rotationSpeed > 0.026 && MONOLITH.rotationSpeed < 0.055);
  for (let time = 0; time < 120; time += 0.5) {
    monolith.update(time);
    assert.ok(monolith.group.position.y - MONOLITH.height / 2 > 0.8);
    const pulse = getHeartbeat(time);
    assert.ok(pulse >= 0 && pulse <= 1);
    assert.equal(body.material.emissiveIntensity, MONOLITH.emissiveMin + pulse * MONOLITH.emissiveRange);
    assert.equal(core.intensity, MONOLITH.lightMin + pulse * MONOLITH.lightRange);
    assert.ok(Math.abs(monolith.group.position.y - MONOLITH.centerY) <= MONOLITH.floatAmplitude + 1e-10);
  }
  assert.equal(getHeartbeat(HEARTBEAT.period / 4), 1);
  assert.equal(getHeartbeat(HEARTBEAT.period * 3 / 4), 0);
});

test('pixel emission preserves physical transmission and has no independent RGB hue', () => {
  const circuits = createCircuitMaterial();
  const shader = {
    vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    uniforms: {},
  };
  circuits.material.onBeforeCompile(shader, {});
  assert.ok(shader.vertexShader.includes('vCircuitPosition = position;'));
  assert.ok(shader.fragmentShader.includes('totalEmissiveRadiance *= circuitEmission(boardUV);'));
  assert.ok(shader.fragmentShader.includes('float circuitEmission(vec2 uv)'));
  assert.ok(shader.fragmentShader.includes('#include <lights_physical_pars_fragment>'));
  assert.ok(shader.fragmentShader.includes('#include <transmission_fragment>'));
  assert.ok(shader.fragmentShader.includes('vec2 pixelUV'));
  circuits.update(14);
  assert.equal(shader.uniforms.uCircuitTime.value, 14);
});

test('random city varies width, height and depth radically while keeping a clear central corridor', () => {
  const { buildings: city } = createCityscape(new THREE.Color(HERO_PALETTE.fog), seededRandom());
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
  const widths = [];
  const depths = [];
  let left = 0;
  for (let index = 0; index < city.count; index++) {
    city.getMatrixAt(index, matrix);
    matrix.decompose(position, quaternion, scale);
    heights.add(Math.round(scale.y));
    if (position.x < 0) left++;
    widths.push(scale.x);
    depths.push(-position.z);
    assert.ok(position.z <= CITYSCAPE.nearZ && position.z > CITYSCAPE.farZ);
    assert.ok(scale.y >= 4 && scale.y <= 68);
    assert.ok(Math.abs(position.y - scale.y / 2 + 0.2) < 1e-5);
    const innerEdge = Math.abs(position.x) - Math.hypot(scale.x, scale.z) / 2;
    assert.ok(innerEdge > 7.9 + (18 - position.z) * CITYSCAPE.corridorSlope);
  }
  assert.ok(heights.size > 12);
  assert.equal(left, city.count / 2);
  assert.ok(Math.max(...widths) / Math.min(...widths) > 8);
  assert.ok(Math.max(...depths) - Math.min(...depths) > 230);
  assert.deepEqual(city.instanceMatrix.array,
    createCityscape(new THREE.Color(), seededRandom()).buildings.instanceMatrix.array);
  assert.notDeepEqual(city.instanceMatrix.array,
    createCityscape(new THREE.Color(), seededRandom(42)).buildings.instanceMatrix.array);
});

test('city ground mist uses instanced world-space height while preserving distance fog', () => {
  const fogColor = new THREE.Color(HERO_PALETTE.fog);
  const { buildings: city } = createCityscape(fogColor, seededRandom());
  const shader = { ...THREE.ShaderLib.standard, uniforms: {} };
  city.material.onBeforeCompile(shader, {});
  assert.equal(shader.uniforms.uCityFogColor.value, fogColor);
  assert.ok(shader.vertexShader.includes('cityPosition = instanceMatrix * cityPosition;'));
  assert.ok(shader.fragmentShader.includes('#include <fog_fragment>'));
  assert.ok(shader.fragmentShader.includes('smoothstep(0.0, bankHeight, vCityWorldPosition.y)'));
  assert.ok(shader.fragmentShader.includes('groundMist * 0.98'));
  assert.ok(shader.fragmentShader.includes('vTowerFlash * (0.45 + veins * 4.0)'));
});

test('sporadic bursts return to darkness and stop immediately for reduced motion', () => {
  const scheduler = createTowerBurstScheduler(84, seededRandom());
  scheduler.setEligible([0, 3, 7, 14, 24, 55]);
  let launches = 0;
  let lastLaunch = -100;
  for (let step = 0; step < 600 * 60; step++) {
    const time = step / 60;
    const state = scheduler.update(time, getHeartbeat(time));
    assert.ok(state.activeCount <= TOWER_BURST.maxActive);
    if (state.changed) {
      launches++;
      assert.ok(time - lastLaunch >= TOWER_BURST.minInterval - 1e-5);
      assert.ok(getHeartbeat(time) >= 0.68);
      lastLaunch = time;
    }
  }
  assert.ok(launches > 30 && launches < 100);
  assert.equal(getTowerBurstEnvelope(-1), 0);
  assert.equal(getTowerBurstEnvelope(0), 0);
  assert.equal(getTowerBurstEnvelope(TOWER_BURST.duration), 0);
  assert.ok(getTowerBurstEnvelope(0.5) > 0.9);
  assert.equal(scheduler.update(600, 1, false).activeCount, 0);
  assert.ok(scheduler.starts.every((start) => start === -1000));
  assert.equal(scheduler.update(600, 1, true).activeCount, 0);
});

test('tower and ray instances share start times; matrices never upload during animations', () => {
  const city = createCityscape(new THREE.Color(HERO_PALETTE.fog), seededRandom());
  const startAttribute = city.buildings.geometry.getAttribute('aBurstStart');
  assert.equal(startAttribute, city.rays.geometry.getAttribute('aBurstStart'));
  assert.equal(startAttribute.usage, THREE.DynamicDrawUsage);
  assert.equal(city.rays.count, 84);
  assert.equal(city.rays.material.depthWrite, false);
  const version = city.buildings.instanceMatrix.version;
  let sawRay = false;
  for (let step = 0; step < 1200; step++) {
    const time = step / 30;
    city.update(time, getHeartbeat(time));
    sawRay ||= city.rays.visible;
  }
  assert.ok(sawRay);
  assert.equal(city.buildings.instanceMatrix.version, version);
  assert.ok(startAttribute.version < 12);
  city.update(40, 0.5, true);
  assert.equal(city.rays.visible, false);
  assert.equal(city.rays.material.uniforms.uEventsEnabled.value, 0);
});

test('burst cadence is independent of frame rate', () => {
  const events = [30, 60, 144].map((fps) => {
    const scheduler = createTowerBurstScheduler(84, seededRandom());
    const times = [];
    for (let frame = 0; frame < 90 * fps; frame++) {
      const time = frame / fps;
      if (scheduler.update(time, getHeartbeat(time)).changed) times.push(time);
    }
    return times;
  });
  assert.equal(events[0].length, events[2].length);
  events[0].forEach((time, index) => assert.ok(Math.abs(time - events[2][index]) < 0.2));
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
