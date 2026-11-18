/**
 * 地牢生成与营地料理引擎
 * Milestone 3 / P1: 房间生成、奇遇融入、二选一分叉与一键热汤休整
 */

import type { ClassId, Equipment, CoreStatKey, Affix } from '../types/hero';
import type { DungeonInstance, DungeonRoom, RoomType, CampRestResult, CampMealType } from '../types/dungeon';
import type { GuildContract } from '../types/world';
import { enemyCountForStars } from './enemyFactory';
import { MOCK_DUNGEON_EVENTS } from '../data/mockNarratives';

export interface EquipmentBlueprint {
  name: string;
  slot: Equipment['slot'];
  base: Partial<Record<CoreStatKey, number>>;
}

// 可复用装备图鉴：掉落、铁匠铺打造共用同一套底板
export const EQUIPMENT_TEMPLATES: EquipmentBlueprint[] = [
  // 武器 (weapon)
  { name: '精钢长剑', slot: 'weapon', base: { ad: 14, critChance: 0.05 } },
  { name: '破阵大戟', slot: 'weapon', base: { ad: 20, penetration: 5 } },
  { name: '青木法杖', slot: 'weapon', base: { ap: 18, healingPower: 10 } },
  { name: '精铁短弓', slot: 'weapon', base: { ad: 12, attackSpeed: 0.1 } },
  // 防具 (armor)
  { name: '锁子甲', slot: 'armor', base: { armor: 14, maxHp: 35 } },
  { name: '坚木重铠', slot: 'armor', base: { armor: 22, maxHp: 60 } },
  { name: '编织法袍', slot: 'armor', base: { magicResist: 18, maxHp: 25 } },
  { name: '巡林皮甲', slot: 'armor', base: { armor: 8, magicResist: 8, maxHp: 30 } },
  // 饰品 (trinket)
  { name: '狼牙吊坠', slot: 'trinket', base: { critChance: 0.06, ad: 5 } },
  { name: '翡翠玉佩', slot: 'trinket', base: { healingPower: 14, maxHp: 20 } },
  { name: '星辉指环', slot: 'trinket', base: { ap: 10, magicResist: 6 } },
  { name: '青铜护符', slot: 'trinket', base: { armor: 8, tenacity: 0.08 } },
];

export const RARITY_LABEL: Record<Equipment['rarity'], string> = {
  common: '粗制',
  uncommon: '精良',
  rare: '稀有',
  epic: '史诗',
  legendary: '传奇',
};

export const RARITY_ORDER: Equipment['rarity'][] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const AFFIX_COUNT: Record<Equipment['rarity'], number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

type AffixDef = {
  stat: CoreStatKey;
  kind: 'flat' | 'percent';
  min: number;
  max: number;
  label: string;
};

// 词缀定义：label 直接采用与九维属性面板统一的纯白话名称
const AFFIX_POOL: Record<Equipment['slot'], AffixDef[]> = {
  weapon: [
    { stat: 'ad', kind: 'percent', min: 0.08, max: 0.22, label: '物攻' },
    { stat: 'ap', kind: 'percent', min: 0.08, max: 0.24, label: '法攻' },
    { stat: 'attackSpeed', kind: 'percent', min: 0.06, max: 0.16, label: '攻速' },
    { stat: 'critChance', kind: 'flat', min: 0.03, max: 0.08, label: '暴击' },
    { stat: 'penetration', kind: 'flat', min: 4, max: 14, label: '穿透' },
  ],
  armor: [
    { stat: 'maxHp', kind: 'percent', min: 0.06, max: 0.18, label: '生命' },
    { stat: 'armor', kind: 'flat', min: 6, max: 18, label: '物防' },
    { stat: 'magicResist', kind: 'flat', min: 6, max: 18, label: '法防' },
    { stat: 'tenacity', kind: 'flat', min: 0.05, max: 0.15, label: '韧性' },
  ],
  trinket: [
    { stat: 'critDamage', kind: 'flat', min: 0.12, max: 0.35, label: '暴伤' },
    { stat: 'healingPower', kind: 'flat', min: 8, max: 24, label: '治疗' },
    { stat: 'ap', kind: 'flat', min: 6, max: 16, label: '法攻' },
    { stat: 'critChance', kind: 'flat', min: 0.03, max: 0.07, label: '暴击' },
    { stat: 'ad', kind: 'flat', min: 4, max: 12, label: '物攻' },
  ],
};

/** 按幸运值（星级/锻造水准）抽取品质 */
export function rollRarity(luck = 0): Equipment['rarity'] {
  const roll = Math.random() * 100 + luck;
  if (roll > 105) return 'legendary';
  if (roll > 86) return 'epic';
  if (roll > 62) return 'rare';
  if (roll > 38) return 'uncommon';
  return 'common';
}

export function formatAffixText(a: Affix): string {
  // 暴击率与暴伤属于加算浮点，展示为百分比
  if (a.kind === 'percent' || a.stat === 'critChance' || a.stat === 'critDamage' || a.stat === 'tenacity') {
    return `${a.label} +${Math.round(a.value * 100)}%`;
  }
  return `${a.label} +${a.value}`;
}

/** 按部位、品质与装等生成一组互不重复的词缀 */
export function buildAffixes(slot: Equipment['slot'], rarity: Equipment['rarity'], tier: number): Affix[] {
  const tierMult = 1 + 0.3 * (tier - 1);
  const pool = [...AFFIX_POOL[slot]];
  const affixes: Affix[] = [];
  for (let i = 0; i < AFFIX_COUNT[rarity] && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const def = pool.splice(idx, 1)[0];
    const raw = def.min + Math.random() * (def.max - def.min);
    const scaled = def.kind === 'percent' ? raw * (1 + 0.15 * (tier - 1)) : raw * tierMult;
    // 整型属性取整；百分比与暴击暴伤保留两位小数
    let value = Math.round(scaled * 100) / 100;
    if (['ad', 'ap', 'armor', 'magicResist', 'maxHp', 'healingPower', 'penetration'].includes(def.stat) && def.kind === 'flat') {
      value = Math.round(scaled);
    }
    affixes.push({ stat: def.stat, kind: def.kind, value, label: def.label });
  }
  return affixes;
}

/** 按装等缩放底板基础属性 */
export function scaleTemplateBase(template: EquipmentBlueprint, tier: number): Partial<Record<CoreStatKey, number>> {
  const tierMult = 1 + 0.3 * (tier - 1);
  const base: Partial<Record<CoreStatKey, number>> = {};
  for (const [key, value] of Object.entries(template.base) as [CoreStatKey, number][]) {
    if (key === 'critChance' || key === 'attackSpeed' || key === 'tenacity') {
      base[key] = Math.round(value * tierMult * 100) / 100;
    } else {
      base[key] = Math.round(value * tierMult);
    }
  }
  return base;
}

/** 品质系数：0.82（粗劣）~ 1.18（极品），已折算进装备数值 */
export const QUALITY_MIN = 0.82;
export const QUALITY_MAX = 1.18;
/** 重铸一次性加成：全部属性 +18% */
export const REFORGE_BONUS = 0.18;

export function rollQuality(): number {
  return Math.round((QUALITY_MIN + Math.random() * (QUALITY_MAX - QUALITY_MIN)) * 100) / 100;
}

/** 品质分档：破损 / 粗劣 / 普通 / 精良 / 极品 */
export function qualityLabel(quality: number): string {
  if (quality < 0.75) return '破损';
  if (quality < 0.875) return '粗劣';
  if (quality < 1) return '普通';
  if (quality < 1.125) return '精良';
  return '极品';
}

const PERCENTISH_STATS: CoreStatKey[] = ['critChance', 'critDamage', 'attackSpeed', 'tenacity'];

function scaleStatValue(key: CoreStatKey, value: number, mult: number): number {
  const scaled = value * mult;
  return PERCENTISH_STATS.includes(key)
    ? Math.round(scaled * 1000) / 1000
    : Math.round(scaled);
}

function scaleAffixes(affixes: Affix[], mult: number): Affix[] {
  return affixes.map(a => ({
    ...a,
    value: a.kind === 'percent' || PERCENTISH_STATS.includes(a.stat)
      ? Math.round(a.value * mult * 1000) / 1000
      : Math.max(1, Math.round(a.value * mult))
  }));
}

/** 用指定图鉴/品质/装等铸造一件装备 */
export function createEquipmentFromTemplate(
  template: EquipmentBlueprint,
  rarity: Equipment['rarity'],
  tier: number,
  quality = rollQuality()
): Equipment {
  const baseRaw = scaleTemplateBase(template, tier);
  const base: Partial<Record<CoreStatKey, number>> = {};
  for (const [key, value] of Object.entries(baseRaw) as [CoreStatKey, number][]) {
    base[key] = scaleStatValue(key, value, quality);
  }

  const affixes = scaleAffixes(buildAffixes(template.slot, rarity, tier), quality);
  return {
    id: `eq_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name: `${RARITY_LABEL[rarity]}·${template.name}`,
    slot: template.slot,
    rarity,
    tier,
    quality,
    base,
    affixes,
    affixText: affixes.length > 0 ? affixes.map(formatAffixText).join(' · ') : undefined,
  };
}

/** 洗练：保留装备本体与品质，重铸全部词缀 */
export function rerollEquipmentAffixes(item: Equipment): Equipment {
  const mult = item.quality * (item.reforged ? 1 + REFORGE_BONUS : 1);
  const affixes = scaleAffixes(buildAffixes(item.slot, item.rarity, item.tier), mult);
  return {
    ...item,
    affixes,
    affixText: affixes.length > 0 ? affixes.map(formatAffixText).join(' · ') : undefined,
  };
}

export function generateRandomLoot(stars: number): Equipment {
  const template = EQUIPMENT_TEMPLATES[Math.floor(Math.random() * EQUIPMENT_TEMPLATES.length)];
  const tier = Math.max(1, Math.min(5, stars));
  const rarity = rollRarity(stars * 4);
  return createEquipmentFromTemplate(template, rarity, tier);
}

function pickEnemyClasses(pool: ClassId[], count: number): ClassId[] {
  const out: ClassId[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[i % pool.length]);
  }
  return out;
}

/** 生成单个特定类型的房间，文案克制自然，无多余形容词 */
export function createSingleRoom(
  index: number,
  rType: RoomType,
  contract: GuildContract
): DungeonRoom {
  const battleCount = enemyCountForStars(contract.stars);

  if (rType === 'battle') {
    return {
      index,
      type: 'battle',
      title: `哨道关卡 · 第 ${index + 1} 厅`,
      description: '前方有守卫哨卒列阵阻拦。',
      status: 'hidden',
      cleared: false,
      enemyClasses: pickEnemyClasses(contract.enemyClasses, battleCount),
      enemyLevel: contract.enemyLevel,
      isBoss: false,
    };
  }

  if (rType === 'event') {
    const ev = MOCK_DUNGEON_EVENTS[Math.floor(Math.random() * MOCK_DUNGEON_EVENTS.length)];
    return {
      index,
      type: 'event',
      title: `秘境奇遇 · ${ev.title}`,
      description: ev.hook,
      status: 'hidden',
      cleared: false,
      dungeonEvent: ev,
      eventResolved: false,
    };
  }

  if (rType === 'trap') {
    return {
      index,
      type: 'trap',
      title: '山道暗器关卡',
      description: '地面与岩壁布有机括暗桩，需敏锐探查破除。',
      status: 'hidden',
      cleared: false,
      trapDisarmed: false,
      trapDamage: 15 + contract.stars * 8,
    };
  }

  if (rType === 'chest') {
    return {
      index,
      type: 'chest',
      title: '军械储物箱',
      description: '岩隙角落留有行商或斥候藏纳的铁箱。',
      status: 'hidden',
      cleared: false,
      chestOpened: false,
      chestGold: 80 * contract.stars + Math.floor(Math.random() * 50),
      chestItem: generateRandomLoot(contract.stars),
    };
  }

  // camp
  return {
    index,
    type: 'camp',
    title: '避风休整点',
    description: '干燥岩窟，背风避险。生火煮汤可恢复体能与战意。',
    status: 'hidden',
    cleared: false,
    campUsed: false,
  };
}

/**
 * 根据契约生成程序化地牢
 * 支持分支路线（每个节点具备备选房间）
 */
export function generateDungeonFromContract(contract: GuildContract): DungeonInstance {
  const roomCount = Math.min(7, 4 + contract.stars); // 5 - 7 间
  const rooms: DungeonRoom[] = [];

  // 第1间：入口巡哨
  const room0: DungeonRoom = {
    index: 0,
    type: 'battle',
    title: '外围巡哨',
    description: '入口外围有哨探戒备，需先拔除。',
    status: 'current',
    cleared: false,
    enemyClasses: pickEnemyClasses(contract.enemyClasses, 2),
    enemyLevel: contract.enemyLevel,
    isBoss: false,
  };
  rooms.push(room0);

  // 中间房间池（加入 event 奇遇事件）
  const middleTypes: RoomType[] = ['battle', 'event', 'trap', 'chest'];
  const campIndex = Math.floor(roomCount / 2);

  for (let i = 1; i < roomCount - 1; i++) {
    let primaryType: RoomType;
    let alternateType: RoomType;

    if (i === campIndex) {
      primaryType = 'camp';
      alternateType = 'chest';
    } else if (i === 1) {
      primaryType = 'battle';
      alternateType = 'event';
    } else {
      primaryType = middleTypes[Math.floor(Math.random() * middleTypes.length)];
      alternateType = primaryType === 'battle' ? 'event' : 'battle';
    }

    const mainRoom = createSingleRoom(i, primaryType, contract);
    const altRoom = createSingleRoom(i, alternateType, contract);

    // 并非每一关都是岔路：仅在关键节点（例如中间层或特定探索层）出现岔路分支（约 35%~40% 概率）
    // 其余绝大多数为单一路线直行推进，避免玩家产生无意义的频繁抉择疲劳
    const shouldBranch = i > 1 && i !== campIndex && (i % 2 === 1 || Math.random() < 0.35);

    if (shouldBranch) {
      rooms[i - 1].branchOptions = [
        { ...mainRoom },
        { ...altRoom, title: `分岔·${altRoom.title}` },
      ];
    } else {
      // 单一路线直行
      rooms[i - 1].branchOptions = [
        { ...mainRoom },
      ];
    }

    rooms.push(mainRoom);
  }

  // 最后一间必为首领战，前一间二选一指向首领战
  const bossCount = enemyCountForStars(contract.stars, true);
  const bossRoom: DungeonRoom = {
    index: roomCount - 1,
    type: 'boss',
    title: '核心关隘 · 最终敌阵',
    description: '委托的核心目标正在前线集结。击溃即可完成任务。',
    status: 'hidden',
    cleared: false,
    enemyClasses: pickEnemyClasses(contract.enemyClasses, bossCount),
    enemyLevel: contract.enemyLevel + 1,
    isBoss: true,
  };
  rooms[roomCount - 2].branchOptions = [
    { ...bossRoom },
  ];
  rooms.push(bossRoom);

  return {
    id: `dungeon_${Date.now()}`,
    name: contract.title,
    theme: contract.type === 'goblin_mine' ? 'catacomb' : contract.type === 'ruins_cleansing' ? 'ruins' : 'wilds',
    stars: contract.stars,
    totalRooms: rooms.length,
    currentRoomIndex: 0,
    rooms,
    isCompleted: false,
    isFailed: false,
    accumulatedGold: 0,
    accumulatedSoulCrystals: 0,
    lootItems: [],
  };
}

/** 营地伙伴偶尔说的一句自然闲聊（低频，杜绝全员复读） */
const CAMP_SNIPPETS = [
  '这锅肉汤放了雪莲干，手脚都暖和了。',
  '刚才那一仗刀刃有些钝，刚好磨一磨。',
  '水囊灌满了，接下来的路好走些。',
  '风向转北了，前面几间大家留神。',
  '大家动作放轻，火堆不要烧出浓烟。',
];

/**
 * 现代轻量营地：一键全队煮汤休整与生活料理互动
 * 消耗全队口粮，治愈伤势、安抚压力，并提供临时探险料理 Buff
 */
export function executeQuickCampMeal(
  squad: import('../types/hero').Hero[],
  mealType: CampMealType,
  rationsAvailable: number
): { success: boolean; message: string; result?: CampRestResult; buff?: DungeonInstance['campBuff'] } {
  const rationsNeeded = squad.length;
  if (rationsAvailable < rationsNeeded) {
    return {
      success: false,
      message: `口粮不足。全队休整需要 ${rationsNeeded} 份口粮（现有 ${rationsAvailable} 份）。`,
    };
  }

  const healedHeroes: CampRestResult['healedHeroes'] = [];
  const stressRelievedHeroes: CampRestResult['stressRelievedHeroes'] = [];

  // 料理类型效果微调
  // soup: 均衡回血减压
  // meat: 偏重体能回复，附带攻击加成
  // tea: 偏重宁神减压，附带抗性防御加成
  let hpRestoreRate = 0.35;
  let stressRestoreAmount = 25;
  let buff: DungeonInstance['campBuff'] = undefined;

  if (mealType === 'soup') {
    hpRestoreRate = 0.40;
    stressRestoreAmount = 30;
    buff = { name: '热汤暖胃', description: '全员体魄充沛，受疗效果微增 10%', healBonusPercent: 0.1 };
  } else if (mealType === 'meat') {
    hpRestoreRate = 0.50;
    stressRestoreAmount = 18;
    buff = { name: '炙肉饱食', description: '战意昂扬，物攻提高 8%', adBonusPercent: 0.08 };
  } else {
    hpRestoreRate = 0.28;
    stressRestoreAmount = 40;
    buff = { name: '清心松针茶', description: '心如止水，护甲抗性提高 10%', armorBonusPercent: 0.1 };
  }

  squad.forEach(hero => {
    if (hero.currentHp > 0) {
      const healAmt = Math.min(hero.maxHp - hero.currentHp, Math.round(hero.maxHp * hpRestoreRate));
      hero.currentHp += healAmt;
      healedHeroes.push({ heroId: hero.id, name: hero.name, amount: healAmt });

      const stressRelief = Math.min(hero.stress, stressRestoreAmount);
      hero.stress = Math.max(0, hero.stress - stressRelief);
      stressRelievedHeroes.push({ heroId: hero.id, name: hero.name, amount: stressRelief });
    }
  });

  // 随机挑 1 位队友讲一句随和闲聊
  const randomHero = squad[Math.floor(Math.random() * squad.length)];
  const chatText = CAMP_SNIPPETS[Math.floor(Math.random() * CAMP_SNIPPETS.length)];

  return {
    success: true,
    message: `全队休整完毕。消耗 ${rationsNeeded} 份口粮。`,
    result: {
      healedHeroes,
      stressRelievedHeroes,
      consumedRations: rationsNeeded,
      buffApplied: buff?.name,
      chatSnippet: { speakerName: randomHero.name, text: chatText },
    },
    buff,
  };
}
