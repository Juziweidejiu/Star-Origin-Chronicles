import React, { useEffect, useRef } from 'react';

export interface Projectile {
  id: string;
  sourceSlotId: string;
  targetSlotId: string;
  type: 'arrow' | 'magic' | 'holy' | 'slash';
  /** 旧字段：保留以兼容调用方，实际飞行由 CSS 过渡完成 */
  progress: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

interface CombatProjectilesProps {
  projectiles: Projectile[];
}

/** 单发弹道：挂载时从起点过渡到终点，全程走 CSS 合成层，不触发 React 重渲染 */
const ProjectileNode: React.FC<{ p: Projectile }> = ({ p }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 先落位到起点，下一帧再切到终点，确保过渡被触发
    const raf = requestAnimationFrame(() => {
      el.style.transform = `translate3d(${p.targetX}px, ${p.targetY}px, 0)`;
    });
    return () => cancelAnimationFrame(raf);
  }, [p.targetX, p.targetY]);

  const angle = (Math.atan2(p.targetY - p.startY, p.targetX - p.startX) * 180) / Math.PI;

  let body: React.ReactNode;
  if (p.type === 'arrow') {
    body = (
      <div style={{ transform: `rotate(${angle}deg)`, position: 'relative', width: 0, height: 0 }}>
        <div
          style={{
            position: 'absolute',
            left: '-18px',
            top: '-1px',
            width: '18px',
            height: '2px',
            background: 'linear-gradient(90deg, rgba(169,121,58,0), rgba(169,121,58,.85))',
            borderRadius: '2px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '-2px',
            top: '-2.5px',
            width: 0,
            height: 0,
            borderTop: '2.5px solid transparent',
            borderBottom: '2.5px solid transparent',
            borderLeft: '7px solid #A9793A',
          }}
        />
      </div>
    );
  } else if (p.type === 'magic') {
    body = (
      <div
        style={{
          width: '13px',
          height: '13px',
          marginLeft: '-6.5px',
          marginTop: '-6.5px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 38%, #EDE4F8, #9B7BD4 55%, rgba(155,123,212,0) 72%)',
          boxShadow: '0 0 10px rgba(155,123,212,.55)',
        }}
      />
    );
  } else if (p.type === 'holy') {
    body = (
      <div
        style={{
          width: '12px',
          height: '12px',
          marginLeft: '-6px',
          marginTop: '-6px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 38%, #EAFAF0, #6FBF8B 58%, rgba(111,191,139,0) 74%)',
          boxShadow: '0 0 9px rgba(111,191,139,.5)',
        }}
      />
    );
  } else {
    body = (
      <div
        style={{
          width: '20px',
          height: '4px',
          marginLeft: '-10px',
          marginTop: '-2px',
          borderRadius: '2px',
          background: 'linear-gradient(90deg, rgba(138,59,50,0), #B0524A)',
          transform: `rotate(${angle}deg)`,
        }}
      />
    );
  }

  return (
    <div
      ref={ref}
      className="fx-proj"
      style={{ transform: `translate3d(${p.startX}px, ${p.startY}px, 0)` }}
    >
      {body}
    </div>
  );
};

export const CombatProjectiles: React.FC<CombatProjectilesProps> = ({ projectiles }) => {
  if (!projectiles || projectiles.length === 0) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25, overflow: 'visible' }}>
      {projectiles.map(p => (
        <ProjectileNode key={p.id} p={p} />
      ))}
    </div>
  );
};
