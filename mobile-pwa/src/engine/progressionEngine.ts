/**
 * 英雄经验与能力成长引擎
 *
 * 经验曲线与 CA 成长公式参考《Dungeons & Dynasties》反编译数据：
 *   等级阈值: ceil(0.9*x^2 + 6*x)，x = level - 1，等级上限 20
 *   CA 成长: 基础 1.2 × 难度系数 × 战斗场次 × 潜力余量 × 适应性
 * 按手游节奏将基础成长上调至 2.2，让每份契约都有可感知的提升。
 */

import type { ClassId, Hero, HeroAttributes } from '../types/hero';
import type { AttributeGain, HeroProgressionResult, XpProgress } from '../types/progression';

export const MAX_HERO_LEVEL = 20;
const XP_CURVE_A = 0.9;
const XP_CURVE_B = 6;
const CA_BASE_GROWTH = 2.2;
const CA_POINTS_PER_LEVEL = 1.75;
const ATTRIBUTE_CAP = 30;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** 升到指定等级所需的累计经验 */
export function xpTotalForLevel(level: number): number {
  const x = clamp(Math.floor(level), 1, MAX_HERO_LEVEL) - 1;
  return Math.ceil(XP_CURVE_A * x * x + XP_CURVE_B * x);
}

/** 由累计经验反推等级 */
export function levelForXp(exp: number): number {
  const e = Math.max(0, exp);
  const raw = (-XP_CURVE_B + Math.sqrt(XP_CURVE_B * XP_CURVE_B + 4 * XP_CURVE_A * e)) / (2 * XP_CURVE_A);
  return clamp(Math.floor(raw) + 1, 1, MAX_HERO_LEVEL);
}

/** 读取英雄累计经验，兼容未初始化经验字段的旧英雄 */
export function heroTotalXp(hero: Hero): number {
  if (typeof hero.experience === 'number' && Number.isFinite(hero.experience)) {
    return Math.max(0, Math.floor(hero.experience));
  }
  return xpTotalForLevel(hero.level);
}

/** 当前等级内的经验进度 */
export function heroXpProgress(hero: Hero): XpProgress {
  const total = heroTotalXp(hero);
  if (hero.level >= MAX_HERO_LEVEL) {
    return { into: 0, need: 0, percent: 100, total, isMax: true };
  }
  const base = xpTotalForLevel(hero.level);
  const next = xpTotalForLevel(hero.level + 1);
  const need = Math.max(1, next - base);
  const into = clamp(total - base, 0, need);
  return {
    into,
    need,
    percent: clamp(Math.round((into / need) * 100), 0, 100),
    total,
    isMax: false
  };
}

/** 直接增加经验并刷新等级，返回升级前后等级 */
export function grantExperience(hero: Hero, amount: number): { xpGained: number; levelBefore: number; levelAfter: number } {
  const levelBefore = hero.level;
  const xpGained = Math.max(0, Math.round(amount));
  hero.experience = heroTotalXp(hero) + xpGained;
  hero.level = levelForXp(hero.experience);
  return { xpGained, levelBefore, levelAfter: hero.level };
}

/** 单场战斗 / 单份契约的经验奖励 */
export interface XpRewardOptions {
  stars: number;
  isBoss?: boolean;
  isContractClear?: boolean;
  victory?: boolean;
  isMvp?: boolean;
}

export function experienceReward(opts: XpRewardOptions): number {
  const stars = clamp(Math.round(opts.stars || 1), 1, 5);
  let base = opts.isContractClear
    ? 8 + stars * 3
    : opts.isBoss
      ? 6 + stars * 2
      : 2 + stars;

  if (opts.victory === false) base *= 0.3;
  if (opts.isMvp) base *= 1.15;

  return Math.max(1, Math.round(base));
}

/** CA 折算的等效等级（1-20） */
export function abilityLevelFromCa(ca: number): number {
  return clamp(Math.round(1 + (clamp(ca, 1, 200) - 20) * (19 / 180)), 1, MAX_HERO_LEVEL);
}

/** 任务星级对应的推荐等级 */
export function recommendedLevelForStars(stars: number): number {
  return clamp(Math.round(stars || 1) * 2 + 1, 1, MAX_HERO_LEVEL);
}

/** 等级压制：攻击方每高 1 级增伤 2%，每低 1 级减伤 2%，上下限 15% */
export function levelSuppressionMultiplier(attackerLevel: number, defenderLevel: number): number {
  return clamp(1 + (attackerLevel - defenderLevel) * 0.02, 0.85, 1.15);
}

/** 按职业成长权重分配属性点 */
const CLASS_GROWTH_WEIGHTS: Record<ClassId, Partial<Record<keyof HeroAttributes, number>>> = {
  guardian: {
    armorUse: 3, parry: 3, strength: 3, vitality: 3, mitigation: 3, threat: 2,
    bravery: 2, teamwork: 2, discipline: 2, positioning: 2, composure: 2, stamina: 2
  },
  warden: {
    weaponSkill: 3, strength: 3, vitality: 3, aggression: 3, resolve: 2,
    threat: 3, mitigation: 2, bravery: 2, stamina: 2
  },
  paladin: {
    weaponSkill: 2, spellcraft: 1, armorUse: 2, vitality: 2, resolve: 3,
    discipline: 3, leadership: 2, teamwork: 2, support: 2, mitigation: 2
  },
  blademaster: {
    weaponSkill: 4, power: 3, criticalStrike: 3, agility: 3, speed: 2,
    reflexes: 2, aggression: 2, evasion: 2
  },
  ranger: {
    marksmanship: 4, criticalStrike: 3, agility: 3, evasion: 3, anticipation: 2,
    speed: 2, positioning: 2, reflexes: 1
  },
  arcanist: {
    spellcraft: 4, concentration: 3, decisions: 2, anticipation: 2,
    composure: 2, discipline: 2, crowdControl: 2
  },
  cleric: {
    healing: 4, support: 3, resolve: 2, composure: 2, teamwork: 2,
    discipline: 2, concentration: 1
  },
  druid: {
    healing: 3, spellcraft: 2, support: 3, resolve: 2, teamwork: 2,
    concentration: 2, vitality: 1
  },
  bard: {
    support: 4, teamwork: 3, leadership: 2, composure: 2, healing: 2,
    decisions: 2, positioning: 1
  }
};

const ATTRIBUTE_LABELS: Record<keyof HeroAttributes, string> = {
  weaponSkill: '武技',
  marksmanship: '射术',
  power: '力量',
  spellcraft: '法术',
  armorUse: '护甲',
  parry: '格挡',
  evasion: '闪避',
  criticalStrike: '暴击',
  composure: '冷静',
  bravery: '胆识',
  decisions: '决策',
  anticipation: '预判',
  teamwork: '协作',
  leadership: '统率',
  concentration: '专注',
  aggression: '侵略',
  discipline: '纪律',
  resolve: '决心',
  strength: '体质',
  agility: '敏捷',
  stamina: '耐力',
  vitality: '生机',
  speed: '速度',
  reflexes: '反应',
  threat: '仇恨',
  mitigation: '减伤',
  healing: '治疗',
  support: '辅助',
  crowdControl: '控制',
  positioning: '走位'
};

function distributeAttributePoints(hero: Hero, points: number): AttributeGain[] {
  const gains: Partial<Record<keyof HeroAttributes, number>> = {};
  if (points <= 0) return [];

  const keys = Object.keys(hero.attributes) as (keyof HeroAttributes)[];
  const weights = CLASS_GROWTH_WEIGHTS[hero.classId] ?? {};

  for (let i = 0; i < points; i++) {
    const pool = keys.filter(k => hero.attributes[k] < ATTRIBUTE_CAP);
    if (pool.length === 0) break;

    const poolWeights = pool.map(k => {
      const base = weights[k] ?? 0.12;
      const lowAttrBoost = hero.attributes[k] < 12 ? 1.2 : 1;
      return base * lowAttrBoost;
    });
    const total = poolWeights.reduce((a, b) => a + b, 0);

    let roll = Math.random() * total;
    let picked = pool[pool.length - 1];
    for (let j = 0; j < pool.length; j++) {
      roll -= poolWeights[j];
      if (roll <= 0) {
        picked = pool[j];
        break;
      }
    }

    hero.attributes[picked] += 1;
    gains[picked] = (gains[picked] ?? 0) + 1;
  }

  return (Object.entries(gains) as Array<[keyof HeroAttributes, number]>)
    .map(([key, amount]) => ({ key, label: ATTRIBUTE_LABELS[key], amount }))
    .sort((a, b) => b.amount - a.amount);
}

export interface CaGrowthOptions {
  recommendedLevel: number;
  fights: number;
  /** 出战队伍 CA 总和 */
  partyAbility: number;
  /** 潜力充分发挥的倍率，MVP 可给 1.1 */
  xpMult?: number;
  victory?: boolean;
}

/** 一次契约探索结束后的 CA 与属性成长 */
export function growHeroAbility(hero: Hero, opts: CaGrowthOptions): { caGained: number; attributeGains: AttributeGain[] } {
  const paCap = clamp(hero.potentialAbility, 1, 200);
  const headroom = Math.max(0, paCap - hero.currentAbility);
  if (headroom <= 0) {
    return { caGained: 0, attributeGains: [] };
  }

  const abilityLevel = abilityLevelFromCa(hero.currentAbility);
  const caForLevel = 20 + (clamp(opts.recommendedLevel, 1, MAX_HERO_LEVEL) - 1) * (180 / 19);
  const partyRatio = opts.partyAbility / Math.max(1, 4 * caForLevel);
  const understaffBonus = partyRatio < 1 ? (1 - partyRatio) * 1.2 : 0;

  const difficulty = clamp(1 + (opts.recommendedLevel - abilityLevel) * 0.15 + understaffBonus, 0.1, 1.8);
  const effort = opts.victory === false ? 0.4 : clamp(Math.max(0, opts.fights) / 4, 0.25, 2.5);
  const headroomFactor = clamp(headroom / 50, 0, 1);
  const adaptFactor = 1 + ((hero.hidden.adaptability ?? 10) - 10) * 0.02;

  const raw = Math.max(0, CA_BASE_GROWTH * difficulty * effort * headroomFactor * (opts.xpMult ?? 1) * adaptFactor)
    + Math.max(0, hero.growthCarry ?? 0);

  const caGained = clamp(Math.floor(raw + 1e-9), 0, Math.floor(headroom));
  hero.growthCarry = headroom > caGained ? raw - caGained : 0;
  hero.currentAbility = clamp(hero.currentAbility + caGained, 1, 200);

  const points = caGained > 0 ? Math.max(1, Math.round(caGained * CA_POINTS_PER_LEVEL)) : 0;
  const attributeGains = distributeAttributePoints(hero, points);

  return { caGained, attributeGains };
}

/** 单场战斗经验（不进 CA 成长） */
export interface BattleXpOptions {
  stars: number;
  isBoss?: boolean;
  isContractClear?: boolean;
  victory: boolean;
  isMvp?: boolean;
}

export function applyBattleExperience(hero: Hero, opts: BattleXpOptions): HeroProgressionResult {
  const xpGained = experienceReward(opts);
  const levelBefore = hero.level;
  grantExperience(hero, xpGained);

  return {
    heroId: hero.id,
    heroName: hero.name,
    xpGained,
    levelBefore,
    levelAfter: hero.level,
    caBefore: hero.currentAbility,
    caAfter: hero.currentAbility,
    caGained: 0,
    attributeGains: [],
    isMvp: Boolean(opts.isMvp)
  };
}

/** 契约通关结算：经验 + CA + 属性成长 */
export interface DelveProgressionOptions extends BattleXpOptions {
  fights: number;
  partyAbility: number;
}

export function applyDelveProgression(hero: Hero, opts: DelveProgressionOptions): HeroProgressionResult {
  const xpGained = experienceReward(opts);
  const levelBefore = hero.level;
  grantExperience(hero, xpGained);

  const caBefore = hero.currentAbility;
  const growth = opts.victory
    ? growHeroAbility(hero, {
        recommendedLevel: recommendedLevelForStars(opts.stars),
        fights: opts.fights,
        partyAbility: opts.partyAbility,
        xpMult: opts.isMvp ? 1.1 : 1,
        victory: true
      })
    : { caGained: 0, attributeGains: [] };

  return {
    heroId: hero.id,
    heroName: hero.name,
    xpGained,
    levelBefore,
    levelAfter: hero.level,
    caBefore,
    caAfter: hero.currentAbility,
    caGained: growth.caGained,
    attributeGains: growth.attributeGains,
    isMvp: Boolean(opts.isMvp)
  };
}
