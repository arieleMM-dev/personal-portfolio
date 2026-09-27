import * as THREE from 'three';
import { HERO_PALETTE } from './palette.ts';
import { createTowerBurstScheduler, TOWER_BURST_GLSL } from './towerBursts.ts';

export const CITYSCAPE = { rows: 3, perRow: 28, nearZ: -55, farZ: -315, corridorSlope: 0.2 } as const;

/** Two instanced draws: static towers + pooled GPU-animated vertical discharges. */
export function createCityscape(fogColor: THREE.Color, random: () => number = Math.random) {
  const count = CITYSCAPE.rows * CITYSCAPE.perRow;
  const scheduler = createTowerBurstScheduler(count, random);
  const starts = new THREE.InstancedBufferAttribute(scheduler.starts, 1).setUsage(THREE.DynamicDrawUsage);
  const seeds = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  const uniforms = { uCityTime: { value: 0 }, uHeartbeat: { value: 0.5 }, uEventsEnabled: { value: 1 } };
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.setAttribute('aBurstStart', starts);
  geometry.setAttribute('aTowerSeed', seeds);
  const material = new THREE.MeshStandardMaterial({
    color: HERO_PALETTE.slate,
    roughness: 0.88,
    metalness: 0.05,
    emissive: HERO_PALETTE.cyan,
    emissiveIntensity: 1,
    envMapIntensity: 0.18,
  });
  material.name = 'distant-slate-blue-city';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.uniforms.uCityFogColor = { value: fogColor };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vCityWorldPosition;
        varying vec2 vCityUv;
        varying float vTowerSeed;
        varying float vTowerFlash;
        attribute float aBurstStart;
        attribute float aTowerSeed;
        uniform float uCityTime;
        uniform float uEventsEnabled;
        ${TOWER_BURST_GLSL}
      `)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        // Include the instance transform, not just the unit box coordinates.
        vec4 cityPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          cityPosition = instanceMatrix * cityPosition;
        #endif
        vCityWorldPosition = (modelMatrix * cityPosition).xyz;
        vCityUv = uv;
        vTowerSeed = aTowerSeed;
        vTowerFlash = towerBurst(uCityTime - aBurstStart) * uEventsEnabled;
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uCityFogColor;
        varying vec3 vCityWorldPosition;
        varying vec2 vCityUv;
        varying float vTowerSeed;
        varying float vTowerFlash;
        uniform float uHeartbeat;
        float cityHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 grid = vCityUv * vec2(8.0, 28.0);
        vec2 cell = floor(grid);
        vec2 p = fract(grid);
        vec2 aa = fwidth(grid);
        float trace = 1.0 - smoothstep(0.016, 0.016 + aa.x, abs(p.x - 0.5));
        trace *= step(0.62, cityHash(vec2(cell.x, vTowerSeed * 57.0)));
        float windowMask = step(0.8, cityHash(cell + vTowerSeed * 97.0));
        vec2 windowInset = smoothstep(vec2(0.2), vec2(0.2) + aa, p)
          * (1.0 - smoothstep(vec2(0.72) - aa, vec2(0.72), p));
        float veins = trace + windowMask * windowInset.x * windowInset.y * 0.4;
        float breath = 0.7 + uHeartbeat * 0.3;
        totalEmissiveRadiance *= 0.006 + veins * 0.055 * breath
          + vTowerFlash * (0.45 + veins * 4.0) * breath;
      `)
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        // Distance fog alone cannot bury the base more than the roof.
        // World-space height also stays correct in Water's mirror camera.
        float bankHeight = 8.0 + 2.0 * sin(vCityWorldPosition.x * 0.037
          + vCityWorldPosition.z * 0.021);
        float groundMist = 1.0 - smoothstep(0.0, bankHeight, vCityWorldPosition.y);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uCityFogColor, groundMist * 0.98);
      `);
  };
  material.customProgramCacheKey = () => 'hero-city-heart-veins-v2';

  const buildings = new THREE.InstancedMesh(geometry, material, count);
  buildings.name = 'distant-instanced-cityscape';

  // One narrow cylinder per tower; only active segments survive the fragment shader.
  const rayGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 6, 1, true).translate(0, 0.5, 0);
  rayGeometry.setAttribute('aBurstStart', starts);
  const rayMaterial = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uRayColor: { value: new THREE.Color(HERO_PALETTE.cyan).multiplyScalar(7) },
      uFogDensity: { value: HERO_PALETTE.fogDensity },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aBurstStart;
      uniform float uCityTime;
      varying float vAge;
      varying float vHeight;
      varying float vDistance;
      void main() {
        vAge = uCityTime - aBurstStart;
        vHeight = uv.y;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vDistance = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uRayColor;
      uniform float uFogDensity;
      uniform float uHeartbeat;
      uniform float uEventsEnabled;
      varying float vAge;
      varying float vHeight;
      varying float vDistance;
      ${TOWER_BURST_GLSL}
      void main() {
        float head = vAge * 0.72;
        float trail = smoothstep(head - 0.65, head - 0.22, vHeight)
          * (1.0 - smoothstep(head - 0.035, head + 0.035, vHeight));
        float alpha = trail * towerBurst(vAge) * uEventsEnabled;
        alpha *= exp(-pow(uFogDensity * vDistance, 2.0));
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(uRayColor * (0.75 + uHeartbeat * 0.25), alpha);
      }
    `,
  });
  const rays = new THREE.InstancedMesh(rayGeometry, rayMaterial, count);
  rays.name = 'ascending-tower-rays';
  rays.visible = false;
  const group = new THREE.Group();
  group.name = 'pulsing-blue-cityscape';
  group.add(buildings, rays);
  const transform = new THREE.Object3D();
  const eligible: number[] = [];
  const depthBands = [[55, 110], [125, 205], [225, 315]] as const;
  for (let row = 0; row < CITYSCAPE.rows; row++) {
    for (let column = 0; column < CITYSCAPE.perRow; column++) {
      const index = row * CITYSCAPE.perRow + column;
      const z = -THREE.MathUtils.lerp(depthBands[row][0], depthBands[row][1], random());
      const height = 4 + Math.pow(random(), 1.8) * (row === 0 ? 26 : row === 1 ? 43 : 64);
      const width = 1.1 + Math.pow(random(), 2) * 11;
      const depth = 1.5 + Math.pow(random(), 1.6) * 12;
      const side = column % 2 === 0 ? -1 : 1;
      // An angular keep-out corridor protects the monolith, including parallax.
      const clearance = 8 + (18 - z) * CITYSCAPE.corridorSlope + Math.hypot(width, depth) / 2;
      const lane = (Math.floor(column / 2) + random()) / (CITYSCAPE.perRow / 2);
      const x = side * (clearance + lane * (18 - z) * 0.58);
      transform.position.set(x, height / 2 - 0.2, z);
      transform.scale.set(width, height, depth);
      transform.rotation.y = (random() - 0.5) * 0.3;
      transform.updateMatrix();
      buildings.setMatrixAt(index, transform.matrix);
      seeds.setX(index, random());
      transform.position.set(x, height - 0.1, z);
      transform.rotation.y = 0;
      const rayWidth = 1 + (18 - z) * 0.014;
      transform.scale.set(rayWidth, 42 + random() * 40, rayWidth);
      transform.updateMatrix();
      rays.setMatrixAt(index, transform.matrix);
      if (Math.abs(x) / (18 - z) < 0.6 && z > -250) eligible.push(index);
    }
  }
  for (const mesh of [buildings, rays]) {
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }
  scheduler.setEligible(eligible);
  return {
    group, buildings, rays,
    update(time: number, heartbeat: number, reducedMotion = false) {
      uniforms.uCityTime.value = time;
      uniforms.uHeartbeat.value = heartbeat;
      uniforms.uEventsEnabled.value = reducedMotion ? 0 : 1;
      const state = scheduler.update(time, heartbeat, !reducedMotion);
      if (state.changed) starts.needsUpdate = true;
      rays.visible = !reducedMotion && state.activeCount > 0;
    },
  };
}
