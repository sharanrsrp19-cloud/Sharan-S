import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWeatherPool,
  getBiomeWeatherProfile,
  stepWeatherPool,
} from './weather';
import { BiomeId } from './types';

test('every biome maps to a valid weather profile', () => {
  const biomes: BiomeId[] = [
    'meadow',
    'canyon',
    'fortress',
    'cavern',
    'citadel',
    'glacier',
    'swamp',
    'storm',
  ];
  for (const b of biomes) {
    const profile = getBiomeWeatherProfile(b);
    assert.ok(profile.activeCount > 0);
    assert.ok(profile.colors.length > 0);
    assert.ok(profile.alpha > 0 && profile.alpha <= 1);
  }
  assert.equal(getBiomeWeatherProfile('meadow').kind, 'leaves');
  assert.equal(getBiomeWeatherProfile('fortress').kind, 'rain');
  assert.equal(getBiomeWeatherProfile('citadel').kind, 'embers');
  assert.equal(getBiomeWeatherProfile('glacier').kind, 'snow');
  assert.equal(getBiomeWeatherProfile('swamp').kind, 'fireflies');
  assert.equal(getBiomeWeatherProfile('storm').kind, 'lightning');
});

test('stepWeatherPool responds to wind, stays finite, and triggers rain splashes on platforms', () => {
  const pool = createWeatherPool('fortress');
  const platforms = [{ id: 'p1', x: 0, y: 500, w: 1280, h: 220, material: 'stone' as const }];

  // Force first rain particle right above platform top
  pool.particles[0].x = 400;
  pool.particles[0].y = 496;
  pool.particles[0].splashTimer = 0;

  stepWeatherPool(pool, 'fortress', 120, 1.0, 0.02, platforms);

  assert.ok(pool.particles[0].splashTimer > 0, 'Raindrop hitting platform should trigger splash');
  assert.equal(pool.particles[0].splashY, 500);

  // Step leaves with negative wind (westward)
  const leafPool = createWeatherPool('meadow');
  const startX = leafPool.particles[0].x;
  stepWeatherPool(leafPool, 'meadow', -150, 0, 0.05, platforms);
  assert.ok(leafPool.particles[0].x < startX || leafPool.particles[0].x > 1200);

  for (const pt of leafPool.particles) {
    assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y));
  }
});
