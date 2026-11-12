import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGalleryPose, getActiveGalleryWork, getGalleryHashIndex, WORK_STOPS, GALLERY_FOV } from '../src/scripts/gallery/journey.ts';
import { WORK_LAYOUT, HANGING_STUDIES, GALLERY_ROOM } from '../src/scripts/gallery/layout.ts';
import { galleryWorks, getGalleryWork } from '../src/data/experiences.ts';

test('gallery travel is continuous and each work has a stable dwell interval',()=>{
  for(const boundary of [.06,.18,.33,.47,.63,.77,.91]){
    const before=getGalleryPose(boundary-1e-7,1.7),after=getGalleryPose(boundary+1e-7,1.7);
    for(const key of Object.keys(before))assert.ok(Math.abs(before[key]-after[key])<.0001,`Discontinuity at ${boundary}/${key}`);
  }
  WORK_STOPS.forEach((stop,index)=>{
    assert.deepEqual(getGalleryPose(stop-.015,1.7),getGalleryPose(stop+.015,1.7));
    assert.equal(getGalleryPose(stop,1.7).lookX,WORK_LAYOUT[index].x);
    assert.equal(getActiveGalleryWork(stop),index);
  });
});

test('each complete frame fits desktop and mobile at its viewing stop',()=>{
  for(const aspect of [.38,.45,.7,1,1.6,2]){
    const camera=new THREE.PerspectiveCamera(GALLERY_FOV,aspect,.08,420);
    WORK_STOPS.forEach((stop,index)=>{
      const pose=getGalleryPose(stop,aspect);
      camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(pose.lookX,pose.lookY,pose.lookZ);camera.updateMatrixWorld();
      const frame=WORK_LAYOUT[index];
      for(const x of [-frame.width/2,frame.width/2])for(const y of [-frame.height/2,frame.height/2]){
        const point=new THREE.Vector3(frame.x+x,frame.y+y,frame.z+.06).project(camera);
        assert.ok(Math.abs(point.x)<.8&&Math.abs(point.y)<.8&&Math.abs(point.z)<1,`Frame clipped or without breathing room at aspect ${aspect}`);
      }
    });
  }
});

test('overview has real depth, approaches move forward and the route avoids hanging canvases',()=>{
  assert.ok(new Set(WORK_LAYOUT.map(work=>work.z)).size===3);
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshBasicMaterial();
  const objects=[...WORK_LAYOUT,...HANGING_STUDIES].map((frame,index)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(frame.x,frame.y,frame.z);
    mesh.scale.set(frame.width,frame.height,.14);mesh.rotation.y=frame.yaw??0;mesh.userData.index=index;mesh.updateMatrixWorld();return mesh;
  });
  for(const aspect of [.38,.7,1,1.7,2.2]){
    const intro=getGalleryPose(0,aspect);
    WORK_STOPS.forEach((stop,index)=>{
      const pose=getGalleryPose(stop,aspect),work=WORK_LAYOUT[index];
      assert.ok(intro.z-pose.z>7,'Each work should require a substantial approach');
      const origin=new THREE.Vector3(pose.x,pose.y,pose.z);
      for(const [x,y] of [[0,0],[-.46,-.46],[-.46,.46],[.46,-.46],[.46,.46]]){
        const direction=new THREE.Vector3(work.x+x*work.width,work.y+y*work.height,work.z).sub(origin).normalize();
        const hits=new THREE.Raycaster(origin,direction).intersectObjects(objects);
        assert.equal(hits[0]?.object.userData.index,index,`Another hanging work obscures frame ${index}, aspect ${aspect}`);
      }
    });
    for(let step=0;step<=1000;step++){
      const pose=getGalleryPose(step/1000,aspect);
      assert.ok(Math.abs(pose.x)<GALLERY_ROOM.halfWidth-1&&pose.y>1&&pose.y<GALLERY_ROOM.height-1);
      assert.ok(pose.z>GALLERY_ROOM.back+1&&pose.z<GALLERY_ROOM.front-1);
      const point=new THREE.Vector3(pose.x,pose.y,pose.z);
      for(const object of objects){
        const local=object.worldToLocal(point.clone());
        assert.ok(Math.abs(local.x)>.53||Math.abs(local.y)>.53||Math.abs(local.z)>.9,'Camera passes through a suspended frame');
      }
    }
  }
  geometry.dispose();material.dispose();
});

test('reversing scroll retraces the same route; untrusted deep links cannot select other resources',()=>{
  assert.deepEqual(getGalleryPose(-5,1),getGalleryPose(0,1));assert.deepEqual(getGalleryPose(8,1),getGalleryPose(1,1));
  for(let index=0;index<galleryWorks.length;index++){
    const work=galleryWorks[index];assert.equal(getGalleryHashIndex(`#obra-${work.id}`),index);assert.equal(getGalleryWork(work.id),work);
  }
  assert.equal(getGalleryHashIndex('#obra-https://example.com'),-1);assert.equal(getGalleryWork('../private'),undefined);
  assert.equal(getActiveGalleryWork(0),-1);assert.equal(getActiveGalleryWork(1),-1);
});
