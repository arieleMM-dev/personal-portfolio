/**
 * PreloaderWebGL — 8 Structured Marquee Rows
 *
 * Layout: 4 rows above center, gap for counter, 4 rows below center.
 * Each row is a thin cylinder that scrolls its UV in alternating directions
 * (gear/cog effect). No wave deformation — pure marquee rotation.
 */
import {
  Camera,
  Mesh,
  type OGLRenderingContext,
  Program,
  Renderer,
  Texture,
  Transform,
} from 'ogl';
import { createMarqueeRowGeometry } from './cylinderGeometry';
import { createTextAtlasCanvas, MARQUEE_ROW_COUNT } from './textAtlas';

export const FINAL_PHRASE =
  'Donde el mundo ve infinitos problemas, se el precursor de infinitas soluciones';

export type PreloaderMode = 'loading' | 'phrase' | 'done';

/* ─── Shaders ─── */

const MARQUEE_VERT = /* glsl */ `
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uScrollX;
  varying vec2 vUv;

  void main() {
    // 1. Scroll horizontal limpio
    // 2. IMPORTANTE: Usamos (1.0 - uv.y) para corregir el texto "boca arriba"
    vUv = vec2(uv.x + uScrollX, 1.0 - uv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MARQUEE_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    // Tiling limpio horizontal
    vec2 uv = vec2(fract(vUv.x), vUv.y);
    float alpha = texture2D(tMap, uv).r;

    // Descartar el fondo del atlas
    if (alpha < 0.08) discard;

    // RESET DE VISIBILIDAD: Renderiza todo en BLANCO INTENSO
    // (Olvida gl_FrontFacing por ahora, necesitamos ver las letras)
    gl_FragColor = vec4(1.0, 1.0, 1.0, uOpacity * alpha);
  }
`;

/* ─── Types ─── */

interface MarqueeRow {
  mesh: Mesh;
  /** Scroll speed (units/frame). Positive = rightward, negative = leftward */
  scrollSpeed: number;
  /** Current UV scroll offset */
  scrollOffset: number;
  /** Current opacity for fade-out */
  opacity: number;
  /** Index (0-7) */
  index: number;
}

/* ─── Layout constants ─── */

const CYLINDER_RADIUS = 2.8;
const ROW_HEIGHT = 0.32;
const ROW_SPACING = 0.36;
/** Half the vertical gap between the top-4 and bottom-4 groups */
const CENTER_GAP_HALF = 0.55;
const BASE_SCROLL_SPEED = 0.06;

/**
 * Compute Y positions for the 4-4 layout.
 *
 *   Row 0:  gap + 3.5 * spacing   (top)
 *   Row 1:  gap + 2.5 * spacing
 *   Row 2:  gap + 1.5 * spacing
 *   Row 3:  gap + 0.5 * spacing
 *        ──── CENTER GAP ────
 *   Row 4: -gap - 0.5 * spacing
 *   Row 5: -gap - 1.5 * spacing
 *   Row 6: -gap - 2.5 * spacing
 *   Row 7: -gap - 3.5 * spacing   (bottom)
 */
function computeRowY(index: number): number {
  if (index < 4) {
    const slot = 3 - index; // 3,2,1,0 for indices 0,1,2,3
    return CENTER_GAP_HALF + (slot + 0.5) * ROW_SPACING;
  } else {
    const slot = index - 4; // 0,1,2,3 for indices 4,5,6,7
    return -(CENTER_GAP_HALF + (slot + 0.5) * ROW_SPACING);
  }
}

/* ─── Main class ─── */

export class PreloaderWebGL {
  private canvas: HTMLCanvasElement;
  private renderer!: Renderer;
  private camera!: Camera;
  private scene!: Transform;
  private rows: MarqueeRow[] = [];
  private atlasTexture!: Texture;
  private rafId = 0;
  private time = 0;
  private mode: PreloaderMode = 'loading';
  private width = 0;
  private height = 0;

  /* Fade-out transition state */
  private fadeOutActive = false;
  private fadeOutResolve: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  init() {
    this.renderer = new Renderer({
      canvas: this.canvas,
      alpha: false,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });

    const gl = this.renderer.gl;
    gl.clearColor(0, 0, 0, 1);

    this.camera = new Camera(gl, { fov: 42, near: 0.1, far: 100 });
    this.camera.position.set(0, 0, 7.2);
    this.scene = new Transform();

    // Build text atlas
    const atlasCanvas = createTextAtlasCanvas();
    this.atlasTexture = new Texture(gl, { generateMipmaps: false });
    this.atlasTexture.image = atlasCanvas;

    this.buildRows(gl);

    // Near-frontal view — micro-tilt just enough to reveal back-wall text
    this.scene.scale.set(0.72, 0.72, 0.72);
    this.scene.rotation.x = 0.05;
    this.scene.rotation.z = 0.0;

    this.resize();
    window.addEventListener('resize', this.resize);
    this.loop();
  }

  private buildRows(gl: OGLRenderingContext) {
    for (let i = 0; i < MARQUEE_ROW_COUNT; i++) {
      const program = new Program(gl, {
        vertex: MARQUEE_VERT,
        fragment: MARQUEE_FRAG,
        uniforms: {
          tMap: { value: this.atlasTexture },
          uScrollX: { value: 0 },
          uOpacity: { value: 1 },
        },
        cullFace: false,
        transparent: true,
        depthTest: true,
      });

      const geometry = createMarqueeRowGeometry(gl, {
        radius: CYLINDER_RADIUS,
        height: ROW_HEIGHT,
        radialSegments: 80,
        bandIndex: i,
        totalBands: MARQUEE_ROW_COUNT,
      });

      const mesh = new Mesh(gl, { geometry, program });
      mesh.setParent(this.scene);

      // Position at the correct Y
      mesh.position.y = computeRowY(i);

      // Alternating direction: even rows → positive, odd rows → negative
      const direction = i % 2 === 0 ? 1 : -1;
      // Slight speed variation per row for organic feel
      const speedVariation = 1 + (i % 3) * 0.08;
      const scrollSpeed = BASE_SCROLL_SPEED * direction * speedVariation;

      this.rows.push({
        mesh,
        scrollSpeed,
        scrollOffset: 0,
        opacity: 1,
        index: i,
      });
    }
  }

  /**
   * Trigger a staggered fade-out of all rows.
   * Each row accelerates in its scroll direction while fading to opacity 0.
   * Returns a Promise that resolves when all rows are invisible.
   */
  fadeOutRows(): Promise<void> {
    if (this.fadeOutActive) {
      return Promise.resolve();
    }
    this.fadeOutActive = true;

    return new Promise((resolve) => {
      this.fadeOutResolve = resolve;

      const staggerDelay = 0.12; // seconds between each row start
      const fadeDuration = 0.6; // seconds for each row to fully fade
      const now = this.time;

      this.rows.forEach((row) => {
        // Rows fade from outside→inside: top rows (0,1,2,3) and bottom rows (7,6,5,4)
        // Stagger order: 0, 7, 1, 6, 2, 5, 3, 4
        let staggerIndex: number;
        if (row.index < 4) {
          staggerIndex = row.index * 2; // 0→0, 1→2, 2→4, 3→6
        } else {
          staggerIndex = (7 - row.index) * 2 + 1; // 7→1, 6→3, 5→5, 4→7
        }

        const startTime = now + staggerIndex * staggerDelay;
        (row as any)._fadeStart = startTime;
        (row as any)._fadeDuration = fadeDuration;
      });
    });
  }

  enterPhraseMode() {
    this.mode = 'phrase';
  }

  setCylinderOpacity(v: number) {
    this.rows.forEach((row) => {
      row.opacity = v;
      row.mesh.program.uniforms.uOpacity.value = v;
    });
  }

  private updateLoading() {
    let allFadedOut = true;

    this.rows.forEach((row) => {
      // --- Fade-out logic ---
      if (this.fadeOutActive) {
        const fadeStart = (row as any)._fadeStart as number | undefined;
        const fadeDuration = (row as any)._fadeDuration as number | undefined;

        if (fadeStart != null && fadeDuration != null) {
          const elapsed = this.time - fadeStart;
          if (elapsed >= 0) {
            const progress = Math.min(elapsed / fadeDuration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            row.opacity = 1 - eased;

            // Accelerate scroll in original direction during fade
            const accelFactor = 1 + eased * 4;
            row.mesh.program.uniforms.uScrollX.value =
              (row.scrollOffset + row.scrollSpeed * accelFactor * 0.016) % 1;
            row.scrollOffset = row.mesh.program.uniforms.uScrollX.value;
          } else {
            // Not started yet
            allFadedOut = false;
            row.scrollOffset += row.scrollSpeed * 0.016;
            row.mesh.program.uniforms.uScrollX.value = row.scrollOffset % 1;
          }

          if (row.opacity > 0.001) {
            allFadedOut = false;
          }
        }
      } else {
        // Normal scrolling
        row.scrollOffset += row.scrollSpeed * 0.016;
        row.mesh.program.uniforms.uScrollX.value = row.scrollOffset % 1;
        allFadedOut = false;
      }

      row.mesh.program.uniforms.uOpacity.value = row.opacity;
    });

    // Very gentle Y sway — keeps view nearly frontal
    this.scene.rotation.y = Math.sin(this.time * 0.1) * 0.02;

    // Check if all faded
    if (this.fadeOutActive && allFadedOut && this.fadeOutResolve) {
      this.fadeOutResolve();
      this.fadeOutResolve = null;
    }
  }

  private renderLoading() {
    this.camera.position.set(0, 0, 7.2);
    this.camera.lookAt([0, 0, 0]);
    this.renderer.render({ scene: this.scene, camera: this.camera });
  }

  private renderBlack() {
    const gl = this.renderer.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private loop = () => {
    this.time += 0.016;

    if (this.mode === 'loading') {
      this.updateLoading();
      this.renderLoading();
    } else if (this.mode === 'phrase') {
      this.renderBlack();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.perspective({ aspect: this.width / this.height });
  };

  destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resize);
    this.mode = 'done';
    this.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
