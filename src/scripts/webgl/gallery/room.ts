import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { GalleryResources } from './resources';
import { createStudyTexture } from './surfaces';
import { createInteriorMaterials, createPolishedFloor } from './interiorSurfaces';
import { createGalleryLighting } from './lighting';
import { createGalleryExterior, coordinateGalleryReflections, applyWindowWaterLight } from './exteriorLake';
import { GALLERY_ROOM, WORK_LAYOUT, HANGING_STUDIES } from '../../gallery/layout';

export function createGalleryRoom(resources: GalleryResources,normals:THREE.Texture) {
  RectAreaLightUniformsLib.init();
  const group=new THREE.Group();group.name='Daylight exhibition';
  const fixtures=new THREE.Group();group.add(fixtures);
  const {plaster,floor}=createInteriorMaterials(resources);
  const waterLight=applyWindowWaterLight(plaster);
  const {halfWidth:w,height:h,back,front}=GALLERY_ROOM;
  const depth=front-back,center=(front+back)/2;
  resources.box(group,w*2,.24,depth,0,-.12,center,floor);
  resources.box(group,w*2,h,.25,0,h/2,back,plaster);
  resources.box(group,.25,h,depth,-w,h/2,center,plaster);
  resources.box(group,w*2,.22,depth,0,h+.11,center,plaster);
  const reflection=createPolishedFloor(resources,w*2,depth);
  reflection.reflector.position.z=center;group.add(reflection.reflector);

  const aluminium=resources.material(new THREE.MeshStandardMaterial({color:0x8c9697,roughness:.42,metalness:.62}));
  const charcoal=resources.material(new THREE.MeshStandardMaterial({color:0x434a4a,roughness:.48,metalness:.35}));
  const paper=resources.material(new THREE.MeshStandardMaterial({color:0xf0f0e9,roughness:.92}));
  const wire=resources.material(new THREE.MeshStandardMaterial({color:0x9a9e9b,roughness:.62,metalness:.5}));
  const exterior=createGalleryExterior(resources,normals);group.add(exterior.group);
  const releaseReflections=coordinateGalleryReflections(reflection.reflector,exterior.water);

  // Full-height glazing on the right: sunlight really passes through the openings.
  resources.box(group,.3,.8,depth,w+.05,-.4,center,plaster);
  resources.box(group,.4,.35,depth,w,.175,center,plaster);
  resources.box(group,.4,.3,depth,w,h-.15,center,plaster);
  for(let z=back;z<=front;z+=5.5)resources.box(group,.25,h,.085,w,h/2,z,aluminium);
  for(const y of [3.3,6.6])resources.box(group,.16,.075,depth,w,y,center,aluminium);
  // Recessed ceiling light and slender rails preserve the photograph's vertical rhythm.
  const ceilingLight=resources.material(new THREE.MeshBasicMaterial({color:0xf3f5ee}));
  for(const x of [-8,2.5]){
    resources.box(group,.28,.035,depth-4,x,h-.045,center,ceilingLight).castShadow=false;
    for(const side of [-1,1])resources.box(group,.025,.055,depth-4,x+side*.17,h-.05,center,plaster);
  }
  for(const x of [-10,-5,0,5,10]){
    resources.box(fixtures,.045,.06,depth-3,x,h-.22,center,aluminium);
    for(const z of [-20,-10,0,10,20]){
      const lamp=new THREE.Mesh(resources.geometry(new THREE.CylinderGeometry(.065,.065,.26,10)),aluminium);
      lamp.rotation.z=.36;lamp.position.set(x,h-.47,z);fixtures.add(lamp);
      const lens=new THREE.Mesh(resources.geometry(new THREE.CircleGeometry(.055,10)),ceilingLight);
      lens.rotation.x=-Math.PI/2;lens.position.set(x+.045,h-.61,z);fixtures.add(lens);
    }
  }
  // Thin perimeter shadow gaps and large concrete joints provide scale cues.
  const joint=resources.material(new THREE.MeshStandardMaterial({color:0x7f8985,roughness:.9}));
  resources.box(group,w*2,.035,.02,0,.018,back+.14,joint);
  resources.box(group,.02,.035,depth,-w+.14,.018,center,joint);
  for(let x=-8;x<=8;x+=4){const seam=resources.box(group,.008,.002,depth,x,.002,center,joint);seam.castShadow=false;}
  for(let z=back+4;z<front;z+=6){const seam=resources.box(group,w*2,.002,.008,0,.002,z,joint);seam.castShadow=false;}

  const cableGeometry=resources.geometry(new THREE.CylinderGeometry(.006,.006,1,5));
  const targets:THREE.Object3D[]=[];
  function hang(item:{x:number;y:number;z:number;width:number;height:number;yaw?:number},art:number,workIndex?:number){
    const frame=new THREE.Group();frame.position.set(item.x,item.y,item.z);frame.rotation.y=item.yaw??0;group.add(frame);
    const {width:fw,height:fh}=item;
    const backing=resources.box(frame,fw-.035,fh-.035,.065,0,0,0,paper);
    for(const side of [-1,1]){
      resources.box(frame,.035,fh,.105,side*(fw-.035)/2,0,.015,charcoal);
      resources.box(frame,fw,.035,.105,0,side*(fh-.035)/2,.015,charcoal);
      const local=new THREE.Vector3(side*(fw*.36),fh/2,0).applyAxisAngle(new THREE.Vector3(0,1,0),frame.rotation.y);
      const length=h-(item.y+fh/2)-.12;
      const cable=new THREE.Mesh(cableGeometry,wire);cable.scale.y=length;
      cable.position.set(item.x+local.x,item.y+fh/2+length/2,item.z+local.z);fixtures.add(cable);
      resources.box(fixtures,.08,.025,.08,cable.position.x,h-.12,cable.position.z,aluminium);
    }
    const texture=resources.texture(createStudyTexture(art));texture.anisotropy=4;
    const material=resources.material(new THREE.MeshStandardMaterial({map:texture,roughness:.88,metalness:0}));
    const picture=new THREE.Mesh(resources.geometry(new THREE.PlaneGeometry(fw-.3,fh-.3)),material);
    picture.position.z=.055;picture.castShadow=picture.receiveShadow=true;frame.add(picture);
    if(workIndex!==undefined){
      for(const surface of [backing,picture]){surface.userData.workIndex=workIndex;targets.push(surface);}
    }
  }
  WORK_LAYOUT.forEach((work,index)=>hang(work,index,index));
  HANGING_STUDIES.forEach((work,index)=>hang(work,index+5));

  const lighting=createGalleryLighting(exterior.skyMaterial,ceilingLight);group.add(lighting.group);
  return {
    group,targets,
    update(seconds:number){const state=lighting.update(seconds);exterior.update(seconds,state.day);waterLight.update(seconds,state.day);return state;},
    resize(width:number,height:number){
      reflection.resize(width,height);
      lighting.resize(width);
      exterior.resize(width);
    },
    destroy(){releaseReflections();exterior.destroy();reflection.destroy();lighting.destroy();},
  };
}
