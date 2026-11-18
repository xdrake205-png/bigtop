// performances.js — the 8-performance campaign + pick-1-of-3 upgrades.
import { PERFORMANCES, UPGRADES } from './config.js';

export function currentPerformance(state) {
  return PERFORMANCES[state.perfIndex] || PERFORMANCES[PERFORMANCES.length - 1];
}

export function createPerformanceState() {
  return {
    perfIndex: 0,
    perfCatches: 0,
    totalCatches: 0,
    totalDrops: 0,
    maxCombo: 0,
  };
}

// Roll 3 distinct upgrades from the pool. One-time upgrades already owned
// (wide hands, magnet gloves) are excluded; slow/double/life always stay.
export function rollBonusOffers(rng, owned) {
  const pool = UPGRADES.filter((u) => !(owned.has(u.id) && (u.id === 'wide' || u.id === 'magnet')));
  return rng.shuffle(pool).slice(0, 3);
}
