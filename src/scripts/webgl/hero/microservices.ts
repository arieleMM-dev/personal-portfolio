import * as THREE from 'three';

/** Three optical-glass blades with luminous internal circuitry. */
export function createMicroservices(): THREE.Group {
  const stack = new THREE.Group();
  stack.name = 'microservices-three-glass-blades';
  const geometry = new THREE.BoxGeometry(6.8, 0.34, 3.8);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x77dcff,
    transmission: 0.94,
    opacity: 1, // Transmission controls optical transparency, not alpha blending.
    roughness: 0.07,
    metalness: 0.08,
    ior: 1.46,
    thickness: 0.6,
    attenuationColor: new THREE.Color(0x139dff),
    attenuationDistance: 3.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.15,
    emissive: 0x007ad9,
    emissiveIntensity: 0.9,
  });
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(0x19bfff).multiplyScalar(2.8) });
  const circuitMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x00baff).multiplyScalar(2.8) });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x00bcff).multiplyScalar(3.0) });
  const coreGeometry = new THREE.BoxGeometry(6.42, 0.018, 3.42);
  const railGeometry = new THREE.BoxGeometry(6.45, 0.025, 0.035);
  const chipGeometry = new THREE.BoxGeometry(0.55, 0.014, 0.42);
  const traceGeometry = new THREE.BoxGeometry(0.025, 0.012, 1.8);

  for (let layer = 0; layer < 3; layer++) {
    const blade = new THREE.Group();
    blade.position.y = (layer - 1) * 1.24;
    blade.rotation.y = (layer - 1) * 0.025;
    blade.add(new THREE.Mesh(geometry, glass));
    blade.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));
    // A real luminous surface for Water's mirrored camera to reflect.
    blade.add(new THREE.Mesh(coreGeometry, coreMaterial));
    for (const z of [-1.88, 1.88]) {
      const rail = new THREE.Mesh(railGeometry, circuitMaterial);
      rail.position.set(0, 0, z);
      blade.add(rail);
    }
    for (let index = 0; index < 7; index++) {
      const chip = new THREE.Mesh(chipGeometry, circuitMaterial);
      chip.position.set(-2.25 + index * 0.73, 0.18, index % 2 ? 0.6 : -0.48);
      blade.add(chip);
      const trace = new THREE.Mesh(traceGeometry, circuitMaterial);
      trace.position.set(chip.position.x + 0.16, 0.18, 0);
      blade.add(trace);
    }
    stack.add(blade);
  }
  const coreLight = new THREE.PointLight(0x00c8ff, 145, 34, 2);
  stack.add(coreLight);
  return stack;
}
