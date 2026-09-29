import * as THREE from 'three';

export const SCALE_RIPPLE = {
  firstDelayMin: 3.5, firstDelayMax: 5.5,
  restMin: 4.8, restMax: 9.2,
  durationMin: 2.6, durationMax: 3.5,
  amplitudeMin: 0.15, amplitudeMax: 0.25,
  radiusMin: 0.95, radiusMax: 1.4,
  tiltMax: 0.2,
} as const;

/** One local involuntary wave at a time, driven by the scene's pausable clock. */
export function createScaleRipples(size: number, divisions: number, random: () => number = Math.random) {
  const pitch = size / divisions;
  const faceDepth = (size - pitch) / 2;
  const uniforms = {
    uRippleTime: { value: 0 },
    uRippleStart: { value: 0 },
    uRippleDuration: { value: SCALE_RIPPLE.durationMin as number },
    uRippleAmplitude: { value: 0 },
    uRippleRadius: { value: SCALE_RIPPLE.radiusMin as number },
    uRippleTilt: { value: 0 },
    uRipplePitch: { value: pitch },
    uRippleFaceDepth: { value: faceDepth },
    uRippleOrigin: { value: new THREE.Vector3(0, 0, faceDepth) },
    uRippleNormal: { value: new THREE.Vector3(0, 0, 1) },
    uRippleDirection: { value: new THREE.Vector3(1, 0, 0) },
  };
  const faces = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
  ];
  const towardEye = new THREE.Vector3();
  const basisU = new THREE.Vector3();
  const basisV = new THREE.Vector3();
  const range = (min: number, max: number) => min + random() * (max - min);
  const firstDelay = () => range(SCALE_RIPPLE.firstDelayMin, SCALE_RIPPLE.firstDelayMax);
  let nextStart = firstDelay();
  let lastTime = 0;
  let wasEnabled = true;
  let active = false;

  return {
    uniforms,
    get active() { return active; },
    update(time: number, cameraLocal: Readonly<THREE.Vector3>, enabled = true): void {
      const interrupted = !wasEnabled || time < lastTime || time - lastTime > 1;
      lastTime = time;
      wasEnabled = enabled;
      uniforms.uRippleTime.value = time;
      if (!enabled || interrupted) {
        active = false;
        uniforms.uRippleAmplitude.value = 0;
        if (enabled) nextStart = time + firstDelay();
        return;
      }
      if (active && time >= uniforms.uRippleStart.value + uniforms.uRippleDuration.value) {
        active = false;
        uniforms.uRippleAmplitude.value = 0;
      }
      if (active || time < nextStart) return;

      // Favor faces actually visible at launch, including after a full rotation.
      // Local coordinates keep the patch attached to the rotating cube.
      towardEye.copy(cameraLocal).normalize();
      const visibleFaces = faces.filter((face) => face.dot(towardEye) > 0.24);
      const candidates = visibleFaces.length ? visibleFaces : faces;
      const normal = uniforms.uRippleNormal.value.copy(candidates[Math.floor(random() * candidates.length)]);
      basisU.set(0, Math.abs(normal.y) > 0.9 ? 0 : 1, Math.abs(normal.y) > 0.9 ? 1 : 0);
      basisU.cross(normal).normalize();
      basisV.crossVectors(normal, basisU);
      const angle = random() * Math.PI * 2;
      uniforms.uRippleDirection.value.copy(basisU).multiplyScalar(Math.cos(angle)).addScaledVector(basisV, Math.sin(angle));
      uniforms.uRippleOrigin.value.copy(normal).multiplyScalar(faceDepth)
        .addScaledVector(basisU, range(-size * 0.2, size * 0.2))
        .addScaledVector(basisV, range(-size * 0.2, size * 0.2));
      uniforms.uRippleRadius.value = range(SCALE_RIPPLE.radiusMin, SCALE_RIPPLE.radiusMax);
      uniforms.uRippleAmplitude.value = range(SCALE_RIPPLE.amplitudeMin, SCALE_RIPPLE.amplitudeMax);
      uniforms.uRippleTilt.value = range(0.12, SCALE_RIPPLE.tiltMax);
      uniforms.uRippleDuration.value = range(SCALE_RIPPLE.durationMin, SCALE_RIPPLE.durationMax);
      // Scheduled timestamp, not current frame: cadence does not depend on FPS.
      uniforms.uRippleStart.value = nextStart;
      nextStart += uniforms.uRippleDuration.value + range(SCALE_RIPPLE.restMin, SCALE_RIPPLE.restMax);
      active = true;
    },
  };
}

export type ScaleRippleUniforms = ReturnType<typeof createScaleRipples>['uniforms'];

export const SCALE_RIPPLE_GLSL = /* glsl */ `
uniform float uRippleTime;
uniform float uRippleStart;
uniform float uRippleDuration;
uniform float uRippleAmplitude;
uniform float uRippleRadius;
uniform float uRippleTilt;
uniform float uRipplePitch;
uniform float uRippleFaceDepth;
uniform vec3 uRippleOrigin;
uniform vec3 uRippleNormal;
uniform vec3 uRippleDirection;

vec3 rotateScale(vec3 point, vec3 axis, float angle) {
  float c = cos(angle), s = sin(angle);
  return point * c + cross(axis, point) * s + axis * dot(axis, point) * (1.0 - c);
}

// x: normal displacement, y: hinge angle. Identical for every vertex in a cell.
vec2 scaleRipple(vec3 center) {
  if (uRippleAmplitude <= 0.0) return vec2(0.0);
  float progress = clamp((uRippleTime - uRippleStart) / uRippleDuration, 0.0, 1.0);
  float envelope = smoothstep(0.0, 0.16, progress) * (1.0 - smoothstep(0.78, 1.0, progress));
  float layerDistance = abs(dot(center, uRippleNormal) - uRippleFaceDepth);
  float faceMask = 1.0 - smoothstep(uRipplePitch * 0.1, uRipplePitch * 0.5, layerDistance);
  vec3 relative = center - uRippleOrigin;
  vec3 planar = relative - uRippleNormal * dot(relative, uRippleNormal);
  float patchMask = 1.0 - smoothstep(uRippleRadius * 0.62, uRippleRadius, length(planar));
  float front = mix(-uRippleRadius - 0.55, uRippleRadius + 0.55, progress);
  float q = (dot(planar, uRippleDirection) - front) / 0.32;
  float crest = exp(-q * q * 1.3);
  float tail = q + 1.5;
  // A small, softer recoil follows the crest; no perpetual oscillation.
  float wave = crest - 0.18 * exp(-tail * tail * 1.6);
  float mask = faceMask * patchMask * envelope;
  return vec2(wave * uRippleAmplitude, clamp(-q * crest * 2.0, -1.0, 1.0) * uRippleTilt) * mask;
}
`;

export const SCALE_RIPPLE_NORMAL = /* glsl */ `
#include <beginnormal_vertex>
vec2 ripple = scaleRipple(instanceMatrix[3].xyz);
vec3 rippleAxis = normalize(cross(uRippleNormal, uRippleDirection));
objectNormal = rotateScale(objectNormal, rippleAxis, ripple.y);
#ifdef USE_TANGENT
  objectTangent = rotateScale(objectTangent, rippleAxis, ripple.y);
#endif
`;
