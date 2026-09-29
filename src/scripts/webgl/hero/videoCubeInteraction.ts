import * as THREE from 'three';

/** Exact critically damped spring: no frame-dependent lerp or Euler instability. */
export function advanceSpring(state: { position: number; velocity: number }, target: number, delta: number, omega: number): void {
  const offset = state.position - target;
  const impulse = (state.velocity + omega * offset) * delta;
  const decay = Math.exp(-omega * delta);
  state.position = target + (offset + impulse) * decay;
  state.velocity = (state.velocity - omega * impulse) * decay;
}

/** Analytical local-space bounding box. No invisible mesh, material or draw call. */
export function createVideoCubeInteraction(group: THREE.Group, size: number) {
  const box = new THREE.Box3(new THREE.Vector3().setScalar(-size / 2), new THREE.Vector3().setScalar(size / 2));
  const raycaster = new THREE.Raycaster();
  const localRay = new THREE.Ray();
  const inverse = new THREE.Matrix4();
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  const mouse = new THREE.Vector3();
  const cameraLocal = new THREE.Vector3();
  const cursor = [0, 1, 2].map(() => ({ position: 0, velocity: 0 }));
  const strength = { position: 0, velocity: 0 };
  let initialized = false;

  return {
    mouse, cameraLocal,
    get attraction() { return strength.position; },
    update(delta: number, pointer: Readonly<THREE.Vector2>, present: boolean, camera: THREE.PerspectiveCamera, reducedMotion = false): boolean {
      group.updateWorldMatrix(true, false);
      inverse.copy(group.matrixWorld).invert();
      camera.getWorldPosition(cameraLocal).applyMatrix4(inverse);
      // Camera rig uses Y-down coordinates, while a raycaster requires Y-up.
      ndc.set(pointer.x, -pointer.y);
      raycaster.setFromCamera(ndc, camera);
      localRay.copy(raycaster.ray).applyMatrix4(inverse);
      const intersects = present && !reducedMotion && localRay.intersectBox(box, hit) !== null;
      if (reducedMotion) {
        strength.position = strength.velocity = 0;
        cursor.forEach((axis) => { axis.velocity = 0; });
        initialized = false;
        return false;
      }
      if (intersects && !initialized) {
        cursor.forEach((axis, index) => { axis.position = hit.getComponent(index); });
        initialized = true;
      }
      for (let index = 0; index < 3; index++) {
        const axis = cursor[index];
        advanceSpring(axis, intersects ? hit.getComponent(index) : axis.position, delta, 10);
        mouse.setComponent(index, axis.position);
      }
      // Shared spring field: the GPU evaluates each voxel's spatial influence.
      // Keep the last cursor when leaving so the affected voxels relax in place.
      advanceSpring(strength, intersects ? 1 : 0, delta, 7);
      return intersects;
    },
  };
}
