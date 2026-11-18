/**
 * 英雄成长与经验结算类型
 * 参考《Dungeons & Dynasties》CA 成长模型，并按手游节奏调优
 */

import type { HeroAttributes } from './hero';

export interface AttributeGain {
  key: keyof HeroAttributes;
  label: string;
  amount: number;
}

export interface HeroProgressionResult {
  heroId: string;
  heroName: string;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  caBefore: number;
  caAfter: number;
  caGained: number;
  attributeGains: AttributeGain[];
  isMvp: boolean;
}

export interface XpProgress {
  into: number;
  need: number;
  percent: number;
  total: number;
  isMax: boolean;
}
