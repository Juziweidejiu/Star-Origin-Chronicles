/**
 * 战斗视觉动效与浮动跳字事件定义
 * 适配 Milestone 13：沉浸式战场表现与微动效反馈
 */

export type FloatingTextType = 'damage' | 'crit' | 'heal' | 'block' | 'magic' | 'ult';

export interface FloatingTextItem {
  id: string;
  targetId: string;       // 对应 CombatUnit 的 hero.id
  text: string;
  type: FloatingTextType;
  xOffset: number;        // 横向微偏移 (-20 ~ +20px) 避免堆叠
  createdAt: number;
}

export type ActionMotionType = 'melee_lunge' | 'ranged_cast' | 'healer_bless' | 'hit_recoil' | 'dead_fade';

export interface UnitVisualState {
  isAttacking: boolean;
  attackMotion?: 'lunge' | 'cast';
  isHit: boolean;
  isCritHit: boolean;
  isHealing: boolean;
  isDead: boolean;
  focused?: boolean;      // 是否被玩家手动标记集火
}

export interface UltCinematicEvent {
  id: string;
  casterId: string;
  casterName: string;
  casterClass: string;
  ultName: string;
  role: 'tank' | 'dps' | 'healer';
  durationMs: number;
}

export interface CombatFxEvent {
  type: 'hit' | 'heal' | 'crit_shake' | 'ult_burst';
  sourceId?: string;
  targetId?: string;
  value?: number;
  label?: string;
}
