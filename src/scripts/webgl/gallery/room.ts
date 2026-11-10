import * as THREE from 'three';
import { GalleryResources } from './resources';
import { createStudyTexture } from './surfaces';
import { WORK_X } from '../../gallery/journey';

export function createGalleryRoom(resources: GalleryResources) {
  const group = new THREE.Group();
  const fixtures = new THREE.Group();group.add(fixtures);
  const {plaster,stone}=resources;
  resources.box(group,20,0.2,27,0,-0.1,1,stone);
  resources.box(group,20,6.5,0.25,0,3.25,-9);
  resources.box(group,0.28,6.5,26,-10,3.25,1);
  resources.box(group,0.28,6.5,26,10,3.25,1);
  resources.box(group,7.25,0.24,25,-6.4,6.45,1);
  resources.box(group,7.25,0.24,25,6.4,6.45,1);
  resources.box(group,5.5,0.24,2.5,0,6.45,-7.75);
  resources.box(group,5.5,0.24,2.5,0,6.45,12.25);
  const daylight=resources.material(new THREE.MeshBasicMaterial({color:0xf6f3e8}));
  const window=new THREE.Mesh(resources.geometry(new THREE.PlaneGeometry(5.3,17.5)),daylight);
  window.rotation.x=Math.PI/2;window.position.set(0,6.7,1.5);group.add(window);
  for(const z of [-5.5,-1,3.5,8])resources.box(group,5.5,0.08,0.09,0,6.55,z,plaster);
  const rail=resources.material(new THREE.MeshStandardMaterial({color:0x7e8079,roughness:0.6,metalness:0.15}));
  for(const x of [-5.4,5.4])resources.box(fixtures,0.045,0.06,19,x,6.04,0,rail);
  const frameMaterial=resources.material(new THREE.MeshStandardMaterial({color:0x8a8476,roughness:0.63,metalness:0.1}));
  const targets:THREE.Object3D[]=[];
  WORK_X.forEach((x,index)=>{
    const frame=new THREE.Group();frame.position.set(x,3.05,-8.72);group.add(frame);
    const outer=resources.box(frame,3.45,2.86,0.13,0,0,0,frameMaterial);
    outer.userData.workIndex=index;targets.push(outer);
    resources.box(frame,3.31,2.72,0.04,0,0,0.08,plaster);
    const texture=resources.texture(createStudyTexture(index));
    const material=resources.material(new THREE.MeshStandardMaterial({map:texture,roughness:0.93,metalness:0}));
    const picture=new THREE.Mesh(resources.geometry(new THREE.PlaneGeometry(3.08,2.4)),material);
    picture.position.z=0.108;picture.userData.workIndex=index;frame.add(picture);targets.push(picture);
    resources.box(group,0.27,0.1,0.015,x+1.6,1.41,-8.84,frameMaterial);
    const lamp=new THREE.Mesh(resources.geometry(new THREE.CylinderGeometry(.08,.08,.24,12)),rail);
    lamp.rotation.x=Math.PI/4;lamp.position.set(x,5.9,-5.8);fixtures.add(lamp);
    const spot=new THREE.SpotLight(0xfff8e7,18,13,0.4,0.85,2);spot.position.copy(lamp.position);
    spot.target.position.set(x,3,-8.7);group.add(spot,spot.target);
  });
  // Quiet bench and a slightly darker skirting give the open room a human scale.
  resources.box(group,3.6,0.14,0.9,0,0.62,1.4,stone);
  for(const x of [-1.3,1.3])resources.box(group,0.17,0.55,0.64,x,0.28,1.4,stone);
  resources.box(group,19.8,0.06,0.05,0,0.03,-8.83,stone);
  group.add(new THREE.HemisphereLight(0xfffcf4,0xc7cac3,1.8));
  group.add(new THREE.AmbientLight(0xffffff,0.7));
  const sun=new THREE.DirectionalLight(0xfffdf7,2.2);sun.position.set(-3,10,4);sun.target.position.set(0,1,-5);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:0.5,far:35});
  sun.shadow.normalBias=0.04;sun.shadow.bias=-0.0002;sun.shadow.radius=6;
  group.add(sun,sun.target);
  return {group,targets,fixtures,destroy(){sun.shadow.map?.dispose();}};
}
