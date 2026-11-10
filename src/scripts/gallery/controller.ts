import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { experiences, galleryWorks, type GalleryLanguage } from '../../data/experiences';
import { WORK_STOPS, getActiveGalleryWork, getGalleryHashIndex } from './journey';
import type { ExperienceScene } from '../webgl/experienceScene';
import { createGalleryAmbience } from './ambience';

gsap.registerPlugin(ScrollTrigger);

export function initExperienceGallery() {
  const canvas=document.querySelector<HTMLCanvasElement>('[data-experience-canvas]');
  const journey=document.querySelector<HTMLElement>('[data-gallery-journey]');
  const dialog=document.querySelector<HTMLDialogElement>('[data-experience-preview]');
  const iframe=document.querySelector<HTMLIFrameElement>('[data-preview-frame]');
  if(!canvas||!journey||!dialog||!iframe)return;
  const root=document.documentElement;
  root.classList.add('has-experience-js');
  const abort=new AbortController();const {signal}=abort;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const initialIndex=getGalleryHashIndex(location.hash);
  const restoreGallery=['#galeria','#collection','#final'].includes(location.hash)||initialIndex>=0;
  const restoreFinal=location.hash==='#final';
  const motionButton=document.querySelector<HTMLButtonElement>('[data-gallery-motion]')!;
  const soundButton=document.querySelector<HTMLButtonElement>('[data-gallery-sound]')!;
  const ambience=createGalleryAmbience();
  let soundEnabled=false, soundStarted=false, soundRequest=0;
  const languageButton=document.querySelector<HTMLButtonElement>('[data-gallery-language]')!;
  const veil=document.querySelector<HTMLElement>('[data-experience-veil]')!;
  const intro=document.querySelector<HTMLElement>('[data-gallery-intro]')!;
  const details=document.querySelector<HTMLElement>('[data-gallery-details]')!;
  const indexNav=document.querySelector<HTMLElement>('[data-gallery-index]')!;
  const loading=document.querySelector<HTMLElement>('[data-scene-loading]')!;
  const status=document.querySelector<HTMLElement>('[data-gallery-status]')!;
  const external=document.querySelector<HTMLAnchorElement>('[data-preview-external]')!;
  let stage:'door'|'opening'|'gallery'='door';
  let scene:ExperienceScene|null=null, enhanced=false, paused=false, activeIndex=-2, previewIndex=-1;
  let sceneLoading=false;
  let travel:gsap.core.Tween|undefined, opening:gsap.core.Timeline|undefined;
  let replay:gsap.core.Timeline|undefined;
  let opener:HTMLElement|null=null;
  let requestedIndex=-1;
  const position={progress:0};
  try { paused=localStorage.getItem('portfolio-motion')==='paused'; } catch { /* Optional persistence. */ }
  const language=():GalleryLanguage=>root.lang==='es'?'es':'en';
  const canMove=()=>!paused&&!reduced.matches;
  const lenis=new Lenis({duration:1.25,smoothWheel:!reduced.matches});
  const ticker=(time:number)=>lenis.raf(time*1000);
  gsap.ticker.add(ticker);lenis.on('scroll',ScrollTrigger.update);
  function syncActivity(){
    scene?.setMotion(canMove());scene?.setActive(!reduced.matches&&!document.hidden&&!dialog!.open);
    ambience.setActive(!document.hidden&&!dialog!.open,document.hidden);
  }
  function syncSound(){
    const copy=experiences[language()];
    const label=soundEnabled?copy.soundPause:soundStarted?copy.soundResume:copy.soundStart;
    soundButton.querySelector('[data-sound-label]')!.textContent=label;
    soundButton.setAttribute('aria-label',label);soundButton.setAttribute('aria-pressed',String(soundEnabled));
  }
  function syncMotion(){
    root.dataset.motion=paused?'paused':'running';
    const copy=experiences[language()];
    motionButton.querySelector<HTMLElement>('[data-motion-label]')!.textContent=paused?copy.resume:copy.pause;
    motionButton.querySelector<HTMLElement>('[data-motion-icon]')!.textContent=paused?'▷':'Ⅱ';
    motionButton.setAttribute('aria-label',paused?copy.resume:copy.pause);
    motionButton.setAttribute('aria-pressed',String(paused));motionButton.hidden=reduced.matches;
    syncActivity();
  }
  function applyLanguage(){
    const lang=language(),copy=experiences[lang];
    document.querySelectorAll<HTMLElement>('[data-gallery-copy]').forEach(element=>{
      const key=element.dataset.galleryCopy as keyof typeof copy;
      if(key in copy)element.textContent=copy[key];
    });
    document.querySelectorAll<HTMLElement>('[data-work-title]').forEach(element=>{const work=galleryWorks[Number(element.dataset.workTitle)];if(work)element.textContent=work.title[lang];});
    document.querySelectorAll<HTMLElement>('[data-work-description]').forEach(element=>{const work=galleryWorks[Number(element.dataset.workDescription)];if(work)element.textContent=work.description[lang];});
    document.title=copy.title;document.querySelector('meta[name="description"]')?.setAttribute('content',copy.description);
    languageButton.setAttribute('aria-label',copy.language);
    languageButton.querySelectorAll<HTMLElement>('[data-language]').forEach(label=>label.classList.toggle('is-active',label.dataset.language===lang));
    indexNav.setAttribute('aria-label',copy.navigation);
    indexNav.querySelectorAll<HTMLButtonElement>('[data-go-work]').forEach(button=>button.setAttribute('aria-label',`${copy.goTo}: ${galleryWorks[Number(button.dataset.goWork)].title[lang]}`));
    document.querySelectorAll<HTMLAnchorElement>('[data-work-open]').forEach(link=>{
      const work=galleryWorks[Number(link.dataset.workOpen)];
      link.setAttribute('aria-label',`${copy.open}: ${work.title[lang]}`);
      link.href=`${import.meta.env.BASE_URL}experiencias/pruebas/${work.id}/?lang=${lang}`;
    });
    if(activeIndex>=0)status.textContent=`${copy.prototype} ${galleryWorks[activeIndex].number}: ${galleryWorks[activeIndex].title[lang]}`;
    if(previewIndex>=0)document.querySelector('[data-preview-title]')!.textContent=galleryWorks[previewIndex].title[lang];
    iframe!.title=copy.preview;
    syncMotion();syncSound();
  }
  function updateJourney(){
    const p=position.progress;
    scene?.setProgress(p);
    const current=getActiveGalleryWork(p), finale=enhanced&&p>.945;
    root.dataset.finale=String(finale);
    intro.hidden=enhanced&&p>.085;
    details.hidden=!enhanced||stage!=='gallery'||current<0||dialog!.open;
    indexNav.hidden=stage!=='gallery'||finale||dialog!.open;
    if(current!==activeIndex){
      activeIndex=current;
      document.querySelectorAll<HTMLElement>('[data-current-work]').forEach(article=>article.hidden=Number(article.dataset.currentWork)!==current);
      indexNav.querySelectorAll<HTMLButtonElement>('[data-go-work]').forEach(button=>{
        if(Number(button.dataset.goWork)===current)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
      });
      if(current>=0){
        const work=galleryWorks[current];status.textContent=`${experiences[language()].prototype} ${work.number}: ${work.title[language()]}`;
      }else status.textContent=finale?experiences[language()].endTitle.replace(/\n/g,' '):experiences[language()].scroll;
    }
    if(stage==='gallery'){
      const hash=finale?'#final':current>=0?`#obra-${galleryWorks[current].id}`:'#galeria';
      if(location.hash!==hash)history.replaceState(null,'',hash);
    }
  }
  function buildJourney(){
    if(!enhanced||stage!=='gallery'||travel)return;
    travel=gsap.to(position,{progress:1,ease:'none',scrollTrigger:{trigger:journey,start:'top top',end:'bottom bottom',scrub:canMove()?1.05:true,invalidateOnRefresh:true,onUpdate:updateJourney},onUpdate:updateJourney});
    ScrollTrigger.refresh();lenis.resize();updateJourney();
  }
  function applyRenderingMode(){
    const preferredIndex=activeIndex>=0?activeIndex:requestedIndex>=0?requestedIndex:initialIndex;
    enhanced=!!scene&&!reduced.matches;
    root.dataset.webgl=enhanced?'ready':'fallback';loading.hidden=true;
    if(!enhanced&&travel){
      travel.scrollTrigger?.kill();travel.kill();travel=undefined;
      position.progress=0;activeIndex=-2;
    }
    if(stage==='gallery'){
      scene?.setStage('gallery');buildJourney();updateJourney();
      if(preferredIndex>=0)goToWork(preferredIndex,true);
      else if(restoreFinal&&enhanced)moveToProgress(1,true);
    }
    syncActivity();
  }
  function prepareScene(){
    if(reduced.matches||scene){applyRenderingMode();return;}
    if(sceneLoading)return;
    sceneLoading=true;
    void import('../webgl/experienceScene')
      .then(module=>signal.aborted||reduced.matches?null:module.createExperienceScene(canvas!,signal))
      .then(controller=>{
        sceneLoading=false;
        if(signal.aborted){controller?.destroy();return;}
        scene=controller;applyRenderingMode();
      }).catch(error=>{
        sceneLoading=false;
        if(!signal.aborted){root.dataset.webgl='fallback';loading.hidden=true;console.warn('The gallery remains available without WebGL.',error);}
      });
  }
  function moveToProgress(value:number,immediate=false){
    const trigger=travel?.scrollTrigger;
    if(trigger){
      lenis.resize();
      const instant=immediate||!canMove();
      lenis.scrollTo(trigger.start+(trigger.end-trigger.start)*value,{immediate:instant,duration:1.8});
      if(instant){trigger.getTween()?.progress(1);travel?.progress(value);position.progress=value;updateJourney();}
    }
  }
  function goToWork(index:number,immediate=false){
    if(!Number.isInteger(index)||index<0||index>=galleryWorks.length)return;
    requestedIndex=index;
    if(stage!=='gallery'){enter(true,index);return;}
    if(enhanced)moveToProgress(WORK_STOPS[index],immediate);
    else {const target=document.getElementById(`obra-${galleryWorks[index].id}`);if(target)lenis.scrollTo(target,{offset:-100,immediate:immediate||!canMove(),duration:1.5});}
  }
  function finishEntrance(index=-1){
    if(signal.aborted)return;
    stage='gallery';root.dataset.stage=stage;scene?.setStage('gallery');
    lenis.start();lenis.scrollTo(0,{immediate:true});
    buildJourney();updateJourney();
    document.querySelector<HTMLButtonElement>('[data-gallery-replay]')!.hidden=false;
    if(index>=0)goToWork(index,true);
    else if(restoreFinal)moveToProgress(1,true);
  }
  function enter(immediate=false,index=-1){
    if(stage!=='door')return;
    if(immediate||!canMove()||!scene){finishEntrance(index);return;}
    stage='opening';root.dataset.stage=stage;lenis.stop();
    const door={progress:0};
    opening=gsap.timeline({onComplete:()=>{opening=undefined;}})
      .to(door,{progress:1,duration:2.8,ease:'power2.inOut',onUpdate:()=>scene?.setDoorProgress(door.progress)},0)
      .to(veil,{opacity:1,duration:.85,ease:'sine.inOut'},1.65)
      .call(()=>finishEntrance(index),[],2.65)
      .to(veil,{opacity:0,duration:1.1,ease:'sine.inOut'},2.8);
  }
  function closePreview(){dialog!.close();}
  function openPreview(index:number,source?:HTMLElement){
    const work=galleryWorks[index];if(!work||dialog!.open)return;
    previewIndex=index;opener=source??document.activeElement as HTMLElement;
    const href=`${import.meta.env.BASE_URL}experiencias/pruebas/${work.id}/?lang=${language()}`;
    document.querySelector('[data-preview-title]')!.textContent=work.title[language()];
    external.href=href;iframe!.src=href;iframe!.title=`${experiences[language()].preview}: ${work.title[language()]}`;
    root.dataset.previewOpen='true';lenis.stop();dialog!.showModal();syncActivity();updateJourney();
    dialog!.querySelector<HTMLButtonElement>('[data-preview-close]')!.focus();
  }
  document.querySelectorAll<HTMLAnchorElement>('[data-enter-door], [data-direct-enter]').forEach(link=>link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();enter(link.hasAttribute('data-direct-enter'));
  },{signal}));
  const doorLink=document.querySelector<HTMLElement>('[data-enter-door]')!;
  doorLink.addEventListener('pointerenter',()=>scene?.setHover(true),{signal});
  doorLink.addEventListener('pointerleave',()=>scene?.setHover(false),{signal});
  doorLink.addEventListener('focus',()=>scene?.setHover(true),{signal});
  doorLink.addEventListener('blur',()=>scene?.setHover(false),{signal});
  indexNav.querySelectorAll<HTMLButtonElement>('[data-go-work]').forEach(button=>button.addEventListener('click',()=>goToWork(Number(button.dataset.goWork)),{signal}));
  document.querySelectorAll<HTMLAnchorElement>('[data-work-open]').forEach(link=>link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();openPreview(Number(link.dataset.workOpen),link);
  },{signal}));
  dialog.querySelector('[data-preview-close]')!.addEventListener('click',closePreview,{signal});
  dialog.addEventListener('close',()=>{
    iframe!.src='about:blank';previewIndex=-1;delete root.dataset.previewOpen;lenis.start();syncActivity();updateJourney();
    if(opener?.isConnected)opener.focus({preventScroll:true});
  },{signal});
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===iframe!.contentWindow&&event.data?.type==='gallery:close-preview')closePreview();},{signal});
  document.querySelector('[data-gallery-replay]')!.addEventListener('click',()=>{
    if(replay?.isActive())return;
    if(!enhanced){lenis.scrollTo(journey,{offset:-80,duration:canMove()?1.7:0,immediate:!canMove()});return;}
    const reset=()=>{
      moveToProgress(0,true);travel?.scrollTrigger?.getTween()?.progress(1);
      travel?.progress(0);position.progress=0;scene?.setStage('gallery');updateJourney();
    };
    if(!canMove()){reset();return;}
    replay=gsap.timeline({onComplete:()=>{replay=undefined;}}).to(veil,{opacity:1,duration:.55,ease:'sine.inOut'}).call(reset).to(veil,{opacity:0,duration:.85,ease:'sine.inOut'});
  },{signal});
  motionButton.addEventListener('click',()=>{
    paused=!paused;try{localStorage.setItem('portfolio-motion',paused?'paused':'running');}catch{/* Optional persistence. */}
    syncMotion();
  },{signal});
  soundButton.addEventListener('click',()=>{
    soundEnabled=!soundEnabled;const requestedEnabled=soundEnabled,request=++soundRequest;syncSound();
    void ambience.setEnabled(requestedEnabled).then(playing=>{
      if(signal.aborted||request!==soundRequest)return;
      soundEnabled=playing;soundStarted||=playing;syncSound();
      if(requestedEnabled&&!playing)status.textContent=experiences[language()].soundUnavailable;
    });
  },{signal});
  languageButton.addEventListener('click',()=>{
    root.lang=language()==='es'?'en':'es';try{localStorage.setItem('portfolio-lang',root.lang);}catch{/* Optional persistence. */}applyLanguage();
  },{signal});
  let pointerDown={x:0,y:0};
  function pointerPosition(event:MouseEvent){
    const bounds=canvas!.getBoundingClientRect();
    return {x:(event.clientX-bounds.left)/bounds.width*2-1,y:1-(event.clientY-bounds.top)/bounds.height*2};
  }
  canvas.addEventListener('pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY};},{signal,passive:true});
  canvas.addEventListener('pointermove',event=>{
    const pointer=pointerPosition(event);
    if(event.pointerType==='mouse'&&canMove())scene?.setPointer(pointer.x,-pointer.y);
    if(stage!=='opening'){
      const hit=scene?.pick(pointer.x,pointer.y);
      canvas.style.cursor=hit!=null?'pointer':'default';scene?.setHover(hit==='door');
    }
  },{signal,passive:true});
  canvas.addEventListener('pointerleave',()=>{scene?.setPointer(0,0);scene?.setHover(false);},{signal});
  canvas.addEventListener('click',event=>{
    if(stage==='opening'||Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>8)return;
    const pointer=pointerPosition(event);const result=scene?.pick(pointer.x,pointer.y);
    if(result==='door')enter();else if(typeof result==='number')openPreview(result);
  },{signal});
  reduced.addEventListener('change',()=>{syncMotion();if(reduced.matches&&opening)opening.progress(1);prepareScene();},{signal});
  document.addEventListener('visibilitychange',syncActivity,{signal});
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    try{const saved=localStorage.getItem('portfolio-lang');if(saved==='es'||saved==='en')root.lang=saved;paused=localStorage.getItem('portfolio-motion')==='paused';}catch{/* Keep current preferences. */}
    applyLanguage();syncActivity();
  },{signal});
  window.addEventListener('pagehide',event=>{
    scene?.setActive(false);ambience.setActive(false,true);
    if(!event.persisted){abort.abort();ambience.destroy();opening?.kill();replay?.kill();travel?.scrollTrigger?.kill();travel?.kill();gsap.killTweensOf(veil);gsap.ticker.remove(ticker);lenis.destroy();scene?.destroy();}
  },{signal});
  applyLanguage();languageButton.hidden=false;soundButton.hidden=typeof AudioContext==='undefined';syncMotion();
  prepareScene();
  if(restoreGallery)enter(true,initialIndex);
  void document.fonts.ready.then(()=>{if(!signal.aborted)ScrollTrigger.refresh();});
}
