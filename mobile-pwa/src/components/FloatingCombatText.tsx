import React from 'react';
import type { FloatingTextItem } from '../types/combatVisual';

interface FloatingCombatTextProps {
  items: FloatingTextItem[];
}

/**
 * 战斗浮动跳字
 * 关键帧统一定义在 index.css（fxFloat*），此处不再注入 <style>，
 * 避免每个单位实例在每次渲染时触发一次样式重算。
 */
export const FloatingCombatText: React.FC<FloatingCombatTextProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {items.map(item => {
        const isCrit = item.type === 'crit';
        const isHeal = item.type === 'heal';
        const isBlock = item.type === 'block';

        let color = '#2A2418';
        let animation = 'fxFloatDamage .95s cubic-bezier(.16,1,.3,1) forwards';
        let fontSize = '15px';
        let fontWeight = '900';

        if (isCrit) {
          color = '#8A3B32';
          animation = 'fxFloatCrit 1.15s cubic-bezier(.34,1.56,.64,1) forwards';
          fontSize = '19px';
        } else if (isHeal) {
          color = '#3F6B4E';
          animation = 'fxFloatHeal 1.05s ease-out forwards';
        } else if (isBlock) {
          color = '#2F6E8F';
          fontSize = '14px';
        } else if (item.type === 'magic') {
          color = '#7A4E8C';
        } else if (item.type === 'ult') {
          color = '#A9793A';
          fontSize = '16px';
        }

        // 同一目标连续出伤时向上错行，避免数字叠成一坨
        const stack = item.stack ?? 0;

        return (
          <div
            key={item.id}
            data-target-id={item.targetId}
            style={{
              position: 'absolute',
              top: `${-12 - stack * 17}px`,
              left: `${item.xOffset || 0}px`,
              color,
              fontSize,
              fontWeight,
              fontFamily: 'var(--pz-sans)',
              // 纸面上用暖白描边做光晕，保证小字也读得清
              textShadow:
                '0 0 3px rgba(247,239,221,.95), 1px 1px 0 rgba(247,239,221,.9), -1px -1px 0 rgba(247,239,221,.9), 0 2px 3px rgba(42,36,24,.28)',
              animation,
              letterSpacing: isCrit ? '.08em' : '.02em',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 120,
            }}
          >
            {item.text}
          </div>
        );
      })}
    </div>
  );
};
