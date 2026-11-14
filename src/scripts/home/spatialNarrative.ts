import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initKnowledgePanels } from './knowledgePanels';
import { initKnowledgeSculpture } from './knowledgeSculpture';

/** Shared scroll grammar: text acquires ink; compositions acquire space. */
export function initSpatialNarrative() {
  const events = new AbortController(), signal = events.signal;
  const media = gsap.matchMedia();
  let titleContext: gsap.Context | undefined;
  let disposed = false;
  const destroyKnowledge = initKnowledgePanels();
  const destroySculpture = initKnowledgeSculpture();

  // Rebuild from the translated DOM, never from a cached Spanish/English string.
  function paintTitles() {
    titleContext?.revert();
    document.querySelectorAll<HTMLElement>('.section-title').forEach(title => {
      const old = title.querySelector<HTMLElement>('[data-title-content]');
      if (old) old.replaceWith(...Array.from(old.childNodes));
      title.querySelectorAll('.title-paint__mask').forEach(mask => mask.replaceWith(...Array.from(mask.childNodes)));
      title.querySelectorAll('.title-paint__word').forEach(word => word.replaceWith(document.createTextNode(word.textContent ?? '')));
    });
    titleContext = gsap.context(() => {
      document.querySelectorAll<HTMLElement>('.section-title').forEach(title => {
        const text = title.innerText.replace(/\s+/g, ' ').trim();
        const content = document.createElement('span');
        content.dataset.titleContent = ''; content.setAttribute('aria-hidden', 'true');
        content.append(...Array.from(title.childNodes)); title.append(content);
        title.setAttribute('aria-label', text); title.classList.add('title-paint');
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = []; while (walker.nextNode()) nodes.push(walker.currentNode as Text);
        for (const node of nodes) {
          const fragment = document.createDocumentFragment();
          for (const part of (node.textContent ?? '').split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { fragment.append(part); continue; }
            const word = document.createElement('span'); word.className = 'title-paint__word';
            for (const char of Array.from(part)) {
              const letter = document.createElement('span'); letter.className = 'title-paint__letter'; letter.textContent = char; word.append(letter);
            }
            fragment.append(word);
          }
          node.replaceWith(fragment);
        }
        const words = title.querySelectorAll<HTMLElement>('.title-paint__word');
        words.forEach(word => { const mask = document.createElement('span'); mask.className = 'title-paint__mask'; word.replaceWith(mask); mask.append(word); });
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(words, { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.035, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: title, start: 'top 92%', toggleActions: 'play none none reverse' } });
        const letters = title.querySelectorAll('.title-paint__letter');
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.set(letters, { '--ink': '100%' });
        else gsap.fromTo(letters, { '--ink': '0%' }, {
          '--ink': '100%', stagger: { amount: 1.4 }, duration: 0.35, ease: 'none',
          scrollTrigger: { trigger: title, start: 'top 88%', end: 'top 38%', scrub: 0.7, invalidateOnRefresh: true },
        });
      });
    });
  }
  paintTitles();
  document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
  document.addEventListener('portfolio:language-change', () => { paintTitles(); ScrollTrigger.refresh(); }, { signal });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', paintTitles, { signal });

  media.add({ desktop: '(min-width: 761px)', motion: '(prefers-reduced-motion: no-preference)', all: '(min-width: 0px)' }, context => {
    for (const [attribute, anchor] of [['headerTone', '70px'], ['trackerTone', '50%'], ['audioTone', '94%']] as const) {
      document.querySelectorAll<HTMLElement>('#home, [data-surface-tone]').forEach(surface => {
        const tone = surface.dataset.surfaceTone ?? 'dark';
        ScrollTrigger.create({ trigger: surface, start: `top ${anchor}`, end: `bottom ${anchor}`, onEnter: () => { document.documentElement.dataset[attribute] = tone; }, onEnterBack: () => { document.documentElement.dataset[attribute] = tone; } });
      });
    }
    if (!context.conditions!.motion) return;
    gsap.to('.hero__environment', { yPercent: 24, scale: 0.86, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: 1.1, invalidateOnRefresh: true },
    });
    gsap.to('.hero__content', { y: -55, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#home', start: 'top -8%', end: 'bottom 35%', scrub: 0.8 },
    });
    document.querySelectorAll<HTMLElement>('[data-project-stage]').forEach(stage => {
      gsap.fromTo(stage.querySelector('[data-project-parallax]'), { clipPath: 'inset(47% 0 47% 0 round 20px)', scale: 1.06, y: 35 }, {
        clipPath: 'inset(0% 0 0% 0 round 20px)', scale: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: stage, start: 'top 92%', end: 'top 34%', scrub: 0.85, invalidateOnRefresh: true },
      });
    });
    document.querySelectorAll<HTMLElement>('.experience__item').forEach(item => {
      ScrollTrigger.create({ trigger: item, start: 'top 60%', end: 'bottom 40%', toggleClass: 'is-current' });
    });
  });
  return () => {
    disposed = true; events.abort(); media.revert(); titleContext?.revert(); destroyKnowledge(); destroySculpture();
    document.querySelectorAll<HTMLElement>('.title-paint').forEach(title => {
      title.querySelectorAll('.title-paint__mask').forEach(mask => mask.replaceWith(...Array.from(mask.childNodes)));
      title.querySelectorAll('.title-paint__word').forEach(word => word.replaceWith(document.createTextNode(word.textContent ?? '')));
      const content = title.querySelector('[data-title-content]'); if (content) content.replaceWith(...Array.from(content.childNodes));
      title.removeAttribute('aria-label'); title.classList.remove('title-paint');
    });
  };
}
