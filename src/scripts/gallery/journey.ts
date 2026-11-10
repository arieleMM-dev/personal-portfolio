export const WORK_X = [-5.4, 0, 5.4] as const;
export const WORK_STOPS = [0.24, 0.54, 0.83] as const;
export const GALLERY_FOV = 46;
export type GalleryPose = { x: number; y: number; z: number; lookX: number; lookY: number; lookZ: number };
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

/** Long dwell intervals between short, reversible travels; no scroll snapping. */
export function getGalleryPose(progress: number, aspect: number): GalleryPose {
  const p = clamp(progress);
  const distance = Math.max(6.2, 3.7 / (2 * Math.tan(GALLERY_FOV * Math.PI / 360) * Math.max(0.3, aspect)));
  const intro: GalleryPose = { x: 0, y: 1.8, z: 7.8, lookX: 0, lookY: 2.9, lookZ: -8.7 };
  const work = (index: number): GalleryPose => ({ x: WORK_X[index], y: 2.8, z: -8.6 + distance, lookX: WORK_X[index], lookY: 3.05, lookZ: -8.7 });
  const lerp = (a: GalleryPose, b: GalleryPose, t: number): GalleryPose => {
    const amount = smooth(t);
    return { x: a.x + (b.x-a.x)*amount, y: a.y + (b.y-a.y)*amount, z: a.z + (b.z-a.z)*amount,
      lookX: a.lookX + (b.lookX-a.lookX)*amount, lookY: a.lookY + (b.lookY-a.lookY)*amount, lookZ: a.lookZ + (b.lookZ-a.lookZ)*amount };
  };
  if (p < 0.18) return lerp(intro, work(0), p / 0.18);
  if (p < 0.33) return work(0);
  if (p < 0.47) return lerp(work(0), work(1), (p-0.33)/0.14);
  if (p < 0.63) return work(1);
  if (p < 0.77) return lerp(work(1), work(2), (p-0.63)/0.14);
  if (p < 0.91) return work(2);
  return lerp(work(2), intro, (p-0.91)/0.09);
}

export function getActiveGalleryWork(progress: number): number {
  if (progress < 0.1 || progress > 0.94) return -1;
  return progress < 0.4 ? 0 : progress < 0.7 ? 1 : 2;
}

export function getGalleryHashIndex(hash: string): number {
  return ['#obra-umbral', '#obra-materia', '#obra-cadencia'].indexOf(hash);
}
