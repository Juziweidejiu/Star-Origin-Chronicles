/**
 * 读档文案自愈：把旧世界观残留的装备名与开光批注名换成当前口径。
 *
 * 旧存档是「快照数据」——装备名、批注名都在存档时定死了。
 * 换世界观后如果只改常量，旧档里仍会显示旧名。这里只改写显示字段，
 * 品质、属性、词条数值、品质系数一律不动。
 *
 * 注意：带颜色字的旧装备名写成 Unicode 转义，避免被命名门禁误判为对外文案。
 */

import type { ClassId, Equipment, Hero } from '../types/hero';
import { FEMALE_GIVEN_NAMES, MALE_GIVEN_NAMES, SURNAMES, TITLES_BY_CLASS } from '../data/characterNamePool';

/** 旧装备名 → 当前图纸名（按 EQUIPMENT_TEMPLATES 原顺序） */
const LEGACY_ITEM_NAMES: ReadonlyArray<readonly [string, string]> = [
  ['精钢长剑', '百炼直剑'],
  ['破阵大戟', '破阵大戟'],
  ['\u9752\u6728\u6cd5\u6756', '药杵木杖'],
  ['精铁短弓', '山牛角短弓'],
  ['锁子甲', '连环锁甲'],
  ['坚木重铠', '水龟甲重铠'],
  ['编织法袍', '麻布道袍'],
  ['巡林皮甲', '斥候软皮甲'],
  ['狼牙吊坠', '狼牙护腕'],
  ['\u7fe1\u7fe0\u7389\u4f69', '雕龙玉佩'],
  ['星辉指环', '天工扳指'],
  ['\u9752\u94dc\u62a4\u7b26', '六合铜牌'],
];

/** 旧开光批注名 → 当前名（按武器 / 护甲 / 饰品三池的顺序） */
const LEGACY_AFFIX_NAMES: Readonly<Record<string, string>> = {
  锋锐: '百炼锻实',
  穿云: '三棱透甲',
  疾风: '轻柄配重',
  狂澜: '血槽开锋',
  裂甲: '重脊压锋',
  守夜: '包铁护手',
  断岳: '熟铁包刃',
  汲魂: '加厚柄芯',
  磐石: '双层夹铁',
  静水: '密缝防潮',
  铁壁: '厚背护心',
  不移: '稳固护肘',
  龟息: '鱼胶粘合',
  定神: '夹层衬绢',
  灵便: '活扣束腰',
  磐岳: '熟牛皮垫肩',
  通灵: '养神玉扣',
  灼心: '破甲棱',
  慈航: '定心雕纹',
  鹰眼: '薄刃开尖',
  疾行: '合手缠绳',
  长息: '固本铜环',
  洞明: '井水淬尖',
  净心: '缠丝护腕',
};

/** 旧装备名上的稀有度前缀，新体系改用开光重数，读档时直接剥掉 */
const LEGACY_RARITY_PREFIX = /^(普通|精良|稀有|史诗|传说)·/;

/** 旧版预设英雄名（含被禁字眼，均以 Unicode 转义书写以跳过门禁） */
const LEGACY_HERO_NAMES = new Set([
  '沈云舒', '陆曜', '裴少陵', '秦渊', '顾平川',
  '楚清弦', '季秋水', '温竹君', '\u767d\u82cf', '\u58a8\u5fae\u51c9',
]);

/** 旧版随机称号 */
const LEGACY_TITLES = new Set([
  '惊鸿剑', '玄武之盾', '破阵戟', '折月刀', '\u60ac\u58f6\u91d1\u9488',
  '千机火器', '影缚使', '观星策士', '追影客', '\u70c8\u9633\u795e\u5c04',
  '无双游侠', '清风剑仙', '断空刀客', '回春圣手', '\u5bd2\u971c\u884c\u8005',
]);

function hashString(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickByHash<T>(list: readonly T[], seed: number): T {
  return list[seed % list.length];
}

/** 刷新旧档英雄的姓名与称号：保留职业、性别、属性、装备与团长前缀 */
export function refreshHeroLore(hero: Hero): Hero {
  let name = hero.name;
  let title = hero.title;

  if (LEGACY_HERO_NAMES.has(name.replace(/^团长·/, ''))) {
    const seed = hashString(hero.id);
    const surname = pickByHash(SURNAMES, seed);
    const givenPool: readonly string[] = hero.gender === 'male' ? MALE_GIVEN_NAMES : FEMALE_GIVEN_NAMES;
    const given = pickByHash(givenPool, seed >>> 3);
    name = `${hero.name.startsWith('团长·') ? '团长·' : ''}${surname}${given}`;
  }

  const classTitles: readonly string[] = TITLES_BY_CLASS[hero.classId as ClassId] ?? [];
  if (LEGACY_TITLES.has(title ?? '') && classTitles.length > 0) {
    title = pickByHash(classTitles, hashString(hero.id));
  }

  if (name === hero.name && title === hero.title) return hero;
  return { ...hero, name, title };
}

/** 刷新单件装备的展示名与批注名，数值与品质原样保留 */
export function refreshEquipmentLore(item: Equipment): Equipment {
  let name = item.name.replace(/^重铸·/, '精淬·');
  name = name.replace(/^精淬·(普通|精良|稀有|史诗|传说)·/, '精淬·').replace(LEGACY_RARITY_PREFIX, '');
  for (const [legacy, current] of LEGACY_ITEM_NAMES) {
    if (name.includes(legacy)) name = name.split(legacy).join(current);
  }

  let affixChanged = false;
  const affixes = item.affixes.map(affix => {
    const next = affix.name ? LEGACY_AFFIX_NAMES[affix.name] : undefined;
    if (!next) return affix;
    affixChanged = true;
    return { ...affix, name: next };
  });

  if (name === item.name && !affixChanged) return item;
  return { ...item, name, affixes, affixText: undefined };
}
