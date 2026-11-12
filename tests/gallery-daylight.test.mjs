import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGalleryDaylight, createGalleryDayClock, GALLERY_DAY_SECONDS } from '../src/scripts/gallery/daylight.ts';
import { createGalleryLighting, createGallerySkyMaterial } from '../src/scripts/webgl/gallery/lighting.ts';

test('the four-minute solar day is continuous, periodic and always moves forward',()=>{
  assert.equal(GALLERY_DAY_SECONDS,240);
  let previous=getGalleryDaylight(0).hour;
  for(let i=0;i<2400;i++){
    const time=i/10,s=getGalleryDaylight(time);
    assert.ok(s.hour>=previous);previous=s.hour;
    assert.ok(Math.abs(Math.hypot(...s.sunDirection)-1)<1e-10);
    for(const key of ['daylight','direct','warmth','lamps','twilight','pastel'])assert.ok(s[key]>=0&&s[key]<=1);
    assert.deepEqual(getGalleryDaylight(time),getGalleryDaylight(time+240));
  }
  for(const boundary of [0,40,75,105,150,210,240]){
    const a=getGalleryDaylight(boundary-1e-5),b=getGalleryDaylight(boundary+1e-5);
    for(let axis=0;axis<3;axis++)assert.ok(Math.abs(a.sunDirection[axis]-b.sunDirection[axis])<.00001);
    for(const key of ['sunIntensity','daylight','lamps','pastel'])assert.ok(Math.abs(a[key]-b[key])<.00001);
  }
});

test('sunlight turns off below the horizon; museum lamps rise through twilight',()=>{
  let day=false,night=false;
  for(let second=0;second<240;second+=.25){
    const s=getGalleryDaylight(second);
    if(s.sunDirection[1]<=0){assert.equal(s.sunIntensity,0);assert.ok(s.lamps>.5);night=true;}
    if(s.sunDirection[1]>.4){assert.ok(s.sunIntensity>2.5);assert.ok(s.lamps<.01);day=true;}
    if(s.direct>0)assert.ok(s.sunDirection[0]>0,'The sun should enter the right-facing glazing');
  }
  assert.ok(day&&night);
});

test('the active-time clock agrees across frame rates and cannot skip the night after a pause',()=>{
  for(const fps of [20,30,60,144]){
    const clock=createGalleryDayClock();let elapsed=0;
    for(let frame=0;frame<fps*130;frame++)elapsed=clock.advance(1/fps,true);
    assert.ok(Math.abs(elapsed-130)<1e-8);
    assert.equal(clock.advance(3600,false),elapsed);
    assert.equal(clock.advance(NaN,true),elapsed);
    assert.equal(clock.advance(-1,true),elapsed);
    assert.ok(Math.abs(clock.advance(1,true)-131)<1e-8);
  }
});

test('light sources, window sky and night lamps share the same solar state and release shadows',()=>{
  const sky=createGallerySkyMaterial(),ceiling=new THREE.MeshBasicMaterial();
  const lighting=createGalleryLighting(sky,ceiling);
  const sun=lighting.group.getObjectByName('Gallery sun');
  const spots=lighting.group.children.filter(light=>light instanceof THREE.SpotLight);
  const daytime=lighting.update(160),dayColor=sky.uniforms.zenith.value.clone();
  assert.equal(daytime.night,false);assert.ok(sun.intensity>2);assert.ok(spots.every(light=>light.intensity===0));
  const nightTime=Array.from({length:240},(_,i)=>i).find(i=>getGalleryDaylight(i).daylight===0);
  const night=lighting.update(nightTime);
  assert.equal(night.night,true);assert.equal(sun.intensity,0);assert.ok(spots.every(light=>light.intensity>100));
  assert.ok(sky.uniforms.zenith.value.getHSL({h:0,s:0,l:0}).l<dayColor.getHSL({h:0,s:0,l:0}).l);
  const noon=lighting.update(160);assert.equal(noon.shadowsChanged,true);
  assert.equal(lighting.update(160).shadowsChanged,false,'Paused time must not redraw the shadow map');
  let disposed=false;sun.shadow.map={dispose(){disposed=true;}};
  lighting.resize(390);assert.ok(disposed);assert.equal(sun.shadow.mapSize.x,1024);assert.equal(sun.shadow.map,null);
  lighting.resize(1400);assert.equal(sun.shadow.mapSize.x,2048);
  sun.shadow.map={dispose(){disposed=true;}};disposed=false;lighting.destroy();assert.ok(disposed);
  sky.dispose();ceiling.dispose();
});

test('entry begins in a pastel sunset and continues into night, dawn and daylight',()=>{
  const entry=getGalleryDaylight(0);
  assert.ok(entry.hour>16&&entry.hour<17);assert.ok(entry.pastel>.9);assert.ok(entry.direct>0);
  assert.ok(getGalleryDaylight(55).daylight===0);
  assert.ok(getGalleryDaylight(90).hour>30&&getGalleryDaylight(90).pastel>.5);
  assert.ok(getGalleryDaylight(160).daylight===1&&getGalleryDaylight(160).pastel<.01);
  const sky=createGallerySkyMaterial(),ceiling=new THREE.MeshBasicMaterial();
  const lighting=createGalleryLighting(sky,ceiling),color=sky.uniforms.horizon.value;
  assert.ok(color.r>color.g&&color.b>color.g,'Initial horizon should be dusty pink, rather than neutral blue');
  assert.ok(sky.uniforms.pastel.value>.9);
  lighting.update(55);assert.ok(sky.uniforms.pastel.value<.01);
  lighting.destroy();sky.dispose();ceiling.dispose();
});
