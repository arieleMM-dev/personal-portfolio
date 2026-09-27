import * as THREE from 'three';
import { HERO_PALETTE } from './palette.ts';

export const DATA_PARTICLES = { count: 360, birthY: 0.055, minHeight: 2.6, maxHeight: 5.4 } as const;

/** GPU lifetimes: rise from the water, fade completely, then respawn invisibly. */
export function createDataParticles(fogDensity: number) {
  const count = DATA_PARTICLES.count;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    positions[index * 3] = (Math.random() - 0.5) * 36;
    positions[index * 3 + 1] = DATA_PARTICLES.birthY;
    positions[index * 3 + 2] = 10 - Math.random() * 45;
    seeds[index] = Math.random();
    sizes[index] = 0.8 + Math.random() * 1.8;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const uniforms = {
    uTime: { value: 0 }, uPixelRatio: { value: 1 }, uFogDensity: { value: fogDensity },
    uRiseHeight: { value: new THREE.Vector2(DATA_PARTICLES.minHeight, DATA_PARTICLES.maxHeight) },
  };
  const material = new THREE.PointsMaterial({
    color: HERO_PALETTE.particle,
    size: 1,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    // Attenuate alpha instead of mixing blue fog into additive sprites.
    fog: false,
  });
  material.name = 'blue-data-fireflies';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uFogDensity;
        uniform vec2 uRiseHeight;
        attribute float aSeed;
        attribute float aSize;
        varying float vAlpha;
      `)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float life = fract(uTime * mix(0.035, 0.06, aSeed) + aSeed);
        transformed.y += life * mix(uRiseHeight.x, uRiseHeight.y, aSeed);
        transformed.x += sin(uTime * 0.18 + aSeed * 70.0) * life * 0.5;
        transformed.z += cos(uTime * 0.12 + aSeed * 50.0) * life * 0.3;
      `)
      .replace('#include <logdepthbuf_vertex>', `
        float fade = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.48, 1.0, life));
        float twinkle = 0.65 + 0.35 * sin(uTime * 0.7 + aSeed * 20.0);
        vAlpha = fade * twinkle * exp(-pow(uFogDensity * length(mvPosition.xyz), 2.0));
        gl_PointSize = clamp(aSize * uPixelRatio * 26.0 / max(-mvPosition.z, 3.0), 1.0, 5.0 * uPixelRatio);
        #include <logdepthbuf_vertex>
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
      .replace('#include <opaque_fragment>', `
        float radius = length(gl_PointCoord - 0.5);
        if (radius > 0.5) discard;
        diffuseColor.a *= (1.0 - smoothstep(0.07, 0.5, radius)) * vAlpha;
        // Scalar energy only: the sole RGB source stays PointsMaterial.color.
        outgoingLight *= 2.5;
        #include <opaque_fragment>
      `);
  };
  material.customProgramCacheKey = () => 'hero-points-blue-lifetime-v2';
  const points = new THREE.Points(geometry, material);
  points.name = 'ascending-data-fireflies';
  points.frustumCulled = false;
  return {
    points,
    update(time: number) { uniforms.uTime.value = time; },
    setPixelRatio(ratio: number) { uniforms.uPixelRatio.value = ratio; },
  };
}
