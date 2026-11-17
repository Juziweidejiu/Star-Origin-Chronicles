import React from 'react';
import type { UltCinematicEvent } from '../types/combatVisual';

interface UltCinematicOverlayProps {
  event: UltCinematicEvent | null;
}

export const UltCinematicOverlay: React.FC<UltCinematicOverlayProps> = ({ event }) => {
  if (!event) return null;

  const isDps = event.role === 'dps';
  const isTank = event.role === 'tank';
  const isHealer = event.role === 'healer';

  const mainColor = isTank ? '#f59e0b' : isHealer ? '#10b981' : '#38bdf8';
  const icon = isTank ? '🛡️' : isHealer ? '✨' : '⚡';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes ultDarkDim {
          0% { background: rgba(0, 0, 0, 0); }
          25% { background: rgba(0, 0, 0, 0.65); }
          75% { background: rgba(0, 0, 0, 0.65); }
          100% { background: rgba(0, 0, 0, 0); }
        }
        @keyframes ultBannerSlide {
          0% {
            opacity: 0;
            transform: translateX(-120%) skewX(-12deg);
          }
          20% {
            opacity: 1;
            transform: translateX(0%) skewX(-12deg);
          }
          70% {
            opacity: 1;
            transform: translateX(0%) skewX(-12deg);
          }
          100% {
            opacity: 0;
            transform: translateX(120%) skewX(-12deg);
          }
        }
        @keyframes ultSlashFlash {
          0% { opacity: 0; transform: scale(0.5) rotate(-35deg); }
          30% { opacity: 1; transform: scale(1.1) rotate(-35deg); }
          100% { opacity: 0; transform: scale(1.4) rotate(-35deg); }
        }
      `}</style>

      {/* 暗屏遮罩 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          animation: 'ultDarkDim 0.7s ease-in-out forwards',
        }}
      />

      {/* 剑芒 / 圣光斩击裂隙特效 */}
      {isDps && (
        <div
          style={{
            position: 'absolute',
            width: '120%',
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #ffffff, #38bdf8, #ffffff, transparent)',
            boxShadow: '0 0 25px #38bdf8, 0 0 40px #ffffff',
            animation: 'ultSlashFlash 0.5s ease-out forwards',
          }}
        />
      )}

      {/* 技能通告横幅 */}
      <div
        style={{
          position: 'relative',
          width: '110%',
          padding: '10px 0',
          background: `linear-gradient(90deg, transparent 0%, rgba(15, 23, 42, 0.95) 20%, rgba(15, 23, 42, 0.95) 80%, transparent 100%)`,
          borderTop: `2px solid ${mainColor}`,
          borderBottom: `2px solid ${mainColor}`,
          boxShadow: `0 0 25px ${mainColor}44`,
          animation: 'ultBannerSlide 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2px' }}>
          {icon} 绝技觉醒 · 战意爆发
        </div>
        <div style={{ fontSize: '20px', fontWeight: '900', color: '#f8fafc', textShadow: `0 0 10px ${mainColor}` }}>
          【{event.ultName}】
        </div>
        <div style={{ fontSize: '10px', color: mainColor, marginTop: '2px', fontWeight: 'bold' }}>
          施术者：{event.casterName}
        </div>
      </div>
    </div>
  );
};
