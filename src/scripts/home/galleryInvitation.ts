import gsap from 'gsap';

const SVG_NS = 'http://www.w3.org/2000/svg';
let invitationId = 0;

// Pen gestures reveal the actual font, rather than replacing it with drawn glyphs.
const gestures: Record<string, string> = {
  E: 'M.96 .06Q.5 -.05 .25 .15Q-.05 .42 .68 .42Q.06 .39 .08 .78Q.09 1.1 .96 .84',
  x: 'M.1 .08Q.45 .22 .85 .94M.9 .03Q.4 .57 .04 .94',
  p: 'M.24 .13Q.24 .6 .08 1M.2 .22C.95 -.23 1.14 .66 .32 .68',
  l: 'M.16 .83C.96 .12 .7 -.19 .42 .2C.11 .69 .09 1.11 .92 .82',
  o: 'M.78 .12C.05 -.32 -.23 1.18 .6 .92C1.16 .73 1.09 -.02 .55 .06',
  r: 'M.04 .94L.32 .08Q.24 .64 .53 .22Q.81 -.12 .98 .16',
  a: 'M.86 .12C.08 -.24 -.19 1.18 .51 .88Q.85 .65 .87 .1Q.64 1.16 1.04 .84',
  e: 'M.05 .52C.92 .63 1.14 -.21 .45 .1C-.26 .43 .08 1.21 1 .81',
  i: 'M.48 .3Q.2 1.18 .9 .87M.63 .02L.66 .05',
  n: 'M.04 .94L.27 .1L.19 .64C.7 -.3 1.07 -.03 .75 .84Q.75 1 .98 .83',
  c: 'M.95 .2C.45 -.34 -.32 .76 .24 .93Q.57 1.08 .98 .76',
  s: 'M.99 .13C.42 -.23 -.07 .35 .48 .47C1.17 .61 .58 1.3 .04 .83',
  w: 'M.11 .07C-.18 1.31 .48 1.19 .55 .13C.24 1.27 .92 1.12 .97 .02',
  b: 'M.15 .85C.95 .08 .65 -.25 .38 .22C-.06 .94 .28 1.19 .8 .83C1.23 .4 .8 .11 .28 .68',
};

interface InkLetter {
  path: SVGPathElement;
  coverage: SVGRectElement;
  box: { x: number; y: number; width: number; height: number };
}

function svgElement<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string> = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}

function artistBrush(defs: SVGDefsElement, id: string) {
  const wood = svgElement('linearGradient', { id: `${id}-wood`, x1: '0', x2: '1' });
  for (const [offset, color] of [['0', '#665044'], ['.36', '#e0bd8c'], ['.65', '#ac8358'], ['1', '#4b3931']]) {
    wood.append(svgElement('stop', { offset, 'stop-color': color }));
  }
  const metal = svgElement('linearGradient', { id: `${id}-metal`, x1: '0', x2: '1' });
  for (const [offset, color] of [['0', '#61717b'], ['.35', '#edf1e9'], ['.6', '#a1aaa7'], ['1', '#4c5961']]) {
    metal.append(svgElement('stop', { offset, 'stop-color': color }));
  }
  defs.append(wood, metal);
  const brush = svgElement('g', { class: 'gallery-chapter__artist-brush', opacity: '0' });
  brush.append(
    svgElement('path', { d: 'M1 -40L19 -107Q21 -114 25 -112Q29 -111 27 -104L13 -37Z', fill: `url(#${id}-wood)` }),
    svgElement('path', { d: 'M5 -44L23 -106', fill: 'none', stroke: '#f4d6a1', 'stroke-width': '.7', opacity: '.5' }),
    svgElement('path', { d: 'M1 -43L15 -39L9 -20L-5 -24Z', fill: `url(#${id}-metal)` }),
    svgElement('path', { d: 'M-4 -25L10 -21M-3 -29L11 -25', stroke: '#3a4952', 'stroke-width': '.8', opacity: '.7' }),
    svgElement('path', { d: 'M-5 -24L9 -20C11 -9 2 -3 0 0C-1 -7 -11 -13 -5 -24Z', fill: '#c7aa7b' }),
    svgElement('path', { d: 'M-5 -16Q-4 -5 0 0Q7 -6 9 -14Q2 -10 -5 -16Z', fill: '#f1dfbc' }),
    svgElement('path', { d: 'M-3 -22Q-6 -11 0 -2M1 -21Q-1 -10 0 -2M5 -20Q6 -11 1 -3', fill: 'none', stroke: '#766348', 'stroke-width': '.65', opacity: '.7' }),
  );
  return brush;
}

/** A finite, scroll-triggered ink performance. The native link remains usable throughout. */
export function initGalleryInvitation(link: HTMLAnchorElement) {
  const label = link.querySelector<HTMLElement>('[data-invitation-label]');
  const body = link.querySelector<HTMLElement>('.gallery-chapter__button-body');
  if (!label || !body) return;
  const abort = new AbortController(), { signal } = abort;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canMove = () => !reduced.matches && document.documentElement.dataset.motion !== 'paused';
  const moveX = gsap.quickTo(body, 'x', { duration: .65, ease: 'power3.out' });
  const moveY = gsap.quickTo(body, 'y', { duration: .65, ease: 'power3.out' });
  const maskId = `invitation-ink-${++invitationId}`;
  let writing: gsap.core.Timeline | undefined;
  let sheet: SVGSVGElement | undefined;
  let pen: SVGGElement | undefined;
  let letters: InkLetter[] = [];
  let visible = false, played = false, disposed = false, frame = 0;
  let measuredWidth = 0, measuredHeight = 0;

  function resetPointer() {
    moveX(0); moveY(0);
    if (!canMove()) { gsap.killTweensOf(body); gsap.set(body, { x: 0, y: 0 }); }
  }

  function finish() {
    writing?.kill(); writing = undefined;
    link.dataset.inkState = 'ready';
    played = true;
    sheet?.remove(); sheet = undefined; pen = undefined; letters = [];
  }

  function wrapLetters() {
    if (label!.querySelector('.invitation-letter')) return;
    const words = (label!.textContent ?? '').trim().split(/\s+/);
    const fragment = document.createDocumentFragment();
    words.forEach((text, wordIndex) => {
      if (wordIndex) fragment.append(document.createTextNode(' '));
      const word = document.createElement('span'); word.className = 'invitation-word';
      for (const character of Array.from(text)) {
        const letter = document.createElement('span');
        letter.className = 'invitation-letter'; letter.textContent = character; word.append(letter);
      }
      fragment.append(word);
    });
    translations.disconnect(); label!.replaceChildren(fragment);
    translations.observe(label!, { childList: true, characterData: true, subtree: true });
  }

  function prepareInk() {
    if (disposed) return;
    writing?.kill(); writing = undefined;
    sheet?.remove(); sheet = undefined; letters = []; pen = undefined;
    resetPointer();
    const bounds = body!.getBoundingClientRect();
    measuredWidth = bounds.width; measuredHeight = bounds.height;
    if (!bounds.width || !canMove() || document.activeElement === link) { finish(); return; }
    const style = getComputedStyle(label!);
    sheet = svgElement('svg', {
      class: 'gallery-chapter__handwriting', viewBox: `0 0 ${bounds.width} ${bounds.height}`,
      'aria-hidden': 'true', focusable: 'false',
    });
    const defs = svgElement('defs');
    const mask = svgElement('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: '-20', y: '-20', width: `${bounds.width + 40}`, height: `${bounds.height + 40}` });
    defs.append(mask); sheet.append(defs);
    const ink = svgElement('g', { mask: `url(#${maskId})`, fill: 'currentColor' });
    sheet.append(ink); body!.append(sheet);
    // Baseline probes must not retrigger the translation observer.
    translations.disconnect();
    for (const span of label!.querySelectorAll<HTMLElement>('.invitation-letter')) {
      const rect = span.getBoundingClientRect();
      const baseline = document.createElement('span');
      baseline.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      span.append(baseline);
      const y = baseline.getBoundingClientRect().top - bounds.top;
      baseline.remove();
      const character = span.textContent ?? '';
      const glyph = svgElement('text', { x: `${rect.left - bounds.left}`, y: `${y}` });
      glyph.style.fontFamily = style.fontFamily; glyph.style.fontSize = style.fontSize;
      glyph.style.fontStyle = style.fontStyle; glyph.style.fontWeight = style.fontWeight;
      glyph.style.letterSpacing = style.letterSpacing;
      glyph.textContent = character; ink.append(glyph);
      const box = glyph.getBBox();
      if (!box.width || !box.height) continue;
      const path = svgElement('path', {
        d: gestures[character] ?? 'M.12 .9Q.1 -.2 .55 .2T.85 .92',
        transform: `translate(${box.x} ${box.y}) scale(${box.width} ${box.height})`,
        fill: 'none', stroke: 'white', 'stroke-width': '.52', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      });
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`; path.style.strokeDashoffset = `${length}`;
      const coverage = svgElement('rect', { x: `${box.x - 1}`, y: `${box.y - 1}`, width: `${box.width + 2}`, height: `${box.height + 2}`, fill: 'white', opacity: '0' });
      mask.append(path, coverage); letters.push({ path, coverage, box });
    }
    translations.observe(label!, { childList: true, characterData: true, subtree: true });
    pen = artistBrush(defs, maskId);
    sheet.append(pen);
    link.dataset.inkState = 'pending';
    played = false;
    if (visible) write();
  }

  function splash(at: number, x: number, y: number, index: number) {
    if (!sheet || !writing) return;
    const spread = Math.min(1, measuredWidth / 600);
    for (let drop = 0; drop < 7; drop++) {
      const angle = -3.1 + drop * .62 + index * .17;
      const distance = (18 + drop * 6) * spread;
      const dot = svgElement('ellipse', { cx: `${x}`, cy: `${y}`, rx: `${drop % 3 === 0 ? 3.8 : 1.3 + drop * .25}`, ry: `${drop % 3 === 0 ? 1.8 : 1}`, fill: 'currentColor', opacity: '0' });
      sheet.append(dot);
      writing.fromTo(dot, { opacity: 0, x: 0, y: 0, scale: .4, transformOrigin: 'center' }, {
        opacity: .85, x: Math.cos(angle) * distance, y: Math.sin(angle) * distance - 10,
        rotation: angle * 180 / Math.PI, scale: 1, duration: .24, ease: 'power3.out',
      }, at).to(dot, { y: Math.sin(angle) * distance + 18, opacity: 0, scale: .65, duration: .9, ease: 'power2.in' }, at + .24);
    }
  }

  function write() {
    if (disposed || played || writing || !sheet) return;
    if (!canMove()) { finish(); return; }
    link.dataset.inkState = 'writing';
    const penTip = pen!;
    const total = Math.max(letters.length, 1);
    const brushScale = Math.max(.72, Math.min(1.05, measuredWidth / 680));
    function placeBrush(x: number, y: number, rotation = 20, pressure = 1) {
      penTip.setAttribute('transform', `translate(${x} ${y}) rotate(${rotation}) scale(${brushScale * pressure})`);
    }
    writing = gsap.timeline({ onComplete: finish });
    const first = letters[0];
    if (!first) { finish(); return; }
    const firstPoint = first.path.getPointAtLength(0);
    const start = { x: first.box.x + firstPoint.x * first.box.width, y: first.box.y + firstPoint.y * first.box.height };
    const arrival = { value: 0 };
    const reach = Math.min(110, measuredWidth * .2);
    writing.set(penTip, { opacity: 1 }, 0);
    writing.to(arrival, { value: 1, duration: .8, ease: 'power2.inOut', onUpdate() {
      const t = arrival.value;
      placeBrush(start.x - (1 - t) * reach, start.y + (1 - t) * 42 - Math.sin(t * Math.PI) * 46, -25 + t * 45, .8 + t * .2);
    } }, 0);
    splash(.79, start.x, start.y, 0);
    let cursor = .82;
    const lineThreshold = parseFloat(getComputedStyle(label!).fontSize) * .8;
    letters.forEach(({ path, coverage, box }, index) => {
      const preceding = letters[index - 1];
      if (preceding && (box.x - preceding.box.x - preceding.box.width > 5 || Math.abs(box.y - preceding.box.y) > lineThreshold)) {
        const end = preceding.path.getPointAtLength(preceding.path.getTotalLength());
        const next = path.getPointAtLength(0);
        const lift = { value: 0 };
        const from = { x: preceding.box.x + end.x * preceding.box.width, y: preceding.box.y + end.y * preceding.box.height };
        const to = { x: box.x + next.x * box.width, y: box.y + next.y * box.height };
        writing!.to(lift, { value: 1, duration: .22, ease: 'sine.inOut', onUpdate() {
          const t = lift.value;
          placeBrush(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 30, 15 + Math.sin(t * Math.PI) * 30, .86);
        } }, cursor);
        cursor += .22;
      }
      const duration = 3.05 / total * (index === 0 ? 1.8 : 1 + Math.sin(index * 1.8) * .26);
      const length = path.getTotalLength();
      const progress = { value: 0 };
      writing!.to(path, { strokeDashoffset: 0, duration, ease: 'sine.inOut' }, cursor);
      writing!.to(progress, { value: 1, duration, ease: 'sine.inOut', onUpdate() {
        const point = path.getPointAtLength(progress.value * length);
        placeBrush(box.x + point.x * box.width, box.y + point.y * box.height,
          18 + Math.sin(progress.value * Math.PI * 2) * 16 + Math.sin(index) * 8,
          .92 + Math.sin(progress.value * Math.PI) * .16);
      } }, cursor);
      writing!.to(coverage, { attr: { opacity: 1 }, duration: .13, ease: 'sine.out' }, cursor + duration * .8);
      if (index % 5 === 0 || index === total - 1) splash(cursor + duration * .65, box.x + box.width * .8, box.y + box.height * .65, index);
      cursor += duration + (index === 6 || index === 18 ? .14 : .008);
    });
    // A final flick releases ink without drawing a frame around the lettering.
    const last = letters[letters.length - 1];
    const endPoint = last.path.getPointAtLength(last.path.getTotalLength());
    const previousPoint = { x: last.box.x + endPoint.x * last.box.width, y: last.box.y + endPoint.y * last.box.height };
    splash(cursor + .04, previousPoint.x, previousPoint.y - 3, 31);
    const departure = { value: 0 };
    writing.to(departure, { value: 1, duration: .65, ease: 'sine.inOut', onUpdate() {
      const t = departure.value;
      placeBrush(previousPoint.x + t * 22 + Math.sin(t * Math.PI) * 12,
        previousPoint.y - t * 62 - Math.sin(t * Math.PI) * 16,
        20 + Math.sin(t * Math.PI) * 34 - t * 18, 1 - t * .24);
    } }, cursor);
    writing.to(penTip, { opacity: 0, duration: .4 }, cursor + .25);
  }

  function scheduleLayout() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (disposed) return;
      wrapLetters(); prepareInk();
    });
  }
  const translations = new MutationObserver(scheduleLayout);
  wrapLetters();
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .35;
    if (visible) write();
    else if (!entry.isIntersecting && played) scheduleLayout();
    else if (!entry.isIntersecting && writing) { finish(); scheduleLayout(); }
  }, { threshold: [0, .35] });
  visibility.observe(link);
  const resize = new ResizeObserver(() => {
    const rect = body!.getBoundingClientRect();
    if (Math.abs(rect.width - measuredWidth) > 1 || Math.abs(rect.height - measuredHeight) > 1) scheduleLayout();
  });
  resize.observe(body);
  void document.fonts.ready.then(() => { if (!disposed) scheduleLayout(); });

  link.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !canMove() || writing) return;
    const box = link.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
    moveX(x * 6); moveY(y * 4);
  }, { signal, passive: true });
  link.addEventListener('pointerleave', resetPointer, { signal });
  link.addEventListener('blur', resetPointer, { signal });
  // Keyboard users never need to wait for the performance to navigate.
  link.addEventListener('focus', finish, { signal });
  function motionChange() { resetPointer(); if (!canMove()) finish(); }
  document.addEventListener('portfolio:motion-change', motionChange, { signal });
  reduced.addEventListener('change', motionChange, { signal });
  window.addEventListener('pageshow', event => { if (event.persisted) { resetPointer(); finish(); } }, { signal });
  window.addEventListener('pagehide', event => {
    finish(); gsap.killTweensOf(body);
    if (!event.persisted) {
      disposed = true; cancelAnimationFrame(frame); abort.abort();
      translations.disconnect(); visibility.disconnect(); resize.disconnect();
    }
  }, { signal });
}
