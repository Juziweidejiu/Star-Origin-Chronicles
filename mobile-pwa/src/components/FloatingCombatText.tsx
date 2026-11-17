import React from 'react';
import type { FloatingTextItem } from '../types/combatVisual';

interface FloatingCombatTextProps {
  items: FloatingTextItem[];
}

export const FloatingCombatText: React.FC<FloatingCombatTextProps> = ({ items }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      <style>{`
        @keyframes floatUpDamage {
          0% {
            opacity: 0;
            transform: translate(-50%, 0px) scale(0.85);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -10px) scale(1.05);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -46px) scale(0.95);
          }
        }
        @keyframes floatUpCrit {
          0% {
            opacity: 0;
            transform: translate(-50%, 6px) scale(0.6);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -12px) scale(1.4);
          }
          40% {
            transform: translate(-50%, -16px) scale(1.15);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -58px) scale(0.9);
          }
        }
        @keyframes floatUpHeal {
          0% {
            opacity: 0;
            transform: translate(-50%, 0px) scale(0.9);
          }
          25% {
            opacity: 1;
            transform: translate(-50%, -8px) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -42px) scale(1);
          }
        }
        @keyframes blockFlash {
          0% {
            opacity: 0;
            transform: translate(-50%, 0px) scale(0.9);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -6px) scale(1.05);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -28px) scale(0.95);
          }
        }
      `}</style>

      {items.map(item => {
        const isCrit = item.type === 'crit';
        const isHeal = item.type === 'heal';
        const isBlock = item.type === 'block';

        let color = '#f8fafc';
        let strokeColor = '#000000';
        let animation = 'floatUpDamage 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        let fontSize = '13px';
        let fontWeight = 'bold';

        if (isCrit) {
          color = '#fbbf24';
          strokeColor = '#b45309';
          animation = 'floatUpCrit 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
          fontSize = '17px';
          fontWeight = '900';
        } else if (isHeal) {
          color = '#34d399';
          strokeColor = '#065f46';
          animation = 'floatUpHeal 1.0s ease-out forwards';
          fontSize = '14px';
        } else if (isBlock) {
          color = '#38bdf8';
          strokeColor = '#0369a1';
          animation = 'blockFlash 0.9s ease-out forwards';
          fontSize = '12px';
        } else if (item.type === 'magic') {
          color = '#c084fc';
          strokeColor = '#6b21a8';
        }

        return (
          <div
            key={item.id}
            data-target-id={item.targetId}
            style={{
              position: 'absolute',
              color,
              fontSize,
              fontWeight,
              textShadow: `0 0 4px ${strokeColor}, 1px 1px 0 ${strokeColor}, -1px -1px 0 ${strokeColor}`,
              animation,
              letterSpacing: isCrit ? '0.5px' : '0px',
              whiteSpace: 'nowrap',
              marginLeft: `${item.xOffset}px`,
            }}
          >
            {item.text}
          </div>
        );
      })}
    </div>
  );
};
