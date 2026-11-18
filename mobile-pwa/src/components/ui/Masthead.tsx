import React from 'react';

interface MastheadProps {
  title: string;
  sub?: string;
  /** 左上角返回按钮文案，留空则不显示 */
  backLabel?: string;
  onBack?: () => void;
  /** 右上角内容，通常是一枚胶囊或资源数字 */
  right?: React.ReactNode;
  className?: string;
}

/**
 * 页眉：深木底 + 黄铜双线，全应用统一。
 * 只负责「我在哪里」，不放任何行动按钮。
 */
export const Masthead: React.FC<MastheadProps> = ({
  title,
  sub,
  backLabel,
  onBack,
  right,
  className = '',
}) => (
  <div className={`pz-masthead ${className}`} style={{ padding: '10px 14px' }}>
    <div className="pz-between" style={{ alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
        {backLabel && onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid rgba(217,164,91,.45)',
              borderRadius: 4,
              color: '#D9A45B',
              fontSize: 11,
              padding: '2px 7px',
              cursor: 'pointer',
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            {backLabel}
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="pz-title pz-truncate">{title}</div>
          {sub && <div className="pz-sub" style={{ marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  </div>
);
