/**
 * 阵型系统类型定义
 * 适配 3x3 战术网格 (前排 Front / 中排 Mid / 后排 Back)
 * 命名极致精炼：盾墙、锋矢、散兵、坚壁、疾攻、双医、自由
 */

export type GridColumn = 'front' | 'mid' | 'back';
export type GridRow = 'top' | 'center' | 'bottom';

export type GridSlotId =
  | 'front_top' | 'front_center' | 'front_bottom'
  | 'mid_top'   | 'mid_center'   | 'mid_bottom'
  | 'back_top'  | 'back_center'  | 'back_bottom';

export interface FormationSlotAssignment {
  slotId: GridSlotId;
  heroId: string;
}

export interface GridSlotMeta {
  id: GridSlotId;
  col: GridColumn;
  row: GridRow;
  name: string; // 如 "前排中"、"后排上"
}

export const GRID_SLOTS: GridSlotMeta[] = [
  { id: 'front_top',    col: 'front', row: 'top',    name: '前排上' },
  { id: 'front_center', col: 'front', row: 'center', name: '前排中' },
  { id: 'front_bottom', col: 'front', row: 'bottom', name: '前排下' },
  { id: 'mid_top',      col: 'mid',   row: 'top',    name: '中排上' },
  { id: 'mid_center',   col: 'mid',   row: 'center', name: '中排中' },
  { id: 'mid_bottom',   col: 'mid',   row: 'bottom', name: '中排下' },
  { id: 'back_top',     col: 'back',  row: 'top',    name: '后排上' },
  { id: 'back_center',  col: 'back',  row: 'center', name: '后排中' },
  { id: 'back_bottom',  col: 'back',  row: 'bottom', name: '后排下' },
];

/**
 * 阵型预设定义（极简二字/三字名）
 */
export type FormationPresetId =
  | 'shield_wall'   // 盾墙
  | 'arrowhead'     // 锋矢
  | 'solid_defense' // 坚壁
  | 'skirmish'      // 散兵
  | 'dual_healer'   // 双医
  | 'rush_attack'   // 疾攻
  | 'custom';       // 自由

export interface FormationPreset {
  id: FormationPresetId;
  name: string;         // 极简名字，如 "盾墙"、"锋矢"
  description: string;  // 简要战术指导
  recommendedRoles: {
    front: number;      // 推荐前排人数
    mid: number;        // 推荐中排人数
    back: number;       // 推荐后排人数
  };
  defaultSlots: GridSlotId[]; // 4个英雄默认依序占用的4个格子
  buffDescription: string;    // 阵型增益概述
}

/**
 * 阵型健康度警报（来自反编译经典的无盾/无奶/无伤警报）
 */
export interface FormationWarning {
  level: 'warning' | 'danger';
  title: string;
  detail: string;
}

/**
 * 英雄站位结算后获得的战斗修饰
 */
export interface PositionCombatModifier {
  col: GridColumn;
  threatMultiplier: number; // 仇恨倍率：前排 4.5，中排 1.2，后排 0.55
  damageTakenMod: number;   // 承伤修正：前排 -10%（减伤），后排 0
  damageDealtMod: number;   // 输出修正：后排 +10%（专注），前排 0
  healingDealtMod: number;  // 治疗修正：后排 +10%
  critBonus: number;        // 中排走位灵活暴击 +5%
}
