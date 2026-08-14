import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollTo } from '../lenis';
import { FluidBackground } from '../webgl/fluidBackground';
import { initScrollTracker } from './scrollTracker';

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
  const fluidCanvas = document.querySelector<HTMLCanvasElement>('[data-fluid-canvas]');
  const fluidWrap = document.querySelector<HTMLElement>('[data-fluid-bg]');
  const header = document.querySelector<HTMLElement>('[data-header]');
  const headerSticky = document.querySelector<HTMLElement>('[data-header-sticky]');
  const heroTitle = document.querySelector<HTMLElement>('[data-hero-title]');
  const heroSubtitle = document.querySelector<HTMLElement>('[data-hero-subtitle]');
  const heroContent = document.querySelector<HTMLElement>('[data-hero-content]');
  const heroDot = document.querySelector<HTMLElement>('[data-hero-dot]');
  const letters = document.querySelectorAll<HTMLElement>('[data-hero-letter]');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]');

  let fluid: FluidBackground | null = null;
  let mouseHandler: { destroy: () => void } | null = null;

  const colorEngine = initGlobalColorEngine((r, g, b) => {
    if (fluid) {
      fluid.setColor(r, g, b);
    }
  });

  if (fluidCanvas && fluidWrap) {
    fluid = new FluidBackground(fluidCanvas);
    fluid.init();
    fluidWrap.classList.add('is-active');
    fluid.start();
  }

  // ── GSAP Context for Memory Leak Prevention ──────────────────────────
  const ctx = gsap.context(() => {
    // ── Fluid BG Scroll Fade — submerge into darkness ───────────────────
    const heroSection = document.querySelector<HTMLElement>('[data-hero]');
    if (fluid && heroSection) {
      ScrollTrigger.create({
        trigger: heroSection,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          // progress: 0 = top of Hero visible, 1 = Hero fully scrolled out
          fluid!.setFade(1.0 - self.progress);
        },
      });
    }

    // ── Orbital Canvas Depth of Field (Removed to maintain Z-Index and sharpness) ──

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

    // Orange dot: luminous pop with scale overshoot
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
          gsap.to(headerSticky, {
            autoAlpha: 1,
            y: 0,
            duration: CONFIG.stickyHeader.enterDuration,
            ease: 'power2.out',
          });
          headerSticky.classList.add('is-active');
        },
        onLeaveBack: () => {
          gsap.to(headerSticky, {
            autoAlpha: 0,
            y: -12,
            duration: CONFIG.stickyHeader.leaveDuration,
            ease: 'power2.in',
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
          scrollTo(0, { duration: 2 });
          return;
        }

        const target = document.querySelector<HTMLElement>(href);
        if (!target) return;

        if (target.id === 'expertise' || target.hasAttribute('data-expertise')) {
          const triggers = ScrollTrigger.getAll();
          const sectionTrigger = triggers.find(t => t.trigger === target && (t.pin || t.vars.scrub));
          
          if (sectionTrigger && sectionTrigger.end) {
            const targetScroll = sectionTrigger.end - 20;
            scrollTo(targetScroll, { duration: 2 });
            return;
          }
        }
        
        scrollTo(target, { duration: 2 });
      });
    });

    // ── Mouse Parallax (Hero + Fluid BG) ────────────────────────────────
    mouseHandler = initMouseParallax(heroContent, fluidWrap);

    // ── About: Text Reveal ──────────────────────────────────────────────
    initAboutAnimation();

    // ── Expertise: Pin & Scrub ──────────────────────────────────────────
    initExpertiseAnimation();

    // ── Contact: Fade-in ────────────────────────────────────────────────
    initContactAnimation();

    // ── Native Dynamic Dots ──────────────────────────────────────────────
    initDynamicDots();

    initBackToTop();
  }); // End GSAP Context

  initScrollTracker();

  const cursorTrail = document.getElementById('cursor-trail');
  let cursorCleanup: (() => void) | undefined;
  if (cursorTrail) {
    gsap.set(cursorTrail, { opacity: 1 });
    const trails = cursorTrail.querySelectorAll('.pointer-trail');
    
    if (trails.length) {
      const onMouseMove = (e: MouseEvent) => {
        gsap.to(trails, {
          x: e.clientX,
          y: e.clientY,
          stagger: -0.05,
          ease: 'power2.out',
          duration: 0.3,
          overwrite: 'auto'
        });
      };
      window.addEventListener('mousemove', onMouseMove);
      cursorCleanup = () => {
        window.removeEventListener('mousemove', onMouseMove);
      };
    }
  }

  return () => {
    ctx.revert(); // Cleans up all GSAP timelines and ScrollTriggers created in this context
    fluid?.destroy();
    mouseHandler?.destroy();
    colorEngine.destroy();
    if (cursorCleanup) cursorCleanup();
  };
}

/**
 * Subtle mouse-reactive parallax: hero content shifts ±8px,
 * fluid background wrapper shifts ±15px for depth layering.
 */
function initMouseParallax(
  heroContent: HTMLElement | null,
  fluidWrap: HTMLElement | null,
) {
  if (!heroContent && !fluidWrap) return null;

  // Normalised mouse coords: -1 to 1 from center
  const mouse = { x: 0, y: 0 };
  const lerped = { x: 0, y: 0 };
  let rafId = 0;

  const onMove = (e: MouseEvent) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  };

  const tick = () => {
    // Smooth lerp toward target
    lerped.x += (mouse.x - lerped.x) * 0.06;
    lerped.y += (mouse.y - lerped.y) * 0.06;

    if (heroContent) {
      gsap.set(heroContent, {
        x: lerped.x * -8,
        y: lerped.y * -8,
      });
    }

    if (fluidWrap) {
      gsap.set(fluidWrap, {
        x: lerped.x * 15,
        y: lerped.y * 15,
      });
    }

    rafId = requestAnimationFrame(tick);
  };

  window.addEventListener('mousemove', onMove);
  rafId = requestAnimationFrame(tick);

  return {
    destroy() {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
    },
  };
}

/**
 * Reveal animation for the About section text.
 */
function initAboutAnimation() {
  const section = document.querySelector<HTMLElement>('[data-about]');
  const title = document.querySelector<HTMLElement>('[data-about-title]');
  const text = document.querySelector<HTMLElement>('[data-about-text]');

  if (!section) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
  });

  if (title) {
    gsap.set(title, { opacity: 0, y: 50 });
    tl.to(title, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
    });
  }

  if (text) {
    gsap.set(text, { opacity: 0, y: 30 });
    tl.to(text, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
    }, '-=0.6');
  }
}

/**
 * Expertise section: scroll-triggered cascade reveal for 5 glassmorphism cards.
 * Each card fades in with staggered slide-up. Watermark SVGs receive
 * a subtle parallax Y-shift for immersive depth.
 */
function initExpertiseAnimation() {
  const section = document.querySelector<HTMLElement>('[data-expertise]');
  const columns = document.querySelectorAll<HTMLElement>('[data-expertise-col]');
  const watermarks = document.querySelectorAll<HTMLElement>('[data-expertise-watermark]');
  const title = document.querySelector<HTMLElement>('[data-expertise-title]');

  if (!section || !columns.length) return;

  // Title reveal on enter
  if (title) {
    gsap.set(title, { opacity: 0, y: 30 });
  }

  // Set watermarks to their parallax start position
  if (watermarks.length) {
    gsap.set(watermarks, { yPercent: 15 });
  }

  // Build the scrub timeline
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      // Generous scroll space for 5 cards
      end: () => `+=${window.innerHeight * 1.8}`,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // Title fades in first
  if (title) {
    tl.to(title, {
      opacity: 1,
      y: 0,
      duration: 0.25,
      ease: 'none',
    });
  }

  // Stagger each column reveal — 5 cards cascade
  tl.to(
    columns,
    {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.12,
      ease: 'none',
    },
    title ? 0.12 : 0,
  );

  // Parallax drift on watermarks — runs across the entire timeline
  if (watermarks.length) {
    tl.to(
      watermarks,
      {
        yPercent: -15,
        duration: 1,
        ease: 'none',
      },
      0, // start from the very beginning of the timeline
    );
  }
}

/**
 * Simple fade-in + slide-up for the Contact footer on scroll.
 */
function initContactAnimation() {
  const inner = document.querySelector<HTMLElement>('[data-contact-inner]');

  if (!inner) return;

  gsap.to(inner, {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: inner,
      start: 'top 85%',
      toggleActions: 'play none none reverse',
    },
  });
}

/**
 * Animate the native HTML dynamic dots using GSAP.
 */
function initDynamicDots() {
  // Main section titles
  const mainTitles = document.querySelectorAll<HTMLElement>(
    '[data-about-title], [data-expertise-title], [data-contact-title]'
  );

  mainTitles.forEach((title) => {
    const dot = title.querySelector('.dynamic-dot');
    if (dot) {
      ScrollTrigger.create({
        trigger: title,
        start: 'top 85%',
        onEnter: () => {
          gsap.to(dot, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'back.out(1.7)',
          });
        },
      });
    }
  });

  // Expertise column titles (staggered)
  const expertiseGrid = document.querySelector<HTMLElement>('[data-expertise-grid]');
  if (expertiseGrid) {
    const columnDots = expertiseGrid.querySelectorAll('.dynamic-dot');
    if (columnDots.length) {
      ScrollTrigger.create({
        trigger: expertiseGrid,
        start: 'top 70%', // Adjust depending on when cards fade in
        onEnter: () => {
          gsap.to(columnDots, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.2,
            ease: 'back.out(1.7)',
          });
        },
      });
    }
  }
}

/**
 * Global Color Engine — smooth transitions between 6 vibrant colors
 * over a 12s cycle, updating a CSS variable and a WebGL callback.
 */
function initGlobalColorEngine(onUpdate: (r: number, g: number, b: number) => void) {
  const colors = [
    [239, 68, 68],   // Rojo vibrante (#ef4444)
    [168, 85, 247],  // Morado profundo (#a855f7)
    [59, 130, 246],  // Azul eléctrico (#3b82f6)
    [34, 197, 94],   // Verde esmeralda (#22c55e)
    [249, 115, 22],  // Naranja vibrante (#f97316)
    [236, 72, 153]   // Rosado intenso (#ec4899)
  ];
  const numColors = colors.length;
  const root = document.documentElement;
  let rafId = 0;

  const tick = (time: number) => {
    const duration = 12000;
    const progress = (time % duration) / duration;
    const index = progress * numColors;
    const i1 = Math.floor(index);
    const i2 = (i1 + 1) % numColors;
    const fract = index - i1;

    // Smoothstep for silky transition
    const f = fract * fract * (3.0 - 2.0 * fract);

    const r = colors[i1][0] + (colors[i2][0] - colors[i1][0]) * f;
    const g = colors[i1][1] + (colors[i2][1] - colors[i1][1]) * f;
    const b = colors[i1][2] + (colors[i2][2] - colors[i1][2]) * f;

    root.style.setProperty('--dynamic-glow-color', `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`);
    onUpdate(r / 255, g / 255, b / 255);

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return {
    destroy: () => cancelAnimationFrame(rafId)
  };
}

/**
 * Premium Back To Top Button Animation
 */
function initBackToTop() {
  const btn = document.querySelector<HTMLElement>('[data-back-to-top]');
  if (!btn) return;

  const svg = btn.querySelector('svg');

  // Curvilinear Levitation (continuous float) on SVG
  if (svg) {
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
  });
}
