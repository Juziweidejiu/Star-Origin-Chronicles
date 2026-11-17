import React from 'react';

export interface Projectile {
  id: string;
  sourceSlotId: string;
  targetSlotId: string;
  type: 'arrow' | 'magic' | 'holy' | 'slash';
  progress: number; // 0 -> 1
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

interface CombatProjectilesProps {
  projectiles: Projectile[];
}

export const CombatProjectiles: React.FC<CombatProjectilesProps> = ({ projectiles }) => {
  if (!projectiles || projectiles.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 25,
        overflow: 'visible'
      }}
    >
      <defs>
        {/* 箭矢轨迹渐变 */}
        <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(245, 158, 11, 0)" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        {/* 奥术法球轨迹渐变 */}
        <radialGradient id="magicGrad">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="60%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="rgba(147, 51, 234, 0)" />
        </radialGradient>
        {/* 圣光愈合光球 */}
        <radialGradient id="holyGrad">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="70%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
        </radialGradient>
      </defs>

      {projectiles.map(p => {
        const curX = p.startX + (p.targetX - p.startX) * p.progress;
        // 抛物线轨迹高度 (最高抬升 20px)
        const arcY = Math.sin(p.progress * Math.PI) * -22;
        const curY = p.startY + (p.targetY - p.startY) * p.progress + arcY;

        // 计算航向角度
        const dx = p.targetX - p.startX;
        const dy = (p.targetY - p.startY);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        if (p.type === 'arrow') {
          return (
            <g key={p.id} transform={`translate(${curX}, ${curY}) rotate(${angle})`}>
              {/* 尾迹 */}
              <line x1="-16" y1="0" x2="0" y2="0" stroke="url(#arrowGrad)" strokeWidth="2.5" />
              {/* 箭簇 */}
              <polygon points="0,-2 6,0 0,2" fill="#fef08a" />
            </g>
          );
        }

        if (p.type === 'magic') {
          return (
            <g key={p.id} transform={`translate(${curX}, ${curY})`}>
              <circle r="7" fill="url(#magicGrad)" />
              <circle r="3" fill="#ffffff" />
            </g>
          );
        }

        if (p.type === 'holy') {
          return (
            <g key={p.id} transform={`translate(${curX}, ${curY})`}>
              <circle r="6" fill="url(#holyGrad)" />
              <circle r="2.5" fill="#f0fdf4" />
            </g>
          );
        }

        // 斩击刀光
        return (
          <g key={p.id} transform={`translate(${curX}, ${curY}) rotate(${angle})`}>
            <ellipse rx="10" ry="2" fill="#f87171" opacity={0.8} />
          </g>
        );
      })}
    </svg>
  );
};
