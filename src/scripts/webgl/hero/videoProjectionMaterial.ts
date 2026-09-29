import * as THREE from 'three';
import { SCALE_RIPPLE_GLSL, SCALE_RIPPLE_NORMAL, type ScaleRippleUniforms } from './scaleRipples.ts';

/** GLSL is kept separate from scene/lifecycle code for tuning and review. */
export const PROJECTION_VERTEX_UNIFORMS = /* glsl */ `
uniform vec3 uMouse;
uniform vec3 uCameraLocal;
uniform float uAttraction;
uniform float uRadius;
uniform float uDisplacement;
varying vec3 vRestPosition;
varying vec3 vProjectionNormal;
${SCALE_RIPPLE_GLSL}
`;

export const PROJECTION_VERTEX = /* glsl */ `
#include <begin_vertex>
// instanceMatrix contains TRANSLATION ONLY; the shared geometry has real size.
vec3 cellCenter = instanceMatrix[3].xyz;
vRestPosition = cellCenter + position;
vProjectionNormal = normal;
float cursorDistance = distance(cellCenter, uMouse);
float influence = 1.0 - smoothstep(0.0, uRadius, cursorDistance);
influence *= influence;
float attraction = influence * uAttraction;
// Local camera direction, NOT global +Z: works throughout a complete rotation.
vec3 towardCamera = normalize(uCameraLocal - cellCenter);
transformed = position * (1.0 + attraction * 0.16);
// Tip each little scale around its trailing edge, with matching PBR normals.
vec3 hinge = -uRippleDirection * uRipplePitch * 0.35;
transformed = rotateScale(transformed - hinge, rippleAxis, ripple.y) + hinge;
transformed += towardCamera * attraction * uDisplacement + uRippleNormal * ripple.x;
// Three applies instanceMatrix afterwards, including in worldpos/transmission.
`;

export const PROJECTION_FRAGMENT_UNIFORMS = /* glsl */ `
uniform float uCubeSize;
uniform float uVideoAspect;
uniform float uVideoReady;
uniform float uBlueMix;
varying vec3 vRestPosition;
varying vec3 vProjectionNormal;

vec2 macroVideoUV() {
  vec3 p = vRestPosition / uCubeSize;
  vec3 n = normalize(vProjectionNormal);
  vec3 axis = abs(n);
  vec2 uv;
  // Box projection: a whole frame per MACRO face, never per little cube.
  if (axis.z >= axis.x && axis.z >= axis.y) uv = vec2(p.x * sign(n.z), p.y);
  else if (axis.x >= axis.y) uv = vec2(-p.z * sign(n.x), p.y);
  else uv = vec2(p.x, -p.z * sign(n.y));
  // Centered cover crop; square faces keep the video's original proportions.
  vec2 cover = vec2(min(1.0, 1.0 / uVideoAspect), min(1.0, uVideoAspect));
  return clamp(uv * cover + 0.5, 0.001, 0.999);
}

vec3 coolVideo(vec3 linearRGB) {
  float luminance = dot(linearRGB, vec3(0.2126, 0.7152, 0.0722));
  // Blue/cyan luminance tint preserves motion/detail without magenta highlights.
  vec3 blue = luminance * vec3(0.12, 0.68, 1.3);
  return mix(linearRGB, blue, uBlueMix);
}
`;

export const PROJECTION_FRAGMENT = /* glsl */ `
vec2 projectionUV = macroVideoUV();
vec4 videoSample = texture2D(map, projectionUV);
#ifdef DECODE_VIDEO_TEXTURE
  videoSample = sRGBTransferEOTF(videoSample);
#endif
// Calm blue fallback remains visible during loading, failed playback or no codec.
float grid = step(0.94, fract(projectionUV.x * 20.0))
  + step(0.94, fract(projectionUV.y * 20.0));
vec3 fallback = vec3(0.012, 0.13, 0.30) + grid * vec3(0.0, 0.025, 0.055);
vec3 projectedVideo = mix(fallback, coolVideo(videoSample.rgb), uVideoReady);
diffuseColor.rgb *= projectedVideo;
`;

export function createVideoProjectionMaterial(texture: THREE.Texture, size: number, rippleUniforms: ScaleRippleUniforms) {
  const uniforms = {
    ...rippleUniforms,
    uMouse: { value: new THREE.Vector3() },
    uCameraLocal: { value: new THREE.Vector3(0, 0, 20) },
    uAttraction: { value: 0 },
    uRadius: { value: 1.25 },
    uDisplacement: { value: 0.85 },
    uCubeSize: { value: size },
    uVideoAspect: { value: 1 },
    uVideoReady: { value: 0 },
    uBlueMix: { value: 0.88 },
  };
  const material = new THREE.MeshPhysicalMaterial({
    map: texture,
    color: 0xbdeaff,
    emissive: 0xffffff,
    emissiveIntensity: 1.125,
    transmission: 0.18,
    thickness: 0.2,
    ior: 1.3,
    roughness: 0.24,
    metalness: 0.08,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.5,
    specularIntensity: 0.3,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${PROJECTION_VERTEX_UNIFORMS}`)
      .replace('#include <beginnormal_vertex>', SCALE_RIPPLE_NORMAL)
      .replace('#include <begin_vertex>', PROJECTION_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PROJECTION_FRAGMENT_UNIFORMS}`)
      .replace('#include <map_fragment>', PROJECTION_FRAGMENT)
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= projectedVideo;');
  };
  material.customProgramCacheKey = () => 'hero-video-box-projection-scales-v2';
  return { material, uniforms };
}
