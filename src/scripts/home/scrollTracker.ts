import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollTo } from '../lenis';

gsap.registerPlugin(ScrollTrigger);

export function initScrollTracker() {
  const tracker = document.querySelector('[data-scroll-tracker]');
  if (!tracker) return;

  const links = document.querySelectorAll<HTMLAnchorElement>('[data-scroll-tracker-link]');
  const progressLine = document.querySelector<HTMLElement>('[data-scroll-tracker-progress]');

  // Animate global progress spark over the whole document - Eliminado

  function activateLink(activeLink: HTMLAnchorElement) {
    links.forEach(l => l.classList.remove('is-active'));
    activeLink.classList.add('is-active');
  }

  // Bind sections to their respective tracker links
  links.forEach(link => {
    const sectionId = link.getAttribute('data-scroll-tracker-link');
    if (!sectionId) return;
    
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    ScrollTrigger.create({
      trigger: targetSection,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => activateLink(link),
      onEnterBack: () => activateLink(link),
    });

    // Smooth scroll via Lenis for click
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const sectionId = link.getAttribute('data-scroll-tracker-link');
      if (sectionId === 'home') {
        scrollTo(0, { duration: 1.5 });
        return;
      }
      
      if (!targetSection) return;
      
      if (targetSection.id === 'expertise' || targetSection.hasAttribute('data-expertise')) {
        const triggers = ScrollTrigger.getAll();
        const sectionTrigger = triggers.find(t => t.trigger === targetSection && (t.pin || t.vars.scrub));
        
        if (sectionTrigger && sectionTrigger.end) {
          const targetScroll = sectionTrigger.end - 20;
          scrollTo(targetScroll, { duration: 1.5 });
          return;
        }
      }
      
      scrollTo(targetSection, { duration: 1.5 });
    });
  });

  // Ensure calculations are accurate after initial setup
  ScrollTrigger.refresh();
}
