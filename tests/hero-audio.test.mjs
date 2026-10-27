import assert from 'node:assert/strict';
import test from 'node:test';
import { createHeroSoundtrack } from '../src/scripts/heroSoundtrack.ts';
import { AUDIO_FILES, prepareAudioSample } from '../src/scripts/audioSamples.ts';
import { statSync } from 'node:fs';

function audioEnvironment({ blocked = false } = {}) {
  const instances = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  const requests = [];
  const parameter = () => ({
    value: 0, events: [],
    cancelAndHoldAtTime(time) { this.events.push(['hold', time]); },
    linearRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]); },
    setValueAtTime(value, time) { this.events.push(['set', value, time]); },
    exponentialRampToValueAtTime(value, time) { this.events.push(['exponential', value, time]); },
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
      const source = this.node({ ...properties, start(...args) { this.started = true; this.starts = args; }, stop() { this.stopped = true; } });
      this.sources.push(source); return source;
    }
    createGain() { return this.node({ gain: parameter() }); }
    createDelay() { return this.node({ delayTime: parameter() }); }
    createBiquadFilter() { return this.node({ frequency: parameter(), Q: parameter() }); }
    createOscillator() { return this.source({ frequency: parameter(), detune: parameter() }); }
    createBufferSource() { return this.source({ buffer: null, playbackRate: parameter() }); }
    createBuffer(channels, length) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { length, sampleRate: this.sampleRate, duration: length / this.sampleRate, numberOfChannels: channels, getChannelData: channel => data[channel] };
    }
    async decodeAudioData(data) {
      const url = new TextDecoder().decode(data);
      const buffer = this.createBuffer(1, url.includes('lesiakower') ? 600 : 1600);
      buffer.getChannelData(0).fill(0.5, 100, buffer.length - 100);
      buffer.url = url;
      return buffer;
    }
  }
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: AudioContext });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async url => {
    requests.push(url);
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode(url).buffer };
  } });
  return { instances, requests, restore() {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original);
    else delete globalThis.AudioContext;
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch);
    else delete globalThis.fetch;
  } };
}

test('soundscape waits for consent, loops continuously and starts at zero volume', async () => {
  const env = audioEnvironment();
  const audio = createHeroSoundtrack();
  try {
    await audio.setActive(true);
    assert.equal(env.instances.length, 0, 'scroll and visibility cannot create audio');
    assert.equal(env.requests.length, 0, 'MP3 files are not fetched without consent');
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
    assert.equal(env.requests.length, 2, 'both local samples are cached after activation');
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
    assert.deepEqual(ctx.nodes[0].gain.events.at(-1), ['ramp', 0.38, 12.4]);
    await audio.setActive(false);
    assert.deepEqual(ctx.nodes[0].gain.events.at(-1), ['ramp', 0, 10.8]);
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

test('header uses a crystal partial and each vertical hover uses the chosen MP3', async () => {
  const env = audioEnvironment();
  const audio = createHeroSoundtrack();
  try {
    assert.equal(audio.playCue('header'), false);
    await audio.unlock();
    assert.equal(audio.playCue('header'), false, 'unlock alone cannot enable effects');
    await audio.setActive(true);
    const ctx = env.instances[0];
    assert.equal(audio.playCue('header'), true);
    const header = ctx.sources.at(-2);
    assert.equal(header.frequency.events[0][1], 1174.66);
    assert.ok(ctx.sources.at(-1).frequency.value > 3000, 'a quiet inharmonic partial adds the glass timbre');
    assert.equal(audio.playCue('tracker'), true, 'different hover targets respond without a shared cooldown');
    const firstTracker = ctx.sources.at(-1);
    assert.ok(firstTracker.buffer.url.endsWith(AUDIO_FILES.tracker));
    ctx.currentTime += 0.3;
    assert.equal(audio.playCue('tracker'), true);
    assert.notEqual(ctx.sources.at(-1), firstTracker, 'entering another node restarts the sample');
    assert.equal(audio.playCue('tracker'), false);
    assert.equal(audio.playCue('section'), true);
    const breath = ctx.sources.at(-1);
    assert.ok(breath.buffer, 'the transition uses filtered air rather than a beep');
    assert.notEqual(breath.loop, true);
    assert.equal(audio.playCue('tower'), false, 'a simultaneous tower cannot compete with navigation');
    ctx.currentTime += 1.2;
    assert.equal(audio.playCue('tower'), true);
    assert.equal(ctx.sources.at(-1).frequency.events[0][1], 146.83);
    const beforeMute = ctx.sources.length;
    await audio.setActive(false, true);
    assert.equal(audio.playCue('tower'), false);
    assert.equal(audio.playCue('section'), false);
    assert.equal(ctx.sources.length, beforeMute, 'mute blocks all effects immediately');
    assert.ok(header.disconnected && breath.disconnected);
  } finally { audio.destroy(); env.restore(); }
});

test('Hero sample is softened, slowed slightly and cannot repeat during the same entrance', async () => {
  const env = audioEnvironment();
  const audio = createHeroSoundtrack('/portfolio/');
  try {
    await audio.unlock();
    await audio.setActive(true);
    const ctx = env.instances[0];
    const count = ctx.nodes.length;
    assert.equal(audio.playCue('intro'), true);
    const sample = ctx.sources.at(-1);
    assert.ok(sample.buffer.url.endsWith(AUDIO_FILES.intro));
    assert.equal(sample.playbackRate.value, 0.92);
    assert.equal(ctx.nodes[count + 1].frequency.events[0][1], 1800);
    assert.ok(ctx.nodes[count].gain.events.some(([kind, value]) => kind === 'ramp' && value === 0.14));
    assert.equal(audio.playCue('intro'), false);
    assert.ok(env.requests.every(url => url.startsWith('/portfolio/assets/audio/')));
  } finally { audio.destroy(); env.restore(); }
});

test('supplied MP3s exist and trimming removes padding without cutting the signal', () => {
  for (const path of Object.values(AUDIO_FILES)) assert.ok(statSync(new URL(`../public/${path}`, import.meta.url)).size > 1000);
  const data = new Float32Array(1000);
  data.fill(0.25, 200, 500);
  const buffer = { length: 1000, sampleRate: 1000, duration: 1, numberOfChannels: 1, getChannelData: () => data };
  const sample = prepareAudioSample(buffer);
  assert.ok(sample.offset < 0.2 && sample.offset > 0.18);
  assert.ok(sample.offset + sample.duration > 0.5 && sample.offset + sample.duration < 0.6);
  assert.ok(sample.gain <= 2, 'normalization never amplifies quiet noise without a bound');
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
