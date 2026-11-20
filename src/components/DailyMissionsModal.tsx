import React, { useEffect } from 'react';
import { Award, CheckCircle2, Flame, Sparkles, X } from 'lucide-react';
import {
  DailyMissionsState,
  getActiveScoreMultiplier,
  getDailyBonusStartingArrows,
} from '../game/progression';

interface DailyMissionsModalProps {
  open: boolean;
  dailyMissions: DailyMissionsState;
  onClose: () => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  open,
  dailyMissions,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const multiplier = getActiveScoreMultiplier(dailyMissions);
  const bonusArrows = getDailyBonusStartingArrows(dailyMissions);
  const completedCount = dailyMissions.missions.filter((m) => m.completed).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#090A0D]/75"
      role="dialog"
      aria-modal="true"
      aria-label="Daily Missions"
    >
      <div className="cartoon-panel rounded-3xl w-full max-w-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b-2 border-[#090A0D] bg-[#181C28]">
          <div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#FFFDF7] leading-tight">
              Daily Missions
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#94A3B8]">
              {dailyMissions.dateKey} · Complete objectives for extra arrows &amp; score multipliers
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Missions"
            className="cartoon-btn-secondary w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Active Bonus Summary */}
          <div className="grid grid-cols-3 gap-2.5 bg-[#12151F] border-2 border-[#090A0D] rounded-2xl p-3">
            <div className="flex flex-col items-center text-center">
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#94A3B8]">
                Completed
              </span>
              <span className="font-numeric font-bold text-base text-[#FFFDF7] mt-0.5">
                {completedCount}/{dailyMissions.missions.length}
              </span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#94A3B8]">
                Score Mult
              </span>
              <span className="font-numeric font-bold text-base text-[#FACC15] mt-0.5" data-testid="daily-mult">
                {multiplier.toFixed(2)}x
              </span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#94A3B8]">
                Bonus Quiver
              </span>
              <span className="font-numeric font-bold text-sm sm:text-base text-[#38BDF8] mt-0.5">
                +{bonusArrows.triple} Tri · +{bonusArrows.fire} Fire
              </span>
            </div>
          </div>

          {/* Mission List */}
          <div className="flex flex-col gap-3">
            {dailyMissions.missions.map((mission) => {
              const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
              return (
                <div
                  key={mission.id}
                  data-testid={`mission-card-${mission.id}`}
                  className={`rounded-2xl p-3.5 border-2 flex flex-col gap-2.5 ${
                    mission.completed
                      ? 'bg-[#172A22] border-[#22C55E]'
                      : 'bg-[#1B2030] border-[#090A0D]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {mission.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
                        ) : mission.rewardKind === 'arrows' ? (
                          <Flame className="w-4 h-4 text-[#FB923C] shrink-0" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-[#FACC15] shrink-0" />
                        )}
                        <span className="font-display font-bold text-base text-[#FFFDF7]">
                          {mission.title}
                        </span>
                      </div>
                      <p className="text-xs text-[#CBD5E1] mt-0.5">
                        {mission.description}
                      </p>
                    </div>

                    <span
                      className={`font-numeric text-xs font-bold shrink-0 ${
                        mission.completed ? 'text-[#4ADE80]' : 'text-[#94A3B8]'
                      }`}
                    >
                      {mission.completed ? 'DONE' : `${mission.progress}/${mission.target}`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-[#0F121A] rounded-md border border-[#090A0D] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        mission.completed ? 'bg-[#22C55E]' : 'bg-[#38BDF8]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-semibold text-[#FACC15] flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      <span>Reward: {mission.rewardLabel}</span>
                    </span>
                    <span className="font-medium text-[#94A3B8]">
                      {mission.completed ? 'Active for runs today' : 'In Progress'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
