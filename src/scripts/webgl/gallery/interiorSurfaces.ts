import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { GalleryResources } from './resources';

/** Fixed material grain: no animated noise or photographic facade. */
export function createInteriorMaterials(resources: GalleryResources) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d')!;const pixels=ctx.createImageData(512,512);let seed=419;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const clouds=Math.sin(x*.029+Math.sin(y*.013))*1.4+Math.sin(y*.047+x*.011)*.8;
    const value=211+clouds+(seed/4294967296-.5)*8;const i=(y*512+x)*4;
    pixels.data[i]=value;pixels.data[i+1]=value+1;pixels.data[i+2]=value;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const map=resources.texture(new THREE.CanvasTexture(canvas));map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(5,10);map.anisotropy=4;
  const bump=resources.texture(map.clone());bump.colorSpace=THREE.NoColorSpace;
  const plaster=resources.material(new THREE.MeshStandardMaterial({color:0xeceeea,roughness:.94,bumpMap:bump,bumpScale:.009}));
  const floor=resources.material(new THREE.MeshStandardMaterial({color:0xc8ccc9,map,bumpMap:bump,bumpScale:.007,roughness:.3,metalness:.06}));
  return {plaster,floor};
}

/** A low-resolution, softly filtered planar reflection over the lit concrete. */
export function createPolishedFloor(resources: GalleryResources,width:number,length:number) {
  const texel=new THREE.Vector2(1/768,1/768);
  const reflector=new Reflector(resources.geometry(new THREE.PlaneGeometry(width,length)),{
    textureWidth:768,textureHeight:768,clipBias:.003,multisample:0,
    shader:{
      uniforms:{color:{value:new THREE.Color(0xffffff)},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},uTexel:{value:texel}},
      vertexShader:`uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vView;
        void main(){vec4 world=modelMatrix*vec4(position,1.);vView=cameraPosition-world.xyz;
        vUv=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 uTexel;varying vec4 vUv;varying vec3 vView;
        void main(){vec2 uv=vUv.xy/vUv.w;vec2 r=uTexel*2.4;
          vec3 c=texture2D(tDiffuse,uv).rgb*.28;
          c+=(texture2D(tDiffuse,uv+r).rgb+texture2D(tDiffuse,uv-r).rgb+texture2D(tDiffuse,uv+vec2(r.x,-r.y)).rgb+texture2D(tDiffuse,uv+vec2(-r.x,r.y)).rgb)*.12;
          c+=(texture2D(tDiffuse,uv+vec2(r.x*2.,0.)).rgb+texture2D(tDiffuse,uv-vec2(r.x*2.,0.)).rgb)*.12;
          float grazing=pow(1.-abs(normalize(vView).y),3.);
          gl_FragColor=vec4(c,.12+grazing*.2);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  const material=reflector.material as THREE.ShaderMaterial;
  material.transparent=true;material.depthWrite=false;reflector.renderOrder=2;
  reflector.rotation.x=-Math.PI/2;reflector.position.y=.008;
  return {
    reflector,
    resize(width:number,height:number){
      const w=Math.min(1024,Math.max(384,Math.round(width*.65))),h=Math.min(1024,Math.max(384,Math.round(height*.65)));
      reflector.getRenderTarget().setSize(w,h);(material.uniforms.uTexel.value as THREE.Vector2).set(1/w,1/h);
    },
    destroy(){reflector.dispose();},
  };
}
