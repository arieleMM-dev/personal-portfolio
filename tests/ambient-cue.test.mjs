import assert from 'node:assert/strict';
import test from 'node:test';
import { createAmbientCue } from '../src/scripts/ambientCue.ts';

function audioEnvironment({ resumeFails = false } = {}) {
  const instances = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const parameter = () => ({
    value: 0, events: [],
    setValueAtTime(...args) { this.events.push(['set', ...args]); },
    linearRampToValueAtTime(...args) { this.events.push(['linear', ...args]); },
    exponentialRampToValueAtTime(...args) { this.events.push(['exponential', ...args]); },
    cancelScheduledValues(...args) { this.events.push(['cancel', ...args]); },
    setTargetAtTime(...args) { this.events.push(['target', ...args]); },
  });
  const node = () => ({
    connections: [], disconnected: false,
    connect(target) { this.connections.push(target); },
    disconnect() { this.disconnected = true; },
  });
  class AudioContext {
    state = 'suspended'; currentTime = 10; destination = {}; nodes = []; tones = []; closed = false;
    constructor() { instances.push(this); }
    async resume() { if (resumeFails) throw new Error('Playback blocked'); this.state = 'running'; }
    async close() { this.closed = true; this.state = 'closed'; }
    createGain() { const gain = { ...node(), gain: parameter() }; this.nodes.push(gain); return gain; }
    createDelay() { const delay = { ...node(), delayTime: parameter() }; this.nodes.push(delay); return delay; }
    createBiquadFilter() { const filter = { ...node(), frequency: parameter(), Q: parameter() }; this.nodes.push(filter); return filter; }
    createOscillator() {
      const tone = { ...node(), frequency: parameter(), stops: [], start(time) { this.started = time; }, stop(time) { this.stops.push(time); } };
      this.tones.push(tone); this.nodes.push(tone); return tone;
    }
  }
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: AudioContext });
  return { instances, restore() {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original);
    else delete globalThis.AudioContext;
  } };
}

test('sonar is silent until requested, uses quiet envelopes and distinguishes pause/resume', async () => {
  const env = audioEnvironment();
  const cue = createAmbientCue();
  try {
    assert.equal(env.instances.length, 0);
    await cue.play(true);
    const context = env.instances[0];
    assert.equal(context.state, 'running');
    assert.deepEqual(context.tones[0].frequency.events, [['set', 440, 10], ['exponential', 330, 10.28]]);
    assert.ok(context.nodes[0].gain.events.some(([kind, value]) => kind === 'linear' && value === 0.035));
    assert.equal(context.tones[0].stops[0], 10.75);
    await cue.play(false);
    assert.equal(env.instances.length, 1, 'reuses its context');
    assert.deepEqual(context.tones[2].frequency.events, [['set', 330, 10], ['exponential', 440, 10.28]]);
    assert.equal(context.tones[0].stops.at(-1), 10.08, 'fades the previous cue on rapid clicks');
    context.tones[0].onended();
    assert.ok(context.nodes.slice(0, 6).every(node => node.disconnected));
    cue.destroy();
    assert.equal(context.closed, true);
    await cue.play(true);
    assert.equal(context.tones.length, 4, 'destroyed controls cannot play');
  } finally { cue.destroy(); env.restore(); }
});

test('only the latest gesture plays while audio activation is pending', async () => {
  const env = audioEnvironment();
  const cue = createAmbientCue();
  try {
    await Promise.all([cue.play(true), cue.play(false)]);
    assert.equal(env.instances[0].tones.length, 2);
    assert.equal(env.instances[0].tones[0].frequency.events[0][1], 330);
  } finally { cue.destroy(); env.restore(); }
});

test('blocked audio does not reject the interaction', async () => {
  const env = audioEnvironment({ resumeFails: true });
  const cue = createAmbientCue();
  try {
    await assert.doesNotReject(cue.play(true));
    assert.equal(env.instances[0].tones.length, 0);
  } finally { cue.destroy(); env.restore(); }
});

test('a disposed cue cannot start after a pending audio activation', async () => {
  const env = audioEnvironment();
  const cue = createAmbientCue();
  try {
    const activation = cue.play(false);
    cue.destroy();
    await activation;
    assert.equal(env.instances[0].tones.length, 0);
    assert.equal(env.instances[0].closed, true);
  } finally { cue.destroy(); env.restore(); }
});
