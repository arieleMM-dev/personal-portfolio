import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

/** Mountain channel, blue atmosphere, physical water and optical environment. */
export function createHeroEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer, normals: THREE.Texture) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(115, 32, 20), new THREE.ShaderMaterial({
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
      varying vec3 vDirection;
      void main() {
        vec3 d = normalize(vDirection);
        float horizon = exp(-abs(d.y) * 6.0);
        float halo = pow(max(0.0, dot(d, normalize(vec3(0.0, 0.10, -1.0)))), 14.0);
        vec3 color = mix(vec3(0.0015, 0.003, 0.012), vec3(0.008, 0.026, 0.09), horizon);
        color += vec3(0.0, 0.035, 0.072) * halo;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }));
  sky.name = 'blue-horizon-atmosphere';
  scene.add(sky);

  // Broad, low-energy light haze behind the blades: bloom alone only spreads
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
        gl_FragColor = vec4(0.002, 0.075, 0.24, glow * 0.7);
      }
    `,
  }));
  haze.position.set(0, 4.3, -18);
  scene.add(haze);

  // Separate ridges overlap in depth; the inner banks descend into the water.
  for (const side of [-1, 1]) {
    scene.add(createBank(side, false));
    scene.add(createBank(side, true));
  }

  scene.add(new THREE.HemisphereLight(0x2762b3, 0x01030b, 0.24));
  const rim = new THREE.DirectionalLight(0x258cff, 1.1);
  rim.position.set(0, 5, -12);
  scene.add(rim);
  for (const side of [-1, 1]) {
    const light = new THREE.SpotLight(0x009fff, 640, 42, 0.86, 0.82, 1.7);
    light.position.set(side * 3.7, 2.1, -3);
    light.target.position.set(side * 11.5, 2.5, -10);
    scene.add(light, light.target);
  }

  const water = new Water(new THREE.PlaneGeometry(220, 220), {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: normals,
    alpha: 1,
    sunDirection: new THREE.Vector3(-0.12, 0.28, -0.96).normalize(),
    sunColor: new THREE.Color(0x38aaff).multiplyScalar(1.6),
    waterColor: 0x021429,
    distortionScale: 1.6,
    clipBias: 0.001,
    fog: true,
  });
  water.name = 'reflective-rippled-water';
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  water.material.uniforms.size.value = 14;
  // Keep Water's reflection, Fresnel and animated normal sampling. Shallow
  // long waves and light scattering from the core enrich the nearby water.
  water.material.fragmentShader = water.material.fragmentShader
    .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
      'vec3 surfaceNormal = normalize( noise.xzy * vec3( 0.62, 1.0, 0.62 ) );')
    .replace('vec3 outgoingLight = albedo;', `
      float coreDistance = length(worldPosition.xz - vec2(0.0, -7.0));
      float caustic = pow(max(0.0, surfaceNormal.z * 0.5 + 0.5), 7.0);
      vec3 coreScatter = vec3(0.002, 0.12, 0.30) * exp(-coreDistance * 0.14) * caustic;
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
    [-5, 3, 2, 0x169eff, 4], [4, 4, -3, 0x0760fa, 3], [0, 7, 0, 0x54dfff, 2],
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

/** Continuous rocky terrain with a jagged ridge and a low inner shoreline. */
function createBank(side: number, distant: boolean): THREE.Mesh {
  const width = distant ? 28 : 23;
  const length = distant ? 70 : 65;
  const geometry = new THREE.PlaneGeometry(width, length, 90, 140);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const tint = new Float32Array(position.count * 3);
  const color = new THREE.Color();

  for (let index = 0; index < position.count; index++) {
    const u = position.getX(index) + width / 2;
    const z = position.getZ(index) - (distant ? 40 : 14);
    const shoreline = 5.2 + 1.15 * Math.sin(z * 0.14 + side * 1.3) + 0.4 * Math.sin(z * 0.41);
    const x = side * (shoreline + u + (distant ? 5 : 0));
    const slope = Math.pow(Math.min(u / 10, 1), 1.28);
    const ridge = 5.6 + 1.3 * Math.sin(z * 0.18 + side) + 0.65 * Math.sin(z * 0.53 + 1.4);
    const detail = fractalNoise(x * 0.7, z * 0.7);
    const y = -0.15 + slope * (ridge + detail * 1.4) + Math.min(u, 1) * detail * 0.28;
    position.setXYZ(index, x, y * (distant ? 1.4 : 1), z);
    color.setRGB(0.013, 0.022, 0.050).multiplyScalar(0.72 + detail * 0.38);
    tint[index * 3] = color.r;
    tint[index * 3 + 1] = color.g;
    tint[index * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(tint, 3));
  // Mirroring X reverses triangle winding on the left bank.
  const indices = geometry.index;
  if (side < 0 && indices) {
    for (let index = 0; index < indices.count; index += 3) {
      const second = indices.getX(index + 1);
      indices.setX(index + 1, indices.getX(index + 2));
      indices.setX(index + 2, second);
    }
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0.12, envMapIntensity: 0.04,
  });
  // Fine procedural rock grain changes surface normals, not the distant outline.
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRockPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRockPosition = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec3 vRockPosition;
      float rockHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
    `).replace('#include <normal_fragment_begin>', `
      #include <normal_fragment_begin>
      float grain = rockHash(floor(vRockPosition * 75.0));
      normal = normalize(normal + vec3(dFdx(grain), dFdy(grain), 0.0) * 0.16);
    `);
  };
  material.customProgramCacheKey = () => 'hero-rock-grain-v1';
  const bank = new THREE.Mesh(geometry, material);
  bank.name = `${side < 0 ? 'left' : 'right'}-${distant ? 'distant-ridge' : 'shoreline'}`;
  return bank;
}

function fractalNoise(x: number, y: number): number {
  let value = 0;
  let amplitude = 0.6;
  for (let octave = 0; octave < 5; octave++) {
    value += valueNoise(x, y) * amplitude;
    x = x * 2.1 + 4.7;
    y = y * 2.1 + 1.9;
    amplitude *= 0.48;
  }
  return value;
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const hash = (a: number, b: number) => {
    const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
  };
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), sx),
    THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx), sy,
  );
}
