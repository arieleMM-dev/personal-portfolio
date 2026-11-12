import * as THREE from 'three';
import { getGalleryDaylight, GALLERY_DAY_SECONDS } from '../../gallery/daylight.ts';
import { WORK_LAYOUT } from '../../gallery/layout.ts';

/** Direction-based sky shared by the distant horizon and its water reflection. */
export function createGallerySkyMaterial(){
  return new THREE.ShaderMaterial({
    fog:false,side:THREE.BackSide,depthWrite:false,
    uniforms:{horizon:{value:new THREE.Color()},zenith:{value:new THREE.Color()},sunDirection:{value:new THREE.Vector3()},daylight:{value:1},pastel:{value:0},uSkyTime:{value:0}},
    vertexShader:`varying vec3 vDirection;void main(){vec4 world=modelMatrix*vec4(position,1.);vDirection=world.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform vec3 horizon;uniform vec3 zenith;uniform vec3 sunDirection;uniform float daylight;uniform float pastel;uniform float uSkyTime;varying vec3 vDirection;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.);
        vec3 sky=mix(horizon,zenith,pow(h,.48));
        vec2 p=d.xz/max(.16,d.y)*1.6+vec2(sin(uSkyTime*.006),cos(uSkyTime*.005))*.12;
        float cloud=noise(p)*.6+noise(p*2.1)*.28+noise(p*4.2)*.12;
        float veil=smoothstep(.48,.79,cloud)*smoothstep(.015,.18,h);
        vec3 cloudColor=mix(vec3(.91,.9,.85),vec3(.95,.78,.81),pastel*.65);
        sky=mix(sky,mix(horizon,cloudColor,daylight*.55),veil*.38);
        float glow=pow(max(dot(d,normalize(sunDirection)),0.),90.)*daylight*.035;
        gl_FragColor=vec4(sky+vec3(1.,.88,.72)*glow,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
}

export function createGalleryLighting(exterior:THREE.ShaderMaterial,ceiling:THREE.MeshBasicMaterial){
  const group=new THREE.Group();group.name='Gallery solar cycle';
  const hemi=new THREE.HemisphereLight(0xe9f0fa,0xb3b6b0,1.35);
  const ambient=new THREE.AmbientLight(0xffffff,.24);group.add(hemi,ambient);
  const sun=new THREE.DirectionalLight(0xfff4de,3.6);
  sun.name='Gallery sun';sun.target.position.set(-4,0,-6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:.5,far:120});
  sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=3;
  group.add(sun,sun.target);
  const windowFill=new THREE.RectAreaLight(0xe8f1ff,2.1,25,7);
  windowFill.position.set(11.8,5.5,-4);windowFill.lookAt(-8,3,-4);group.add(windowFill);
  const bounce=new THREE.DirectionalLight(0xe5edff,.65);bounce.position.set(-10,7,18);bounce.target.position.set(0,4,-10);group.add(bounce,bounce.target);
  const ceilingFill=new THREE.RectAreaLight(0xffe1b5,0,19,35);
  ceilingFill.position.set(0,9.25,-5);ceilingFill.rotation.x=-Math.PI/2;group.add(ceilingFill);
  const spots=WORK_LAYOUT.map(work=>{
    const light=new THREE.SpotLight(0xffe1b8,0,22,.46,.75,2);
    light.position.set(work.x,9.05,work.z+2.5);light.target.position.set(work.x,work.y,work.z);
    group.add(light,light.target);return light;
  });
  const palette={daySky:new THREE.Color(0xa4bfce),dayHorizon:new THREE.Color(0xe5dfd2),
    dusk:new THREE.Color(0xe8b7c5),lavender:new THREE.Color(0xb8b5cc),nightSky:new THREE.Color(0x34485d),nightHorizon:new THREE.Color(0x6b7d8a),
    sun:new THREE.Color(0xfff4de),gold:new THREE.Color(0xffbb79),
    skyFill:new THREE.Color(0xe8f1ff),roseFill:new THREE.Color(0xffe0df),nightFill:new THREE.Color(0x8398b6),
    ceilingDay:new THREE.Color(0xd1d3c9),ceilingNight:new THREE.Color(0xffdeab)};
  let lastShadow=-1,wasDirect=false;
  let shadowInterval=1/12;
  const direction=new THREE.Vector3();
  function update(seconds:number){
    const state=getGalleryDaylight(seconds),{daylight:day,direct,warmth,lamps,pastel}=state;
    direction.set(...state.sunDirection);sun.position.copy(sun.target.position).addScaledVector(direction,65);
    sun.intensity=state.sunIntensity;sun.color.copy(palette.sun).lerp(palette.gold,warmth);
    sun.shadow.radius=3+warmth*1.5;
    hemi.intensity=.3+day*1.05;hemi.color.copy(palette.nightFill).lerp(palette.skyFill,day);
    ambient.intensity=.16+day*.08;
    windowFill.intensity=.12+day*1.98;windowFill.color.copy(palette.nightFill).lerp(palette.skyFill,day).lerp(palette.roseFill,pastel*.3);
    bounce.intensity=.13+day*.52;
    ceilingFill.intensity=lamps*.8;
    ceiling.color.copy(palette.ceilingDay).lerp(palette.ceilingNight,lamps);
    for(const light of spots)light.intensity=lamps*155;
    (exterior.uniforms.zenith.value as THREE.Color).copy(palette.nightSky).lerp(palette.daySky,day).lerp(palette.lavender,pastel*.34);
    (exterior.uniforms.horizon.value as THREE.Color).copy(palette.nightHorizon).lerp(palette.dayHorizon,day).lerp(palette.dusk,pastel*.72);
    (exterior.uniforms.sunDirection.value as THREE.Vector3).copy(direction);exterior.uniforms.daylight.value=day;exterior.uniforms.pastel.value=pastel;
    const changed=lastShadow<0||(state.phase-lastShadow+GALLERY_DAY_SECONDS)%GALLERY_DAY_SECONDS>=shadowInterval||wasDirect!==(direct>0);
    const shadowsChanged=changed&&(direct>0||wasDirect);
    if(changed){lastShadow=state.phase;wasDirect=direct>0;}
    return {night:day<.35,shadowsChanged,day:state};
  }
  update(0);
  return {group,update,
    resize(width:number){
      shadowInterval=width<700?1/8:1/12;
      const size=width<700?1024:2048;
      if(sun.shadow.mapSize.x!==size){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);lastShadow=-1;}
    },
    destroy(){sun.shadow.map?.dispose();},
  };
}
