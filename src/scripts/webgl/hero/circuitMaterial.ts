import * as THREE from 'three';
import { HERO_PALETTE } from './palette.ts';

/** Pixel inlays on luminous blue glass; retain Three's PBR/transmission shader. */
export function createCircuitMaterial() {
  const time = { value: 0 };
  const material = new THREE.MeshPhysicalMaterial({
    color: HERO_PALETTE.crystal,
    transmission: 0.62,
    opacity: 1,
    thickness: 1.2,
    attenuationColor: HERO_PALETTE.crystalAbsorption,
    attenuationDistance: 7,
    ior: 1.35,
    metalness: 0.02,
    roughness: 0.17,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    specularIntensity: 0.65,
    envMapIntensity: 0.8,
    emissive: HERO_PALETTE.circuit,
    emissiveIntensity: 2.8,
  });
  material.name = 'celestial-pixel-crystal';
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

        float circuitHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec2 circuitUV() {
          vec3 n = abs(normalize(vCircuitNormal));
          if (n.z >= n.x && n.z >= n.y) return vCircuitPosition.xy / vec2(3.2, 5.2) + 0.5;
          if (n.x > n.y) return vCircuitPosition.zy / vec2(2.2, 5.2) + 0.5;
          return vCircuitPosition.xz / vec2(3.2, 2.2) + 0.5;
        }
        float circuitEmission(vec2 uv) {
          // Staggered panels and smaller luminous pixels, like the reference.
          vec2 panelUV = uv * vec2(7.0, 11.0);
          panelUV.x += mod(floor(panelUV.y), 2.0) * 0.5;
          vec2 panelCell = floor(panelUV);
          vec2 panel = fract(panelUV);
          float panelEdge = min(min(panel.x, 1.0 - panel.x), min(panel.y, 1.0 - panel.y));
          float panelAA = max(fwidth(panelUV.x), fwidth(panelUV.y));
          float seams = 1.0 - smoothstep(0.008, 0.008 + panelAA, panelEdge);
          float panelValue = circuitHash(panelCell);
          vec2 pixelUV = uv * vec2(28.0, 44.0);
          vec2 cell = floor(pixelUV);
          vec2 pixel = fract(pixelUV);
          vec2 pixelAA = fwidth(pixelUV);
          vec2 inset = smoothstep(vec2(0.12), vec2(0.12) + pixelAA, pixel)
            * (1.0 - smoothstep(vec2(0.82) - pixelAA, vec2(0.82), pixel));
          float edgeBand = smoothstep(0.18, 0.47, abs(uv.y - 0.5));
          float pixels = inset.x * inset.y * step(mix(0.91, 0.5, edgeBand), circuitHash(cell));
          // A broad, slow scan, never random per-pixel flicker.
          float scan = 0.8 + 0.2 * sin(uv.y * 9.0 - uCircuitTime * 0.55);
          float bus = 1.0 - smoothstep(0.012, 0.012 + panelAA, abs(panel.x - 0.5));
          bus *= step(0.82, panelValue) * 0.16;
          // A broad internal energy gradient gives the crystal luminous depth.
          vec2 core = (uv - vec2(0.4 + sin(uCircuitTime * 0.23) * 0.06, 0.58)) * vec2(3.5, 2.8);
          float innerGlow = exp(-dot(core, core) * 2.0);
          return 0.38 + panelValue * 0.1 + seams * 0.04 + pixels * scan * 0.6 + bus + innerGlow * 0.28;
        }
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 boardUV = circuitUV();
        totalEmissiveRadiance *= circuitEmission(boardUV);
        // Side faces lean blue, front/back cyan; no iridescence or RGB dispersion.
        totalEmissiveRadiance.g *= mix(0.55, 1.0, abs(normalize(vCircuitNormal).z));
      `);
  };
  material.customProgramCacheKey = () => 'hero-pixel-transmission-v3';
  return { material, update(seconds: number) { time.value = seconds; } };
}
