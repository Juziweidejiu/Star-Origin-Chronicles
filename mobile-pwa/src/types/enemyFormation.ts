/**
 * 敌方阵型预设与生成器
 * 适配自走棋双侧 3x3 棋盘：
 * 玩家方 3x3 (左侧) vs 敌方 3x3 (右侧)
 * 敌方阵型根据敌人组成、头目类型以及遭遇战特点进行智能布阵
 */

import type { GridSlotId } from './formation';
import type { Hero } from './hero';

export interface EnemyFormationTemplate {
  name: string;
  description: string;
  slots: GridSlotId[]; // 依序填入前排、中排、后排
}

/**
 * 敌方经典 3x3 站位模板
 */
export const ENEMY_FORMATION_TEMPLATES: Record<string, EnemyFormationTemplate> = {
  // 铁壁突击：前排护卫堵中，两侧突击
  assault_wall: {
    name: '铁卫突刺阵',
    description: '强壮的前锋突前吸引火力，侧翼夹击',
    slots: ['front_center', 'front_top', 'front_bottom', 'mid_center']
  },
  // 散兵游猎：前后分散，游侠/刺客在两翼
  skirmish_hunt: {
    name: '散兵游猎阵',
    description: '前后拉开距离，远程在后排狙击，前排单人牵制',
    slots: ['front_top', 'mid_bottom', 'back_center', 'back_top']
  },
  // 兽潮包围：前锋两翼前突夹击，中间留空
  pincer_surge: {
    name: '两翼包抄阵',
    description: '前锋由上下两侧包抄，直逼中路后排',
    slots: ['front_top', 'front_bottom', 'mid_center', 'back_bottom']
  },
  // 邪术拱卫：Boss 居中排或后排，死士在前排横向排开
  boss_bastion: {
    name: '众星捧月阵',
    description: '前锋死守前线，首领居中调度释放毁灭技能',
    slots: ['front_top', 'front_bottom', 'mid_center', 'back_center']
  }
};

/**
 * 为敌方队伍智能分配 3x3 网格槽位
 */
export function assignEnemyFormation(enemies: Hero[], isBoss = false): Record<string, GridSlotId> {
  const result: Record<string, GridSlotId> = {};
  if (!enemies || enemies.length === 0) return result;

  // 根据组成挑选模板
  let template = ENEMY_FORMATION_TEMPLATES.assault_wall;
  if (isBoss) {
    template = ENEMY_FORMATION_TEMPLATES.boss_bastion;
  } else if (enemies.some(e => e.classId === 'ranger' || e.classId === 'arcanist')) {
    template = ENEMY_FORMATION_TEMPLATES.skirmish_hunt;
  } else if (enemies.length >= 4) {
    template = ENEMY_FORMATION_TEMPLATES.pincer_surge;
  }

  // 区分角色职责排布：坦克/近战排前排，输出排中排，医官/远程排后排
  const tanks = enemies.filter(e => e.role === 'tank' || e.classId === 'guardian' || e.classId === 'warden');
  const dps = enemies.filter(e => e.role === 'dps');
  const healers = enemies.filter(e => e.role === 'healer' || e.classId === 'cleric' || e.classId === 'bard');

  // 按战术权重重排
  const sorted = [...tanks, ...dps, ...healers];
  
  // 依次填入模板槽位，若超出则兜底备用槽位
  const fallbackSlots: GridSlotId[] = [
    'front_center', 'front_top', 'front_bottom',
    'mid_center', 'mid_top', 'mid_bottom',
    'back_center', 'back_top', 'back_bottom'
  ];

  const usedSlots = new Set<GridSlotId>();

  sorted.forEach((enemy, idx) => {
    let targetSlot = template.slots[idx];
    if (!targetSlot || usedSlots.has(targetSlot)) {
      targetSlot = fallbackSlots.find(s => !usedSlots.has(s)) || 'mid_center';
    }
    usedSlots.add(targetSlot);
    result[enemy.id] = targetSlot;
  });

  return result;
}
