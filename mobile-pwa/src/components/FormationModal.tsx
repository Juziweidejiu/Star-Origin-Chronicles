import React, { useState } from 'react';
import { Leaf, Shield, Swords, X } from 'lucide-react';
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

/** 职业 → 图标与色，避免 emoji 跨平台观感不一 */
const ROLE_STYLE: Record<string, { color: string; tint: string }> = {
  tank: { color: '#2F6E8F', tint: 'rgba(47,110,143,.12)' },
  healer: { color: '#3F6B4E', tint: 'rgba(111,191,139,.14)' },
  dps: { color: '#8A3B32', tint: 'rgba(138,59,50,.10)' },
};

const RoleIcon: React.FC<{ role: string; size?: number }> = ({ role, size = 15 }) => {
  if (role === 'tank') return <Shield size={size} />;
  if (role === 'healer') return <Leaf size={size} />;
  return <Swords size={size} />;
};

/** 三条战线的说明（前排承伤 / 中排机动 / 后排施法） */
const LINES: { col: 'front' | 'mid' | 'back'; label: string; hint: string; color: string; tint: string }[] = [
  { col: 'front', label: '前排 · 防守线', hint: '仇恨 4.5 / 承伤 −10%', color: '#8A3B32', tint: 'rgba(138,59,50,.10)' },
  { col: 'mid', label: '中排 · 机动线', hint: '仇恨 1.2 / 暴击 +5%', color: '#2F6E8F', tint: 'rgba(47,110,143,.10)' },
  { col: 'back', label: '后排 · 施法线', hint: '仇恨 0.55 / 效能 +10%', color: '#3F6B4E', tint: 'rgba(111,191,139,.12)' },
];

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
  }> = ({ occupant, isSelected, onClick }) => {
    const isTargetForSwap = Boolean(selectedHeroId && occupant && selectedHeroId !== occupant.id);
    const selectedIsReserve = selectedHeroId ? isHeroInReserve(selectedHeroId) : false;
    const role = occupant ? (ROLE_STYLE[occupant.role] ? occupant.role : 'dps') : 'dps';
    const rs = ROLE_STYLE[role];

    return (
      <div
        onClick={onClick}
        style={{
          height: '70px',
          borderRadius: 'var(--pz-r-btn)',
          padding: '4px',
          background: isSelected
            ? 'rgba(138,59,50,.10)'
            : occupant
              ? 'var(--pz-page)'
              : 'transparent',
          border: isSelected
            ? '1.5px solid var(--pz-wine)'
            : isTargetForSwap && selectedIsReserve
              ? '1.5px dashed var(--pz-brass)'
              : occupant
                ? '1px solid var(--pz-line)'
                : '1px dashed var(--pz-line-2)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'background .15s, border-color .15s',
        }}
      >
        {occupant ? (
          <>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: rs.tint,
                border: `1px solid ${rs.color}`,
                color: rs.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '3px',
              }}
            >
              <RoleIcon role={role} />
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--pz-ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '76px',
                textAlign: 'center',
              }}
            >
              {occupant.name}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--pz-ink-3)' }}>
              {heroRoleLabel(occupant)}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '10px', color: 'var(--pz-ink-3)', textAlign: 'center' }}>
            空位
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
        background: 'rgba(42,36,24,.62)',
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
          background: 'var(--pz-raised)',
          border: '1px solid var(--pz-line-2)',
          borderRadius: 'var(--pz-r-card)',
          width: '100%',
          maxWidth: '420px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 18px 44px rgba(42,36,24,.34)',
          overflow: 'hidden',
          animation: 'riseIn .2s ease-out',
        }}
      >
        {/* 顶栏：深木 + 黄铜细线 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'linear-gradient(180deg, #3A2E1F 0%, #2A2115 100%)',
            borderBottom: '1px solid rgba(217,164,91,.45)',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--pz-serif)',
                fontSize: '15px',
                color: '#F3E9D1',
                letterSpacing: '.02em',
              }}
            >
              战术阵型
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(243,233,209,.55)', marginTop: '2px' }}>
              先点人，再点格子；替补可直接换下主力
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{
              padding: '4px',
              background: 'transparent',
              border: '1px solid rgba(243,233,209,.22)',
              borderRadius: 'var(--pz-r-seal)',
              color: 'rgba(243,233,209,.7)',
              cursor: 'pointer',
              display: 'flex',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* 中间内容滚动区 */}
        <div style={{ padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* 一键预设阵型选择器 */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '.16em', color: 'var(--pz-ink-3)', marginBottom: '6px' }}>
              阵型预设
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
                      borderRadius: 'var(--pz-r-seal)',
                      border: isActive ? '1px solid var(--pz-wine)' : '1px solid var(--pz-line)',
                      background: isActive ? 'rgba(138,59,50,.10)' : 'var(--pz-page)',
                      color: isActive ? 'var(--pz-wine)' : 'var(--pz-ink-2)',
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'var(--pz-sans)',
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
                background: 'rgba(138,59,50,.08)',
                border: '1px solid rgba(138,59,50,.35)',
                borderRadius: 'var(--pz-r-btn)',
                padding: '7px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              {warnings.map((w, idx) => (
                <div key={idx} style={{ fontSize: '11px', lineHeight: 1.5, color: 'var(--pz-wine)' }}>
                  {w.title}：{w.detail}
                </div>
              ))}
            </div>
          )}

          {/* 3×3 战棋九宫格布局 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', gap: '8px' }}>
              <span style={{ fontSize: '10px', letterSpacing: '.16em', color: 'var(--pz-ink-3)' }}>
                战地阵列
              </span>
              <span style={{ fontSize: '10px', color: 'var(--pz-brass-deep)', textAlign: 'right' }}>
                {selectedHeroId
                  ? isHeroInReserve(selectedHeroId)
                    ? '点一个主力，把这位换上去'
                    : '点目标格子完成换位'
                  : '点棋盘上的单位可选中'}
              </span>
            </div>

            {/* 棋盘主体 (3 列) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: 'var(--pz-sunken)',
                padding: '10px',
                borderRadius: 'var(--pz-r-btn)',
                border: '1px solid var(--pz-line)',
              }}
            >
              {LINES.map(line => {
                const slots: GridSlotId[] =
                  line.col === 'front'
                    ? ['front_top', 'front_center', 'front_bottom']
                    : line.col === 'mid'
                      ? ['mid_top', 'mid_center', 'mid_bottom']
                      : ['back_top', 'back_center', 'back_bottom'];
                const empty = counts[line.col] === 0;

                return (
                  <div key={line.col} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div
                      style={{
                        padding: '4px 2px',
                        textAlign: 'center',
                        borderRadius: 'var(--pz-r-seal)',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: empty && line.col === 'front' ? 'rgba(138,59,50,.14)' : line.tint,
                        border: `1px solid ${empty && line.col === 'front' ? 'rgba(138,59,50,.5)' : line.color + '44'}`,
                        color: empty && line.col === 'front' ? 'var(--pz-wine)' : line.color,
                      }}
                    >
                      {empty && line.col === 'front' ? '前排无人' : line.label}
                      <div style={{ fontSize: '8px', opacity: 0.82, fontWeight: 400, marginTop: '1px' }}>
                        {line.hint}
                      </div>
                    </div>
                    {slots.map(slotId => (
                      <SlotBox
                        key={slotId}
                        slotId={slotId}
                        occupant={getSlotHero(slotId)}
                        isSelected={selectedHeroId ? getSlotHero(slotId)?.id === selectedHeroId : false}
                        onClick={() => handleSlotClick(slotId)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 出战队伍成员快速点选栏 */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '.16em', color: 'var(--pz-ink-3)', marginBottom: '6px' }}>
              首发出战 · {party.length}/4
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {party.map(hero => {
                const slot = getHeroSlot(hero.id);
                const slotMeta = GRID_SLOTS.find(s => s.id === slot);
                const isSelected = selectedHeroId === hero.id;
                const role = ROLE_STYLE[hero.role] ? hero.role : 'dps';
                const rs = ROLE_STYLE[role];

                return (
                  <div
                    key={hero.id}
                    onClick={() => setSelectedHeroId(isSelected ? null : hero.id)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: 'var(--pz-r-seal)',
                      background: isSelected ? 'rgba(138,59,50,.10)' : 'var(--pz-page)',
                      border: isSelected ? '1.5px solid var(--pz-wine)' : '1px solid var(--pz-line)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isSelected ? 'var(--pz-wine)' : 'var(--pz-ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ color: rs.color, display: 'flex' }}>
                        <RoleIcon role={role} size={12} />
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{hero.name}</span>
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--pz-ink-3)', marginTop: '2px' }}>
                      {slotMeta ? slotMeta.name : '未布阵'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 替补席：待命队员（招募来的新人 / 轮换替补） */}
          {reserveHeroes.length > 0 && (
            <div style={{ paddingTop: '8px', borderTop: '1px dashed var(--pz-line-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', gap: '8px' }}>
                <span style={{ fontSize: '10px', letterSpacing: '.16em', color: 'var(--pz-ink-3)' }}>
                  驻营待命 · {reserveHeroes.length}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--pz-ink-3)' }}>
                  点替补再点棋盘即可换上
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {reserveHeroes.map(hero => {
                  const isSelected = selectedHeroId === hero.id;
                  const role = ROLE_STYLE[hero.role] ? hero.role : 'dps';
                  const rs = ROLE_STYLE[role];

                  return (
                    <div
                      key={hero.id}
                      onClick={() => setSelectedHeroId(isSelected ? null : hero.id)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: 'var(--pz-r-seal)',
                        background: isSelected ? 'rgba(155,123,212,.12)' : 'transparent',
                        border: isSelected ? '1.5px solid var(--pz-arcane)' : '1px dashed var(--pz-line-2)',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isSelected ? 'var(--pz-arcane)' : 'var(--pz-ink-2)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                        }}
                      >
                        <span style={{ color: rs.color, display: 'flex' }}>
                          <RoleIcon role={role} size={12} />
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{hero.name}</span>
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--pz-ink-3)', marginTop: '2px' }}>
                        {heroRoleLabel(hero)} · 换上
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* 底部按钮（固定不滚动） */}
        <div
          style={{
            padding: '10px 14px calc(10px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--pz-line)',
            background: 'var(--pz-sunken)',
            flexShrink: 0,
          }}
        >
          <button className="pz-btn pz-btn--main pz-btn--block" onClick={onClose}>
            完成布阵
          </button>
        </div>
      </div>
    </div>
  );
};
