/**
 * 战斗结算与数据统计类型定义
 */

import type { Hero, Equipment } from './hero';

export interface UnitCombatPerformance {
  hero: Hero;
  side: 'player' | 'enemy';
  damageDealt: number;  // 输出伤害总量
  damageTaken: number;  // 承受伤害总量
  healingDone: number;  // 治疗贡献总量
  kills: number;        // 击杀数
  critsCount: number;   // 暴击次数
  mvpScore: number;     // MVP 综合战力评分
  isMvp: boolean;       // 是否为全场/我方 MVP
}

export interface BattleSettlementSummary {
  winner: 'player' | 'enemy';
  durationSeconds: number;
  totalDamagePlayer: number;
  totalDamageEnemy: number;
  playerPerformances: UnitCombatPerformance[];
  mvpHeroId: string | null;
  lootDrop?: Equipment | null; // 本场胜利可能掉落的战利品装备
}
