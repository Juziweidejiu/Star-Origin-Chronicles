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

/** 按职业与生态生成的兵种名库，克制、洗练、无冗余形容词 */
const ENEMY_ROLE_NAMES: Record<string, Record<ClassId, string[]>> = {
  slime_infestation: {
    guardian: ['石盾史莱姆', '岩壳胶质'],
    blademaster: ['利刃黏液怪', '酸液跳跳'],
    ranger: ['毒刺射胶怪', '弹射史莱姆'],
    arcanist: ['电浆史莱姆王', '炽焰胶质'],
    cleric: ['再生黏液核心', '治愈胶质'],
    paladin: ['铁壳巨型史莱姆'],
    warden: ['重锤岩浆怪'],
    druid: ['孢子史莱姆', '寄生胶质'],
    bard: ['共鸣水母胶'],
  },
  goblin_mine: {
    guardian: ['赤耳盾手', '矿坑大盾哥布林', '岩盔哥布林'],
    blademaster: ['赤耳劈砍者', '矿坑刺客', '双刃哥布林'],
    ranger: ['赤耳掷弹手', '毒弩哥布林', '岩隙伏击者'],
    arcanist: ['赤耳萨满', '地脉咒术师', '灰烬控火者'],
    cleric: ['赤耳巫医', '草药萨满', '图腾祭祀'],
    paladin: ['赤耳精锐铁卫', '重装哥布林'],
    warden: ['赤耳矿道先锋', '持棒蛮兵'],
    druid: ['穴居唤蛇者', '岩苔异术士'],
    bard: ['赤耳鼓手', '战吼哥布林'],
  },
  bandit_camp: {
    guardian: ['黑煞寨盾手', '寨门大盾兵', '重甲截道匪'],
    blademaster: ['黑煞寨快刀手', '亡命刀客', '劫道悍匪'],
    ranger: ['黑煞寨弓手', '暗哨弩手', '飞刀流寇'],
    arcanist: ['黑煞寨咒师', '落草方士', '引火匪首'],
    cleric: ['黑煞寨药师', '随军医手', '赤脚巫者'],
    paladin: ['重甲叛卫', '寨头铁甲兵'],
    warden: ['黑煞寨巡山客', '劈山哨长'],
    druid: ['驯鹰流寇', '毒草术人'],
    bard: ['擂鼓山匪', '喝彩寨卒'],
  },
  beast_hunt: {
    guardian: ['穴居公枭熊', '铁甲山猪', '岩皮厚甲兽'],
    blademaster: ['雪原白额狼', '撕裂利爪豹', '裂喉赤狐'],
    ranger: ['双足翼手飞龙', '飞羽角雕', '喷毒飞蜥'],
    arcanist: ['雷鸣幼龙', '幽焰火狐', '唤霜灵鹿'],
    cleric: ['林地伴生灵', '生息鹿', '岩髓晶灵'],
    paladin: ['巨角犀兽', '岩甲巨犀'],
    warden: ['巡林狂狒', '长臂骨猴'],
    druid: ['古木盘根兽', '寄生灵蔓'],
    bard: ['啼鸣怪鸟', '唤兽山雀'],
  },
  ruins_cleansing: {
    guardian: ['拟态宝箱怪', '弹簧发条铁卫', '前朝步卒盾卫'],
    blademaster: ['食人魔蛮力士', '双头食人魔', '前朝折冲刀手'],
    ranger: ['巨型洞穴捕鸟蛛', '结网毒蛛', '前朝强弩手'],
    arcanist: ['失控发条术士', '前朝钦天术官', '残阵阵法师'],
    cleric: ['拟态圣遗物箱', '前朝军中医官', '祝祷司祝'],
    paladin: ['发条重装步兵', '前朝镇关铁卫', '中军宿卫'],
    warden: ['单眼食人魔', '前朝先锋锐卒', '陷阵甲士'],
    druid: ['蛛网守护灵', '前朝御兽吏', '驯禽守卒'],
    bard: ['拟态音乐盒', '前朝号角手', '行军金鼓手'],
  },
  caravan_escort: {
    guardian: ['护卫叛卒', '劫道盾手'],
    blademaster: ['夺货刀客', '亡命剑徒'],
    ranger: ['伏击弓手', '连弩斥候'],
    arcanist: ['黑市术客', '诡道法徒'],
    cleric: ['暗巷行医', '黑市药贩'],
    paladin: ['叛变游侠骑士', '铁甲武徒'],
    warden: ['断道斧手', '重锤游匪'],
    druid: ['引蜂客', '驱兽人'],
    bard: ['流浪歌者', '散谣乐徒'],
  },
};

/** 首领名录，杜绝人名，直奔兵种头目地位 */
const BOSS_NAMES: Record<string, string[]> = {
  slime_infestation: ['巨型胶质王', '水井暗渠史莱姆巢主', '电浆核心巨怪'],
  goblin_mine: ['赤耳巨怪统领', '矿脉大头目', '穴居巨萨满'],
  bandit_camp: ['黑煞寨大当家', '断龙崖寨主', '血手当家'],
  beast_hunt: ['狂暴穴居枭熊王', '霜甲巨猿王', '雷霆裂地龙', '苍空翼龙霸主'],
  ruins_cleansing: ['巨口拟态宝箱王', '暴怒双头食人魔酋长', '发条重装统领', '前朝折冲都尉'],
  caravan_escort: ['黑市大当家', '截道巨枭'],
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

  const poolType = ENEMY_ROLE_NAMES[contractType] ? contractType : 'goblin_mine';
  const rolePool = ENEMY_ROLE_NAMES[poolType];
  const bossPool = BOSS_NAMES[poolType] || BOSS_NAMES.goblin_mine;

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

    const enemyName = isBossUnit ? `👑${bossTitle}` : subName;

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
