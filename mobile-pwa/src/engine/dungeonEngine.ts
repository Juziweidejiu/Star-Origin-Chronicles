/**
 * 地牢生成器与暗黑式装备掉落引擎
 * Milestone 3: 深度地牢生成与营地机制
 */

import type { DungeonInstance, DungeonRoom, RoomType, CampRole, CampRestResult } from '../types/dungeon';
import type { Hero, ClassId, Equipment } from '../types/hero';
import type { GuildContract } from '../types/world';

// 装备前缀词缀库
const PREFIX_LIST = [
  { name: '冷酷的', bonusDmg: 8, bonusHp: 0, bonusArmor: 0 },
  { name: '坚毅的', bonusDmg: 0, bonusHp: 35, bonusArmor: 8 },
  { name: '嗜血的', bonusDmg: 14, bonusHp: -10, bonusArmor: 0 },
  { name: '神圣的', bonusDmg: 5, bonusHp: 20, bonusArmor: 5 },
  { name: '狂暴的', bonusDmg: 18, bonusHp: -15, bonusArmor: -2 },
  { name: '钢铁的', bonusDmg: 0, bonusHp: 15, bonusArmor: 15 },
  { name: '泰坦的', bonusDmg: 10, bonusHp: 50, bonusArmor: 12 },
  { name: '虚空的', bonusDmg: 25, bonusHp: -20, bonusArmor: -5 },
];

// 装备后缀词缀库
const SUFFIX_LIST = [
  { name: '之惩戒', bonusDmg: 10, bonusHp: 0, bonusArmor: 0 },
  { name: '之壁垒', bonusDmg: 0, bonusHp: 25, bonusArmor: 10 },
  { name: '之苏生', bonusDmg: 0, bonusHp: 40, bonusArmor: 0 },
  { name: '之杀戮', bonusDmg: 16, bonusHp: 0, bonusArmor: -3 },
  { name: '之守护神', bonusDmg: 5, bonusHp: 30, bonusArmor: 8 },
  { name: '之不朽', bonusDmg: 8, bonusHp: 60, bonusArmor: 14 },
];

// 基础装备模板
const BASE_EQUIPMENT_POOL = [
  { name: '长剑', slot: 'weapon' as const, baseDmg: 12, baseHp: 0, baseArmor: 0 },
  { name: '战斧', slot: 'weapon' as const, baseDmg: 16, baseHp: 0, baseArmor: -2 },
  { name: '法杖', slot: 'weapon' as const, baseDmg: 15, baseHp: 10, baseArmor: 0 },
  { name: '强弓', slot: 'weapon' as const, baseDmg: 14, baseHp: 0, baseArmor: 0 },
  { name: '锁子甲', slot: 'armor' as const, baseDmg: 0, baseHp: 30, baseArmor: 12 },
  { name: '重板甲', slot: 'armor' as const, baseDmg: 0, baseHp: 50, baseArmor: 20 },
  { name: '符文法袍', slot: 'armor' as const, baseDmg: 4, baseHp: 20, baseArmor: 6 },
  { name: '抗压护符', slot: 'trinket' as const, baseDmg: 3, baseHp: 20, baseArmor: 4 },
  { name: '勇士勋章', slot: 'trinket' as const, baseDmg: 8, baseHp: 15, baseArmor: 2 },
  { name: '生命宝石', slot: 'trinket' as const, baseDmg: 0, baseHp: 45, baseArmor: 0 },
];

/**
 * 生成随机暗黑式装备
 */
export function generateRandomLoot(stars: number = 1): Equipment {
  const base = BASE_EQUIPMENT_POOL[Math.floor(Math.random() * BASE_EQUIPMENT_POOL.length)];
  const roll = Math.random() * 100 + stars * 5;

  let rarity: Equipment['rarity'] = 'common';
  let numAffixes = 0;

  if (roll > 105) {
    rarity = 'legendary';
    numAffixes = 2;
  } else if (roll > 85) {
    rarity = 'epic';
    numAffixes = 2;
  } else if (roll > 60) {
    rarity = 'rare';
    numAffixes = 1;
  } else if (roll > 35) {
    rarity = 'uncommon';
    numAffixes = 1;
  } else {
    rarity = 'common';
    numAffixes = 0;
  }

  let finalName = base.name;
  let bonusDmg = base.baseDmg;
  let bonusHp = base.baseHp;
  let bonusArmor = base.baseArmor;
  const affixes: string[] = [];

  if (numAffixes >= 1) {
    const prefix = PREFIX_LIST[Math.floor(Math.random() * PREFIX_LIST.length)];
    finalName = `${prefix.name}${finalName}`;
    bonusDmg += prefix.bonusDmg;
    bonusHp += prefix.bonusHp;
    bonusArmor += prefix.bonusArmor;
    affixes.push(`${prefix.name.slice(0, -1)}加成`);
  }

  if (numAffixes >= 2) {
    const suffix = SUFFIX_LIST[Math.floor(Math.random() * SUFFIX_LIST.length)];
    finalName = `${finalName}${suffix.name}`;
    bonusDmg += suffix.bonusDmg;
    bonusHp += suffix.bonusHp;
    bonusArmor += suffix.bonusArmor;
    affixes.push(`${suffix.name}加成`);
  }

  return {
    id: `loot_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name: finalName,
    slot: base.slot,
    rarity,
    bonusDamage: Math.max(0, bonusDmg),
    bonusHp: Math.max(0, bonusHp),
    bonusArmor: Math.max(0, bonusArmor),
    affixText: affixes.length > 0 ? affixes.join(' · ') : undefined,
  };
}

/**
 * 根据契约生成程序化地牢
 */
export function generateDungeonFromContract(contract: GuildContract): DungeonInstance {
  const roomCount = Math.min(8, 4 + contract.stars); // 5 - 8 个房间序列
  const rooms: DungeonRoom[] = [];

  // 第1间必为前哨战斗
  rooms.push({
    index: 0,
    type: 'battle',
    title: '地牢前哨',
    description: '入口处有警戒游荡的敌人守备，必须突破防线才能深入。',
    status: 'current',
    cleared: false,
    enemyClasses: contract.enemyClasses.slice(0, 2),
    enemyLevel: contract.enemyLevel,
    isBoss: false,
  });

  // 中间房间池 (陷阱、宝箱、营地、突袭战)
  const roomTypesPool: RoomType[] = ['battle', 'trap', 'chest', 'camp'];
  
  // 确保至少有 1 个营地房与 1 个宝箱房
  let hasCamp = false;
  let hasChest = false;

  for (let i = 1; i < roomCount - 1; i++) {
    let rType: RoomType;
    if (i === Math.floor(roomCount / 2) && !hasCamp) {
      rType = 'camp';
      hasCamp = true;
    } else if (i === roomCount - 2 && !hasChest) {
      rType = 'chest';
      hasChest = true;
    } else {
      rType = roomTypesPool[Math.floor(Math.random() * roomTypesPool.length)];
      if (rType === 'camp') hasCamp = true;
      if (rType === 'chest') hasChest = true;
    }

    if (rType === 'battle') {
      rooms.push({
        index: i,
        type: 'battle',
        title: `幽深走廊 · 第 ${i + 1} 厅`,
        description: '潜伏在阴影中的巡逻怪群阻挡了去路。',
        status: 'hidden',
        cleared: false,
        enemyClasses: contract.enemyClasses,
        enemyLevel: contract.enemyLevel,
        isBoss: false,
      });
    } else if (rType === 'trap') {
      rooms.push({
        index: i,
        type: 'trap',
        title: '古代机关陷阱',
        description: '地面遍布落石与毒刺机关，考验前锋的敏捷与战术直觉！',
        status: 'hidden',
        cleared: false,
        trapDisarmed: false,
        trapDamage: 15 + contract.stars * 8,
      });
    } else if (rType === 'chest') {
      rooms.push({
        index: i,
        type: 'chest',
        title: '遗落的封印宝箱',
        description: '地宫角落闪烁着宝箱微光，蕴藏着金币与稀有武装。',
        status: 'hidden',
        cleared: false,
        chestOpened: false,
        chestGold: 80 * contract.stars + Math.floor(Math.random() * 50),
        chestItem: generateRandomLoot(contract.stars),
      });
    } else {
      rooms.push({
        index: i,
        type: 'camp',
        title: '营地安全区',
        description: '厚重的石门隔绝了嘶吼。在此点燃篝火，分工休整能大幅恢复元气与减压。',
        status: 'hidden',
        cleared: false,
        campUsed: false,
      });
    }
  }

  // 最后一间必为 Boss 房
  rooms.push({
    index: roomCount - 1,
    type: 'boss',
    title: `深渊王座 · 最终首领`,
    description: `契约的核心目标！首领统率精锐部队在此踞守。击破即可完成委托！`,
    status: 'hidden',
    cleared: false,
    enemyClasses: [...contract.enemyClasses, 'paladin' as ClassId],
    enemyLevel: contract.enemyLevel + 1,
    isBoss: true,
  });

  return {
    id: `dungeon_${Date.now()}`,
    name: contract.title,
    theme: contract.type === 'undead_crypt' ? 'crypt' : contract.type === 'ruins_cleansing' ? 'ruins' : 'catacomb',
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

/**
 * 营地分工休整结算
 * 医护管事 (Tender): 1.8x 疗愈全队生命
 * 警戒哨兵 (Sentry): 降低警戒压力，减压效果翻倍 (2.0x)
 */
export function executeCampRest(
  squad: Hero[],
  assignments: Record<string, CampRole>, // heroId -> CampRole
  rationsAvailable: number
): { success: boolean; message: string; result?: CampRestResult } {
  const rationsNeeded = squad.length;
  if (rationsAvailable < rationsNeeded) {
    return {
      success: false,
      message: `⚠️ 口粮不足！营地休整需要 ${rationsNeeded} 份口粮（当前仅有 ${rationsAvailable} 份）。`,
    };
  }

  // 检查是否指派了医护管事与警戒哨兵
  const hasTender = squad.some(h => assignments[h.id] === 'tender');
  const hasSentry = squad.some(h => assignments[h.id] === 'sentry');

  const healMultiplier = hasTender ? 1.8 : 1.0;
  const stressReliefMultiplier = hasSentry ? 2.0 : 1.0;

  const healedHeroes: CampRestResult['healedHeroes'] = [];
  const stressRelievedHeroes: CampRestResult['stressRelievedHeroes'] = [];

  squad.forEach(hero => {
    if (hero.currentHp > 0) {
      // 基础治疗量 25% 最大生命
      const baseHeal = Math.round(hero.maxHp * 0.25);
      const actualHeal = Math.min(hero.maxHp - hero.currentHp, Math.round(baseHeal * healMultiplier));
      hero.currentHp += actualHeal;
      healedHeroes.push({ heroId: hero.id, name: hero.name, amount: actualHeal });

      // 基础减压 20 点
      const baseStressRelief = 20;
      const actualRelief = Math.min(hero.stress, Math.round(baseStressRelief * stressReliefMultiplier));
      hero.stress = Math.max(0, hero.stress - actualRelief);
      stressRelievedHeroes.push({ heroId: hero.id, name: hero.name, amount: actualRelief });
    }
  });

  return {
    success: true,
    message: `🏕️ 篝火升起！全队休整完毕（${hasTender ? '医护管事加护 +80% 疗效 ' : ''}${hasSentry ? '警戒哨兵站岗 -100% 警戒恐慌' : ''}）。消耗 ${rationsNeeded} 份口粮。`,
    result: {
      healedHeroes,
      stressRelievedHeroes,
      consumedRations: rationsNeeded,
    },
  };
}
