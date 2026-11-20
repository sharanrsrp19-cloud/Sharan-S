import React from 'react';
import { ArrowRight, Coins, Gift, Home, Play, RotateCcw, Star } from 'lucide-react';
import { RunSummary } from '../game/engine';
import { ResolvedGift } from '../game/progression';
import { GameState } from '../game/types';

export interface RunRewardSummary {
  coinsEarned: number;
  averageCoins: number;
  gift: ResolvedGift;
}

interface StatusModalProps {
  gameState: GameState;
  summary: RunSummary | null;
  rewardSummary: RunRewardSummary | null;
  onResume: () => void;
  onRestart: () => void;
  onNextLevel: (nextLevelId: number) => void;
  onTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  gameState,
  summary,
  rewardSummary,
  onResume,
  onRestart,
  onNextLevel,
  onTitle,
}) => {
  if (gameState !== 'paused' && gameState !== 'victory' && gameState !== 'gameover') {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#090A0D]/70"
      role="dialog"
      aria-modal="true"
    >
      <div className="cartoon-panel rounded-3xl w-full max-w-md p-6 sm:p-7 flex flex-col items-center text-center">
        {gameState === 'paused' && (
          <>
            <h2 className="font-display font-bold text-3xl text-[#FFFDF7] mb-1">
              Game Paused
            </h2>
            <p className="text-sm font-medium text-[#94A3B8] mb-6">
              Take a breath before your next shot.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                onClick={onResume}
                className="cartoon-btn-primary w-full py-3 rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="cartoon-btn-secondary w-full py-2.5 rounded-xl font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Stage</span>
              </button>
              <button
                type="button"
                onClick={onTitle}
                className="cartoon-btn-secondary w-full py-2.5 rounded-xl font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Title Screen</span>
              </button>
            </div>
          </>
        )}

        {gameState === 'victory' && summary && (
          <>
            <div className="flex items-center gap-2 mb-2.5">
              {[1, 2, 3].map((sIdx) => (
                <Star
                  key={sIdx}
                  className={`w-9 h-9 ${
                    sIdx <= summary.stars
                      ? 'text-[#FACC15] fill-[#FACC15]'
                      : 'text-[#334155]'
                  }`}
                />
              ))}
            </div>
            <h2 className="font-display font-bold text-3xl text-[#FFFDF7] mb-1">
              Stage Cleared!
            </h2>
            <p className="text-sm font-semibold text-[#FACC15] mb-4">
              {summary.levelName}
            </p>

            <div className="grid grid-cols-3 gap-2 w-full mb-3">
              <StatTile label="Score" value={String(summary.score)} />
              <StatTile label="Accuracy" value={`${Math.round(summary.accuracy * 100)}%`} />
              <StatTile label="Headshots" value={String(summary.headshots)} />
            </div>

            {rewardSummary && (
              <div className="w-full flex flex-col gap-2.5 mb-5">
                <div className="grid grid-cols-2 gap-2">
                  <StatTile
                    label="Coins Earned"
                    value={`+${rewardSummary.coinsEarned}`}
                    accent="text-[#FACC15]"
                  />
                  <StatTile
                    label="Avg / Level"
                    value={`${rewardSummary.averageCoins}c`}
                    accent="text-[#38BDF8]"
                  />
                </div>

                <div
                  className="bg-[#1C2721] border-2 border-[#22C55E] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-left"
                  data-testid="stage-gift-banner"
                >
                  <Gift className="w-5 h-5 text-[#FACC15] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#86EFAC]">
                      Stage Gift Reward
                    </div>
                    <div className="font-display font-bold text-sm text-[#FFFDF7] truncate">
                      {rewardSummary.gift.label}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 w-full">
              {summary.hasNextLevel ? (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => onNextLevel(summary.levelId + 1)}
                  className="cartoon-btn-primary w-full py-3 rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Next Stage</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  onClick={onRestart}
                  className="cartoon-btn-primary w-full py-3 rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Play Again</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onRestart}
                  className="cartoon-btn-secondary py-2.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Replay</span>
                </button>
                <button
                  type="button"
                  onClick={onTitle}
                  className="cartoon-btn-secondary py-2.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Title</span>
                </button>
              </div>
            </div>
          </>
        )}

        {gameState === 'gameover' && summary && (
          <>
            <h2 className="font-display font-bold text-3xl text-[#F87171] mb-1">
              Defeated
            </h2>
            <p className="text-sm font-semibold text-[#94A3B8] mb-4">
              {summary.levelName} · Wave {summary.waveReached}
            </p>

            <div className="grid grid-cols-3 gap-2 w-full mb-3">
              <StatTile label="Score" value={String(summary.score)} />
              <StatTile label="Best" value={String(summary.bestScore)} />
              <StatTile label="Defeated" value={String(summary.kills)} />
            </div>

            {rewardSummary && (
              <div className="grid grid-cols-2 gap-2 w-full mb-5">
                <StatTile
                  label="Coins Earned"
                  value={`+${rewardSummary.coinsEarned}`}
                  accent="text-[#FACC15]"
                />
                <StatTile
                  label="Avg / Level"
                  value={`${rewardSummary.averageCoins}c`}
                  accent="text-[#38BDF8]"
                />
              </div>
            )}

            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                data-start="true"
                onClick={onRestart}
                className="cartoon-btn-primary w-full py-3 rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={onTitle}
                className="cartoon-btn-secondary w-full py-2.5 rounded-xl font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Title Screen</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StatTile: React.FC<{ label: string; value: string; accent?: string }> = ({
  label,
  value,
  accent = 'text-[#FFFDF7]',
}) => (
  <div className="bg-[#232838] border-2 border-[#090A0D] rounded-xl py-2 px-2 flex flex-col items-center">
    <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1">
      {label === 'Coins Earned' && <Coins className="w-3 h-3 text-[#FACC15]" />}
      <span>{label}</span>
    </span>
    <span className={`font-numeric font-bold text-lg mt-0.5 ${accent}`}>
      {value}
    </span>
  </div>
);
