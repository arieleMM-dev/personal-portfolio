import * as THREE from 'three';
import { GalleryResources } from './gallery/resources';
import { createOceanDoor } from './gallery/oceanDoor';
import { createGalleryRoom } from './gallery/room';
import { GALLERY_FOV, getGalleryPose } from '../gallery/journey';

export interface ExperienceScene {
  setStage(stage:'door'|'gallery'):void;
  setDoorProgress(value:number):void;
  setProgress(value:number):void;
  setPointer(x:number,y:number):void;
  setHover(active:boolean):void;
  setMotion(enabled:boolean):void;
  setActive(active:boolean):void;
  pick(x:number,y:number):'door'|number|null;
  destroy():void;
}

export async function createExperienceScene(canvas:HTMLCanvasElement, signal:AbortSignal):Promise<ExperienceScene|null> {
  let renderer:THREE.WebGLRenderer;
  try { renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'high-performance'}); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.setClearColor(0xeae6dc);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const resources=new GalleryResources();
  let normals:THREE.Texture;
  try { normals=await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}assets/hero/waternormals.jpg`); }
  catch { normals=new THREE.DataTexture(new Uint8Array([128,128,255,255]),1,1);normals.needsUpdate=true; }
  if(signal.aborted){normals.dispose();resources.destroy();renderer.dispose();return null;}
  resources.texture(normals);normals.wrapS=normals.wrapT=THREE.RepeatWrapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xeae6dc);
  const fog=new THREE.FogExp2(0xeae6dc,0.018);scene.fog=fog;
  const camera=new THREE.PerspectiveCamera(GALLERY_FOV,1,0.08,420);
  const ocean=createOceanDoor(resources,normals);const room=createGalleryRoom(resources);
  room.group.visible=false;scene.add(ocean.group,room.group);
  const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();
  const desired=new THREE.Vector3();const look=new THREE.Vector3();
  let stage:'door'|'gallery'='door', doorProgress=0,progress=0,motion=true,active=true,disposed=false;
  let raf=0,last=0,elapsed=0,pointerX=0,pointerY=0,width=1,height=1,reset=true,hover=0,hoverTarget=0;
  function schedule(){if(!raf&&active&&!disposed)raf=requestAnimationFrame(frame);}
  function frame(time:number){
    raf=0;if(disposed||!active)return;
    const delta=last?Math.min((time-last)/1000,.05):1/60;last=time;
    if(motion)elapsed+=delta;
    if(stage==='door'){
      hover=motion?THREE.MathUtils.lerp(hover,hoverTarget,1-Math.exp(-5*delta)):hoverTarget;
      ocean.paint.emissiveIntensity=hover*.055;
      const advance=THREE.MathUtils.smoothstep(doorProgress,.22,1);
      const narrow=Math.max(1,0.54/(width/height));
      desired.set(motion?pointerX*.18*(1-advance):0,1.55+(motion?pointerY*.07*(1-advance):0),THREE.MathUtils.lerp(9.2*narrow,-1.3,advance));
      look.set(0,1.6,-4);
      ocean.hinge.rotation.y=-THREE.MathUtils.smoothstep(doorProgress,0,.65)*1.52;
      ocean.water.material.uniforms.time.value=elapsed*.45;
      if(doorProgress>0&&doorProgress<1)renderer.shadowMap.needsUpdate=true;
    }else{
      const pose=getGalleryPose(progress,width/height);desired.set(pose.x,pose.y,pose.z);look.set(pose.lookX,pose.lookY,pose.lookZ);
    }
    if(reset||!motion){camera.position.copy(desired);reset=false;}
    else camera.position.lerp(desired,1-Math.exp(-5.5*delta));
    camera.lookAt(look);renderer.render(scene,camera);
    if((stage==='door'&&motion)||camera.position.distanceToSquared(desired)>.000005)schedule();
  }
  const resize=new ResizeObserver(([entry])=>{
    width=Math.max(1,entry.contentRect.width);height=Math.max(1,entry.contentRect.height);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();reset=true;schedule();
    room.fixtures.visible=width/height>=0.75;
  });resize.observe(canvas);schedule();
  return {
    setStage(value){stage=value;reset=true;ocean.group.visible=value==='door';room.group.visible=value==='gallery';fog.density=value==='door'?.018:.003;renderer.shadowMap.needsUpdate=true;schedule();},
    setDoorProgress(value){doorProgress=THREE.MathUtils.clamp(value,0,1);schedule();},
    setProgress(value){progress=THREE.MathUtils.clamp(value,0,1);schedule();},
    setPointer(x,y){pointerX=THREE.MathUtils.clamp(x,-1,1);pointerY=THREE.MathUtils.clamp(y,-1,1);schedule();},
    setHover(value){hoverTarget=value?1:0;schedule();},
    setMotion(value){motion=value;schedule();},
    setActive(value){active=value;last=0;if(value)schedule();else{cancelAnimationFrame(raf);raf=0;}},
    pick(x,y){
      mouse.set(x,y);raycaster.setFromCamera(mouse,camera);
      const hits=raycaster.intersectObjects(stage==='door'?[ocean.door]:room.targets,true);
      if(!hits.length)return null;
      return stage==='door'?'door':typeof hits[0].object.userData.workIndex==='number'?hits[0].object.userData.workIndex:null;
    },
    destroy(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();ocean.destroy();room.destroy();resources.destroy();renderer.dispose();},
  };
}
