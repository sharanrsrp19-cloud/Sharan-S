import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_EQUIPMENT,
  calculateLevelCoinReward,
  computePlayerCombatStats,
  createDailyMissions,
  evaluateDailyMissionProgress,
  getActiveScoreMultiplier,
  getDailyBonusStartingArrows,
  purchaseArrowUpgrade,
  purchaseBowAction,
  resolveLevelGift,
} from './progression';

test('createDailyMissions generates 3 deterministic missions per date key', () => {
  const a = createDailyMissions('2026-11-14');
  const b = createDailyMissions('2026-11-14');
  assert.equal(a.missions.length, 3);
  assert.deepEqual(a, b);
  assert.ok(a.missions.some((m) => m.rewardKind === 'arrows'));
  assert.ok(a.missions.some((m) => m.rewardKind === 'multiplier'));
});

test('evaluateDailyMissionProgress updates progress and activates arrow & multiplier rewards', () => {
  const state = createDailyMissions('2026-11-14');
  assert.equal(getActiveScoreMultiplier(state), 1);

  const step1 = evaluateDailyMissionProgress(state, {
    kills: 5,
    headshots: 3,
    maxCombo: 4,
    shotsHit: 6,
    stageCleared: true,
  });

  assert.equal(step1.newlyCompleted.length, 3);
  assert.ok(step1.updated.missions.every((m) => m.completed));
  assert.ok(getActiveScoreMultiplier(step1.updated) > 1);
  const bonusArrows = getDailyBonusStartingArrows(step1.updated);
  assert.ok(bonusArrows.triple > 0 || bonusArrows.fire > 0);
});

test('purchaseArrowUpgrade and purchaseBowAction deduct coins and boost combat stats', () => {
  const baseStats = computePlayerCombatStats(DEFAULT_EQUIPMENT);
  assert.equal(baseStats.standardDamage, 38);
  assert.equal(baseStats.healerHealAmount, 2);

  const upgArrow = purchaseArrowUpgrade(100, DEFAULT_EQUIPMENT, 'standard');
  assert.equal(upgArrow.ok, true);
  assert.equal(upgArrow.coins, 55);
  assert.equal(upgArrow.equipment.arrowLevels.standard, 2);

  const upgStats = computePlayerCombatStats(upgArrow.equipment);
  assert.equal(upgStats.standardDamage, 45);

  // Insufficient coins fails gracefully
  const failBow = purchaseBowAction(50, upgArrow.equipment, 'falcon');
  assert.equal(failBow.ok, false);
  assert.equal(failBow.coins, 50);

  // Unlock falcon bow when coins suffice
  const unlockBow = purchaseBowAction(200, upgArrow.equipment, 'falcon');
  assert.equal(unlockBow.ok, true);
  assert.equal(unlockBow.coins, 80);
  assert.equal(unlockBow.equipment.equippedBow, 'falcon');
  assert.ok(unlockBow.equipment.ownedBows.includes('falcon'));
});

test('resolveLevelGift unlocks equipment on first clear and converts duplicates to coins', () => {
  // Stage 3 unlocks Falcon Longbow
  const firstGift = resolveLevelGift(3, true, DEFAULT_EQUIPMENT);
  assert.equal(firstGift.resolved.kind, 'bow');
  assert.ok(firstGift.updatedEquipment.ownedBows.includes('falcon'));

  // If player already owns Falcon Longbow, convert to coin bonus
  const dupGift = resolveLevelGift(3, true, firstGift.updatedEquipment);
  assert.equal(dupGift.resolved.kind, 'coins');
  assert.ok(dupGift.resolved.bonusCoins > 0);

  // Repeat clear gives repeat bonus coin chest
  const repeatGift = resolveLevelGift(3, false, firstGift.updatedEquipment);
  assert.equal(repeatGift.resolved.kind, 'coins');
  assert.ok(repeatGift.resolved.bonusCoins > 0);
});

test('calculateLevelCoinReward computes coins earned and running average coins per finished level', () => {
  const first = calculateLevelCoinReward({
    levelId: 1,
    mode: 'campaign',
    won: true,
    stars: 3,
    kills: 4,
    headshots: 2,
    waveReached: 2,
    isFirstClear: true,
    equipment: DEFAULT_EQUIPMENT,
    prevTotalCoinsEarned: 0,
    prevLevelsFinished: 0,
  });

  // Base: 22 + 6 + 30 + 8 = 66, Gift (stage 1): 40 => 106
  assert.equal(first.baseCoins, 66);
  assert.equal(first.gift.bonusCoins, 40);
  assert.equal(first.totalCoinsEarned, 106);
  assert.equal(first.nextLevelsFinished, 1);
  assert.equal(first.averageCoins, 106);

  const second = calculateLevelCoinReward({
    levelId: 2,
    mode: 'campaign',
    won: true,
    stars: 2,
    kills: 5,
    headshots: 1,
    waveReached: 2,
    isFirstClear: true,
    equipment: DEFAULT_EQUIPMENT,
    prevTotalCoinsEarned: first.nextTotalCoinsEarned,
    prevLevelsFinished: first.nextLevelsFinished,
  });

  // Base: 22 + 12 + 20 + 4 = 58, Gift (stage 2): arrow upgrade (0 bonusCoins)
  assert.equal(second.totalCoinsEarned, 58);
  assert.equal(second.nextLevelsFinished, 2);
  assert.equal(second.averageCoins, Math.round((106 + 58) / 2));
  assert.equal(second.updatedEquipment.arrowLevels.standard, 2);
});
