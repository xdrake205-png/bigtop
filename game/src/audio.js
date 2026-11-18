// audio.js — original synth sound effects (WebAudio, no audio files).
// Every sound is generated in code, so the game stays fully offline.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  // Must be called from a user gesture at least once.
  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.4;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.4; }

  tone({ f = 440, f2 = null, d = 0.1, type = 'sine', v = 0.5, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + d);
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + d + 0.02);
  }

  noise({ d = 0.15, f = 1200, v = 0.3, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * d));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const flt = this.ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = f;
    const g = this.ctx.createGain(); g.gain.value = v;
    src.connect(flt); flt.connect(g); g.connect(this.master);
    src.start(t0);
  }

  // A catch: bright little pop, pitch rises with the combo.
  pop(combo = 1) {
    const f = 520 + Math.min(combo, 8) * 45;
    this.tone({ f, f2: f * 1.6, d: 0.09, type: 'sine', v: 0.45 });
    this.noise({ d: 0.05, f: 3000, v: 0.12 });
  }
  perfect() {
    this.tone({ f: 880, d: 0.1, type: 'sine', v: 0.4 });
    this.tone({ f: 1319, d: 0.16, type: 'sine', v: 0.35, when: 0.06 });
  }
  thud() {
    this.tone({ f: 220, f2: 70, d: 0.3, type: 'sawtooth', v: 0.3 });
    this.noise({ d: 0.12, f: 500, v: 0.25 });
  }
  toss() { this.tone({ f: 300, f2: 520, d: 0.07, type: 'sine', v: 0.12 }); }
  fanfare() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ f, d: 0.18, type: 'triangle', v: 0.3, when: i * 0.08 }));
  }
  applause() {
    // Crowd claps: a few bursts of filtered noise.
    for (let i = 0; i < 5; i++) this.noise({ d: 0.12, f: 1800, v: 0.22, when: i * 0.09 });
  }
  click() { this.tone({ f: 880, d: 0.04, type: 'square', v: 0.15 }); }
  victory() {
    [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => this.tone({ f, d: 0.22, type: 'triangle', v: 0.3, when: i * 0.11 }));
    this.applause();
  }
  defeat() { [392, 330, 262, 196].forEach((f, i) => this.tone({ f, d: 0.25, type: 'sine', v: 0.3, when: i * 0.14 })); }
}
