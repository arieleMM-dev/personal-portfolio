import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

export function initLenis(options: { stopped?: boolean } = {}) {
  if (lenisInstance) return lenisInstance;

  lenisInstance = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.2,
  });

  if (options.stopped) {
    lenisInstance.stop();
    document.documentElement.classList.add('lenis', 'lenis-stopped');
  } else {
    document.documentElement.classList.add('lenis', 'lenis-smooth');
  }

  lenisInstance.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenisInstance?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
}

export function startLenis() {
  if (!lenisInstance) return;

  lenisInstance.start();
  document.documentElement.classList.remove('lenis-stopped');
  document.documentElement.classList.add('lenis-smooth');
}

export function stopLenis() {
  if (!lenisInstance) return;

  lenisInstance.stop();
  document.documentElement.classList.add('lenis-stopped');
  document.documentElement.classList.remove('lenis-smooth');
}

export function getLenis() {
  return lenisInstance;
}

export function scrollTo(target: string | number | HTMLElement, options?: { offset?: number; duration?: number }) {
  lenisInstance?.scrollTo(target, {
    offset: options?.offset ?? 0,
    duration: options?.duration ?? 1.8,
  });
}
