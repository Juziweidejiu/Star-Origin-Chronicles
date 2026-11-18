/**
 * 属性推导器
 * 30 维原始属性 -> 9 项核心战斗属性（LoL 式扁平面板）
 * 装备只在此处叠加，绝不写回 hero.attributes / hero.maxHp
 */

import type {
  Affix,
  ClassId,
  CoreStatKey,
  Equipment,
  Hero,
  ResolvedStats,
} from '../types/hero';
import { CLASS_CONFIG } from './heroFactory';

/** 每个职业的主伤害类型 */
export const DAMAGE_TYPE: Record<ClassId, 'physical' | 'magic'> = {
  guardian: 'physical',
  warden: 'physical',
  paladin: 'physical',
  blademaster: 'physical',
  arcanist: 'magic',
  ranger: 'physical',
  cleric: 'magic',
  druid: 'magic',
  bard: 'magic',
};

export const STAT_LABEL: Record<CoreStatKey, string> = {
  ad: '物攻',
  ap: '法攻',
  armor: '物防',
  magicResist: '法防',
  attackSpeed: '攻速',
  critChance: '暴击',
  critDamage: '暴伤',
  penetration: '穿透',
  maxHp: '生命',
  healingPower: '治疗',
  tenacity: '韧性',
};

const PERCENT_STATS: CoreStatKey[] = ['attackSpeed'];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** 30 维原始属性 -> 基础九项属性（不含装备） */
export function baseStats(hero: Hero): ResolvedStats {
  const a = hero.attributes;
  const cfg = CLASS_CONFIG[hero.classId];
  const dmgMod = cfg?.dmgMod ?? 1;
  const hpMod = cfg?.hpMod ?? 1;

  const ad = (a.weaponSkill * 0.72 + a.power * 0.28) * 1.1 * dmgMod;
  const ap = (a.spellcraft * 0.9 + a.power * 0.1) * 1.1 * dmgMod;
  const armor = a.armorUse * 0.6 + a.mitigation * 0.4;
  const magicResist = a.resolve * 0.6 + a.discipline * 0.4;

  const rawInterval = (2.0 - a.speed * 0.04) * (1 - 0.02 * (a.decisions - 10));

  return {
    maxHp: Math.round((40 + a.vitality * 6 + a.strength * 1.5) * hpMod),
    ad: Math.round(ad),
    ap: Math.round(ap),
    armor: Math.round(armor),
    magicResist: Math.round(magicResist),
    attackInterval: clamp(rawInterval, 0.7, 2.6),
    critChance: clamp(0.02 + a.criticalStrike * 0.012, 0.02, 0.6),
    critDamage: 1.5,
    penetration: 0,
    healingPower: Math.round(a.healing * 1.8 + 10),
    tenacity: 0,
  };
}

/** 把装备的 flat / percent 词条叠加到基础值上 */
export function resolveStats(hero: Hero): ResolvedStats {
  const base = baseStats(hero);
  const items = [hero.equipment.weapon, hero.equipment.armor, hero.equipment.trinket]
    .filter((i): i is Equipment => Boolean(i));

  const flat: Partial<Record<CoreStatKey, number>> = {};
  const percent: Partial<Record<CoreStatKey, number>> = {};

  for (const item of items) {
    for (const [key, value] of Object.entries(item.base) as [CoreStatKey, number][]) {
      flat[key] = (flat[key] ?? 0) + value;
    }
    for (const affix of item.affixes) {
      if (affix.kind === 'percent') {
        percent[affix.stat] = (percent[affix.stat] ?? 0) + affix.value;
      } else {
        flat[affix.stat] = (flat[affix.stat] ?? 0) + affix.value;
      }
    }
  }

  const withPct = (key: CoreStatKey, value: number) => {
    const pct = percent[key] ?? 0;
    return value * (1 + pct);
  };

  // 攻速是唯一反比属性：+25% 攻速 -> 间隔 /1.25
  const asPct = percent.attackSpeed ?? 0;
  const attackInterval = clamp(base.attackInterval / (1 + asPct), 0.7, 2.6);

  return {
    maxHp: Math.round(withPct('maxHp', base.maxHp + (flat.maxHp ?? 0))),
    ad: Math.round(withPct('ad', base.ad + (flat.ad ?? 0))),
    ap: Math.round(withPct('ap', base.ap + (flat.ap ?? 0))),
    armor: Math.round(withPct('armor', base.armor + (flat.armor ?? 0))),
    magicResist: Math.round(withPct('magicResist', base.magicResist + (flat.magicResist ?? 0))),
    attackInterval,
    critChance: clamp(base.critChance + (flat.critChance ?? 0) + (percent.critChance ?? 0), 0, 0.6),
    critDamage: Math.min(2.5, base.critDamage + (flat.critDamage ?? 0)),
    penetration: Math.round(base.penetration + (flat.penetration ?? 0)),
    healingPower: Math.round(withPct('healingPower', base.healingPower + (flat.healingPower ?? 0))),
    tenacity: clamp(base.tenacity + (flat.tenacity ?? 0) + (percent.tenacity ?? 0), 0, 0.8),
  };
}

/** 词条展示文本，如「物攻 +12%」 */
export function describeAffix(affix: Affix): string {
  if (affix.kind === 'percent' || affix.stat === 'critChance' || affix.stat === 'critDamage' || affix.stat === 'tenacity') {
    return `${affix.label} +${Math.round(affix.value * 100)}%`;
  }
  return `${affix.label} +${affix.value}`;
}

/** 装备基础值展示文本，如「物攻 18 · 生命 30」 */
export function describeBase(item: Equipment): string {
  return (Object.entries(item.base) as [CoreStatKey, number][])
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => {
      if (key === 'critChance' || key === 'attackSpeed' || key === 'tenacity') {
        return `${STAT_LABEL[key]} ${Math.round(value * 100)}%`;
      }
      return `${STAT_LABEL[key]} ${Math.round(value)}`;
    })
    .join(' · ');
}

/** 校验：百分比词条只应出现在允许的属性上 */
export function isValidPercentStat(key: CoreStatKey): boolean {
  return PERCENT_STATS.includes(key) || ['ad', 'ap', 'armor', 'magicResist', 'maxHp', 'healingPower'].includes(key);
}
