import * as THREE from 'three';

/** Six distant silhouettes, deliberately sparse and reproducible across visits. */
export function createDistantPillars() {
  const group = new THREE.Group();
  group.name = 'distant-data-pillars';
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials: THREE.MeshStandardMaterial[] = [];
  const windowsMaterial = new THREE.MeshStandardMaterial({
    color: 0x020611, emissive: 0x236596, emissiveIntensity: 0.3, roughness: 0.65,
  });
  const windows = new THREE.InstancedMesh(geometry, windowsMaterial, 42);
  windows.name = 'distant-server-status-lights';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const jitter = (seed: number) => {
    const value = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
    return value - Math.floor(value);
  };
  let windowIndex = 0;
  for (const side of [-1, 1]) for (let index = 0; index < 3; index++) {
    const seed = index + (side > 0 ? 10 : 20);
    const width = 3.2 + jitter(seed) * 2.2;
    const height = 11 + jitter(seed + 5) * 13;
    const depth = 3.5 + jitter(seed + 8) * 2;
    const x = side * (17 + index * 9 + jitter(seed + 3) * 4);
    const z = -30 - index * 13 - jitter(seed + 4) * 7;
    const material = new THREE.MeshStandardMaterial({
      color: 0x050b16, metalness: 0.4, roughness: 0.5,
      emissive: index === 1 ? 0x241342 : 0x0d2948, emissiveIntensity: 0.12,
      envMapIntensity: 0.12,
    });
    const pillar = new THREE.Mesh(geometry, material);
    pillar.name = `data-pillar-${side}-${index}`;
    pillar.position.set(x, height / 2 - 0.1, z);
    pillar.scale.set(width, height, depth);
    group.add(pillar);
    materials.push(material);
    for (let row = 0; row < 7; row++) {
      position.set(x, 1.2 + row * (height - 2) / 7, z + depth / 2 + 0.01);
      scale.set(width * (0.35 + jitter(seed + row) * 0.35), 0.035, 0.025);
      matrix.compose(position, rotation, scale);
      windows.setMatrixAt(windowIndex++, matrix);
    }
  }
  windows.instanceMatrix.needsUpdate = true;
  group.add(windows);
  return {
    group,
    update(time: number) {
      materials.forEach((material, index) => {
        material.emissiveIntensity = 0.12 + Math.sin(time * 0.4 + index * 1.7) * 0.035;
      });
      windowsMaterial.emissiveIntensity = 0.3 + Math.sin(time * 0.48) * 0.07;
    },
  };
}
