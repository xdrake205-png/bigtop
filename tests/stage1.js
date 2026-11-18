// Stage 1 Playwright test for BIG TOP (run via playwright-cli run-code).
// Returns a JSON summary; screenshots go to tests/out/.
// Order matters: pause is tested immediately after start (before any prop
// can drop), then movement, a real catch, a real drop, bonus, win, restart,
// and 3 real drops to game over.
async (page) => {
  const errors = [];
  const external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:8080')) external.push(r.url()); });
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const snap = () => page.evaluate(() => window.__game ? window.__game.test.snapshot() : null);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' });
  await sleep(800);
  out.booted = await page.evaluate(() => !!window.__game);
  out.titleState = (await snap())?.state;
  await page.screenshot({ path: '/home/hatch/workspace/makefun-best-game/bigtop/tests/out/stage1-title.png' });

  // Start the game.
  await page.keyboard.press('Enter');
  await sleep(400);
  out.afterEnter = await snap();

  // Pause / resume right away (no prop can have dropped yet).
  await page.keyboard.press('p');
  await sleep(300);
  out.paused = (await snap())?.state;
  await page.keyboard.press('p');
  await sleep(300);
  out.resumed = (await snap())?.state;

  // Real catch: force a prop onto the juggler, let physics catch it.
  const before = await snap();
  await page.evaluate(() => window.__game.test.catch());
  await sleep(400);
  const afterCatch = await snap();
  out.realCatch = { catchesBefore: before.catches, catchesAfter: afterCatch.catches, scoreBefore: before.score, scoreAfter: afterCatch.score };

  // Real drop FIRST (right after the catch, before any prop can drop
  // naturally): force a prop far from the juggler.
  const beforeDrop = await snap();
  await page.evaluate(() => window.__game.test.drop());
  await sleep(500);
  const afterDrop = await snap();
  out.realDrop = { livesBefore: beforeDrop.lives, livesAfter: afterDrop.lives, dropsBefore: beforeDrop.drops, dropsAfter: afterDrop.drops };

  // Move left then right; juggler x must change both ways.
  const x0 = (await snap()).jugglerX;
  await page.keyboard.down('ArrowLeft');
  await sleep(300);
  await page.keyboard.up('ArrowLeft');
  const xL = (await snap()).jugglerX;
  await page.keyboard.down('ArrowRight');
  await sleep(400);
  await page.keyboard.up('ArrowRight');
  const xR = (await snap()).jugglerX;
  out.movesLeft = xL < x0;
  out.movesRight = xR > xL;

  // Mouse steer: move pointer to x=300, juggler should follow.
  await page.mouse.move(300, 400);
  await sleep(500);
  out.mouseSteerX = (await snap()).jugglerX;

  // Performance complete -> bonus -> pick 1.
  await page.evaluate(() => window.__game.test.completePerformance());
  await sleep(300);
  out.bonusState = await snap();
  await page.keyboard.press('1');
  await sleep(300);
  out.afterBonus = await snap();

  // Win path.
  await page.evaluate(() => window.__game.test.win());
  await sleep(300);
  out.victory = await snap();
  await page.screenshot({ path: '/home/hatch/workspace/makefun-best-game/bigtop/tests/out/stage1-victory.png' });

  // Restart, then lose path (3 real drops).
  await page.keyboard.press('r');
  await sleep(400);
  out.afterRestart = await snap();
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { const g = window.__game; g.test.drop(); });
    await sleep(500);
  }
  out.gameover = await snap();
  await page.screenshot({ path: '/home/hatch/workspace/makefun-best-game/bigtop/tests/out/stage1-gameover.png' });

  // External requests?
  out.externalRequests = external;
  out.errors = errors;
  return JSON.stringify(out, null, 1);
}
