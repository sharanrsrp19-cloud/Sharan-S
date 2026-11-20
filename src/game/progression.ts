import { ArrowType } from './types';

export type BowId = 'recurve' | 'falcon' | 'tempest';

export interface BowDef {
  id: BowId;
  name: string;
  tagline: string;
  unlockCost: number;
  baseSpeedMult: number;
  windResistance: number; // 0..0.45 reduction in wind drift for player arrows
  critBonus: number;
  woodColor: number;
  accentColor: number;
}

export const BOW_DEFS: Record<BowId, BowDef> = {
  recurve: {
    id: 'recurve',
    name: 'Oak Recurve',
    tagline: 'Balanced draw & steady arc',
    unlockCost: 0,
    baseSpeedMult: 1.0,
    windResistance: 0,
    critBonus: 0,
    woodColor: 0xc27b48,
    accentColor: 0xe84a27,
  },
  falcon: {
    id: 'falcon',
    name: 'Falcon Longbow',
    tagline: 'High-velocity flat flight & crisp crits',
    unlockCost: 120,
    baseSpeedMult: 1.1,
    windResistance: 0.15,
    critBonus: 0.25,
    woodColor: 0x38bdf8,
    accentColor: 0x0284c7,
  },
  tempest: {
    id: 'tempest',
    name: 'Tempest Warbow',
    tagline: 'Gale-piercing limbs & heavy impact',
    unlockCost: 240,
    baseSpeedMult: 1.18,
    windResistance: 0.35,
    critBonus: 0.45,
    woodColor: 0xfacc15,
    accentColor: 0x9333ea,
  },
};

export interface EquipmentState {
  equippedBow: BowId;
  ownedBows: BowId[];
  bowLevels: Record<BowId, number>; // 1..5
  arrowLevels: Record<ArrowType, number>; // 1..5
}

export const DEFAULT_EQUIPMENT: EquipmentState = {
  equippedBow: 'recurve',
  ownedBows: ['recurve'],
  bowLevels: { recurve: 1, falcon: 1, tempest: 1 },
  arrowLevels: { standard: 1, triple: 1, fire: 1 },
};

export const MAX_UPGRADE_LEVEL = 5;

export interface PlayerCombatStats {
  bowId: BowId;
  bowSpeedMult: number;
  windResistance: number;
  critMultBonus: number;
  standardDamage: number;
  standardBounces: number;
  tripleDamage: number;
  bonusTripleAmmo: number;
  fireDamage: number;
  fireRadius: number;
  bonusFireAmmo: number;
  healerCharges: number;
  healerHealAmount: number;
}

export function computePlayerCombatStats(equipment: EquipmentState): PlayerCombatStats {
  const bow = BOW_DEFS[equipment.equippedBow] || BOW_DEFS.recurve;
  const bowLvl = Math.max(1, Math.min(MAX_UPGRADE_LEVEL, equipment.bowLevels[bow.id] || 1));
  const stdLvl = Math.max(1, Math.min(MAX_UPGRADE_LEVEL, equipment.arrowLevels.standard || 1));
  const triLvl = Math.max(1, Math.min(MAX_UPGRADE_LEVEL, equipment.arrowLevels.triple || 1));
  const fireLvl = Math.max(1, Math.min(MAX_UPGRADE_LEVEL, equipment.arrowLevels.fire || 1));

  return {
    bowId: bow.id,
    bowSpeedMult: bow.baseSpeedMult + (bowLvl - 1) * 0.035,
    windResistance: bow.windResistance,
    critMultBonus: bow.critBonus + (bowLvl - 1) * 0.08,
    standardDamage: 38 + (stdLvl - 1) * 7,
    standardBounces: stdLvl >= 3 ? 3 : 2,
    tripleDamage: 28 + (triLvl - 1) * 5,
    bonusTripleAmmo: triLvl >= 4 ? 2 : triLvl >= 2 ? 1 : 0,
    fireDamage: 50 + (fireLvl - 1) * 10,
    fireRadius: 55 + (fireLvl - 1) * 7,
    bonusFireAmmo: fireLvl >= 5 ? 2 : fireLvl >= 3 ? 1 : 0,
    healerCharges: 2,
    healerHealAmount: bowLvl >= 3 ? 3 : 2,
  };
}

export function getArrowUpgradeCost(arrowType: ArrowType, currentLevel: number): number {
  if (currentLevel >= MAX_UPGRADE_LEVEL) return 0;
  const base = arrowType === 'standard' ? 45 : arrowType === 'triple' ? 55 : 65;
  return Math.round(base * Math.pow(1.65, currentLevel - 1));
}

export function getBowActionInfo(
  bowId: BowId,
  equipment: EquipmentState,
): { action: 'unlock' | 'upgrade' | 'max'; cost: number; level: number } {
  const owned = equipment.ownedBows.includes(bowId);
  const level = equipment.bowLevels[bowId] || 1;
  if (!owned) {
    return { action: 'unlock', cost: BOW_DEFS[bowId].unlockCost, level: 0 };
  }
  if (level >= MAX_UPGRADE_LEVEL) {
    return { action: 'max', cost: 0, level };
  }
  const base = bowId === 'recurve' ? 55 : bowId === 'falcon' ? 80 : 105;
  return {
    action: 'upgrade',
    cost: Math.round(base * Math.pow(1.6, level - 1)),
    level,
  };
}

export function purchaseBowAction(
  coins: number,
  equipment: EquipmentState,
  bowId: BowId,
): { ok: boolean; coins: number; equipment: EquipmentState } {
  const info = getBowActionInfo(bowId, equipment);
  if (info.action === 'max' || coins < info.cost) {
    return { ok: false, coins, equipment };
  }
  if (info.action === 'unlock') {
    return {
      ok: true,
      coins: coins - info.cost,
      equipment: {
        ...equipment,
        equippedBow: bowId,
        ownedBows: [...equipment.ownedBows, bowId],
        bowLevels: { ...equipment.bowLevels, [bowId]: 1 },
      },
    };
  }
  return {
    ok: true,
    coins: coins - info.cost,
    equipment: {
      ...equipment,
      bowLevels: { ...equipment.bowLevels, [bowId]: info.level + 1 },
    },
  };
}

export function purchaseArrowUpgrade(
  coins: number,
  equipment: EquipmentState,
  arrowType: ArrowType,
): { ok: boolean; coins: number; equipment: EquipmentState } {
  const currentLvl = equipment.arrowLevels[arrowType] || 1;
  if (currentLvl >= MAX_UPGRADE_LEVEL) {
    return { ok: false, coins, equipment };
  }
  const cost = getArrowUpgradeCost(arrowType, currentLvl);
  if (coins < cost) {
    return { ok: false, coins, equipment };
  }
  return {
    ok: true,
    coins: coins - cost,
    equipment: {
      ...equipment,
      arrowLevels: { ...equipment.arrowLevels, [arrowType]: currentLvl + 1 },
    },
  };
}

// ==========================================
// DAILY MISSIONS
// ==========================================

export type MissionMetric = 'kills' | 'headshots' | 'combo' | 'shots_hit' | 'clear_stage';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  progress: number;
  completed: boolean;
  rewardKind: 'arrows' | 'multiplier';
  rewardArrows?: { triple?: number; fire?: number };
  rewardMultiplier?: number; // e.g., 0.25 means +0.25x additive bonus
  rewardLabel: string;
}

export interface DailyMissionsState {
  dateKey: string;
  missions: DailyMission[];
}

export function getLocalDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  rewardKind: 'arrows' | 'multiplier';
  rewardArrows?: { triple?: number; fire?: number };
  rewardMultiplier?: number;
  rewardLabel: string;
}

const MISSION_POOL: MissionTemplate[] = [
  {
    id: 'dm_sharpshooter',
    title: 'Precision Eye',
    description: 'Land 3 arrow hits in a single round',
    metric: 'shots_hit',
    target: 3,
    rewardKind: 'arrows',
    rewardArrows: { triple: 2, fire: 1 },
    rewardLabel: '+2 Triple & +1 Fire Arrow',
  },
  {
    id: 'dm_headhunter',
    title: 'Bullseye Marksman',
    description: 'Score 2 headshots in a round',
    metric: 'headshots',
    target: 2,
    rewardKind: 'multiplier',
    rewardMultiplier: 0.35,
    rewardLabel: '+0.35x Score Multiplier',
  },
  {
    id: 'dm_slayer',
    title: 'Wave Breaker',
    description: 'Defeat 4 enemies in a round',
    metric: 'kills',
    target: 4,
    rewardKind: 'arrows',
    rewardArrows: { fire: 2 },
    rewardLabel: '+2 Fire Arrows',
  },
  {
    id: 'dm_streak',
    title: 'Hot Streak',
    description: 'Reach a 3x hit combo in a round',
    metric: 'combo',
    target: 3,
    rewardKind: 'multiplier',
    rewardMultiplier: 0.25,
    rewardLabel: '+0.25x Score Multiplier',
  },
  {
    id: 'dm_victor',
    title: 'Field Champion',
    description: 'Clear any campaign stage',
    metric: 'clear_stage',
    target: 1,
    rewardKind: 'multiplier',
    rewardMultiplier: 0.3,
    rewardLabel: '+0.30x Score Multiplier',
  },
  {
    id: 'dm_volley',
    title: 'Quiver Master',
    description: 'Land 5 arrow hits in a single round',
    metric: 'shots_hit',
    target: 5,
    rewardKind: 'arrows',
    rewardArrows: { triple: 3 },
    rewardLabel: '+3 Triple Arrows',
  },
];

export function createDailyMissions(dateKey: string = getLocalDateKey()): DailyMissionsState {
  // Deterministic hash from YYYY-MM-DD so each day picks 3 varied missions
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }

  // Pick 1 arrow mission, 1 multiplier mission, and 1 stage/streak mission
  const arrowMissions = MISSION_POOL.filter((m) => m.rewardKind === 'arrows');
  const multMissions = MISSION_POOL.filter((m) => m.rewardKind === 'multiplier');

  const first = arrowMissions[hash % arrowMissions.length];
  const second = multMissions[(hash >> 3) % multMissions.length];
  const remaining = MISSION_POOL.filter((m) => m.id !== first.id && m.id !== second.id);
  const third = remaining[(hash >> 5) % remaining.length];

  return {
    dateKey,
    missions: [first, second, third].map((t) => ({
      ...t,
      progress: 0,
      completed: false,
    })),
  };
}

export interface RoundMissionMetrics {
  kills: number;
  headshots: number;
  maxCombo: number;
  shotsHit: number;
  stageCleared: boolean;
}

export function evaluateDailyMissionProgress(
  state: DailyMissionsState,
  metrics: RoundMissionMetrics,
): { updated: DailyMissionsState; newlyCompleted: DailyMission[] } {
  const newlyCompleted: DailyMission[] = [];
  const missions = state.missions.map((m) => {
    if (m.completed) return m;
    let val = 0;
    if (m.metric === 'kills') val = metrics.kills;
    else if (m.metric === 'headshots') val = metrics.headshots;
    else if (m.metric === 'combo') val = metrics.maxCombo;
    else if (m.metric === 'shots_hit') val = metrics.shotsHit;
    else if (m.metric === 'clear_stage') val = metrics.stageCleared ? 1 : 0;

    const nextProgress = Math.max(m.progress, Math.min(m.target, val));
    const completed = nextProgress >= m.target;
    const updatedMission: DailyMission = {
      ...m,
      progress: nextProgress,
      completed,
    };
    if (completed) {
      newlyCompleted.push(updatedMission);
    }
    return updatedMission;
  });

  return {
    updated: { ...state, missions },
    newlyCompleted,
  };
}

export function getActiveScoreMultiplier(state: DailyMissionsState): number {
  let bonus = 0;
  for (const m of state.missions) {
    if (m.completed && m.rewardKind === 'multiplier' && m.rewardMultiplier) {
      bonus += m.rewardMultiplier;
    }
  }
  return Number((1 + bonus).toFixed(2));
}

export function getDailyBonusStartingArrows(state: DailyMissionsState): { triple: number; fire: number } {
  let triple = 0;
  let fire = 0;
  for (const m of state.missions) {
    if (m.completed && m.rewardKind === 'arrows' && m.rewardArrows) {
      triple += m.rewardArrows.triple || 0;
      fire += m.rewardArrows.fire || 0;
    }
  }
  return { triple, fire };
}

// ==========================================
// LEVEL GIFTS & COIN ECONOMY
// ==========================================

export type LevelGiftDef =
  | { kind: 'coins'; amount: number; label: string }
  | { kind: 'bow'; bowId: BowId; fallbackCoins: number; label: string }
  | { kind: 'arrow_upgrade'; arrowType: ArrowType; fallbackCoins: number; label: string };

export interface ResolvedGift {
  kind: 'coins' | 'bow' | 'arrow_upgrade';
  label: string;
  bonusCoins: number;
  equipmentName?: string;
}

const LEVEL_GIFTS: Record<number, LevelGiftDef> = {
  1: { kind: 'coins', amount: 40, label: 'Meadow Coin Pouch (+40 Coins)' },
  2: { kind: 'arrow_upgrade', arrowType: 'standard', fallbackCoins: 55, label: 'Standard Arrow Fletching (+1 Lv)' },
  3: { kind: 'bow', bowId: 'falcon', fallbackCoins: 95, label: 'Falcon Longbow Unlocked' },
  4: { kind: 'coins', amount: 75, label: 'Powder Vault Chest (+75 Coins)' },
  5: { kind: 'arrow_upgrade', arrowType: 'triple', fallbackCoins: 80, label: 'Triple Volley Fletching (+1 Lv)' },
  6: { kind: 'coins', amount: 95, label: 'Cavern Gem Cache (+95 Coins)' },
  7: { kind: 'bow', bowId: 'tempest', fallbackCoins: 140, label: 'Tempest Warbow Unlocked' },
  8: { kind: 'arrow_upgrade', arrowType: 'fire', fallbackCoins: 110, label: 'Blaze Tip Upgrade (+1 Lv)' },
  9: { kind: 'coins', amount: 120, label: 'Aurora Treasure (+120 Coins)' },
  10: { kind: 'arrow_upgrade', arrowType: 'triple', fallbackCoins: 110, label: 'Swamp Quiver Upgrade (+1 Lv)' },
  11: { kind: 'coins', amount: 150, label: 'Stormspire Bounty (+150 Coins)' },
  12: { kind: 'coins', amount: 250, label: 'Warlord Royal Hoard (+250 Coins)' },
};

export function getLevelGiftDef(levelId: number): LevelGiftDef {
  return LEVEL_GIFTS[levelId] || { kind: 'coins', amount: 50, label: 'Victory Coin Pouch (+50 Coins)' };
}

export function resolveLevelGift(
  levelId: number,
  isFirstClear: boolean,
  equipment: EquipmentState,
): { resolved: ResolvedGift; updatedEquipment: EquipmentState } {
  const def = getLevelGiftDef(levelId);

  if (!isFirstClear) {
    const repeatCoins = 20 + levelId * 4;
    return {
      resolved: {
        kind: 'coins',
        label: `Stage Bonus Chest (+${repeatCoins} Coins)`,
        bonusCoins: repeatCoins,
      },
      updatedEquipment: equipment,
    };
  }

  if (def.kind === 'coins') {
    return {
      resolved: {
        kind: 'coins',
        label: def.label,
        bonusCoins: def.amount,
      },
      updatedEquipment: equipment,
    };
  }

  if (def.kind === 'bow') {
    if (equipment.ownedBows.includes(def.bowId)) {
      return {
        resolved: {
          kind: 'coins',
          label: `${BOW_DEFS[def.bowId].name} Duplicate Bonus (+${def.fallbackCoins} Coins)`,
          bonusCoins: def.fallbackCoins,
        },
        updatedEquipment: equipment,
      };
    }
    return {
      resolved: {
        kind: 'bow',
        label: def.label,
        bonusCoins: 0,
        equipmentName: BOW_DEFS[def.bowId].name,
      },
      updatedEquipment: {
        ...equipment,
        ownedBows: [...equipment.ownedBows, def.bowId],
        bowLevels: { ...equipment.bowLevels, [def.bowId]: 1 },
      },
    };
  }

  // arrow_upgrade gift
  const currLv = equipment.arrowLevels[def.arrowType] || 1;
  if (currLv >= MAX_UPGRADE_LEVEL) {
    return {
      resolved: {
        kind: 'coins',
        label: `Max Fletching Bonus (+${def.fallbackCoins} Coins)`,
        bonusCoins: def.fallbackCoins,
      },
      updatedEquipment: equipment,
    };
  }

  return {
    resolved: {
      kind: 'arrow_upgrade',
      label: def.label,
      bonusCoins: 0,
      equipmentName: def.label,
    },
    updatedEquipment: {
      ...equipment,
      arrowLevels: { ...equipment.arrowLevels, [def.arrowType]: currLv + 1 },
    },
  };
}

export function calculateLevelCoinReward(params: {
  levelId: number;
  mode: 'campaign' | 'endless';
  won: boolean;
  stars: number;
  kills: number;
  headshots: number;
  waveReached: number;
  isFirstClear: boolean;
  equipment: EquipmentState;
  prevTotalCoinsEarned: number;
  prevLevelsFinished: number;
}): {
  baseCoins: number;
  gift: ResolvedGift;
  totalCoinsEarned: number;
  nextTotalCoinsEarned: number;
  nextLevelsFinished: number;
  averageCoins: number;
  updatedEquipment: EquipmentState;
} {
  const {
    levelId,
    mode,
    won,
    stars,
    kills,
    headshots,
    waveReached,
    isFirstClear,
    equipment,
    prevTotalCoinsEarned,
    prevLevelsFinished,
  } = params;

  let baseCoins = 0;
  let gift: ResolvedGift;
  let updatedEquipment = equipment;

  if (mode === 'endless') {
    baseCoins = Math.max(10, kills * 5 + headshots * 4 + (waveReached - 1) * 12);
    const chestCoins = waveReached >= 3 ? waveReached * 8 : 10;
    gift = {
      kind: 'coins',
      label: `Endless Spoils (+${chestCoins} Coins)`,
      bonusCoins: chestCoins,
    };
  } else if (won) {
    baseCoins = 22 + levelId * 6 + stars * 10 + headshots * 4;
    const giftRes = resolveLevelGift(levelId, isFirstClear, equipment);
    gift = giftRes.resolved;
    updatedEquipment = giftRes.updatedEquipment;
  } else {
    // Small consolation coin payout for defeated runs
    baseCoins = Math.max(5, kills * 4 + headshots * 3);
    gift = {
      kind: 'coins',
      label: 'Battle Scrap (+5 Coins)',
      bonusCoins: 5,
    };
  }

  const totalCoinsEarned = baseCoins + gift.bonusCoins;
  const nextTotalCoinsEarned = prevTotalCoinsEarned + totalCoinsEarned;
  const nextLevelsFinished = prevLevelsFinished + 1;
  const averageCoins = Math.round(nextTotalCoinsEarned / nextLevelsFinished);

  return {
    baseCoins,
    gift,
    totalCoinsEarned,
    nextTotalCoinsEarned,
    nextLevelsFinished,
    averageCoins,
    updatedEquipment,
  };
}
