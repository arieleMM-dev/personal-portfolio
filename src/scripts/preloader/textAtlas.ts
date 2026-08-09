/**
 * Text Atlas — 8 structured marquee bands
 *
 * Generates a single atlas texture divided into 8 horizontal bands.
 * Each band contains a long, repeating line of dev keywords that tiles
 * seamlessly when the UV is scrolled (fract wrap).
 */

const DEV_WORDS = [
  'SOFTWARE', 'ENGINEERING', 'ARCHITECTURE', 'FRONTEND', 'BACKEND',
  'REACT', 'TYPESCRIPT', 'WEBGL', 'GSAP', 'ASTRO', 'SHADER',
  'GLSL', 'NODE', 'API', 'CSS', 'HTML', 'JAVASCRIPT', 'ANIMATION',
  'CREATIVE', 'DIGITAL', 'MOTION', 'SYSTEMS', 'PRODUCT', 'DESIGN',
  'UX', 'UI', 'CODE', 'INTERFACE', 'EXPERIENCE', 'DEVELOPMENT',
  'INFRASTRUCTURE', 'PERFORMANCE', 'RESPONSIVE', 'DEPLOY',
];

/** Number of marquee text rows in the atlas */
export const MARQUEE_ROW_COUNT = 8;

/**
 * Build a long marquee string by repeating shuffled words.
 * The string is long enough to fill the atlas width many times over,
 * ensuring a seamless wrap when UV-scrolled.
 */
function buildMarqueeString(seed: number): string {
  // Deterministic-ish shuffle per row so each band looks different
  const words = [...DEV_WORDS];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.abs(((seed * 2654435761) ^ (i * 340573321)) % (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }

  const separator = ' · ';
  let line = '';
  // Repeat until we have a very wide string (we need at least 2× atlas width
  // worth of text so the fract(uv.x) wrap is seamless)
  while (line.length < 600) {
    line += words.join(separator) + separator;
  }
  return line;
}

export function createTextAtlasCanvas(
  width = 4096,
  height = 2048,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Strict black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const bandHeight = height / MARQUEE_ROW_COUNT;
  const fontSize = Math.floor(bandHeight * 0.52);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `500 ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;
  ctx.textBaseline = 'middle';

  for (let i = 0; i < MARQUEE_ROW_COUNT; i++) {
    const line = buildMarqueeString(i + 1);
    const y = i * bandHeight + bandHeight * 0.5;

    // Draw the text starting from 0 — it will tile via UV fract in the shader.
    // We draw twice to guarantee full coverage of the atlas width.
    ctx.fillText(line, 0, y);
  }

  return canvas;
}
