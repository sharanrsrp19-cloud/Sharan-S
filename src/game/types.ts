import type { DailyMissionsState, EquipmentState } from './progression';

export type GameState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export type ArrowType = 'standard' | 'triple' | 'fire';

export type BiomeId =
  | 'meadow'
  | 'fortress'
  | 'canyon'
  | 'cavern'
  | 'citadel'
  | 'glacier'
  | 'swamp'
  | 'storm';

export type EnemyArchetype = 'scout' | 'sniper' | 'shield' | 'bombardier' | 'boss';

export type HitZone = 'head' | 'torso' | 'limb' | 'shield' | 'none';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Platform {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  material: 'grass' | 'wood' | 'stone' | 'iron';
  ricochet?: boolean;
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  movePhase?: number;
  baseX?: number;
  baseY?: number;
}

export interface PropDef {
  id: string;
  kind: 'barrel' | 'crate' | 'supply_crate' | 'pendulum';
  x: number;
  y: number;
  w: number;
  h: number;
  platformId?: string;
  ropeLength?: number;
  swingAngle?: number;
  swingSpeed?: number;
  phase?: number;
}

export interface ActiveProp extends PropDef {
  hp: number;
  maxHp: number;
  destroyed: boolean;
  flashTimer: number;
  // For pendulums
  bobX: number;
  bobY: number;
  bobRadius: number;
  ropeSevered: boolean;
  vy: number;
  vx: number;
  angle: number;
}

export interface EnemySpawn {
  archetype: EnemyArchetype;
  x: number;
  y: number;
  platformId?: string;
}

export interface WaveDef {
  enemies: EnemySpawn[];
  roundBiome?: BiomeId;
  roundLabel?: string;
  windBase?: number;
  windGust?: number;
}

export interface LevelDef {
  id: number;
  name: string;
  subtitle: string;
  biome: BiomeId;
  windBase: number; // horizontal acceleration px/s^2
  windGust: number; // oscillation amplitude
  playerSpawn: Vec2;
  platforms: Platform[];
  props: PropDef[];
  waves: WaveDef[];
  startingAmmo: {
    triple: number;
    fire: number;
  };
}

export interface StuckArrow {
  relX: number;
  relY: number;
  angle: number;
  type: ArrowType;
  targetType: 'platform' | 'actor' | 'ragdoll' | 'prop';
  targetId: string;
  boneIndex?: number; // for ragdoll/actor attachment
}

export interface Arrow {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  angle: number;
  fromPlayer: boolean;
  type: ArrowType;
  isBomb?: boolean;
  damage: number;
  bouncesLeft: number;
  age: number;
  active: boolean;
  trail: Vec2[];
}

export interface Actor {
  id: string;
  isPlayer: boolean;
  archetype: EnemyArchetype | 'player';
  x: number;
  y: number; // feet position
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  platformId?: string;
  patrolMinX: number;
  patrolMaxX: number;
  patrolDir: 1 | -1;
  patrolSpeed: number;
  // Combat & telegraph state
  state: 'idle' | 'aiming' | 'recover';
  stateTimer: number;
  aimDuration: number;
  aimAngle: number;
  aimPower: number;
  aimSpeed?: number;
  hasToken: boolean;
  shieldActive: boolean;
  flashTimer: number;
  squashX: number;
  squashY: number;
  hatLost: boolean;
  walkPhase: number;
  scarfNodes?: Vec2[];
}

export interface RagdollNode {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
}

export interface RagdollConstraint {
  a: number;
  b: number;
  length: number;
}

export interface RagdollBody {
  id: string;
  isPlayer: boolean;
  archetype: EnemyArchetype | 'player';
  facing: 1 | -1;
  nodes: RagdollNode[];
  constraints: RagdollConstraint[];
  age: number;
  alpha: number;
  hatX: number;
  hatY: number;
  hatVx: number;
  hatVy: number;
  hatRot: number;
  hatVRot: number;
  hatLost: boolean;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  outline?: boolean;
  life: number;
  maxLife: number;
  gravity: number;
  kind: 'circle' | 'spark' | 'splinter' | 'smoke' | 'starburst' | 'leaf';
  rot: number;
  vRot: number;
}

export interface FloatingCallout {
  id: number;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface ExplosionFlash {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface HudSnapshot {
  mode: 'campaign' | 'endless';
  levelId: number;
  levelName: string;
  biome: BiomeId;
  waveIndex: number;
  totalWaves: number;
  hp: number;
  maxHp: number;
  score: number;
  bestScore: number;
  combo: number;
  wind: number;
  selectedArrow: ArrowType;
  ammo: {
    triple: number;
    fire: number;
  };
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  kills: number;
  elapsedSec: number;
  muted: boolean;
  bossHp?: number;
  bossMaxHp?: number;
  bossName?: string;
  healerCharges: number;
  healerHealAmount: number;
  canCoinHeal: boolean;
  coins: number;
  scoreMultiplier: number;
  activeMissionText?: string;
}

export interface LevelProgress {
  unlockedLevel: number;
  stars: Record<number, number>;
  bestScore: number;
  endlessBest: number;
  coins: number;
  totalCoinsEarned: number;
  levelsFinished: number;
  claimedGifts: number[];
  equipment: EquipmentState;
  dailyMissions: DailyMissionsState;
}
