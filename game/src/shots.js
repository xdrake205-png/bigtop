// shots.js — deterministic screenshot scenes (?shot=title|game|bonus|victory&seed=1).
// Fixed seed + frozen simulation so every capture is repeatable.
import { ARENA } from './config.js';
import { makeProp, tossProp } from './props.js';
import { makeRng } from './rng.js';

export function applyShot(game, shot, seed = 1) {
  game.rng = makeRng(seed);
  game.frozen = true; // freeze the simulation; the scene is posed, not played.
  if (shot === 'title') {
    game.state = 'title';
    // Deterministic cover value, not whatever a previous run left in
    // localStorage (best is only a display value in shot scenes).
    game.best = 48210;
    return;
  }
  if (shot === 'victory') {
    game.startGame();
    game.score = 348600;
    game.best = 348600;
    game.totalCatches = 255;
    game.totalDrops = 2;
    game.maxCombo = 8;
    game.lives = 3;
    game.runTime = 97;
    game.perfIndex = 7;
    game.perfCatches = 50;
    game._doVictory();
    return;
  }
  if (shot === 'bonus') {
    game.startGame();
    game.score = 36000;
    game.best = 48210;
    game.perfIndex = 2; // P3 just finished
    game.perfCatches = 25;
    game.totalCatches = 45;
    game._finishPerformance(); // -> state 'bonus', 3 offers rolled
    return;
  }
  // Cover (game): lively mid-play, P5 Five Ball Frenzy, combo x5, five props
  // in the air plus star bursts and floating score text.
  game.startGame();
  game.score = 82000;
  game.best = 48210;
  game.perfIndex = 4; // P5
  game.perfCatches = 18;
  game.totalCatches = 118;
  game.streak = 5; game.combo = 5; game.maxCombo = 5; game.comboTimer = 3.0;
  game.applause = 64;
  game.juggler.x = 640;
  const rng = makeRng(seed);
  const poses = [
    { type: 'ball', x: 480, y: 220, vx: 120, vy: -260 },
    { type: 'ball', x: 700, y: 300, vx: -140, vy: 180 },
    { type: 'ball', x: 600, y: 130, vx: 60, vy: -420 },
    { type: 'ball', x: 820, y: 420, vx: -90, vy: 320 },
    { type: 'ball', x: 420, y: 480, vx: 160, vy: 240 },
  ];
  game.props = poses.map((p) => {
    const prop = makeProp(p.type, p.x, p.y, rng, 1.35);
    prop.vx = p.vx; prop.vy = p.vy; prop.prevY = p.y; prop.state = 'air';
    return prop;
  });
  game.state = 'playing';
  game.particles.burst(480, 220, 16, '#ffb020', 220);
  game.particles.burst(700, 300, 12, '#fff3d6', 200);
  game.particles.text(480, 190, '+250', '#fff3d6', 18);
  game.particles.text(700, 270, '+100', '#fff3d6', 16);
}
