import { SoundManager } from './audio';
import { CAMPAIGN_LEVELS, WORLD_HEIGHT, WORLD_WIDTH, generateEndlessWave } from './levels';
import {
  GRAVITY,
  MAX_LAUNCH_SPEED,
  clamp,
  computeLaunchVelocity,
  calculateHitScore,
  calculateStars,
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
import {
  CameraPreset,
  ThreeSceneRenderer,
} from './three/ThreeSceneRenderer';
import {
  ActiveProp,
  Actor,
  Arrow,
  ArrowType,
  BiomeId,
  EnemyArchetype,
  EnemySpawn,
  ExplosionFlash,
  FloatingCallout,
  GameState,
  HudSnapshot,
  LevelDef,
  Particle,
  Platform,
  RagdollBody,
  StuckArrow,
  Vec2,
} from './types';
import { WeatherPool, createWeatherPool, stepWeatherPool } from './weather';
import {
  DEFAULT_EQUIPMENT,
  DailyMissionsState,
  EquipmentState,
  PlayerCombatStats,
  computePlayerCombatStats,
  createDailyMissions,
  evaluateDailyMissionProgress,
  getActiveScoreMultiplier,
  getDailyBonusStartingArrows,
  getLocalDateKey,
} from './progression';

export interface RunSummary {
  won: boolean;
  mode: 'campaign' | 'endless';
  levelId: number;
  levelName: string;
  waveReached: number;
  totalWaves: number;
  score: number;
  bestScore: number;
  stars: number;
  accuracy: number;
  headshots: number;
  kills: number;
  elapsedSec: number;
  hasNextLevel: boolean;
}

interface EngineCallbacks {
  onStateChange: (state: GameState, summary?: RunSummary) => void;
  onHudUpdate: (hud: HudSnapshot) => void;
  onLevelComplete?: (levelId: number, stars: number, score: number, mode: 'campaign' | 'endless', runSummary: RunSummary) => void;
  onDailyMissionsUpdate?: (next: DailyMissionsState) => void;
  onSpendCoins?: (amount: number) => boolean;
}

const MAX_PARTICLES = 180;
const STORAGE_KEY_BEST = 'arrowfall_best_score_v1';

export class ArcheryEngine {
  private mountEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer3d: ThreeSceneRenderer;
  private callbacks: EngineCallbacks;
  public sound: SoundManager;

  private rafId: number | null = null;
  private running = false;
  private lastTimestamp = 0;
  private lastDt = 0.016;
  private resizeObserver: ResizeObserver | null = null;
  private cssW = 1280;
  private cssH = 720;

  // Game progression & state
  private gameState: GameState = 'title';
  private mode: 'campaign' | 'endless' = 'campaign';
  private currentLevelDef: LevelDef = CAMPAIGN_LEVELS[0];
  private waveIndex = 0;
  private waveClearTimer = 0;
  private endDelayTimer = 0;
  private pendingEndState: 'victory' | 'gameover' | null = null;

  // Simulation time & juice
  private time = 0;
  private elapsedRunSec = 0;
  private hitstopTimer = 0;
  private trauma = 0;
  private wind = 0;
  private windBase = 0;
  private windGust = 0;

  // Entities
  private biome: BiomeId = 'meadow';
  private platforms: Platform[] = [];
  private props: ActiveProp[] = [];
  private actors: Actor[] = [];
  private ragdolls: RagdollBody[] = [];
  private arrows: Arrow[] = [];
  private stuckArrows: StuckArrow[] = [];
  private particles: Particle[] = [];
  private particleCursor = 0;
  private callouts: FloatingCallout[] = [];
  private explosions: ExplosionFlash[] = [];
  private weatherPool: WeatherPool = createWeatherPool('meadow');
  private nextId = 1;

  // Player stats & quiver
  private selectedArrow: ArrowType = 'standard';
  private ammo = { triple: 2, fire: 1 };
  private score = 0;
  private bestScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private headshots = 0;
  private kills = 0;

  // Progression, equipment, daily missions & healer
  private equipment: EquipmentState = DEFAULT_EQUIPMENT;
  private combatStats: PlayerCombatStats = computePlayerCombatStats(DEFAULT_EQUIPMENT);
  private dailyMissions: DailyMissionsState = createDailyMissions();
  private coins = 60;
  private healerCharges = 2;
  private scoreMultiplier = 1;

  // Input state
  private isDragging = false;
  private dragStartWorld: Vec2 | null = null;
  private dragCurrWorld: Vec2 | null = null;
  private pointerId: number | null = null;
  private keysHeld = new Set<string>();
  private kbAimAngle = -0.35;
  private kbCharging = false;
  private kbPower = 0;
  private bowDrawSoundCooldown = 0;
  private lastHudPushTime = 0;
  private titleAimPos: Vec2 = { x: 820, y: 420 };

  constructor(mountEl: HTMLElement, callbacks: EngineCallbacks, initialMuted = false) {
    this.mountEl = mountEl;
    this.renderer3d = new ThreeSceneRenderer(mountEl);
    this.canvas = this.renderer3d.domElement;
    this.callbacks = callbacks;
    this.sound = new SoundManager(initialMuted);

    try {
      const savedBest = localStorage.getItem(STORAGE_KEY_BEST);
      if (savedBest) this.bestScore = parseInt(savedBest, 10) || 0;
    } catch {
      // ignore storage errors
    }

    // Pre-allocate zero-GC particle pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        color: '#FFF',
        life: 0,
        maxLife: 1,
        gravity: 0,
        kind: 'circle',
        rot: 0,
        vRot: 0,
      });
    }

    this.setupTitleDiorama();
    this.bindEvents();
    this.handleResize();
  }

  public startLoop(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();

    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const frameDt = Math.min(Math.max(rawDt, 0.001), 0.18);
      const subSteps = Math.max(1, Math.ceil(frameDt / 0.025));
      const subDt = frameDt / subSteps;
      this.lastDt = frameDt;
      for (let s = 0; s < subSteps; s++) {
        this.update(subDt);
      }
      this.render();
      if (!this.running) return;
      if (this.renderer3d.isSoftwareGl) {
        this.renderer3d.afterDraw(tick);
      } else {
        this.rafId = requestAnimationFrame(tick);
      }
    };

    if (this.renderer3d.isSoftwareGl) {
      this.rafId = requestAnimationFrame(tick);
    } else {
      this.rafId = requestAnimationFrame(tick);
    }
  }

  public destroy(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.renderer3d.cancelAfterDraw();
    this.unbindEvents();
    this.resizeObserver?.disconnect();
    this.renderer3d.dispose();
  }

  public setCameraPreset(preset: CameraPreset): void {
    this.renderer3d.setCameraPreset(preset);
  }

  public getCameraPreset(): CameraPreset {
    return this.renderer3d.getCameraPreset();
  }

  public getState(): GameState {
    return this.gameState;
  }

  public startCampaignLevel(levelId: number): void {
    const found = CAMPAIGN_LEVELS.find((l) => l.id === levelId) || CAMPAIGN_LEVELS[0];
    this.mode = 'campaign';
    this.currentLevelDef = found;
    this.beginRun();
  }

  public startEndless(): void {
    this.mode = 'endless';
    this.currentLevelDef = {
      ...CAMPAIGN_LEVELS[0],
      id: 1,
      name: 'Endless Arena',
      subtitle: 'Survive infinite waves',
      startingAmmo: { triple: 3, fire: 2 },
    };
    this.beginRun();
  }

  public restartLevel(): void {
    if (this.mode === 'endless') {
      this.startEndless();
    } else {
      this.startCampaignLevel(this.currentLevelDef.id);
    }
  }

  public togglePause(): void {
    if (this.gameState === 'playing') {
      this.setState('paused');
      this.clearInputs();
    } else if (this.gameState === 'paused') {
      this.setState('playing');
      this.canvas.focus();
    }
  }

  public returnToTitle(): void {
    this.clearInputs();
    this.setupTitleDiorama();
    this.setState('title');
  }

  public selectArrowType(type: ArrowType): void {
    if (type === 'triple' && this.ammo.triple <= 0) return;
    if (type === 'fire' && this.ammo.fire <= 0) return;
    this.selectedArrow = type;
    this.pushHud(true);
  }

  public toggleMute(): boolean {
    const m = this.sound.toggleMute();
    this.pushHud(true);
    return m;
  }

  public setProgressionContext(ctx: {
    equipment: EquipmentState;
    dailyMissions: DailyMissionsState;
    coins: number;
  }): void {
    this.equipment = ctx.equipment;
    this.combatStats = computePlayerCombatStats(ctx.equipment);
    this.dailyMissions = ctx.dailyMissions;
    this.coins = ctx.coins;
    this.scoreMultiplier = getActiveScoreMultiplier(ctx.dailyMissions);
    this.pushHud(true);
  }

  public useHealer(): boolean {
    if (this.gameState !== 'playing') return false;
    const player = this.actors.find((a) => a.isPlayer);
    if (!player || player.hp >= player.maxHp) return false;

    let healAmt = 0;
    if (this.healerCharges > 0) {
      this.healerCharges--;
      healAmt = this.combatStats.healerHealAmount;
    } else if (this.coins >= 25 && this.callbacks.onSpendCoins?.(25)) {
      this.coins -= 25;
      healAmt = 2;
    } else {
      return false;
    }

    const prevHp = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + healAmt);
    const actualHeal = player.hp - prevHp;
    this.sound.playHeal();
    this.spawnBurst(player.x, player.y - 44, 14, '#4ADE80', 'starburst', 170);
    this.addCallout(player.x, player.y - 92, `+${actualHeal} HP HEALED!`, '#4ADE80', 1.2);
    this.pushHud(true);
    return true;
  }

  private setState(next: GameState, summary?: RunSummary): void {
    this.gameState = next;
    if (typeof document !== 'undefined') {
      document.body.dataset.state =
        next === 'victory' ? 'gameover' : next;
    }
    this.callbacks.onStateChange(next, summary);
  }

  private setupTitleDiorama(): void {
    const lvl = CAMPAIGN_LEVELS[0];
    this.biome = lvl.biome;
    this.platforms = lvl.platforms.map((p) => ({ ...p }));
    this.props = lvl.props.map((pr) => this.createActiveProp(pr));
    this.actors = [this.createPlayerActor(lvl.playerSpawn)];
    this.ragdolls = [];
    this.arrows = [];
    this.stuckArrows = [];
    this.callouts = [];
    this.windBase = 25;
    this.windGust = 12;
    this.wind = 25;
  }

  private beginRun(): void {
    this.clearInputs();
    const todayKey = getLocalDateKey();
    if (this.dailyMissions.dateKey !== todayKey) {
      this.dailyMissions = createDailyMissions(todayKey);
      this.callbacks.onDailyMissionsUpdate?.(this.dailyMissions);
    }
    this.combatStats = computePlayerCombatStats(this.equipment);
    this.healerCharges = this.combatStats.healerCharges;
    this.scoreMultiplier = getActiveScoreMultiplier(this.dailyMissions);
    const dailyArrows = getDailyBonusStartingArrows(this.dailyMissions);

    this.waveIndex = 0;
    this.waveClearTimer = 0;
    this.pendingEndState = null;
    this.endDelayTimer = 0;
    this.hitstopTimer = 0;
    this.trauma = 0;
    this.elapsedRunSec = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.headshots = 0;
    this.kills = 0;
    this.selectedArrow = 'standard';
    this.ragdolls = [];
    this.arrows = [];
    this.stuckArrows = [];
    this.callouts = [];
    for (const pt of this.particles) pt.active = false;

    if (this.mode === 'campaign') {
      const lvl = this.currentLevelDef;
      const firstWave = lvl.waves[0];
      this.biome = firstWave?.roundBiome ?? lvl.biome;
      this.windBase = firstWave?.windBase ?? lvl.windBase;
      this.windGust = firstWave?.windGust ?? lvl.windGust;
      this.wind = this.windBase;
      this.ammo = {
        triple: lvl.startingAmmo.triple + this.combatStats.bonusTripleAmmo + dailyArrows.triple,
        fire: lvl.startingAmmo.fire + this.combatStats.bonusFireAmmo + dailyArrows.fire,
      };
      this.platforms = lvl.platforms.map((p) => ({ ...p }));
      this.props = lvl.props.map((pr) => this.createActiveProp(pr));
      this.actors = [this.createPlayerActor(lvl.playerSpawn)];
      this.spawnWave(firstWave.enemies);
    } else {
      this.ammo = {
        triple: 3 + this.combatStats.bonusTripleAmmo + dailyArrows.triple,
        fire: 2 + this.combatStats.bonusFireAmmo + dailyArrows.fire,
      };
      this.loadEndlessWave(1);
    }

    this.setState('playing');
    this.pushHud(true);
    this.canvas.focus();
  }

  private loadEndlessWave(waveNum: number): void {
    const gen = generateEndlessWave(waveNum);
    this.biome = gen.biome;
    this.windBase = gen.windBase;
    this.windGust = gen.windGust;
    this.wind = gen.windBase;
    this.platforms = gen.platforms.map((p) => ({ ...p }));
    this.props = gen.props.map((pr) => this.createActiveProp(pr));

    const existingPlayer = this.actors.find((a) => a.isPlayer);
    const player = existingPlayer
      ? {
          ...existingPlayer,
          x: 165,
          y: 530,
          hp: Math.min(existingPlayer.maxHp, existingPlayer.hp + (waveNum > 1 ? 1 : 0)),
        }
      : this.createPlayerActor({ x: 165, y: 530 });

    this.actors = [player];
    this.stuckArrows = [];
    this.arrows = [];
    this.spawnWave(gen.wave.enemies);
  }

  private createPlayerActor(pos: Vec2): Actor {
    const scarfNodes: Vec2[] = [];
    for (let i = 0; i < 6; i++) {
      scarfNodes.push({ x: pos.x - i * 8, y: pos.y - 52 });
    }
    return {
      id: 'player',
      isPlayer: true,
      archetype: 'player',
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      facing: 1,
      hp: 5,
      maxHp: 5,
      patrolMinX: pos.x,
      patrolMaxX: pos.x,
      patrolDir: 1,
      patrolSpeed: 0,
      state: 'idle',
      stateTimer: 0,
      aimDuration: 0,
      aimAngle: -0.3,
      aimPower: 0,
      hasToken: false,
      shieldActive: false,
      flashTimer: 0,
      squashX: 1,
      squashY: 1,
      hatLost: false,
      walkPhase: 0,
      scarfNodes,
    };
  }

  private createActiveProp(pr: LevelDef['props'][number]): ActiveProp {
    const ropeLen = pr.ropeLength || 220;
    const angle = (pr.swingAngle || 0.5) * Math.sin(pr.phase || 0);
    return {
      ...pr,
      hp: pr.kind === 'barrel' ? 1 : pr.kind === 'pendulum' ? 999 : 40,
      maxHp: pr.kind === 'barrel' ? 1 : 40,
      destroyed: false,
      flashTimer: 0,
      bobX: pr.x + Math.sin(angle) * ropeLen,
      bobY: pr.y + Math.cos(angle) * ropeLen,
      bobRadius: (pr.w || 44) * 0.5,
      ropeSevered: false,
      vx: 0,
      vy: 0,
      angle,
    };
  }

  private getHardnessLevel(): number {
    if (this.mode === 'endless') {
      return 1 + this.waveIndex * 1.1;
    }
    return this.currentLevelDef.id + this.waveIndex * 0.45;
  }

  private spawnWave(spawns: EnemySpawn[]): void {
    const hardness = this.getHardnessLevel();
    const initialDelayBase = Math.max(0.55, 1.05 - hardness * 0.04);
    const initialDelayStep = Math.max(0.28, 0.55 - hardness * 0.02);

    spawns.forEach((sp, idx) => {
      const plat = this.platforms.find((p) => p.id === sp.platformId);
      const margin = 36;
      const minX = plat ? plat.x + margin : sp.x - 40;
      const maxX = plat ? plat.x + plat.w - margin : sp.x + 40;
      const stats = this.getArchetypeStats(sp.archetype);

      this.actors.push({
        id: `enemy_${this.nextId++}`,
        isPlayer: false,
        archetype: sp.archetype,
        x: sp.x,
        y: sp.y,
        vx: 0,
        vy: 0,
        facing: -1,
        hp: stats.hp,
        maxHp: stats.hp,
        platformId: sp.platformId,
        patrolMinX: Math.min(sp.x, minX),
        patrolMaxX: Math.max(sp.x, maxX),
        patrolDir: idx % 2 === 0 ? -1 : 1,
        patrolSpeed: stats.patrolSpeed,
        state: 'recover',
        stateTimer: initialDelayBase + idx * initialDelayStep,
        aimDuration: stats.aimDuration,
        aimAngle: Math.PI + 0.35,
        aimPower: 0.85,
        aimSpeed: stats.baseSpeed,
        hasToken: false,
        shieldActive: sp.archetype === 'shield' || sp.archetype === 'boss',
        flashTimer: 0,
        squashX: 1,
        squashY: 1,
        hatLost: false,
        walkPhase: idx * 1.1,
      });
    });
  }

  private getArchetypeStats(arch: EnemyArchetype): {
    hp: number;
    aimDuration: number;
    patrolSpeed: number;
    baseSpeed: number;
  } {
    const hardness = this.getHardnessLevel();
    const hpScale = 1 + Math.max(0, hardness - 1) * 0.055;
    const aimScale = Math.max(0.62, 1 - Math.max(0, hardness - 1) * 0.032);
    const speedBonus = Math.min(18, Math.max(0, hardness - 1) * 1.4);

    switch (arch) {
      case 'scout':
        return {
          hp: Math.round(70 * hpScale),
          aimDuration: 0.95 * aimScale,
          patrolSpeed: 34 + speedBonus,
          baseSpeed: 980,
        };
      case 'sniper':
        return {
          hp: Math.round(62 * hpScale),
          aimDuration: 1.35 * aimScale,
          patrolSpeed: hardness >= 7 ? 14 : 0,
          baseSpeed: 1140,
        };
      case 'shield':
        return {
          hp: Math.round(115 * hpScale),
          aimDuration: 1.15 * aimScale,
          patrolSpeed: 24 + speedBonus * 0.6,
          baseSpeed: 980,
        };
      case 'bombardier':
        return {
          hp: Math.round(92 * hpScale),
          aimDuration: 1.3 * aimScale,
          patrolSpeed: 20 + speedBonus * 0.5,
          baseSpeed: 860,
        };
      case 'boss':
        return {
          hp: Math.round(280 * (1 + Math.max(0, hardness - 6) * 0.06)),
          aimDuration: 1.05 * aimScale,
          patrolSpeed: 28 + speedBonus * 0.6,
          baseSpeed: 1060,
        };
    }
  }

  private update(dt: number): void {
    this.time += dt;

    // Wind oscillates naturally
    this.wind = this.windBase + Math.sin(this.time * 0.9) * this.windGust;

    // Step dynamic biome weather overlay (leaves, rain, dust, spores, embers)
    stepWeatherPool(this.weatherPool, this.biome, this.wind, this.time, dt, this.platforms);

    if (this.gameState === 'title') {
      const player = this.actors.find((a) => a.isPlayer);
      if (player) {
        this.updateScarf(player, dt);
        player.aimAngle = Math.atan2(this.titleAimPos.y - (player.y - 52), this.titleAimPos.x - player.x);
      }
      this.stepParticles(dt);
      return;
    }

    if (this.gameState !== 'playing') {
      return;
    }

    // Real-time visual juice ticks even during hitstop
    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    for (const a of this.actors) {
      if (a.flashTimer > 0) a.flashTimer = Math.max(0, a.flashTimer - dt);
      a.squashX += (1 - a.squashX) * Math.min(1, dt * 14);
      a.squashY += (1 - a.squashY) * Math.min(1, dt * 14);
    }
    for (const pr of this.props) {
      if (pr.flashTimer > 0) pr.flashTimer = Math.max(0, pr.flashTimer - dt);
    }
    this.stepCallouts(dt);
    this.stepExplosions(dt);
    this.stepParticles(dt);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    this.elapsedRunSec += dt;

    // Keyboard bow charging
    this.updateKeyboardControls(dt);

    // Update moving platforms & riders
    this.updateMovingPlatforms(dt);

    // Update pendulums
    this.updateProps(dt);

    // Update player scarf & enemy AI
    this.updateActors(dt);

    // Step arrows & swept collisions
    this.updateArrows(dt);

    // Step ragdolls
    for (const rag of this.ragdolls) {
      stepRagdoll(rag, this.platforms, GRAVITY, dt);
    }

    // Check delayed defeat/victory transition
    if (this.pendingEndState) {
      this.endDelayTimer -= dt;
      if (this.endDelayTimer <= 0) {
        const target = this.pendingEndState;
        this.pendingEndState = null;
        this.finishRun(target === 'victory');
        return;
      }
    }

    // Wave progression
    const livingEnemies = this.actors.filter((a) => !a.isPlayer);
    const player = this.actors.find((a) => a.isPlayer);

    if (!this.pendingEndState && player && livingEnemies.length === 0) {
      this.waveClearTimer += dt;
      if (this.waveClearTimer >= 0.85) {
        this.waveClearTimer = 0;
        if (this.mode === 'campaign') {
          if (this.waveIndex + 1 < this.currentLevelDef.waves.length) {
            this.waveIndex++;
            this.ammo.triple += 1;
            const nextWave = this.currentLevelDef.waves[this.waveIndex];
            if (nextWave.roundBiome) {
              this.biome = nextWave.roundBiome;
            }
            if (nextWave.windBase !== undefined) {
              this.windBase = nextWave.windBase;
            }
            if (nextWave.windGust !== undefined) {
              this.windGust = nextWave.windGust;
            }
            this.wind = this.windBase + Math.sin(this.time * 0.9) * this.windGust;
            this.spawnWave(nextWave.enemies);
            const label = nextWave.roundLabel
              ? `WAVE ${this.waveIndex + 1} · ${nextWave.roundLabel.toUpperCase()}`
              : `WAVE ${this.waveIndex + 1}!`;
            this.addCallout(WORLD_WIDTH * 0.5, 210, label, '#FACC15', 1.25);
            this.pushHud(true);
          } else {
            this.pendingEndState = 'victory';
            this.endDelayTimer = 0.45;
          }
        } else {
          this.waveIndex++;
          this.ammo.triple += 1;
          if (this.waveIndex % 2 === 0) this.ammo.fire += 1;
          this.loadEndlessWave(this.waveIndex + 1);
          this.addCallout(WORLD_WIDTH * 0.5, 210, `WAVE ${this.waveIndex + 1}!`, '#FACC15', 1.25);
          this.pushHud(true);
        }
      }
    }

    if (this.time - this.lastHudPushTime > 0.12) {
      this.pushHud(false);
    }
  }

  private updateKeyboardControls(dt: number): void {
    const aimSpeed = 1.65;
    if (this.keysHeld.has('ArrowUp') || this.keysHeld.has('KeyW')) {
      this.kbAimAngle = clamp(this.kbAimAngle - aimSpeed * dt, -1.38, 0.45);
    }
    if (this.keysHeld.has('ArrowDown') || this.keysHeld.has('KeyS')) {
      this.kbAimAngle = clamp(this.kbAimAngle + aimSpeed * dt, -1.38, 0.45);
    }
    if (this.kbCharging) {
      this.kbPower = Math.min(1, this.kbPower + dt * 1.15);
    }
  }

  private updateMovingPlatforms(dt: number): void {
    for (const p of this.platforms) {
      if (!p.moveAxis || !p.moveRange || !p.moveSpeed) continue;
      const baseX = p.baseX ?? p.x;
      const baseY = p.baseY ?? p.y;
      const prevX = p.x;
      const prevY = p.y;
      const offset = Math.sin(this.time * p.moveSpeed + (p.movePhase || 0)) * p.moveRange;
      if (p.moveAxis === 'y') p.y = baseY + offset;
      else p.x = baseX + offset;

      const dx = p.x - prevX;
      const dy = p.y - prevY;
      for (const a of this.actors) {
        if (a.platformId === p.id) {
          a.x += dx;
          a.y += dy;
          a.patrolMinX += dx;
          a.patrolMaxX += dx;
        }
      }
      for (const pr of this.props) {
        if (!pr.destroyed && pr.platformId === p.id) {
          pr.x += dx;
          pr.y += dy;
        }
      }
    }
  }

  private updateProps(dt: number): void {
    for (const prop of this.props) {
      if (prop.destroyed || prop.kind !== 'pendulum') continue;
      if (!prop.ropeSevered) {
        const len = prop.ropeLength || 220;
        prop.angle = (prop.swingAngle || 0.55) * Math.sin(this.time * (prop.swingSpeed || 2) + (prop.phase || 0));
        prop.bobX = prop.x + Math.sin(prop.angle) * len;
        prop.bobY = prop.y + Math.cos(prop.angle) * len;
      } else {
        // Falling severed pendulum ball!
        prop.vy += GRAVITY * dt;
        prop.bobX += prop.vx * dt;
        prop.bobY += prop.vy * dt;
        prop.angle += 4 * dt;

        // Crush enemies underneath
        for (let i = this.actors.length - 1; i >= 0; i--) {
          const a = this.actors[i];
          if (a.isPlayer) continue;
          const dist = Math.hypot(a.x - prop.bobX, a.y - 36 - prop.bobY);
          if (dist < prop.bobRadius + 24) {
            this.damageActor(a, 160, 'torso', prop.vx * 0.4, 240, false);
          }
        }

        // Hit platform or fall off bottom
        for (const plat of this.platforms) {
          if (
            prop.bobX > plat.x &&
            prop.bobX < plat.x + plat.w &&
            prop.bobY + prop.bobRadius >= plat.y &&
            prop.bobY - prop.bobRadius <= plat.y + 30
          ) {
            this.sound.playThud(true);
            this.trauma = Math.min(1, this.trauma + 0.35);
            this.spawnBurst(prop.bobX, plat.y, 12, '#94A3B8', 'circle', 240);
            prop.destroyed = true;
            break;
          }
        }
        if (prop.bobY > WORLD_HEIGHT + 120) prop.destroyed = true;
      }
    }
  }

  private updateActors(dt: number): void {
    const player = this.actors.find((a) => a.isPlayer);
    if (!player) return;

    this.updateScarf(player, dt);

    // Count active attack tokens — ramp concurrent pressure with stage/wave hardness
    let activeTokens = this.actors.filter((a) => !a.isPlayer && a.hasToken).length;
    const hardness = this.getHardnessLevel();
    const maxConcurrentAttackers =
      this.mode === 'endless'
        ? Math.min(4, 2 + Math.floor(this.waveIndex / 2))
        : this.currentLevelDef.id >= 10
          ? 4
          : this.currentLevelDef.id >= 4
            ? 3
            : 2;
    const recoverScale = Math.max(0.55, 1 - Math.max(0, hardness - 1) * 0.038);

    for (const enemy of this.actors) {
      if (enemy.isPlayer) continue;

      enemy.facing = player.x < enemy.x ? -1 : 1;

      // Patrol movement when recovering/idle
      if (enemy.patrolSpeed > 0 && enemy.state !== 'aiming') {
        enemy.x += enemy.patrolDir * enemy.patrolSpeed * dt;
        enemy.walkPhase += enemy.patrolSpeed * dt * 0.16;
        if (enemy.x <= enemy.patrolMinX) {
          enemy.x = enemy.patrolMinX;
          enemy.patrolDir = 1;
        } else if (enemy.x >= enemy.patrolMaxX) {
          enemy.x = enemy.patrolMaxX;
          enemy.patrolDir = -1;
        }
      }

      enemy.stateTimer -= dt;

      if (enemy.state === 'recover') {
        if (enemy.archetype === 'shield' || enemy.archetype === 'boss') {
          enemy.shieldActive = true;
        }
        if (enemy.stateTimer <= 0 && activeTokens < maxConcurrentAttackers) {
          enemy.state = 'aiming';
          enemy.hasToken = true;
          activeTokens++;
          enemy.stateTimer = enemy.aimDuration;
          if (enemy.archetype === 'shield') {
            enemy.shieldActive = false;
          }
          const sol = this.solveEnemyAim(enemy, player);
          enemy.aimAngle = sol.angle;
          enemy.aimSpeed = sol.speed;
        }
      } else if (enemy.state === 'aiming') {
        // Track target smoothly during early/mid windup
        if (enemy.stateTimer > enemy.aimDuration * 0.25) {
          const sol = this.solveEnemyAim(enemy, player);
          enemy.aimAngle = sol.angle;
          enemy.aimSpeed = sol.speed;
        }
        if (enemy.stateTimer <= 0) {
          this.fireEnemyProjectile(enemy);
          enemy.hasToken = false;
          enemy.state = 'recover';
          const baseRecover =
            enemy.archetype === 'boss'
              ? 0.95
              : enemy.archetype === 'sniper'
                ? 1.75
                : 1.25 + Math.random() * 0.65;
          enemy.stateTimer = baseRecover * recoverScale;
          if (enemy.archetype === 'shield' || enemy.archetype === 'boss') {
            enemy.shieldActive = true;
          }
        }
      }
    }
  }

  private updateScarf(player: Actor, dt: number): void {
    if (!player.scarfNodes || player.scarfNodes.length === 0) return;
    player.scarfNodes[0].x = player.x - 2;
    player.scarfNodes[0].y = player.y - 52;
    for (let i = 1; i < player.scarfNodes.length; i++) {
      const prev = player.scarfNodes[i - 1];
      const curr = player.scarfNodes[i];
      const breeze = (this.wind * 0.6 - 55) + Math.sin(this.time * 7 + i * 0.9) * 28;
      curr.x += breeze * dt;
      curr.y += (18 + Math.cos(this.time * 6 + i) * 22) * dt;
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      const segLen = 7.5;
      curr.x = prev.x + (dx / d) * segLen;
      curr.y = prev.y + (dy / d) * segLen;
    }
  }

  private solveEnemyAim(enemy: Actor, player: Actor): { angle: number; speed: number } {
    const sx = enemy.x;
    const sy = enemy.y - 52;
    const tx = player.x;
    const ty = player.y - 44;

    const baseSpeed =
      enemy.archetype === 'sniper'
        ? 1140
        : enemy.archetype === 'bombardier'
          ? 860
          : enemy.archetype === 'boss'
            ? 1060
            : 980;
    const highArc = enemy.archetype === 'bombardier';
    const isBomb = enemy.archetype === 'bombardier';

    // Tight, lethal accuracy that sharpens even further at higher stages/waves
    const hardness = this.getHardnessLevel();
    const maxSpread = Math.max(0.005, 0.024 - Math.max(0, hardness - 1) * 0.0018);
    const jitterScale =
      enemy.archetype === 'sniper'
        ? 0.55
        : enemy.archetype === 'boss'
          ? 0.45
          : 1.0;
    const jitter = (Math.random() - 0.5) * maxSpread * jitterScale;

    return solveBallisticAimAngle(
      sx,
      sy,
      tx,
      ty,
      baseSpeed,
      this.wind,
      GRAVITY,
      highArc,
      jitter,
      this.platforms,
      isBomb,
    );
  }

  private fireEnemyProjectile(enemy: Actor): void {
    const sx = enemy.x + Math.cos(enemy.aimAngle) * 20;
    const sy = enemy.y - 52 + Math.sin(enemy.aimAngle) * 20;
    this.sound.playBowRelease(0.7);
    enemy.squashX = 0.88;
    enemy.squashY = 1.12;

    if (enemy.archetype === 'bombardier') {
      const speed = enemy.aimSpeed ?? 860;
      this.spawnArrow(
        sx,
        sy,
        Math.cos(enemy.aimAngle) * speed,
        Math.sin(enemy.aimAngle) * speed,
        false,
        'fire',
        true,
        1,
      );
      return;
    }

    const defaultSpeed =
      enemy.archetype === 'sniper'
        ? 1140
        : enemy.archetype === 'boss'
          ? 1060
          : 980;
    const speed = enemy.aimSpeed ?? defaultSpeed;
    const count = enemy.archetype === 'boss' ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const spread = count === 2 ? (i === 0 ? -0.028 : 0.028) : 0;
      const a = enemy.aimAngle + spread;
      this.spawnArrow(sx, sy, Math.cos(a) * speed, Math.sin(a) * speed, false, 'standard', false, 1);
    }
  }

  private firePlayerBow(angle: number, power: number): void {
    const player = this.actors.find((a) => a.isPlayer);
    if (!player || this.gameState !== 'playing') return;

    let type = this.selectedArrow;
    if (type === 'triple') {
      if (this.ammo.triple <= 0) type = 'standard';
      else this.ammo.triple--;
    } else if (type === 'fire') {
      if (this.ammo.fire <= 0) type = 'standard';
      else this.ammo.fire--;
    }
    if (this.selectedArrow === 'triple' && this.ammo.triple === 0) {
      this.selectedArrow = 'standard';
    }
    if (this.selectedArrow === 'fire' && this.ammo.fire === 0) {
      this.selectedArrow = 'standard';
    }

    const speed = power * MAX_LAUNCH_SPEED * this.combatStats.bowSpeedMult;
    const sx = player.x + Math.cos(angle) * 24;
    const sy = player.y - 52 + Math.sin(angle) * 24;

    if (type === 'triple') {
      const offsets = [-0.09, 0, 0.09];
      for (const off of offsets) {
        const a = angle + off;
        this.spawnArrow(
          sx,
          sy,
          Math.cos(a) * speed,
          Math.sin(a) * speed,
          true,
          'triple',
          false,
          this.combatStats.tripleDamage,
        );
      }
    } else {
      const dmg = type === 'fire' ? this.combatStats.fireDamage : this.combatStats.standardDamage;
      this.spawnArrow(sx, sy, Math.cos(angle) * speed, Math.sin(angle) * speed, true, type, false, dmg);
    }

    this.shotsFired++;
    player.squashX = 1.15;
    player.squashY = 0.86;
    this.sound.playBowRelease(power);
    this.spawnBurst(sx, sy, 4, '#FFFDF7', 'circle', 90);
    this.pushHud(true);
  }

  private spawnArrow(
    x: number,
    y: number,
    vx: number,
    vy: number,
    fromPlayer: boolean,
    type: ArrowType,
    isBomb: boolean,
    damage: number,
  ): void {
    this.arrows.push({
      id: `arr_${this.nextId++}`,
      x,
      y,
      prevX: x,
      prevY: y,
      vx,
      vy,
      angle: Math.atan2(vy, vx),
      fromPlayer,
      type,
      isBomb,
      damage,
      bouncesLeft: type === 'standard' && !isBomb ? (fromPlayer ? this.combatStats.standardBounces : 2) : 0,
      age: 0,
      active: true,
      trail: [{ x, y }],
    });
  }

  private updateArrows(dt: number): void {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      if (!arrow.active) {
        this.arrows.splice(i, 1);
        continue;
      }

      const effectiveWind = arrow.fromPlayer
        ? this.wind * (1 - this.combatStats.windResistance)
        : this.wind;
      stepArrowPhysics(arrow, effectiveWind, GRAVITY, dt);
      arrow.trail.push({ x: arrow.x, y: arrow.y });
      if (arrow.trail.length > 15) arrow.trail.shift();

      if (arrow.type === 'fire' && Math.random() < 0.65) {
        this.spawnParticle({
          x: arrow.x,
          y: arrow.y,
          vx: -arrow.vx * 0.08 + (Math.random() - 0.5) * 35,
          vy: -arrow.vy * 0.08 - 25,
          size: 3.5,
          color: Math.random() < 0.5 ? '#F97316' : '#FACC15',
          life: 0.25,
          gravity: -40,
          kind: 'circle',
        });
      }

      // Check out of bounds
      if (arrow.x < -160 || arrow.x > WORLD_WIDTH + 160 || arrow.y > WORLD_HEIGHT + 140) {
        arrow.active = false;
        if (arrow.fromPlayer) this.combo = 0;
        continue;
      }

      // 1. Mid-air bomb shootdown!
      if (arrow.fromPlayer && !arrow.isBomb) {
        let hitBomb = false;
        for (const other of this.arrows) {
          if (other.active && other.isBomb) {
            const bHit = segmentCircleIntersect(arrow.prevX, arrow.prevY, arrow.x, arrow.y, other.x, other.y, 16);
            if (bHit) {
              other.active = false;
              arrow.active = false;
              this.triggerExplosion(bHit.hitX, bHit.hitY, 95, 70);
              this.addCallout(bHit.hitX, bHit.hitY - 24, 'INTERCEPT!', '#38BDF8', 1.15);
              hitBomb = true;
              break;
            }
          }
        }
        if (hitBomb) continue;
      }

      // 2. Check actors
      let consumed = false;
      for (const actor of this.actors) {
        if (actor.isPlayer === arrow.fromPlayer) continue;
        const hit = evaluateHitZone(arrow, actor);
        if (hit.zone === 'none') continue;

        if (hit.zone === 'shield') {
          if (arrow.type === 'fire') {
            // Fire arrow blasts through shield!
            this.triggerExplosion(hit.hitX, hit.hitY, 55, 42);
            arrow.active = false;
            consumed = true;
            break;
          }
          // Shield ricochet!
          this.sound.playThud(true);
          this.spawnBurst(hit.hitX, hit.hitY, 8, '#FDE047', 'spark', 220);
          this.addCallout(hit.hitX, hit.hitY - 24, 'BLOCKED!', '#94A3B8', 0.95);
          const refl = reflectVelocity(arrow.vx, arrow.vy, -actor.facing, -0.25, 0.55);
          arrow.vx = refl.x;
          arrow.vy = refl.y;
          arrow.x = hit.hitX - actor.facing * 5;
          arrow.y = hit.hitY;
          arrow.fromPlayer = false;
          if (arrow.isBomb) {
            this.triggerExplosion(hit.hitX, hit.hitY, 75, 1);
            arrow.active = false;
          }
          consumed = true;
          break;
        }

        // Direct actor hit!
        if (arrow.isBomb) {
          this.triggerExplosion(hit.hitX, hit.hitY, 82, 1);
          arrow.active = false;
          consumed = true;
          break;
        }

        if (arrow.fromPlayer) {
          this.shotsHit++;
          if (hit.isCrit) this.headshots++;
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
        }

        const critBonusMult = hit.isCrit && arrow.fromPlayer ? this.combatStats.critMultBonus : 0;
        const finalDmg = arrow.fromPlayer
          ? Math.round(arrow.damage * (hit.damageMultiplier + critBonusMult))
          : 1;
        this.damageActor(actor, finalDmg, hit.zone, arrow.vx, arrow.vy, arrow.fromPlayer);
        if (arrow.type === 'fire') {
          this.triggerExplosion(hit.hitX, hit.hitY, this.combatStats.fireRadius, 25);
        }
        if (arrow.fromPlayer) {
          this.checkDailyMissions(false);
        }
        arrow.active = false;
        consumed = true;
        break;
      }
      if (consumed) continue;

      // 3. Check props (barrels, crates, pendulums)
      for (const prop of this.props) {
        if (prop.destroyed) continue;
        if (prop.kind === 'pendulum') {
          // Check rope anchor weakpoint
          if (!prop.ropeSevered) {
            const anchorHit = segmentCircleIntersect(arrow.prevX, arrow.prevY, arrow.x, arrow.y, prop.x, prop.y + 8, 12);
            if (anchorHit) {
              prop.ropeSevered = true;
              prop.vx = Math.cos(prop.angle) * 140;
              prop.vy = 20;
              arrow.active = false;
              this.sound.playThud(true);
              this.spawnBurst(anchorHit.hitX, anchorHit.hitY, 10, '#FACC15', 'spark', 210);
              this.addCallout(anchorHit.hitX, anchorHit.hitY - 18, 'SEVERED!', '#FACC15', 1.15);
              consumed = true;
              break;
            }
          }
          // Check heavy iron ball collision
          const bobHit = segmentCircleIntersect(
            arrow.prevX,
            arrow.prevY,
            arrow.x,
            arrow.y,
            prop.bobX,
            prop.bobY,
            prop.bobRadius,
          );
          if (bobHit) {
            this.sound.playThud(true);
            this.spawnBurst(bobHit.hitX, bobHit.hitY, 8, '#CBD5E1', 'spark', 190);
            const nx = (bobHit.hitX - prop.bobX) / (prop.bobRadius || 1);
            const ny = (bobHit.hitY - prop.bobY) / (prop.bobRadius || 1);
            const refl = reflectVelocity(arrow.vx, arrow.vy, nx, ny, 0.72);
            arrow.vx = refl.x;
            arrow.vy = refl.y;
            arrow.x = bobHit.hitX + nx * 3;
            arrow.y = bobHit.hitY + ny * 3;
            consumed = true;
            break;
          }
        } else {
          const rectHit = segmentRectIntersect(arrow.prevX, arrow.prevY, arrow.x, arrow.y, prop.x, prop.y, prop.w, prop.h);
          if (rectHit) {
            arrow.active = false;
            this.damageProp(prop, arrow.type === 'fire' ? 60 : arrow.damage, rectHit.hitX, rectHit.hitY);
            consumed = true;
            break;
          }
        }
      }
      if (consumed) continue;

      // 4. Check platforms & ricochet stone/iron surfaces
      for (const plat of this.platforms) {
        const platHit = segmentRectIntersect(arrow.prevX, arrow.prevY, arrow.x, arrow.y, plat.x, plat.y, plat.w, plat.h);
        if (!platHit) continue;

        if (arrow.isBomb) {
          this.triggerExplosion(platHit.hitX, platHit.hitY, 80, 1);
          arrow.active = false;
          break;
        }

        if (plat.ricochet && arrow.bouncesLeft > 0) {
          arrow.bouncesLeft--;
          const refl = reflectVelocity(arrow.vx, arrow.vy, platHit.nx, platHit.ny, 0.8);
          arrow.vx = refl.x;
          arrow.vy = refl.y;
          arrow.x = platHit.hitX + platHit.nx * 3;
          arrow.y = platHit.hitY + platHit.ny * 3;
          arrow.angle = Math.atan2(arrow.vy, arrow.vx);
          this.sound.playThud(true);
          this.spawnBurst(platHit.hitX, platHit.hitY, 6, '#E2E8F0', 'spark', 160);
          break;
        }

        // Stick arrow into grass/wood/stone
        this.sound.playThud(plat.material === 'iron' || plat.material === 'stone');
        this.spawnBurst(
          platHit.hitX,
          platHit.hitY,
          5,
          plat.material === 'grass' ? '#65A30D' : plat.material === 'wood' ? '#D97706' : '#94A3B8',
          'circle',
          110,
        );
        if (arrow.type === 'fire') {
          this.triggerExplosion(platHit.hitX, platHit.hitY, Math.max(50, this.combatStats.fireRadius - 5), 20);
        } else {
          this.stuckArrows.push({
            relX: platHit.hitX - plat.x,
            relY: platHit.hitY - plat.y,
            angle: arrow.angle,
            type: arrow.type,
            targetType: 'platform',
            targetId: plat.id,
          });
          if (this.stuckArrows.length > 35) this.stuckArrows.shift();
        }
        if (arrow.fromPlayer) this.combo = 0;
        arrow.active = false;
        break;
      }
    }
  }

  private damageActor(
    actor: Actor,
    damage: number,
    zone: 'head' | 'torso' | 'limb' | 'shield' | 'none',
    vx: number,
    vy: number,
    scoredByPlayer: boolean,
  ): void {
    actor.hp = Math.max(0, actor.hp - damage);
    actor.flashTimer = 0.065;
    actor.squashX = 1.24;
    actor.squashY = 0.78;

    const isHeadshot = zone === 'head';
    const isKill = actor.hp <= 0;

    if (actor.isPlayer) {
      this.sound.playHurt();
      this.trauma = Math.min(1, this.trauma + 0.45);
      this.hitstopTimer = 0.04;
      this.spawnBurst(actor.x, actor.y - 45, 10, '#EF4444', 'circle', 200);
      this.addCallout(actor.x, actor.y - 86, '-1 HP', '#EF4444', 1.15);
      if (isKill) {
        this.spawnRagdollFromActor(actor, vx, vy, zone);
        this.actors = this.actors.filter((a) => a.id !== actor.id);
        this.pendingEndState = 'gameover';
        this.endDelayTimer = 0.65;
      }
      this.pushHud(true);
      return;
    }

    // Enemy hit
    this.sound.playHit(isHeadshot);
    this.spawnBurst(
      actor.x,
      actor.y - (isHeadshot ? 66 : 42),
      isHeadshot ? 18 : 10,
      isHeadshot ? '#FACC15' : '#EF4444',
      isHeadshot ? 'starburst' : 'circle',
      isHeadshot ? 260 : 180,
    );

    if (isHeadshot) {
      actor.hatLost = true;
      this.hitstopTimer = 0.055;
      this.trauma = Math.min(1, this.trauma + 0.4);
    } else if (isKill) {
      this.hitstopTimer = 0.035;
      this.trauma = Math.min(1, this.trauma + 0.25);
    }

    if (scoredByPlayer) {
      const pts = Math.round(calculateHitScore(zone, this.combo, isKill) * this.scoreMultiplier);
      this.score += pts;
      const label = isHeadshot ? `HEADSHOT! +${pts}` : `+${pts}`;
      this.addCallout(actor.x, actor.y - 96, label, isHeadshot ? '#FACC15' : '#FFFDF7', isHeadshot ? 1.28 : 1.0);
    }

    if (isKill) {
      this.kills++;
      this.spawnRagdollFromActor(actor, vx, vy, zone);
      this.actors = this.actors.filter((a) => a.id !== actor.id);
    }
    this.pushHud(true);
  }

  private checkDailyMissions(stageCleared: boolean): void {
    const res = evaluateDailyMissionProgress(this.dailyMissions, {
      kills: this.kills,
      headshots: this.headshots,
      maxCombo: this.maxCombo,
      shotsHit: this.shotsHit,
      stageCleared,
    });
    const prevMissions = this.dailyMissions.missions;
    const nextMissions = res.updated.missions;
    const progressChanged = nextMissions.some(
      (m, idx) => m.progress !== prevMissions[idx]?.progress || m.completed !== prevMissions[idx]?.completed,
    );
    if (!progressChanged) return;

    this.dailyMissions = res.updated;
    if (res.newlyCompleted.length > 0) {
      for (const m of res.newlyCompleted) {
        if (m.rewardKind === 'arrows' && m.rewardArrows) {
          this.ammo.triple += m.rewardArrows.triple || 0;
          this.ammo.fire += m.rewardArrows.fire || 0;
        }
        this.addCallout(
          WORLD_WIDTH * 0.5,
          170,
          `MISSION: ${m.rewardLabel.toUpperCase()}`,
          '#38BDF8',
          1.15,
        );
      }
      this.scoreMultiplier = getActiveScoreMultiplier(this.dailyMissions);
      this.sound.playMissionComplete();
    }
    this.callbacks.onDailyMissionsUpdate?.(this.dailyMissions);
    this.pushHud(true);
  }

  private spawnRagdollFromActor(
    actor: Actor,
    vx: number,
    vy: number,
    zone: 'head' | 'torso' | 'limb' | 'shield' | 'none',
  ): void {
    const rag = createRagdoll(
      `rag_${actor.id}`,
      actor.x,
      actor.y,
      actor.facing,
      actor.isPlayer,
      actor.archetype,
      vx * 0.45,
      vy * 0.45,
      zone,
      actor.hatLost || zone === 'head',
    );
    this.ragdolls.push(rag);
    if (this.ragdolls.length > 10) this.ragdolls.shift();
  }

  private damageProp(prop: ActiveProp, dmg: number, hitX: number, hitY: number): void {
    prop.hp -= dmg;
    prop.flashTimer = 0.06;
    if (prop.kind === 'barrel' || prop.hp <= 0) {
      prop.destroyed = true;
      if (prop.kind === 'barrel') {
        this.triggerExplosion(prop.x + prop.w * 0.5, prop.y + prop.h * 0.5, 140, 105);
      } else {
        this.sound.playThud(false);
        this.spawnBurst(hitX, hitY, 14, '#D97706', 'splinter', 240);
        if (prop.kind === 'supply_crate') {
          const player = this.actors.find((a) => a.isPlayer);
          if (player && player.hp < player.maxHp) {
            player.hp++;
          }
          this.ammo.triple += 2;
          this.ammo.fire += 1;
          this.addCallout(prop.x + prop.w * 0.5, prop.y - 12, '+SUPPLY QUIVER!', '#4ADE80', 1.15);
          this.pushHud(true);
        }
      }
    } else {
      this.sound.playThud(false);
      this.spawnBurst(hitX, hitY, 6, '#D97706', 'splinter', 150);
    }
  }

  private triggerExplosion(cx: number, cy: number, radius: number, maxDmg: number): void {
    this.sound.playExplosion();
    this.hitstopTimer = 0.05;
    this.trauma = Math.min(1, this.trauma + 0.65);

    this.explosions.push({
      x: cx,
      y: cy,
      radius,
      life: 0.42,
      maxLife: 0.42,
    });
    this.spawnBurst(cx, cy, 24, '#F97316', 'circle', 340);
    this.spawnBurst(cx, cy, 12, '#FEF08A', 'starburst', 260);
    this.addCallout(cx, cy - 30, 'BOOM!', '#FB923C', 1.35);

    // Damage actors in blast radius
    for (let i = this.actors.length - 1; i >= 0; i--) {
      const a = this.actors[i];
      const dx = a.x - cx;
      const dy = a.y - 38 - cy;
      const dist = Math.hypot(dx, dy);
      if (dist <= radius) {
        const falloff = 1 - dist / (radius * 1.15);
        const dmg = a.isPlayer ? 1 : Math.round(maxDmg * falloff);
        const impulseX = (dx / (dist || 1)) * 520;
        const impulseY = -360;
        this.damageActor(a, dmg, 'none', impulseX, impulseY, !a.isPlayer);
      }
    }

    // Chain-react nearby barrels & crates
    for (const prop of this.props) {
      if (prop.destroyed || prop.kind === 'pendulum') continue;
      const px = prop.x + prop.w * 0.5;
      const py = prop.y + prop.h * 0.5;
      if (Math.hypot(px - cx, py - cy) <= radius) {
        this.damageProp(prop, 999, px, py);
      }
    }
  }

  private finishRun(won: boolean): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(STORAGE_KEY_BEST, String(this.bestScore));
      } catch {
        // ignore
      }
    }

    const player = this.actors.find((a) => a.isPlayer);
    const hpRatio = player ? player.hp / player.maxHp : 0;
    const accuracy = this.shotsFired > 0 ? this.shotsHit / this.shotsFired : 0;
    const stars = calculateStars(accuracy, hpRatio, won);

    if (won) {
      this.checkDailyMissions(true);
      this.sound.playVictory();
    } else {
      this.sound.playDefeat();
    }

    const summary: RunSummary = {
      won,
      mode: this.mode,
      levelId: this.currentLevelDef.id,
      levelName: this.mode === 'endless' ? 'Endless Arena' : this.currentLevelDef.name,
      waveReached: this.waveIndex + 1,
      totalWaves: this.mode === 'endless' ? this.waveIndex + 1 : this.currentLevelDef.waves.length,
      score: this.score,
      bestScore: this.bestScore,
      stars,
      accuracy,
      headshots: this.headshots,
      kills: this.kills,
      elapsedSec: Math.round(this.elapsedRunSec),
      hasNextLevel: this.mode === 'campaign' && this.currentLevelDef.id < CAMPAIGN_LEVELS.length,
    };

    this.callbacks.onLevelComplete?.(this.currentLevelDef.id, stars, this.score, this.mode, summary);
    this.setState(won ? 'victory' : 'gameover', summary);
    this.pushHud(true);
  }

  private spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    kind: Particle['kind'],
    speed: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.75) * speed;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 40,
        size: kind === 'starburst' ? 7 + Math.random() * 5 : 3 + Math.random() * 3.5,
        color,
        outline: kind !== 'leaf',
        life: 0.3 + Math.random() * 0.35,
        gravity: kind === 'starburst' ? 0 : 480,
        kind,
      });
    }
  }

  private spawnParticle(opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    outline?: boolean;
    life: number;
    gravity: number;
    kind: Particle['kind'];
  }): void {
    const pt = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
    pt.active = true;
    pt.x = opts.x;
    pt.y = opts.y;
    pt.vx = opts.vx;
    pt.vy = opts.vy;
    pt.size = opts.size;
    pt.color = opts.color;
    pt.outline = opts.outline;
    pt.life = opts.life;
    pt.maxLife = opts.life;
    pt.gravity = opts.gravity;
    pt.kind = opts.kind;
    pt.rot = Math.random() * Math.PI * 2;
    pt.vRot = (Math.random() - 0.5) * 9;
  }

  private stepParticles(dt: number): void {
    for (const pt of this.particles) {
      if (!pt.active) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        continue;
      }
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.rot += pt.vRot * dt;
    }
  }

  private addCallout(x: number, y: number, text: string, color: string, scale = 1): void {
    this.callouts.push({
      id: this.nextId++,
      x,
      y,
      vy: -44,
      text,
      color,
      scale,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  private stepCallouts(dt: number): void {
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      c.life -= dt;
      c.y += c.vy * dt;
      c.vy *= 0.95;
      if (c.life <= 0) this.callouts.splice(i, 1);
    }
  }

  private stepExplosions(dt: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      this.explosions[i].life -= dt;
      if (this.explosions[i].life <= 0) this.explosions.splice(i, 1);
    }
  }

  private pushHud(force: boolean): void {
    if (!force && this.time - this.lastHudPushTime < 0.1) return;
    this.lastHudPushTime = this.time;
    const player = this.actors.find((a) => a.isPlayer);
    const boss = this.actors.find((a) => a.archetype === 'boss');

    const nextMission = this.dailyMissions.missions.find((m) => !m.completed);

    this.callbacks.onHudUpdate({
      mode: this.mode,
      levelId: this.currentLevelDef.id,
      levelName: this.mode === 'endless' ? 'Endless Arena' : this.currentLevelDef.name,
      biome: this.biome,
      waveIndex: this.waveIndex,
      totalWaves: this.mode === 'endless' ? this.waveIndex + 1 : this.currentLevelDef.waves.length,
      hp: player ? player.hp : 0,
      maxHp: player ? player.maxHp : 5,
      score: this.score,
      bestScore: Math.max(this.bestScore, this.score),
      combo: this.combo,
      wind: Math.round(this.wind),
      selectedArrow: this.selectedArrow,
      ammo: { ...this.ammo },
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      headshots: this.headshots,
      kills: this.kills,
      elapsedSec: Math.floor(this.elapsedRunSec),
      muted: this.sound.isMuted(),
      bossHp: boss ? boss.hp : undefined,
      bossMaxHp: boss ? boss.maxHp : undefined,
      bossName: boss ? 'Crimson Warlord' : undefined,
      healerCharges: this.healerCharges,
      healerHealAmount: this.combatStats.healerHealAmount,
      canCoinHeal: this.coins >= 25,
      coins: this.coins,
      scoreMultiplier: this.scoreMultiplier,
      activeMissionText: nextMission
        ? `${nextMission.title} (${nextMission.progress}/${nextMission.target})`
        : undefined,
    });
  }

  private render(): void {
    // Compute active aim state (mouse drag OR keyboard charge)
    let aimState = {
      active: false,
      power: 0,
      angle: -0.35,
      trajectory: [] as Vec2[],
      dragStartWorld: null as Vec2 | null,
      dragCurrWorld: null as Vec2 | null,
    };

    const player = this.actors.find((a) => a.isPlayer);
    const playerWind = this.wind * (1 - this.combatStats.windResistance);
    const maxLaunch = MAX_LAUNCH_SPEED * this.combatStats.bowSpeedMult;
    if (this.gameState === 'playing' && player) {
      if (this.isDragging && this.dragStartWorld && this.dragCurrWorld) {
        const pullDx = this.dragStartWorld.x - this.dragCurrWorld.x;
        const pullDy = this.dragStartWorld.y - this.dragCurrWorld.y;
        const launch = computeLaunchVelocity(pullDx, pullDy, maxLaunch);
        if (launch.power > 0) {
          const sx = player.x + Math.cos(launch.angle) * 24;
          const sy = player.y - 52 + Math.sin(launch.angle) * 24;
          aimState = {
            active: true,
            power: launch.power,
            angle: launch.angle,
            trajectory: predictTrajectory(sx, sy, launch.vx, launch.vy, playerWind, GRAVITY, 12, 0.032),
            dragStartWorld: this.dragStartWorld,
            dragCurrWorld: this.dragCurrWorld,
          };
        }
      } else if (this.kbCharging) {
        const power = Math.max(0.25, this.kbPower);
        const speed = power * maxLaunch;
        const sx = player.x + Math.cos(this.kbAimAngle) * 24;
        const sy = player.y - 52 + Math.sin(this.kbAimAngle) * 24;
        aimState = {
          active: true,
          power,
          angle: this.kbAimAngle,
          trajectory: predictTrajectory(
            sx,
            sy,
            Math.cos(this.kbAimAngle) * speed,
            Math.sin(this.kbAimAngle) * speed,
            playerWind,
            GRAVITY,
            12,
            0.032,
          ),
          dragStartWorld: null,
          dragCurrWorld: null,
        };
      }
    }

    this.renderer3d.renderFrame({
      biome: this.biome,
      time: this.time,
      dt: this.lastDt,
      wind: this.wind,
      trauma: this.trauma,
      platforms: this.platforms,
      props: this.props,
      actors: this.actors,
      ragdolls: this.ragdolls,
      arrows: this.arrows,
      stuckArrows: this.stuckArrows,
      particles: this.particles,
      callouts: this.callouts,
      explosions: this.explosions,
      weatherPool: this.weatherPool,
      aimState,
      isTitleScreen: this.gameState === 'title',
    });
  }

  private screenToWorld(clientX: number, clientY: number): Vec2 {
    return this.renderer3d.screenToWorld2D(clientX, clientY);
  }

  private handleResize = (): void => {
    const rect = this.mountEl.getBoundingClientRect();
    this.cssW = Math.max(320, rect.width || window.innerWidth);
    this.cssH = Math.max(240, rect.height || window.innerHeight);
    this.renderer3d.resize(this.cssW, this.cssH);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.gameState !== 'playing') return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.pointerId = e.pointerId;
    this.isDragging = true;
    const pt = this.screenToWorld(e.clientX, e.clientY);
    this.dragStartWorld = pt;
    this.dragCurrWorld = pt;
    this.bowDrawSoundCooldown = 0;
  };

  private onPointerMove = (e: PointerEvent): void => {
    const pt = this.screenToWorld(e.clientX, e.clientY);
    if (this.gameState === 'title') {
      this.titleAimPos = pt;
      return;
    }
    if (!this.isDragging || (this.pointerId !== null && e.pointerId !== this.pointerId)) return;
    this.dragCurrWorld = pt;
    if (this.dragStartWorld && this.bowDrawSoundCooldown <= 0) {
      const dist = Math.hypot(this.dragStartWorld.x - pt.x, this.dragStartWorld.y - pt.y);
      if (dist > 28) {
        this.sound.playBowDraw();
        this.bowDrawSoundCooldown = 0.25;
      }
    } else {
      this.bowDrawSoundCooldown = Math.max(0, this.bowDrawSoundCooldown - 0.016);
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
    const endPt = this.screenToWorld(e.clientX, e.clientY);
    if (this.dragStartWorld) {
      const pullDx = this.dragStartWorld.x - endPt.x;
      const pullDy = this.dragStartWorld.y - endPt.y;
      const launch = computeLaunchVelocity(pullDx, pullDy);
      if (launch.power > 0) {
        this.firePlayerBow(launch.angle, launch.power);
      }
    }
    this.isDragging = false;
    this.dragStartWorld = null;
    this.dragCurrWorld = null;
    this.pointerId = null;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keysHeld.add(e.code);

    if (e.code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (this.gameState === 'playing') {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.togglePause();
        return;
      }
      if (e.code === 'KeyR') {
        e.preventDefault();
        this.restartLevel();
        return;
      }
      if (e.code === 'KeyH' && !e.repeat) {
        e.preventDefault();
        this.useHealer();
        return;
      }
      if (e.code === 'Digit1') this.selectArrowType('standard');
      if (e.code === 'Digit2') this.selectArrowType('triple');
      if (e.code === 'Digit3') this.selectArrowType('fire');

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.kbCharging = true;
        this.kbPower = 0.25;
        this.sound.playBowDraw();
      }
    } else if (this.gameState === 'paused') {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.togglePause();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
    if (e.code === 'Space' && this.kbCharging && this.gameState === 'playing') {
      this.firePlayerBow(this.kbAimAngle, Math.max(0.25, this.kbPower));
      this.kbCharging = false;
      this.kbPower = 0;
    }
  };

  private clearInputs = (): void => {
    this.keysHeld.clear();
    this.isDragging = false;
    this.dragStartWorld = null;
    this.dragCurrWorld = null;
    this.pointerId = null;
    this.kbCharging = false;
    this.kbPower = 0;
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearInputs();
    }
  };

  private bindEvents(): void {
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.mountEl);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearInputs);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.clearInputs);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearInputs);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.clearInputs);
  }
}
