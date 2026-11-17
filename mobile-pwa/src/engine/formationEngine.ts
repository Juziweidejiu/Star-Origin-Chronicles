import type { Hero } from '../types/hero';
import type {
  GridColumn,
  FormationPreset,
  FormationPresetId,
  FormationSlotAssignment,
  FormationWarning,
  PositionCombatModifier
} from '../types/formation';
import { GRID_SLOTS } from '../types/formation';

/**
 * 极简命名阵型预设库
 * 涵盖原版经典战术变体
 */
export const FORMATION_PRESETS: Record<FormationPresetId, FormationPreset> = {
  shield_wall: {
    id: 'shield_wall',
    name: '盾墙',
    description: '两前排稳固防线，中排输出，后排医官。最为稳妥的推进阵型。',
    recommendedRoles: { front: 2, mid: 1, back: 1 },
    defaultSlots: ['front_top', 'front_bottom', 'mid_center', 'back_center'],
    buffDescription: '前排坚不可摧，后排安全无虞'
  },
  arrowhead: {
    id: 'arrowhead',
    name: '锋矢',
    description: '单尖刀前锋顶前，中排两翼强袭撕扯，后排压阵。专攻速杀。',
    recommendedRoles: { front: 1, mid: 2, back: 1 },
    defaultSlots: ['front_center', 'mid_top', 'mid_bottom', 'back_center'],
    buffDescription: '两翼撕扯，中排暴击提升'
  },
  solid_defense: {
    id: 'solid_defense',
    name: '坚壁',
    description: '全线收缩，三前排横向筑墙，后排单医看护。阻挡一切穿透冲击。',
    recommendedRoles: { front: 3, mid: 0, back: 1 },
    defaultSlots: ['front_top', 'front_center', 'front_bottom', 'back_center'],
    buffDescription: '全线铁壁，彻底封锁正面近战'
  },
  skirmish: {
    id: 'skirmish',
    name: '散兵',
    description: '分散站位，前后交错。有效分散敌方范围冲击与范围法术。',
    recommendedRoles: { front: 1, mid: 1, back: 2 },
    defaultSlots: ['front_top', 'mid_bottom', 'back_top', 'back_bottom'],
    buffDescription: '站位分散，中后排走位灵活'
  },
  dual_healer: {
    id: 'dual_healer',
    name: '双医',
    description: '双前锋在前，后排双医官轮流照护。为漫长且高消耗的长程探险而设。',
    recommendedRoles: { front: 2, mid: 0, back: 2 },
    defaultSlots: ['front_top', 'front_bottom', 'back_top', 'back_bottom'],
    buffDescription: '双重医疗，队伍续航翻倍'
  },
  rush_attack: {
    id: 'rush_attack',
    name: '疾攻',
    description: '全员中前压上，放弃防御专注爆发。争取在付出代价前摧毁敌人。',
    recommendedRoles: { front: 1, mid: 3, back: 0 },
    defaultSlots: ['front_center', 'mid_top', 'mid_center', 'mid_bottom'],
    buffDescription: '狂暴输出，杀伤极大但自身脆弱'
  },
  custom: {
    id: 'custom',
    name: '自由',
    description: '玩家自定义九宫格站位，根据临场策略灵活调配。',
    recommendedRoles: { front: 1, mid: 2, back: 1 },
    defaultSlots: ['front_center', 'mid_top', 'mid_bottom', 'back_center'],
    buffDescription: '随心调度，自由应变'
  }
};

/**
 * 获取格子所在列的战斗属性修正
 * 前排：承伤 -10%，仇恨 4.5
 * 中排：暴击率 +5%，仇恨 1.2
 * 后排：输出 +10%，治疗 +10%，仇恨 0.55
 */
export function getPositionCombatModifier(col: GridColumn): PositionCombatModifier {
  switch (col) {
    case 'front':
      return {
        col: 'front',
        threatMultiplier: 4.5,
        damageTakenMod: -0.10, // 减伤 10%
        damageDealtMod: 0,
        healingDealtMod: 0,
        critBonus: 0
      };
    case 'mid':
      return {
        col: 'mid',
        threatMultiplier: 1.2,
        damageTakenMod: 0,
        damageDealtMod: 0.05,
        healingDealtMod: 0,
        critBonus: 0.05 // 暴击 +5%
      };
    case 'back':
      return {
        col: 'back',
        threatMultiplier: 0.55,
        damageTakenMod: 0.05, // 若前排没了，后排被近战切容易受额外伤害
        damageDealtMod: 0.10, // 专注输出 +10%
        healingDealtMod: 0.12, // 专注施法治疗 +12%
        critBonus: 0
      };
  }
}

/**
 * 校验阵型健康度（复刻反编译经典的“无人守线”、“几无杀伤”、“无人疗伤”等）
 */
export function validateFormationHealth(
  party: Hero[],
  assignments: FormationSlotAssignment[]
): FormationWarning[] {
  const warnings: FormationWarning[] = [];
  if (party.length === 0) return warnings;

  // 统计前/中/后排角色
  const colCount: Record<GridColumn, number> = { front: 0, mid: 0, back: 0 };
  let tankCount = 0;
  let dpsCount = 0;
  let healerCount = 0;

  for (const h of party) {
    if (h.role === 'tank') tankCount++;
    else if (h.role === 'dps') dpsCount++;
    else if (h.role === 'healer') healerCount++;

    const assign = assignments.find(a => a.heroId === h.id);
    if (assign) {
      const slot = GRID_SLOTS.find(s => s.id === assign.slotId);
      if (slot) colCount[slot.col]++;
    }
  }

  // 1. 无人守线警报
  if (colCount.front === 0) {
    warnings.push({
      level: 'danger',
      title: '无人守住阵线',
      detail: '前排无人防守，敌方近战将毫无阻碍地切入中后排脆弱队友！'
    });
  }

  // 2. 无人疗伤警报
  if (healerCount === 0) {
    warnings.push({
      level: 'warning',
      title: '阵中无人疗伤',
      detail: '队伍中没有医官或治愈者，任何战斗创伤在探险中都将无法自愈。'
    });
  }

  // 3. 杀伤匮乏警报
  if (dpsCount === 0 && party.length >= 3) {
    warnings.push({
      level: 'warning',
      title: '几无杀伤之力',
      detail: '缺乏高输出职业，战斗将被无限拖延，容易面临精神压力暴击危机。'
    });
  }

  // 4. 医官或法师顶前排风险
  for (const h of party) {
    const assign = assignments.find(a => a.heroId === h.id);
    if (assign) {
      const slot = GRID_SLOTS.find(s => s.id === assign.slotId);
      if (slot?.col === 'front' && (h.role === 'healer' || h.classId === 'arcanist')) {
        warnings.push({
          level: 'warning',
          title: `${h.name} 置于前锋危险线`,
          detail: '脆弱的法系/医官身处前排，将承受极高敌方近战打击。'
        });
        break;
      }
    }
  }

  return warnings;
}

/**
 * 根据预设 ID 自动给队伍 4 人分配格子
 */
export function applyPresetToParty(
  presetId: FormationPresetId,
  party: Hero[]
): FormationSlotAssignment[] {
  const preset = FORMATION_PRESETS[presetId];
  if (!preset || party.length === 0) return [];

  // 根据角色特性优先匹配：坦克前排、输出中排、治疗后排
  const sortedHeroes = [...party].sort((a, b) => {
    const roleOrder = { tank: 1, dps: 2, healer: 3 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  const slots = preset.defaultSlots;
  const assignments: FormationSlotAssignment[] = [];

  for (let i = 0; i < sortedHeroes.length && i < slots.length; i++) {
    assignments.push({
      heroId: sortedHeroes[i].id,
      slotId: slots[i]
    });
  }

  return assignments;
}
