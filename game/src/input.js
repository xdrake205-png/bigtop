// input.js — keyboard + mouse/touch input for BIG TOP.
// Left/right are held state; actions are events; pointer x steers the juggler.
export class Input {
  constructor(canvas, handlers) {
    this.handlers = handlers;
    this.leftHeld = false;
    this.rightHeld = false;
    this.keys = new Set();
    this.pointerX = null;   // canvas-space x the pointer wants the juggler at
    this._kd = (e) => this._onKey(e, true);
    this._ku = (e) => this._onKey(e, false);
    this._pd = (e) => this._onPointer(e, true);
    this._pm = (e) => this._onPointerMove(e);
    this._pu = () => this._onPointerUp();
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    canvas.addEventListener('pointerdown', this._pd);
    canvas.addEventListener('pointermove', this._pm);
    window.addEventListener('pointerup', this._pu);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _canvasX(e) {
    const rect = e.target.getBoundingClientRect();
    return (e.clientX - rect.left) * (1280 / rect.width);
  }

  _onKey(e, down) {
    const k = e.key;
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) e.preventDefault();
    if (down && e.repeat) return;
    this.handlers.audioEnsure && this.handlers.audioEnsure();
    if (down) this.keys.add(k); else this.keys.delete(k);
    const left = k === 'a' || k === 'A' || k === 'ArrowLeft';
    const right = k === 'd' || k === 'D' || k === 'ArrowRight';
    if (left) this.leftHeld = down;
    if (right) this.rightHeld = down;
    if (!down) return;
    if (k === ' ' || k === 'Enter') this.handlers.onAction && this.handlers.onAction(k);
    if (k === 'p' || k === 'P' || k === 'Escape') this.handlers.onPause && this.handlers.onPause();
    if (k === 'm' || k === 'M') this.handlers.onMute && this.handlers.onMute();
    if (k === 'r' || k === 'R') this.handlers.onRestart && this.handlers.onRestart();
    if (k === 't' || k === 'T') this.handlers.onTitle && this.handlers.onTitle();
    if (k === '1' || k === '2' || k === '3') this.handlers.onBonus && this.handlers.onBonus(Number(k));
  }

  _onPointer(e, down) {
    this.handlers.audioEnsure && this.handlers.audioEnsure();
    if (!e.target || e.target.tagName !== 'CANVAS') return;
    const x = this._canvasX(e);
    this.pointerX = x;
    if (down) this.handlers.onUIClick && this.handlers.onUIClick(x, (e.clientY - e.target.getBoundingClientRect().top) * (720 / e.target.getBoundingClientRect().height));
  }

  _onPointerMove(e) {
    if (!e.target || e.target.tagName !== 'CANVAS') return;
    this.pointerX = this._canvasX(e);
  }

  _onPointerUp() {
    this.handlers.onPointerUp && this.handlers.onPointerUp();
  }
}
