import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { translations } from '../../data/translations';

// This avoids a plain address in the initial HTML, not extraction by advanced bots.
function getContactEmail() {
  const local = ['arielmorillo', 'ct'].join('.');
  const domain = ['gmail', 'com'].join('.');
  return local + '@' + domain;
}

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
        if (!panel.hidden && !reducedMotion.matches) gsap.fromTo(panel, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', overwrite: true });
      });
    }, { signal });
  });

  const ambientElements = [...document.querySelectorAll<HTMLElement>('[data-architecture], [data-ambient-motion]')];
  const visibleElements = new Set<Element>();
  const updateAmbient = () => ambientElements.forEach(element => {
    element.classList.toggle('is-visible', visibleElements.has(element) && !document.hidden && !reducedMotion.matches);
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleElements.add(entry.target);
      else visibleElements.delete(entry.target);
    });
    updateAmbient();
  }, { threshold: 0.15 });
  ambientElements.forEach(element => observer.observe(element));
  document.addEventListener('visibilitychange', updateAmbient, { signal });
  reducedMotion.addEventListener('change', updateAmbient, { signal });

  const disclosureState = new Map<HTMLDetailsElement, boolean>();
  const updateDisclosureLabel = (details: HTMLDetailsElement, open: boolean) => {
    const label = details.querySelector<HTMLElement>('[data-disclosure-label]');
    const key = open ? 'common.collapse' : 'common.expand';
    if (label) {
      label.dataset.i18n = key;
      label.textContent = translations[document.documentElement.lang === 'es' ? 'es' : 'en'][key];
    }
  };
  document.querySelectorAll<HTMLDetailsElement>('[data-disclosure]').forEach(details => {
    const summary = details.querySelector('summary');
    const body = details.querySelector<HTMLElement>('.disclosure__body');
    if (!summary || !body) return;
    summary.addEventListener('click', event => {
      event.preventDefault();
      const open = !(disclosureState.get(details) ?? details.open);
      disclosureState.set(details, open);
      details.dataset.expanded = String(open);
      updateDisclosureLabel(details, open);
      if (reducedMotion.matches) {
        gsap.killTweensOf(body);
        gsap.set(body, { clearProps: 'height,opacity' });
        details.open = open;
        ScrollTrigger.refresh();
        return;
      }
      if (!details.open && open) {
        details.open = true;
        gsap.set(body, { height: 0, opacity: 0 });
      }
      gsap.to(body, {
        height: open ? body.scrollHeight : 0,
        opacity: open ? 1 : 0,
        duration: 0.55,
        ease: 'power2.inOut',
        overwrite: true,
        onComplete: () => {
          details.open = open;
          gsap.set(body, { clearProps: 'height,opacity' });
          ScrollTrigger.refresh();
        },
      });
    }, { signal });
  });

  // Damped, small pointer depth. Uses the existing GSAP ticker, not another render loop.
  const pointerMotion = gsap.matchMedia();
  pointerMotion.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
    const pointerEvents = new AbortController();
    document.querySelectorAll<HTMLElement>('[data-project-visual]').forEach(visual => {
      const media = visual.querySelector<HTMLElement>('[data-project-media]');
      if (!media) return;
      const rotateX = gsap.quickTo(media, 'rotationX', { duration: 1, ease: 'power3.out' });
      const rotateY = gsap.quickTo(media, 'rotationY', { duration: 1, ease: 'power3.out' });
      visual.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse') return;
        const bounds = visual.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
        const y = (event.clientY - bounds.top) / bounds.height * 2 - 1;
        rotateX(-y * 2.5);
        rotateY(x * 3.5);
      }, { signal: pointerEvents.signal, passive: true });
      visual.addEventListener('pointerleave', () => { rotateX(0); rotateY(0); }, { signal: pointerEvents.signal });
    });
    return () => pointerEvents.abort();
  });

  const feedback = document.querySelector<HTMLElement>('[data-copy-feedback]');
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  document.querySelector<HTMLButtonElement>('[data-copy-email]')?.addEventListener('click', () => {
    const copy = navigator.clipboard?.writeText(getContactEmail()) ?? Promise.reject(new Error('Clipboard unavailable'));
    void copy.then(() => {
      if (feedback) feedback.textContent = translations[document.documentElement.lang === 'es' ? 'es' : 'en']['contact.copied'];
    }).catch(() => {
      if (feedback) feedback.textContent = translations[document.documentElement.lang === 'es' ? 'es' : 'en']['contact.copyError'];
    });
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { if (feedback) feedback.textContent = ''; }, 5000);
  }, { signal });
  document.querySelector<HTMLButtonElement>('[data-compose-email]')?.addEventListener('click', () => {
    window.location.href = 'mailto:' + getContactEmail();
  }, { signal });
  document.addEventListener('portfolio:language-change', () => {
    if (feedback) feedback.textContent = '';
    disclosureState.forEach((open, details) => updateDisclosureLabel(details, open));
    ScrollTrigger.refresh();
  }, { signal });
  return () => {
    abort.abort();
    observer.disconnect();
    pointerMotion.revert();
    clearTimeout(feedbackTimer);
    gsap.killTweensOf(document.querySelectorAll('.disclosure__body'));
    if (architecture) gsap.killTweensOf(architecture.querySelectorAll('[data-architecture-panel]'));
  };
}
