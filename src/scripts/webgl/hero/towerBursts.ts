import { nextHeartbeatCrest } from './heartbeat.ts';

export const TOWER_BURST = {
  attack: 0.32, release: 0.6, duration: 2.4,
  minInterval: 4.5, intervalRange: 4, maxActive: 2,
} as const;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function getTowerBurstEnvelope(age: number): number {
  return smoothstep(0, TOWER_BURST.attack, age)
    * (1 - smoothstep(TOWER_BURST.release, TOWER_BURST.duration, age));
}

/** The same envelope drives a tower and its ascending beam on the GPU. */
export const TOWER_BURST_GLSL = `
  float towerBurst(float age) {
    return smoothstep(0.0, ${TOWER_BURST.attack.toFixed(2)}, age)
      * (1.0 - smoothstep(${TOWER_BURST.release.toFixed(2)}, ${TOWER_BURST.duration.toFixed(2)}, age));
  }
`;

/** Scheduling is elapsed-time based, never a per-frame random probability. */
export function createTowerBurstScheduler(count: number, random: () => number = Math.random) {
  const starts = new Float32Array(count).fill(-1000);
  let eligible = Array.from({ length: count }, (_, index) => index);
  let nextTime = nextHeartbeatCrest(1 + random() * 2);
  let lastTower = -1;
  let wasEnabled = true;
  const state = { changed: false, activeCount: 0 };

  return {
    starts,
    setEligible(indices: readonly number[]) { eligible = [...indices]; },
    update(time: number, heartbeat: number, enabled = true) {
      state.changed = false;
      state.activeCount = 0;
      if (!enabled) {
        if (wasEnabled) { starts.fill(-1000); state.changed = true; }
        wasEnabled = false;
        return state;
      }
      if (!wasEnabled) {
        nextTime = nextHeartbeatCrest(time + 2 + random() * 2);
        wasEnabled = true;
      }
      for (let index = 0; index < count; index++) {
        if (time >= starts[index] && time - starts[index] < TOWER_BURST.duration) state.activeCount++;
      }
      // Never replay expired events after a discontinuous clock jump.
      if (time - nextTime >= TOWER_BURST.duration) {
        nextTime = nextHeartbeatCrest(time + TOWER_BURST.minInterval + random() * TOWER_BURST.intervalRange);
      }
      // Launch in the bright part of the shared heartbeat, not as a strobe.
      if (time >= nextTime && heartbeat >= 0.68 && state.activeCount < TOWER_BURST.maxActive) {
        const candidates = eligible.filter((index) => index !== lastTower && time - starts[index] > 12);
        if (candidates.length > 0) {
          const index = candidates[Math.floor(random() * candidates.length)];
          starts[index] = nextTime;
          lastTower = index;
          state.changed = true;
          state.activeCount++;
        }
        // Anchor to the planned crest, not this frame, so rounding cannot drift.
        nextTime = nextHeartbeatCrest(nextTime + TOWER_BURST.minInterval + random() * TOWER_BURST.intervalRange);
      }
      return state;
    },
  };
}

