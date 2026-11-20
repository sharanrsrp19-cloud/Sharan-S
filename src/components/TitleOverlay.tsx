import React, { useEffect } from 'react';
import {
  CalendarCheck,
  Coins,
  Gift,
  Infinity as InfinityIcon,
  Lock,
  Play,
  Shield,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CAMPAIGN_LEVELS } from '../game/levels';
import { BOW_DEFS, getLevelGiftDef } from '../game/progression';
import { LevelProgress } from '../game/types';

interface TitleOverlayProps {
  progress: LevelProgress;
  selectedLevelId: number;
  muted: boolean;
  modalOpen: boolean;
  onSelectLevel: (id: number) => void;
  onStartCampaign: (levelId: number) => void;
  onStartEndless: () => void;
  onToggleMute: () => void;
  onOpenEquipment: () => void;
  onOpenMissions: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  progress,
  selectedLevelId,
  muted,
  modalOpen,
  onSelectLevel,
  onStartCampaign,
  onStartEndless,
  onToggleMute,
  onOpenEquipment,
  onOpenMissions,
}) => {
  const activeLevel = CAMPAIGN_LEVELS.find((l) => l.id === selectedLevelId) || CAMPAIGN_LEVELS[0];
  const averageCoins =
    progress.levelsFinished > 0
      ? Math.round(progress.totalCoinsEarned / progress.levelsFinished)
      : 0;
  const completedMissions = progress.dailyMissions.missions.filter((m) => m.completed).length;
  const totalMissions = progress.dailyMissions.missions.length;
  const stageGift = getLevelGiftDef(activeLevel.id);
  const giftClaimed = progress.claimedGifts.includes(activeLevel.id);
  const equippedBowName = BOW_DEFS[progress.equipment.equippedBow]?.name || 'Oak Recurve';

  useEffect(() => {
    if (modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartCampaign(selectedLevelId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, onStartCampaign, selectedLevelId]);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top Utility Row: Wallet Summary (Left) & Armory / Missions / Mute (Right) */}
      <div className="flex items-start justify-between gap-2 pointer-events-none">
        <div
          className="pointer-events-auto cartoon-panel rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs sm:text-sm"
          aria-label="Player coin wallet"
        >
          <span className="flex items-center gap-1.5 font-numeric font-bold text-[#FACC15]" data-testid="title-coins">
            <Coins className="w-4 h-4" />
            <span>{progress.coins}</span>
          </span>
          <span className="text-[#475569]" aria-hidden="true">|</span>
          <span className="font-numeric text-xs text-[#CBD5E1]" data-testid="title-avg-coins">
            Avg {averageCoins}/lvl
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            data-testid="open-equipment-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenEquipment();
            }}
            className="cartoon-btn-secondary px-3.5 py-2 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-[#38BDF8]" />
            <span>Equipment · {equippedBowName.split(' ')[0]}</span>
          </button>

          <button
            type="button"
            data-testid="open-missions-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMissions();
            }}
            className="cartoon-btn-secondary px-3.5 py-2 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-[#FACC15]" />
            <span>Daily ({completedMissions}/{totalMissions})</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="cartoon-btn-secondary w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Title & Stage Selector anchored cleanly in upper-center sky negative space */}
      <div className="flex flex-col items-center justify-start pt-0 pointer-events-none -mt-3">
        <div className="w-full max-w-[500px] flex flex-col items-center pointer-events-auto">
          {/* Bespoke Inline SVG Title Lockup */}
          <div className="mb-2 w-full flex justify-center">
            <svg
              viewBox="0 0 460 118"
              className="w-full max-w-[325px] h-auto drop-shadow-[0_4px_0_rgba(9,10,13,0.95)]"
              role="img"
              aria-label="Arrowfall Stickman Archer Duel"
            >
              {/* Crossed bow/arrow emblem */}
              <g transform="translate(46, 56)">
                <circle cx="0" cy="0" r="36" fill="#E84A27" stroke="#090A0D" strokeWidth="4.5" />
                <circle cx="0" cy="0" r="27" fill="#FFF9EE" stroke="#090A0D" strokeWidth="3" />
                <circle cx="0" cy="0" r="15" fill="#FACC15" stroke="#090A0D" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="5" fill="#DC2626" />
                <line x1="-26" y1="22" x2="2" y2="-2" stroke="#090A0D" strokeWidth="6" strokeLinecap="round" />
                <line x1="-26" y1="22" x2="2" y2="-2" stroke="#E7C08A" strokeWidth="2.5" strokeLinecap="round" />
                <polygon points="-28,24 -34,15 -22,18" fill="#E84A27" stroke="#090A0D" strokeWidth="2" />
              </g>

              {/* Title Lettering */}
              <text
                x="98"
                y="62"
                fill="#FFFDF7"
                stroke="#090A0D"
                strokeWidth="9"
                paintOrder="stroke fill"
                fontFamily="Fredoka, sans-serif"
                fontWeight="700"
                fontSize="52"
                letterSpacing="1"
              >
                ARROWFALL
              </text>
              <text
                x="101"
                y="93"
                fill="#FACC15"
                stroke="#090A0D"
                strokeWidth="5.5"
                paintOrder="stroke fill"
                fontFamily="Fredoka, sans-serif"
                fontWeight="700"
                fontSize="21"
                letterSpacing="2"
              >
                STICKMAN ARCHER DUEL
              </text>
            </svg>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-3 w-full justify-center">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartCampaign(selectedLevelId);
              }}
              className="cartoon-btn-primary px-6 py-3 rounded-2xl font-display text-lg sm:text-xl font-bold flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Play Stage {activeLevel.id}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartEndless();
              }}
              className="cartoon-btn-secondary px-5 py-3 rounded-2xl font-display text-base sm:text-lg font-bold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <InfinityIcon className="w-5 h-5 text-[#E85D2A]" />
              <span>Endless Mode</span>
            </button>
          </div>

          {/* Compact Campaign Stage Strip */}
          <div className="cartoon-panel rounded-2xl p-3.5 w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-bold text-sm sm:text-base text-[#FFFDF7]">
                Campaign · {activeLevel.id}. {activeLevel.name}
              </span>
              {progress.bestScore > 0 && (
                <span className="font-numeric text-xs font-semibold text-[#FACC15]">
                  Best {progress.bestScore}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {CAMPAIGN_LEVELS.map((lvl) => {
                const locked = lvl.id > progress.unlockedLevel;
                const selected = lvl.id === selectedLevelId;
                const stars = progress.stars[lvl.id] || 0;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    disabled={locked}
                    onClick={() => onSelectLevel(lvl.id)}
                    aria-label={`Select Stage ${lvl.id}: ${lvl.name}${locked ? ' (Locked)' : ''}`}
                    className={`relative rounded-xl py-1.5 px-1 flex flex-col items-center justify-center border-2 transition-transform ${
                      locked
                        ? 'bg-[#12141C] border-[#2B3040] text-[#64748B] cursor-not-allowed opacity-75'
                        : selected
                          ? 'bg-[#E84A27] text-[#FFFDF7] border-[#090A0D] shadow-[0_2px_0_#090A0D] -translate-y-0.5 cursor-pointer'
                          : 'bg-[#232838] text-[#F8FAFC] border-[#090A0D] hover:bg-[#2E344A] cursor-pointer'
                    }`}
                  >
                    <span className="font-display font-bold text-sm leading-tight">
                      {locked ? <Lock className="w-3.5 h-3.5 my-0.5" /> : lvl.id}
                    </span>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1, 2, 3].map((sIdx) => (
                        <Star
                          key={sIdx}
                          className={`w-2.5 h-2.5 ${
                            sIdx <= stars
                              ? 'text-[#FACC15] fill-[#FACC15]'
                              : 'text-[#475569]'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#CBD5E1] truncate">
                {activeLevel.subtitle}
              </span>
              <span className="font-display font-semibold text-[#FACC15] flex items-center gap-1 whitespace-nowrap shrink-0">
                <Gift className="w-3.5 h-3.5" />
                <span>{giftClaimed ? `Repeat Bonus +${20 + activeLevel.id * 4}c` : stageGift.label}</span>
              </span>
            </div>
          </div>

          {/* Single flat control-hint line */}
          <p className="mt-2.5 font-display text-xs sm:text-sm font-semibold text-[#FFFDF7] hud-stroke-sm tracking-wide text-center">
            Drag to Aim &amp; Shoot · 1–3 Quiver · H Healer · C Camera · P Pause
          </p>
        </div>
      </div>

      <div aria-hidden="true" />
    </div>
  );
};
