import gsap from 'gsap';
import { PreloaderWebGL } from './preloaderWebGL';

const COUNTER_DURATION = 6;
const PHRASE_HOLD = 5.5;
const PHRASE_FADE_IN = 1.2;
const PHRASE_FADE_OUT = 1.2;
const PRELOADER_FADE = 0.6;

/**
 * Candle-flame glow — chaotic, unpredictable intensity fluctuation via GSAP.
 * Drives `--glow-intensity` on the phrase element. Each pulse has a random
 * duration, random target intensity, and random easing to simulate the
 * organic, irregular flicker of a candle in the dark.
 */
function startCandleGlow(el: HTMLElement): { kill: () => void } {
  let killed = false;
  let currentTween: gsap.core.Tween | null = null;

  const eases = ['sine.inOut', 'power1.inOut', 'power2.in', 'power2.out', 'expo.out', 'none'];

  function flicker() {
    if (killed) return;

    // Chaotic ranges — wider than a smooth oscillation
    const intensity = 0.15 + Math.random() * 0.85; // 0.15 → 1.0
    const duration = 0.08 + Math.random() * 1.5;   // 0.08s → 1.58s
    const ease = eases[Math.floor(Math.random() * eases.length)];

    // Occasional sharp spike (20% chance): very fast, very bright
    const isSpike = Math.random() < 0.2;
    const finalIntensity = isSpike ? 0.9 + Math.random() * 0.1 : intensity;
    const finalDuration = isSpike ? 0.04 + Math.random() * 0.1 : duration;

    currentTween = gsap.to(el, {
      '--glow-intensity': finalIntensity,
      duration: finalDuration,
      ease,
      onComplete: flicker,
    });
  }

  // Kick off with a bright start
  el.style.setProperty('--glow-intensity', '0.8');
  flicker();

  return {
    kill() {
      killed = true;
      if (currentTween) currentTween.kill();
    },
  };
}

export function initPreloader(onComplete: () => void) {
  const root = document.querySelector<HTMLElement>('[data-preloader]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-preloader-canvas]');
  const counter = document.querySelector<HTMLElement>('[data-preloader-counter]');
  const progressBar = document.querySelector<HTMLElement>('[data-preloader-progress-bar]');
  const uiWrap = document.querySelector<HTMLElement>('[data-preloader-ui]');
  const phraseEl = document.querySelector<HTMLElement>('[data-preloader-phrase]');
  const skipBtn = document.querySelector<HTMLElement>('[data-preloader-skip]');

  if (!root || !canvas || !counter) {
    onComplete();
    return () => {};
  }

  document.body.classList.add('is-loading');

  const webgl = new PreloaderWebGL(canvas);
  webgl.init();

  const counterState = { value: 0 };
  let fadeTriggered = false;
  let candleTween: { kill: () => void } | null = null;

  const tl = gsap.timeline({
    onComplete: () => {
      if (candleTween) candleTween.kill();
      webgl.destroy();
      root.classList.add('is-hidden');
      document.body.classList.remove('is-loading');
      onComplete();
    },
  });

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      tl.progress(1); // Fast forward to the end
    });
  }

  // ── Phase 1: 6s counter with marquee cylinder ──
  tl.to(counterState, {
    value: 100,
    duration: COUNTER_DURATION,
    ease: 'power2.inOut',
    onUpdate: () => {
      const pct = Math.round(counterState.value);
      counter.textContent = `${pct}%`;
      if (progressBar) {
        progressBar.style.transform = `scaleX(${counterState.value / 100})`;
      }

      // Trigger staggered row fade at 98%
      if (pct >= 98 && !fadeTriggered) {
        fadeTriggered = true;
        webgl.fadeOutRows();
      }
    },
  });

  // ── Phase 2: Fade out the counter/bar UI ──
  tl.to(uiWrap, {
    autoAlpha: 0,
    duration: 0.5,
    ease: 'power2.inOut',
  });

  // Switch WebGL to black screen
  tl.add(() => webgl.enterPhraseMode());

  // ── Phase 3: DOM phrase fade in with incandescence ──
  if (phraseEl) {
    tl.set(phraseEl, { visibility: 'visible' });
    if (skipBtn) tl.set(skipBtn, { visibility: 'visible' });
    
    tl.to(
      phraseEl,
      {
        opacity: 1,
        duration: PHRASE_FADE_IN,
        ease: 'power2.out',
        onStart: () => {
          // Start the candle-flame glow animation
          candleTween = startCandleGlow(phraseEl);
        },
      },
      '-=0.3',
    );
    
    if (skipBtn) {
      tl.to(skipBtn, { opacity: 1, duration: PHRASE_FADE_IN, ease: 'power2.out' }, '<');
    }

    // Hold the phrase on screen
    tl.to({}, { duration: PHRASE_HOLD });

    // ── Phase 4: Fade out phrase ──
    tl.to(phraseEl, {
      opacity: 0,
      duration: PHRASE_FADE_OUT,
      ease: 'power2.inOut',
      onComplete: () => {
        if (candleTween) {
          candleTween.kill();
          candleTween = null;
        }
      },
    });
    
    if (skipBtn) {
      tl.to(skipBtn, { opacity: 0, duration: PHRASE_FADE_OUT, ease: 'power2.inOut' }, '<');
    }
  } else {
    tl.to({}, { duration: PHRASE_HOLD });
  }

  // ── Phase 5: Final preloader fade to Home ──
  tl.to(
    root,
    {
      autoAlpha: 0,
      duration: PRELOADER_FADE,
      ease: 'power2.inOut',
    },
    '-=0.4',
  );

  return () => {
    tl.kill();
    if (candleTween) candleTween.kill();
    webgl.destroy();
  };
}
