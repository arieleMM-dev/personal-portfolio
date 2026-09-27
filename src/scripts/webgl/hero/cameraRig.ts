import * as THREE from 'three';

/** Screen-space framing: mouse at the top raises the scene, bottom lowers it. */
export const HERO_CAMERA = {
  pitchTop: -1,
  pitchBottom: 11,
  yawRange: 4.5,
  eyeHeight: 1.05,
  verticalTravel: 0.4,
  lateralTravel: 1.6,
  desktopZ: 18,
  mobileZ: 22,
  // Critically damped response: ~1.5s to reach 95%, independent of frame rate.
  damping: 3.2,
} as const;

/** Leave room for the full diagonal AND camera travel, including tall tablets. */
export function getHeroObjectScale(aspect: number, mobile: boolean): number {
  return Math.min(0.94, aspect * (mobile ? 1.95 : 1.05));
}

/** Owns camera motion only; neither the monolith nor the HTML follows the mouse. */
export function createHeroCameraRig(camera: THREE.PerspectiveCamera) {
  const position = new THREE.Vector2();
  const velocity = new THREE.Vector2();

  return {
    update(delta: number, pointer: Readonly<THREE.Vector2>, reducedMotion: boolean, mobile: boolean): void {
      if (reducedMotion) {
        position.set(0, 0);
        velocity.set(0, 0);
      } else {
        // Exact critically damped spring solution for each input axis. Unlike
        // lerp, velocity starts gently and stays continuous when direction changes.
        const omega = HERO_CAMERA.damping;
        const decay = Math.exp(-omega * delta);
        for (const axis of ['x', 'y'] as const) {
          const target = THREE.MathUtils.clamp(pointer[axis], -1, 1);
          const offset = position[axis] - target;
          const impulse = (velocity[axis] + omega * offset) * delta;
          position[axis] = target + (offset + impulse) * decay;
          velocity[axis] = (velocity[axis] - omega * impulse) * decay;
        }
      }

      // Limit sideways movement in portrait without weakening vertical framing.
      const horizontal = position.x * Math.min(1, camera.aspect / 1.6);
      const pitch = THREE.MathUtils.lerp(HERO_CAMERA.pitchTop, HERO_CAMERA.pitchBottom, (position.y + 1) / 2);
      camera.position.set(
        -horizontal * HERO_CAMERA.lateralTravel,
        HERO_CAMERA.eyeHeight - position.y * HERO_CAMERA.verticalTravel,
        mobile ? HERO_CAMERA.mobileZ : HERO_CAMERA.desktopZ,
      );
      // Do not lookAt the monolith: that would recenter it and cancel the travel.
      camera.rotation.set(
        THREE.MathUtils.degToRad(pitch),
        THREE.MathUtils.degToRad(horizontal * HERO_CAMERA.yawRange),
        -horizontal * 0.004,
        'YXZ',
      );
      camera.updateMatrixWorld();
    },
  };
}
