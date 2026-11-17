import React, { useMemo } from 'react';
import type { CombatUnit } from '../engine/combatEngine';
import type { StageTheme } from '../config/stageThemes';
import { STAGE_THEMES } from '../config/stageThemes';
import type { FloatingTextItem, UltCinematicEvent, UnitVisualState } from '../types/combatVisual';
import type { GridSlotId, GridRow } from '../types/formation';
import { BattlePawn } from './BattlePawn';
import { FloatingCombatText } from './FloatingCombatText';
import { UltCinematicOverlay } from './UltCinematicOverlay';
import { CombatProjectiles } from './CombatProjectiles';
import type { Projectile } from './CombatProjectiles';

interface CombatStageProps {
  theme: StageTheme;
  playerUnits: CombatUnit[];
  enemyUnits: CombatUnit[];
  visualStates: Record<string, UnitVisualState>;
  floatingTexts: FloatingTextItem[];
  projectiles?: Projectile[];
  ultEvent: UltCinematicEvent | null;
  focusedTargetId: string | null;
  isAutoUlt: boolean;
  isScreenShaking?: boolean;
  onSelectTarget: (unit: CombatUnit) => void;
  onTriggerUlt: (unit: CombatUnit) => void;
  onSwapPlayerSlot?: (heroIdA: string, heroIdB: string) => void;
  resultOverlay?: React.ReactNode;
}

// 棋盘格行定义：上 (top) / 中 (center) / 下 (bottom)
const ROWS: GridRow[] = ['top', 'center', 'bottom'];

export const CombatStage: React.FC<CombatStageProps> = ({
  theme,
  playerUnits,
  enemyUnits,
  visualStates,
  floatingTexts,
  projectiles = [],
  ultEvent,
  focusedTargetId,
  isAutoUlt,
  isScreenShaking = false,
  onSelectTarget,
  onTriggerUlt,
  resultOverlay
}) => {
  const currentTheme = useMemo(() => STAGE_THEMES[theme] || STAGE_THEMES.catacomb, [theme]);

  // 根据 slotId 索引单位
  const playerUnitMap = useMemo(() => {
    const map: Record<GridSlotId, CombatUnit> = {} as any;
    playerUnits.forEach(u => {
      if (u.slotId) map[u.slotId] = u;
    });
    return map;
  }, [playerUnits]);

  const enemyUnitMap = useMemo(() => {
    const map: Record<GridSlotId, CombatUnit> = {} as any;
    enemyUnits.forEach(u => {
      if (u.slotId) map[u.slotId] = u;
    });
    return map;
  }, [enemyUnits]);

  // 渲染单个棋盘格子 (纵向 3x3 自走棋微缩方格)
  const renderSlot = (slotId: GridSlotId, side: 'player' | 'enemy') => {
    const unit = side === 'player' ? playerUnitMap[slotId] : enemyUnitMap[slotId];
    const isFocused = unit && focusedTargetId === unit.hero.id;

    return (
      <div
        key={slotId}
        id={`slot_${side}_${slotId}`}
        style={{
          width: '74px',
          height: '66px',
          borderRadius: '8px',
          background: side === 'player' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(30, 15, 20, 0.5)',
          border: `1px dashed ${side === 'player' ? 'rgba(56, 189, 248, 0.22)' : 'rgba(248, 113, 113, 0.22)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {unit ? (
          <div style={{ position: 'relative' }}>
            <BattlePawn
              unit={unit}
              visualState={{
                ...visualStates[unit.hero.id],
                focused: isFocused
              }}
              onFocus={() => {
                if (side === 'enemy') {
                  onSelectTarget(unit);
                } else if (!isAutoUlt && unit.resource >= 100) {
                  onTriggerUlt(unit);
                }
              }}
            />
            {/* 伤害与治疗浮动跳字挂载点 */}
            <div
              style={{
                position: 'absolute',
                top: '-6px',
                left: '50%',
                pointerEvents: 'none',
                zIndex: 100
              }}
            >
              <FloatingCombatText
                items={floatingTexts.filter(t => t.targetId === unit.hero.id)}
              />
            </div>
          </div>
        ) : (
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.08)', userSelect: 'none' }}>
            {slotId.split('_')[1] === 'center' ? '•' : ''}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        background: currentTheme.bgGradient,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        marginBottom: '10px',
        transform: isScreenShaking ? 'translate(2px, -2px)' : 'none',
        transition: 'transform 0.08s ease-in-out',
        userSelect: 'none'
      }}
    >
      {/* 1. 地牢环境暗角 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: currentTheme.vignetteColor,
          pointerEvents: 'none'
        }}
      />

      {/* 2. 环境微光流动 */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '20%',
          width: '60%',
          height: '60%',
          borderRadius: '50%',
          background: currentTheme.ambientGlow,
          filter: 'blur(35px)',
          pointerEvents: 'none'
        }}
      />

      {/* 3. 投射物与弹道飞弹层 */}
      <CombatProjectiles projectiles={projectiles} />

      {/* 4. 终极大招黑幕与特写 */}
      {ultEvent && <UltCinematicOverlay event={ultEvent} />}

      {/* 战役结束中央结算卡片 (居中浮层悬浮于战场棋盘正中央) */}
      {resultOverlay && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5, 10, 20, 0.72)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div style={{ width: '100%', maxWidth: '320px' }}>
            {resultOverlay}
          </div>
        </div>
      )}

      {/* 5. 战场头部信息栏：红方据守阵 */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          borderBottom: '1px solid rgba(248, 113, 113, 0.15)',
          background: 'rgba(20, 10, 15, 0.6)',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f87171' }}>⚔️ 红方据守阵</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            ({enemyUnits.filter(u => !u.isDead).length} 敌对)
          </span>
        </div>
        <span style={{ fontSize: '9px', color: '#eab308' }}>点击敌军可锁定集火 🎯</span>
      </div>

      {/* 6. 纵向垂直对垒战场容器 */}
      <div
        style={{
          position: 'relative',
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
          gap: '8px'
        }}
      >
        {/* 上半区：敌方 3x3 阵地 (从上至下：后排 back -> 中排 mid -> 前排 front 向交火线推进) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
          {(['back', 'mid', 'front'] as const).map(col => (
            <div key={`enemy_col_${col}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', color: 'rgba(248,113,113,0.5)', width: '22px', textAlign: 'right' }}>
                {col === 'back' ? '后卫' : col === 'mid' ? '中坚' : '前锋'}
              </span>
              {ROWS.map(row => renderSlot(`${col}_${row}` as GridSlotId, 'enemy'))}
            </div>
          ))}
        </div>

        {/* 中央战术交火线 (No Man's Land) */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 0',
            borderTop: '1px dashed rgba(234, 179, 8, 0.3)',
            borderBottom: '1px dashed rgba(234, 179, 8, 0.3)',
            background: 'linear-gradient(90deg, transparent, rgba(234, 179, 8, 0.12), transparent)'
          }}
        >
          <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '2px' }}>
            ⚔️ 战术交锋线 ⚔️
          </span>
        </div>

        {/* 下半区：我方 3x3 阵地 (从上至下：前排 front -> 中排 mid -> 后排 back 迎击敌阵) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
          {(['front', 'mid', 'back'] as const).map(col => (
            <div key={`player_col_${col}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', color: 'rgba(56,189,248,0.6)', width: '22px', textAlign: 'right' }}>
                {col === 'front' ? '前锋' : col === 'mid' ? '中坚' : '后卫'}
              </span>
              {ROWS.map(row => renderSlot(`${col}_${row}` as GridSlotId, 'player'))}
            </div>
          ))}
        </div>
      </div>

      {/* 底部战场阵列标注：蓝方先遣阵 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          background: 'rgba(10, 20, 30, 0.65)',
          borderTop: '1px solid rgba(56, 189, 248, 0.15)',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>🛡️ 蓝方先遣阵</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            ({playerUnits.filter(u => !u.isDead).length}/4 存活)
          </span>
        </div>
        <span style={{ fontSize: '9px', color: '#64748b' }}>迎击前突 ➔ 稳健防守</span>
      </div>
    </div>
  );
};
