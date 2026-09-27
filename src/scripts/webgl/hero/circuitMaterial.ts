import * as THREE from 'three';

/** Procedural circuitry injected into the physical lighting model, not a decal. */
export function createCircuitMaterial() {
  const time = { value: 0 };
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x091322,
    metalness: 0.78,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.85,
    emissive: 0xffffff,
    emissiveIntensity: 2.7,
  });
  material.name = 'polished-obsidian-circuits';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCircuitTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vCircuitPosition;
        varying vec3 vCircuitNormal;
      `)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vCircuitPosition = position;
        vCircuitNormal = normal;
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uCircuitTime;
        varying vec3 vCircuitPosition;
        varying vec3 vCircuitNormal;

        float circuitHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
        float segmentDistance(vec2 p, vec2 a, vec2 b) {
          vec2 ab = b - a;
          return length(p - a - ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0));
        }
        float chipDistance(vec2 p, vec2 halfSize) {
          vec2 q = abs(p) - halfSize;
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        }
        vec2 circuitUV() {
          vec3 n = abs(normalize(vCircuitNormal));
          if (n.z >= n.x && n.z >= n.y) return vCircuitPosition.xy / vec2(3.2, 5.2) + 0.5;
          if (n.x > n.y) return vCircuitPosition.zy / vec2(2.2, 5.2) + 0.5;
          return vCircuitPosition.xz / vec2(3.2, 2.2) + 0.5;
        }
        vec3 circuitEmission(vec2 uv) {
          float aa = max(fwidth(uv.x), fwidth(uv.y)) * 0.8;
          vec3 cyan = vec3(0.015, 0.78, 1.0);
          vec3 violet = vec3(0.44, 0.055, 1.0);
          vec3 glow = vec3(0.0);
          float chip = chipDistance(uv - vec2(0.5, 0.52), vec2(0.096, 0.06));
          for (int lane = 0; lane < 11; lane++) {
            float id = float(lane);
            float x = 0.075 + id * 0.085;
            float start = 0.06 + circuitHash(id + 2.0) * 0.17;
            float end = 0.76 + circuitHash(id + 9.0) * 0.18;
            float bend = 0.28 + circuitHash(id + 5.0) * 0.32;
            float shift = (mod(id, 2.0) * 2.0 - 1.0) * 0.028;
            vec2 a = vec2(x, start);
            vec2 b = vec2(x, bend);
            vec2 c = vec2(x + shift, bend + 0.035);
            vec2 d = vec2(x + shift, end);
            float distanceToTrace = min(segmentDistance(uv, a, b),
              min(segmentDistance(uv, b, c), segmentDistance(uv, c, d)));
            float trace = 1.0 - smoothstep(0.0012, 0.0012 + aa, distanceToTrace);
            trace *= smoothstep(0.0, aa, chip);
            float pad = 1.0 - smoothstep(0.0045, 0.0045 + aa,
              min(length((uv - a) * vec2(1.0, 1.6)), length((uv - d) * vec2(1.0, 1.6))));
            // Small packets travel along the conductive trace, never across the face.
            float phase = fract(uCircuitTime * (0.06 + circuitHash(id) * 0.025) + id * 0.19);
            float packet = exp(-pow((uv.y - mix(start, end, phase)) * 95.0, 2.0));
            vec3 tint = mix(cyan, violet, step(0.68, circuitHash(id + 1.0)));
            glow += tint * (trace * (0.42 + packet * 1.6) + pad * 0.8);
          }
          float chipOutline = 1.0 - smoothstep(0.0014, 0.0014 + aa, abs(chip));
          float innerChip = chipDistance(uv - vec2(0.5, 0.52), vec2(0.08, 0.05));
          float innerOutline = 1.0 - smoothstep(0.0008, 0.0008 + aa, abs(innerChip));
          glow += mix(cyan, violet, 0.25) * (chipOutline * 0.8 + innerOutline * 0.2);
          float border = smoothstep(0.025, 0.05, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
          return glow * border;
        }
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 boardUV = circuitUV();
        totalEmissiveRadiance *= circuitEmission(boardUV);
      `);
  };
  material.customProgramCacheKey = () => 'hero-circuit-physical-v1';
  return { material, update(seconds: number) { time.value = seconds; } };
}
