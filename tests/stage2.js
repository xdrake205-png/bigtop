// Stage 2 Playwright test for BIG TOP: full 8-performance playthrough to victory
// with an auto-player bot installed IN the page (runs on rAF at 60fps, no
// round-trip latency), tries bonus keys 1/2/3 across the 7 bonuses, and checks
// best-score persistence. Returns a JSON summary.
async (page) => {
  const errors = [];
  const external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:8080')) external.push(r.url()); });
  const out = { performances: [], bonusPicks: [], dropLog: [] };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const snap = () => page.evaluate(() => window.__game ? window.__game.test.snapshot() : null);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' });
  await sleep(800);

  // FPS probe over 2s on the title screen (before starting, so no props drop).
  out.fps = await page.evaluate(() => new Promise((res) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(Math.round(n / 2)); };
    requestAnimationFrame(tick);
  }));

  // Install the in-page bot: every animation frame it steers the juggler to
  // the predicted landing x of the most urgent prop (smallest slack =
  // time-to-catch-line minus travel time), with hysteresis so it stops
  // thrashing between targets.
  await page.evaluate(() => {
    const G = 1400, CATCH_Y = 600, SPEED = 720;
    let cur = null;
    window.__bot = {
      frames: 0,
      events: [],
      _lastC: 0, _lastD: 0,
      step() {
        this.frames++;
        const g = window.__game;
        if (g && g.state === 'playing') {
          const s = g.test.snapshot();
          // Log every catch / drop with full context, within one frame.
          if (s.catches !== this._lastC || s.drops !== this._lastD) {
            this.events.push({
              type: s.catches !== this._lastC ? 'catch' : 'drop',
              t: Math.round(g.runTime * 100) / 100,
              jugglerX: s.jugglerX, target: cur ? Math.round(cur.lx) : null,
              catches: s.catches, drops: s.drops, lives: s.lives,
              props: s.props.map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy })),
            });
            if (this.events.length > 120) this.events.shift();
            this._lastC = s.catches; this._lastD = s.drops;
          }
          const cands = [];
          for (const p of s.props || []) {
            if (p.y >= CATCH_Y) continue; // already below the catch line: uncatchable
            let tP;
            if (p.vy >= 0) tP = (-p.vy + Math.sqrt(p.vy * p.vy + 2 * G * (CATCH_Y - p.y))) / G;
            else {
              const tUp = -p.vy / G;
              const yApex = p.y + p.vy * tUp / 2;
              tP = tUp + Math.sqrt(2 * Math.max(0, CATCH_Y - yApex) / G);
            }
            const tR = s.slowActive ? tP / 0.55 : tP;
            let lx = p.x + p.vx * tP;
            if (lx < 30) lx = 60 - lx;
            if (lx > 1250) lx = 2500 - lx;
            lx = Math.max(70, Math.min(1210, lx));
            cands.push({ lx, tR, slack: tR - Math.abs(lx - s.jugglerX) / SPEED });
          }
          if (cands.length) {
            cands.sort((a, b) => a.slack - b.slack);
            // Near-simultaneous landings: if the props landing within 0.2s
            // of the soonest one span <= 92px, stand at their midpoint and
            // catch the whole cluster instead of chasing one and losing the
            // other.
            const soonest = cands[0];
            const cluster = cands.filter((c) => c.tR - soonest.tR < 0.2);
            let best = soonest;
            if (cluster.length > 1) {
              const xs = cluster.map((c) => c.lx);
              const lo = Math.min(...xs), hi = Math.max(...xs);
              if (hi - lo <= 92) {
                best = { lx: (lo + hi) / 2, slack: soonest.slack, tR: soonest.tR };
              }
            }
            if (cur) {
              const still = cands.find((c) => Math.abs(c.lx - cur.lx) < 90);
              if (still && still.slack > -0.05 && best.slack > still.slack - 0.05) {
                cur = still;
                g.input.pointerX = still.lx;
                requestAnimationFrame(() => window.__bot.step());
                return;
              }
            }
            cur = best;
            g.input.pointerX = best.lx;
          }
        }
        requestAnimationFrame(() => window.__bot.step());
      },
    };
    window.__bot.step();
  });

  await page.keyboard.press('Enter');
  await sleep(300);

  const pickCycle = ['1', '2', '3', '1', '2', '3', '1'];
  let bonusCount = 0;
  let lastPerf = 0;
  let lastDrops = 0;
  const t0 = Date.now();
  let finalSnap = null;
  while (Date.now() - t0 < 300000) {
    const s = await snap();
    if (!s) break;
    if (s.state === 'victory' || s.state === 'gameover') { finalSnap = s; break; }
    if (s.drops > lastDrops) {
      out.dropLog.push({ at: Math.round((Date.now() - t0) / 1000), perf: s.perf, drops: s.drops, jugglerX: s.jugglerX, props: s.props });
      lastDrops = s.drops;
    }
    if (s.perf > lastPerf) {
      out.performances.push({ perf: s.perf, name: s.perfName, score: s.score, catches: s.catches, drops: s.drops, lives: s.lives, t: Math.round((Date.now() - t0) / 1000) });
      lastPerf = s.perf;
    }
    if (s.state === 'bonus') {
      const key = pickCycle[bonusCount % pickCycle.length];
      out.bonusPicks.push({ bonus: bonusCount + 1, key, offers: s.offers, score: s.score });
      bonusCount++;
      await page.keyboard.press(key);
      await sleep(200);
      continue;
    }
    await sleep(400);
  }
  out.final = finalSnap;
  out.wallMs = Date.now() - t0;
  out.bonusCount = bonusCount;
  out.botFrames = await page.evaluate(() => window.__bot ? window.__bot.frames : 0);
  out.botEvents = await page.evaluate(() => window.__bot ? window.__bot.events : []);

  // Best score persisted in localStorage?
  out.bestStored = await page.evaluate(() => Number(localStorage.getItem('bigtop_best') || 0));
  out.bestMatchesFinal = out.final ? out.bestStored === Math.floor(out.final.score) : false;

  // A fresh load still shows the best score on the title screen.
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' });
  await sleep(600);
  out.bestAfterReload = await page.evaluate(() => window.__game && window.__game.best);

  out.externalRequests = external;
  out.errors = errors;
  return JSON.stringify(out, null, 1);
}
