import React, { useMemo } from 'react';
import type { CombatUnit } from '../engine/combatEngine';
import type { UnitVisualState, FloatingTextItem, UltCinematicEvent } from '../types/combatVisual';
import type { StageTheme } from '../config/stageThemes';
import { STAGE_THEMES } from '../config/stageThemes';
import { CombatActorCard } from './CombatActorCard';
import { FloatingCombatText } from './FloatingCombatText';
import { UltCinematicOverlay } from './UltCinematicOverlay';

interface CombatStageProps {
  theme: StageTheme;
  playerUnits: CombatUnit[];
  enemyUnits: CombatUnit[];
  visualStates: Record<string, UnitVisualState>;
  floatingTexts: FloatingTextItem[];
  ultEvent: UltCinematicEvent | null;
  focusedTargetId: string | null;
  isAutoUlt: boolean;
  isScreenShaking?: boolean;
  onSelectTarget: (unit: CombatUnit) => void;
  onTriggerUlt: (unit: CombatUnit) => void;
}

export const CombatStage: React.FC<CombatStageProps> = ({
  theme,
  playerUnits,
  enemyUnits,
  visualStates,
  floatingTexts,
  ultEvent,
  focusedTargetId,
  isAutoUlt,
  isScreenShaking = false,
  onSelectTarget,
  onTriggerUlt,
}) => {
  const currentTheme = useMemo(() => STAGE_THEMES[theme] || STAGE_THEMES.catacomb, [theme]);

  // 按前后排划分站位（形成错落纵深）
  const playerSorted = useMemo(() => {
    // 依阵型前后排纵深排列 (front -> mid -> back)
    return [...playerUnits].sort((a, b) => {
      const order = { front: 0, mid: 1, back: 2 };
      return order[a.col] - order[b.col];
    });
  }, [playerUnits]);

  const enemySorted = useMemo(() => {
    // 敌方同样排布 (front -> mid -> back)
    return [...enemyUnits].sort((a, b) => {
      const order = { front: 0, mid: 1, back: 2 };
      return order[a.col] - order[b.col];
    });
  }, [enemyUnits]);

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
      }}
    >
      <style>{`
        @keyframes ambientPulse {
          0% { opacity: 0.5; }
          50% { opacity: 0.9; }
          100% { opacity: 0.5; }
        }
      `}</style>

      {/* 1. 地牢远景与暗角层 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: currentTheme.vignetteColor,
          pointerEvents: 'none',
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
          pointerEvents: 'none',
          animation: 'ambientPulse 4s infinite ease-in-out',
        }}
      />

      {/* 3. 战场对峙舞台区域 */}
      <div
        style={{
          position: 'relative',
          padding: '12px 8px',
          minHeight: '260px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          zIndex: 10,
        }}
      >
        {/* 左侧：我方先遣阵地 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              fontSize: '11px',
              color: '#38bdf8',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              paddingLeft: '2px',
            }}
          >
            <span>🛡️ 先遣阵列</span>
            <span style={{ fontSize: '9px', color: '#64748b' }}>({playerUnits.filter(u => !u.isDead).length}人存活)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {playerSorted.map(unit => {
              const canUlt = unit.resource >= 100 && !unit.isDead;
              return (
                <div key={unit.hero.id} style={{ position: 'relative' }}>
                  <CombatActorCard
                    unit={unit}
                    visualState={visualStates[unit.hero.id]}
                    canUlt={canUlt}
                    isAutoUlt={isAutoUlt}
                    onTriggerUlt={onTriggerUlt}
                  />
                  {/* 该角色对应的跳字锚点 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0px',
                      left: '50%',
                      pointerEvents: 'none',
                    }}
                  >
                    <FloatingCombatText
                      items={floatingTexts.filter(t => t.targetId === unit.hero.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：敌方悬赏阵地 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              fontSize: '11px',
              color: '#ef4444',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '4px',
              paddingRight: '2px',
            }}
          >
            <span style={{ fontSize: '9px', color: '#64748b' }}>({enemyUnits.filter(u => !u.isDead).length}敌对)</span>
            <span>敌阵目标 ⚔️</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {enemySorted.map(unit => {
              const isFocused = focusedTargetId === unit.hero.id;
              return (
                <div key={unit.hero.id} style={{ position: 'relative' }}>
                  <CombatActorCard
                    unit={unit}
                    visualState={visualStates[unit.hero.id]}
                    isFocused={isFocused}
                    onSelectTarget={onSelectTarget}
                  />
                  {/* 该角色对应的跳字锚点 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0px',
                      left: '50%',
                      pointerEvents: 'none',
                    }}
                  >
                    <FloatingCombatText
                      items={floatingTexts.filter(t => t.targetId === unit.hero.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. 地坪网格标线 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '42px',
          background: currentTheme.groundGradient,
          borderTop: `1px solid ${currentTheme.gridBorderColor}`,
          pointerEvents: 'none',
          opacity: 0.85,
        }}
      />

      {/* 5. 全屏大招特写横幅与动画 */}
      <UltCinematicOverlay event={ultEvent} />
    </div>
  );
};
