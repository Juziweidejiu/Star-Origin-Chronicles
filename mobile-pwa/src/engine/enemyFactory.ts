/**
 * 敌方队伍生成
 * 星级 -> 真实属性缩放
 * 彻底消除人名与重名，按生态/兵种命名，保留战术角标
 */

import type { ClassId, Hero, HeroAttributes } from '../types/hero';
import type { ContractType } from '../types/world';
import { generateHero } from './heroFactory';
import { resolveStats } from './statResolver';

export const ENEMY_TUNING = {
  /** 各星级普通房敌人数量（1★~5★） */
  countByStars: [3, 3, 3, 3, 4],
  /** 各星级 Boss 房额外人数（保持 Boss 专注于精锐，不盲目堆人数） */
  bossExtraByStars: [0, 0, 0, 0, 0],
  /** 各星级属性倍率 (1★~5★) */
  attrByStars: [0.98, 1.10, 1.20, 1.30, 1.36],
  /** 各星级生命倍率（作用在体力/力量上，由 resolveStats 推导 maxHp） */
  hpByStars: [0.98, 1.14, 1.28, 1.40, 1.50],
  /** Boss 本体额外生命倍率 */
  bossHpMult: 1.95,
  /** Boss 本体额外属性倍率 */
  bossAttrMult: 1.14,
};

function starIndex(stars: number) {
  return Math.max(0, Math.min(4, Math.round(stars) - 1));
}

/** 星级决定敌人数量 */
export function enemyCountForStars(stars: number, isBoss = false): number {
  const i = starIndex(stars);
  return ENEMY_TUNING.countByStars[i] + (isBoss ? ENEMY_TUNING.bossExtraByStars[i] : 0);
}

type EnemyNamePool = Record<ClassId, string[]> & { bossNames: string[] };

/** 按生态与战斗职能生成的兵种名库：2-5 字俗称，不带 MMO 职业后缀 */
const ENEMY_NAME_POOL: Record<ContractType, EnemyNamePool> = {
  slime_infestation: {
    guardian: ['石壳胶妖', '硬泥胶妖'],
    paladin: ['厚膜大胶妖', '裹铁胶妖'],
    warden: ['岩块胶妖', '重压胶妖'],
    blademaster: ['酸液胶妖', '滑行胶妖'],
    ranger: ['喷液胶妖', '弹射胶妖'],
    arcanist: ['瘴气胶妖', '浮游胶妖'],
    cleric: ['共生小胶妖', '愈合胶核'],
    druid: ['缠蔓胶妖', '水苔胶妖'],
    bard: ['震鸣胶妖', '鼓泡胶妖'],
    bossNames: ['矿井大胶王', '裹矿巨胶怪'],
  },
  goblin_mine: {
    guardian: ['举盾山魈', '木盾山魈'],
    paladin: ['铁盔山魈', '重甲山魈'],
    warden: ['持镐山魈', '大锤山魈'],
    blademaster: ['尖耳山魈', '短刃山魈'],
    ranger: ['投石山魈', '吹箭山魈'],
    arcanist: ['掷弹山魈', '火油山魈'],
    cleric: ['涂药山魈', '裹伤山魈'],
    druid: ['驯鼠山魈', '引兽山魈'],
    bard: ['敲锣山魈', '号角山魈'],
    bossNames: ['独眼山魈王', '矿坑大头领'],
  },
  bandit_camp: {
    guardian: ['寨门盾手', '重甲悍匪'],
    paladin: ['长枪寨兵', '铁甲头目'],
    warden: ['大斧山贼', '铁背山猪'],
    blademaster: ['亡命刀客', '双刀流寇'],
    ranger: ['暗哨弩手', '山林弓匪'],
    arcanist: ['火铳悍匪', '掷雷山贼'],
    cleric: ['随寨伤医', '背箱药匪'],
    druid: ['放犬恶徒', '驯猪寨匪'],
    bard: ['敲梆望风匪', '喊阵匪头'],
    bossNames: ['独臂山贼头目', '风口岭大当家'],
  },
  caravan_escort: {
    guardian: ['截道盾匪', '厚壳泥龟'],
    paladin: ['持叉水匪', '重甲劫匪'],
    warden: ['甩尾巨鳄', '铁棒水贼'],
    blademaster: ['飞刀流寇', '疾行水蜥'],
    ranger: ['苇丛弩手', '暗箭水匪'],
    arcanist: ['水雷匪徒', '喷雾毒蛙'],
    cleric: ['随行水医', '伴生水蛭'],
    druid: ['放鹰劫匪', '驱鳄水匪'],
    bard: ['鸣哨水匪', '鸣叫大蟾'],
    bossNames: ['三岔口匪首', '沉船湾大鳄'],
  },
  beast_hunt: {
    guardian: ['铁背山猪', '厚皮枭熊'],
    paladin: ['巨角山牛', '重甲山魈'],
    warden: ['长毛山魈', '独眼大熊'],
    blademaster: ['疾行水蜥', '独眼头狼'],
    ranger: ['展翼山雕', '飞羽大鹰'],
    arcanist: ['毒斑巨蛙', '喷毒山蛛'],
    cleric: ['药草小妖', '护窝母鹿'],
    druid: ['林间大鹿', '引群头狼'],
    bard: ['鸣叫大蟾', '啼鸣山猿'],
    bossNames: ['断牙山猪王', '巨角山牛王', '北松岭老狼王'],
  },
  ruins_cleansing: {
    guardian: ['发条木甲卫', '重盾铁卫'],
    paladin: ['长戟木甲卫', '巡哨铁卫'],
    warden: ['独眼巨汉', '大锤蛮人'],
    blademaster: ['箱魅', '利刃机关偶'],
    ranger: ['连弩机关偶', '暗弩铁卫'],
    arcanist: ['火油机关偶', '失控火铳卫'],
    cleric: ['修补木匠偶', '传令机关鸟'],
    druid: ['巢穴石蛛', '铁笼恶犬'],
    bard: ['警铃机关偶', '战鼓木甲'],
    bossNames: ['巨口箱魅王', '西关大铁卫', '独眼蛮将'],
  },
};

export function createEnemyParty(
  classes: ClassId[],
  stars: number,
  isBoss = false,
  contractType: ContractType = 'goblin_mine'
): Hero[] {
  const i = starIndex(stars);
  const attrScale = ENEMY_TUNING.attrByStars[i];
  const hpScale = ENEMY_TUNING.hpByStars[i];

  const rolePool = ENEMY_NAME_POOL[contractType] ?? ENEMY_NAME_POOL.goblin_mine;
  const bossPool = rolePool.bossNames;

  return classes.map((cId, idx) => {
    const base = generateHero(cId, false);
    const isBossUnit = isBoss && idx === 0;
    const unitAttrScale = attrScale * (isBossUnit ? ENEMY_TUNING.bossAttrMult : 1);
    const unitHpScale = hpScale * (isBossUnit ? ENEMY_TUNING.bossHpMult : 1);

    const attributes = { ...base.attributes };
    for (const key of Object.keys(attributes) as (keyof HeroAttributes)[]) {
      attributes[key] = Math.max(1, Math.round(attributes[key] * unitAttrScale));
    }
    // 生命相关属性再叠一次血量曲线，保证 resolveStats 推导的 maxHp 正确
    attributes.vitality = Math.max(1, Math.round(attributes.vitality * unitHpScale));
    attributes.strength = Math.max(1, Math.round(attributes.strength * unitHpScale));

    const nameList = rolePool[cId] || ['哨卒', '游兵'];
    const subName = nameList[Math.floor(Math.random() * nameList.length)];
    const bossTitle = bossPool[Math.floor(Math.random() * bossPool.length)];

    const enemyName = isBossUnit ? `${bossTitle}·首领` : subName;

    const enemy: Hero = {
      ...base,
      id: `enemy_${Math.random().toString(36).slice(2, 9)}`,
      name: enemyName,
      level: Math.max(1, base.level + stars - 1),
      currentAbility: Math.round(base.currentAbility * unitAttrScale),
      attributes,
    };
    const maxHp = resolveStats(enemy).maxHp;
    enemy.maxHp = maxHp;
    enemy.currentHp = maxHp;
    return enemy;
  });
}
