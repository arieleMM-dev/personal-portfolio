import { translations } from '../data/translations.ts';
import { isAmbientPaused } from './motion.ts';
import { createHeroSoundtrack } from './heroSoundtrack.ts';

export function initHeroAudio() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const button = document.querySelector<HTMLButtonElement>('[data-audio-toggle]');
  if (!hero || !button) return () => {};
  const abort = new AbortController();
  const { signal } = abort;
  const soundtrack = createHeroSoundtrack();
  let enabled = false;
  let pending = false;
  let visible = false;
  const language = () => document.documentElement.lang === 'es' ? 'es' : 'en';

  function updateButton() {
    const label = translations[language()][pending ? 'audio.loading' : enabled ? 'audio.mute' : 'audio.enable'];
    const text = button!.querySelector<HTMLElement>('[data-audio-label]');
    if (text) text.textContent = label;
    button!.setAttribute('aria-label', label);
    button!.setAttribute('aria-pressed', String(enabled));
    button!.setAttribute('aria-busy', String(pending));
    button!.disabled = pending;
  }
  function reconcile(immediate = false) {
    const active = enabled && visible && !document.hidden && !isAmbientPaused();
    void soundtrack.setActive(active, immediate);
    hero!.dataset.audio = enabled ? active ? 'playing' : 'waiting' : 'muted';
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio > 0.08;
    reconcile();
  }, { threshold: [0, 0.08, 0.25] });
  observer.observe(hero);
  button.addEventListener('click', async () => {
    const status = hero.querySelector<HTMLElement>('[data-audio-status]');
    if (status) status.textContent = '';
    if (enabled) enabled = false;
    else {
      pending = true;
      updateButton();
      enabled = await soundtrack.unlock();
      if (signal.aborted) return;
      pending = false;
      if (!enabled && status) status.textContent = translations[language()]['audio.unavailable'];
    }
    updateButton();
    reconcile();
  }, { signal });
  document.addEventListener('portfolio:motion-change', () => reconcile(), { signal });
  document.addEventListener('portfolio:language-change', updateButton, { signal });
  document.addEventListener('visibilitychange', () => reconcile(document.hidden), { signal });
  window.addEventListener('pagehide', () => { void soundtrack.setActive(false, true); }, { signal });
  window.addEventListener('pageshow', () => reconcile(), { signal });
  updateButton();
  reconcile();
  return () => { abort.abort(); observer.disconnect(); soundtrack.destroy(); };
}
