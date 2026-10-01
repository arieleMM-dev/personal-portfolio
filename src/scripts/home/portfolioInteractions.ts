import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { translations } from '../../data/translations';

export function initPortfolioInteractions() {
  const abort = new AbortController();
  const signal = abort.signal;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const architecture = document.querySelector<HTMLElement>('[data-architecture]');
  architecture?.querySelectorAll<HTMLButtonElement>('[data-architecture-stage]').forEach(button => {
    button.addEventListener('click', () => {
      architecture.dataset.activeStage = button.dataset.architectureStage;
      architecture.querySelectorAll<HTMLButtonElement>('[data-architecture-stage]').forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      architecture.querySelectorAll<HTMLElement>('[data-architecture-panel]').forEach(panel => {
        panel.hidden = panel.dataset.architecturePanel !== button.dataset.architectureStage;
        if (!panel.hidden && !reducedMotion.matches) gsap.fromTo(panel, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.35, overwrite: true });
      });
    }, { signal });
  });

  // A lightweight pointer light; no additional rendering loop or WebGL scene.
  document.querySelectorAll<HTMLElement>('[data-surface]').forEach(surface => {
    surface.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty('--px', `${event.clientX - bounds.left}px`);
      surface.style.setProperty('--py', `${event.clientY - bounds.top}px`);
    }, { signal, passive: true });
  });
  document.querySelectorAll<HTMLDetailsElement>('details').forEach(details => {
    details.addEventListener('toggle', () => ScrollTrigger.refresh(), { signal });
  });

  const video = document.querySelector<HTMLVideoElement>('[data-preview-video]');
  let videoVisible = false;
  const updateVideo = () => {
    if (!video) return;
    if (videoVisible && !reducedMotion.matches && !document.hidden) void video.play().catch(() => {});
    else video.pause();
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.target === architecture) architecture?.classList.toggle('is-visible', entry.isIntersecting);
      if (entry.target === video) { videoVisible = entry.isIntersecting; updateVideo(); }
    });
  }, { threshold: 0.15 });
  if (architecture) observer.observe(architecture);
  if (video) observer.observe(video);
  reducedMotion.addEventListener('change', updateVideo, { signal });
  document.addEventListener('visibilitychange', updateVideo, { signal });

  const emailButton = document.querySelector<HTMLButtonElement>('[data-copy-email]');
  const feedback = document.querySelector<HTMLElement>('[data-copy-feedback]');
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  emailButton?.addEventListener('click', () => {
    const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
    const copy = navigator.clipboard?.writeText(emailButton.dataset.copyEmail ?? '') ?? Promise.reject(new Error('Clipboard unavailable'));
    void copy.then(() => {
      if (feedback) feedback.textContent = translations[lang]['contact.copied'];
    }).catch(() => {
      if (feedback) feedback.textContent = translations[lang]['contact.copyError'];
    });
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { if (feedback) feedback.textContent = ''; }, 5000);
  }, { signal });
  document.addEventListener('portfolio:language-change', () => {
    if (feedback) feedback.textContent = '';
    ScrollTrigger.refresh();
  }, { signal });
  return () => {
    abort.abort();
    observer.disconnect();
    video?.pause();
    clearTimeout(feedbackTimer);
    if (architecture) gsap.killTweensOf(architecture.querySelectorAll('[data-architecture-panel]'));
  };
}
