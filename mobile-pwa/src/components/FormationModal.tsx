import React, { useState } from 'react';
import type { Hero } from '../types/hero';
import type { GridSlotId, FormationPresetId, FormationSlotAssignment } from '../types/formation';
import { GRID_SLOTS } from '../types/formation';
import { FORMATION_PRESETS, validateFormationHealth } from '../engine/formationEngine';
import { heroRoleLabel } from '../engine/heroFactory';

interface FormationModalProps {
  party: Hero[];                   // 当前出战的 4 人先遣队
  allHeroes?: Hero[];              // 全体名册佣兵（包含替补席）
  assignments: FormationSlotAssignment[];
  currentPreset: FormationPresetId;
  onApplyPreset: (presetId: FormationPresetId) => void;
  onUpdateAssignments: (assignments: FormationSlotAssignment[]) => void;
  onSwapHeroDeploy?: (deployHeroId: string, reserveHeroId: string) => void; // 替补与主力轮换
  onClose: () => void;
}

export const FormationModal: React.FC<FormationModalProps> = ({
  party,
  allHeroes = [],
  assignments,
  currentPreset,
  onApplyPreset,
  onUpdateAssignments,
  onSwapHeroDeploy,
  onClose,
}) => {
  // 选中的英雄 ID（可以是先遣队员，也可以是替补席成员）
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  // 替补席：在 allHeroes 中但不在 party 中的人
  const reserveHeroes = allHeroes.filter(h => !party.some(p => p.id === h.id));

  const warnings = validateFormationHealth(party, assignments);

  // 获取英雄当前所在格子
  const getHeroSlot = (heroId: string): GridSlotId | undefined => {
    return assignments.find(a => a.heroId === heroId)?.slotId;
  };

  // 获取格子里坐着哪个英雄
  const getSlotHero = (slotId: GridSlotId): Hero | undefined => {
    const assign = assignments.find(a => a.slotId === slotId);
    if (!assign) return undefined;
    return party.find(h => h.id === assign.heroId) || allHeroes.find(h => h.id === assign.heroId);
  };

  // 检查某个英雄是否在替补席
  const isHeroInReserve = (heroId: string) => {
    return reserveHeroes.some(h => h.id === heroId);
  };

  // 点击网格中的某个格子
  const handleSlotClick = (targetSlotId: GridSlotId) => {
    if (!selectedHeroId) {
      const occupant = getSlotHero(targetSlotId);
      if (occupant) {
        setSelectedHeroId(occupant.id);
      }
      return;
    }

    const existingOccupant = getSlotHero(targetSlotId);
    const sourceSlot = getHeroSlot(selectedHeroId);
    const selectedIsReserve = isHeroInReserve(selectedHeroId);

    // 情况 A：选中的是替补席队员，点击了一个有主力占位的格子 -> 触发主力/替补轮换
    if (selectedIsReserve && existingOccupant) {
      if (onSwapHeroDeploy) {
        onSwapHeroDeploy(existingOccupant.id, selectedHeroId);
      }
      // 替补替换该格子上的英雄
      const next = assignments.filter(a => a.heroId !== existingOccupant.id && a.heroId !== selectedHeroId);
      next.push({ heroId: selectedHeroId, slotId: targetSlotId });
      onUpdateAssignments(next);
      setSelectedHeroId(null);
      return;
    }

    // 情况 B：选中的是替补席队员，点击了一个空格子 -> 如果队伍不满4人，直接占位；如果满4人，提示先选要替换的人
    if (selectedIsReserve && !existingOccupant) {
      if (party.length >= 4) {
        // 先遣队已满4人，不能直接放入空格，需先选定替换谁或从主力中下阵一人
        setSelectedHeroId(null);
        return;
      }
      const next = assignments.filter(a => a.heroId !== selectedHeroId);
      next.push({ heroId: selectedHeroId, slotId: targetSlotId });
      onUpdateAssignments(next);
      setSelectedHeroId(null);
      return;
    }

    // 情况 C：主力队员之间的格子互换或移动到空格
    let next = assignments.filter(a => a.heroId !== selectedHeroId);

    if (existingOccupant) {
      next = next.filter(a => a.heroId !== existingOccupant.id);
      next.push({ heroId: selectedHeroId, slotId: targetSlotId });
      if (sourceSlot) {
        next.push({ heroId: existingOccupant.id, slotId: sourceSlot });
      }
    } else {
      next.push({ heroId: selectedHeroId, slotId: targetSlotId });
    }

    onUpdateAssignments(next);
    setSelectedHeroId(null);
  };

  // 统计前中后排人数
  const counts = { front: 0, mid: 0, back: 0 };
  for (const a of assignments) {
    const meta = GRID_SLOTS.find(s => s.id === a.slotId);
    if (meta) counts[meta.col]++;
  }

  // 棋盘格渲染组件
  const SlotBox: React.FC<{
    slotId: GridSlotId;
    occupant?: Hero;
    isSelected: boolean;
    onClick: () => void;
  }> = ({ slotId, occupant, isSelected, onClick }) => {
    const isTargetForSwap = selectedHeroId && occupant && selectedHeroId !== occupant.id;
    const selectedIsReserve = selectedHeroId ? isHeroInReserve(selectedHeroId) : false;

    return (
      <div
        onClick={onClick}
        style={{
          height: '72px',
          borderRadius: '8px',
          padding: '4px',
          backgroundColor: isSelected
            ? 'rgba(217, 119, 6, 0.4)'
            : occupant
            ? '#1e293b'
            : 'rgba(15, 23, 42, 0.6)',
          border: isSelected
            ? '2px solid #facc15'
            : isTargetForSwap && selectedIsReserve
            ? '2px dashed #38bdf8'
            : occupant
            ? '1px solid #475569'
            : '1px dashed #334155',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.15s ease-in-out',
          boxShadow: isSelected ? '0 0 12px rgba(250, 204, 21, 0.6)' : 'none',
        }}
      >
        {occupant ? (
          <>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: occupant.role === 'tank' ? '#1e3a8a' : occupant.role === 'healer' ? '#065f46' : '#991b1b',
                border: `2px solid ${occupant.role === 'tank' ? '#60a5fa' : occupant.role === 'healer' ? '#34d399' : '#f87171'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#fff',
                marginBottom: '2px',
              }}
            >
              {occupant.role === 'tank' ? '🛡️' : occupant.role === 'healer' ? '🌿' : '⚔️'}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '68px',
                textAlign: 'center',
              }}
            >
              {occupant.name}
            </div>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>
              {heroRoleLabel(occupant)}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '9px', color: '#475569', textAlign: 'center' }}>
            <div>{slotId.split('_')[1] === 'center' ? '•' : ''}</div>
            <div style={{ marginTop: '2px' }}>空位</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        {/* 顶部标题栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #1e293b',
            backgroundColor: '#1e293b',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc' }}>
              📐 3×3 战术阵型与人员轮换
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              点击主力或待命队员，再点击目标位置即可换位或轮换上阵
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '4px 10px',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* 中间内容滚动区 */}
        <div style={{ padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* 一键预设阵型选择器 */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px' }}>
              ⚡ 战术阵型预设：
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {(Object.keys(FORMATION_PRESETS) as FormationPresetId[]).map(presetId => {
                const preset = FORMATION_PRESETS[presetId];
                const isActive = currentPreset === presetId;
                return (
                  <button
                    key={presetId}
                    onClick={() => onApplyPreset(presetId)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: isActive ? '1px solid #eab308' : '1px solid #334155',
                      backgroundColor: isActive ? 'rgba(234, 179, 8, 0.2)' : '#1e293b',
                      color: isActive ? '#fef08a' : '#cbd5e1',
                      fontSize: '11px',
                      fontWeight: isActive ? 'bold' : 'normal',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 阵型健康警告信息 */}
          {warnings.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                padding: '6px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {warnings.map((w, idx) => (
                <div key={idx} style={{ fontSize: '11px', color: '#fca5a5' }}>
                  ⚠️ {w.title}：{w.detail}
                </div>
              ))}
            </div>
          )}

          {/* 3×3 战棋九宫格布局 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#cbd5e1' }}>
                ⚔️ 战地阵列 (迎向交火线)
              </span>
              <span style={{ fontSize: '10px', color: '#eab308' }}>
                {selectedHeroId
                  ? isHeroInReserve(selectedHeroId)
                    ? '👉 请点击棋盘上的任意主力进行上阵替换'
                    : '👉 请点击目标格子完成换位'
                  : '💡 点击棋盘上的单位可选中换位'}
              </span>
            </div>

            {/* 棋盘主体 (3 列) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                backgroundColor: '#090d16',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid #1e293b',
              }}
            >
              {/* 第一列：前排 (Front) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div
                  style={{
                    padding: '4px 2px',
                    textAlign: 'center',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    backgroundColor: counts.front === 0 ? 'rgba(225, 29, 72, 0.25)' : 'rgba(217, 119, 6, 0.25)',
                    border: counts.front === 0 ? '1px solid #f43f5e' : '1px solid #d97706',
                    color: counts.front === 0 ? '#fda4af' : '#fde047',
                  }}
                >
                  {counts.front === 0 ? '⚠️ 前排无人' : '前排·防守线'}
                  <div style={{ fontSize: '8px', opacity: 0.8, fontWeight: 'normal' }}>仇恨4.5 / 承伤-10%</div>
                </div>
                {(['front_top', 'front_center', 'front_bottom'] as GridSlotId[]).map(slotId => (
                  <SlotBox
                    key={slotId}
                    slotId={slotId}
                    occupant={getSlotHero(slotId)}
                    isSelected={selectedHeroId ? getSlotHero(slotId)?.id === selectedHeroId : false}
                    onClick={() => handleSlotClick(slotId)}
                  />
                ))}
              </div>

              {/* 第二列：中排 (Mid) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div
                  style={{
                    padding: '4px 2px',
                    textAlign: 'center',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(14, 165, 233, 0.2)',
                    border: '1px solid #0284c7',
                    color: '#38bdf8',
                  }}
                >
                  中排·机动线
                  <div style={{ fontSize: '8px', opacity: 0.8, fontWeight: 'normal' }}>仇恨1.2 / 暴击+5%</div>
                </div>
                {(['mid_top', 'mid_center', 'mid_bottom'] as GridSlotId[]).map(slotId => (
                  <SlotBox
                    key={slotId}
                    slotId={slotId}
                    occupant={getSlotHero(slotId)}
                    isSelected={selectedHeroId ? getSlotHero(slotId)?.id === selectedHeroId : false}
                    onClick={() => handleSlotClick(slotId)}
                  />
                ))}
              </div>

              {/* 第三列：后排 (Back) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div
                  style={{
                    padding: '4px 2px',
                    textAlign: 'center',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #059669',
                    color: '#34d399',
                  }}
                >
                  后排·施法线
                  <div style={{ fontSize: '8px', opacity: 0.8, fontWeight: 'normal' }}>仇恨0.55 / 效能+10%</div>
                </div>
                {(['back_top', 'back_center', 'back_bottom'] as GridSlotId[]).map(slotId => (
                  <SlotBox
                    key={slotId}
                    slotId={slotId}
                    occupant={getSlotHero(slotId)}
                    isSelected={selectedHeroId ? getSlotHero(slotId)?.id === selectedHeroId : false}
                    onClick={() => handleSlotClick(slotId)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 出战队伍成员快速点选栏 */}
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
              🛡️ 首发出战先遣队（{party.length}/4 人）：
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {party.map(hero => {
                const slot = getHeroSlot(hero.id);
                const slotMeta = GRID_SLOTS.find(s => s.id === slot);
                const isSelected = selectedHeroId === hero.id;

                const roleBadge = hero.role === 'tank' ? '🛡️' : hero.role === 'healer' ? '🌿' : '⚔️';
                return (
                  <div
                    key={hero.id}
                    onClick={() => setSelectedHeroId(isSelected ? null : hero.id)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? 'rgba(217, 119, 6, 0.35)' : '#1e293b',
                      border: isSelected ? '2px solid #facc15' : '1px solid #334155',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: isSelected ? '0 0 10px rgba(250, 204, 21, 0.5)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {roleBadge} {hero.name}
                    </div>
                    <div style={{ fontSize: '9px', color: '#eab308', marginTop: '2px' }}>
                      {slotMeta ? slotMeta.name : '未布阵'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 替补席：待命队员（招募来的新人 / 轮换替补） */}
          {reserveHeroes.length > 0 && (
            <div style={{ marginTop: '2px', paddingTop: '8px', borderTop: '1px dashed #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 'bold' }}>
                  💤 驻营待命替补席（{reserveHeroes.length} 人）：
                </span>
                <span style={{ fontSize: '9px', color: '#94a3b8' }}>
                  点击替补再点棋盘，直接轮换上阵
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {reserveHeroes.map(hero => {
                  const isSelected = selectedHeroId === hero.id;
                  const roleBadge = hero.role === 'tank' ? '🛡️' : hero.role === 'healer' ? '🌿' : '⚔️';

                  return (
                    <div
                      key={hero.id}
                      onClick={() => setSelectedHeroId(isSelected ? null : hero.id)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? 'rgba(167, 139, 250, 0.35)' : 'rgba(30, 41, 59, 0.6)',
                        border: isSelected ? '2px solid #c084fc' : '1px dashed #475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: isSelected ? '0 0 10px rgba(192, 132, 252, 0.5)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {roleBadge} {hero.name}
                      </div>
                      <div style={{ fontSize: '9px', color: '#c084fc', marginTop: '2px' }}>
                        点选换上 🔁
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* 底部按钮 */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#1e293b',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '6px 18px',
              backgroundColor: '#d97706',
              border: 'none',
              borderRadius: '6px',
              color: '#0f172a',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            完成布阵
          </button>
        </div>
      </div>
    </div>
  );
};
