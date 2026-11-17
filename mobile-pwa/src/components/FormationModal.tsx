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
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  const warnings = validateFormationHealth(party, assignments);

  // 获取英雄当前所在格子
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
      const occupant = getSlotHero(targetSlotId);
      if (occupant) {
        setSelectedHeroId(occupant.id);
      }
      return;
    }

    const existingOccupant = getSlotHero(targetSlotId);
    const sourceSlot = getHeroSlot(selectedHeroId);

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

  const selectedHero = party.find(h => h.id === selectedHeroId);

  // 统计前中后排人数
  const counts = { front: 0, mid: 0, back: 0 };
  for (const a of assignments) {
    const meta = GRID_SLOTS.find(s => s.id === a.slotId);
    if (meta) counts[meta.col]++;
  }

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
          border: '1px solid #d97706',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 0 15px rgba(217, 119, 6, 0.25)',
          overflow: 'hidden',
          color: '#f8fafc',
          boxSizing: 'border-box',
        }}
      >
        {/* 顶部标题栏 */}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📐</span>
            <span style={{ fontWeight: 'bold', color: '#fde047', fontSize: '14px', letterSpacing: '0.5px' }}>
              战术阵型沙盘
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                color: '#facc15',
                border: '1px solid rgba(234, 179, 8, 0.3)',
              }}
            >
              3×3 战术网格
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#334155',
              border: '1px solid #475569',
              color: '#cbd5e1',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ✕ 关闭
          </button>
        </div>

        {/* 主体滚动区 */}
        <div style={{ padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 阵型极简预设胶囊标签栏 */}
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>⚡ 预设阵型（点击套用）</span>
              <span style={{ color: '#eab308' }}>当前：{FORMATION_PRESETS[currentPreset]?.name || '自由'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {(Object.keys(FORMATION_PRESETS) as FormationPresetId[]).map(id => {
                const p = FORMATION_PRESETS[id];
                const isActive = currentPreset === id;
                return (
                  <button
                    key={id}
                    onClick={() => onApplyPreset(id)}
                    style={{
                      padding: '6px 2px',
                      borderRadius: '6px',
                      border: isActive ? '1px solid #facc15' : '1px solid #334155',
                      backgroundColor: isActive ? 'rgba(202, 138, 4, 0.35)' : '#1e293b',
                      color: isActive ? '#fef08a' : '#cbd5e1',
                      fontSize: '11px',
                      fontWeight: isActive ? 'bold' : 'normal',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                marginTop: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                fontSize: '10px',
                color: '#cbd5e1',
                lineHeight: '1.4',
              }}
            >
              <span style={{ color: '#facc15', fontWeight: 'bold' }}>
                【{FORMATION_PRESETS[currentPreset]?.name}】
              </span>
              {FORMATION_PRESETS[currentPreset]?.description}
            </div>
          </div>

          {/* 警报提示（如有） */}
          {warnings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {warnings.map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: w.level === 'danger' ? 'rgba(159, 18, 57, 0.4)' : 'rgba(120, 53, 15, 0.4)',
                    border: w.level === 'danger' ? '1px solid #e11d48' : '1px solid #d97706',
                    color: w.level === 'danger' ? '#fecdd3' : '#fed7aa',
                  }}
                >
                  <span>{w.level === 'danger' ? '⚠️' : 'ℹ️'}</span>
                  <span>
                    <strong>{w.title}：</strong>{w.detail}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 3×3 战术棋盘拟真区 */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: '#facc15',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>⚔️ 敌军来袭方向 ➔</span>
              <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                {selectedHero ? `💡 准备安放：${selectedHero.name}` : '💡 轻触队员拿起，再选目标格子交换'}
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

          {/* 出战队员快速点选栏 */}
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
              👥 出战队伍成员（点击亦可直接选中）：
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
        </div>

        {/* 底部按钮栏 */}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#1e293b',
            borderTop: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            已部署 <strong style={{ color: '#facc15' }}>{assignments.length}</strong> / {party.length} 人
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 18px',
              backgroundColor: '#d97706',
              color: '#0f172a',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            确认布阵
          </button>
        </div>
      </div>
    </div>
  );
};

// 单个战术棋盘格子
const SlotBox: React.FC<{
  slotId: GridSlotId;
  occupant?: Hero;
  isSelected?: boolean;
  onClick: () => void;
}> = ({ slotId, occupant, isSelected, onClick }) => {
  const meta = GRID_SLOTS.find(s => s.id === slotId);

  // 角色背景与色彩标识
  const roleColor = occupant
    ? occupant.role === 'tank'
      ? '#f59e0b'
      : occupant.role === 'healer'
      ? '#10b981'
      : '#f43f5e'
    : '#475569';

  return (
    <div
      onClick={onClick}
      style={{
        height: '68px',
        borderRadius: '8px',
        border: isSelected
          ? '2px solid #facc15'
          : occupant
          ? `1px solid ${roleColor}`
          : '1px dashed #334155',
        backgroundColor: isSelected
          ? 'rgba(234, 179, 8, 0.25)'
          : occupant
          ? '#1e293b'
          : 'rgba(15, 23, 42, 0.5)',
        boxShadow: isSelected
          ? '0 0 12px rgba(250, 204, 21, 0.6)'
          : occupant
          ? '0 2px 4px rgba(0,0,0,0.4)'
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '4px',
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease',
      }}
    >
      {/* 顶部：位置标签与角色标识 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
        <span style={{ color: '#64748b' }}>{meta?.name.slice(-1)}位</span>
        {occupant && (
          <span
            style={{
              padding: '1px 3px',
              borderRadius: '2px',
              fontSize: '8px',
              fontWeight: 'bold',
              backgroundColor: `${roleColor}33`,
              color: roleColor,
              border: `1px solid ${roleColor}66`,
            }}
          >
            {occupant.role === 'tank' ? '盾' : occupant.role === 'healer' ? '医' : '刃'}
          </span>
        )}
      </div>

      {/* 中部：角色名与职业 */}
      {occupant ? (
        <div style={{ textAlign: 'center', margin: 'auto 0' }}>
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '11px',
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {occupant.name}
          </div>
          <div
            style={{
              fontSize: '9px',
              color: '#94a3b8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {heroRoleLabel(occupant).replace('「', '').replace('」', '')}
          </div>
        </div>
      ) : (
        <div
          style={{
            margin: 'auto 0',
            textAlign: 'center',
            fontSize: '11px',
            color: '#475569',
          }}
        >
          + 空
        </div>
      )}
    </div>
  );
};
