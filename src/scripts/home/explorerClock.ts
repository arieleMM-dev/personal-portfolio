export const EXPLORER_DURATION = 9000;

/** Active time only. Pausing never discards the remaining time of the current card. */
export function createExplorerClock(count = 3, duration = EXPLORER_DURATION) {
  if (!Number.isInteger(count) || count < 1 || !Number.isFinite(duration) || duration <= 0) throw new RangeError('Invalid explorer timing');
  let index = 0, elapsed = 0;
  const state = () => ({ index, progress: elapsed / duration, phase: Math.min(3, Math.floor(elapsed / duration * 4)) });
  return {
    state,
    select(next: number) { index = Math.max(0, Math.min(count - 1, Math.floor(next))); elapsed = 0; return state(); },
    advance(delta: number, playing = true) {
      if (!playing || !Number.isFinite(delta) || delta <= 0) return state();
      const total = elapsed + delta;
      index = (index + Math.floor(total / duration)) % count;
      elapsed = total % duration;
      return state();
    },
  };
}
