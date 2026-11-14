import gsap from 'gsap';
import { translations } from '../../data/translations';
import { isAmbientPaused } from '../motion';
import { createExplorerClock } from './explorerClock';
import { initReservationDemo } from './reservationDemo';

export function initArchitectureExplorer(root: HTMLElement | null) {
  if (!root) return () => {};
  const destroyReservation = initReservationDemo(root.querySelector('[data-logic-demo]'));
  const events = new AbortController(), signal = events.signal;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-architecture-stage]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-architecture-panel]')];
  const toggle = root.querySelector<HTMLButtonElement>('[data-architecture-toggle]');
  const clock = createExplorerClock(buttons.length);
  let visible = false, hovered = false, focused = false, userPaused = false, ticking = false, disposed = false;
  let activeIndex = -1, phase = -1;
  const hasKeyboardFocus = () => {
    const active = document.activeElement;
    return !!active && active !== toggle && root.contains(active) && active.matches(':focus-visible');
  };

  function render() {
    const state = clock.state(), changed = activeIndex !== state.index;
    if (changed) {
      activeIndex = state.index; phase = -1;
      root!.dataset.activeStage = buttons[activeIndex].dataset.architectureStage;
      buttons.forEach((button,i) => {
        button.classList.toggle('is-active',i === activeIndex); button.setAttribute('aria-pressed',String(i === activeIndex));
        button.querySelector<HTMLElement>('[data-stage-progress]')?.style.setProperty('transform','scaleX(0)');
      });
      panels.forEach((panel,i) => {
        panel.hidden = i !== activeIndex;
        if (!panel.hidden && !reduced.matches) gsap.fromTo(panel, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .55, ease: 'power3.out', overwrite: true });
      });
    }
    buttons[activeIndex].querySelector<HTMLElement>('[data-stage-progress]')?.style.setProperty('transform',`scaleX(${reduced.matches ? 1 : state.progress})`);
    if (phase !== state.phase || reduced.matches || changed) {
      phase = state.phase;
      panels[activeIndex].querySelectorAll<HTMLElement>('[data-process-step]').forEach(step => {
        const stepPhase = Number(step.dataset.processStep);
        step.classList.toggle('is-current', !reduced.matches && stepPhase === phase);
        step.classList.toggle('is-complete', reduced.matches || stepPhase < phase);
      });
      panels[activeIndex].dataset.processPhase = String(phase);
    }
  }
  function tick(_time: number, delta: number) { clock.advance(Math.min(delta,100)); render(); }
  function sync() {
    const playing = visible && !hovered && !focused && !userPaused && !document.hidden && !reduced.matches && !isAmbientPaused() && !disposed;
    root!.dataset.cycleState = reduced.matches ? 'static' : playing ? 'playing' : 'paused';
    root!.dataset.cycleManualPause = String(userPaused);
    if (playing !== ticking) { ticking = playing; if (playing) gsap.ticker.add(tick); else gsap.ticker.remove(tick); }
    if (toggle) {
      toggle.hidden = reduced.matches;
      toggle.setAttribute('aria-pressed',String(userPaused));
      const key = userPaused ? 'explorer.play' : 'explorer.pause';
      const label = toggle.querySelector<HTMLElement>('[data-cycle-label]');
      if (label) { label.dataset.i18n = key; label.textContent = translations[document.documentElement.lang === 'en' ? 'en' : 'es'][key]; }
    }
    render();
  }
  buttons.forEach((button,i) => {
    const select = () => { if (clock.state().index !== i) { clock.select(i); render(); } };
    button.addEventListener('click',select,{signal});
    button.addEventListener('pointerenter',() => { if (fine.matches) { hovered = true; if (!focused) select(); sync(); } },{signal});
  });
  root.addEventListener('pointerenter',() => { if (fine.matches) { hovered = true; sync(); } },{signal});
  root.addEventListener('pointerleave',() => { hovered = false; sync(); },{signal});
  root.addEventListener('focusin',() => { focused = hasKeyboardFocus(); sync(); },{signal});
  root.addEventListener('focusout',() => { queueMicrotask(() => { if (!disposed) { focused = hasKeyboardFocus(); sync(); } }); },{signal});
  toggle?.addEventListener('click',() => { userPaused = !userPaused; if (!userPaused) { hovered = false; focused = false; } sync(); },{signal});
  document.addEventListener('visibilitychange',sync,{signal});
  document.addEventListener('portfolio:motion-change',sync,{signal});
  document.addEventListener('portfolio:language-change',sync,{signal});
  reduced.addEventListener('change',() => { phase = -1; sync(); },{signal});
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); },{threshold:.15});
  observer.observe(root); sync();
  return () => { disposed = true; events.abort(); observer.disconnect(); gsap.ticker.remove(tick); gsap.killTweensOf(panels); destroyReservation(); };
}
