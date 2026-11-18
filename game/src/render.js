// render.js — draws BIG TOP: bright circus tent, wooden stage, ringmaster juggler,
// distinct props, HUD, and all state overlays (title manual, bonus cards, victory).
import { W, H, ARENA, PERFORMANCES, PALETTE } from './config.js';
import { currentPerformance } from './performances.js';
import { PROP_DEFS } from './props.js';

const INK = PALETTE.ink;
const CREAM = PALETTE.cream;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = w;
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lineH; }
  return y; // y just past the last line, so the next heading never overlaps
}

export function render(ctx, g) {
  const off = g.juice.offset();
  ctx.save();
  ctx.translate(off.x, off.y);
  drawBackground(ctx, g);
  drawProps(ctx, g);
  // Bonus interstitial: hide the juggler so the footer line under the cards
  // never prints over his sprite (cards end y=500, his hat starts y=502).
  if (g.state !== 'bonus') drawJuggler(ctx, g);
  drawParticles(ctx, g);
  // Title / victory panels cover the middle of the screen but not the HUD
  // bar and pills at the edges, so the HUD would peek out half-clipped
  // behind them — skip it entirely in those states.
  if (g.state !== 'title' && g.state !== 'victory') drawHUD(ctx, g);
  if (g.banner && g.state !== 'bonus') drawBanner(ctx, g);
  ctx.restore();
  // Overlays are drawn unshaken so text stays readable.
  if (g.state === 'title') drawTitle(ctx, g);
  else if (g.state === 'paused') drawPaused(ctx, g);
  else if (g.state === 'bonus') drawBonus(ctx, g);
  else if (g.state === 'victory') drawVictory(ctx, g);
  else if (g.state === 'gameover') drawGameOver(ctx, g);
}

// ---------- background ----------
function drawBackground(ctx, g) {
  // Bright daytime sky.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Tent canopy: red/cream striped roof across the top.
  const stripeW = 80;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 96); ctx.lineTo(0, 96);
  ctx.closePath(); ctx.clip();
  for (let i = 0; i < W / stripeW + 1; i++) {
    ctx.fillStyle = i % 2 ? PALETTE.tentCream : PALETTE.tentRed;
    ctx.beginPath();
    const x0 = i * stripeW;
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + stripeW, 0);
    ctx.lineTo(x0 + stripeW + 40, 96);
    ctx.lineTo(x0 + 40, 96);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // Scalloped canopy edge.
  ctx.fillStyle = PALETTE.tentRed;
  for (let x = 0; x < W; x += 64) {
    ctx.beginPath(); ctx.arc(x + 32, 96, 32, 0, Math.PI); ctx.fill();
  }
  ctx.fillStyle = PALETTE.tentDark;
  ctx.fillRect(0, 94, W, 4);

  // Side curtains.
  for (const side of [0, 1]) {
    const x0 = side ? W - 46 : 0;
    const grad = ctx.createLinearGradient(x0, 0, x0 + (side ? -46 : 46), 0);
    grad.addColorStop(0, PALETTE.curtain);
    grad.addColorStop(1, PALETTE.curtainDark);
    ctx.fillStyle = grad;
    ctx.fillRect(x0, 98, 46, ARENA.floorY - 98);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 120; y < ARENA.floorY; y += 46) ctx.fillRect(x0 + (side ? 8 : 30), y, 8, 26);
  }

  // String lights: two sagging rows of coloured bulbs.
  drawStringLights(ctx, 60, 150, 240, g.time);
  drawStringLights(ctx, 90, 210, 300, g.time + 2);

  // Spotlight cone following the juggler.
  const jx = g.juggler.x;
  const spot = ctx.createLinearGradient(jx, 0, jx, ARENA.floorY);
  spot.addColorStop(0, 'rgba(255, 250, 200, 0.34)');
  spot.addColorStop(1, 'rgba(255, 250, 200, 0.05)');
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.moveTo(jx - 60, 0); ctx.lineTo(jx + 60, 0);
  ctx.lineTo(jx + 190, ARENA.floorY); ctx.lineTo(jx - 190, ARENA.floorY);
  ctx.closePath(); ctx.fill();
  // Light pool on the stage.
  ctx.fillStyle = 'rgba(255, 246, 200, 0.28)';
  ctx.beginPath(); ctx.ellipse(jx, ARENA.floorY + 6, 150, 16, 0, 0, Math.PI * 2); ctx.fill();

  // Wooden stage floor.
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(0, ARENA.floorY, W, H - ARENA.floorY);
  ctx.fillStyle = PALETTE.woodDark;
  for (let x = 0; x < W; x += 128) ctx.fillRect(x, ARENA.floorY, 3, H - ARENA.floorY);
  ctx.fillStyle = PALETTE.woodLight;
  for (let x = 64; x < W; x += 128) ctx.fillRect(x, ARENA.floorY, 2, H - ARENA.floorY);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(0, ARENA.floorY, W, 5);
  // Catch-line hint: faint dashed gold line where hands meet the props.
  ctx.strokeStyle = 'rgba(255, 176, 32, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath(); ctx.moveTo(46, ARENA.catchY); ctx.lineTo(W - 46, ARENA.catchY); ctx.stroke();
  ctx.setLineDash([]);
}

function drawStringLights(ctx, y0, sag, yBase, t) {
  const colors = ['#ff5d73', '#ffb020', '#3dff8e', '#4db2ff', '#c084fc'];
  ctx.strokeStyle = 'rgba(90, 40, 10, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(46, y0);
  ctx.quadraticCurveTo(W / 2, y0 + sag, W - 46, y0);
  ctx.stroke();
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    const x = 46 + u * (W - 92);
    const y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * (y0 + sag) + u * u * y0;
    const glow = 0.75 + 0.25 * Math.sin(t * 3 + i * 1.3);
    ctx.globalAlpha = glow;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.arc(x, y + 8, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------- juggler ----------
function drawJuggler(ctx, g) {
  const x = g.juggler.x;
  const bob = g.state === 'playing' ? Math.sin(g.time * 6) * 2 : 0;
  const feetY = ARENA.floorY + bob;
  const handsY = ARENA.catchY;
  ctx.save();
  ctx.translate(x, 0);
  // Shadow.
  ctx.fillStyle = 'rgba(60, 20, 0, 0.25)';
  ctx.beginPath(); ctx.ellipse(0, ARENA.floorY + 4, 42, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Legs (black trousers).
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, feetY - 52); ctx.lineTo(-14, feetY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, feetY - 52); ctx.lineTo(14, feetY); ctx.stroke();
  // Red ringmaster coat.
  ctx.fillStyle = PALETTE.tentRed;
  ctx.beginPath();
  ctx.moveTo(-24, feetY - 52);
  ctx.lineTo(24, feetY - 52);
  ctx.lineTo(18, feetY - 108);
  ctx.lineTo(-18, feetY - 108);
  ctx.closePath(); ctx.fill();
  // Gold trim + buttons.
  ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, feetY - 104); ctx.lineTo(0, feetY - 56); ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  for (const by of [feetY - 96, feetY - 82, feetY - 68]) { ctx.beginPath(); ctx.arc(0, by, 2.5, 0, Math.PI * 2); ctx.fill(); }
  // Arms raised to the catch line, white gloves.
  ctx.strokeStyle = PALETTE.tentRed; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-16, feetY - 100); ctx.lineTo(-34, handsY + 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16, feetY - 100); ctx.lineTo(34, handsY + 6); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-34, handsY + 6, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(34, handsY + 6, 8, 0, Math.PI * 2); ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath(); ctx.arc(0, feetY - 122, 15, 0, Math.PI * 2); ctx.fill();
  // Moustache.
  ctx.strokeStyle = '#3a1c0d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-8, feetY - 116); ctx.quadraticCurveTo(0, feetY - 112, 8, feetY - 116); ctx.stroke();
  // Tall top hat.
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-13, feetY - 158, 26, 24);
  ctx.beginPath(); ctx.ellipse(0, feetY - 134, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(-13, feetY - 140, 26, 4);
  // Catch-zone hint under the hands.
  const cr = g.owned.has('wide') ? 70 : 46;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.ellipse(0, handsY, cr, 10, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ---------- props ----------
function drawProps(ctx, g) {
  for (const p of g.props) {
    if (p.state !== 'air') continue;
    const def = PROP_DEFS[p.type];
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.type === 'ball') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.color2;
      ctx.beginPath(); ctx.arc(0, 0, p.r, -0.5, 0.9); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(-4, -5, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'club') {
      ctx.rotate(p.angle);
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.color2;
      ctx.beginPath(); ctx.arc(0, -18, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 18, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7, -4, 14, 5);
    } else if (p.type === 'ring') {
      ctx.rotate(p.angle);
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(0, 0, p.r - 3, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = def.color2;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, p.r - 3, 0, Math.PI * 2); ctx.stroke();
    } else if (p.type === 'torch') {
      ctx.rotate(Math.max(-0.4, Math.min(0.4, p.vx * 0.001)));
      ctx.fillStyle = '#7c4a1e';
      ctx.fillRect(-3, -2, 6, 24);
      // Flame: flickering teardrop.
      const fl = 1 + 0.18 * Math.sin(g.time * 14 + p.x);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(0, -26 * fl);
      ctx.quadraticCurveTo(11, -12, 7, -2);
      ctx.quadraticCurveTo(0, 4, -7, -2);
      ctx.quadraticCurveTo(-11, -12, 0, -26 * fl);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(0, -16 * fl);
      ctx.quadraticCurveTo(6, -8, 4, -1);
      ctx.quadraticCurveTo(0, 3, -4, -1);
      ctx.quadraticCurveTo(-6, -8, 0, -16 * fl);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- particles ----------
function drawParticles(ctx, g) {
  for (const p of g.particles.list) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    if (p.kind === 'star') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    } else if (p.kind === 'ring') {
      ctx.strokeStyle = p.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  for (const t of g.particles.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.max);
    ctx.font = `bold ${t.size}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = t.color;
    ctx.strokeStyle = 'rgba(58, 28, 13, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.str, t.x, t.y);
    ctx.fillText(t.str, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- HUD ----------
function drawHUD(ctx, g) {
  const perf = currentPerformance(g);
  // Top bar.
  ctx.fillStyle = 'rgba(255, 243, 214, 0.92)';
  rr(ctx, 16, 12, 1248, 64, 12); ctx.fill();
  ctx.strokeStyle = PALETTE.tentRed; ctx.lineWidth = 2;
  rr(ctx, 16, 12, 1248, 64, 12); ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText(`SCORE  ${Math.floor(g.score).toLocaleString()}`, 34, 44);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`BEST ${g.best.toLocaleString()}`, 34, 66);
  // Combo.
  if (g.combo > 1) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillStyle = g.combo >= 5 ? PALETTE.tentRed : INK;
    ctx.fillText(`COMBO ×${g.combo}`, 640, 48);
  }
  // Performance name + progress.
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText(`P${g.perfIndex + 1} · ${perf.name}`, 1246, 36);
  const barX = 1010, barW = 236;
  ctx.fillStyle = 'rgba(58, 28, 13, 0.25)';
  rr(ctx, barX, 46, barW, 14, 7); ctx.fill();
  const frac = Math.min(1, g.perfCatches / perf.target);
  ctx.fillStyle = PALETTE.gold;
  if (frac > 0) { rr(ctx, barX, 46, barW * frac, 14, 7); ctx.fill(); }
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText(`${g.perfCatches}/${perf.target}`, 1246, 72);
  // Lives (stars) + applause meter on a cream pill, bottom-left.
  ctx.fillStyle = 'rgba(255, 243, 214, 0.92)';
  rr(ctx, 16, 644, 300, 64, 10); ctx.fill();
  ctx.strokeStyle = PALETTE.tentRed; ctx.lineWidth = 2;
  rr(ctx, 16, 644, 300, 64, 10); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText('APPLAUSE', 30, 668);
  ctx.fillStyle = 'rgba(58, 28, 13, 0.3)';
  rr(ctx, 130, 656, 150, 12, 6); ctx.fill();
  ctx.fillStyle = '#ff5d73';
  if (g.applause > 0) { rr(ctx, 130, 656, 150 * (g.applause / 100), 12, 6); ctx.fill(); }
  for (let i = 0; i < 5; i++) {
    ctx.font = '24px Georgia, serif';
    ctx.fillStyle = i < g.lives ? PALETTE.gold : 'rgba(58,28,13,0.25)';
    ctx.fillText('★', 30 + i * 28, 698);
  }
  // Active timed upgrades, bottom-right.
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px Georgia, serif';
  let uy = 716 - 40;
  if (g.slowUntil > g.time) { ctx.fillStyle = '#2563eb'; ctx.fillText(`◷ SLOW ${Math.ceil(g.slowUntil - g.time)}s`, 1250, uy); uy -= 20; }
  if (g.doubleUntil > g.time) { ctx.fillStyle = PALETTE.tentRed; ctx.fillText(`×2 DOUBLE ${Math.ceil(g.doubleUntil - g.time)}s`, 1250, uy); uy -= 20; }
  if (g.owned.has('wide')) { ctx.fillStyle = INK; ctx.fillText('✋ WIDE HANDS', 1250, uy); uy -= 20; }
  if (g.owned.has('magnet')) { ctx.fillStyle = INK; ctx.fillText('🧲 MAGNET', 1250, uy); }
  // Mute hint.
  ctx.font = '14px Georgia, serif';
  ctx.fillStyle = 'rgba(255, 243, 214, 0.85)';
  ctx.textAlign = 'center';
  ctx.fillText(g.muted ? 'MUTED (M)' : 'P pause · M mute · R restart', 640, 716 - 8);
}

function drawBanner(ctx, g) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillStyle = PALETTE.tentRed;
  ctx.strokeStyle = CREAM; ctx.lineWidth = 6;
  ctx.strokeText(g.banner.text, 640, 300);
  ctx.fillText(g.banner.text, 640, 300);
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText(g.banner.sub, 640, 332);
  ctx.restore();
}

// ---------- overlays ----------
function dim(ctx) {
  ctx.fillStyle = 'rgba(58, 28, 13, 0.55)';
  ctx.fillRect(0, 0, W, H);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(255, 243, 214, 0.97)';
  rr(ctx, x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = PALETTE.tentRed; ctx.lineWidth = 3;
  rr(ctx, x, y, w, h, 16); ctx.stroke();
}

function button(ctx, x, y, w, h, label, font = 'bold 22px Georgia, serif') {
  ctx.fillStyle = PALETTE.tentRed;
  rr(ctx, x, y, w, h, 10); ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 8);
  return { x, y, w, h };
}

function drawTitle(ctx, g) {
  dim(ctx);
  panel(ctx, 90, 36, 1100, 648);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('★ BIG TOP ★', 640, 128);
  ctx.fillStyle = INK;
  ctx.font = 'italic bold 26px Georgia, serif';
  ctx.fillText('Run the Last Circus', 640, 164);
  ctx.font = '16px Georgia, serif';
  ctx.fillText('The last circus is one dropped prop from closing. Keep the act alive — catch everything.', 640, 192);

  // Left column: goal / win-lose / controls.
  const lx = 130, lw = 500;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('GOAL', lx, 232);
  ctx.fillStyle = INK;
  ctx.font = '16px Georgia, serif';
  let y = wrapText(ctx, 'Juggle every prop the ringmaster tosses. Catch 20–50 props to finish each performance, survive all 8, and impress The Critic in the front row.', lx, 254, lw, 21);
  y += 14;
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('WIN / LOSE', lx, y);
  ctx.fillStyle = INK;
  ctx.font = '16px Georgia, serif';
  y = wrapText(ctx, 'WIN: finish performance 8, The Critic, for a grade S / A / B. LOSE: drop 3 props (a drop costs 1 life and resets your combo).', lx, y + 22, lw, 21);
  y += 14;
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('CONTROLS', lx, y);
  ctx.fillStyle = INK;
  ctx.font = '16px Georgia, serif';
  const controls = [
    '← → or A / D — move the juggler',
    'Mouse / touch — juggler follows your pointer',
    'Enter — start · P — pause · M — mute',
    'R — restart · 1 / 2 / 3 — pick a bonus',
    'Click — start, pause, pick, retry',
  ];
  y += 22;
  for (const c of controls) { ctx.fillText('• ' + c, lx, y); y += 22; }

  // Right column: props + performances + scoring.
  const rx = 680, rw = 470;
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('THE PROPS', rx, 232);
  ctx.fillStyle = INK;
  ctx.font = '16px Georgia, serif';
  let ry = wrapText(ctx, '● BALL — quick and honest. ♣ CLUB — spins end over end. ○ RING — sails wide. 🔥 TORCH — catch the stick, not the flame.', rx, 254, rw, 21);
  ry += 14;
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('8 PERFORMANCES', rx, ry);
  ctx.fillStyle = INK;
  ctx.font = '15px Georgia, serif';
  ry += 22;
  PERFORMANCES.forEach((p, i) => {
    ctx.fillText(`P${i + 1}  ${p.name} — ${p.target} catches`, rx, ry);
    ry += 20;
  });
  ry += 10;
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('SCORING', rx, ry);
  ctx.fillStyle = INK;
  ctx.font = '16px Georgia, serif';
  wrapText(ctx, 'Catch 50 · Perfect catch 100 (dead centre!) · combo multiplies up to ×8 · performance bonus 1000 · full applause meter = ENCORE +500 · pick-1-of-3 upgrade after each performance.', rx, ry + 22, rw, 21);

  g.ui.startBtn = button(ctx, 490, 596, 300, 56, '▶  START THE SHOW');
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Best score: ${g.best.toLocaleString()}`, 640, 672);
}

function drawPaused(ctx, g) {
  dim(ctx);
  panel(ctx, 440, 220, 400, 280);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('PAUSED', 640, 290);
  ctx.fillStyle = INK;
  ctx.font = '18px Georgia, serif';
  ctx.fillText('The props wait for no one. Well — now they do.', 640, 326);
  g.ui.resumeBtn = button(ctx, 490, 360, 300, 48, 'RESUME');
  g.ui.pauseRestartBtn = button(ctx, 490, 420, 300, 48, 'RESTART');
  g.ui.pauseTitleBtn = button(ctx, 490, 478, 300, 40, 'BACK TO TITLE', 'bold 18px Georgia, serif');
}

function drawBonus(ctx, g) {
  dim(ctx);
  const done = currentPerformance(g);
  ctx.textAlign = 'center';
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.strokeText(`${done.name} COMPLETE!`, 640, 120);
  ctx.fillText(`${done.name} COMPLETE!`, 640, 120);
  ctx.font = '20px Georgia, serif';
  ctx.fillText('The crowd wants more. Pick one upgrade — the show goes on.', 640, 154);
  g.ui.bonusRects = [];
  const cw = 300, ch = 300, gap = 40;
  const total = cw * 3 + gap * 2;
  const x0 = (W - total) / 2;
  g.offers.forEach((o, i) => {
    const x = x0 + i * (cw + gap);
    const y = 200;
    panel(ctx, x, y, cw, ch);
    ctx.textAlign = 'center';
    ctx.font = '52px Georgia, serif';
    ctx.fillStyle = INK;
    ctx.fillText(o.icon, x + cw / 2, y + 78);
    ctx.fillStyle = PALETTE.tentRed;
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText(o.name, x + cw / 2, y + 124);
    ctx.fillStyle = INK;
    ctx.font = '17px Georgia, serif';
    wrapText(ctx, o.desc, x + cw / 2, y + 158, 240, 23);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText(`Press ${i + 1} or click`, x + cw / 2, y + ch - 22);
    g.ui.bonusRects.push({ x, y, w: cw, h: ch });
  });
  ctx.fillStyle = CREAM;
  ctx.font = '18px Georgia, serif';
  ctx.fillText(`Score ${Math.floor(g.score).toLocaleString()} · Lives ${g.lives} ★ · Next: P${g.perfIndex + 2} ${PERFORMANCES[g.perfIndex + 1]?.name || ''}`, 640, 560);
}

function drawVictory(ctx, g) {
  dim(ctx);
  panel(ctx, 290, 60, 700, 600);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillText('★ THE CRITIC APPLAUDS! ★', 640, 122);
  ctx.fillStyle = INK;
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('The last circus is saved.', 640, 152);
  // Grade.
  ctx.font = 'bold 120px Georgia, serif';
  ctx.fillStyle = g.grade === 'S' ? PALETTE.gold : PALETTE.tentRed;
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.strokeText(g.grade, 640, 280);
  ctx.fillText(g.grade, 640, 280);
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText(g.gradeTitle, 640, 316);
  // Stat grid.
  const stats = [
    ['SCORE', Math.floor(g.score).toLocaleString()],
    ['CATCHES', String(g.totalCatches)],
    ['DROPS', String(g.totalDrops)],
    ['ACCURACY', `${g.accuracy()}%`],
    ['MAX COMBO', `×${g.maxCombo}`],
    ['PERFORMANCES', '8 / 8'],
    ['TIME', g.fmtTime(g.runTime)],
    ['LIVES LEFT', `${g.lives} ★`],
  ];
  ctx.font = 'bold 17px Georgia, serif';
  stats.forEach(([label, value], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 360 : 640;
    const y = 360 + row * 34;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(label, x, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = INK;
    ctx.fillText(value, x + 240, y);
  });
  ctx.textAlign = 'center';
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`Best score: ${g.best.toLocaleString()}`, 640, 516);
  g.ui.againBtn = button(ctx, 440, 540, 400, 52, '↻  PLAY AGAIN');
  g.ui.victoryTitleBtn = button(ctx, 490, 600, 300, 40, 'BACK TO TITLE', 'bold 18px Georgia, serif');
}

function drawGameOver(ctx, g) {
  dim(ctx);
  panel(ctx, 340, 150, 600, 420);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.tentRed;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('CURTAIN FALLS', 640, 230);
  ctx.fillStyle = INK;
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('Three props dropped. The crowd goes home.', 640, 268);
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(`SCORE  ${Math.floor(g.score).toLocaleString()}`, 640, 330);
  ctx.font = '18px Georgia, serif';
  ctx.fillText(`Reached P${g.perfIndex + 1} · ${currentPerformance(g).name} · ${g.totalCatches} catches · best ${g.best.toLocaleString()}`, 640, 366);
  g.ui.retryBtn = button(ctx, 440, 410, 400, 52, '↻  TRY AGAIN');
  g.ui.overTitleBtn = button(ctx, 490, 474, 300, 40, 'BACK TO TITLE', 'bold 18px Georgia, serif');
}
