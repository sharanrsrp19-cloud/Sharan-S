import React from 'react';
import { Coins, HeartPulse, Pause, RotateCcw, Volume2, VolumeX, Wind } from 'lucide-react';
import { ArrowType, HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  onSelectArrow: (type: ArrowType) => void;
  onUseHealer: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onSelectArrow,
  onUseHealer,
  onToggleMute,
  onTogglePause,
  onRestart,
}) => {
  const windAbs = Math.abs(hud.wind);
  const windDirLabel = windAbs < 8 ? 'CALM' : hud.wind > 0 ? 'EAST' : 'WEST';

  const hasFreeHeal = hud.healerCharges > 0;
  const healerEnabled = hud.hp < hud.maxHp && (hasFreeHeal || hud.canCoinHeal);
  const healerStockText = hasFreeHeal
    ? `${hud.healerCharges}x +${hud.healerHealAmount}HP`
    : hud.canCoinHeal
      ? '25c +2HP'
      : '0';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Cluster */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Vitality Pips, Score & Multiplier */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5" aria-label={`Health ${hud.hp} of ${hud.maxHp}`}>
            {Array.from({ length: hud.maxHp }).map((_, idx) => {
              const full = idx < hud.hp;
              return (
                <svg
                  key={idx}
                  viewBox="0 0 24 24"
                  className="w-7 h-7 sm:w-8 sm:h-8"
                  aria-hidden="true"
                >
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    fill={full ? '#EF4444' : '#334155'}
                    stroke="#1E1916"
                    strokeWidth="2.4"
                  />
                  {full && (
                    <ellipse cx="8" cy="7.5" rx="2" ry="1.2" fill="#FCA5A5" transform="rotate(-25 8 7.5)" />
                  )}
                </svg>
              );
            })}
          </div>

          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="font-display font-bold text-2xl sm:text-3xl text-[#FFFDF7] hud-stroke font-numeric leading-none">
              {Math.round(hud.score)}
            </span>
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#FDE68A] hud-stroke-sm">
              SCORE
            </span>
            {hud.scoreMultiplier > 1 && (
              <span className="font-numeric font-bold text-xs text-[#38BDF8] hud-stroke-sm" data-testid="hud-multiplier">
                {hud.scoreMultiplier.toFixed(2)}x MULT
              </span>
            )}
            {hud.combo >= 2 && (
              <span className="font-display font-bold text-sm text-[#FACC15] hud-stroke-sm">
                {hud.combo}x COMBO
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs font-numeric font-bold text-[#FACC15] hud-stroke-sm">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              <span>{hud.coins}</span>
            </span>
            {hud.activeMissionText && (
              <span className="font-display text-[#E2E8F0] font-semibold">
                · Daily: {hud.activeMissionText}
              </span>
            )}
          </div>
        </div>

        {/* Top-Center: Stage, Wave & Wind Vane */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="cartoon-panel rounded-xl px-3.5 py-1.5 flex items-center gap-3 text-xs sm:text-sm font-bold text-[#F8FAFC]">
            <span className="font-display truncate max-w-[160px] sm:max-w-none">
              {hud.mode === 'endless'
                ? `Endless · Wave ${hud.waveIndex + 1}`
                : `Stage ${hud.levelId} · Wave ${hud.waveIndex + 1}/${hud.totalWaves}`}
            </span>
            <span className="text-[#475569]" aria-hidden="true">|</span>
            <span className="flex items-center gap-1.5 font-numeric whitespace-nowrap">
              <Wind className="w-4 h-4 text-[#38BDF8]" />
              <span>
                {windAbs < 8 ? '0' : `${windAbs}`} {windDirLabel}
              </span>
              {windAbs >= 8 && (
                <span
                  className="inline-block font-bold text-[#FACC15]"
                  aria-hidden="true"
                >
                  {hud.wind > 0 ? '→' : '←'}
                </span>
              )}
            </span>
          </div>

          {/* Boss HP Bar when Warlord Boss is active */}
          {hud.bossHp !== undefined && hud.bossMaxHp !== undefined && (
            <div className="w-56 sm:w-72 cartoon-panel rounded-lg px-2.5 py-1 flex flex-col gap-0.5">
              <div className="flex justify-between text-[11px] font-display font-bold text-[#FCA5A5]">
                <span>{hud.bossName}</span>
                <span className="font-numeric">{Math.round(hud.bossHp)}/{hud.bossMaxHp}</span>
              </div>
              <div className="w-full h-2.5 bg-[#334155] rounded border border-[#1E1916] overflow-hidden">
                <div
                  className="h-full bg-[#EF4444] transition-transform duration-150 origin-left"
                  style={{ transform: `scaleX(${Math.max(0, hud.bossHp / hud.bossMaxHp)})` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Utility Icon Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={hud.muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            title="Mute (M)"
            className="cartoon-btn-secondary w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center cursor-pointer"
          >
            {hud.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            aria-label="Restart level (R)"
            title="Restart (R)"
            className="cartoon-btn-secondary w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            aria-label="Pause game (P)"
            title="Pause (P)"
            className="cartoon-btn-secondary w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom-Left: Arrow Quiver Selector + Healer Action */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2 pointer-events-auto" role="group" aria-label="Arrow quiver and healer">
          <QuiverButton
            hotkey="1"
            label="Standard"
            stock="∞"
            active={hud.selectedArrow === 'standard'}
            disabled={false}
            accent="#E85D2A"
            onClick={() => onSelectArrow('standard')}
          />
          <QuiverButton
            hotkey="2"
            label="Triple"
            stock={String(hud.ammo.triple)}
            active={hud.selectedArrow === 'triple'}
            disabled={hud.ammo.triple <= 0}
            accent="#0284C7"
            onClick={() => onSelectArrow('triple')}
          />
          <QuiverButton
            hotkey="3"
            label="Fire"
            stock={String(hud.ammo.fire)}
            active={hud.selectedArrow === 'fire'}
            disabled={hud.ammo.fire <= 0}
            accent="#DC2626"
            onClick={() => onSelectArrow('fire')}
          />

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-healer-btn"
            disabled={!healerEnabled}
            onClick={(e) => {
              e.currentTarget.blur();
              onUseHealer();
            }}
            title="Use Healer (H)"
            aria-label={`Use Healer (${healerStockText})`}
            className={`px-3 py-2 rounded-xl border-2 border-[#090A0D] flex items-center gap-2 transition-transform whitespace-nowrap shrink-0 ${
              !healerEnabled
                ? 'bg-[#12141C] text-[#64748B] opacity-65 cursor-not-allowed'
                : 'bg-[#166534] text-[#F0FDF4] shadow-[0_3px_0_#090A0D] hover:bg-[#15803D] cursor-pointer'
            }`}
          >
            <span className="w-5 h-5 rounded-md text-[11px] font-numeric font-bold text-white flex items-center justify-center border border-[#090A0D] bg-[#22C55E]">
              H
            </span>
            <HeartPulse className="w-4 h-4 text-[#86EFAC]" />
            <span className="font-display font-bold text-xs sm:text-sm">Healer</span>
            <span className="font-numeric text-xs font-bold text-[#FEF08A]">
              {healerStockText}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuiverButtonProps {
  hotkey: string;
  label: string;
  stock: string;
  active: boolean;
  disabled: boolean;
  accent: string;
  onClick: () => void;
}

const QuiverButton: React.FC<QuiverButtonProps> = ({
  hotkey,
  label,
  stock,
  active,
  disabled,
  accent,
  onClick,
}) => (
  <button
    type="button"
    tabIndex={-1}
    disabled={disabled}
    aria-pressed={active}
    onClick={(e) => {
      e.currentTarget.blur();
      onClick();
    }}
    className={`px-3 py-2 rounded-xl border-2 border-[#090A0D] flex items-center gap-2 transition-transform whitespace-nowrap shrink-0 ${
      disabled
        ? 'bg-[#12141C] text-[#64748B] opacity-65 cursor-not-allowed'
        : active
          ? 'bg-[#E84A27] text-[#FFFDF7] shadow-[0_3px_0_#090A0D] -translate-y-0.5 cursor-pointer'
          : 'bg-[#1D2130] text-[#F8FAFC] shadow-[0_2px_0_#090A0D] hover:bg-[#282D40] cursor-pointer'
    }`}
  >
    <span
      className="w-5 h-5 rounded-md text-[11px] font-numeric font-bold text-white flex items-center justify-center border border-[#090A0D]"
      style={{ backgroundColor: accent }}
    >
      {hotkey}
    </span>
    <span className="font-display font-bold text-xs sm:text-sm">{label}</span>
    <span className={`font-numeric text-xs font-bold ${active ? 'text-[#FEF08A]' : 'text-[#94A3B8]'}`}>
      {stock}
    </span>
  </button>
);
