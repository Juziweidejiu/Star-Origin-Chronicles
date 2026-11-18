import React from 'react';

interface StatBarProps {
  label: string;
  value: number;
  /** 归一化上限，默认 200 —— 避免所有条都满格 */
  max?: number;
  /** 右侧显示的文本，缺省显示 value */
  display?: string;
  tone?: 'green' | 'gold' | 'wine' | 'arcane';
  labelWidth?: number;
}

const TONE_CLASS: Record<string, string> = {
  green: '',
  gold: 'pz-bar--gold',
  wine: 'pz-bar--wine',
  arcane: 'pz-bar--arcane',
};

/**
 * 属性条：3px 细线 + 右侧数值。名册、结算、编队共用。
 */
export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  max = 200,
  display,
  tone = 'green',
  labelWidth = 34,
}) => {
  const pct = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--pz-ink-2)' }}>
      <span style={{ width: labelWidth, flexShrink: 0, letterSpacing: '.02em' }}>{label}</span>
      <span className={`pz-bar ${TONE_CLASS[tone]}`}>
        <i style={{ width: `${pct}%` }} />
      </span>
      <span
        className="pz-num"
        style={{ width: 38, flexShrink: 0, textAlign: 'right', color: 'var(--pz-ink)', fontWeight: 600 }}
      >
        {display ?? value}
      </span>
    </div>
  );
};
