import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAVITY,
  calculateHitScore,
  calculateStars,
  computeLaunchVelocity,
  createRagdoll,
  evaluateHitZone,
  predictTrajectory,
  reflectVelocity,
  segmentCircleIntersect,
  segmentRectIntersect,
  solveBallisticAimAngle,
  stepArrowPhysics,
  stepRagdoll,
} from './physics';
import { CAMPAIGN_LEVELS, generateEndlessWave } from './levels';

test('computeLaunchVelocity rejects tiny drags and clamps max drag', () => {
  const tiny = computeLaunchVelocity(4, 3);
  assert.equal(tiny.power, 0);
  assert.equal(tiny.vx, 0);

  const mid = computeLaunchVelocity(90, -45);
  assert.ok(mid.power > 0.5 && mid.power < 1);
  assert.ok(mid.vx > 0 && mid.vy < 0);

  const huge = computeLaunchVelocity(500, -500);
  assert.equal(huge.power, 1);
});

test('predictTrajectory matches stepArrowPhysics exactly', () => {
  const startX = 180;
  const startY = 480;
  const vx = 620;
  const vy = -440;
  const windX = -50;
  const dt = 0.032;

  const predicted = predictTrajectory(startX, startY, vx, vy, windX, GRAVITY, 10, dt);
  assert.equal(predicted.length, 10);

  const sim = {
    x: startX,
    y: startY,
    prevX: startX,
    prevY: startY,
    vx,
    vy,
    angle: 0,
    age: 0,
    isBomb: false,
  };
  for (let i = 0; i < 10; i++) {
    stepArrowPhysics(sim, windX, GRAVITY, dt);
    assert.ok(Math.abs(sim.x - predicted[i].x) < 1e-6);
    assert.ok(Math.abs(sim.y - predicted[i].y) < 1e-6);
  }
});

test('swept segment intersections prevent high-speed tunneling', () => {
  // Fast arrow crosses straight through a small 11.5px radius circle in 1 frame
  const circleHit = segmentCircleIntersect(0, 100, 300, 100, 150, 100, 11.5);
  assert.ok(circleHit !== null);
  assert.ok(Math.abs(circleHit.t - (150 - 11.5) / 300) < 1e-4);

  // Fast arrow crosses thin vertical shield rect
  const rectHit = segmentRectIntersect(0, 100, 300, 100, 145, 70, 10, 60);
  assert.ok(rectHit !== null);
  assert.equal(rectHit.nx, -1);
  assert.equal(rectHit.ny, 0);
});

test('evaluateHitZone distinguishes headshots, shield blocks, and lobbed bypasses', () => {
  const shieldedEnemy = {
    x: 800,
    y: 500,
    facing: -1 as const,
    shieldActive: true,
    archetype: 'shield' as const,
  };

  // Frontal chest arrow gets blocked by shield
  const frontalChest = evaluateHitZone(
    { prevX: 740, prevY: 465, x: 810, y: 465, vx: 600, vy: 0, type: 'standard' },
    shieldedEnemy,
  );
  assert.equal(frontalChest.zone, 'shield');
  assert.equal(frontalChest.damageMultiplier, 0);

  // High-arc arrow dropping onto top of head bypasses front shield
  const overheadHeadshot = evaluateHitZone(
    { prevX: 790, prevY: 395, x: 802, y: 440, vx: 120, vy: 500, type: 'standard' },
    shieldedEnemy,
  );
  assert.equal(overheadHeadshot.zone, 'head');
  assert.equal(overheadHeadshot.isCrit, true);
  assert.ok(overheadHeadshot.damageMultiplier >= 2);
});

test('reflectVelocity reflects cleanly across surface normal', () => {
  const bounced = reflectVelocity(200, -100, 0, 1, 0.8);
  assert.ok(Math.abs(bounced.x - 160) < 1e-6);
  assert.ok(Math.abs(bounced.y - 80) < 1e-6);
});

test('stepRagdoll remains numerically stable and rests on platforms', () => {
  const platforms = [{ id: 'floor', x: 0, y: 500, w: 1280, h: 220, material: 'grass' as const }];
  const body = createRagdoll('r1', 600, 500, -1, false, 'scout', 240, -120, 'head', true);

  for (let i = 0; i < 120; i++) {
    stepRagdoll(body, platforms, GRAVITY, 0.016);
  }

  for (const n of body.nodes) {
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
    assert.ok(n.y <= 504, `Node fell through platform floor: y=${n.y}`);
  }
});

test('solveBallisticAimAngle hits distant targets under wind and across obstacles', () => {
  const platforms = CAMPAIGN_LEVELS[0].platforms;
  const sx = 1055;
  const sy = 500 - 52;
  const tx = 175;
  const ty = 540 - 44;

  // Test across calm meadow and strong gale headwind
  for (const windX of [0, -85, 95]) {
    const sol = solveBallisticAimAngle(sx, sy, tx, ty, 980, windX, GRAVITY, false, 0, platforms, false);
    const sim = {
      x: sx + Math.cos(sol.angle) * 20,
      y: sy + Math.sin(sol.angle) * 20,
      prevX: sx,
      prevY: sy,
      vx: Math.cos(sol.angle) * sol.speed,
      vy: Math.sin(sol.angle) * sol.speed,
      angle: sol.angle,
      age: 0,
      isBomb: false,
    };

    let minDist = Infinity;
    for (let step = 0; step < 200; step++) {
      stepArrowPhysics(sim, windX, GRAVITY, 0.016);
      const dist = Math.hypot(sim.x - tx, sim.y - ty);
      if (dist < minDist) minDist = dist;
      if (sim.x <= tx - 20 || sim.y > 750) break;
    }
    assert.ok(minDist < 16, `Expected ballistic shot under wind=${windX} to pass within 16px of target, got ${minDist.toFixed(1)}px`);
  }
});

test('campaign levels and scoring helpers are valid', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 12);
  for (const lvl of CAMPAIGN_LEVELS) {
    assert.ok(lvl.platforms.length >= 2);
    assert.ok(lvl.waves.length >= 2);
    for (const w of lvl.waves) {
      assert.ok(w.roundBiome, `Level ${lvl.id} wave missing roundBiome`);
    }
  }
  const endlessWave5 = generateEndlessWave(5);
  assert.ok(endlessWave5.wave.enemies.some((e) => e.archetype === 'boss'));

  assert.equal(calculateStars(0.6, 0.85, true), 3);
  assert.equal(calculateStars(0.2, 0.6, true), 2);
  assert.equal(calculateStars(0.1, 0.2, true), 1);
  assert.equal(calculateStars(0.9, 1.0, false), 0);

  assert.ok(calculateHitScore('head', 2, true) > calculateHitScore('torso', 0, false));
});
