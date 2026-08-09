/**
 * Marquee Row Geometry
 *
 * Creates a thin cylindrical strip (single height segment) for one marquee
 * text row. UVs are mapped to a specific horizontal band of the shared
 * text atlas, determined by `bandIndex` and `totalBands`.
 */
import { Geometry, type OGLRenderingContext } from 'ogl';

export interface MarqueeRowOptions {
  /** Cylinder radius */
  radius?: number;
  /** Strip height in world units */
  height?: number;
  /** Number of segments around the circumference */
  radialSegments?: number;
  /** Which band (0-based) this row samples from the atlas */
  bandIndex?: number;
  /** Total number of bands in the atlas */
  totalBands?: number;
}

export function createMarqueeRowGeometry(
  gl: OGLRenderingContext,
  {
    radius = 2.8,
    height = 0.32,
    radialSegments = 80,
    bandIndex = 0,
    totalBands = 8,
  }: MarqueeRowOptions = {},
): Geometry {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const halfH = height / 2;

  // UV vertical range for this band within the atlas
  const vTop = bandIndex / totalBands;
  const vBottom = (bandIndex + 1) / totalBands;

  // Two rings: top (y = +halfH) and bottom (y = -halfH)
  for (let ring = 0; ring <= 1; ring++) {
    const y = ring === 0 ? halfH : -halfH;
    const v = ring === 0 ? vTop : vBottom;

    for (let x = 0; x <= radialSegments; x++) {
      const u = x / radialSegments;
      const theta = u * Math.PI * 2;

      const px = radius * Math.sin(theta);
      const pz = radius * Math.cos(theta);

      vertices.push(px, y, pz);
      normals.push(Math.sin(theta), 0, Math.cos(theta));
      uvs.push(u, v);
    }
  }

  // Build triangle indices between the two rings
  const stride = radialSegments + 1;
  for (let x = 0; x < radialSegments; x++) {
    const a = x;
    const b = x + 1;
    const c = stride + x + 1;
    const d = stride + x;
    indices.push(a, b, d, b, c, d);
  }

  return new Geometry(gl, {
    position: { size: 3, data: new Float32Array(vertices) },
    normal: { size: 3, data: new Float32Array(normals) },
    uv: { size: 2, data: new Float32Array(uvs) },
    index: { data: new Uint16Array(indices) },
  });
}
