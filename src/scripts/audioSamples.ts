export const AUDIO_FILES = {
  tracker: 'assets/audio/lesiakower-minimalist-button-hover-sound-effect-399749.mp3',
  intro: 'assets/audio/miraclei-sample_hover_subtle04_kofi_by_miraclei-364171.mp3',
} as const;

export interface AudioSample {
  buffer: AudioBuffer;
  offset: number;
  duration: number;
  gain: number;
}

/** Trim empty padding for instant hover feedback without altering the MP3. */
export function prepareAudioSample(buffer: AudioBuffer): AudioSample {
  let peak = 0;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  for (const channel of channels) for (const value of channel) peak = Math.max(peak, Math.abs(value));
  let first = buffer.length;
  let last = 0;
  const threshold = Math.max(0.0001, peak * 0.008);
  for (const channel of channels) {
    for (let index = 0; index < channel.length; index++) {
      if (Math.abs(channel[index]) >= threshold) { first = Math.min(first, index); last = Math.max(last, index); }
    }
  }
  const offset = first < buffer.length ? Math.max(0, first / buffer.sampleRate - 0.008) : 0;
  const end = peak > threshold ? Math.min(buffer.duration, last / buffer.sampleRate + 0.06) : buffer.duration;
  return { buffer, offset, duration: Math.max(0.02, end - offset), gain: 1 / Math.max(0.5, peak) };
}

export async function loadAudioSample(context: AudioContext, url: string, signal: AbortSignal): Promise<AudioSample> {
  const response = await fetch(url, { signal, cache: 'force-cache' });
  if (!response.ok) throw new Error(`Audio unavailable: ${response.status}`);
  return prepareAudioSample(await context.decodeAudioData(await response.arrayBuffer()));
}
