import React from 'react';

type BtnVariant = 'main' | 'brass' | 'ghost' | 'quiet';

interface BtnProps {
  children: React.ReactNode;
  /** main = 酒红主行动（一屏只能有一个）；brass = 花钱的次要行动 */
  variant?: BtnVariant;
  size?: 'md' | 'sm';
  block?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const Btn: React.FC<BtnProps> = ({
  children,
  variant = 'ghost',
  size = 'md',
  block = false,
  disabled = false,
  onClick,
  className = '',
  style,
  title,
}) => {
  const cls = [
    'pz-btn',
    `pz-btn--${variant}`,
    size === 'sm' ? 'pz-btn--sm' : '',
    block ? 'pz-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} onClick={onClick} disabled={disabled} style={style} title={title}>
      {children}
    </button>
  );
};
