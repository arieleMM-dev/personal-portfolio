/** Metres. The exhibition occupies the room, rather than a single rear wall. */
export const GALLERY_ROOM = { halfWidth: 12, height: 9.6, back: -25, front: 32 } as const;
export const WORK_LAYOUT = [
  { x: -5.8, y: 4.2, z: -5, width: 3.4, height: 4.3 },
  { x: .5, y: 4.8, z: -11, width: 4.4, height: 4.1 },
  { x: 6, y: 4.4, z: -17, width: 3.4, height: 4.4 },
] as const;
export const HANGING_STUDIES = [
  { x: -8.8, y: 6.2, z: -10, width: 2.5, height: 3.2, yaw: .12 },
  { x: -7.8, y: 2.9, z: -16, width: 2.3, height: 2.8, yaw: -.08 },
  { x: -3.2, y: 7.1, z: -12, width: 2.8, height: 2.9, yaw: .08 },
  { x: -2.9, y: 3.5, z: -18, width: 2.3, height: 2.2, yaw: -.09 },
  { x: 2.9, y: 7.2, z: -16, width: 2.7, height: 2.4, yaw: -.1 },
  { x: 8.7, y: 6.4, z: -10, width: 2.8, height: 3.1, yaw: -.2 },
  { x: 8.5, y: 3.2, z: -6, width: 2.3, height: 2.8, yaw: -.18 },
  { x: .4, y: 3, z: -22, width: 2.4, height: 2.8, yaw: .06 },
  { x: 5.2, y: 6.3, z: -23, width: 2.1, height: 2.7, yaw: .1 },
] as const;
