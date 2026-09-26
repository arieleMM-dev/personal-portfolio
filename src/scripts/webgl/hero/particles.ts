import * as THREE from 'three';

/** GPU animation: small distant motes, concentrated close to the water. */
export function createDataParticles() {
  const count = 440;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    positions[index * 3] = (Math.random() - 0.5) * 36;
    positions[index * 3 + 1] = 0.12 + Math.pow(Math.random(), 2) * 2.5;
    positions[index * 3 + 2] = 10 - Math.random() * 45;
    seeds[index] = Math.random();
    sizes[index] = 0.6 + Math.random() * 1.4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const uniforms = { uTime: { value: 0 }, uPixelRatio: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSeed;
      attribute float aSize;
      varying float vAlpha;
      varying float vTint;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.18 + aSeed * 70.0) * 0.26;
        p.y += sin(uTime * 0.32 + aSeed * 31.0) * 0.10;
        p.z += cos(uTime * 0.12 + aSeed * 50.0) * 0.20;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vAlpha = (0.28 + 0.72 * pow(sin(uTime * 0.42 + aSeed * 20.0) * 0.5 + 0.5, 3.0))
          * exp(-0.023 * length(mv.xyz));
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
        vec3 color = mix(vec3(0.03, 0.36, 1.7), vec3(0.10, 1.45, 2.8), vTint);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'water-data-motes';
  points.frustumCulled = false;
  return {
    points,
    update(time: number) { uniforms.uTime.value = time; },
    setPixelRatio(ratio: number) { uniforms.uPixelRatio.value = ratio; },
  };
}
