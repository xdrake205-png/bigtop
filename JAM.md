# BIG TOP — Run the Last Circus — JAM.md

Jam rules summary (best-game-01, deadline Thu 19 Nov 2026 01:00 WIB).

## Concept
One verb only: JUGGLING. The juggler moves left-right and catches props arcing
through the air. 8 performances, boss "The Critic" (P8). 3 drops = game over.
Pick-1-of-3 upgrade after each performance. Victory grade S/A/B + stat grid.

## Rules
- Vanilla Canvas, no engine, no paid assets/APIs. game/ static + offline.
- 1280x720. 60 FPS. WebAudio synth only. localStorage best: `bigtop_best`.
- 4 screenshots (1280x720, <=256 KiB): 1-cover gameplay, 2-title manual,
  3-bonus pick-1-of-3, 4-victory grade S + stats. Deterministic ?shot= scenes.
- Structure: one file per job (config, rng, audio, input, props, performances,
  particles, game, render, shots, main). config.js is the tuning source of truth.
- Test with Playwright CLI (chromium). Never claim a feature passes before a real
  test run. Report real numbers.
- NEVER publish, submit, or sign anything. NEVER touch silverball/ or repo/
  (Coralfire). Folder: ~/workspace/makefun-best-game/bigtop/.

## Cut list (in order)
Extra prop types -> confetti variety -> audience reactions -> 9th performance ->
settings screen -> second tent theme.

## Playtest log (2026-11-18, real Playwright runs)
- Pure-random toss drift is mathematically unwinnable: with 3-7 props and a
  1.5s flight, landings scatter so two props land 0.05s apart 150px apart;
  even a 94% catch rate means ~15 drops over 255 catches vs 3 lives.
  Fix: every toss AIMS at the act's anchor (a slow random walk 300..980);
  95% land within anchor ±35px, 5% wide (anchor ±180px). |vx| stays 60..180.
- Slow Motion first shipped as gravity x0.55: props flew off the top of the
  screen (same vy, half gravity). Rebuilt as prop time-scale x0.55 instead:
  arcs keep their height, the world just plays slower.
- Magnet Gloves first shipped as a hard pull (vx clamp ±420): props were
  flung sideways faster than any prediction. Now gentle (pull 1.0, only
  while falling, vx clamp ±300).
- Grades calibrated from the real bot playthrough (348,600, 99% accuracy):
  S>=200,000, A>=120,000, B>=0. Victory shot numbers updated to match
  (348,600 / S / 255 catches / 2 drops / 99% / x8 / 3 lives / 1:37).
- Canvas bitmap bug: index.html had no width/height attributes, so the game
  drew on a 300x150 bitmap stretched to fullscreen (screenshots showed a
  zoomed top-left corner). Fixed with width=1280 height=720 attributes.
