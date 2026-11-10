import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGalleryPose, getActiveGalleryWork, getGalleryHashIndex, WORK_STOPS, WORK_X, GALLERY_FOV } from '../src/scripts/gallery/journey.ts';
import { galleryWorks, getGalleryWork } from '../src/data/experiences.ts';

test('gallery travel is continuous and each work has a stable dwell interval',()=>{
  for(const boundary of [.18,.33,.47,.63,.77,.91]){
    const before=getGalleryPose(boundary-1e-7,1.7),after=getGalleryPose(boundary+1e-7,1.7);
    for(const key of Object.keys(before))assert.ok(Math.abs(before[key]-after[key])<.0001,`Discontinuity at ${boundary}/${key}`);
  }
  WORK_STOPS.forEach((stop,index)=>{
    assert.deepEqual(getGalleryPose(stop-.015,1.7),getGalleryPose(stop+.015,1.7));
    assert.equal(getGalleryPose(stop,1.7).lookX,WORK_X[index]);
    assert.equal(getActiveGalleryWork(stop),index);
  });
});

test('each complete frame fits desktop and mobile at its viewing stop',()=>{
  for(const aspect of [.38,.45,.7,1,1.6,2]){
    const camera=new THREE.PerspectiveCamera(GALLERY_FOV,aspect,.08,420);
    WORK_STOPS.forEach((stop,index)=>{
      const pose=getGalleryPose(stop,aspect);
      camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(pose.lookX,pose.lookY,pose.lookZ);camera.updateMatrixWorld();
      for(const x of [-1.725,1.725])for(const y of [-1.43,1.43]){
        const point=new THREE.Vector3(WORK_X[index]+x,3.05+y,-8.65).project(camera);
        assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1&&Math.abs(point.z)<1,`Frame clipped at aspect ${aspect}`);
      }
    });
  }
});

test('reversing scroll retraces the same route; untrusted deep links cannot select other resources',()=>{
  assert.deepEqual(getGalleryPose(-5,1),getGalleryPose(0,1));assert.deepEqual(getGalleryPose(8,1),getGalleryPose(1,1));
  for(let index=0;index<galleryWorks.length;index++){
    const work=galleryWorks[index];assert.equal(getGalleryHashIndex(`#obra-${work.id}`),index);assert.equal(getGalleryWork(work.id),work);
  }
  assert.equal(getGalleryHashIndex('#obra-https://example.com'),-1);assert.equal(getGalleryWork('../private'),undefined);
  assert.equal(getActiveGalleryWork(0),-1);assert.equal(getActiveGalleryWork(1),-1);
});
