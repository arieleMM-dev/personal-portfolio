import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GalleryResources } from './resources';
import { createDoorPaintTexture } from './surfaces';

export function createOceanDoor(resources: GalleryResources, normals: THREE.Texture) {
  const group = new THREE.Group();
  const sky = new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(180,32,20)), resources.material(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false,
    vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec3 vDirection;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      void main(){
        vec3 d=normalize(vDirection);float h=clamp(d.y,0.,1.);
        vec3 sky=mix(vec3(.87,.865,.82),vec3(.49,.64,.72),pow(h,.55));
        vec2 p=d.xz/max(.12,d.y)*1.8;
        float cloud=noise(p*.9)*.57+noise(p*2.1)*.28+noise(p*4.3)*.15;
        float cloudMask=smoothstep(.44,.76,cloud)*smoothstep(.02,.25,h);
        sky=mix(sky,vec3(.95,.93,.875),cloudMask*.62);
        float sunset=exp(-pow((h-.22)*3.8,2.))*(.55+.45*d.x);
        sky=mix(sky,vec3(.89,.73,.70),sunset*(.045+cloudMask*.085));
        sky=mix(sky,vec3(.9,.88,.82),exp(-abs(d.y)*13.)*.75);
        gl_FragColor=vec4(sky,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })));
  group.add(sky);
  const water = new Water(resources.geometry(new THREE.PlaneGeometry(1400,1400)), {
    textureWidth:512, textureHeight:512, waterNormals:normals,
    sunDirection:new THREE.Vector3(-0.5,0.45,-0.9).normalize(), sunColor:0xe6ddc4,
    waterColor:0x8ba5a6, distortionScale:0.48, fog:true, clipBias:0.003,
  });
  resources.material(water.material);
  water.rotation.x=-Math.PI/2;
  water.material.uniforms.size.value=7;
  // Traveling wind ripples perturb the reflected sky and door without making the sea choppy.
  water.material.fragmentShader=water.material.fragmentShader.replace(
    'vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
    `vec2 windSlope=vec2(
      .028*cos(dot(worldPosition.xz,vec2(.72,.31))-time*.8),
      .022*cos(dot(worldPosition.xz,vec2(-.28,.93))-time*.57)
    );
    vec3 surfaceNormal=normalize(noise.xzy*vec3(.28,1.,.28)+vec3(windSlope.x,0.,windSlope.y));`,
  );
  group.add(water);
  const door = new THREE.Group();group.add(door);
  resources.box(door,2.42,0.13,0.85,0,0.075,0.03,resources.stone);
  const paintMap=resources.texture(createDoorPaintTexture());
  const paintBump=resources.texture(paintMap.clone());paintBump.colorSpace=THREE.NoColorSpace;
  const paint=resources.material(new THREE.MeshStandardMaterial({
    color:0xfffdf7,map:paintMap,bumpMap:paintBump,bumpScale:.006,roughness:.67,metalness:0,
  }));
  paint.emissive.set(0xfff8eb);paint.emissiveIntensity=0;
  function paintedBox(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material=paint){
    const mesh=new THREE.Mesh(resources.geometry(new RoundedBoxGeometry(w,h,d,2,Math.min(.012,d*.22))),material);
    mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  paintedBox(door,0.15,3.85,0.26,-1.02,2.0,0);
  paintedBox(door,0.15,3.85,0.26,1.02,2.0,0);
  paintedBox(door,2.18,0.16,0.26,0,3.85,0);
  const glow=resources.material(new THREE.MeshBasicMaterial({color:0xf4eedf}));
  const portal=resources.box(door,1.9,3.64,0.035,0,1.96,-0.075,glow);
  portal.castShadow=false;
  const hinge = new THREE.Group(); hinge.position.set(-0.94,0.14,0.035);door.add(hinge);
  paintedBox(hinge,1.88,3.62,0.105,0.94,1.81,0);
  const inset=resources.material(paint.clone());inset.color.set(0xeeeae0);
  for (const x of [0.49,1.39]) for (const y of [0.68,1.81,2.94]) {
    paintedBox(hinge,0.73,0.89,0.035,x,y,0.063,inset);
    paintedBox(hinge,0.63,0.79,0.018,x,y,0.086);
  }
  const metal=resources.material(new THREE.MeshStandardMaterial({color:0x99988a,metalness:0.72,roughness:0.33}));
  const rosette=new THREE.Mesh(resources.geometry(new THREE.CylinderGeometry(.075,.075,.018,24)),metal);
  rosette.rotation.x=Math.PI/2;rosette.position.set(1.65,1.72,.09);hinge.add(rosette);
  const handle=new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(0.055,14,10)),metal);
  handle.position.set(1.65,1.72,0.17);hinge.add(handle);
  resources.box(hinge,0.17,0.032,0.045,1.59,1.72,0.19,metal);
  for (const y of [0.55,1.8,3.1]) resources.box(door,0.06,0.18,0.06,-0.94,y,0.1,metal);
  group.add(new THREE.HemisphereLight(0xf9fcff,0x819a9e,2.4));
  const key=new THREE.DirectionalLight(0xfffcf2,2.8);key.position.set(-5,8,6);key.target.position.set(0,1.9,0);
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.012;key.shadow.bias=-.0002;
  Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:25});
  group.add(key,key.target);
  const reflection: THREE.Texture=water.material.uniforms.mirrorSampler.value;
  return {group,door,hinge,water,paint, destroy(){reflection.renderTarget?.dispose();key.shadow.dispose();}};
}
