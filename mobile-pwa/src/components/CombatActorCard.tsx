import React from 'react';
import type { CombatUnit } from '../engine/combatEngine';
import type { UnitVisualState } from '../types/combatVisual';
import { heroRoleLabel } from '../engine/heroFactory';

interface CombatActorCardProps {
  unit: CombatUnit;
  visualState?: UnitVisualState;
  isFocused?: boolean;
  canUlt?: boolean;
  isAutoUlt?: boolean;
  onSelectTarget?: (unit: CombatUnit) => void;
  onTriggerUlt?: (unit: CombatUnit) => void;
}

export const CombatActorCard: React.FC<CombatActorCardProps> = ({
  unit,
  visualState,
  isFocused = false,
  canUlt = false,
  isAutoUlt = false,
  onSelectTarget,
  onTriggerUlt,
}) => {
  const hpPct = Math.max(0, Math.min(100, Math.round((unit.currentHp / unit.maxHp) * 100)));
  const isPlayer = unit.side === 'player';
  const isDead = unit.isDead;

  // 动效判断
  const isLunge = visualState?.isAttacking && visualState?.attackMotion === 'lunge';
  const isCast = visualState?.isAttacking && visualState?.attackMotion === 'cast';
  const isHit = visualState?.isHit;
  const isCritHit = visualState?.isCritHit;
  const isHealing = visualState?.isHealing;

  // 站位徽章
  const posBadge = unit.col === 'front' ? '前' : unit.col === 'mid' ? '中' : '后';
  const posColor = unit.col === 'front' ? '#f59e0b' : unit.col === 'mid' ? '#38bdf8' : '#10b981';

  // 角色职能图标
  const roleIcon = unit.hero.role === 'tank' ? '🛡️' : unit.hero.role === 'healer' ? '💚' : '🗡️';

  // 攻击冲刺变换
  let transform = 'translate(0, 0)';
  if (isLunge) {
    transform = isPlayer ? 'translateX(14px) scale(1.04)' : 'translateX(-14px) scale(1.04)';
  } else if (isCast) {
    transform = 'translateY(-6px) scale(1.02)';
  } else if (isCritHit) {
    transform = 'translateX(-4px) scale(0.96)';
  } else if (isHit) {
    transform = isPlayer ? 'translateX(-3px)' : 'translateX(3px)';
  }

  // 滤镜效果
  let filter = 'none';
  if (isCritHit) {
    filter = 'brightness(2.2) contrast(1.6) saturate(1.8)';
  } else if (isHit) {
    filter = 'brightness(1.8) saturate(1.5)';
  } else if (isHealing) {
    filter = 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.7))';
  }

  return (
    <div
      onClick={() => {
        if (!isPlayer && onSelectTarget && !isDead) {
          onSelectTarget(unit);
        } else if (isPlayer && canUlt && !isAutoUlt && onTriggerUlt) {
          onTriggerUlt(unit);
        }
      }}
      data-actor-id={unit.hero.id}
      style={{
        position: 'relative',
        width: '100%',
        background: isPlayer
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(39, 24, 30, 0.92) 0%, rgba(15, 12, 17, 0.95) 100%)',
        borderRadius: '8px',
        padding: '6px 8px',
        border: isFocused
          ? '2px solid #ef4444'
          : canUlt && !isAutoUlt && isPlayer
          ? '2px solid #eab308'
          : isPlayer
          ? '1px solid #334155'
          : '1px solid #4a2228',
        boxShadow: isFocused
          ? '0 0 12px rgba(239, 68, 68, 0.5)'
          : canUlt && !isAutoUlt && isPlayer
          ? '0 0 10px rgba(234, 179, 8, 0.5)'
          : '0 2px 5px rgba(0,0,0,0.3)',
        transform,
        filter,
        opacity: isDead ? 0.35 : 1,
        transition: 'transform 0.12s ease-out, filter 0.12s ease-out, border-color 0.2s',
        cursor: (!isPlayer && !isDead) || (isPlayer && canUlt && !isAutoUlt) ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* 敌方集火标记准星 */}
      {isFocused && !isDead && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-6px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '1px 5px',
            borderRadius: '10px',
            boxShadow: '0 0 6px #ef4444',
            zIndex: 10,
          }}
        >
          🎯 集火
        </div>
      )}

      {/* 头部信息：站位徽章 + 姓名 + 角色/职业 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              fontSize: '9px',
              padding: '1px 4px',
              borderRadius: '3px',
              background: `${posColor}22`,
              color: posColor,
              border: `1px solid ${posColor}55`,
              fontWeight: 'bold',
            }}
          >
            {posBadge}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: isPlayer ? '#f8fafc' : '#fca5a5',
              maxWidth: '65px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {unit.hero.isLeader ? '👑' : ''}{unit.hero.name.slice(0, 4)}
          </span>
        </div>

        <div style={{ fontSize: '9px', color: isPlayer ? '#94a3b8' : '#fda4af' }}>
          <span>{roleIcon} {heroRoleLabel(unit.hero).split('·')[0]}</span>
        </div>
      </div>

      {/* 未来立绘 / 角色模型展示槽 (Actor Visual Slot) */}
      <div
        style={{
          position: 'relative',
          height: '38px',
          borderRadius: '4px',
          background: isPlayer ? 'rgba(15, 23, 42, 0.6)' : 'rgba(30, 10, 15, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '5px',
          overflow: 'hidden',
          border: '1px dashed rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* 当前质感剪影占位 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.85 }}>
          <span style={{ fontSize: '18px' }}>
            {unit.hero.role === 'tank' ? '🛡️' : unit.hero.role === 'healer' ? '⚕️' : unit.hero.classId === 'ranger' ? '🏹' : '⚔️'}
          </span>
          <span style={{ fontSize: '9px', color: '#94a3b8' }}>
            {unit.hero.gender === 'female' ? '♀' : '♂'} Lv.{unit.hero.level}
          </span>
        </div>

        {/* 满大招提示光效 */}
        {canUlt && isPlayer && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, rgba(234, 179, 8, 0.25) 0%, transparent 80%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* 生命值弧条 */}
      <div style={{ background: '#334155', height: '5px', borderRadius: '3px', overflow: 'hidden', marginBottom: '3px' }}>
        <div
          style={{
            background: hpPct > 45 ? '#10b981' : hpPct > 20 ? '#f59e0b' : '#ef4444',
            height: '100%',
            width: `${hpPct}%`,
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      {/* 底部数值 & 怒气条 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8px', color: '#94a3b8' }}>
        <span>{unit.currentHp}/{unit.maxHp}</span>
        {isPlayer ? (
          canUlt && !isAutoUlt ? (
            <span style={{ color: '#eab308', fontWeight: 'bold' }}>⚡ 点击大招</span>
          ) : (
            <span style={{ color: unit.resource >= 100 ? '#eab308' : '#64748b' }}>
              ⚡ {Math.round(unit.resource)}%
            </span>
          )
        ) : (
          <span style={{ color: '#ef4444' }}>ATK {unit.stats.ad > unit.stats.ap ? unit.stats.ad : unit.stats.ap}</span>
        )}
      </div>
    </div>
  );
};
