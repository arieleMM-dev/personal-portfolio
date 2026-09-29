import * as THREE from 'three';
import { createVideoProjectionMaterial } from './videoProjectionMaterial.ts';
import { createVideoCubeInteraction } from './videoCubeInteraction.ts';
import { HERO_PALETTE } from './palette.ts';
import { getHeartbeat } from './heartbeat.ts';

export const VIDEO_CUBE = {
  divisions: 20, size: 3.2, fill: 0.91, centerY: 3.65, floatAmplitude: 0.12,
  rotationSpeed: 0.04715, emissiveMin: 1.0, emissiveRange: 0.25,
  lightMin: 9, lightRange: 9,
} as const;

export function createCubeShell(divisions: number, size: number): THREE.Vector3[] {
  if (!Number.isInteger(divisions) || divisions < 2 || size <= 0) throw new RangeError('Invalid cube grid');
  const centers: THREE.Vector3[] = [];
  const pitch = size / divisions;
  for (let x = 0; x < divisions; x++) for (let y = 0; y < divisions; y++) for (let z = 0; z < divisions; z++) {
    if (x !== 0 && x !== divisions - 1 && y !== 0 && y !== divisions - 1 && z !== 0 && z !== divisions - 1) continue;
    centers.push(new THREE.Vector3(x, y, z).addScalar(-(divisions - 1) / 2).multiplyScalar(pitch));
  }
  return centers;
}

/** 2,168 exterior voxels, one material and static instance matrices. */
export function createVideoCube(texture: THREE.Texture) {
  const group = new THREE.Group();
  group.name = 'video-projection-cube';
  const projection = createVideoProjectionMaterial(texture, VIDEO_CUBE.size);
  const centers = createCubeShell(VIDEO_CUBE.divisions, VIDEO_CUBE.size);
  const cellSize = VIDEO_CUBE.size / VIDEO_CUBE.divisions * VIDEO_CUBE.fill;
  const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
  const voxels = new THREE.InstancedMesh(geometry, projection.material, centers.length);
  voxels.name = 'video-cube-voxels';
  const matrix = new THREE.Matrix4();
  centers.forEach((center, index) => voxels.setMatrixAt(index, matrix.makeTranslation(center)));
  voxels.instanceMatrix.needsUpdate = true;
  // CPU culling cannot see vertex displacement. Include maximum attraction + scale.
  const limit = VIDEO_CUBE.size / 2 + projection.uniforms.uDisplacement.value + cellSize * 0.16;
  voxels.boundingBox = new THREE.Box3(new THREE.Vector3().setScalar(-limit), new THREE.Vector3().setScalar(limit));
  voxels.boundingSphere = voxels.boundingBox.getBoundingSphere(new THREE.Sphere());
  group.add(voxels);
  const light = new THREE.PointLight(HERO_PALETTE.cyan, 13.5, 28, 2);
  light.name = 'video-cube-heart-light';
  group.add(light);
  const interaction = createVideoCubeInteraction(group, VIDEO_CUBE.size);

  return {
    group, voxels, projection, interaction,
    update(time: number, heartbeat = getHeartbeat(time)): void {
      group.rotation.y = -0.36 + time * VIDEO_CUBE.rotationSpeed;
      group.position.y = VIDEO_CUBE.centerY + Math.sin(time * 0.48) * VIDEO_CUBE.floatAmplitude;
      projection.material.emissiveIntensity = VIDEO_CUBE.emissiveMin + heartbeat * VIDEO_CUBE.emissiveRange;
      light.intensity = VIDEO_CUBE.lightMin + heartbeat * VIDEO_CUBE.lightRange;
    },
    updateInteraction(delta: number, pointer: Readonly<THREE.Vector2>, present: boolean, camera: THREE.PerspectiveCamera, reducedMotion: boolean): void {
      interaction.update(delta, pointer, present, camera, reducedMotion);
      projection.uniforms.uMouse.value.copy(interaction.mouse);
      projection.uniforms.uCameraLocal.value.copy(interaction.cameraLocal);
      projection.uniforms.uAttraction.value = interaction.attraction;
    },
    setVideoState(ready: boolean, aspect: number): void {
      projection.uniforms.uVideoReady.value = ready ? 1 : 0;
      projection.uniforms.uVideoAspect.value = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    },
  };
}
