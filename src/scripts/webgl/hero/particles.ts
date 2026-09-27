import * as THREE from 'three';

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
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uFogDensity;
      uniform vec2 uRiseHeight;
      attribute float aSeed;
      attribute float aSize;
      varying float vAlpha;
      varying float vTint;
      void main() {
        vec3 p = position;
        float life = fract(uTime * mix(0.035, 0.06, aSeed) + aSeed);
        p.y += life * mix(uRiseHeight.x, uRiseHeight.y, aSeed);
        p.x += sin(uTime * 0.18 + aSeed * 70.0) * life * 0.5;
        p.z += cos(uTime * 0.12 + aSeed * 50.0) * life * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float fade = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.48, 1.0, life));
        float twinkle = 0.65 + 0.35 * sin(uTime * 0.7 + aSeed * 20.0);
        vAlpha = fade * twinkle * exp(-pow(uFogDensity * length(mv.xyz), 2.0));
        vTint = aSeed;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aSize * uPixelRatio * 26.0 / max(-mv.z, 3.0), 1.0, 5.0 * uPixelRatio);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying float vTint;
      void main() {
        float radius = length(gl_PointCoord - 0.5);
        if (radius > 0.5) discard;
        float alpha = (1.0 - smoothstep(0.07, 0.5, radius)) * vAlpha;
        vec3 color = mix(vec3(0.06, 1.1, 2.4), vec3(1.2, 0.12, 2.5), step(0.76, vTint));
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'ascending-data-fireflies';
  points.frustumCulled = false;
  return {
    points,
    update(time: number) { uniforms.uTime.value = time; },
    setPixelRatio(ratio: number) { uniforms.uPixelRatio.value = ratio; },
  };
}
