/**
 * 地牢生成器与暗黑式装备掉落引擎
 * Milestone 3: 深度地牢生成与营地机制
 */

import type { DungeonInstance, DungeonRoom, RoomType, CampRole, CampRestResult } from '../types/dungeon';
import type { Hero, ClassId, Equipment, CoreStatKey, Affix } from '../types/hero';
import type { GuildContract } from '../types/world';
import { enemyCountForStars } from './enemyFactory';

// ── 装备掉落：基础模板 + 词条（PoE 式结构，属性走 9 项核心面板） ──

type AffixRoll = { stat: CoreStatKey; kind: 'flat' | 'percent'; min: number; max: number; label: string };

const AFFIX_POOL: Record<'weapon' | 'armor' | 'trinket', AffixRoll[]> = {
  weapon: [
    { stat: 'ad', kind: 'percent', min: 0.04, max: 0.08, label: '物攻' },
    { stat: 'ap', kind: 'percent', min: 0.05, max: 0.09, label: '法攻' },
    { stat: 'attackSpeed', kind: 'percent', min: 0.03, max: 0.06, label: '攻速' },
    { stat: 'critChance', kind: 'flat', min: 0.01, max: 0.03, label: '暴击' },
    { stat: 'penetration', kind: 'flat', min: 2, max: 5, label: '穿透' },
  ],
  armor: [
    { stat: 'maxHp', kind: 'percent', min: 0.05, max: 0.1, label: '生命' },
    { stat: 'armor', kind: 'flat', min: 3, max: 6, label: '物防' },
    { stat: 'magicResist', kind: 'flat', min: 3, max: 6, label: '法防' },
    { stat: 'tenacity', kind: 'flat', min: 0.03, max: 0.08, label: '韧性' },
  ],
  trinket: [
    { stat: 'critDamage', kind: 'flat', min: 0.08, max: 0.18, label: '暴伤' },
    { stat: 'healingPower', kind: 'flat', min: 3, max: 8, label: '治疗' },
    { stat: 'ap', kind: 'flat', min: 3, max: 7, label: '法攻' },
    { stat: 'critChance', kind: 'flat', min: 0.02, max: 0.04, label: '暴击' },
    { stat: 'ad', kind: 'flat', min: 3, max: 6, label: '物攻' },
  ],
};

const BASE_TEMPLATES: { name: string; slot: 'weapon' | 'armor' | 'trinket'; base: Partial<Record<CoreStatKey, number>> }[] = [
  { name: '长剑', slot: 'weapon', base: { ad: 5 } },
  { name: '战斧', slot: 'weapon', base: { ad: 6, critChance: 0.02 } },
  { name: '法杖', slot: 'weapon', base: { ap: 6 } },
  { name: '强弓', slot: 'weapon', base: { ad: 5 } },
  { name: '斩马刀', slot: 'weapon', base: { ad: 5, penetration: 2 } },
  { name: '锁子甲', slot: 'armor', base: { armor: 3, maxHp: 10 } },
  { name: '重板甲', slot: 'armor', base: { armor: 4, maxHp: 16 } },
  { name: '符文法袍', slot: 'armor', base: { magicResist: 4, maxHp: 8 } },
  { name: '游侠皮甲', slot: 'armor', base: { armor: 2, maxHp: 7 } },
  { name: '抗压护符', slot: 'trinket', base: { magicResist: 2, maxHp: 7 } },
  { name: '勇士勋章', slot: 'trinket', base: { critChance: 0.03, maxHp: 5 } },
  { name: '生命宝石', slot: 'trinket', base: { maxHp: 14 } },
];

const RARITY_LABEL = {
  common: '粗制',
  uncommon: '精良',
  rare: '稀有',
  epic: '史诗',
  legendary: '传奇',
} as const;

const AFFIX_COUNT: Record<Equipment['rarity'], number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 生成暗黑式装备：基础模板 + 0~4 条词条，装等跟随契约星级
 */
export function generateRandomLoot(stars: number = 1): Equipment {
  const template = pick(BASE_TEMPLATES);
  const roll = Math.random() * 100 + stars * 6;

  let rarity: Equipment['rarity'] = 'common';
  if (roll > 105) rarity = 'legendary';
  else if (roll > 86) rarity = 'epic';
  else if (roll > 62) rarity = 'rare';
  else if (roll > 38) rarity = 'uncommon';

  const tier = Math.max(1, Math.min(5, stars));
  const tierMult = 1 + 0.3 * (tier - 1);

  const base: Partial<Record<CoreStatKey, number>> = {};
  for (const [key, value] of Object.entries(template.base) as [CoreStatKey, number][]) {
    base[key] = key === 'critChance' ? value : Math.round(value * tierMult);
  }

  const pool = [...AFFIX_POOL[template.slot]];
  const affixes: Affix[] = [];
  for (let i = 0; i < AFFIX_COUNT[rarity] && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const rollDef = pool.splice(idx, 1)[0];
    const raw = rollDef.min + Math.random() * (rollDef.max - rollDef.min);
    const scaled = rollDef.kind === 'percent' ? raw * (1 + 0.15 * (tier - 1)) : raw * tierMult;
    const value = rollDef.kind === 'flat' && rollDef.stat === 'critChance' || rollDef.stat === 'critDamage' || rollDef.stat === 'tenacity'
      ? Math.round(scaled * 100) / 100
      : Math.round(scaled * 100) / 100;
    affixes.push({ stat: rollDef.stat, kind: rollDef.kind, value, label: rollDef.label });
  }

  return {
    id: `loot_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name: `${RARITY_LABEL[rarity]}·${template.name}`,
    slot: template.slot,
    rarity,
    tier,
    base,
    affixes,
    affixText: affixes.length > 0 ? affixes.map(a => `${a.label} +${a.kind === 'percent' ? Math.round(a.value * 100) + '%' : a.value}`).join(' · ') : undefined,
  };
}

/** 从契约敌人池中抽取指定数量的职业（不足则循环补足） */
function pickEnemyClasses(pool: ClassId[], count: number): ClassId[] {
  const out: ClassId[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[i % pool.length]);
  }
  return out;
}


/**
 * 根据契约生成程序化地牢
 */
export function generateDungeonFromContract(contract: GuildContract): DungeonInstance {
  const roomCount = Math.min(7, 4 + contract.stars); // 5 - 7 个房间序列
  const rooms: DungeonRoom[] = [];
  const battleCount = enemyCountForStars(contract.stars);

  // 第1间必为前哨战斗（2 名游哨，作为热身）
  rooms.push({
    index: 0,
    type: 'battle',
    title: '地牢前哨',
    description: '入口处有警戒游荡的敌人守备，必须突破防线才能深入。',
    status: 'current',
    cleared: false,
    enemyClasses: pickEnemyClasses(contract.enemyClasses, 2),
    enemyLevel: contract.enemyLevel,
    isBoss: false,
  });

  // 中间房间池 (陷阱、宝箱、临时营地、突袭战)
  const roomTypesPool: RoomType[] = ['battle', 'battle', 'trap', 'chest'];

  // 营地：短地牢 1 处，6 房以上的深地牢 2 处（抑制连续战斗的雪球式损耗）
  const campPositions = roomCount >= 6
    ? [Math.floor(roomCount / 3), Math.floor((roomCount * 2) / 3)]
    : [Math.floor(roomCount / 2)];

  for (let i = 1; i < roomCount - 1; i++) {
    let rType: RoomType;
    if (i === 1) {
      rType = 'battle'; // 保证每座地牢至少有 2 场遭遇战
    } else if (campPositions.includes(i)) {
      rType = 'camp';
    } else if (i === roomCount - 2) {
      rType = 'chest';
    } else {
      rType = roomTypesPool[Math.floor(Math.random() * roomTypesPool.length)];
    }

    if (rType === 'battle') {
      rooms.push({
        index: i,
        type: 'battle',
        title: `幽深走廊 · 第 ${i + 1} 厅`,
        description: '潜伏在阴影中的巡逻怪群阻挡了去路。',
        status: 'hidden',
        cleared: false,
        enemyClasses: pickEnemyClasses(contract.enemyClasses, battleCount),
        enemyLevel: contract.enemyLevel,
        isBoss: false,
      });
    } else if (rType === 'trap') {
      rooms.push({
        index: i,
        type: 'trap',
        title: '山道暗器埋伏',
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
  const bossCount = enemyCountForStars(contract.stars, true);
  rooms.push({
    index: roomCount - 1,
    type: 'boss',
    title: `幽谷险隘 · 最终首领`,
    description: `契约的核心目标！首领统率精锐部队在此踞守。击破即可完成委托！`,
    status: 'hidden',
    cleared: false,
    enemyClasses: pickEnemyClasses(contract.enemyClasses, bossCount),
    enemyLevel: contract.enemyLevel + 1,
    isBoss: true,
  });

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
