// game.js — BIG TOP state machine, loop, scoring, performances, win/lose.
// Owns the rules; props.js owns prop physics, render.js owns drawing.
import { W, H, ARENA, PHYS, CATCH, SCORE, COMBO, APPLAUSE_PER_CATCH, START_LIVES, MAX_LIVES, GRADES, PERFORMANCES } from './config.js';
import { makeProp, tossProp, stepProp } from './props.js';
import { currentPerformance, rollBonusOffers } from './performances.js';
import { Particles, Juice } from './particles.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { render } from './render.js';
import { makeRng } from './rng.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = makeRng(1337);
    this.audio = new AudioSys();
    this.particles = new Particles();
    this.juice = new Juice();
    this.ui = {};
    this.time = 0;
    this.best = Number(localStorage.getItem('bigtop_best') || 0);
    this.frozen = false;
    this.shotMode = false;
    this.juggler = { x: 640, targetX: null };
    this.input = new Input(canvas, {
      audioEnsure: () => this.audio.ensure(),
      onAction: (k) => this.onAction(k),
      onPause: () => this.togglePause(),
      onMute: () => { this.audio.setMuted(!this.audio.muted); this.muted = this.audio.muted; },
      onRestart: () => { if (this.state !== 'title') this.startGame(); },
      onTitle: () => { if (['victory', 'gameover', 'paused'].includes(this.state)) this.reset(); },
      onBonus: (n) => this.pickBonus(n - 1),
      onUIClick: (x, y) => this.onUIClick(x, y),
      onPointerUp: () => {},
    });
    this.muted = false;
    this.reset();
    this.last = performance.now();
    // Test/debug hooks for Playwright.
    this.test = {
      start: () => this.startGame(),
      catch: () => this._forceCatch(),
      drop: () => this._forceDrop(),
      completePerformance: () => { this.perfCatches = currentPerformance(this).target; this._finishPerformance(); },
      win: () => { this.perfIndex = PERFORMANCES.length - 1; this.perfCatches = currentPerformance(this).target; this._finishPerformance(); },
      gameOver: () => { this.lives = 0; this._doGameOver(); },
      setScore: (n) => { this.score = n; },
      snapshot: () => ({
        state: this.state, score: Math.floor(this.score), best: this.best,
        combo: this.combo, maxCombo: this.maxCombo, lives: this.lives,
        perfIndex: this.perfIndex, perf: this.perfIndex + 1,
        perfName: currentPerformance(this).name,
        catches: this.totalCatches, perfCatches: this.perfCatches,
        perfTarget: currentPerformance(this).target,
        drops: this.totalDrops, propsActive: this.props.filter((p) => p.state === 'air').length,
        applause: Math.round(this.applause), grade: this.grade,
        accuracy: this.accuracy(), runTime: Math.round(this.runTime),
        jugglerX: Math.round(this.juggler.x),
        props: this.props.filter((p) => p.state === 'air').map((p) => ({ type: p.type, x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy) })),
        muted: this.muted, offers: (this.offers || []).map((o) => o.id),
        upgrades: [...this.owned],
        slowActive: this.slowUntil > this.time,
      }),
    };
  }

  reset() {
    this.state = 'title';
    this.score = 0; this.streak = 0; this.combo = 1; this.comboTimer = 0;
    this.lives = START_LIVES;
    this.props = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.respawnQueue = [];
    this.perfIndex = 0;
    this.perfCatches = 0;
    this.totalCatches = 0;
    this.totalDrops = 0;
    this.maxCombo = 0;
    this.applause = 0;
    this.runTime = 0;
    this.owned = new Set();
    this.slowUntil = 0;
    this.doubleUntil = 0;
    this.offers = [];
    this.banner = null;
    this.bannerUntil = 0;
    this.grade = 'B';
    this.gradeTitle = '';
    this.juggler.x = 640;
    this.juggler.targetX = null;
    this.anchorX = 640;
    this.anchorTarget = 640;
    this.particles = new Particles();
  }

  startGame() {
    this.audio.ensure();
    this.reset();
    this.state = 'playing';
    this._beginPerformance(0);
  }

  _beginPerformance(i) {
    this.perfIndex = i;
    this.perfCatches = 0;
    this.props = [];
    this.spawnQueue = currentPerformance(this).props.slice();
    this.spawnTimer = 0.1;
    this.respawnQueue = [];
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      const now = performance.now();
      let dt = Math.min(0.033, (now - this.last) / 1000);
      this.last = now;
      const realDt = dt;
      this.juice.update(realDt);
      if (this.juice.isStopped()) dt *= 0.05;
      if (!this.frozen) this.update(dt, realDt);
      this.particles.update(dt);
      render(this.ctx, this);
    };
    requestAnimationFrame(loop);
  }

  update(dt, realDt) {
    this.time += realDt;
    if (this.banner && performance.now() > this.bannerUntil) this.banner = null;
    if (this.state !== 'playing') return;
    this.runTime += realDt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.streak = 0; this.combo = 1; }
    }
    // The act's anchor drifts slowly around the stage; every toss aims at
    // it, so the landing cluster travels instead of scattering.
    if (Math.abs(this.anchorX - this.anchorTarget) < 12) {
      this.anchorTarget = this.rng.range(300, 980);
    }
    this.anchorX += Math.sign(this.anchorTarget - this.anchorX) * 70 * dt;
    // Juggler movement: keys win over pointer.
    const j = this.juggler;
    if (this.input.leftHeld && !this.input.rightHeld) j.x -= ARENA.jugglerSpeed * dt;
    else if (this.input.rightHeld && !this.input.leftHeld) j.x += ARENA.jugglerSpeed * dt;
    else if (this.input.pointerX != null) {
      const dx = this.input.pointerX - j.x;
      const step = ARENA.jugglerSpeed * dt;
      j.x += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;
    }
    j.x = Math.max(ARENA.jugglerMinX, Math.min(ARENA.jugglerMaxX, j.x));
    // Staggered tosses at performance start.
    const perf = currentPerformance(this);
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      const active = this.props.filter((p) => p.state === 'air').length;
      if (this.spawnTimer <= 0 && active < perf.props.length) {
        const type = this.spawnQueue.shift();
        const prop = makeProp(type, j.x, ARENA.catchY, this.rng, perf.speed);
        tossProp(prop, j.x, this.rng, perf.speed, this.anchorX);
        this.props.push(prop);
        this.audio.toss();
        this.spawnTimer = ARENA.spawnInterval;
      }
    }
    // Re-toss dropped props after a short delay.
    for (const r of this.respawnQueue) {
      if (this.time >= r.at) {
        const prop = makeProp(r.type, j.x, ARENA.catchY, this.rng, perf.speed);
        tossProp(prop, j.x, this.rng, perf.speed, this.anchorX);
        this.props.push(prop);
        this.audio.toss();
      }
    }
    this.respawnQueue = this.respawnQueue.filter((r) => this.time < r.at);
    // Step props (2 substeps: no tunnelling through the catch line).
    // Slow Motion scales prop time (world slows, juggler stays fast): arcs
    // keep their height, they just take longer to play out.
    const slowActive = this.slowUntil > this.time;
    const propDt = slowActive ? dt * PHYS.slowGravity : dt;
    const hooks = {
      jugglerX: j.x,
      catchRadius: this.owned.has('wide') ? CATCH.wideRadius : CATCH.radius,
      perfectRadius: this.owned.has('wide') ? CATCH.widePerfect : CATCH.perfect,
      magnet: this.owned.has('magnet'),
      gravityMult: 1,
    };
    for (let s = 0; s < 2; s++) {
      for (const prop of this.props) {
        const ev = stepProp(prop, propDt / 2, hooks);
        if (ev === 'catch' || ev === 'perfect') this._onCatch(prop, ev === 'perfect');
        else if (ev === 'drop') this._onDrop(prop);
        if (this.state !== 'playing') return;
      }
      this.props = this.props.filter((p) => p.state === 'air');
    }
  }

  _onCatch(prop, perfect) {
    const pts = this.addPoints(perfect ? SCORE.perfect : SCORE.catch, prop.x, ARENA.catchY - 30);
    this.totalCatches++;
    this.perfCatches++;
    this.applause += APPLAUSE_PER_CATCH;
    if (perfect) {
      this.audio.perfect();
      this.particles.ring(prop.x, ARENA.catchY, 14, '#ffb020');
      this.particles.text(prop.x, ARENA.catchY - 44, 'PERFECT!', '#ffb020', 18);
    } else {
      this.audio.pop(this.combo);
    }
    this.particles.burst(prop.x, ARENA.catchY - 10, perfect ? 16 : 10, perfect ? '#ffb020' : '#fff3d6', 220);
    if (this.applause >= 100) {
      this.applause = 0;
      this.score += SCORE.encore;
      this.particles.text(this.juggler.x, 480, `ENCORE! +${SCORE.encore}`, '#ffb020', 26);
      this.showBanner('★ ENCORE! ★', 'The crowd roars — +500 points');
      this.audio.applause();
    }
    // Performance complete?
    if (this.perfCatches >= currentPerformance(this).target) {
      prop.state = 'gone';
      this._finishPerformance();
      return;
    }
    // Caught props go straight back up with a fresh arc.
    tossProp(prop, this.juggler.x, this.rng, currentPerformance(this).speed, this.anchorX);
  }

  _onDrop(prop) {
    prop.state = 'gone';
    this.totalDrops++;
    this.lives--;
    this.streak = 0; this.combo = 1; this.comboTimer = 0;
    this.audio.thud();
    this.juice.add(6);
    this.particles.burst(prop.x, ARENA.dropY, 14, '#d92638', 200);
    this.particles.text(prop.x, ARENA.dropY - 20, 'DROP!', '#ff6b6b', 20);
    if (this.lives <= 0) { this._doGameOver(); return; }
    this.respawnQueue.push({ type: prop.type, at: this.time + ARENA.respawnDelay });
  }

  addPoints(base, x, y) {
    if (this.state === 'victory' || this.state === 'gameover') return 0;
    const mult = this.doubleUntil > this.time ? 2 : 1;
    const pts = base * this.combo * mult;
    this.score += pts;
    this.streak++;
    this.comboTimer = COMBO.window;
    this.combo = Math.min(COMBO.max, Math.max(1, this.streak));
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (x !== undefined) this.particles.text(x, y, `+${pts.toLocaleString()}`, '#fff3d6', 16);
    return pts;
  }

  _finishPerformance() {
    const perf = currentPerformance(this);
    this.score += SCORE.performanceBonus;
    this.audio.fanfare();
    this.particles.confetti(this.juggler.x, 300, 70);
    this.showBanner(`${perf.name} COMPLETE!`, `Performance bonus +${SCORE.performanceBonus}`);
    if (this.perfIndex >= PERFORMANCES.length - 1) { this._doVictory(); return; }
    this.offers = rollBonusOffers(this.rng, this.owned);
    this.state = 'bonus';
  }

  pickBonus(i) {
    if (this.state !== 'bonus') return;
    const b = this.offers[i];
    if (!b) return;
    this.audio.click();
    if (b.id === 'slow') this.slowUntil = this.time + 10;
    if (b.id === 'life') this.lives = Math.min(MAX_LIVES, this.lives + 1);
    if (b.id === 'double') this.doubleUntil = this.time + 30;
    if (b.id === 'wide' || b.id === 'magnet') this.owned.add(b.id);
    this._beginPerformance(this.perfIndex + 1);
    this.state = 'playing';
  }

  _doVictory() {
    this.state = 'victory';
    const g = GRADES.find((gg) => this.score >= gg.min) || GRADES[GRADES.length - 1];
    this.grade = g.grade; this.gradeTitle = g.title;
    this.particles.confetti(640, 240, 120);
    this.saveBest();
    this.audio.victory();
  }

  _doGameOver() {
    this.state = 'gameover';
    this.saveBest();
    this.audio.defeat();
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = Math.floor(this.score);
      localStorage.setItem('bigtop_best', String(this.best));
    }
  }

  accuracy() {
    const total = this.totalCatches + this.totalDrops;
    return total > 0 ? Math.round((this.totalCatches / total) * 100) : 100;
  }

  fmtTime(s) { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return `${m}:${String(ss).padStart(2, '0')}`; }
  showBanner(text, sub) { this.banner = { text, sub }; this.bannerUntil = performance.now() + 2200; }

  togglePause() {
    if (this.state === 'playing') { this.prevState = 'playing'; this.state = 'paused'; }
    else if (this.state === 'paused') { this.state = this.prevState || 'playing'; }
  }

  onAction(k) {
    if (this.state === 'title') { this.audio.ensure(); this.startGame(); }
    else if ((this.state === 'victory' || this.state === 'gameover') && k === 'Enter') this.startGame();
    else if (this.state === 'paused' && k === 'Enter') this.togglePause();
  }

  onUIClick(x, y) {
    const hit = (r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    const s = this.state;
    if (s === 'title' && hit(this.ui.startBtn)) { this.audio.ensure(); this.audio.click(); this.startGame(); return; }
    if (s === 'paused') {
      if (hit(this.ui.resumeBtn)) this.togglePause();
      else if (hit(this.ui.pauseRestartBtn)) this.startGame();
      else if (hit(this.ui.pauseTitleBtn)) this.reset();
      return;
    }
    if (s === 'bonus') {
      const i = (this.ui.bonusRects || []).findIndex((r) => hit(r));
      if (i >= 0) this.pickBonus(i);
      return;
    }
    if (s === 'victory') {
      if (hit(this.ui.againBtn)) this.startGame();
      else if (hit(this.ui.victoryTitleBtn)) this.reset();
      return;
    }
    if (s === 'gameover') {
      if (hit(this.ui.retryBtn)) this.startGame();
      else if (hit(this.ui.overTitleBtn)) this.reset();
      return;
    }
  }

  // --- test-only forced events (drive a real prop through the real physics) ---
  _forceCatch() {
    if (this.state !== 'playing') return;
    let prop = this.props.find((p) => p.state === 'air');
    if (!prop) {
      prop = makeProp('ball', this.juggler.x, ARENA.catchY, this.rng, 1);
      this.props.push(prop);
    }
    prop.x = this.juggler.x; prop.y = ARENA.catchY - 2; prop.prevY = prop.y;
    prop.vx = 0; prop.vy = 150; prop.state = 'air';
  }

  _forceDrop() {
    if (this.state !== 'playing') return;
    let prop = this.props.find((p) => p.state === 'air');
    if (!prop) {
      prop = makeProp('ball', this.juggler.x, ARENA.catchY, this.rng, 1);
      this.props.push(prop);
    }
    let x = this.juggler.x + 500;
    if (x > 1210) x = this.juggler.x - 500;
    prop.x = Math.max(70, Math.min(1210, x));
    prop.y = ARENA.catchY - 2; prop.prevY = prop.y;
    prop.vx = 0; prop.vy = 150; prop.state = 'air';
  }
}
