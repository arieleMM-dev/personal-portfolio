import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {createGalleryExterior,coordinateGalleryReflections,applyWindowWaterLight,GALLERY_LAKE} from '../src/scripts/webgl/gallery/exteriorLake.ts';
import {getGalleryDaylight,createGalleryDayClock} from '../src/scripts/gallery/daylight.ts';
import {getGalleryPose,WORK_STOPS} from '../src/scripts/gallery/journey.ts';

function fixture(){
  const materials=[],geometries=[];
  const resources={material:value=>(materials.push(value),value),geometry:value=>(geometries.push(value),value)};
  const normal=new THREE.Texture(),exterior=createGalleryExterior(resources,normal);
  return {exterior,destroy(){exterior.destroy();materials.forEach(v=>v.dispose());geometries.forEach(v=>v.dispose());normal.dispose();}};
}

test('the lake stays below and outside the room, and is visible through the lower window from every stop',()=>{
  const {exterior,destroy}=fixture();const {water}=exterior;water.updateMatrixWorld();
  const box=new THREE.Box3().setFromObject(water);
  assert.ok(Math.abs(box.min.x-GALLERY_LAKE.edge)<.001);assert.ok(box.max.y<-.5);assert.ok(box.max.x>2000);
  for(const stop of [0,...WORK_STOPS])for(const aspect of [.4,1,1.8]){
    const pose=getGalleryPose(stop,aspect),origin=new THREE.Vector3(pose.x,pose.y,pose.z);
    const below=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0)).intersectObject(water);
    assert.equal(below.length,0,'Exterior water leaked beneath the gallery camera');
    const target=new THREE.Vector3(24,GALLERY_LAKE.level,-8),ray=new THREE.Raycaster(origin,target.clone().sub(origin).normalize());
    assert.ok(ray.intersectObject(water).length>0,'The lake cannot be seen through the window');
  }
  destroy();
});

test('water follows the solar state and the wave clock does not restart at the solar-loop boundary',()=>{
  const {exterior,destroy}=fixture(),clock=createGalleryDayClock();
  const night=Array.from({length:240},(_,i)=>i).find(i=>getGalleryDaylight(i).daylight===0);
  exterior.update(night,getGalleryDaylight(night));
  assert.equal(exterior.water.material.uniforms.sunColor.value.getHex(),0);
  exterior.update(160,getGalleryDaylight(160));assert.ok(exterior.water.material.uniforms.sunColor.value.getHex()>0);
  let time=clock.advance(239.99,true);exterior.update(time,getGalleryDaylight(time));
  const before=exterior.water.material.uniforms.time.value;
  time=clock.advance(.02,true);exterior.update(time,getGalleryDaylight(time));
  assert.ok(Math.abs(exterior.water.material.uniforms.time.value-before-.02)<1e-9);
  assert.equal(clock.advance(3600,false),time);
  exterior.resize(390);assert.equal(exterior.water.material.uniforms.mirrorSampler.value.renderTarget.width,256);
  let disposed=false;exterior.water.material.uniforms.mirrorSampler.value.renderTarget.addEventListener('dispose',()=>{disposed=true;});
  destroy();assert.ok(disposed);
});

test('floor and lake reflection captures exclude each other and restore visibility even on failure',()=>{
  const floor=new THREE.Object3D(),water=new THREE.Object3D();
  const floorRender=()=>assert.equal(water.visible,false);
  const waterRender=()=>{assert.equal(floor.visible,false);throw new Error('capture interrupted');};
  floor.onBeforeRender=floorRender;water.onBeforeRender=waterRender;
  const release=coordinateGalleryReflections(floor,water);
  floor.onBeforeRender();assert.equal(water.visible,true);
  assert.throws(()=>water.onBeforeRender(),/capture interrupted/);assert.equal(floor.visible,true);
  water.visible=false;floor.onBeforeRender();assert.equal(water.visible,false);
  release();assert.equal(floor.onBeforeRender,floorRender);assert.equal(water.onBeforeRender,waterRender);
});

test('water-bounced light is subtle, restricted to the glass edge and disabled after sunset',()=>{
  const material=new THREE.MeshStandardMaterial(),effect=applyWindowWaterLight(material);
  const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
  material.onBeforeCompile(shader,{});
  effect.update(160,getGalleryDaylight(160));
  assert.ok(shader.uniforms.uWaterLightStrength.value>0&&shader.uniforms.uWaterLightStrength.value<.04);
  assert.match(shader.fragmentShader,/nearGlass\*edge/);
  effect.update(55,getGalleryDaylight(55));assert.equal(shader.uniforms.uWaterLightStrength.value,0);
  effect.update(160,getGalleryDaylight(160));assert.equal(shader.uniforms.uWaterLightTime.value,160);
  material.dispose();
});
