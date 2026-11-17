import React from 'react';
import type { FloatingTextItem } from '../types/combatVisual';

interface FloatingCombatTextProps {
  items: FloatingTextItem[];
}

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
      <style>{`
        @keyframes floatUpDamage {
          0% {
            opacity: 0;
            transform: translate(-50%, 4px) scale(0.7);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -10px) scale(1.15);
          }
          75% {
            opacity: 0.95;
            transform: translate(-50%, -32px) scale(1.0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -48px) scale(0.85);
          }
        }
        @keyframes floatUpCrit {
          0% {
            opacity: 0;
            transform: translate(-50%, 6px) scale(0.6);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -14px) scale(1.45);
          }
          40% {
            opacity: 1;
            transform: translate(-50%, -20px) scale(1.2);
          }
          80% {
            opacity: 0.95;
            transform: translate(-50%, -42px) scale(1.05);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -60px) scale(0.85);
          }
        }
        @keyframes floatUpHeal {
          0% {
            opacity: 0;
            transform: translate(-50%, 4px) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -10px) scale(1.2);
          }
          75% {
            opacity: 0.95;
            transform: translate(-50%, -28px) scale(1.0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -44px) scale(0.85);
          }
        }
      `}</style>

      {items.map(item => {
        const isCrit = item.type === 'crit';
        const isHeal = item.type === 'heal';
        const isBlock = item.type === 'block';

        let color = '#f8fafc';
        let strokeColor = '#000000';
        let animation = 'floatUpDamage 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        let fontSize = '15px';
        let fontWeight = '900';

        if (isCrit) {
          color = '#fbbf24';
          strokeColor = '#9a3412';
          animation = 'floatUpCrit 1.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
          fontSize = '18px';
          fontWeight = '900';
        } else if (isHeal) {
          color = '#4ade80';
          strokeColor = '#064e3b';
          animation = 'floatUpHeal 1.05s ease-out forwards';
          fontSize = '15px';
        } else if (isBlock) {
          color = '#38bdf8';
          strokeColor = '#0c4a6e';
          fontSize = '14px';
        } else if (item.type === 'magic') {
          color = '#d8b4fe';
          strokeColor = '#581c87';
        }

        return (
          <div
            key={item.id}
            data-target-id={item.targetId}
            style={{
              position: 'absolute',
              top: '-12px',
              left: `${item.xOffset || 0}px`,
              color,
              fontSize,
              fontWeight,
              textShadow: `0 0 6px ${strokeColor}, 1px 1px 0 ${strokeColor}, -1px -1px 0 ${strokeColor}, 0 2px 4px rgba(0,0,0,0.9)`,
              animation,
              letterSpacing: isCrit ? '1px' : '0.5px',
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
