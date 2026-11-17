import React from 'react';
import type { CombatUnit } from '../engine/combatEngine';
import type { UnitVisualState } from '../types/combatVisual';
import { CLASS_ICONS } from '../engine/heroFactory';
import { heroRoleLabel } from '../engine/heroFactory';

interface BattlePawnProps {
  unit: CombatUnit;
  visualState?: UnitVisualState;
  onFocus?: (unitId: string) => void;
  isInteractable?: boolean; // 战前可点击选择或互换
  isSelected?: boolean;
}

export const BattlePawn: React.FC<BattlePawnProps> = ({
  unit,
  visualState,
  onFocus,
  isInteractable = true,
  isSelected = false
}) => {
  const { hero, side, currentHp, maxHp, resource, isDead } = unit;
  const isPlayer = side === 'player';
  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
  const energyPercent = Math.max(0, Math.min(100, Math.round(resource)));
  const role = hero.role || 'dps';

  // 角色职能颜色
  const roleColors = {
    tank: { bg: '#1e3a5f', border: '#60a5fa', text: '#93c5fd', badge: '盾' },
    dps: { bg: '#581c1c', border: '#f87171', text: '#fca5a5', badge: '刃' },
    healer: { bg: '#144127', border: '#4ade80', text: '#86efac', badge: '医' }
  }[role];

  // 动作类名判断
  const isAttacking = visualState?.isAttacking;
  const attackMotion = visualState?.attackMotion;
  const isHit = visualState?.isHit;
  const isCritHit = visualState?.isCritHit;
  const isHealing = visualState?.isHealing;
  const isFocused = visualState?.focused;

  // 计算动态位移 (自走棋近战冲锋对撞/远程蓄力后仰/受击震颤 - 上下纵向对决)
  let transform = 'translate(0, 0) scale(1)';
  let filter = 'none';

  if (isDead) {
    transform = 'scale(0.85)';
    filter = 'grayscale(100%) opacity(0.35)';
  } else if (isAttacking) {
    if (attackMotion === 'lunge') {
      // 玩家在下方，向上突进 -18px；敌人在上方，向下突进 +18px
      transform = isPlayer ? 'translateY(-18px) scale(1.08)' : 'translateY(18px) scale(1.08)';
    } else {
      // 远程/法术蓄力浮起
      transform = 'scale(1.08)';
    }
  } else if (isHit) {
    // 受击后退震颤：玩家向后下退 +6px，敌人向后上退 -6px
    transform = isPlayer ? 'translateY(6px) scale(0.96)' : 'translateY(-6px) scale(0.96)';
    filter = isCritHit ? 'drop-shadow(0 0 10px #ef4444) brightness(1.6)' : 'brightness(1.3)';
  } else if (isHealing) {
    filter = 'drop-shadow(0 0 8px #22c55e) brightness(1.2)';
    transform = 'scale(1.04)';
  }

  // 棋子外圈光晕
  const pawnGlow = isFocused
    ? '0 0 14px #eab308, 0 0 4px #fef08a'
    : isSelected
    ? '0 0 14px #38bdf8, 0 0 4px #bae6fd'
    : isPlayer
    ? '0 4px 12px rgba(0,0,0,0.6), inset 0 0 6px rgba(56, 189, 248, 0.4)'
    : '0 4px 12px rgba(0,0,0,0.6), inset 0 0 6px rgba(248, 113, 113, 0.4)';

  const shortName = hero.name.replace(/^(敌·|👑首领·)/, '').slice(0, 3);

  return (
    <div
      onClick={() => isInteractable && onFocus?.(hero.id)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '74px',
        cursor: isInteractable ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'transform 0.14s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.14s ease',
        transform,
        filter,
        zIndex: isAttacking ? 30 : isFocused ? 20 : 10
      }}
      title={`${hero.name} (${heroRoleLabel(hero)}) - HP: ${currentHp}/${maxHp}`}
    >
      {/* 顶部微型指示器：集火标记 or 选中光标 */}
      {isFocused && (
        <div
          style={{
            position: 'absolute',
            top: '-18px',
            fontSize: '11px',
            color: '#fbbf24',
            fontWeight: 900,
            animation: 'pulse 1s infinite alternate',
            textShadow: '0 0 6px #b45309'
          }}
        >
          ▼ 集火
        </div>
      )}

      {/* 棋子主体：微缩自走棋战斗圆形徽章 Token */}
      <div
        style={{
          position: 'relative',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${roleColors.bg}, #090d16)`,
          border: `2.5px solid ${isFocused ? '#eab308' : isSelected ? '#38bdf8' : isPlayer ? '#38bdf8' : '#f87171'}`,
          boxShadow: pawnGlow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {/* 角色立体光感底座 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: '40%',
            background: `linear-gradient(to top, ${isPlayer ? 'rgba(14, 165, 233, 0.25)' : 'rgba(239, 68, 68, 0.25)'}, transparent)`
          }}
        />

        {/* 职业与性别符号图腾 */}
        <span style={{ fontSize: '20px', lineHeight: 1, zIndex: 2, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
          {CLASS_ICONS[hero.classId] || '🗡️'}
        </span>

        {/* 极简二字短名 */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            color: isPlayer ? '#f8fafc' : '#fecaca',
            zIndex: 2,
            marginTop: '2px',
            textShadow: '0 1px 3px #000'
          }}
        >
          {shortName}
        </span>

        {/* 职能角标 Badge (盾/刃/医) */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: roleColors.border,
            color: '#000',
            fontSize: '9px',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.8)',
            zIndex: 3
          }}
        >
          {roleColors.badge}
        </div>
      </div>

      {/* 棋子底部血条与气力条 */}
      <div
        style={{
          width: '58px',
          marginTop: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          background: 'rgba(0,0,0,0.7)',
          padding: '2px',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {/* HP 进度条 */}
        <div style={{ position: 'relative', width: '100%', height: '5px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${hpPercent}%`,
              height: '100%',
              background: hpPercent > 50 ? 'linear-gradient(to right, #22c55e, #4ade80)' : hpPercent > 20 ? 'linear-gradient(to right, #f59e0b, #fbbf24)' : 'linear-gradient(to right, #ef4444, #f87171)',
              transition: 'width 0.2s ease-out'
            }}
          />
        </div>

        {/* 气力/战技条 (满额金色大招就绪) */}
        <div style={{ position: 'relative', width: '100%', height: '3px', background: '#1e293b', borderRadius: '1.5px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${energyPercent}%`,
              height: '100%',
              background: energyPercent >= 100 ? 'linear-gradient(to right, #eab308, #fef08a)' : 'linear-gradient(to right, #3b82f6, #60a5fa)',
              boxShadow: energyPercent >= 100 ? '0 0 6px #eab308' : 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
};
