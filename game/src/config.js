// config.js — BIG TOP tuning constants, arena geometry, performances, upgrades.
// All tuning lives here so a retune is a one-line change.
export const W = 1280;
export const H = 720;

// Arena: the juggler stands on the wooden stage, floor y=660, hands at y=600.
export const ARENA = {
  floorY: 660,
  catchY: 600,          // catch line: props are caught as they fall through it
  jugglerMinX: 70,
  jugglerMaxX: 1210,
  jugglerSpeed: 720,    // px/s
  dropY: 690,           // a prop below this is a DROP
  respawnDelay: 0.6,    // s before a dropped prop is re-tossed
  spawnInterval: 0.45,  // s between staggered tosses at performance start
};

export const PHYS = {
  gravity: 1400,        // px/s^2
  tossVyBase: 900,      // vy = -(900 + 150*speed) +/- 120
  tossVyPerSpeed: 150,
  tossVyJitter: 120,
  tossVxMin: 60,        // |vx| = 60..180 random
  tossVxMax: 180,
  magnetPull: 1.0,      // magnet gloves: gentle pull toward juggler while falling (1/s)
  slowGravity: 0.55,    // slow motion: prop time scale (world slows, juggler stays fast)
};

export const CATCH = {
  radius: 46,           // |prop.x - juggler.x| <= radius = catch
  perfect: 14,          // <= perfect = PERFECT catch
  wideRadius: 70,       // with Wide Hands
  widePerfect: 18,
};

export const SCORE = {
  catch: 50,
  perfect: 100,
  performanceBonus: 1000,
  encore: 500,          // applause meter full
};

export const COMBO = { window: 3.5, max: 8 }; // streak of catches within the window
export const APPLAUSE_PER_CATCH = 8;          // 100 / 8 = ~13 catches fills the meter
export const START_LIVES = 3;
export const MAX_LIVES = 5;

// 8 performances: target = catches needed to pass.
export const PERFORMANCES = [
  { name: 'THREE BALLS',    sub: 'Three balls, one juggler',      props: ['ball', 'ball', 'ball'],                 speed: 1.0,  target: 20 },
  { name: 'FOUR BALLS',     sub: 'A fourth ball joins the act',   props: ['ball', 'ball', 'ball', 'ball'],         speed: 1.1,  target: 25 },
  { name: 'CLUB NIGHT',     sub: 'Clubs spin in — mind the ends', props: ['club', 'club', 'club', 'ball'],         speed: 1.15, target: 25 },
  { name: 'RING MASTER',    sub: 'Rings sail through the air',    props: ['ring', 'ring', 'ring', 'ring'],         speed: 1.25, target: 30 },
  { name: 'FIVE BALL FRENZY', sub: 'Five balls, no mercy',        props: ['ball', 'ball', 'ball', 'ball', 'ball'], speed: 1.35, target: 35 },
  { name: 'TORCHLIGHT',     sub: 'Fire in the air — catch the stick', props: ['torch', 'torch', 'torch', 'ball', 'ball'], speed: 1.45, target: 30 },
  { name: 'MIXED BAG',      sub: 'Everything at once',            props: ['ball', 'club', 'ring', 'torch', 'ball', 'club'], speed: 1.55, target: 40 },
  { name: 'THE CRITIC',     sub: 'BOSS — impress the man in the front row', props: ['ball', 'club', 'ring', 'torch', 'ball', 'club', 'ring'], speed: 1.7, target: 50 },
];

// Pick-1-of-3 upgrade pool (3 random distinct after P1..P7).
export const UPGRADES = [
  { id: 'slow',   name: 'SLOW MOTION',   icon: '◷', desc: 'The world slows to 55% for 10 seconds. You stay fast.' },
  { id: 'life',   name: 'EXTRA LIFE',    icon: '★', desc: '+1 life (max 5). The show must go on.' },
  { id: 'double', name: 'DOUBLE SCORE',  icon: '×2', desc: 'All points x2 for 30 seconds. Milk the applause.' },
  { id: 'wide',   name: 'WIDE HANDS',    icon: '✋', desc: 'Catch radius 46 → 70, perfect 14 → 18. Permanent.' },
  { id: 'magnet', name: 'MAGNET GLOVES', icon: '🧲', desc: 'Props drift toward your hands. Permanent.' },
];

export const GRADES = [
  { min: 200000, grade: 'S', title: 'CIRCUS LEGEND' },
  { min: 120000, grade: 'A', title: 'RINGMASTER' },
  { min: 0,      grade: 'B', title: 'BIG TOP FAN' },
];

export const PALETTE = {
  skyTop: '#ffe9b8', skyMid: '#ffd98a', skyBot: '#f7b733',
  tentRed: '#d92638', tentCream: '#fff3d6', tentDark: '#8f1d2c',
  wood: '#8a5a2b', woodDark: '#6b4420', woodLight: '#a9743c',
  curtain: '#b3122e', curtainDark: '#7d0d20',
  gold: '#ffb020', cream: '#fff3d6', ink: '#3a1c0d',
  red: '#d92638', blue: '#2563eb', green: '#16a34a', purple: '#7c3aed',
  white: '#ffffff', dim: '#8a6a4a',
};
