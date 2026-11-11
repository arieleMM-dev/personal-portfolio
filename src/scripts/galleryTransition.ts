import gsap from 'gsap';
import { GALLERY_HANDOFF_KEY, galleryTransitionDestination, parseGalleryHandoff, type GalleryHandoff } from './gallery/transitionState';

type TransitionEvent=Event&{viewTransition?:{skipTransition():void}};

/** One viewport snapshot for departure; ordinary document navigation underneath. */
export function initGalleryTransition() {
  const root=document.documentElement;
  const whiteElement=document.querySelector<HTMLElement>('[data-gallery-white]');
  const displacementElement=document.querySelector<SVGFEDisplacementMapElement>('[data-gallery-displacement]');
  if(!whiteElement||!displacementElement)return;
  const white=whiteElement,displacement=displacementElement;
  const abort=new AbortController(),{signal}=abort;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let working=false,sequence=0,transition:ViewTransition|undefined;
  let readiness:()=>void=()=>{};
  const motionAllowed=()=>!reduced.matches&&root.dataset.motion!=='paused';

  function reset() {
    ++sequence;working=false;readiness();transition?.skipTransition();transition=undefined;
    gsap.killTweensOf([white,root,displacement]);
    delete root.dataset.galleryArrival;delete root.dataset.galleryDeparture;
    root.style.removeProperty('--gallery-arrival-blur');root.style.removeProperty('--gallery-transition-origin');
    white.style.removeProperty('opacity');displacement.setAttribute('scale','0');document.body.inert=false;
  }
  function readHandoff() {
    try{return parseGalleryHandoff(sessionStorage.getItem(GALLERY_HANDOFF_KEY),location.pathname);}catch{return null;}
  }
  function waitForPage() {
    return new Promise<void>(resolve=>{
      const ready=()=>root.dataset.galleryArrival==='return'?root.dataset.portfolioReady==='true':root.dataset.webgl==='ready'||root.dataset.webgl==='fallback';
      if(ready()){resolve();return;}
      const observer=new MutationObserver(()=>{if(ready())finish();});
      const timeout=setTimeout(finish,4000);
      function finish(){clearTimeout(timeout);observer.disconnect();readiness=()=>{};resolve();}
      readiness=finish;observer.observe(root,{attributes:true,attributeFilter:['data-webgl','data-portfolio-ready']});
    });
  }
  async function arrive(handoff:GalleryHandoff) {
    const request=++sequence;working=true;root.dataset.galleryArrival=handoff.mode;
    root.style.setProperty('--gallery-arrival-blur','16px');
    white.style.opacity='1';document.body.inert=true;
    try{sessionStorage.removeItem(GALLERY_HANDOFF_KEY);}catch{/* The handoff also expires. */}
    const hold=gsap.delayedCall(.95,()=>{});
    const fonts=Promise.race([document.fonts.ready,new Promise<void>(resolve=>setTimeout(resolve,700))]);
    await Promise.all([waitForPage(),hold.then(),fonts]);
    if(signal.aborted||request!==sequence)return;
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    if(request!==sequence)return;
    const duration=motionAllowed()?1.85:0;
    const reveal=gsap.timeline().to(white,{opacity:0,duration,ease:'sine.inOut'},0)
      .to(root,{'--gallery-arrival-blur':'0px',duration,ease:'power2.out'},0);
    await reveal.then();
    if(request!==sequence)return;
    reset();
    if(handoff.focus){
      const title=document.querySelector<HTMLElement>(handoff.mode==='enter'?'#threshold-title':'#gallery-chapter-title');
      if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
    }
  }
  async function depart(link:HTMLAnchorElement,event:MouseEvent) {
    if(event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
    const mode=link.hasAttribute('data-gallery-entry')?'enter':'return';
    const destination=galleryTransitionDestination(link.href,location.href,import.meta.env.BASE_URL,mode);
    if(!destination)return;
    if(working){event.preventDefault();return;}
    if(!motionAllowed())return;
    const handoff:GalleryHandoff={mode,path:destination.pathname,time:Date.now(),focus:event.detail===0};
    // If persistence is blocked, retain the fully functional native link/fade.
    try{sessionStorage.setItem(GALLERY_HANDOFF_KEY,JSON.stringify(handoff));}catch{return;}
    event.preventDefault();working=true;const request=++sequence;
    root.dataset.galleryDeparture=mode;document.body.inert=true;
    root.style.setProperty('--gallery-transition-origin',`${event.clientX||innerWidth/2}px ${event.clientY||innerHeight/2}px`);
    const duration=1.1;
    try {
      if(typeof document.startViewTransition==='function') {
        transition=document.startViewTransition(()=>{white.style.opacity='1';});
        await transition.ready;
        gsap.to(displacement,{attr:{scale:mode==='enter'?155:-155},duration,ease:'power2.in'});
        await transition.finished;
      }else{
        await gsap.to(white,{opacity:1,duration,ease:'sine.inOut'}).then();
      }
    }catch{
      transition?.skipTransition();white.style.opacity='1';
      await gsap.to(white,{opacity:1,duration:.2}).then();
    }
    if(signal.aborted||request!==sequence)return;
    handoff.time=Date.now();
    try{sessionStorage.setItem(GALLERY_HANDOFF_KEY,JSON.stringify(handoff));}catch{reset();location.assign(destination.href);return;}
    location.assign(destination.href);
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||!(event.target instanceof Element))return;
    const link=event.target.closest<HTMLAnchorElement>('a[data-gallery-entry],a[data-gallery-return]');
    if(link)void depart(link,event);
  },{signal});
  window.addEventListener('pageswap',event=>{if(working)(event as TransitionEvent).viewTransition?.skipTransition();},{signal});
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    reset();const handoff=readHandoff();if(handoff&&motionAllowed())void arrive(handoff);
  },{signal});
  window.addEventListener('pagehide',event=>{
    ++sequence;readiness();transition?.skipTransition();gsap.killTweensOf([white,root,displacement]);
    if(!event.persisted)abort.abort();
  },{signal});
  const handoff=readHandoff();
  if(handoff&&root.dataset.galleryArrival)void arrive(handoff);
}
