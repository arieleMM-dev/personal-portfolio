import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';

/** Panel selection is independent of the particle sculpture. */
export function initKnowledgePanels() {
  const events=new AbortController(),signal=events.signal;
  const panels=[...document.querySelectorAll<HTMLElement>('[data-skill-panel]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)'),compact=matchMedia('(max-width: 820px)');
  let active=0;
  function select(index: number){
    const next=(index+panels.length)%panels.length;if(next===active)return;
    const heights=compact.matches&&!reduced.matches?panels.map(panel=>panel.getBoundingClientRect().height):null;
    gsap.killTweensOf(panels);panels.forEach(panel=>panel.style.removeProperty('height'));active=next;
    panels.forEach((panel,i)=>{
      panel.dataset.active=String(i===active);panel.querySelector('button')?.setAttribute('aria-expanded',String(i===active));
      const body=panel.querySelector<HTMLElement>('.skill-panel__body');if(body)body.hidden=i!==active;
    });
    if(heights)panels.forEach((panel,i)=>{
      const height=panel.getBoundingClientRect().height;
      gsap.fromTo(panel,{height:heights[i]},{height,duration:.65,ease:'power3.inOut',overwrite:true,onComplete:()=>{panel.style.removeProperty('height');ScrollTrigger.refresh();}});
    });
    ScrollTrigger.refresh();
  }
  panels.forEach((panel,index)=>{
    const button=panel.querySelector('button');
    panel.addEventListener('pointerenter',()=>{if(fine.matches&&!panels.some(p=>p.contains(document.activeElement)))select(index);},{signal});
    button?.addEventListener('focus',()=>select(index),{signal});button?.addEventListener('click',()=>select(index),{signal});
    button?.addEventListener('keydown',event=>{
      const next=event.key==='ArrowRight'||event.key==='ArrowDown'?(index+1)%panels.length:event.key==='ArrowLeft'||event.key==='ArrowUp'?(index+panels.length-1)%panels.length:event.key==='Home'?0:event.key==='End'?panels.length-1:null;
      if(next===null)return;event.preventDefault();panels[next].querySelector('button')?.focus();
    },{signal});
  });
  compact.addEventListener('change',()=>{gsap.killTweensOf(panels);panels.forEach(panel=>panel.style.removeProperty('height'));ScrollTrigger.refresh();},{signal});
  return()=>{events.abort();gsap.killTweensOf(panels);panels.forEach(panel=>panel.style.removeProperty('height'));};
}
