/** A passive native scroll listener; no animation loop or GSAP dependency. */
export function initHeroScrollCue(): () => void {
  const cue = document.querySelector<HTMLElement>('[data-hero-scroll-cue]');
  if (!cue) return () => {};

  let hidden: boolean | undefined;
  const update = () => {
    const nextHidden = window.scrollY > 4;
    if (hidden === nextHidden) return;
    hidden = nextHidden;
    cue.classList.toggle('is-hidden', hidden);
    cue.setAttribute('aria-hidden', String(hidden));
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('pageshow', update);
  return () => {
    window.removeEventListener('scroll', update);
    window.removeEventListener('pageshow', update);
  };
}
