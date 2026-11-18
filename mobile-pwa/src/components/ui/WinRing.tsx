import React from 'react';

interface WinRingProps {
  /** 0-100 */
  percent: number;
  size?: number;
  color?: string;
  label?: string;
}

/**
 * 胜率环。只在大卡片上用；列表行内请退化为「百分比 + 危险度文字」。
 */
export const WinRing: React.FC<WinRingProps> = ({
  percent,
  size = 58,
  color,
  label,
}) => {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const ring = color ?? (p >= 90 ? '#4E9A6E' : p >= 75 ? '#A9793A' : p >= 50 ? '#B4632A' : '#A8412C');
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: `conic-gradient(${ring} 0 ${p}%, rgba(42,36,24,.12) ${p}% 100%)`,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 5,
          borderRadius: '50%',
          background: 'var(--pz-raised)',
        }}
      />
      <b
        className="pz-num"
        style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: 'var(--pz-serif)',
          fontSize: size * 0.25,
          color: 'var(--pz-ink)',
          lineHeight: 1,
        }}
      >
        {label ?? `${p}%`}
      </b>
    </div>
  );
};
