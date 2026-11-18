import React from 'react';
import type { CombatUnit } from '../engine/combatEngine';
import type { UnitVisualState } from '../types/combatVisual';
import type { ClassId } from '../types/hero';
import { heroRoleLabel } from '../engine/heroFactory';

interface BattlePawnProps {
  unit: CombatUnit;
  visualState?: UnitVisualState;
  onFocus?: (unitId: string) => void;
  isInteractable?: boolean;
  isSelected?: boolean;
}

/** 职业武器：只区分剪影轮廓，接立绘时整体替换即可 */
const CLASS_WEAPON: Record<ClassId, 'shield' | 'sword' | 'bow' | 'staff' | 'axe'> = {
  guardian: 'shield',
  warden: 'axe',
  paladin: 'shield',
  blademaster: 'sword',
  ranger: 'bow',
  arcanist: 'staff',
  cleric: 'staff',
  druid: 'staff',
  bard: 'staff',
};

const HERO_BODY = (
  <g>
    <circle cx="30" cy="13" r="8.4" />
    <path d="M20.6 23.4 q9.4 -3.4 18.8 0 l2.2 26.4 q-11.6 3 -23.2 0 Z" />
    <path d="M22.6 49.4 l-3 45.6 h7.4 l3 -29 3 29 h7.4 l-3 -45.6 Z" />
  </g>
);

const MOB_BODY = (
  <g>
    <path d="M10 30 q0 -16 18 -16 q18 0 18 16 l2 22 q-20 5 -40 0 Z" />
    <circle cx="28" cy="15" r="10.4" />
    <path d="M14 5 l3.4 -2 l5 6.2 l-3.6 2 Z" />
    <path d="M42 5 l-3.4 -2 l-5 6.2 l3.6 2 Z" />
    <path d="M17 52 l-1.6 20 h6.6 l1.6 -14 l1.8 14 h6.6 l-1.6 -20 Z" />
  </g>
);

const BOSS_BODY = (
  <g>
    {/* 双耳 */}
    <path d="M40 34 q-4 -22 3 -26 q10 4 12 24 Z" />
    <path d="M104 34 q4 -22 -3 -26 q-10 4 -12 24 Z" />
    {/* 头颅 */}
    <path d="M72 12 q30 0 30 26 q0 20 -30 22 q-30 -2 -30 -22 q0 -26 30 -26 Z" />
    {/* 拱形眉骨 */}
    <path d="M46 32 q12 -10 26 -6 q14 -4 26 6 q-4 -12 -26 -13 q-22 1 -26 13 Z" opacity=".55" />
    {/* 钩喙 */}
    <path d="M72 40 l7 9 l-7 12 l-7 -12 Z" />
    {/* 胸腹羽片 */}
    <path d="M52 62 q20 -8 40 0 q4 8 0 14 q-20 7 -40 0 q-4 -6 0 -14 Z" opacity=".5" />
    {/* 躯干 */}
    <path d="M72 58 q30 3 32 34 q2 34 -4 50 q-28 8 -56 0 q-6 -16 -4 -50 q2 -31 32 -34 Z" />
    {/* 前肢 */}
    <path d="M40 78 q-8 14 -6 30 q1 10 8 12 q7 2 9 -6 q2 -20 4 -28 Z" />
    <path d="M104 78 q8 14 6 30 q-1 10 -8 12 q-7 2 -9 -6 q-2 -20 -4 -28 Z" />
    {/* 爪 */}
    <path d="M35 120 l-6 12 l5 2 l4 -11 Z" />
    <path d="M109 120 l6 12 l-5 2 l-4 -11 Z" />
  </g>
);

function WeaponGlyph({ kind }: { kind: 'shield' | 'sword' | 'bow' | 'staff' | 'axe' }) {
  switch (kind) {
    case 'shield':
      return (
        <g>
          <path d="M9 36 q10 2 14 8 q-1 18 -7 24 q-6 -6 -7 -24 q-1 -5 0 -8 Z" />
          <rect x="45" y="20" width="3" height="42" rx="1.4" />
        </g>
      );
    case 'sword':
      return (
        <g>
          <rect x="46.4" y="8" width="3.4" height="46" rx="1.6" />
          <rect x="41.6" y="52" width="13" height="3" rx="1.4" />
        </g>
      );
    case 'bow':
      return (
        <g>
          <path d="M48 18 q12 20 0 40" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M48 18 l0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </g>
      );
    case 'staff':
      return (
        <g>
          <rect x="48" y="16" width="3" height="52" rx="1.5" />
          <circle cx="49.5" cy="13" r="5" />
        </g>
      );
    case 'axe':
      return (
        <g>
          <rect x="46.4" y="14" width="3.4" height="50" rx="1.6" />
          <path d="M47 20 q12 -4 12 8 q-8 4 -12 2 Z" />
        </g>
      );
  }
}

const BattlePawnInner: React.FC<BattlePawnProps> = ({
  unit,
  visualState,
  onFocus,
  isInteractable = true,
  isSelected = false,
}) => {
  const { hero, side, currentHp, maxHp, resource, isDead } = unit;
  const isPlayer = side === 'player';
  const isBoss = !isPlayer && hero.name.startsWith('👑');
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  const energyPercent = Math.max(0, Math.min(100, resource));

  const slotCol = unit.slotId?.split('_')[0];
  const depthCol = slotCol === 'mid' ? 'mid' : slotCol === 'back' ? 'back' : 'front';

  const shortName = hero.name.replace(/^(敌·|👑)/, '').slice(0, 4);
  const weapon = CLASS_WEAPON[hero.classId] || 'sword';

  const cls = [
    'cs-unit',
    isPlayer ? 'cs-unit--hero' : isBoss ? 'cs-unit--boss' : 'cs-unit--mob',
    isBoss ? 'cs-unit--enemy' : isPlayer ? 'cs-unit--player' : 'cs-unit--enemy',
    visualState?.isAttacking ? 'is-attack' : '',
    visualState?.isHit ? 'is-hit' : '',
    visualState?.isHit && visualState?.isCritHit ? 'is-crit' : '',
    visualState?.isHealing ? 'is-heal' : '',
    isDead ? 'is-dead' : '',
    visualState?.focused || isSelected ? 'is-focus' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const ink = isBoss ? '#3D2C20' : isPlayer ? '#3A3428' : '#463225';

  return (
    <div
      className={cls}
      data-depth={depthCol}
      onClick={() => isInteractable && onFocus?.(hero.id)}
      title={`${hero.name}（${heroRoleLabel(hero)}）· 生命 ${currentHp}/${maxHp}`}
      style={
        {
          '--lunge': isPlayer ? '-16px' : '16px',
          '--knock': isPlayer ? '6px' : '-6px',
        } as React.CSSProperties
      }
    >
      <div className="cs-ground" />

      <div className="cs-fig">
        <div className="cs-art" style={{ color: ink, width: '100%', height: '100%' }}>
          {isBoss ? (
            <svg viewBox="0 0 144 176" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" fill="currentColor">
              {BOSS_BODY}
              <circle cx="61" cy="34" r="4.4" fill="#E4573D" />
              <circle cx="83" cy="34" r="4.4" fill="#E4573D" />
              <circle cx="61" cy="34" r="1.6" fill="#F6D79A" />
              <circle cx="83" cy="34" r="1.6" fill="#F6D79A" />
            </svg>
          ) : isPlayer ? (
            <svg viewBox="0 0 60 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" fill="currentColor">
              {HERO_BODY}
              <WeaponGlyph kind={weapon} />
            </svg>
          ) : (
            <svg viewBox="0 0 56 76" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" fill="currentColor">
              {MOB_BODY}
              <rect x="44" y="26" width="3" height="34" rx="1.5" />
            </svg>
          )}
        </div>
      </div>

      <div className="cs-plate">
        <span className="cs-nm">
          {isBoss ? <i>首领</i> : null}
          {shortName}
        </span>
        <span className="cs-hp">
          <i style={{ width: `${hpPercent}%` }} />
        </span>
        {isPlayer && (
          <span className={`cs-en${energyPercent >= 100 ? ' is-full' : ''}`}>
            <i style={{ width: `${energyPercent}%` }} />
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * 每 200ms 心跳都会 `setCombatUnits([...engine.units])`——数组是新的，但 unit 对象是原地 mutate 的。
 * 默认浅比较会因为「同一个对象」而跳过渲染（血量变了也不更新），必须逐字段比较。
 * onFocus 每次渲染都是新的内联箭头函数，但它只是把 id 透传出去（功能等价），故不参与比较。
 */
const sameVisual = (a?: UnitVisualState, b?: UnitVisualState) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.isAttacking === b.isAttacking &&
    a.attackMotion === b.attackMotion &&
    a.isHit === b.isHit &&
    a.isCritHit === b.isCritHit &&
    a.isHealing === b.isHealing &&
    a.isDead === b.isDead &&
    a.focused === b.focused
  );
};

export const BattlePawn = React.memo(BattlePawnInner, (prev, next) => (
  prev.unit.hero.id === next.unit.hero.id &&
  prev.unit.currentHp === next.unit.currentHp &&
  prev.unit.maxHp === next.unit.maxHp &&
  prev.unit.resource === next.unit.resource &&
  prev.unit.isDead === next.unit.isDead &&
  prev.unit.slotId === next.unit.slotId &&
  prev.unit.autoUlt === next.unit.autoUlt &&
  sameVisual(prev.visualState, next.visualState) &&
  prev.isSelected === next.isSelected &&
  prev.isInteractable === next.isInteractable
));
