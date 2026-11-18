import React from 'react';
import type { GuildContractRank } from '../../types/guild';

interface SealProps {
  rank: GuildContractRank;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 公会等级印章。单色描边，避免与「战斗红 / 安全绿」等语义色抢眼。
 */
export const Seal: React.FC<SealProps> = ({ rank, size = 'md' }) => {
  const sizeClass = size === 'lg' ? 'pz-seal--lg' : size === 'sm' ? 'pz-seal--sm' : '';
  return <span className={`pz-seal pz-seal--${rank.toLowerCase()} ${sizeClass}`}>{rank}</span>;
};
