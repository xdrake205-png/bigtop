// particles.js — star bursts, rings, confetti, floating score text, screen juice.
export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
  }

  burst(x, y, n, color, speed = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.list.push({
        kind: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        life: 0.55 + Math.random() * 0.3, max: 0.85, size: 3 + Math.random() * 4,
        color, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 8,
      });
    }
  }

  ring(x, y, r, color) {
    this.list.push({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: r, color, rot: 0, vr: 0 });
  }

  confetti(x, y, n = 60) {
    const colors = ['#d92638', '#ffb020', '#16a34a', '#2563eb', '#7c3aed', '#fff3d6'];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const s = 260 + Math.random() * 320;
      this.list.push({
        kind: 'confetti', x: x + (Math.random() - 0.5) * 120, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 1.4 + Math.random() * 0.8, max: 2.2, size: 5 + Math.random() * 5,
        color: colors[i % colors.length], rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 12,
      });
    }
  }

  text(x, y, str, color, size = 16) {
    this.texts.push({ x, y, str, color, size, life: 1.0, max: 1.0 });
  }

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.kind === 'confetti' || p.kind === 'star') p.vy += 500 * dt;
      if (p.kind === 'ring') p.size += 260 * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= 42 * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }
}

export class Juice {
  constructor() {
    this.shake = 0;
    this.hitStop = 0;
  }
  add(amount) { this.shake = Math.min(10, this.shake + amount); }
  stop(ms) { this.hitStop = Math.max(this.hitStop, ms / 1000); }
  update(dt) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.hitStop > 0) this.hitStop = Math.max(0, this.hitStop - dt);
  }
  isStopped() { return this.hitStop > 0; }
  offset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * this.shake, y: (Math.random() - 0.5) * this.shake };
  }
}
