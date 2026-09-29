import * as THREE from 'three';

export type HeroVideoName = 'video1' | 'video2';

/** Original clips stay untouched; the aquatic default uses the web-sized copy. */
export const HERO_VIDEO_SOURCES: Readonly<Record<HeroVideoName, string>> = {
  video1: 'assets/hero/video1-optimized.mp4',
  video2: 'video2.mp4',
};

/** Only these two local files can be selected; arbitrary URLs are never loaded. */
export function selectHeroVideo(search: string): HeroVideoName {
  return new URLSearchParams(search).get('heroVideo') === 'video2' ? 'video2' : 'video1';
}

export function createHeroVideo(baseUrl: string, name: HeroVideoName, onFrameAvailable: () => void) {
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  // Playback is started explicitly after checking visibility/reduced motion.
  video.autoplay = false;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.hidden = true;
  video.setAttribute('aria-hidden', 'true');
  video.dataset.heroVideo = name;
  video.dataset.playback = 'loading';
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  let disposed = false;
  let active = false;
  let pending = false;
  let failed = false;

  async function play(): Promise<void> {
    if (disposed || !active || pending || failed || !video.paused) return;
    pending = true;
    let interrupted = false;
    try {
      await video.play();
      if (disposed || !active) video.pause();
      else video.dataset.playback = 'playing';
    } catch (error) {
      interrupted = error instanceof DOMException && error.name === 'AbortError';
      if (!disposed && active) {
        // Autoplay is not guaranteed even when muted (browser/power policies).
        video.dataset.playback = error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'paused';
      }
    } finally {
      pending = false;
      // A fast leave/re-enter can cancel a still-pending play() with pause().
      // Retry only that interruption, never loop on a policy/codec rejection.
      if (interrupted && active && !disposed && !failed) void play();
    }
  }
  function ready(): void {
    if (disposed) return;
    texture.needsUpdate = true;
    onFrameAvailable();
    void play();
  }
  function onError(): void {
    if (disposed) return;
    failed = true;
    video.dataset.playback = 'error';
    onFrameAvailable();
    console.warn(`Hero: ${HERO_VIDEO_SOURCES[name]} could not be decoded; using the blue fallback.`);
  }
  function retry(): void { void play(); }
  video.addEventListener('loadeddata', ready);
  video.addEventListener('seeked', ready);
  video.addEventListener('canplay', retry);
  video.addEventListener('error', onError);
  window.addEventListener('pointerdown', retry, { passive: true });
  window.addEventListener('keydown', retry);
  document.body.append(video);
  video.src = `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}${HERO_VIDEO_SOURCES[name]}`;
  video.load();

  return {
    texture, video,
    get ready() { return !failed && video.readyState >= 2; },
    get aspect() { return video.videoWidth / (video.videoHeight || 1); },
    setActive(value: boolean): void {
      active = value;
      if (active) void play();
      else {
        video.pause();
        if (!disposed && !failed) video.dataset.playback = 'paused';
      }
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      active = false;
      video.pause();
      video.removeEventListener('loadeddata', ready);
      video.removeEventListener('seeked', ready);
      video.removeEventListener('canplay', retry);
      video.removeEventListener('error', onError);
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
      texture.dispose();
      video.removeAttribute('src');
      video.load(); // Abort fetch and release decoder buffers.
      video.remove();
    },
  };
}
