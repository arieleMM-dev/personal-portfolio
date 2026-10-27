import { translations } from '../data/translations.ts';
import { isAmbientPaused } from './motion.ts';
import { createHeroSoundtrack, type SoundCue } from './heroSoundtrack.ts';

export function initHeroAudio() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const button = document.querySelector<HTMLButtonElement>('[data-audio-toggle]');
  if (!hero || !button) return () => {};
  const abort = new AbortController();
  const { signal } = abort;
  const soundtrack = createHeroSoundtrack();
  let enabled = false;
  let pending = false;
  let heroVisible = false;
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
    const active = enabled && !document.hidden && !isAmbientPaused();
    void soundtrack.setActive(active, immediate);
    hero!.dataset.audio = enabled ? active ? 'playing' : 'waiting' : 'muted';
  }
  const observer = new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting && entry.intersectionRatio > 0.08;
    button.classList.toggle('is-over-hero', heroVisible);
  }, { threshold: [0, 0.08, 0.25] });
  observer.observe(hero);
  function cue(kind: SoundCue) {
    if (enabled && !document.hidden && !isAmbientPaused()) soundtrack.playCue(kind);
  }
  const navigation = '[data-nav-link], [data-scroll-tracker-link]';
  document.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;
    const link = event.target.closest(navigation);
    if (!link || (event.relatedTarget instanceof Node && link.contains(event.relatedTarget))) return;
    cue(link.hasAttribute('data-scroll-tracker-link') ? 'tracker' : 'header');
  }, { signal, passive: true });
  document.addEventListener('focusin', event => {
    if (!(event.target instanceof Element) || !event.target.matches(`${navigation}`) || !event.target.matches(':focus-visible')) return;
    cue(event.target.hasAttribute('data-scroll-tracker-link') ? 'tracker' : 'header');
  }, { signal });
  document.addEventListener('portfolio:section-change', () => cue('section'), { signal });
  document.addEventListener('portfolio:tower-pulse', () => {
    if (heroVisible) cue('tower');
  }, { signal });
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
  button.hidden = false;
  reconcile();
  return () => { abort.abort(); observer.disconnect(); soundtrack.destroy(); button.hidden = true; };
}
