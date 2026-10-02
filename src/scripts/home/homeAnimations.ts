import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollTo } from '../lenis';
import type { HeroSceneController } from '../webgl/heroScene';
import { initScrollTracker } from './scrollTracker';
import { initHeroScrollCue } from './heroScrollCue';
import { initPortfolioInteractions } from './portfolioInteractions';

gsap.registerPlugin(ScrollTrigger);

const DIRECTIONS = [
  { x: -48, y: 0 },
  { x: 48, y: 0 },
  { x: 0, y: -36 },
  { x: 0, y: 36 },
  { x: -32, y: 24 },
  { x: 32, y: -24 },
];

const CONFIG = {
  hero: {
    introDelay: 0.15,
    headerDuration: 0.8,
    lettersDuration: 1.1,
    lettersStagger: 0.045,
    subtitleDuration: 1,
    dotScale: 1.8,
    dotDuration: 0.3,
    dotElasticDuration: 0.5,
  },
  stickyHeader: {
    enterDuration: 0.55,
    leaveDuration: 0.45,
    offset: 80,
  }
};

export function initHome() {
  const events = new AbortController();
  const heroCanvas = document.querySelector<HTMLCanvasElement>('[data-hero-scene]');
  const header = document.querySelector<HTMLElement>('[data-header]');
  const headerSticky = document.querySelector<HTMLElement>('[data-header-sticky]');
  const heroTitle = document.querySelector<HTMLElement>('[data-hero-title]');
  const heroSubtitle = document.querySelector<HTMLElement>('[data-hero-subtitle]');
  const heroDot = document.querySelector<HTMLElement>('[data-hero-dot]');
  const letters = document.querySelectorAll<HTMLElement>('[data-hero-letter]');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]');

  const destroyScrollCue = initHeroScrollCue();

  let heroScene: HeroSceneController | null = null;
  let disposed = false;
  if (heroCanvas) {
    void import('../webgl/heroScene')
      .then((module) => disposed ? null : module.initHeroScene(heroCanvas))
      .then((controller) => {
        if (disposed) controller?.destroy();
        else heroScene = controller;
      })
      .catch((error: unknown) => {
        console.warn('Hero background could not load; the page remains available.', error);
      });
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const contentMedia = gsap.matchMedia();

  // ── GSAP Context for Memory Leak Prevention ──────────────────────────
  const ctx = gsap.context(() => {
    // ── Hero Intro Timeline ──────────────────────────────────────────────
    const introTl = gsap.timeline({ delay: CONFIG.hero.introDelay });

    if (header) {
      introTl.to(header, { autoAlpha: 1, duration: CONFIG.hero.headerDuration, ease: 'power2.out' }, 0);
    }

    // Letters: materialise from random directions with blur
    if (letters.length) {
      letters.forEach((letter, i) => {
        const dir = DIRECTIONS[i % DIRECTIONS.length];
        gsap.set(letter, {
          opacity: 0,
          x: dir.x,
          y: dir.y,
          filter: 'blur(8px)',
        });
      });

      introTl.to(
        letters,
        {
          opacity: 1,
          x: 0,
          y: 0,
          filter: 'blur(0px)',
          duration: CONFIG.hero.lettersDuration,
          stagger: { each: CONFIG.hero.lettersStagger, from: 'random' },
          ease: 'power3.out',
        },
        0.2,
      );
    }

    // Subtitle: smooth slide-up after letters
    if (heroSubtitle) {
      introTl.to(
        heroSubtitle,
        {
          opacity: 1,
          y: 0,
          duration: CONFIG.hero.subtitleDuration,
          ease: 'power2.out',
        },
        '-=0.35',
      );
    }

    // The static blue-white dot follows the title introduction.
    if (heroDot) {
      introTl.to(
        heroDot,
        {
          opacity: 1,
          scale: CONFIG.hero.dotScale,
          duration: CONFIG.hero.dotDuration,
          ease: 'power2.out',
        },
        '-=0.5',
      );
      introTl.to(
        heroDot,
        {
          scale: 1,
          duration: CONFIG.hero.dotElasticDuration,
          ease: 'elastic.out(1, 0.4)',
        },
      );
    }

    // ── Sticky Header ScrollTrigger ─────────────────────────────────────
    if (heroTitle && headerSticky) {
      ScrollTrigger.create({
        trigger: heroTitle,
        start: `bottom top+=${CONFIG.stickyHeader.offset}`,
        end: 'bottom top',
        onEnter: () => {
          headerSticky.inert = false;
          headerSticky.setAttribute('aria-hidden', 'false');
          gsap.to(headerSticky, {
            autoAlpha: 1,
            y: 0,
            duration: CONFIG.stickyHeader.enterDuration,
            ease: 'power2.out',
            overwrite: true,
          });
          headerSticky.classList.add('is-active');
        },
        onLeaveBack: () => {
          if (headerSticky.contains(document.activeElement)) {
            header?.querySelector<HTMLElement>('[data-nav-link]')?.focus({ preventScroll: true });
          }
          headerSticky.inert = true;
          headerSticky.setAttribute('aria-hidden', 'true');
          gsap.to(headerSticky, {
            autoAlpha: 0,
            y: -12,
            duration: CONFIG.stickyHeader.leaveDuration,
            ease: 'power2.in',
            overwrite: true,
            onComplete: () => headerSticky.classList.remove('is-active'),
          });
        },
      });
    }

    // ── Nav Link Smooth Scroll ──────────────────────────────────────────
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href?.startsWith('#')) return;
        e.preventDefault();
        
        if (href === '#home') {
          scrollTo(0, { duration: reducedMotion ? 0 : 2 });
          return;
        }

        const target = document.querySelector<HTMLElement>(href);
        if (!target) return;

        scrollTo(target, { duration: reducedMotion ? 0 : 2, offset: parseFloat(getComputedStyle(target).paddingTop) || 0 });
      }, { signal: events.signal });
    });

    if (reducedMotion) introTl.progress(1);
    initContentAnimations(contentMedia);

    initBackToTop(events.signal);
  }); // End GSAP Context

  const destroyTracker = initScrollTracker();
  const destroyInteractions = initPortfolioInteractions();

  return () => {
    disposed = true;
    events.abort();
    ctx.revert(); // Cleans up all GSAP timelines and ScrollTriggers created in this context
    heroScene?.destroy();
    destroyScrollCue();
    contentMedia.revert();
    destroyInteractions();
    destroyTracker?.();
  };
}

/**
 * Content stays readable without JavaScript. Motion is progressively added
 * only after the preloader, with a scroll reveal that adapts to the viewport.
 */
function initContentAnimations(media: gsap.MatchMedia) {
  media.add({
    reduced: '(prefers-reduced-motion: reduce)',
    all: '(min-width: 0px)',
  }, context => {
    const conditions = context.conditions!;
    if (conditions.reduced) {
      gsap.set('[data-reveal], [data-expertise-col]', { clearProps: 'opacity,transform' });
      gsap.set('[data-timeline-progress], [data-project-parallax]', { clearProps: 'transform' });
      return;
    }
    // Scroll-linked rather than one-shot: the entrance also reverses on the way back.
    document.querySelectorAll<HTMLElement>('[data-reveal], [data-expertise-col]').forEach(element => {
      gsap.fromTo(element, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: element, start: 'top 96%', end: 'top 68%', scrub: 0.6, invalidateOnRefresh: true },
      });
    });
    gsap.fromTo('[data-timeline-progress]', { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '[data-timeline]', start: 'top 75%', end: 'bottom 65%', scrub: 0.7, invalidateOnRefresh: true },
    });
    document.querySelectorAll<HTMLElement>('[data-project]').forEach(project => {
      gsap.fromTo(project.querySelector('[data-project-parallax]'), { yPercent: -3 }, {
        yPercent: 3, ease: 'none',
        scrollTrigger: { trigger: project, start: 'top bottom', end: 'bottom top', scrub: 0.9, invalidateOnRefresh: true },
      });
    });
  });
}

/**
 * Premium Back To Top Button Animation
 */
function initBackToTop(signal: AbortSignal) {
  const btn = document.querySelector<HTMLElement>('[data-back-to-top]');
  if (!btn) return;

  const svg = btn.querySelector('svg');

  // Curvilinear Levitation (continuous float) on SVG
  if (svg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(svg,
      { y: -6 },
      {
        y: 6,
        duration: 2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      }
    );
  }

  // ScrollTrigger to show/hide the button when scrolled past 100vh
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top -100%',
    onEnter: () => {
      gsap.to(btn, {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        onStart: () => { btn.style.pointerEvents = 'auto'; }
      });
    },
    onLeaveBack: () => {
      btn.style.pointerEvents = 'none';
      gsap.to(btn, {
        autoAlpha: 0,
        y: 50,
        duration: 0.4,
        ease: 'power3.in',
      });
    }
  });

  btn.addEventListener('click', () => {
    scrollTo(document.body, { duration: 1.5 });
  }, { signal });
}
