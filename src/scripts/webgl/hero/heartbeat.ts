/** One slow clock for the crystal, core light, water and city accents. */
export const HEARTBEAT = { period: 6.4 } as const;

export function getHeartbeat(time: number): number {
  return 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / HEARTBEAT.period);
}

export function nextHeartbeatCrest(time: number): number {
  const firstCrest = HEARTBEAT.period / 4;
  return firstCrest + Math.ceil((time - firstCrest) / HEARTBEAT.period) * HEARTBEAT.period;
}
