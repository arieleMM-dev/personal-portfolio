import { Mesh, Program, Renderer, Triangle } from 'ogl';

// ─── Vertex Shader ───────────────────────────────────────────────────────────

const VERT = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// ─── Fragment Shader ─────────────────────────────────────────────────────────
// Generative noise atmosphere (dark abstract smoke) + water ripples + dynamic color.

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uMouse;
  uniform float uFade;
  uniform vec3  uDynamicColor;

  #define MAX_RIPPLES 2
  uniform vec3 uRipples[MAX_RIPPLES];

  varying vec2 vUv;

  // ── Noise primitives ──────────────────────────────────────────────────

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + vec2(1.7, 2.3);
      a *= 0.5;
    }
    return v;
  }

  // ── Main ──────────────────────────────────────────────────────────────
  void main() {
    vec2 uv = vUv;
    
    vec2 distortion = vec2(0.0);
    float highlight = 0.0;

    for(int i = 0; i < MAX_RIPPLES; i++) {
        float age = uRipples[i].z;
        if(age > 0.0 && age < 15.0) { // Vive mucho tiempo
            vec2 dropPos = uRipples[i].xy;
            float dist = distance(uv, dropPos);
            
            // ONDA LENTA Y GIGANTE: Frecuencia baja (15.0) y Velocidad lenta (1.5)
            float phase = dist * 15.0 - age * 1.5;
            float wave = sin(phase);
            
            // Decaimiento expansivo (viaja por toda la pantalla)
            float decay = max(0.0, 1.0 - (dist * 1.0)) * max(0.0, 1.0 - (age * 0.05));
            decay = smoothstep(0.0, 1.0, decay);
            
            // normalize returns NaN if length is 0, so avoid it
            if (dist > 0.0001) {
                distortion += normalize(uv - dropPos) * wave * decay * 0.05; // Distorsión fuerte
            }
            highlight += max(0.0, cos(phase)) * decay * 0.15; // Brillo sutil en la cresta
        }
    }
    
    // Aplicar distorsión colosal a las coordenadas
    vec2 distortedUV = uv + distortion;

    vec2 p = distortedUV * 2.5;
    float t = uTime * 0.144;

    // ── Mouse influence: deform noise field near cursor ──
    vec2 mouseUV = uMouse;
    float mouseDist = length(distortedUV - mouseUV);
    vec2 mouseDeform = (distortedUV - mouseUV) * smoothstep(0.4, 0.0, mouseDist) * 0.6;

    // ── Generative smoke / dark fluid atmosphere ──
    vec2 flow = vec2(
      fbm(p + mouseDeform + vec2(t, t * 0.7)),
      fbm(p + mouseDeform + vec2(-t * 0.6, t * 1.1) + 4.0)
    );
    float n  = fbm(p + flow * 1.8 + t + mouseDeform);
    float n2 = fbm(p * 1.4 - flow * 0.9 - t * 0.5);

    float fluid = mix(n, n2, 0.45);
    float vignette = 1.0 - length(distortedUV - 0.5) * 0.65;
    float gray = fluid * 0.22 * vignette;

    // Base dark atmosphere — barely visible smoke
    vec3 col = vec3(gray * 0.35 + 0.039); // 0.039 ~ #0a0a0a

    // ── Dynamic cursor glow — soft diffused spotlight ──
    float glowRadius = smoothstep(0.35, 0.0, mouseDist);
    float glowNoise = fbm(p * 3.0 + vec2(t * 2.0, -t * 1.5));
    float glowMask = glowRadius * glowNoise * glowNoise;
    vec3 glowAccent = uDynamicColor * glowMask * 0.35;
    col += glowAccent;

    // Add highlight
    col += uDynamicColor * highlight;

    // ── Scroll fade — submerge into darkness ──
    // Lerp entire output toward base gray when uFade < 1
    vec3 base = vec3(0.039, 0.039, 0.039);
    col = mix(base, col, uFade);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── FluidBackground Class ──────────────────────────────────────────────────

export class FluidBackground {
  private canvas: HTMLCanvasElement;
  private renderer!: Renderer;
  private mesh!: Mesh;
  private rafId = 0;
  private time = 0;
  private active = false;

  // Lerped mouse position for smooth shader response
  private mouseTarget = { x: 0.5, y: 0.5 };
  private mouseLerped = { x: 0.5, y: 0.5 };

  // Scroll-driven fade (1 = full effect, 0 = darkness)
  private fadeValue = 1.0;

  // Global Motor State
  private currentColor = [0.937, 0.267, 0.267]; // Default to #ef4444
  
  private ripples = [
    { x: 0, y: 0, time: 999 },
    { x: 0, y: 0, time: 999 }
  ];
  private ripplesUniform = new Float32Array(2 * 3);
  private rippleTimeoutId: number | null = null;
  private lastTime: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  init() {
    this.renderer = new Renderer({
      canvas: this.canvas,
      alpha: false,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio, 1.5),
    });

    const gl = this.renderer.gl;
    gl.clearColor(0.039, 0.039, 0.039, 1);

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uMouse: { value: [0.5, 0.5] },
        uFade: { value: 1.0 },
        uDynamicColor: { value: this.currentColor },
        uRipples: { value: this.ripplesUniform },
      },
    });

    const geometry = new Triangle(gl);
    this.mesh = new Mesh(gl, { geometry, program });

    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.lastTime = null;
    this.startRippleSpawner();
    this.rafId = requestAnimationFrame(this.loop);
  }

  /** Update the fade uniform — called by ScrollTrigger from homeAnimations */
  setFade(value: number) {
    this.fadeValue = Math.max(0, Math.min(1, value));
  }
  
  setColor(r: number, g: number, b: number) {
    this.currentColor[0] = r;
    this.currentColor[1] = g;
    this.currentColor[2] = b;
  }

  private startRippleSpawner() {
    this.scheduleNextRipple();
  }

  private scheduleNextRipple = () => {
    if (!this.active) return;
    
    // Intervalo aleatorio entre 6000ms y 10000ms
    const delay = 6000 + Math.random() * 4000;
    this.rippleTimeoutId = window.setTimeout(() => {
      let oldest = this.ripples[0];
      for (let i = 1; i < this.ripples.length; i++) {
        if (this.ripples[i].time > oldest.time) {
          oldest = this.ripples[i];
        }
      }
      oldest.x = Math.random();
      oldest.y = Math.random();
      oldest.time = 0.0;
      
      this.scheduleNextRipple();
    }, delay);
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mouseTarget.x = e.clientX / window.innerWidth;
    // Flip Y: UV origin is bottom-left in WebGL
    this.mouseTarget.y = 1.0 - e.clientY / window.innerHeight;
  };

  private loop = (timestamp?: number) => {
    if (!this.active) return;

    const now = timestamp || performance.now();
    if (this.lastTime === null) this.lastTime = now;
    const deltaTime = Math.min((now - this.lastTime) / 1000.0, 0.1);
    this.lastTime = now;

    this.time += deltaTime;

    // Smooth lerp for mouse position
    this.mouseLerped.x += (this.mouseTarget.x - this.mouseLerped.x) * 0.04;
    this.mouseLerped.y += (this.mouseTarget.y - this.mouseLerped.y) * 0.04;

    for (let i = 0; i < 2; i++) {
      this.ripples[i].time += deltaTime;
      this.ripplesUniform[i * 3 + 0] = this.ripples[i].x;
      this.ripplesUniform[i * 3 + 1] = this.ripples[i].y;
      this.ripplesUniform[i * 3 + 2] = this.ripples[i].time;
    }

    const uniforms = this.mesh.program.uniforms;
    uniforms.uTime.value = this.time;
    uniforms.uMouse.value = [this.mouseLerped.x, this.mouseLerped.y];
    uniforms.uFade.value = this.fadeValue;
    uniforms.uDynamicColor.value = this.currentColor;
    uniforms.uRipples.value = this.ripplesUniform;

    this.renderer.render({ scene: this.mesh });
    this.rafId = requestAnimationFrame(this.loop);
  };

  resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.mesh.program.uniforms.uResolution.value = [w, h];
  };

  destroy() {
    this.active = false;
    cancelAnimationFrame(this.rafId);
    if (this.rippleTimeoutId !== null) {
      clearTimeout(this.rippleTimeoutId);
      this.rippleTimeoutId = null;
    }
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
