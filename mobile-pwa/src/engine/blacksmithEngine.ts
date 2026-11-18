/**
 * 铁匠铺引擎：分解 / 打造 / 重铸 / 洗练
 *
 * 设计取自原版锻造面板：
 *  - 打造按「联赛水准」定装等，并按穿戴者量身定做
 *  - 每件装备只能重铸一次，全部属性 +18%，名称前加「重铸·」
 *  - 装备自带品质系数（0.82-1.18），已在生成时折算进数值
 */

import type { Affix, CoreStatKey, Equipment } from '../types/hero';
import type { CompanyLogistics } from '../types/world';
import {
  EQUIPMENT_TEMPLATES,
  REFORGE_BONUS,
  createEquipmentFromTemplate,
  formatAffixText,
  rerollEquipmentAffixes,
  rollRarity,
  RARITY_ORDER
} from './dungeonEngine';

export const CRAFT_TIER_MAX = 5;

export interface BlacksmithResult {
  success: boolean;
  message: string;
  item?: Equipment;
}

export interface CraftCost {
  gold: number;
  stones: number;
  ore: number;
}

export interface SalvageYield {
  gold: number;
  stones: number;
  ore: number;
}

function discountGold(value: number, discount: number): number {
  return Math.max(1, Math.round(value * discount));
}

function rarityRank(item: Equipment): number {
  return Math.max(1, RARITY_ORDER.indexOf(item.rarity) + 1);
}

const PERCENTISH: CoreStatKey[] = ['critChance', 'critDamage', 'attackSpeed', 'tenacity'];

function scaleValue(key: CoreStatKey, value: number, mult: number, isPercent: boolean): number {
  if (isPercent || PERCENTISH.includes(key)) {
    return Math.round(value * mult * 1000) / 1000;
  }
  return Math.max(1, Math.round(value * mult));
}

/** 英雄等级对应的打造装等：越高阶的佣兵，铁匠会按更高标准备料 */
export function tierForHeroLevel(level: number): number {
  return Math.max(1, Math.min(CRAFT_TIER_MAX, Math.ceil(level / 4)));
}

/** 打造费用：装等越高，材料与工钱越贵 */
export function craftCost(tier: number, discount = 1): CraftCost {
  const t = Math.max(1, Math.min(CRAFT_TIER_MAX, tier));
  return {
    gold: discountGold(90 + 60 * t, discount),
    stones: 2 * t,
    ore: t
  };
}

/** 分解收益：品质越高、装等越高，回收越多 */
export function salvageYield(item: Equipment): SalvageYield {
  const rank = rarityRank(item);
  return {
    gold: 10 * rank * item.tier,
    stones: rank * item.tier,
    ore: rank >= 3 ? Math.ceil(rank / 2) * item.tier : 0
  };
}

/** 重铸费用：每件装备只能重铸一次 */
export function reforgeCost(item: Equipment, discount = 1): number {
  return discountGold(50 + 35 * item.tier, discount);
}

/** 洗练费用 */
export function rerollCost(item: Equipment, discount = 1): CraftCost {
  return {
    gold: discountGold(40 * item.tier, discount),
    stones: 2 * item.tier,
    ore: 0
  };
}

export function craftEquipment(
  templateIndex: number,
  tier: number,
  logistics: CompanyLogistics,
  discount = 1
): BlacksmithResult {
  const template = EQUIPMENT_TEMPLATES[templateIndex];
  if (!template) {
    return { success: false, message: '未找到对应图纸。' };
  }

  const t = Math.max(1, Math.min(CRAFT_TIER_MAX, tier));
  const cost = craftCost(t, discount);
  if (logistics.gold < cost.gold) {
    return { success: false, message: `金币不足，打造需要 ${cost.gold}G。` };
  }
  if (logistics.forgeStones < cost.stones) {
    return { success: false, message: `锻造晶石不足，打造需要 ${cost.stones} 枚。` };
  }
  if (logistics.ironOre < cost.ore) {
    return { success: false, message: `玄铁锭不足，打造需要 ${cost.ore} 块。` };
  }

  logistics.gold -= cost.gold;
  logistics.forgeStones -= cost.stones;
  logistics.ironOre -= cost.ore;

  const rarity = rollRarity(t * 6);
  const item = createEquipmentFromTemplate(template, rarity, t);

  return {
    success: true,
    message: `锻造完成：${item.name}（品质 ${item.quality.toFixed(2)}）。`,
    item
  };
}

export function salvageEquipment(item: Equipment, logistics: CompanyLogistics): BlacksmithResult {
  const gain = salvageYield(item);
  logistics.gold += gain.gold;
  logistics.forgeStones += gain.stones;
  logistics.ironOre += gain.ore;

  const oreText = gain.ore > 0 ? `、玄铁锭 +${gain.ore}` : '';
  return {
    success: true,
    message: `分解 ${item.name}：金币 +${gain.gold}、锻造晶石 +${gain.stones}${oreText}。`
  };
}

/** 重铸：一次性提升全部基础与词缀数值，并重命名 */
export function reforgeEquipment(
  item: Equipment,
  logistics: CompanyLogistics,
  discount = 1
): BlacksmithResult {
  if (item.reforged) {
    return { success: false, message: `${item.name} 已经重铸过，每件装备只能重铸一次。` };
  }

  const cost = reforgeCost(item, discount);
  if (logistics.gold < cost) {
    return { success: false, message: `金币不足，重铸需要 ${cost}G。` };
  }

  logistics.gold -= cost;

  const mult = 1 + REFORGE_BONUS;
  const base: Partial<Record<CoreStatKey, number>> = {};
  for (const [key, value] of Object.entries(item.base) as [CoreStatKey, number][]) {
    base[key] = scaleValue(key, value, mult, false);
  }
  const affixes: Affix[] = item.affixes.map(a => ({
    ...a,
    value: scaleValue(a.stat, a.value, mult, a.kind === 'percent')
  }));

  item.base = base;
  item.affixes = affixes;
  item.affixText = affixes.length > 0 ? affixes.map(formatAffixText).join(' · ') : undefined;
  item.reforged = true;
  if (!item.name.startsWith('重铸·')) item.name = `重铸·${item.name}`;

  return {
    success: true,
    message: `${item.name} 重铸完成，全部属性提升 18%。`,
    item
  };
}

export function rerollEquipment(item: Equipment, logistics: CompanyLogistics, discount = 1): BlacksmithResult {
  if (item.rarity === 'common') {
    return { success: false, message: '粗制装备没有词缀，洗练无法产出词条。' };
  }

  const cost = rerollCost(item, discount);
  if (logistics.gold < cost.gold) {
    return { success: false, message: `金币不足，洗练需要 ${cost.gold}G。` };
  }
  if (logistics.forgeStones < cost.stones) {
    return { success: false, message: `锻造晶石不足，洗练需要 ${cost.stones} 枚。` };
  }

  logistics.gold -= cost.gold;
  logistics.forgeStones -= cost.stones;

  const rerolled = rerollEquipmentAffixes(item);
  item.affixes = rerolled.affixes;
  item.affixText = rerolled.affixText;

  return {
    success: true,
    message: `${item.name} 洗练完成：${item.affixText ?? '无词缀'}。`,
    item
  };
}
