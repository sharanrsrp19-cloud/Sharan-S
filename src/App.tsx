import { useCallback, useEffect, useRef, useState } from 'react';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { EquipmentModal } from './components/EquipmentModal';
import { GameHud } from './components/GameHud';
import { RunRewardSummary, StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { ArcheryEngine, RunSummary } from './game/engine';
import { CAMPAIGN_LEVELS } from './game/levels';
import {
  BowId,
  DEFAULT_EQUIPMENT,
  DailyMissionsState,
  calculateLevelCoinReward,
  createDailyMissions,
  getLocalDateKey,
  purchaseArrowUpgrade,
  purchaseBowAction,
} from './game/progression';
import { CameraPreset } from './game/three/ThreeSceneRenderer';
import { ArrowType, GameState, HudSnapshot, LevelProgress } from './game/types';

const PROGRESS_STORAGE_KEY = 'arrowfall_progress_v1';

function createDefaultProgress(): LevelProgress {
  return {
    unlockedLevel: 1,
    stars: {},
    bestScore: 0,
    endlessBest: 0,
    coins: 60,
    totalCoinsEarned: 0,
    levelsFinished: 0,
    claimedGifts: [],
    equipment: {
      ...DEFAULT_EQUIPMENT,
      ownedBows: [...DEFAULT_EQUIPMENT.ownedBows],
      bowLevels: { ...DEFAULT_EQUIPMENT.bowLevels },
      arrowLevels: { ...DEFAULT_EQUIPMENT.arrowLevels },
    },
    dailyMissions: createDailyMissions(),
  };
}

function saveProgress(updated: LevelProgress): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
}

function loadProgress(): LevelProgress {
  const defaults = createDefaultProgress();
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<LevelProgress>;
    const todayKey = getLocalDateKey();
    const dailyMissions =
      parsed.dailyMissions && parsed.dailyMissions.dateKey === todayKey
        ? parsed.dailyMissions
        : createDailyMissions(todayKey);

    const equipment = parsed.equipment
      ? {
          equippedBow: parsed.equipment.equippedBow || defaults.equipment.equippedBow,
          ownedBows: Array.isArray(parsed.equipment.ownedBows) && parsed.equipment.ownedBows.length > 0
            ? parsed.equipment.ownedBows
            : defaults.equipment.ownedBows,
          bowLevels: { ...defaults.equipment.bowLevels, ...(parsed.equipment.bowLevels || {}) },
          arrowLevels: { ...defaults.equipment.arrowLevels, ...(parsed.equipment.arrowLevels || {}) },
        }
      : defaults.equipment;

    return {
      unlockedLevel: Math.max(1, Math.min(CAMPAIGN_LEVELS.length, parsed.unlockedLevel || 1)),
      stars: parsed.stars || {},
      bestScore: parsed.bestScore || 0,
      endlessBest: parsed.endlessBest || 0,
      coins: typeof parsed.coins === 'number' ? parsed.coins : defaults.coins,
      totalCoinsEarned: typeof parsed.totalCoinsEarned === 'number' ? parsed.totalCoinsEarned : 0,
      levelsFinished: typeof parsed.levelsFinished === 'number' ? parsed.levelsFinished : 0,
      claimedGifts: Array.isArray(parsed.claimedGifts) ? parsed.claimedGifts : [],
      equipment,
      dailyMissions,
    };
  } catch {
    return defaults;
  }
}

const INITIAL_HUD: HudSnapshot = {
  mode: 'campaign',
  levelId: 1,
  levelName: 'Sunlit Meadow',
  biome: 'meadow',
  waveIndex: 0,
  totalWaves: 2,
  hp: 5,
  maxHp: 5,
  score: 0,
  bestScore: 0,
  combo: 0,
  wind: 0,
  selectedArrow: 'standard',
  ammo: { triple: 2, fire: 1 },
  shotsFired: 0,
  shotsHit: 0,
  headshots: 0,
  kills: 0,
  elapsedSec: 0,
  muted: false,
  healerCharges: 2,
  healerHealAmount: 2,
  canCoinHeal: true,
  coins: 60,
  scoreMultiplier: 1,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ArcheryEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [rewardSummary, setRewardSummary] = useState<RunRewardSummary | null>(null);
  const [progress, setProgress] = useState<LevelProgress>(loadProgress);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(() => loadProgress().unlockedLevel);
  const [muted, setMuted] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('side');
  const [activeTitleModal, setActiveTitleModal] = useState<'none' | 'equipment' | 'missions'>('none');

  const handleDailyMissionsUpdate = useCallback((nextMissions: DailyMissionsState) => {
    setProgress((prev) => {
      const updated: LevelProgress = {
        ...prev,
        dailyMissions: nextMissions,
      };
      saveProgress(updated);
      return updated;
    });
  }, []);

  const handleSpendCoins = useCallback((amount: number): boolean => {
    let spent = false;
    setProgress((prev) => {
      if (prev.coins < amount) return prev;
      spent = true;
      const updated: LevelProgress = {
        ...prev,
        coins: prev.coins - amount,
      };
      saveProgress(updated);
      return updated;
    });
    return spent;
  }, []);

  const handleLevelComplete = useCallback(
    (
      levelId: number,
      stars: number,
      score: number,
      mode: 'campaign' | 'endless',
      runSummary: RunSummary,
    ) => {
      setProgress((prev) => {
        const nextStars = { ...prev.stars };
        if (stars > (nextStars[levelId] || 0)) {
          nextStars[levelId] = stars;
        }
        const nextUnlocked =
          mode === 'campaign' && stars > 0
            ? Math.min(CAMPAIGN_LEVELS.length, Math.max(prev.unlockedLevel, levelId + 1))
            : prev.unlockedLevel;

        const isFirstClear = mode === 'campaign' && runSummary.won && !prev.claimedGifts.includes(levelId);
        const reward = calculateLevelCoinReward({
          levelId,
          mode,
          won: runSummary.won,
          stars,
          kills: runSummary.kills,
          headshots: runSummary.headshots,
          waveReached: runSummary.waveReached,
          isFirstClear,
          equipment: prev.equipment,
          prevTotalCoinsEarned: prev.totalCoinsEarned,
          prevLevelsFinished: prev.levelsFinished,
        });

        setRewardSummary({
          coinsEarned: reward.totalCoinsEarned,
          averageCoins: reward.averageCoins,
          gift: reward.gift,
        });

        const nextClaimedGifts = isFirstClear
          ? [...prev.claimedGifts, levelId]
          : prev.claimedGifts;

        const updated: LevelProgress = {
          ...prev,
          unlockedLevel: nextUnlocked,
          stars: nextStars,
          bestScore: Math.max(prev.bestScore, score),
          endlessBest: mode === 'endless' ? Math.max(prev.endlessBest, score) : prev.endlessBest,
          coins: prev.coins + reward.totalCoinsEarned,
          totalCoinsEarned: reward.nextTotalCoinsEarned,
          levelsFinished: reward.nextLevelsFinished,
          claimedGifts: nextClaimedGifts,
          equipment: reward.updatedEquipment,
        };
        saveProgress(updated);
        return updated;
      });
    },
    [],
  );

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const engine = new ArcheryEngine(
      mountEl,
      {
        onStateChange: (nextState, runSummary) => {
          setGameState(nextState);
          if (nextState !== 'title') {
            setActiveTitleModal('none');
          }
          if (runSummary) setSummary(runSummary);
        },
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
          setMuted(snapshot.muted);
        },
        onLevelComplete: handleLevelComplete,
        onDailyMissionsUpdate: handleDailyMissionsUpdate,
        onSpendCoins: handleSpendCoins,
      },
      false,
    );
    engineRef.current = engine;
    const initial = loadProgress();
    engine.setProgressionContext({
      equipment: initial.equipment,
      dailyMissions: initial.dailyMissions,
      coins: initial.coins,
    });
    engine.startLoop();

    // Support ?autostart=1 for instant gameplay boot
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const stageParam = parseInt(params.get('stage') || '1', 10);
      engine.startCampaignLevel(Number.isFinite(stageParam) ? stageParam : 1);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleDailyMissionsUpdate, handleLevelComplete, handleSpendCoins]);

  useEffect(() => {
    engineRef.current?.setProgressionContext({
      equipment: progress.equipment,
      dailyMissions: progress.dailyMissions,
      coins: progress.coins,
    });
  }, [progress.equipment, progress.dailyMissions, progress.coins]);

  const handleStartCampaign = useCallback((levelId: number) => {
    setRewardSummary(null);
    setActiveTitleModal('none');
    setSelectedLevelId(levelId);
    engineRef.current?.startCampaignLevel(levelId);
  }, []);

  const handleStartEndless = useCallback(() => {
    setRewardSummary(null);
    setActiveTitleModal('none');
    engineRef.current?.startEndless();
  }, []);

  const handleSelectArrow = useCallback((type: ArrowType) => {
    engineRef.current?.selectArrowType(type);
  }, []);

  const handleUseHealer = useCallback(() => {
    engineRef.current?.useHealer();
  }, []);

  const handleToggleMute = useCallback(() => {
    const m = engineRef.current?.toggleMute();
    if (typeof m === 'boolean') setMuted(m);
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleRestart = useCallback(() => {
    setRewardSummary(null);
    engineRef.current?.restartLevel();
  }, []);

  const handleNextLevel = useCallback((nextId: number) => {
    setRewardSummary(null);
    setSelectedLevelId(nextId);
    engineRef.current?.startCampaignLevel(nextId);
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setRewardSummary(null);
    engineRef.current?.returnToTitle();
  }, []);

  const handleEquipBow = useCallback((bowId: BowId) => {
    setProgress((prev) => {
      if (!prev.equipment.ownedBows.includes(bowId)) return prev;
      const updated: LevelProgress = {
        ...prev,
        equipment: {
          ...prev.equipment,
          equippedBow: bowId,
        },
      };
      saveProgress(updated);
      return updated;
    });
  }, []);

  const handleBowAction = useCallback((bowId: BowId) => {
    setProgress((prev) => {
      const res = purchaseBowAction(prev.coins, prev.equipment, bowId);
      if (!res.ok) return prev;
      const updated: LevelProgress = {
        ...prev,
        coins: res.coins,
        equipment: res.equipment,
      };
      saveProgress(updated);
      return updated;
    });
  }, []);

  const handleUpgradeArrow = useCallback((arrowType: ArrowType) => {
    setProgress((prev) => {
      const res = purchaseArrowUpgrade(prev.coins, prev.equipment, arrowType);
      if (!res.ok) return prev;
      const updated: LevelProgress = {
        ...prev,
        coins: res.coins,
        equipment: res.equipment,
      };
      saveProgress(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    const order: CameraPreset[] = ['side', 'cinematic', 'follow'];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'KeyC' && !e.repeat) {
        setCameraPreset((prev) => {
          const next = order[(order.indexOf(prev) + 1) % order.length];
          engineRef.current?.setCameraPreset(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const averageCoins =
    progress.levelsFinished > 0
      ? Math.round(progress.totalCoinsEarned / progress.levelsFinished)
      : 0;

  return (
    <main className="relative w-full h-full overflow-hidden" data-camera={cameraPreset} data-elapsed={hud.elapsedSec}>
      {/* Isolated WebGL Mount — never unmounted or recreated on HUD updates */}
      <div
        ref={mountRef}
        className="w-full h-full relative"
      />

      {gameState === 'title' && (
        <TitleOverlay
          progress={progress}
          selectedLevelId={selectedLevelId}
          muted={muted}
          modalOpen={activeTitleModal !== 'none'}
          onSelectLevel={setSelectedLevelId}
          onStartCampaign={handleStartCampaign}
          onStartEndless={handleStartEndless}
          onToggleMute={handleToggleMute}
          onOpenEquipment={() => setActiveTitleModal('equipment')}
          onOpenMissions={() => setActiveTitleModal('missions')}
        />
      )}

      {gameState === 'title' && (
        <EquipmentModal
          open={activeTitleModal === 'equipment'}
          coins={progress.coins}
          averageCoins={averageCoins}
          equipment={progress.equipment}
          onClose={() => setActiveTitleModal('none')}
          onEquipBow={handleEquipBow}
          onBowAction={handleBowAction}
          onUpgradeArrow={handleUpgradeArrow}
        />
      )}

      {gameState === 'title' && (
        <DailyMissionsModal
          open={activeTitleModal === 'missions'}
          dailyMissions={progress.dailyMissions}
          onClose={() => setActiveTitleModal('none')}
        />
      )}

      {gameState === 'playing' && (
        <GameHud
          hud={hud}
          onSelectArrow={handleSelectArrow}
          onUseHealer={handleUseHealer}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
        />
      )}

      <StatusModal
        gameState={gameState}
        summary={summary}
        rewardSummary={rewardSummary}
        onResume={handleTogglePause}
        onRestart={handleRestart}
        onNextLevel={handleNextLevel}
        onTitle={handleReturnToTitle}
      />
    </main>
  );
}
