import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import type { GalleryResources } from './resources';
import type { getGalleryDaylight } from '../../gallery/daylight';
import { GALLERY_ROOM } from '../../gallery/layout.ts';
import { applyLakeSurface } from './lakeSurface.ts';
import { createGallerySkyMaterial } from './lighting.ts';

export const GALLERY_LAKE = { edge: GALLERY_ROOM.halfWidth+.25, level: -.65, reach: 2200 } as const;
type Daylight = ReturnType<typeof getGalleryDaylight>;

/** Two planar reflectors must not render one another recursively. */
export function coordinateGalleryReflections(floor:THREE.Object3D,water:THREE.Object3D){
  const floorRender=floor.onBeforeRender,waterRender=water.onBeforeRender;
  floor.onBeforeRender=function(...args){
    const visible=water.visible;water.visible=false;
    try{floorRender.call(this,...args);}finally{water.visible=visible;}
  };
  water.onBeforeRender=function(...args){
    const visible=floor.visible;floor.visible=false;
    try{waterRender.call(this,...args);}finally{floor.visible=visible;}
  };
  return ()=>{floor.onBeforeRender=floorRender;water.onBeforeRender=waterRender;};
}

export function createGalleryExterior(resources:GalleryResources,normals:THREE.Texture){
  const group=new THREE.Group();group.name='The lake beyond the gallery';
  const skyMaterial=resources.material(createGallerySkyMaterial());
  const sky=new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(2300,40,20)),skyMaterial);
  sky.renderOrder=-20;group.add(sky);
  // Dense near the glass; the three outer edges extend to a distant horizon.
  const geometry=resources.geometry(new THREE.PlaneGeometry(120,180,128,160));
  const positions=geometry.getAttribute('position');
  const centerX=GALLERY_LAKE.edge+60;
  for(let i=0;i<positions.count;i++){
    if(positions.getX(i)>59.99)positions.setX(i,GALLERY_LAKE.reach-centerX);
    const z=positions.getY(i);if(Math.abs(z)>89.99)positions.setY(i,Math.sign(z)*GALLERY_LAKE.reach);
  }
  positions.needsUpdate=true;geometry.computeBoundingSphere();
  const water=new Water(geometry,{
    textureWidth:384,textureHeight:384,waterNormals:normals,waterColor:0x8ba5a6,
    sunDirection:new THREE.Vector3(1,.3,0).normalize(),sunColor:0xe6ddc4,
    distortionScale:.64,fog:false,clipBias:.003,
  });
  resources.material(water.material);
  water.rotation.x=-Math.PI/2;water.position.set(centerX,GALLERY_LAKE.level,0);
  water.receiveShadow=true;
  water.material.uniforms.size.value=7;applyLakeSurface(water.material);
  water.material.uniforms.lakeHorizon=skyMaterial.uniforms.horizon;
  water.material.fragmentShader=water.material.fragmentShader
    .replace('uniform float time;','uniform float time;uniform vec3 lakeHorizon;')
    .replace('#include <tonemapping_fragment>',`gl_FragColor.rgb=mix(gl_FragColor.rgb,lakeHorizon,smoothstep(250.,1700.,length(worldPosition.xz-cameraPosition.xz)));
      #include <tonemapping_fragment>`);
  group.add(water);
  const dayWater=new THREE.Color(0x8ba5a6),nightWater=new THREE.Color(0x233b4a);
  const sunWhite=new THREE.Color(0xe6ddc4),sunWarm=new THREE.Color(0xe8bdc0);
  const reflection=water.material.uniforms.mirrorSampler.value as THREE.Texture;
  return {group,water,skyMaterial,
    update(seconds:number,state:Daylight){
      // The wave clock is independent of the 240-second solar loop.
      const time=seconds%(200*Math.PI);
      water.material.uniforms.time.value=time;skyMaterial.uniforms.uSkyTime.value=seconds%(2000*Math.PI);
      (water.material.uniforms.sunDirection.value as THREE.Vector3).set(...state.sunDirection);
      (water.material.uniforms.sunColor.value as THREE.Color).copy(sunWhite).lerp(sunWarm,state.warmth).multiplyScalar(state.direct*.8);
      (water.material.uniforms.waterColor.value as THREE.Color).copy(nightWater).lerp(dayWater,state.daylight);
    },
    resize(width:number){const size=width<700?256:384;reflection.renderTarget?.setSize(size,size);},
    destroy(){reflection.renderTarget?.dispose();},
  };
}

/** A faint approximation of water-bounced light restricted to the window edge. */
export function applyWindowWaterLight(material:THREE.MeshStandardMaterial){
  const time={value:0},strength={value:0};
  const original=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    original.call(this,shader,renderer);
    shader.uniforms.uWaterLightTime=time;shader.uniforms.uWaterLightStrength=strength;
    shader.vertexShader=`varying vec3 vWaterLightPosition;\n${shader.vertexShader}`
      .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWaterLightPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`uniform float uWaterLightTime;uniform float uWaterLightStrength;varying vec3 vWaterLightPosition;\n${shader.fragmentShader}`
      .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        vec3 wp=vWaterLightPosition;
        float nearGlass=smoothstep(7.5,11.8,wp.x);
        float edge=max(smoothstep(7.7,9.5,wp.y),1.-smoothstep(0.,1.2,abs(wp.z+25.)))*smoothstep(.4,1.2,wp.y);
        vec2 p=wp.xz*.8+wp.y*.36;
        float ripples=sin(p.x*3.1+sin(p.y*1.3+uWaterLightTime*.32))*sin(p.y*2.4-uWaterLightTime*.27);
        float glint=smoothstep(.7,.98,abs(ripples));
        reflectedLight.indirectDiffuse+=vec3(.72,.82,.78)*glint*nearGlass*edge*uWaterLightStrength;`);
  };
  material.customProgramCacheKey=()=> 'gallery-water-light-v1';
  return {update(seconds:number,state:Daylight){time.value=seconds%(200*Math.PI);strength.value=state.direct*.034;}};
}
