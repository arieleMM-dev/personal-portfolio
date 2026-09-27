import * as THREE from 'three';
import { createCircuitMaterial } from './circuitMaterial.ts';

export const MONOLITH = { width: 3.2, height: 5.2, depth: 2.2, centerY: 3.65, floatAmplitude: 0.12 } as const;

/** A solid, lightly bevelled monolith; all GPU resources belong to heroScene. */
export function createMonolith() {
  const group = new THREE.Group();
  group.name = 'circuit-monolith';
  const circuits = createCircuitMaterial();
  const geometry = new THREE.BoxGeometry(MONOLITH.width, MONOLITH.height, MONOLITH.depth, 4, 8, 4);
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const point = new THREE.Vector3();
  const inner = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const radius = 0.045;
  const limits = new THREE.Vector3(MONOLITH.width / 2 - radius, MONOLITH.height / 2 - radius, MONOLITH.depth / 2 - radius);
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    inner.copy(point).clamp(limits.clone().negate(), limits);
    direction.subVectors(point, inner).normalize();
    point.copy(inner).addScaledVector(direction, radius);
    positions.setXYZ(index, point.x, point.y, point.z);
    normals.setXYZ(index, direction.x, direction.y, direction.z);
  }
  const body = new THREE.Mesh(geometry, circuits.material);
  body.name = 'circuit-monolith-body';
  group.add(body);

  const trimMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x111b2d, metalness: 0.85, roughness: 0.17, clearcoat: 1, envMapIntensity: 0.75,
  });
  const capGeometry = new THREE.BoxGeometry(3.21, 0.065, 2.21);
  for (const y of [-2.57, 2.57]) {
    const cap = new THREE.Mesh(capGeometry, trimMaterial);
    cap.position.y = y;
    group.add(cap);
  }

  const cyan = new THREE.MeshStandardMaterial({ color: 0x061426, emissive: 0x14bcff, emissiveIntensity: 2.0 });
  const violet = new THREE.MeshStandardMaterial({ color: 0x0d071c, emissive: 0x8b36ff, emissiveIntensity: 1.7 });
  const railGeometry = new THREE.BoxGeometry(0.018, 1.35, 0.025);
  for (const side of [-1, 1]) for (let index = 0; index < 3; index++) {
    const rail = new THREE.Mesh(railGeometry, side < 0 ? cyan : violet);
    rail.position.set(side * 1.535, (index - 1) * 1.54, 1.102);
    group.add(rail);
  }
  const cyanLight = new THREE.PointLight(0x20bbff, 12, 17, 2);
  cyanLight.position.set(-1.6, -1, 0.5);
  const violetLight = new THREE.PointLight(0x8740ff, 8, 14, 2);
  violetLight.position.set(1.5, 0.8, -0.6);
  group.add(cyanLight, violetLight);

  return {
    group,
    update(time: number) {
      const breath = Math.sin(time * 0.85);
      group.rotation.y = -0.36 + time * 0.026;
      group.position.y = MONOLITH.centerY + Math.sin(time * 0.48) * MONOLITH.floatAmplitude;
      circuits.material.emissiveIntensity = 2.7 + breath * 0.55;
      cyan.emissiveIntensity = 1.9 + breath * 0.25;
      violet.emissiveIntensity = 1.6 + breath * 0.25;
      cyanLight.intensity = 12 + breath * 2;
      violetLight.intensity = 8 + breath * 1.5;
      circuits.update(time);
    },
  };
}
