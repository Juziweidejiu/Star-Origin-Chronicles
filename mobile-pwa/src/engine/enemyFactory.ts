/**
 * 敌方队伍生成
 * 星级 -> 真实属性缩放（不再只改展示用的 CA）
 * 所有可调参数集中在 ENEMY_TUNING，供 scripts/sim_balance.mjs 做平衡扫描
 */

import type { ClassId, Hero, HeroAttributes } from '../types/hero';
import { generateHero } from './heroFactory';
import { resolveStats } from './statResolver';

export const ENEMY_TUNING = {
  /** 各星级普通房敌人数量（1★~5★） */
  countByStars: [3, 3, 3, 3, 4],
  /** 各星级 Boss 房额外人数（保持 Boss 专注于精锐，不盲目堆人数） */
  bossExtraByStars: [0, 0, 0, 0, 0],
  /** 各星级属性倍率 (1★~5★) */
  attrByStars: [1.0, 1.15, 1.25, 1.34, 1.38],
  /** 各星级生命倍率（作用在体力/力量上，由 resolveStats 推导 maxHp） */
  hpByStars: [1.0, 1.20, 1.33, 1.45, 1.54],
  /** Boss 本体额外生命倍率 */
  bossHpMult: 2.05,
  /** Boss 本体额外属性倍率 */
  bossAttrMult: 1.15,
};

function starIndex(stars: number) {
  return Math.max(0, Math.min(4, Math.round(stars) - 1));
}

/** 星级决定敌人数量 */
export function enemyCountForStars(stars: number, isBoss = false): number {
  const i = starIndex(stars);
  return ENEMY_TUNING.countByStars[i] + (isBoss ? ENEMY_TUNING.bossExtraByStars[i] : 0);
}

export function createEnemyParty(classes: ClassId[], stars: number, isBoss = false): Hero[] {
  const i = starIndex(stars);
  const attrScale = ENEMY_TUNING.attrByStars[i];
  const hpScale = ENEMY_TUNING.hpByStars[i];

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

    const enemy: Hero = {
      ...base,
      id: `enemy_${Math.random().toString(36).slice(2, 9)}`,
      name: isBossUnit ? `👑首领·${base.name}` : `敌·${base.name}`,
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
