import React, { useEffect } from 'react';
import { Check, Coins, Flame, Layers, Shield, Sparkles, Target, X } from 'lucide-react';
import {
  BOW_DEFS,
  BowId,
  EquipmentState,
  MAX_UPGRADE_LEVEL,
  computePlayerCombatStats,
  getArrowUpgradeCost,
  getBowActionInfo,
} from '../game/progression';
import { ArrowType } from '../game/types';

interface EquipmentModalProps {
  open: boolean;
  coins: number;
  averageCoins: number;
  equipment: EquipmentState;
  onClose: () => void;
  onEquipBow: (bowId: BowId) => void;
  onBowAction: (bowId: BowId) => void;
  onUpgradeArrow: (arrowType: ArrowType) => void;
}

const BOW_ORDER: BowId[] = ['recurve', 'falcon', 'tempest'];

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  open,
  coins,
  averageCoins,
  equipment,
  onClose,
  onEquipBow,
  onBowAction,
  onUpgradeArrow,
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

  const stats = computePlayerCombatStats(equipment);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#090A0D]/75"
      role="dialog"
      aria-modal="true"
      aria-label="Home Equipment and Upgrades"
    >
      <div className="cartoon-panel rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b-2 border-[#090A0D] bg-[#181C28]">
          <div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#FFFDF7] leading-tight">
              Home Armory &amp; Upgrades
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#94A3B8]">
              Upgrade your bows and arrows with stage coins.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#232838] border-2 border-[#090A0D] rounded-xl px-3 py-1.5 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#FACC15]" />
                <span className="font-numeric font-bold text-sm sm:text-base text-[#FACC15]" data-testid="armory-coins">
                  {coins}
                </span>
              </div>
              <span className="text-[#475569]" aria-hidden="true">|</span>
              <span className="font-numeric text-xs text-[#CBD5E1]">
                Avg {averageCoins}/lvl
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Armory"
              className="cartoon-btn-secondary w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5">
          {/* Active Loadout Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#12151F] border-2 border-[#090A0D] rounded-2xl p-3">
            <MiniStat label="Arrow Speed" value={`${Math.round(stats.bowSpeedMult * 100)}%`} />
            <MiniStat label="Wind Resist" value={`${Math.round(stats.windResistance * 100)}%`} />
            <MiniStat label="Headshot Crit" value={`${(2.2 + stats.critMultBonus).toFixed(2)}x`} />
            <MiniStat label="Healer Pot" value={`+${stats.healerHealAmount} HP`} />
          </div>

          {/* Bows Section */}
          <section aria-label="Bows">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-display font-bold text-lg text-[#FACC15] flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Bows</span>
              </h3>
              <span className="text-xs font-medium text-[#94A3B8]">
                Lv 3+ Bows upgrade Healer to +3 HP
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BOW_ORDER.map((bowId) => {
                const def = BOW_DEFS[bowId];
                const owned = equipment.ownedBows.includes(bowId);
                const equipped = equipment.equippedBow === bowId;
                const actionInfo = getBowActionInfo(bowId, equipment);
                const lvl = equipment.bowLevels[bowId] || 1;
                const canAfford = coins >= actionInfo.cost;

                return (
                  <div
                    key={bowId}
                    className={`rounded-2xl p-3.5 border-2 flex flex-col justify-between gap-3 ${
                      equipped
                        ? 'bg-[#252B3F] border-[#FACC15]'
                        : 'bg-[#1B2030] border-[#090A0D]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-display font-bold text-base text-[#FFFDF7]">
                          {def.name}
                        </span>
                        {owned && (
                          <span className="font-numeric text-xs font-bold text-[#38BDF8] shrink-0">
                            Lv {lvl}/{MAX_UPGRADE_LEVEL}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] mb-2.5">{def.tagline}</p>

                      <div className="flex flex-col gap-1 text-xs font-numeric text-[#CBD5E1]">
                        <div className="flex justify-between">
                          <span>Speed</span>
                          <span className="text-[#FFFDF7]">
                            {Math.round((def.baseSpeedMult + (lvl - 1) * 0.035) * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Wind Resist</span>
                          <span className="text-[#38BDF8]">{Math.round(def.windResistance * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Crit Bonus</span>
                          <span className="text-[#FACC15]">
                            +{(def.critBonus + (lvl - 1) * 0.08).toFixed(2)}x
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {owned && (
                        <button
                          type="button"
                          disabled={equipped}
                          onClick={() => onEquipBow(bowId)}
                          className={`w-full py-1.5 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 border-2 border-[#090A0D] whitespace-nowrap ${
                            equipped
                              ? 'bg-[#166534] text-[#DCFCE7] cursor-default'
                              : 'bg-[#2E354D] text-[#FFFDF7] hover:bg-[#3B4463] cursor-pointer'
                          }`}
                        >
                          {equipped ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Equipped</span>
                            </>
                          ) : (
                            <span>Equip Bow</span>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        data-testid={`bow-action-${bowId}`}
                        disabled={actionInfo.action === 'max' || !canAfford}
                        onClick={() => onBowAction(bowId)}
                        className={`w-full py-2 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 border-2 border-[#090A0D] whitespace-nowrap ${
                          actionInfo.action === 'max'
                            ? 'bg-[#12151F] text-[#94A3B8] cursor-not-allowed'
                            : canAfford
                              ? 'cartoon-btn-primary cursor-pointer'
                              : 'bg-[#141722] text-[#64748B] opacity-75 cursor-not-allowed'
                        }`}
                      >
                        {actionInfo.action === 'max' ? (
                          <span>Max Level</span>
                        ) : actionInfo.action === 'unlock' ? (
                          <>
                            <Coins className="w-3.5 h-3.5 text-[#FEF08A]" />
                            <span>Unlock · {actionInfo.cost}</span>
                          </>
                        ) : (
                          <>
                            <Coins className="w-3.5 h-3.5 text-[#FEF08A]" />
                            <span>Upgrade · {actionInfo.cost}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Arrows Section */}
          <section aria-label="Arrows">
            <h3 className="font-display font-bold text-lg text-[#38BDF8] flex items-center gap-2 mb-2.5">
              <Sparkles className="w-4 h-4" />
              <span>Arrows &amp; Fletching</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ArrowUpgradeCard
                arrowType="standard"
                title="Standard Arrow"
                icon={<Target className="w-4 h-4 text-[#FB923C]" />}
                level={equipment.arrowLevels.standard}
                statLines={[
                  `Damage: ${stats.standardDamage} (+7/lv)`,
                  `Stone Ricochets: ${stats.standardBounces}`,
                ]}
                coins={coins}
                onUpgrade={() => onUpgradeArrow('standard')}
              />
              <ArrowUpgradeCard
                arrowType="triple"
                title="Triple Volley"
                icon={<Layers className="w-4 h-4 text-[#38BDF8]" />}
                level={equipment.arrowLevels.triple}
                statLines={[
                  `Per-Arrow Dmg: ${stats.tripleDamage} (+5/lv)`,
                  `Bonus Stock: +${stats.bonusTripleAmmo}`,
                ]}
                coins={coins}
                onUpgrade={() => onUpgradeArrow('triple')}
              />
              <ArrowUpgradeCard
                arrowType="fire"
                title="Fire Arrow"
                icon={<Flame className="w-4 h-4 text-[#F87171]" />}
                level={equipment.arrowLevels.fire}
                statLines={[
                  `Impact Dmg: ${stats.fireDamage} (+10/lv)`,
                  `Blast Radius: ${stats.fireRadius}px · +${stats.bonusFireAmmo} Stock`,
                ]}
                coins={coins}
                onUpgrade={() => onUpgradeArrow('fire')}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col items-center text-center">
    <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#94A3B8]">
      {label}
    </span>
    <span className="font-numeric font-bold text-sm sm:text-base text-[#FFFDF7] mt-0.5">
      {value}
    </span>
  </div>
);

interface ArrowUpgradeCardProps {
  arrowType: ArrowType;
  title: string;
  icon: React.ReactNode;
  level: number;
  statLines: string[];
  coins: number;
  onUpgrade: () => void;
}

const ArrowUpgradeCard: React.FC<ArrowUpgradeCardProps> = ({
  arrowType,
  title,
  icon,
  level,
  statLines,
  coins,
  onUpgrade,
}) => {
  const isMax = level >= MAX_UPGRADE_LEVEL;
  const cost = getArrowUpgradeCost(arrowType, level);
  const canAfford = !isMax && coins >= cost;

  return (
    <div className="rounded-2xl p-3.5 border-2 border-[#090A0D] bg-[#1B2030] flex flex-col justify-between gap-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-display font-bold text-base text-[#FFFDF7] flex items-center gap-1.5">
            {icon}
            <span>{title}</span>
          </span>
          <span className="font-numeric text-xs font-bold text-[#FACC15]" data-testid={`arrow-lv-${arrowType}`}>
            Lv {level}/{MAX_UPGRADE_LEVEL}
          </span>
        </div>

        <div className="flex flex-col gap-1 text-xs font-numeric text-[#CBD5E1]">
          {statLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>

      <button
        type="button"
        data-testid={`arrow-upgrade-${arrowType}`}
        disabled={isMax || !canAfford}
        onClick={onUpgrade}
        className={`w-full py-2 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 border-2 border-[#090A0D] whitespace-nowrap ${
          isMax
            ? 'bg-[#12151F] text-[#94A3B8] cursor-not-allowed'
            : canAfford
              ? 'cartoon-btn-primary cursor-pointer'
              : 'bg-[#141722] text-[#64748B] opacity-75 cursor-not-allowed'
        }`}
      >
        {isMax ? (
          <span>Max Level</span>
        ) : (
          <>
            <Coins className="w-3.5 h-3.5 text-[#FEF08A]" />
            <span>Upgrade · {cost}</span>
          </>
        )}
      </button>
    </div>
  );
};
