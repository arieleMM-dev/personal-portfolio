import assert from 'node:assert/strict';
import test from 'node:test';
import { openSync, readSync, closeSync, statSync } from 'node:fs';
import * as THREE from 'three';
import { createCubeShell, createVideoCube, VIDEO_CUBE } from '../src/scripts/webgl/hero/videoCube.ts';
import { advanceSpring, createVideoCubeInteraction } from '../src/scripts/webgl/hero/videoCubeInteraction.ts';
import { createHeroVideo, selectHeroVideo, HERO_VIDEO_SOURCES } from '../src/scripts/webgl/hero/videoSource.ts';

test('20 cubed exterior shell has 2168 unique cells and no hidden interior instances', () => {
  const centers = createCubeShell(20, 3.8);
  assert.equal(centers.length, 20 ** 3 - 18 ** 3);
  assert.equal(new Set(centers.map((v) => v.toArray().join(','))).size, 2168);
  const edge = 3.8 / 20 * 9.5;
  assert.ok(centers.every((v) => Math.abs(Math.max(...v.toArray().map(Math.abs)) - edge) < 1e-10));
  assert.throws(() => createCubeShell(1, 2), RangeError);
  const { voxels, update } = createVideoCube(new THREE.Texture());
  const version = voxels.instanceMatrix.version;
  update(100);
  assert.equal(voxels.count, 2168);
  assert.equal(voxels.instanceMatrix.version, version);
  assert.ok(voxels.boundingBox.max.z >= VIDEO_CUBE.size / 2 + 0.85);
});

test('adjacent cells map neighboring global UV regions, and vertex deformation cannot change the projection', () => {
  const { voxels, projection } = createVideoCube(new THREE.Texture());
  const matrix = new THREE.Matrix4();
  const pitch = VIDEO_CUBE.size / VIDEO_CUBE.divisions;
  const uvs = [];
  for (let index = 0; index < voxels.count; index++) {
    voxels.getMatrixAt(index, matrix);
    const [x, y, z] = new THREE.Vector3().setFromMatrixPosition(matrix).toArray();
    if (Math.abs(z - pitch * 9.5) < 1e-6 && Math.abs(y - pitch * 0.5) < 1e-6) uvs.push(x / VIDEO_CUBE.size + 0.5);
  }
  assert.equal(uvs.length, 20);
  uvs.sort((a, b) => a - b);
  for (let index = 1; index < uvs.length; index++) assert.ok(Math.abs(uvs[index] - uvs[index - 1] - 0.05) < 1e-6);
  const shader = { ...THREE.ShaderLib.physical, uniforms: {} };
  projection.material.onBeforeCompile(shader, {});
  assert.ok(shader.vertexShader.includes('distance(cellCenter, uMouse)'));
  assert.ok(shader.vertexShader.includes('normalize(uCameraLocal - cellCenter)'));
  assert.ok(shader.vertexShader.indexOf('vRestPosition =') < shader.vertexShader.indexOf('transformed = position *'));
  assert.ok(shader.fragmentShader.includes('vRestPosition / uCubeSize'));
});

test('interaction springs settle consistently at 30/60/144 FPS and relax on pointer exit', () => {
  const results = [30, 60, 144].map((fps) => {
    const spring = { position: 0, velocity: 0 };
    for (let frame = 0; frame < fps; frame++) advanceSpring(spring, 1, 1 / fps, 7);
    const peak = spring.position;
    for (let frame = 0; frame < fps * 2; frame++) advanceSpring(spring, 0, 1 / fps, 7);
    assert.ok(peak > 0.99 && peak < 1);
    assert.ok(spring.position < 0.0001 && spring.position > 0);
    return peak;
  });
  assert.ok(Math.abs(results[0] - results[2]) < 1e-12);
});

test('ray/box hit remains correct under rotation, translation, scale and Y-down mouse coordinates', () => {
  const group = new THREE.Group();
  group.position.set(0, 3.65, -2);
  group.rotation.y = Math.PI * 0.4;
  group.scale.setScalar(0.72);
  const camera = new THREE.PerspectiveCamera(43, 1.8, 0.1, 650);
  camera.position.set(0, 1.05, 18);
  camera.updateMatrixWorld();
  const interaction = createVideoCubeInteraction(group, 3.8);
  const projected = group.position.clone().project(camera);
  const pointer = new THREE.Vector2(projected.x, -projected.y);
  for (let i = 0; i < 120; i++) assert.equal(interaction.update(1 / 60, pointer, true, camera), true);
  assert.ok(interaction.attraction > 0.999);
  assert.ok(Math.abs(Math.max(...interaction.mouse.toArray().map(Math.abs)) - 1.9) < 1e-5);
  const exitStrength = interaction.attraction;
  interaction.update(1 / 60, pointer, false, camera);
  assert.ok(interaction.attraction > 0.9 && interaction.attraction < exitStrength);
  for (let i = 0; i < 180; i++) interaction.update(1 / 60, pointer, false, camera);
  assert.ok(interaction.attraction < 1e-6);
  interaction.update(1, pointer, true, camera, true);
  assert.equal(interaction.attraction, 0);
});

test('source selection is restricted to the two local videos', () => {
  assert.equal(selectHeroVideo(''), 'video1');
  assert.equal(selectHeroVideo('?heroVideo=video1'), 'video1');
  assert.equal(selectHeroVideo('?heroVideo=video2'), 'video2');
  assert.equal(selectHeroVideo('?heroVideo=https://example.com/x.mp4'), 'video1');
  assert.equal(HERO_VIDEO_SOURCES.video1, 'assets/hero/video1-optimized.mp4');
  assert.equal(HERO_VIDEO_SOURCES.video2, 'video2.mp4');
});

test('the default aquatic asset exists, stays below 8 MB and supports MP4 fast-start', () => {
  const file = new URL(`../public/${HERO_VIDEO_SOURCES.video1}`, import.meta.url);
  const size = statSync(file).size;
  assert.ok(size > 0 && size < 8_000_000);
  const fd = openSync(file, 'r');
  const header = Buffer.alloc(8);
  const boxes = [];
  try {
    for (let offset = 0; offset < size;) {
      assert.equal(readSync(fd, header, 0, 8, offset), 8);
      const length = header.readUInt32BE(0);
      assert.ok(length >= 8 && offset + length <= size);
      boxes.push(header.toString('ascii', 4, 8));
      offset += length;
    }
  } finally { closeSync(fd); }
  assert.equal(boxes[0], 'ftyp');
  assert.ok(boxes.includes('moov') && boxes.includes('mdat'));
  assert.ok(boxes.indexOf('moov') < boxes.indexOf('mdat'));
});

class FakeVideo extends EventTarget {
  paused = true; readyState = 0; videoWidth = 1920; videoHeight = 1080;
  dataset = {}; attributes = new Map(); attempts = 0; loads = 0; removed = false;
  deny = false; pendingResolve = null;
  setAttribute(key, value) { this.attributes.set(key, value); }
  removeAttribute(key) { this.attributes.delete(key); }
  load() { this.loads++; }
  pause() { this.paused = true; }
  remove() { this.removed = true; }
  async play() {
    this.attempts++;
    if (this.deny) throw new DOMException('Not allowed', 'NotAllowedError');
    this.paused = false;
  }
}

test('muted inline autoplay retries after rejection, pauses, and cleans up media and listeners', async () => {
  const oldDocument = globalThis.document;
  const oldWindow = globalThis.window;
  const video = new FakeVideo();
  const host = new EventTarget();
  globalThis.document = { createElement: () => video, body: { append: () => {} } };
  globalThis.window = host;
  try {
    let invalidations = 0;
    const source = createHeroVideo('/portfolio/', 'video2', () => invalidations++);
    assert.equal(video.src, '/portfolio/video2.mp4');
    assert.ok(video.muted && video.defaultMuted && video.playsInline && video.hidden && video.loop);
    assert.equal(source.texture.colorSpace, THREE.SRGBColorSpace);
    assert.equal(source.ready, false);
    video.deny = true;
    source.setActive(true);
    await Promise.resolve();
    assert.equal(video.dataset.playback, 'blocked');
    video.deny = false;
    host.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    assert.equal(video.dataset.playback, 'playing');
    video.readyState = 2;
    video.dispatchEvent(new Event('loadeddata'));
    assert.equal(invalidations, 1);
    assert.equal(source.ready, true);
    assert.equal(source.aspect, 1920 / 1080);
    source.setActive(false);
    assert.equal(video.paused, true);
    let disposed = 0;
    source.texture.addEventListener('dispose', () => disposed++);
    source.dispose();
    source.dispose();
    assert.equal(disposed, 1);
    assert.equal(video.removed, true);
    const attempts = video.attempts;
    host.dispatchEvent(new Event('pointerdown'));
    video.dispatchEvent(new Event('loadeddata'));
    assert.equal(video.attempts, attempts);
    assert.equal(invalidations, 1);
    for (const base of ['/', '/portfolio', '/portfolio/']) {
      const aquatic = createHeroVideo(base, selectHeroVideo(''), () => {});
      assert.equal(video.src, `${base.endsWith('/') ? base : `${base}/`}assets/hero/video1-optimized.mp4`);
      assert.equal(video.dataset.heroVideo, 'video1');
      aquatic.dispose();
    }
  } finally {
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
  }
});
