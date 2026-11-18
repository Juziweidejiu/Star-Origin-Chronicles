import React, { useMemo, useLayoutEffect, useRef, useState } from 'react';
import type { CombatUnit } from '../engine/combatEngine';
import type { StageTheme } from '../config/stageThemes';
import { STAGE_THEMES, stageThemeVars } from '../config/stageThemes';
import type { FloatingTextItem, UltCinematicEvent, UnitVisualState } from '../types/combatVisual';
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

const ROW_INDEX: Record<string, number> = { top: 1, center: 2, bottom: 3 };
const ENEMY_COL: Record<string, number> = { back: 1, mid: 2, front: 3 };
const PLAYER_COL: Record<string, number> = { front: 1, mid: 2, back: 3 };

interface Placement {
  unit: CombatUnit;
  area: string;
  cells: string[];
}

/** 把一个阵地的单位排进隐形 3×3：首领占 2×2，其余各占 1 格，冲突时就近让位 */
function layoutSide(units: CombatUnit[], side: 'player' | 'enemy'): Placement[] {
  const occupied = new Set<string>();
  const out: Placement[] = [];

  const boss = side === 'enemy' ? units.find(u => u.hero.name.startsWith('👑')) : undefined;
  if (boss) {
    const cells = ['2-2', '2-3', '3-2', '3-3'];
    cells.forEach(c => occupied.add(c));
    out.push({ unit: boss, area: '2 / 2 / 4 / 4', cells });
  }

  const others = units.filter(u => u !== boss);
  const spread = others.length <= 1 ? [2] : others.length === 2 ? [1, 3] : [1, 2, 3];

  others.forEach((unit, i) => {
    const [col, row] = (unit.slotId || 'mid_center').split('_');
    const rowIdx = ROW_INDEX[row] ?? 2;
    // 敌人少于三人时，按列对称铺开，避免全挤在一侧
    const colIdx = side === 'enemy' ? (spread[i] ?? ENEMY_COL[col] ?? 2) : (PLAYER_COL[col] ?? 2);

    let key = `${rowIdx}-${colIdx}`;
    if (occupied.has(key)) {
      const candidates: Array<[number, number]> = [];
      for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) candidates.push([r, c]);
      candidates.sort(
        (a, b) =>
          Math.abs(a[0] - rowIdx) + Math.abs(a[1] - colIdx) - (Math.abs(b[0] - rowIdx) + Math.abs(b[1] - colIdx)),
      );
      const free = candidates.find(([r, c]) => !occupied.has(`${r}-${c}`));
      if (free) key = `${free[0]}-${free[1]}`;
    }
    occupied.add(key);
    const [r, c] = key.split('-').map(Number);
    out.push({ unit, area: `${r} / ${c} / ${r + 1} / ${c + 1}`, cells: [key] });
  });
  return out;
}

const CELLS: Array<[number, number]> = [
  [1, 1], [1, 2], [1, 3],
  [2, 1], [2, 2], [2, 3],
  [3, 1], [3, 2], [3, 3],
];

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
  resultOverlay,
}) => {
  const env = useMemo(() => STAGE_THEMES[theme] || STAGE_THEMES.catacomb, [theme]);
  const stageRef = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<Record<string, { x: number; y: number }>>({});

  const playerLayout = useMemo(() => layoutSide(playerUnits, 'player'), [playerUnits]);
  const enemyLayout = useMemo(() => layoutSide(enemyUnits, 'enemy'), [enemyUnits]);

  // 集火目标占的格子：点亮提示，但格线仍然不画出来
  const focusCells = useMemo(() => {
    if (!focusedTargetId) return new Set<string>();
    const hit = [...playerLayout, ...enemyLayout].find(p => p.unit.hero.id === focusedTargetId);
    return new Set(hit ? hit.cells : []);
  }, [focusedTargetId, playerLayout, enemyLayout]);

  // 量一次棋子中心，作为远程弹道的起点与终点
  useLayoutEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const next: Record<string, { x: number; y: number }> = {};
    [...playerLayout, ...enemyLayout].forEach(({ unit }) => {
      if (!unit.slotId) return;
      const el = root.querySelector<HTMLElement>(`[data-anchor="${unit.slotId}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      next[unit.slotId] = {
        x: r.left - box.left + r.width / 2,
        y: r.top - box.top + r.height * 0.55,
      };
    });
    setAnchors(next);
  }, [playerLayout, enemyLayout]);

  const resolvedProjectiles = useMemo(
    () =>
      projectiles.map(p => ({
        ...p,
        startX: anchors[p.sourceSlotId]?.x ?? p.startX,
        startY: anchors[p.sourceSlotId]?.y ?? p.startY,
        targetX: anchors[p.targetSlotId]?.x ?? p.targetX,
        targetY: anchors[p.targetSlotId]?.y ?? p.targetY,
      })),
    [projectiles, anchors],
  );

  const enemyAlive = enemyUnits.filter(u => !u.isDead).length;
  const playerAlive = playerUnits.filter(u => !u.isDead).length;

  const renderUnit = ({ unit, area }: Placement) => {
    const isFocus = focusedTargetId === unit.hero.id;
    return (
      <div
        key={`${unit.side}_${unit.slotId}_${unit.hero.id}`}
        data-anchor={unit.slotId}
        style={{ gridArea: area, position: 'relative' }}
      >
        <BattlePawn
          unit={unit}
          visualState={{ ...visualStates[unit.hero.id], focused: isFocus }}
          onFocus={() => {
            if (unit.side === 'enemy') {
              onSelectTarget(unit);
            } else if (!isAutoUlt && unit.resource >= 100) {
              onTriggerUlt(unit);
            }
          }}
        />
        <div style={{ position: 'absolute', top: -4, left: '50%', zIndex: 100, pointerEvents: 'none' }}>
          <FloatingCombatText items={floatingTexts.filter(t => t.targetId === unit.hero.id)} />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={stageRef}
      className={`cs-stage${isScreenShaking ? ' is-shaking' : ''}`}
      style={stageThemeVars(env)}
    >
      <div className="cs-backwall" />

      {/* 顶部细信息条：贴在墙上，不占战场高度 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '3px 10px',
          fontSize: '9px',
          color: 'rgba(243,233,209,.62)',
          pointerEvents: 'none',
          letterSpacing: '.04em',
        }}
      >
        <span>敌方 {enemyAlive} 名</span>
        <span>我方 {playerAlive}/{playerUnits.length || 4} · 点敌人锁定集火</span>
      </div>

      {/* 敌方阵地 */}
      <div className="cs-zone cs-zone--enemy">
        {CELLS.map(([r, c]) => (
          <div
            key={`e_${r}_${c}`}
            className={`cs-cell${focusCells.has(`${r}-${c}`) ? ' is-aim' : ''}`}
            style={{ gridArea: `${r} / ${c} / ${r + 1} / ${c + 1}` }}
          />
        ))}
        {enemyLayout.map(renderUnit)}
      </div>

      {/* 中间空地：打过仗的同一块地面 */}
      <div className="cs-clash" aria-hidden="true">
        <svg viewBox="0 0 390 56" preserveAspectRatio="none">
          <g stroke="rgba(42,36,24,.20)" fill="none" strokeWidth="1.2" strokeLinecap="round">
            <path d="M226 44 l16 5 l-6 6" />
            <path d="M262 46 l10 4" />
            <path d="M96 47 l14 4" />
          </g>
          <g stroke="rgba(42,36,24,.36)" strokeLinecap="round" fill="none">
            <path d="M30 46 L88 33" strokeWidth="2.4" />
            <path d="M318 50 L330 14" strokeWidth="2.2" />
          </g>
          <path d="M88 33 l9 -3.2 l-3.2 8 Z" fill="rgba(42,36,24,.34)" />
          <path d="M330 14 l5.4 -9 l2.6 10.4 Z" fill="rgba(42,36,24,.30)" />
          <ellipse cx="58" cy="46" rx="26" ry="2.4" fill="rgba(42,36,24,.09)" />
          <ellipse cx="318" cy="51" rx="9" ry="2.6" fill="rgba(42,36,24,.18)" />
          <path
            d="M146 47 q13 -13 26 -1 q-13 7 -26 1 Z"
            fill="rgba(138,59,50,.16)"
            stroke="rgba(138,59,50,.30)"
            strokeWidth="1.2"
          />
          <path d="M159 34 l0 12" stroke="rgba(138,59,50,.26)" strokeWidth="1" />
          <path d="M196 46 q22 5 44 2" stroke="rgba(138,59,50,.18)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <g fill="rgba(42,36,24,.24)">
            <ellipse cx="112" cy="40" rx="2.4" ry="1.4" />
            <ellipse cx="204" cy="43" rx="1.8" ry="1" />
            <ellipse cx="248" cy="36" rx="1.5" ry=".9" />
            <ellipse cx="352" cy="41" rx="2.1" ry="1.2" />
          </g>
        </svg>
        <span className="cs-mote" style={{ left: '22%', bottom: '26%', animationDelay: '.2s' }} />
        <span className="cs-mote" style={{ left: '47%', bottom: '40%', animationDelay: '2.6s' }} />
        <span className="cs-mote" style={{ left: '71%', bottom: '22%', animationDelay: '4.4s' }} />
      </div>

      {/* 我方阵地 */}
      <div className="cs-zone cs-zone--player">
        {CELLS.map(([r, c]) => (
          <div key={`p_${r}_${c}`} className="cs-cell" style={{ gridArea: `${r} / ${c} / ${r + 1} / ${c + 1}` }} />
        ))}
        {playerLayout.map(renderUnit)}
      </div>

      {/* 特效层 */}
      <div className="cs-fx">
        <CombatProjectiles projectiles={resolvedProjectiles} />
      </div>

      {ultEvent && <UltCinematicOverlay event={ultEvent} />}

      {resultOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '16px 14px calc(84px + env(safe-area-inset-bottom, 0px))',
            overflowY: 'auto',
            background: 'rgba(42,36,24,.52)',
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn .22s ease-out',
          }}
        >
          <div style={{ width: '100%', maxWidth: '390px', margin: 'auto' }}>{resultOverlay}</div>
        </div>
      )}
    </div>
  );
};
