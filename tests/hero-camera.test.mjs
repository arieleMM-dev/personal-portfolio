import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createHeroCameraRig, getHeroObjectScale, HERO_CAMERA } from '../src/scripts/webgl/hero/cameraRig.ts';
import { createVideoCube, VIDEO_CUBE } from '../src/scripts/webgl/hero/videoCube.ts';
import { createCityscape } from '../src/scripts/webgl/hero/cityscape.ts';

function setup(width = 1920, height = 1080) {
  const mobile = width < 768;
  const camera = new THREE.PerspectiveCamera(mobile ? 55 : 43, width / height, 0.1, 650);
  const rig = createHeroCameraRig(camera);
  const move = (x, y, seconds = 4, fps = 60) => {
    for (let frame = 0; frame < seconds * fps; frame++) {
      rig.update(1 / fps, new THREE.Vector2(x, y), false, mobile);
    }
  };
  const screenY = () => (1 - new THREE.Vector3(0, 3.65, -2).project(camera).y) / 2;
  return { camera, rig, move, screenY, mobile };
}

test('top/bottom input moves the scene ~22% of viewport height, not the DOM', () => {
  const { camera, move, screenY } = setup();
  move(0, -1);
  const upper = screenY();
  assert.ok(upper > 0.32 && upper < 0.35);
  assert.ok(Math.abs(THREE.MathUtils.radToDeg(camera.rotation.x) + 1) < 0.01);
  move(0, 1);
  const lower = screenY();
  assert.ok(lower > 0.54 && lower < 0.57);
  assert.ok(lower - upper > 0.20 && lower - upper < 0.24);
  assert.ok(camera.position.y >= 0.65);
  assert.equal(camera.position.z, HERO_CAMERA.desktopZ);
});

test('response is smooth, monotonic and consistent at 30/60/144 FPS', () => {
  const rotations = [30, 60, 144].map((fps) => {
    const { camera, rig } = setup();
    let previous = 5;
    for (let frame = 0; frame < fps * 2; frame++) {
      rig.update(1 / fps, new THREE.Vector2(0, 1), false, false);
      const pitch = THREE.MathUtils.radToDeg(camera.rotation.x);
      assert.ok(pitch >= previous && pitch < 11);
      previous = pitch;
    }
    return camera.rotation.x;
  });
  assert.ok(Math.abs(rotations[0] - rotations[2]) < 1e-10);
  const { camera, rig, move } = setup();
  rig.update(1 / 60, new THREE.Vector2(0, 1), false, false);
  assert.ok(THREE.MathUtils.radToDeg(camera.rotation.x) < 5.02);
  move(0, 1, 1.5);
  assert.ok(THREE.MathUtils.radToDeg(camera.rotation.x) > 10.7);
});

test('reduced motion cancels momentum and restores the neutral framing', () => {
  const { camera, rig, move } = setup();
  move(1, 1);
  rig.update(1 / 60, new THREE.Vector2(-1, -1), true, false);
  assert.equal(Math.abs(camera.position.x), 0);
  assert.equal(camera.position.y, HERO_CAMERA.eyeHeight);
  assert.equal(camera.rotation.y, 0);
  assert.ok(Math.abs(THREE.MathUtils.radToDeg(camera.rotation.x) - 5) < 1e-10);
});

test('the video cube including its deformation bounds stays in frame across rotation and aspect ratios', () => {
  const { group: services } = createVideoCube(new THREE.Texture());
  assert.ok(services.getObjectByName('video-cube-voxels'));
  for (const [width, height] of [[1920, 1080], [1366, 768], [800, 1024], [390, 844], [320, 844]]) {
    const { camera, move, mobile } = setup(width, height);
    services.scale.setScalar(getHeroObjectScale(camera.aspect, mobile));
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      move(x, y);
      for (let turn = 0; turn < 32; turn++) {
        services.rotation.y = turn / 32 * Math.PI * 2;
        for (const float of [-0.12, 0.12]) {
          services.position.set(0, 3.65 + float, -2);
          services.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(services);
          for (const px of [box.min.x, box.max.x])
            for (const py of [box.min.y, box.max.y])
              for (const pz of [box.min.z, box.max.z]) {
                const projected = new THREE.Vector3(px, py, pz).project(camera);
                assert.ok(Math.abs(projected.x) < 0.98 && Math.abs(projected.y) < 0.98,
                  `${width}x${height}, pointer ${x},${y}, rotation ${turn}: clipped monolith`);
              }
        }
      }
    }
  }
});

test('near and far towers cannot cover the crystal at the parallax extremes', () => {
  let seed = 71;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const { buildings } = createCityscape(new THREE.Color(), random);
  const matrix = new THREE.Matrix4();
  const towerBoxes = Array.from({ length: buildings.count }, (_, index) => {
    buildings.getMatrixAt(index, matrix);
    return new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5)).applyMatrix4(matrix);
  });
  const projectedRange = (box, camera) => {
    const values = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) values.push(new THREE.Vector3(x, y, z).project(camera).x);
    return [Math.min(...values), Math.max(...values)];
  };
  const { group } = createVideoCube(new THREE.Texture());
  for (const [width, height] of [[1920, 1080], [800, 1024], [390, 844]]) {
    const { camera, move, mobile } = setup(width, height);
    group.scale.setScalar(getHeroObjectScale(camera.aspect, mobile));
    group.position.set(0, 3.65, -2);
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      move(x, y);
      for (let turn = 0; turn < 16; turn++) {
        group.rotation.y = turn / 16 * Math.PI * 2;
        group.updateMatrixWorld(true);
        // Culling bounds expand in ALL directions, but attraction moves toward
        // the eye (preserving each cell center's screen position). Use the actual
        // shell plus 10% perspective/voxel-size margin for the visual corridor.
        const half = VIDEO_CUBE.size * 0.55;
        const shellBox = new THREE.Box3(new THREE.Vector3().setScalar(-half), new THREE.Vector3().setScalar(half));
        const [left, right] = projectedRange(shellBox.applyMatrix4(group.matrixWorld), camera);
        for (const box of towerBoxes) {
          const [towerLeft, towerRight] = projectedRange(box, camera);
          assert.ok(towerRight < left || towerLeft > right, `${width}x${height}: tower ${towerLeft},${towerRight} overlaps cube ${left},${right}`);
        }
      }
    }
  }
});
