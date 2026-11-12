import { WORK_LAYOUT } from './layout.ts';
export const WORK_STOPS = [0.24, 0.54, 0.83] as const;
export const GALLERY_FOV = 52;
export type GalleryPose = { x: number; y: number; z: number; lookX: number; lookY: number; lookZ: number };
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };

/** Long dwell intervals between short, reversible travels; no scroll snapping. */
export function getGalleryPose(progress: number, aspect: number): GalleryPose {
  const p = clamp(progress);
  const intro: GalleryPose = { x: 0, y: 3.25, z: 16 + clamp((.9-aspect)*12,0,8), lookX: 0, lookY: 4.1, lookZ: -12 };
  const work = (index: number): GalleryPose => {
    const frame=WORK_LAYOUT[index];
    const tangent=Math.tan(GALLERY_FOV*Math.PI/360);
    const distance=Math.max(frame.height/(2*tangent*.6),frame.width/(2*tangent*Math.max(.3,aspect)*.72));
    return { x: frame.x, y: frame.y-.35, z: frame.z+distance, lookX: frame.x, lookY: frame.y-.35, lookZ: frame.z };
  };
  const lerp = (a: GalleryPose, b: GalleryPose, t: number, retreat=0): GalleryPose => {
    const amount = smooth(t);
    return { x: a.x + (b.x-a.x)*amount, y: a.y + (b.y-a.y)*amount, z: a.z + (b.z-a.z)*amount + Math.sin(amount*Math.PI)**2*retreat,
      lookX: a.lookX + (b.lookX-a.lookX)*amount, lookY: a.lookY + (b.lookY-a.lookY)*amount, lookZ: a.lookZ + (b.lookZ-a.lookZ)*amount };
  };
  if (p < .06) return intro;
  if (p < 0.18) return lerp(intro, work(0), (p-.06) / .12);
  if (p < 0.33) return work(0);
  if (p < 0.47) return lerp(work(0), work(1), (p-0.33)/0.14,4.5);
  if (p < 0.63) return work(1);
  if (p < 0.77) return lerp(work(1), work(2), (p-0.63)/0.14,4.5);
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
