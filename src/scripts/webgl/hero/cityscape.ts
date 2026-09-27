import * as THREE from 'three';
import { HERO_PALETTE } from './palette.ts';

export const CITYSCAPE = { rows: 3, perRow: 28, nearZ: -165, rowSpacing: 55 } as const;

/** A single static draw call per view, including Water's reflected view. */
export function createCityscape(fogColor: THREE.Color) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: HERO_PALETTE.slate,
    roughness: 0.88,
    metalness: 0.05,
    emissive: HERO_PALETTE.slate,
    emissiveIntensity: 0.38,
    envMapIntensity: 0.18,
  });
  material.name = 'distant-slate-blue-city';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCityFogColor = { value: fogColor };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vCityWorldPosition;
      `)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        // Include the instance transform, not just the unit box coordinates.
        vec4 cityPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          cityPosition = instanceMatrix * cityPosition;
        #endif
        vCityWorldPosition = (modelMatrix * cityPosition).xyz;
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uCityFogColor;
        varying vec3 vCityWorldPosition;
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
  material.customProgramCacheKey = () => 'hero-city-height-fog-v1';

  const buildings = new THREE.InstancedMesh(geometry, material, CITYSCAPE.rows * CITYSCAPE.perRow);
  buildings.name = 'distant-instanced-cityscape';
  const transform = new THREE.Object3D();
  const jitter = (seed: number) => {
    const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
    return n - Math.floor(n);
  };
  for (let row = 0; row < CITYSCAPE.rows; row++) {
    for (let column = 0; column < CITYSCAPE.perRow; column++) {
      const index = row * CITYSCAPE.perRow + column;
      const spread = 370 + row * 75;
      const x = ((column + 0.5) / CITYSCAPE.perRow - 0.5) * spread + (jitter(index + 2) - 0.5) * 5;
      const height = (7 + Math.pow(jitter(index + 7), 1.4) * 15) * (Math.abs(x) < 18 ? 0.7 : 1);
      const z = CITYSCAPE.nearZ - row * CITYSCAPE.rowSpacing - jitter(index + 4) * 20;
      transform.position.set(x, height / 2 - 0.2, z);
      transform.scale.set(2.4 + jitter(index + 11) * 4, height, 2.5 + jitter(index + 13) * 4.5);
      transform.rotation.y = (jitter(index + 18) - 0.5) * 0.2;
      transform.updateMatrix();
      buildings.setMatrixAt(index, transform.matrix);
    }
  }
  buildings.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  buildings.instanceMatrix.needsUpdate = true;
  buildings.computeBoundingBox();
  buildings.computeBoundingSphere();
  return buildings;
}
