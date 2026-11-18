import React from 'react';

type TagTone = 'default' | 'brass' | 'wine' | 'safe' | 'danger';

interface TagProps {
  children: React.ReactNode;
  tone?: TagTone;
  className?: string;
}

export const Tag: React.FC<TagProps> = ({ children, tone = 'default', className = '' }) => (
  <span className={`pz-tag ${tone === 'default' ? '' : `pz-tag--${tone}`} ${className}`}>
    {children}
  </span>
);
