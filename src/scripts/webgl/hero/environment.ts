import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { HERO_PALETTE } from './palette.ts';

/** Water uses sun uniforms, not the scene's directional-light uniforms. */
export function createOceanLighting(scene: THREE.Scene) {
  const ambient = new THREE.AmbientLight(HERO_PALETTE.ambient, 0.18);
  ambient.name = 'dim-blue-ambient';
  const key = new THREE.DirectionalLight(HERO_PALETTE.waterLight, 2.4);
  key.name = 'grazing-cyan-water-light';
  key.position.set(-6, 6, -48);
  key.target.position.set(0, 0, -4);
  scene.add(ambient, key, key.target);
  scene.add(new THREE.HemisphereLight(0x2762b3, 0x010711, 0.24));
  return {
    key,
    sunDirection: new THREE.Vector3().subVectors(key.position, key.target.position).normalize(),
    sunColor: key.color.clone().multiplyScalar(key.intensity * 0.6),
  };
}

/** Open ocean, blue atmosphere, physical water and optical environment. */
export function createHeroEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  normals: THREE.Texture,
  focusZ: number,
) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 20), new THREE.ShaderMaterial({
    uniforms: { uHorizon: { value: scene.fog?.color ?? new THREE.Color(HERO_PALETTE.fog) } },
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uHorizon;
      varying vec3 vDirection;
      void main() {
        vec3 d = normalize(vDirection);
        float horizon = exp(-abs(d.y) * 6.0);
        float halo = pow(max(0.0, dot(d, normalize(vec3(0.0, 0.10, -1.0)))), 14.0);
        vec3 color = mix(vec3(0.001, 0.002, 0.007), uHorizon, horizon);
        // Meet the exact fog color at the horizon; no dark city cut-out edges.
        color += vec3(0.0, 0.012, 0.035) * halo * smoothstep(0.0, 0.12, abs(d.y));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }));
  sky.name = 'blue-horizon-atmosphere';
  scene.add(sky);

  // Broad, low-energy light haze behind the monolith: bloom alone only spreads
  // bright pixels a short distance and cannot supply atmospheric depth.
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(25, 19), new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float glow = exp(-dot(p * vec2(1.2, 1.0), p * vec2(1.2, 1.0)) * 4.2);
        glow *= 1.0 - smoothstep(0.55, 1.0, length(p));
        vec3 tint = vec3(0.002, 0.06, 0.18);
        gl_FragColor = vec4(tint, glow * 0.6);
      }
    `,
  }));
  haze.position.set(0, 4.3, -18);
  scene.add(haze);

  const lighting = createOceanLighting(scene);
  // The distant edges lie far beyond the fog's visible range.
  const water = new Water(new THREE.PlaneGeometry(1200, 1200), {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: normals,
    alpha: 1,
    sunDirection: lighting.sunDirection,
    sunColor: lighting.sunColor,
    waterColor: HERO_PALETTE.water,
    distortionScale: 0.95,
    clipBias: 0.001,
    fog: true,
  });
  water.name = 'reflective-rippled-water';
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  water.material.uniforms.size.value = 14;
  water.material.uniforms.uCorePosition = { value: new THREE.Vector2(0, focusZ) };
  // Keep Water's reflection, Fresnel and animated normal sampling. Shallow
  // long waves and light scattering from the core enrich the nearby water.
  water.material.fragmentShader = water.material.fragmentShader
    .replace('uniform float time;', 'uniform float time;\nuniform vec2 uCorePosition;')
    .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
      'vec3 surfaceNormal = normalize( noise.xzy * vec3( 0.72, 1.0, 0.72 ) );')
    .replace('vec3 outgoingLight = albedo;', `
      float coreDistance = length(worldPosition.xz - uCorePosition);
      float caustic = pow(max(0.0, surfaceNormal.z * 0.5 + 0.5), 7.0);
      vec3 scatterTint = vec3(0.002, 0.085, 0.24);
      vec3 coreScatter = scatterTint * exp(-coreDistance * 0.18) * caustic;
      vec3 outgoingLight = albedo + coreScatter;
    `);
  scene.add(water);

  // r186 exposes the owning render target on Texture; retain it explicitly so
  // Water's internal reflection framebuffer is resized AND released on teardown.
  const reflectionTexture: THREE.Texture = water.material.uniforms.mirrorSampler.value;
  const reflectionTarget = reflectionTexture.renderTarget;

  const environmentScene = new THREE.Scene();
  environmentScene.background = new THREE.Color(0x061831);
  const panels: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  for (const [x, y, z, color, strength] of [
    [-5, 3, 2, 0x169eff, 3], [4, 4, -3, 0x126dff, 2.2], [0, 7, 0, 0x54dfff, 1.3],
  ]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide,
    }));
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    environmentScene.add(panel);
    panels.push(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromScene(environmentScene, 0.06);
  scene.environment = environmentTarget.texture;
  panels.forEach((panel) => { panel.geometry.dispose(); panel.material.dispose(); });
  pmrem.dispose();

  return {
    update(time: number) { water.material.uniforms.time.value = time * 0.22; },
    resize(size: number) { reflectionTarget?.setSize(size, size); },
    dispose() { reflectionTarget?.dispose(); environmentTarget.dispose(); },
  };
}
