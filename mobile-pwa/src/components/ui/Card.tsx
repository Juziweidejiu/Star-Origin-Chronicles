import React from 'react';

interface CardProps {
  children: React.ReactNode;
  /** sunken = 次级区（纸色更深）；flat = 无渐变浅卡 */
  variant?: 'raised' | 'sunken' | 'flat';
  /** 可点击卡片：按下时下沉 */
  tap?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 纸面卡片。层级靠底色深浅区分，不靠阴影堆叠。
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'raised',
  tap = false,
  onClick,
  className = '',
  style,
}) => {
  const variantClass =
    variant === 'sunken' ? 'pz-card--sunken' : variant === 'flat' ? 'pz-card--flat' : '';
  const tapClass = tap ? 'pz-card--tap' : '';
  return (
    <div
      className={`pz-card ${variantClass} ${tapClass} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};
