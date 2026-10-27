const GLYPHS = 'AEFHKMNPRSTUVXYZ';

/** A short search frontier: only a few letters flicker at the same time. */
export function getScrambleFrame(text: string, progress: number, random: () => number = Math.random): string {
  if (progress >= 1) return text;
  const letters = Array.from(text);
  const scan = Math.max(0, progress) * (letters.length + 2.8);
  return letters.map((letter, index) => {
    if (!/\p{L}/u.test(letter)) return letter;
    const age = scan - index;
    if (age < 0) return '\u00a0';
    const settle = 1.5 + ((index * 7) % 5) * 0.25;
    if (age >= settle) return letter;
    let glyph = GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(random() * GLYPHS.length))];
    if (letter === letter.toLocaleLowerCase()) glyph = glyph.toLocaleLowerCase();
    return glyph;
  }).join('');
}

export function initTextScramble() {
  const abort = new AbortController();
  const { signal } = abort;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  type Search = { text: string; overlay: HTMLElement; start: number | null; bucket: number; duration: number };
  const searches = new Map<HTMLElement, Search>();
  let raf = 0;

  function finish(label: HTMLElement) {
    const search = searches.get(label);
    if (!search) return;
    searches.delete(label);
    search.overlay.remove();
    label.classList.remove('is-scrambling');
    label.style.removeProperty('--scramble-ink');
    if (!searches.size) { cancelAnimationFrame(raf); raf = 0; }
  }
  const stopAll = () => { for (const label of [...searches.keys()]) finish(label); };
  function frame(time: number) {
    raf = 0;
    for (const [label, search] of searches) {
      search.start ??= time;
      const elapsed = time - search.start;
      if (!label.isConnected || elapsed >= search.duration) { finish(label); continue; }
      const bucket = Math.floor(elapsed / 40);
      if (bucket !== search.bucket) {
        search.bucket = bucket;
        search.overlay.textContent = getScrambleFrame(search.text, elapsed / search.duration);
      }
    }
    if (searches.size) raf = requestAnimationFrame(frame);
  }
  function start(label: HTMLElement) {
    if (reduced.matches || document.hidden || searches.has(label)) return;
    const text = label.textContent ?? '';
    if (!text.trim()) return;
    const overlay = document.createElement('span');
    overlay.className = 'scramble-visual';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.textContent = getScrambleFrame(text, 0);
    label.style.setProperty('--scramble-ink', getComputedStyle(label).color);
    searches.set(label, { text, overlay, start: null, bucket: -1, duration: 340 + Math.min(Array.from(text).length, 18) * 4 });
    label.append(overlay);
    label.classList.add('is-scrambling');
    if (!raf) raf = requestAnimationFrame(frame);
  }
  // State/locale updates own the canonical text. Never restore an old string.
  const observer = new MutationObserver(() => {
    for (const [label, search] of searches) {
      const source = [...label.childNodes].filter(node => node !== search.overlay).map(node => node.textContent).join('');
      if (search.overlay.parentElement !== label || source !== search.text) finish(label);
    }
  });
  document.querySelectorAll<HTMLElement>('[data-nav-link], [data-scroll-tracker-link], [data-motion-toggle], [data-audio-toggle]').forEach(control => {
    const label = control.querySelector<HTMLElement>('[data-scramble-label]');
    if (!label) return;
    observer.observe(label, { childList: true, characterData: true, subtree: true });
    control.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') start(label); }, { signal });
    control.addEventListener('pointerleave', () => finish(label), { signal });
    control.addEventListener('focus', () => { if (control.matches(':focus-visible')) start(label); }, { signal });
    control.addEventListener('blur', () => finish(label), { signal });
  });
  reduced.addEventListener('change', stopAll, { signal });
  document.addEventListener('portfolio:language-change', stopAll, { signal });
  document.addEventListener('portfolio:motion-change', stopAll, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); }, { signal });
  return () => { abort.abort(); observer.disconnect(); stopAll(); };
}
