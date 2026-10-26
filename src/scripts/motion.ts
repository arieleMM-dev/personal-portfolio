import { translations } from '../data/translations.ts';
import { createAmbientCue } from './ambientCue.ts';

export function isAmbientPaused(): boolean {
  return document.documentElement.dataset.motion === 'paused';
}

/** One preference controls decorative motion without interrupting navigation. */
export function initMotionPreference() {
  const abort = new AbortController();
  const cue = createAmbientCue();
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  try {
    if (localStorage.getItem('portfolio-motion') === 'paused') document.documentElement.dataset.motion = 'paused';
  } catch { /* Storage can be unavailable in private or restricted contexts. */ }

  function updateButton() {
    if (!button) return;
    const paused = isAmbientPaused();
    const key = paused ? 'motion.resume' : 'motion.pause';
    const language = document.documentElement.lang === 'es' ? 'es' : 'en';
    const label = button.querySelector<HTMLElement>('[data-motion-label]');
    if (label) label.textContent = translations[language][key];
    button.setAttribute('aria-label', translations[language][key]);
    button.setAttribute('aria-pressed', String(paused));
    button.hidden = media.matches;
  }
  const notify = () => {
    updateButton();
    document.dispatchEvent(new CustomEvent('portfolio:motion-change'));
  };
  button?.addEventListener('click', () => {
    document.documentElement.dataset.motion = isAmbientPaused() ? 'running' : 'paused';
    try { localStorage.setItem('portfolio-motion', document.documentElement.dataset.motion); } catch { /* Optional persistence. */ }
    notify();
    void cue.play(isAmbientPaused());
  }, { signal: abort.signal });
  media.addEventListener('change', notify, { signal: abort.signal });
  document.addEventListener('portfolio:language-change', updateButton, { signal: abort.signal });
  updateButton();
  return () => { abort.abort(); cue.destroy(); };
}
