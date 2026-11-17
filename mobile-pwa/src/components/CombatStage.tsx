import React, { useMemo } from 'react';
import type { CombatUnit } from '../engine/combatEngine';
import type { UnitVisualState, FloatingTextItem, UltCinematicEvent } from '../types/combatVisual';
import type { StageTheme } from '../config/stageThemes';
import { STAGE_THEMES } from '../config/stageThemes';
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
  onSwapPlayerSlot?: (heroIdA: string, heroIdB: string) => void; // 战前可对调站位
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
  onTriggerUlt
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

  // 渲染单个棋盘格子
  const renderSlot = (slotId: GridSlotId, side: 'player' | 'enemy') => {
    const unit = side === 'player' ? playerUnitMap[slotId] : enemyUnitMap[slotId];
    const isFocused = unit && focusedTargetId === unit.hero.id;

    return (
      <div
        key={slotId}
        id={`slot_${side}_${slotId}`}
        style={{
          width: '74px',
          height: '78px',
          borderRadius: '8px',
          background: 'rgba(15, 23, 42, 0.45)',
          border: `1px dashed ${side === 'player' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
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
            {/* 跳字挂载在棋子上方 */}
            <div
              style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                pointerEvents: 'none',
                zIndex: 40
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

      {/* 5. 战场头部信息栏 */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.35)',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>🛡️ 蓝方先遣阵</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            ({playerUnits.filter(u => !u.isDead).length}/4 存活)
          </span>
        </div>
        <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '1px' }}>
          ⚔️ 战术交锋线 ⚔️
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            ({enemyUnits.filter(u => !u.isDead).length} 敌对)
          </span>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f87171' }}>红方据守阵 ⚔️</span>
        </div>
      </div>

      {/* 6. 双向 3x3 自走棋微缩战场核心网格 */}
      <div
        style={{
          position: 'relative',
          padding: '12px 6px',
          minHeight: '270px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          gap: '4px'
        }}
      >
        {/* 左侧：玩家 3x3 棋盘 (列次序：后排 back -> 中排 mid -> 前排 front，迎向交火线) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ROWS.map(row => (
            <div key={`p_row_${row}`} style={{ display: 'flex', gap: '6px' }}>
              {renderSlot(`back_${row}` as GridSlotId, 'player')}
              {renderSlot(`mid_${row}` as GridSlotId, 'player')}
              {renderSlot(`front_${row}` as GridSlotId, 'player')}
            </div>
          ))}
        </div>

        {/* 核心中线交火带 (No Man's Land) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '240px',
            borderLeft: '1px dashed rgba(255,255,255,0.12)',
            borderRight: '1px dashed rgba(255,255,255,0.12)',
            background: 'linear-gradient(to bottom, transparent, rgba(234, 179, 8, 0.08), transparent)'
          }}
        >
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', writingMode: 'vertical-rl' }}>
            前沿阻截
          </span>
        </div>

        {/* 右侧：敌方 3x3 棋盘 (列次序：前排 front -> 中排 mid -> 后排 back，迎向玩家) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ROWS.map(row => (
            <div key={`e_row_${row}`} style={{ display: 'flex', gap: '6px' }}>
              {renderSlot(`front_${row}` as GridSlotId, 'enemy')}
              {renderSlot(`mid_${row}` as GridSlotId, 'enemy')}
              {renderSlot(`back_${row}` as GridSlotId, 'enemy')}
            </div>
          ))}
        </div>
      </div>

      {/* 底部战场阵列标注 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 14px 6px 14px',
          fontSize: '9px',
          color: '#64748b',
          background: 'rgba(0,0,0,0.5)',
          borderTop: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <span>后卫 ➔ 中坚 ➔ 前锋</span>
        <span style={{ color: '#eab308' }}>点击敌方棋子可手动集火</span>
        <span>前锋 ➔ 中坚 ➔ 后卫</span>
      </div>
    </div>
  );
};
