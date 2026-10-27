import assert from 'node:assert/strict';
import test from 'node:test';
import { createHeroSoundtrack } from '../src/scripts/heroSoundtrack.ts';

function audioEnvironment({ blocked = false } = {}) {
  const instances = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const parameter = () => ({
    value: 0, events: [],
    cancelAndHoldAtTime(time) { this.events.push(['hold', time]); },
    linearRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]); },
  });
  class AudioContext {
    state = 'suspended'; currentTime = 10; sampleRate = 1000; destination = {}; nodes = []; sources = [];
    constructor() { instances.push(this); }
    async resume() { if (blocked) throw new Error('Playback blocked'); this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
    node(properties = {}) {
      const node = { ...properties, connect() {}, disconnect() { this.disconnected = true; } };
      this.nodes.push(node); return node;
    }
    source(properties = {}) {
      const source = this.node({ ...properties, start() { this.started = true; }, stop() { this.stopped = true; } });
      this.sources.push(source); return source;
    }
    createGain() { return this.node({ gain: parameter() }); }
    createDelay() { return this.node({ delayTime: parameter() }); }
    createBiquadFilter() { return this.node({ frequency: parameter(), Q: parameter() }); }
    createOscillator() { return this.source({ frequency: parameter(), detune: parameter() }); }
    createBufferSource() { return this.source(); }
    createBuffer(channels, length) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { length, numberOfChannels: channels, getChannelData: channel => data[channel] };
    }
  }
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: AudioContext });
  return { instances, restore() {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original);
    else delete globalThis.AudioContext;
  } };
}

test('soundscape waits for consent, loops continuously and starts at zero volume', async () => {
  const env = audioEnvironment();
  const audio = createHeroSoundtrack();
  try {
    await audio.setActive(true);
    assert.equal(env.instances.length, 0, 'scroll and visibility cannot create audio');
    assert.equal(await audio.unlock(), true);
    const ctx = env.instances[0];
    assert.equal(ctx.nodes[0].gain.value, 0);
    assert.equal(ctx.sources.length, 7);
    assert.ok(ctx.sources.every(source => source.started && !source.stopped));
    const surf = ctx.sources.find(source => source.buffer);
    assert.equal(surf.loop, true);
    assert.equal(surf.buffer.numberOfChannels, 2);
    const samples = surf.buffer.getChannelData(0);
    assert.equal(Math.abs(samples[0]), 0);
    assert.equal(Math.abs(samples.at(-1)), 0);
    assert.ok(samples.some(sample => Math.abs(sample) > 0.01));
    assert.ok(samples.every(Number.isFinite));
    await audio.unlock();
    assert.equal(env.instances.length, 1, 'subsequent activation reuses the graph');
  } finally { audio.destroy(); env.restore(); }
});

test('mute fades out and suspends audio; returning cancels a pending suspension', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const env = audioEnvironment();
  const audio = createHeroSoundtrack();
  try {
    await audio.unlock();
    const ctx = env.instances[0];
    await audio.setActive(true);
    assert.deepEqual(ctx.nodes[0].gain.events.at(-1), ['ramp', 0.65, 11.8]);
    await audio.setActive(false);
    assert.deepEqual(ctx.nodes[0].gain.events.at(-1), ['ramp', 0, 11.1]);
    t.mock.timers.tick(1200);
    assert.equal(ctx.state, 'suspended');
    await audio.setActive(true);
    assert.equal(ctx.state, 'running');
    await audio.setActive(false);
    await audio.setActive(true);
    t.mock.timers.tick(1200);
    assert.equal(ctx.state, 'running', 'a stale fade-out cannot suspend resumed playback');
    await audio.setActive(false, true);
    assert.equal(ctx.state, 'suspended', 'background tabs stop immediately');
  } finally { audio.destroy(); env.restore(); t.mock.timers.reset(); }
});

test('disposing releases every audio node and prevents later playback', async () => {
  const env = audioEnvironment();
  const audio = createHeroSoundtrack();
  try {
    await audio.unlock();
    const ctx = env.instances[0];
    audio.destroy();
    assert.ok(ctx.sources.every(source => source.stopped));
    assert.ok(ctx.nodes.every(node => node.disconnected));
    assert.equal(ctx.state, 'closed');
    assert.equal(await audio.unlock(), false);
    await audio.setActive(true);
    audio.destroy();
    assert.equal(env.instances.length, 1);
  } finally { audio.destroy(); env.restore(); }
});

test('blocked playback and disposal during activation are handled without rejection', async () => {
  const env = audioEnvironment({ blocked: true });
  const audio = createHeroSoundtrack();
  try { assert.equal(await audio.unlock(), false); }
  finally { audio.destroy(); env.restore(); }
  const second = audioEnvironment();
  const pendingAudio = createHeroSoundtrack();
  try {
    const ready = pendingAudio.unlock();
    pendingAudio.destroy();
    assert.equal(await ready, false);
    assert.equal(second.instances[0].state, 'closed');
  } finally { pendingAudio.destroy(); second.restore(); }
});
