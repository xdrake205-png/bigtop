// props.js — prop types + toss / fall / catch physics.
// A prop is tossed from the juggler's hands, arcs up, then falls; as it falls
// through the catch line it is caught (or missed) by the juggler's hands.
import { ARENA, PHYS, CATCH } from './config.js';

export const PROP_DEFS = {
  ball:  { r: 13, color: '#d92638', color2: '#fff3d6', label: 'BALL' },
  club:  { r: 15, color: '#2563eb', color2: '#93c5fd', label: 'CLUB' },
  ring:  { r: 17, color: '#16a34a', color2: '#bbf7d0', label: 'RING' },
  torch: { r: 13, color: '#ea580c', color2: '#fde68a', label: 'TORCH' },
};

export function makeProp(type, x, y, rng, speed) {
  return {
    type,
    x, y,
    vx: 0, vy: 0,
    prevY: y,
    r: PROP_DEFS[type].r,
    spin: rng ? rng.range(-4, 4) : 0,
    angle: 0,
    state: 'idle', // idle (waiting to be tossed) | air | gone
    speed,
  };
}

// Toss a prop from the juggler's hands: up with a sideways drift.
// Aim tuning (playtested, 2026-11-18): with 3-7 props in the air and a
// ~1.5s flight, purely random drift scatters landings across the whole
// stage — and even a fixed centre band leaves twins: two props landing
// 0.05s apart at x's 150px apart, of which at most one is catchable. Over
// 255 catches with 3 lives, that is mathematically unwinnable. So every
// toss AIMS at the act's anchor point (a slow random walk around the stage,
// owned by the game): 95% of tosses land within anchor ± 35px, 5% land wide
// (anchor ± 180px) for variety. |vx| stays in the spec'd 60..180 range;
// only the sign/magnitude are chosen to hit the target. The act visibly
// travels around the stage as the anchor drifts; the challenge is the
// landing RATE (7 props in the boss) and speed, not teleporting.
export function tossProp(prop, jugglerX, rng, speed, anchorX = 640) {
  const s = speed || prop.speed || 1;
  prop.x = jugglerX + rng.range(-14, 14);
  prop.y = ARENA.catchY;
  prop.prevY = prop.y;
  prop.vy = -(PHYS.tossVyBase + PHYS.tossVyPerSpeed * s) + rng.range(-PHYS.tossVyJitter, PHYS.tossVyJitter);
  const tFlight = 2 * Math.abs(prop.vy) / PHYS.gravity;
  const targetX = rng.next() < 0.95
    ? anchorX + rng.range(-35, 35)
    : Math.max(120, Math.min(1160, anchorX + rng.range(-180, 180)));
  let vx = (targetX - prop.x) / tFlight;
  const mag = Math.max(PHYS.tossVxMin, Math.min(PHYS.tossVxMax, Math.abs(vx)));
  prop.vx = Math.sign(vx || 1) * mag;
  prop.state = 'air';
}

// Step one prop. Returns 'catch' | 'perfect' | 'drop' | null.
// hooks: { magnet, catchRadius, perfectRadius, jugglerX, gravityMult }
export function stepProp(prop, dt, hooks) {
  if (prop.state !== 'air') return null;
  prop.prevY = prop.y;
  const g = PHYS.gravity * (hooks.gravityMult || 1);
  prop.vy += g * dt;
  if (hooks.magnet && prop.vy > 0) {
    // Magnet gloves only steer props that are already falling toward the
    // hands, and gently: a hard pull would fling props sideways faster than
    // any juggler could predict.
    prop.vx += (hooks.jugglerX - prop.x) * PHYS.magnetPull * dt;
    prop.vx = Math.max(-300, Math.min(300, prop.vx));
  }
  prop.x += prop.vx * dt;
  prop.y += prop.vy * dt;
  prop.angle += prop.spin * dt;
  // Walls: props bounce softly off the tent sides.
  if (prop.x < 30) { prop.x = 30; prop.vx = Math.abs(prop.vx) * 0.6; }
  if (prop.x > 1250) { prop.x = 1250; prop.vx = -Math.abs(prop.vx) * 0.6; }
  // Falling through the catch line: the one moment a catch can happen.
  if (prop.vy > 0 && prop.prevY < ARENA.catchY && prop.y >= ARENA.catchY) {
    const dx = Math.abs(prop.x - hooks.jugglerX);
    if (dx <= hooks.perfectRadius) return 'perfect';
    if (dx <= hooks.catchRadius) return 'catch';
  }
  if (prop.y > ARENA.dropY) return 'drop';
  return null;
}
