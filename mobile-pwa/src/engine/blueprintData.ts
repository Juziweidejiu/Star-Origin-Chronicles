/**
 * 图纸与材料数据表
 *
 * 设计分工（见 PROJECT_HANDOFF M35）：
 *  - 图纸定「底子」：部位、基础属性、可用词条池
 *  - 材料定「上限」：品质区间、词条数量
 *  - 小游戏定「发挥」：在材料允许的区间里取到多少
 *
 * 这里只放纯数据，不引 React、不碰 DOM，可直接单测。
 */

import type { CoreStatKey, Equipment } from '../types/hero';
import { EQUIPMENT_TEMPLATES } from './dungeonEngine';

export type CraftTier = 1 | 2 | 3 | 4 | 5;

export type MaterialId = 'iron' | 'wood' | 'leather' | 'jade' | 'coal' | 'oil' | 'sand';

export type MaterialKind = 'base' | 'fuel' | 'quench';

export interface MaterialDef {
  id: MaterialId;
  name: string;
  /** 材料条上的两字短名 */
  short: string;
  kind: MaterialKind;
  /** 一句话用途，备料面板用 */
  note: string;
}

export const MATERIALS: Record<MaterialId, MaterialDef> = {
  iron: { id: 'iron', name: '精铁锭', short: '铁', kind: 'base', note: '刀剑与重甲的骨架' },
  wood: { id: 'wood', name: '老杉木', short: '木', kind: 'base', note: '杖身、弓臂与木甲' },
  leather: { id: 'leather', name: '硝制兽皮', short: '皮', kind: 'base', note: '轻甲与缠柄' },
  jade: { id: 'jade', name: '珠玉', short: '玉', kind: 'base', note: '饰品的灵性来源' },
  coal: { id: 'coal', name: '精煤', short: '煤', kind: 'fuel', note: '每份拓宽火候容错' },
  oil: { id: 'oil', name: '淬火油', short: '油', kind: 'quench', note: '抬高品质下限至 0.98' },
  sand: { id: 'sand', name: '星陨砂', short: '砂', kind: 'quench', note: '额外提供一条词条' },
};

export const BASE_MATERIALS: MaterialId[] = ['iron', 'wood', 'leather', 'jade'];

export type MaterialBag = Record<MaterialId, number>;

export function emptyMaterials(): MaterialBag {
  return { iron: 0, wood: 0, leather: 0, jade: 0, coal: 0, oil: 0, sand: 0 };
}

/** 新档的起步材料：够打两三件粗活 */
export function starterMaterials(): MaterialBag {
  return { iron: 12, wood: 8, leather: 6, jade: 3, coal: 4, oil: 1, sand: 0 };
}

export type BlueprintSource = 'initial' | 'dungeon' | 'boss' | 'reputation' | 'legend';

export interface Blueprint {
  id: string;
  /** 对应 EQUIPMENT_TEMPLATES 的下标 */
  templateIndex: number;
  name: string;
  slot: Equipment['slot'];
  tier: CraftTier;
  /** 一级备料的基础消耗，等级越高乘得越多 */
  cost: Partial<Record<MaterialId, number>>;
  /** 解锁途径；hint 是一句给玩家看的线索 */
  source: BlueprintSource;
  stars?: number;
  reputation?: number;
  hint: string;
  flavor: string;
  /** 初始就掌握的图纸 */
  initial?: boolean;
}

function fromTemplate(index: number): { name: string; slot: Equipment['slot'] } {
  const t = EQUIPMENT_TEMPLATES[index];
  return { name: t.name, slot: t.slot };
}

/**
 * 十二张图纸。tier 决定底板强度，cost 是一级备料量。
 * 顺序与 EQUIPMENT_TEMPLATES 保持一致，方便按名字回查底板。
 */
export const BLUEPRINTS: Blueprint[] = [
  {
    id: 'bp_steel_sword',
    templateIndex: 0,
    ...fromTemplate(0),
    tier: 2,
    cost: { iron: 6 },
    source: 'initial',
    initial: true,
    hint: '老师傅给的入门图纸，炉边随手就能打一把。',
    flavor: '刃口收得薄，重心压在手前一寸，适合久战。',
  },
  {
    id: 'bp_breach_halberd',
    templateIndex: 1,
    ...fromTemplate(1),
    tier: 3,
    cost: { iron: 9, wood: 2 },
    source: 'boss',
    stars: 3,
    hint: '三阶地牢的首领房里，铁器上常留着这种阔刃的痕迹。',
    flavor: '整根铁杆锻成，破阵靠的不是锋利，是分量。',
  },
  {
    id: 'bp_wood_staff',
    templateIndex: 2,
    ...fromTemplate(2),
    tier: 2,
    cost: { wood: 6, jade: 1 },
    source: 'dungeon',
    stars: 2,
    hint: '林间的术士遗物里能拆出这张缠枝纹样。',
    flavor: '杖头留孔，嵌一颗温玉，术式便走得顺。',
  },
  {
    id: 'bp_short_bow',
    templateIndex: 3,
    ...fromTemplate(3),
    tier: 2,
    cost: { wood: 4, leather: 2 },
    source: 'dungeon',
    stars: 1,
    hint: '一星地牢的射手身上常见。',
    flavor: '弓臂短，拉满也快，适合在窄道里换手。',
  },
  {
    id: 'bp_chainmail',
    templateIndex: 4,
    ...fromTemplate(4),
    tier: 2,
    cost: { iron: 5, leather: 2 },
    source: 'dungeon',
    stars: 2,
    hint: '二阶地牢的铁甲兵会掉这张环扣图。',
    flavor: '一片压一片，甲缝里塞皮条，走起来才不响。',
  },
  {
    id: 'bp_heavy_plate',
    templateIndex: 5,
    ...fromTemplate(5),
    tier: 4,
    cost: { iron: 12, wood: 6 },
    source: 'legend',
    stars: 5,
    hint: '五星契约首通后，公会才会把重甲的图纸影印给你。',
    flavor: '胸板厚两指，代价是转身慢半拍。',
  },
  {
    id: 'bp_weave_robe',
    templateIndex: 6,
    ...fromTemplate(6),
    tier: 3,
    cost: { leather: 6, jade: 3 },
    source: 'boss',
    stars: 3,
    hint: '三阶首领的法袍里缝着这张内衬图。',
    flavor: '经纬里编进细碎的符线，遇火不燃。',
  },
  {
    id: 'bp_ranger_leather',
    templateIndex: 7,
    ...fromTemplate(7),
    tier: 1,
    cost: { leather: 4 },
    source: 'dungeon',
    stars: 1,
    hint: '一星地牢的林地猎手随身的样式。',
    flavor: '护住要害，别的都省了，跑起来轻。',
  },
  {
    id: 'bp_wolf_pendant',
    templateIndex: 8,
    ...fromTemplate(8),
    tier: 3,
    cost: { jade: 4, leather: 1 },
    source: 'boss',
    stars: 3,
    hint: '三阶地牢首领的脖子上挂着半张残图。',
    flavor: '狼牙磨成坠，系绳上还留着旧主的结。',
  },
  {
    id: 'bp_jade_pendant',
    templateIndex: 9,
    ...fromTemplate(9),
    tier: 4,
    cost: { jade: 8 },
    source: 'reputation',
    reputation: 60,
    hint: '声望到「崇拜」时，镇上的玉匠愿意拓一份给你。',
    flavor: '玉要养，戴久了才认主。',
  },
  {
    id: 'bp_star_ring',
    templateIndex: 10,
    ...fromTemplate(10),
    tier: 4,
    cost: { jade: 6, iron: 2 },
    source: 'legend',
    stars: 5,
    hint: '五星契约首通奖励里有一枚烧变形的指环样件。',
    flavor: '环身刻着看不懂的星位，夜里会微亮。',
  },
  {
    id: 'bp_bronze_amulet',
    templateIndex: 11,
    ...fromTemplate(11),
    tier: 1,
    cost: { iron: 3, jade: 1 },
    source: 'initial',
    initial: true,
    hint: '铁匠铺柜台底下压着的旧图，铜料就够。',
    flavor: '样式老气，胜在什么场合都不出错。',
  },
];

export const BLUEPRINT_MAP: Record<string, Blueprint> = Object.fromEntries(BLUEPRINTS.map(bp => [bp.id, bp]));

/** 图纸对应的底板（基础属性与部位） */
export function blueprintTemplate(bp: Blueprint) {
  return EQUIPMENT_TEMPLATES[bp.templateIndex];
}

export function blueprintBase(bp: Blueprint): Partial<Record<CoreStatKey, number>> {
  return EQUIPMENT_TEMPLATES[bp.templateIndex].base;
}

export function findBlueprint(id: string): Blueprint | undefined {
  return BLUEPRINT_MAP[id];
}

export function initialBlueprints(): string[] {
  return BLUEPRINTS.filter(bp => bp.initial).map(bp => bp.id);
}

/** 图纸品阶中文名 */
export const TIER_LABEL: Record<CraftTier, string> = {
  1: '学徒',
  2: '匠作',
  3: '名匠',
  4: '大师',
  5: '传说',
};

export const TIER_COLOR: Record<CraftTier, string> = {
  1: '#7A6C55',
  2: '#3F7E6B',
  3: '#6B4E9E',
  4: '#B4632A',
  5: '#A9761F',
};

// ---------------------------------------------------------------------------
// 词条池：每部位 8 条，带名字前缀与色阶
// ---------------------------------------------------------------------------

export type AffixGrade = 'common' | 'fine' | 'rare' | 'legend';

export const AFFIX_GRADE_LABEL: Record<AffixGrade, string> = {
  common: '普通',
  fine: '精良',
  rare: '稀有',
  legend: '传说',
};

export const AFFIX_GRADE_COLOR: Record<AffixGrade, string> = {
  common: '#7A6C55',
  fine: '#3F7E6B',
  rare: '#6B4E9E',
  legend: '#A9761F',
};

export interface AffixDef {
  name: string;
  stat: CoreStatKey;
  kind: 'flat' | 'percent';
  min: number;
  max: number;
  label: string;
  grade: AffixGrade;
}

export const CRAFT_AFFIX_POOL: Record<Equipment['slot'], AffixDef[]> = {
  weapon: [
    { name: '锋锐', stat: 'ad', kind: 'percent', min: 0.08, max: 0.22, label: '物攻', grade: 'common' },
    { name: '穿云', stat: 'penetration', kind: 'flat', min: 4, max: 12, label: '穿透', grade: 'common' },
    { name: '疾风', stat: 'attackSpeed', kind: 'percent', min: 0.06, max: 0.16, label: '攻速', grade: 'common' },
    { name: '狂澜', stat: 'critChance', kind: 'flat', min: 0.03, max: 0.08, label: '暴击', grade: 'fine' },
    { name: '裂甲', stat: 'critDamage', kind: 'flat', min: 0.12, max: 0.32, label: '暴伤', grade: 'fine' },
    { name: '守夜', stat: 'tenacity', kind: 'flat', min: 0.05, max: 0.13, label: '韧性', grade: 'fine' },
    { name: '断岳', stat: 'ad', kind: 'flat', min: 8, max: 20, label: '物攻', grade: 'rare' },
    { name: '汲魂', stat: 'maxHp', kind: 'percent', min: 0.05, max: 0.12, label: '生命', grade: 'legend' },
  ],
  armor: [
    { name: '磐石', stat: 'armor', kind: 'flat', min: 6, max: 18, label: '物防', grade: 'common' },
    { name: '静水', stat: 'magicResist', kind: 'flat', min: 6, max: 18, label: '法防', grade: 'common' },
    { name: '铁壁', stat: 'maxHp', kind: 'percent', min: 0.06, max: 0.18, label: '生命', grade: 'common' },
    { name: '不移', stat: 'tenacity', kind: 'flat', min: 0.05, max: 0.15, label: '韧性', grade: 'fine' },
    { name: '龟息', stat: 'maxHp', kind: 'flat', min: 40, max: 110, label: '生命', grade: 'fine' },
    { name: '定神', stat: 'magicResist', kind: 'percent', min: 0.06, max: 0.14, label: '法防', grade: 'rare' },
    { name: '灵便', stat: 'attackSpeed', kind: 'percent', min: 0.04, max: 0.10, label: '攻速', grade: 'rare' },
    { name: '磐岳', stat: 'armor', kind: 'percent', min: 0.08, max: 0.20, label: '物防', grade: 'legend' },
  ],
  trinket: [
    { name: '通灵', stat: 'ap', kind: 'flat', min: 6, max: 16, label: '法攻', grade: 'common' },
    { name: '灼心', stat: 'critDamage', kind: 'flat', min: 0.12, max: 0.32, label: '暴伤', grade: 'common' },
    { name: '慈航', stat: 'healingPower', kind: 'flat', min: 8, max: 24, label: '治疗', grade: 'common' },
    { name: '鹰眼', stat: 'critChance', kind: 'flat', min: 0.03, max: 0.07, label: '暴击', grade: 'fine' },
    { name: '疾行', stat: 'attackSpeed', kind: 'percent', min: 0.04, max: 0.12, label: '攻速', grade: 'fine' },
    { name: '长息', stat: 'maxHp', kind: 'percent', min: 0.06, max: 0.14, label: '生命', grade: 'rare' },
    { name: '洞明', stat: 'penetration', kind: 'flat', min: 4, max: 12, label: '穿透', grade: 'rare' },
    { name: '净心', stat: 'tenacity', kind: 'flat', min: 0.04, max: 0.12, label: '韧性', grade: 'legend' },
  ],
};

/** 词条等级与品阶的允许关系：低品阶装备抽不到高档词条 */
export const AFFIX_GRADE_GATE: Record<Equipment['rarity'], AffixGrade[]> = {
  common: [],
  uncommon: ['common'],
  rare: ['common', 'fine'],
  epic: ['common', 'fine', 'rare'],
  legendary: ['common', 'fine', 'rare', 'legend'],
};
