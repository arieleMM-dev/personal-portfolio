import { isAmbientPaused } from '../motion';
import { getKnowledgePoint, getKnowledgeColor } from './knowledgeShapes';
import { advanceParticleOffset } from './knowledgeParticleMotion';

export function initKnowledgeSculpture(){
  const root=document.querySelector<HTMLButtonElement>('[data-particle-morph]');
  const canvas=root?.querySelector('canvas'),context=canvas?.getContext('2d');
  if(!root||!canvas||!context)return()=>{};
  const events=new AbortController(),signal=events.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const count=1920,models=[0,1,2].map(shape=>Array.from({length:count},(_,i)=>getKnowledgePoint(shape,i,count)));
  const colors=[0,1,2].map(shape=>Array.from({length:count},(_,i)=>getKnowledgeColor(shape,i,count)));
  const points=models[0].map(p=>({position:[...p],x:0,y:0,vx:0,vy:0,sx:0,sy:0,z:0}));
  const order=Array.from({length:count},(_,i)=>i),pointer={x:0,y:0,active:false};
  let active=0,elapsed=0,time=0,frame=0,last=0,visible=false,disposed=false,width=1,height=1;
  let timer:ReturnType<typeof setTimeout>|undefined;
  function select(next:number){
    active=next%models.length;elapsed=0;root!.dataset.particleShape=String(active);
    root!.querySelectorAll<HTMLElement>('[data-particle-name]').forEach((name,i)=>{name.hidden=i!==active;});
    root!.querySelectorAll('.knowledge-sculpture__dots i').forEach((dot,i)=>dot.classList.toggle('is-active',i===active));
    wake();
  }
  const stop=()=>{cancelAnimationFrame(frame);clearTimeout(timer);frame=0;timer=undefined;last=0;};
  function wake(){stop();if(!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function draw(now:number){
    frame=0;if(disposed||!visible||document.hidden)return;
    const still=reduced.matches||isAmbientPaused(),dt=last?Math.min(.05,(now-last)/1000):1/30;last=now;
    if(!still){time+=dt;elapsed+=dt;if(elapsed>8.5&&!pointer.active&&!root!.matches(':focus-visible')){select(active+1);return;}}
    const gain=still?1:1-Math.exp(-dt*4.3),yaw=-.28+(still?0:Math.sin(time*.33)*.32),pitch=still?.05:.08+Math.sin(time*.27)*.07;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),scale=Math.min(width*.46,height*.48),centerY=height*.47;
    context!.clearRect(0,0,width,height);
    for(let i=0;i<count;i++){
      const p=points[i],target=models[active][i];for(let axis=0;axis<3;axis++)p.position[axis]+=(target[axis]-p.position[axis])*gain;
      const [x,y,z]=p.position,rx=x*cy+z*sy,rz=z*cy-x*sy,ry=y*cp-rz*sp;p.z=rz*cp+y*sp;
      const perspective=3.5/(3.5-p.z),breathing=still?0:Math.sin(time*1.15+i*.015)*.6;
      p.sx=width/2+rx*scale*perspective;p.sy=centerY+ry*scale*perspective+(still?0:Math.sin(time*.8)*4)+breathing;
      if(still){p.x=0;p.y=0;p.vx=0;p.vy=0;}
      else advanceParticleOffset(p,pointer.active?p.sx-pointer.x:9999,pointer.active?p.sy-pointer.y:9999,Math.min(100,width*.25),56,dt);
    }
    order.sort((a,b)=>points[a].z-points[b].z);
    for(const i of order){
      const p=points[i];context!.globalAlpha=Math.max(.45,Math.min(1,.8+p.z*.28));context!.fillStyle=colors[active][i];
      context!.beginPath();context!.arc(p.sx+p.x,p.sy+p.y,Math.max(1.15,scale/110)*(1+p.z*.18),0,Math.PI*2);context!.fill();
    }
    context!.globalAlpha=1;canvas!.dataset.ready='true';
    if(!still)timer=setTimeout(()=>{timer=undefined;if(!disposed)frame=requestAnimationFrame(draw);},20);
  }
  root.addEventListener('click',()=>select(active+1),{signal});
  root.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const rect=canvas!.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;pointer.active=true;},{signal});
  root.addEventListener('pointerleave',()=>{pointer.active=false;},{signal});root.addEventListener('blur',()=>{pointer.active=false;},{signal});
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;wake();});observer.observe(canvas);
  const resize=new ResizeObserver(()=>{width=canvas!.clientWidth;height=canvas!.clientHeight;const dpr=Math.min(devicePixelRatio||1,1.5);canvas!.width=Math.round(width*dpr);canvas!.height=Math.round(height*dpr);context!.setTransform(dpr,0,0,dpr,0,0);wake();});resize.observe(canvas);
  document.addEventListener('visibilitychange',wake,{signal});document.addEventListener('portfolio:motion-change',wake,{signal});reduced.addEventListener('change',wake,{signal});
  select(0);
  return()=>{disposed=true;stop();events.abort();observer.disconnect();resize.disconnect();};
}
