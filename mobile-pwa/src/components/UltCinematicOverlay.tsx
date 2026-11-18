import React from 'react';
import type { UltCinematicEvent } from '../types/combatVisual';

interface UltCinematicOverlayProps {
  event: UltCinematicEvent | null;
}

/**
 * 大招特写：保留“暗场—亮字”的电影感，但把配色从赛博霓虹换成墨夜 + 羊皮纸 + 黄铜。
 * 深色在这里是刻意的（暗场才显亮），不是残留的旧 UI。
 */
export const UltCinematicOverlay: React.FC<UltCinematicOverlayProps> = ({ event }) => {
  if (!event) return null;

  const isTank = event.role === 'tank';
  const isHealer = event.role === 'healer';

  const accent = isTank ? '#D9A45B' : isHealer ? '#6FBF8B' : '#C4665A';
  const kicker = isTank ? '铁壁之下' : isHealer ? '星原垂怜' : '刀锋所向';

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
        @keyframes ultVeil {
          0%   { opacity: 0; }
          22%  { opacity: 1; }
          76%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes ultBand {
          0%   { opacity: 0; transform: translateX(-14px); letter-spacing: .5em; }
          22%  { opacity: 1; transform: translateX(0);     letter-spacing: .14em; }
          72%  { opacity: 1; transform: translateX(0);     letter-spacing: .14em; }
          100% { opacity: 0; transform: translateX(10px);  letter-spacing: .3em; }
        }
        @keyframes ultRule {
          0%   { transform: scaleX(0); opacity: 0; }
          26%  { transform: scaleX(1); opacity: 1; }
          74%  { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        @keyframes ultSlash {
          0%   { opacity: 0; transform: scale(.4) rotate(-32deg); }
          26%  { opacity: .95; transform: scale(1.05) rotate(-32deg); }
          100% { opacity: 0; transform: scale(1.5) rotate(-32deg); }
        }
        @keyframes ultGrain {
          0%   { opacity: .10; }
          50%  { opacity: .16; }
          100% { opacity: .10; }
        }
      `}</style>

      {/* 墨夜暗场：四周更暗，中间留一点透亮 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 90% at 50% 50%, rgba(24,18,11,.55) 0%, rgba(20,15,9,.80) 60%, rgba(16,12,7,.92) 100%)',
          animation: 'ultVeil .8s ease-in-out forwards',
        }}
      />

      {/* 纸纹颗粒，避免暗场显得像纯色遮罩 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.14,
          backgroundImage:
            'radial-gradient(rgba(243,233,209,.5) .5px, transparent .6px), radial-gradient(rgba(243,233,209,.35) .5px, transparent .6px)',
          backgroundSize: '5px 5px, 7px 7px',
          backgroundPosition: '0 0, 3px 4px',
          animation: 'ultGrain 1.2s ease-in-out',
        }}
      />

      {/* 输出位：一道斜切光痕 */}
      {!isTank && !isHealer && (
        <div
          style={{
            position: 'absolute',
            width: '150%',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${accent}, #F3E9D1, ${accent}, transparent)`,
            boxShadow: `0 0 18px ${accent}`,
            animation: 'ultSlash .55s ease-out forwards',
          }}
        />
      )}

      {/* 名牌：羊皮纸底 + 黄铜细线，不让它看起来像霓虹广告条 */}
      <div
        style={{
          position: 'relative',
          padding: '0 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'ultBand .8s cubic-bezier(.16,1,.3,1) forwards',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            letterSpacing: '.28em',
            color: accent,
            fontFamily: 'var(--pz-sans)',
            marginBottom: '6px',
          }}
        >
          {kicker}
        </div>

        <div
          aria-hidden
          style={{
            width: '100%',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            transformOrigin: 'center',
            animation: 'ultRule .8s ease-out forwards',
          }}
        />

        <div
          style={{
            fontSize: '26px',
            lineHeight: 1.25,
            fontWeight: 700,
            color: '#F3E9D1',
            fontFamily: 'var(--pz-serif)',
            letterSpacing: '.06em',
            textShadow: `0 2px 14px rgba(0,0,0,.6), 0 0 22px ${accent}55`,
            padding: '6px 0 8px',
            textAlign: 'center',
          }}
        >
          {event.ultName}
        </div>

        <div
          aria-hidden
          style={{
            width: '100%',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            transformOrigin: 'center',
            animation: 'ultRule .8s ease-out forwards',
          }}
        />

        <div
          style={{
            marginTop: '7px',
            fontSize: '11px',
            color: 'rgba(243,233,209,.66)',
            fontFamily: 'var(--pz-sans)',
            letterSpacing: '.08em',
          }}
        >
          {event.casterName}
        </div>
      </div>
    </div>
  );
};
