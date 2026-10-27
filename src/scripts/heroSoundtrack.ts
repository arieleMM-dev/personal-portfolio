/** Original generative soundscape: filtered surf, open fifths and slow drift. */
export function createHeroSoundtrack() {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  const nodes = new Set<AudioNode>();
  const sources = new Set<AudioScheduledSourceNode>();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let revision = 0;
  let disposed = false;
  const track = <T extends AudioNode>(node: T): T => { nodes.add(node); return node; };

  function build(ctx: AudioContext) {
    master = track(ctx.createGain());
    master.gain.value = 0;
    master.connect(ctx.destination);
    const pad = track(ctx.createGain());
    pad.gain.value = 0.55;
    pad.connect(master);
    const delay = track(ctx.createDelay(1));
    const echo = track(ctx.createGain());
    delay.delayTime.value = 0.43;
    echo.gain.value = 0.22;
    pad.connect(delay);
    delay.connect(echo);
    echo.connect(master);

    const drift = track(ctx.createOscillator());
    const depth = track(ctx.createGain());
    drift.frequency.value = 0.047;
    depth.gain.value = 2.5;
    drift.connect(depth);
    [110, 164.8138, 220.12, 293.6648].forEach((frequency, index) => {
      const tone = track(ctx.createOscillator());
      const gain = track(ctx.createGain());
      tone.type = 'sine';
      tone.frequency.value = frequency;
      gain.gain.value = [0.028, 0.018, 0.012, 0.006][index];
      depth.connect(tone.detune);
      tone.connect(gain);
      gain.connect(pad);
      sources.add(tone);
    });
    sources.add(drift);

    // A locally generated, stereo brown-noise loop; no media download or licence.
    const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 8), ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      const seam = Math.floor(ctx.sampleRate * 0.08);
      let brown = 0;
      for (let i = 0; i < samples.length; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.02) / 1.02;
        const edge = Math.min(1, i / seam, (samples.length - 1 - i) / seam);
        samples[i] = brown * 3.5 * (0.5 - 0.5 * Math.cos(Math.PI * edge));
      }
    }
    const surf = track(ctx.createBufferSource());
    const lowpass = track(ctx.createBiquadFilter());
    const highpass = track(ctx.createBiquadFilter());
    const waves = track(ctx.createGain());
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 850;
    lowpass.Q.value = 0.3;
    highpass.type = 'highpass';
    highpass.frequency.value = 90;
    waves.gain.value = 0.16;
    surf.buffer = buffer;
    surf.loop = true;
    surf.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(waves);
    waves.connect(master);
    const tide = track(ctx.createOscillator());
    const swell = track(ctx.createGain());
    tide.frequency.value = 0.085;
    swell.gain.value = 0.065;
    tide.connect(swell);
    swell.connect(waves.gain);
    sources.add(surf);
    sources.add(tide);
    sources.forEach(source => source.start());
  }

  async function unlock(): Promise<boolean> {
    try {
      if (disposed || typeof globalThis.AudioContext !== 'function') return false;
      if (!context) {
        context = new AudioContext({ latencyHint: 'playback' });
        build(context);
      }
      await context.resume();
      return !disposed && context.state === 'running';
    } catch { return false; }
  }

  async function setActive(active: boolean, immediate = false) {
    const request = ++revision;
    clearTimeout(idleTimer);
    if (!context || !master || disposed) return;
    const ctx = context;
    const gain = master.gain;
    try {
      if (active && ctx.state !== 'running') await ctx.resume();
      if (disposed || request !== revision) return;
      const now = ctx.currentTime;
      gain.cancelAndHoldAtTime(now);
      gain.linearRampToValueAtTime(active ? 0.65 : 0, now + (immediate ? 0.02 : active ? 1.8 : 1.1));
      if (!active) {
        if (immediate) await ctx.suspend();
        else idleTimer = setTimeout(() => {
          if (!disposed && request === revision) void ctx.suspend().catch(() => {});
        }, 1200);
      }
    } catch { /* Audio is optional; navigation and animation remain usable. */ }
  }

  return {
    unlock,
    setActive,
    destroy() {
      if (disposed) return;
      disposed = true;
      revision++;
      clearTimeout(idleTimer);
      sources.forEach(source => source.stop());
      nodes.forEach(node => node.disconnect());
      sources.clear();
      nodes.clear();
      if (context && context.state !== 'closed') void context.close().catch(() => {});
    },
  };
}
