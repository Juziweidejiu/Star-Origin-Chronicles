import React, { useState } from 'react';
import type { Hero } from '../types/hero';
import type { GridSlotId, FormationPresetId, FormationSlotAssignment } from '../types/formation';
import { GRID_SLOTS } from '../types/formation';
import { FORMATION_PRESETS, validateFormationHealth } from '../engine/formationEngine';
import { heroRoleLabel } from '../engine/heroFactory';

interface FormationModalProps {
  party: Hero[];
  assignments: FormationSlotAssignment[];
  currentPreset: FormationPresetId;
  onApplyPreset: (presetId: FormationPresetId) => void;
  onUpdateAssignments: (assignments: FormationSlotAssignment[]) => void;
  onClose: () => void;
}

export const FormationModal: React.FC<FormationModalProps> = ({
  party,
  assignments,
  currentPreset,
  onApplyPreset,
  onUpdateAssignments,
  onClose,
}) => {
  // 当前选中的英雄，用于点选放置到网格中
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  const warnings = validateFormationHealth(party, assignments);

  // 获取英雄在哪个格子里
  const getHeroSlot = (heroId: string): GridSlotId | undefined => {
    return assignments.find(a => a.heroId === heroId)?.slotId;
  };

  // 获取格子里坐着哪个英雄
  const getSlotHero = (slotId: GridSlotId): Hero | undefined => {
    const assign = assignments.find(a => a.slotId === slotId);
    if (!assign) return undefined;
    return party.find(h => h.id === assign.heroId);
  };

  // 点击网格中的某个格子
  const handleSlotClick = (targetSlotId: GridSlotId) => {
    if (!selectedHeroId) {
      // 如果没有选定英雄，点击有人的格子则选中该人格子
      const occupant = getSlotHero(targetSlotId);
      if (occupant) {
        setSelectedHeroId(occupant.id);
      }
      return;
    }

    // 已经选中了某个英雄，准备移动或交换
    const existingOccupant = getSlotHero(targetSlotId);
    const sourceSlot = getHeroSlot(selectedHeroId);

    let next = assignments.filter(a => a.heroId !== selectedHeroId);

    if (existingOccupant) {
      // 交换位置
      next = next.filter(a => a.heroId !== existingOccupant.id);
      next.push({ heroId: selectedHeroId, slotId: targetSlotId });
      if (sourceSlot) {
        next.push({ heroId: existingOccupant.id, slotId: sourceSlot });
      }
    } else {
      // 直接移动到空位
      next.push({ heroId: selectedHeroId, slotId: targetSlotId });
    }

    onUpdateAssignments(next);
    setSelectedHeroId(null);
  };

  const selectedHero = party.find(h => h.id === selectedHeroId);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-slate-900 border border-amber-600/50 rounded-xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📐</span>
            <h3 className="font-bold text-amber-300 tracking-wider">战术阵型与站位</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              3×3 战术网格
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sm active:scale-95 transition"
          >
            ✕ 关闭
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* 阵型极简预设选择 */}
          <div>
            <div className="text-slate-400 mb-1.5 flex items-center justify-between">
              <span>⚡ 预设阵型（点击套用）</span>
              <span className="text-[10px] text-slate-500">当前：{FORMATION_PRESETS[currentPreset]?.name || '自定义'}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(Object.keys(FORMATION_PRESETS) as FormationPresetId[]).map(id => {
                const p = FORMATION_PRESETS[id];
                const isActive = currentPreset === id;
                return (
                  <button
                    key={id}
                    onClick={() => onApplyPreset(id)}
                    className={`py-1.5 px-2 rounded border text-center transition ${
                      isActive
                        ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div>{p.name}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 p-2 rounded bg-slate-800/40 border border-slate-700/60 text-[11px] text-slate-300">
              <span className="text-amber-400 font-semibold">{FORMATION_PRESETS[currentPreset]?.name}：</span>
              {FORMATION_PRESETS[currentPreset]?.description}
            </div>
          </div>

          {/* 阵型健康度警报 */}
          {warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.map((w, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border text-[11px] flex items-start gap-2 ${
                    w.level === 'danger'
                      ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
                      : 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                  }`}
                >
                  <span className="text-sm mt-0.5">{w.level === 'danger' ? '⚠️' : 'ℹ️'}</span>
                  <div>
                    <span className="font-bold">{w.title}：</span>
                    {w.detail}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3x3 战术网格 */}
          <div>
            <div className="text-slate-400 mb-1 flex items-center justify-between text-[11px]">
              <span>🛡️ 敌军方向 ➔ 【前排 · 防护线】 | 【中排 · 机动】 | 【后排 · 施法】</span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {/* 第一列：前排 (Front) */}
              <div className="flex flex-col gap-2">
                <div className="text-center text-[10px] text-amber-400/90 font-semibold py-0.5 bg-amber-950/30 rounded border border-amber-800/40">
                  前排 (仇恨4.5/减伤10%)
                </div>
                {(['front_top', 'front_center', 'front_bottom'] as GridSlotId[]).map(slotId => (
                  <SlotCell
                    key={slotId}
                    slotId={slotId}
                    occupant={getSlotHero(slotId)}
                    selected={selectedHeroId ? getSlotHero(slotId)?.id === selectedHeroId : false}
                    onClick={() => handleSlotClick(slotId)}
                  />
                ))}
              </div>

              {/* 第二列：中排 (Mid) */}
              <div className="flex flex-col gap-2">
                <div className="text-center text-[10px] text-sky-400/90 font-semibold py-0.5 bg-sky-950/30 rounded border border-sky-800/40">
                  中排 (仇恨1.2/暴击+5%)
                </div>
                {(['mid_top', 'mid_center', 'mid_bottom'] as GridSlotId[]).map(slotId => (
                  <SlotCell
                    key={slotId}
                    slotId={slotId}
                    occupant={getSlotHero(slotId)}
                    selected={selectedHeroId ? getSlotHero(slotId)?.id === selectedHeroId : false}
                    onClick={() => handleSlotClick(slotId)}
                  />
                ))}
              </div>

              {/* 第三列：后排 (Back) */}
              <div className="flex flex-col gap-2">
                <div className="text-center text-[10px] text-emerald-400/90 font-semibold py-0.5 bg-emerald-950/30 rounded border border-emerald-800/40">
                  后排 (仇恨0.55/增效10%)
                </div>
                {(['back_top', 'back_center', 'back_bottom'] as GridSlotId[]).map(slotId => (
                  <SlotCell
                    key={slotId}
                    slotId={slotId}
                    occupant={getSlotHero(slotId)}
                    selected={selectedHeroId ? getSlotHero(slotId)?.id === selectedHeroId : false}
                    onClick={() => handleSlotClick(slotId)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-2 text-[10px] text-slate-400 text-center">
              {selectedHero ? (
                <span className="text-amber-300">
                  已拿起「{selectedHero.name}」，请点击目标格子放置或交换。
                </span>
              ) : (
                '💡 点击格子中的队员可选中拿起，再点击其它格子即可调动站位。'
              )}
            </div>
          </div>

          {/* 阵型中队员卡片简览 */}
          <div className="border-t border-slate-800 pt-3">
            <div className="text-slate-400 mb-1.5 font-medium">👥 队伍成员站位一览</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {party.map(hero => {
                const slot = getHeroSlot(hero.id);
                const slotMeta = GRID_SLOTS.find(s => s.id === slot);
                const isSelected = selectedHeroId === hero.id;

                return (
                  <div
                    key={hero.id}
                    onClick={() => setSelectedHeroId(isSelected ? null : hero.id)}
                    className={`p-2 rounded border cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-600/30 border-amber-400 ring-2 ring-amber-400/50'
                        : 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{hero.name}</span>
                      <span className="text-[10px] text-amber-300/80">
                        {slotMeta ? slotMeta.name : '未布阵'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {heroRoleLabel(hero)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded shadow transition active:scale-95 text-xs"
          >
            完成布阵
          </button>
        </div>
      </div>
    </div>
  );
};

// 单个格子组件
const SlotCell: React.FC<{
  slotId: GridSlotId;
  occupant?: Hero;
  selected?: boolean;
  onClick: () => void;
}> = ({ slotId, occupant, selected, onClick }) => {
  const meta = GRID_SLOTS.find(s => s.id === slotId);

  return (
    <div
      onClick={onClick}
      className={`min-h-[58px] rounded-lg border p-1.5 flex flex-col justify-between cursor-pointer transition active:scale-98 select-none ${
        selected
          ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/50'
          : occupant
          ? 'bg-slate-800/90 border-slate-600 hover:border-amber-400/60 shadow-inner'
          : 'bg-slate-900/40 border-dashed border-slate-800 hover:border-slate-600 text-slate-600'
      }`}
    >
      <div className="flex items-center justify-between text-[9px]">
        <span className="opacity-60">{meta?.name}</span>
        {occupant && (
          <span
            className={`px-1 rounded text-[8px] ${
              occupant.role === 'tank'
                ? 'bg-amber-950 text-amber-300'
                : occupant.role === 'healer'
                ? 'bg-emerald-950 text-emerald-300'
                : 'bg-rose-950 text-rose-300'
            }`}
          >
            {occupant.role === 'tank' ? '盾' : occupant.role === 'healer' ? '医' : '刃'}
          </span>
        )}
      </div>

      {occupant ? (
        <div className="text-center my-0.5">
          <div className="font-bold text-slate-100 text-[11px] truncate">{occupant.name}</div>
          <div className="text-[9px] text-slate-400 truncate">{heroRoleLabel(occupant)}</div>
        </div>
      ) : (
        <div className="text-center text-[10px] text-slate-600 my-auto">+ 空</div>
      )}
    </div>
  );
};
