import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createHeroEnvironment } from './hero/environment';
import { createMicroservices } from './hero/microservices';
import { createDataParticles } from './hero/particles';
import { createHeroCameraRig, getHeroCrystalScale } from './hero/cameraRig';

export interface HeroSceneController {
  destroy(): void;
}

/** Browser-only entry point. No DOM text, layout or navigation is owned here. */
export async function initHeroScene(canvas: HTMLCanvasElement): Promise<HeroSceneController | null> {
  const normals = await new THREE.TextureLoader().loadAsync(
    `${import.meta.env.BASE_URL}assets/hero/waternormals.jpg`,
  );
  if (!canvas.isConnected) {
    normals.dispose();
    return null;
  }
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
  normals.colorSpace = THREE.NoColorSpace;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'high-performance' });
  } catch (error) {
    normals.dispose();
    canvas.dataset.webglUnavailable = 'true';
    console.warn('Hero: WebGL unavailable; keeping the CSS background.', error);
    return null;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.setClearColor(0x030819);
  renderer.transmissionResolutionScale = 0.65;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040d20, 0.028);
  const focusZ = -2;
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 650);
  const cameraRig = createHeroCameraRig(camera);
  const environment = createHeroEnvironment(scene, renderer, normals, focusZ);
  const services = createMicroservices();
  services.position.set(0, 3.65, focusZ);
  scene.add(services);
  const particles = createDataParticles();
  scene.add(particles.points);

  // Half-float HDR retains emissive radiance above 1 until bloom and OutputPass.
  // Multisample the HDR scene so the thin glass outlines remain stable in motion.
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: Math.min(4, renderer.capabilities.maxSamples),
  });
  const composer = new EffectComposer(renderer, sceneTarget);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.72, 0.65, 1.0);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = new THREE.Vector2();
  let elapsed = 0;
  let lastTimestamp: number | null = null;
  let rafId = 0;
  let visible = true;
  let destroyed = false;
  let contextLost = false;
  let mobile = false;
  let needsFrame = true;

  function updateScene(delta: number): void {
    const reduced = motionPreference.matches;
    if (!reduced) elapsed += delta;
    cameraRig.update(delta, pointer, reduced, mobile);
    services.rotation.y = -0.26 + elapsed * 0.045;
    services.position.y = 3.65 + Math.sin(elapsed * 0.52) * 0.12;
    environment.update(elapsed);
    particles.update(elapsed);
  }

  function frame(timestamp: number): void {
    rafId = 0;
    if (destroyed || contextLost || document.hidden || !visible) return;
    const delta = lastTimestamp === null ? 0 : Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;
    updateScene(delta);
    composer.render(delta);
    needsFrame = false;
    canvas.dataset.sceneReady = 'true';
    if (!motionPreference.matches) rafId = requestAnimationFrame(frame);
  }

  function schedule(): void {
    if (destroyed || contextLost || document.hidden || !visible || rafId) return;
    if (motionPreference.matches && !needsFrame) return;
    lastTimestamp = null;
    rafId = requestAnimationFrame(frame);
  }

  function pause(): void {
    cancelAnimationFrame(rafId);
    rafId = 0;
    lastTimestamp = null;
  }

  function resize(): void {
    if (destroyed) return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    mobile = width < 768;
    // Bound both DPR and total pixels for reflection + transmission + bloom.
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5, Math.sqrt(2_600_000 / (width * height)));
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = mobile ? 55 : 43;
    camera.updateProjectionMatrix();
    // Keep the full diagonal visible even on narrow portrait screens.
    services.scale.setScalar(getHeroCrystalScale(camera.aspect, mobile));
    particles.setPixelRatio(dpr);
    environment.resize(mobile ? 512 : 1024);
    needsFrame = true;
    schedule();
  }

  function onMouseMove(event: MouseEvent): void {
    if (motionPreference.matches || !visible) return;
    const bounds = canvas.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) {
      resetPointer();
      return;
    }
    pointer.set(
      THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1),
      THREE.MathUtils.clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1),
    );
  }
  function resetPointer(): void { pointer.set(0, 0); }
  function onVisibility(): void { if (document.hidden) pause(); else schedule(); }
  function onMotionChange(): void { pause(); needsFrame = true; schedule(); }
  function onContextLost(event: Event): void {
    event.preventDefault();
    contextLost = true;
    pause();
    delete canvas.dataset.sceneReady;
  }
  function onContextRestored(): void { contextLost = false; resize(); }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) schedule(); else pause();
  }, { threshold: 0 });
  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('blur', resetPointer);
  document.documentElement.addEventListener('mouseleave', resetPointer);
  document.addEventListener('visibilitychange', onVisibility);
  motionPreference.addEventListener('change', onMotionChange);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  resize();

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pause();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('blur', resetPointer);
      document.documentElement.removeEventListener('mouseleave', resetPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      motionPreference.removeEventListener('change', onMotionChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      environment.dispose();
      normals.dispose();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          const entries = Array.isArray(object.material) ? object.material : [object.material];
          entries.forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderPass.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      delete canvas.dataset.sceneReady;
    },
  };
}
