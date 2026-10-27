export type SoundCue = 'header' | 'tracker' | 'section' | 'tower';
const CUES = {
  header: { duration: 0.24, attack: 0.035, peak: 0.02, from: 660, to: 550, cooldown: 0.18 },
  tracker: { duration: 0.42, attack: 0.065, peak: 0.028, from: 220, to: 293.66, cooldown: 0.3 },
  section: { duration: 1.1, attack: 0.13, peak: 0.2, from: 720, to: 190, cooldown: 1.25 },
  tower: { duration: 1.45, attack: 0.32, peak: 0.035, from: 146.83, to: 220, cooldown: 2 },
} as const;

/** Quiet portfolio-wide bed and four distinct, consent-gated sound gestures. */
export function createHeroSoundtrack() {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let effects: GainNode | undefined;
  let airBuffer: AudioBuffer | undefined;
  let audible = false;
  const voices = new Map<SoundCue, { release(): void; dispose(): void }>();
  const lastCue: Record<SoundCue, number> = { header: -1000, tracker: -1000, section: -1000, tower: -1000 };
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
    effects = track(ctx.createGain());
    effects.gain.value = 0.35;
    effects.connect(master);
    const pad = track(ctx.createGain());
    pad.gain.value = 0.28;
    pad.connect(master);
    const delay = track(ctx.createDelay(1));
    const echo = track(ctx.createGain());
    delay.delayTime.value = 0.43;
    echo.gain.value = 0.12;
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
      gain.gain.value = [0.018, 0.012, 0.008, 0.004][index];
      depth.connect(tone.detune);
      tone.connect(gain);
      gain.connect(pad);
      sources.add(tone);
    });
    sources.add(drift);

    // A locally generated, stereo brown-noise loop; no media download or licence.
    const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 8), ctx.sampleRate);
    airBuffer = buffer;
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
    lowpass.frequency.value = 650;
    lowpass.Q.value = 0.3;
    highpass.type = 'highpass';
    highpass.frequency.value = 110;
    waves.gain.value = 0.025;
    surf.buffer = buffer;
    surf.loop = true;
    surf.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(waves);
    waves.connect(master);
    const tide = track(ctx.createOscillator());
    const swell = track(ctx.createGain());
    tide.frequency.value = 0.085;
    swell.gain.value = 0.008;
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
    audible = active;
    if (!active) voices.forEach(voice => immediate ? voice.dispose() : voice.release());
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
      gain.linearRampToValueAtTime(active ? 0.38 : 0, now + (immediate ? 0.02 : active ? 2.4 : 0.8));
      if (!active) {
        if (immediate) await ctx.suspend();
        else idleTimer = setTimeout(() => {
          if (!disposed && request === revision) void ctx.suspend().catch(() => {});
        }, 1200);
      }
    } catch { /* Audio is optional; navigation and animation remain usable. */ }
  }

  function playCue(kind: SoundCue): boolean {
    if (!audible || disposed || !context || !effects || context.state !== 'running') return false;
    const ctx = context;
    const now = ctx.currentTime;
    const profile = CUES[kind];
    if (voices.has(kind) || now - lastCue[kind] < profile.cooldown) return false;
    // A navigation breath takes priority; never queue a tower/hover to play late.
    if (kind !== 'section' && now - lastCue.section < (kind === 'tower' ? 1.1 : 0.35)) return false;
    if ((kind === 'header' || kind === 'tracker') && now - Math.max(lastCue.header, lastCue.tracker) < 0.14) return false;
    const envelope = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = kind === 'section' ? 'bandpass' : 'lowpass';
    filter.Q.value = 0.45;
    filter.frequency.setValueAtTime(kind === 'section' ? profile.from : 1400, now);
    if (kind === 'section') filter.frequency.exponentialRampToValueAtTime(profile.to, now + 0.85);
    const source = kind === 'section' ? ctx.createBufferSource() : ctx.createOscillator();
    if ('buffer' in source) source.buffer = airBuffer!;
    else {
      source.type = 'sine';
      source.frequency.setValueAtTime(profile.from, now);
      source.frequency.exponentialRampToValueAtTime(profile.to, now + profile.duration * 0.7);
    }
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(effects);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(profile.peak, now + profile.attack);
    envelope.gain.exponentialRampToValueAtTime(0.00001, now + profile.duration - 0.04);
    envelope.gain.linearRampToValueAtTime(0, now + profile.duration);
    const cleanup = () => {
      source.disconnect(); filter.disconnect(); envelope.disconnect();
      if (voices.get(kind) === voice) voices.delete(kind);
    };
    let ended = false;
    const voice = {
      release() {
        if (ended) return;
        envelope.gain.cancelAndHoldAtTime(ctx.currentTime);
        envelope.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06);
        source.stop(ctx.currentTime + 0.07);
      },
      dispose() {
        if (ended) return;
        ended = true;
        source.stop(); cleanup();
      },
    };
    source.onended = () => { if (!ended) { ended = true; cleanup(); } };
    voices.set(kind, voice);
    lastCue[kind] = now;
    if ('buffer' in source) source.start(now, 1 + Math.random() * 4);
    else source.start(now);
    source.stop(now + profile.duration + 0.02);
    return true;
  }

  return {
    unlock,
    setActive,
    playCue,
    destroy() {
      if (disposed) return;
      disposed = true;
      audible = false;
      revision++;
      clearTimeout(idleTimer);
      voices.forEach(voice => voice.dispose());
      sources.forEach(source => source.stop());
      nodes.forEach(node => node.disconnect());
      sources.clear();
      nodes.clear();
      if (context && context.state !== 'closed') void context.close().catch(() => {});
    },
  };
}
