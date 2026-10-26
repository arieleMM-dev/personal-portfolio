/** A short, quiet sonar cue. Audio is created only inside the button gesture. */
export function createAmbientCue() {
  let context: AudioContext | undefined;
  let releaseVoice: (() => void) | undefined;
  let revision = 0;
  let disposed = false;

  async function play(paused: boolean) {
    const request = ++revision;
    try {
      if (disposed || typeof globalThis.AudioContext !== 'function') return;
      context ??= new AudioContext({ latencyHint: 'interactive' });
      if (context.state !== 'running') await context.resume();
      if (disposed || request !== revision) return;
      releaseVoice?.();

      const now = context.currentTime;
      const envelope = context.createGain();
      const filter = context.createBiquadFilter();
      const delay = context.createDelay(0.2);
      const echo = context.createGain();
      const tones = [context.createOscillator(), context.createOscillator()];
      filter.type = 'lowpass';
      filter.frequency.value = 1500;
      filter.Q.value = 0.4;
      delay.delayTime.value = 0.11;
      echo.gain.value = 0.18;
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.035, now + 0.035);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      envelope.gain.linearRampToValueAtTime(0, now + 0.55);
      envelope.connect(filter);
      filter.connect(context.destination);
      filter.connect(delay);
      delay.connect(echo);
      echo.connect(context.destination);

      tones.forEach((tone, index) => {
        const low = index === 0 ? 330 : 495;
        const high = index === 0 ? 440 : 660;
        tone.type = 'sine';
        tone.frequency.setValueAtTime(paused ? high : low, now);
        tone.frequency.exponentialRampToValueAtTime(paused ? low : high, now + 0.28);
        tone.connect(envelope);
        tone.start(now);
        // Silent tail keeps the echo connected until it has faded naturally.
        tone.stop(now + 0.75);
      });

      const release = () => {
        const time = context!.currentTime;
        envelope.gain.cancelScheduledValues(time);
        envelope.gain.setTargetAtTime(0, time, 0.015);
        tones.forEach(tone => tone.stop(time + 0.08));
      };
      releaseVoice = release;
      tones[0].onended = () => {
        [...tones, envelope, filter, delay, echo].forEach(node => node.disconnect());
        if (releaseVoice === release) releaseVoice = undefined;
      };
    } catch {
      // Sound support or playback policy must never prevent the scene toggle.
    }
  }

  return {
    play,
    destroy() {
      disposed = true;
      revision++;
      releaseVoice?.();
      releaseVoice = undefined;
      if (context && context.state !== 'closed') void context.close().catch(() => {});
    },
  };
}
