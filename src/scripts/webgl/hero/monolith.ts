import * as THREE from 'three';
import { createCircuitMaterial } from './circuitMaterial.ts';
import { HERO_PALETTE } from './palette.ts';
import { getHeartbeat } from './heartbeat.ts';

export const MONOLITH = {
  width: 3.2, height: 5.2, depth: 2.2, centerY: 3.65, floatAmplitude: 0.12,
  rotationSpeed: 0.041, emissiveMin: 2.2, emissiveRange: 1.2, lightMin: 9, lightRange: 9,
} as const;

/** Lightly bevelled blue crystal; all GPU resources belong to heroScene. */
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

  // No black caps or metal rails: the crystal is one uninterrupted volume.
  const coreLight = new THREE.PointLight(HERO_PALETTE.cyan, 13.5, 28, 2);
  coreLight.name = 'monolith-heart-light';
  group.add(coreLight);

  return {
    group,
    update(time: number, heartbeat = getHeartbeat(time)) {
      group.rotation.y = -0.36 + time * MONOLITH.rotationSpeed;
      group.position.y = MONOLITH.centerY + Math.sin(time * 0.48) * MONOLITH.floatAmplitude;
      circuits.material.emissiveIntensity = MONOLITH.emissiveMin + heartbeat * MONOLITH.emissiveRange;
      coreLight.intensity = MONOLITH.lightMin + heartbeat * MONOLITH.lightRange;
      circuits.update(time);
    },
  };
}
