# P1 `blueprintData.ts` 替换数据包（《百炼行》武侠兵器与开光批注）

> 严格保留原有图纸 ID（`bp_*`）与材料 ID（`iron / wood / leather / jade / coal / oil / sand`），**不破坏现有图片资源路径与调试参数**，仅将显示名称、出处线索、材料名称与词条池全面替换为《百炼行》v2 规范（零颜色字、零冷热词、零网文词条）。

## 1. 七种锻造材料（`MATERIALS`）

```
export type MaterialId = 'iron' | 'wood' | 'leather' | 'jade' | 'coal' | 'oil' | 'sand';

export const MATERIALS: Record<
  MaterialId,
  { id: MaterialId; name: string; desc: string; sourceHint: string }
> = {
  iron: {
    id: 'iron',
    name: '生铁锭',
    desc: '冶铁炉炼出的基础铁料，打制刀剑枪戟的底座。',
    sourceHint: '塌方老矿、三岔口、风口岭掉落',
  },
  wood: {
    id: 'wood',
    name: '老榆木',
    desc: '木质坚韧不易开裂，适合做枪杆、弓臂与刀柄。',
    sourceHint: '风口岭、百草涧、旧驿道断桥掉落',
  },
  leather: {
    id: 'leather',
    name: '熟牛皮',
    desc: '硝制过的厚实兽皮，用来缝制皮甲内衬与护手缠绳。',
    sourceHint: '风口岭、北松岭、沉船湾掉落',
  },
  jade: {
    id: 'jade',
    name: '璞玉料',
    desc: '山间采出的未琢玉石，刻上纹路后能帮医者与策士凝神。',
    sourceHint: '千尺矿井、芦洲渡海商处获取',
  },
  coal: {
    id: 'coal',
    name: '精煤',
    desc: '火力猛且少烟的精选硬煤，锻造时加煤可稳住炉温。',
    sourceHint: '塌方老矿、千尺矿井掉落',
  },
  oil: {
    id: 'oil',
    name: '桐油',
    desc: '兵器淬火与营地拭甲的必备油料，防锈防潮。',
    sourceHint: '沉船湾、芦洲渡码头购买',
  },
  sand: {
    id: 'sand',
    name: '砺石磨刀砂',
    desc: '极细硬的天然磨砂，洗练开光时可用来锁定一条心仪批注。',
    sourceHint: '西关旧垒掉落，或于芦洲渡采购',
  },
};

```

## 2. 十二张江湖兵器与防具图谱（`BLUEPRINTS`）

```
export interface BlueprintDef {
  id: string;
  name: string;
  slot: 'weapon' | 'armor' | 'accessory';
  tier: 1 | 2 | 3 | 4 | 5;
  source: 'initial' | 'dungeon' | 'boss' | 'reputation' | 'legend';
  unlockHint: string;
  materials: Partial<Record<MaterialId, number>>;
}

export const BLUEPRINTS: BlueprintDef[] = [
  // --- 武器类（4张）---
  {
    id: 'bp_steel_sword',
    name: '百炼直剑',
    slot: 'weapon',
    tier: 2,
    source: 'initial',
    unlockHint: '六合行会入门图谱，开局即已掌握',
    materials: { iron: 6, wood: 2 },
  },
  {
    id: 'bp_short_bow',
    name: '山牛角短弓',
    slot: 'weapon',
    tier: 2,
    source: 'dungeon',
    unlockHint: '北松岭或风口岭盗匪、猎户处概率掉落残页',
    materials: { wood: 5, leather: 3 },
  },
  {
    id: 'bp_wood_staff',
    name: '药杵木杖',
    slot: 'weapon',
    tier: 2,
    source: 'initial',
    unlockHint: '百草堂随行医官常用图谱，开局即已掌握',
    materials: { wood: 5, jade: 2 },
  },
  {
    id: 'bp_breach_halberd',
    name: '破阵大戟',
    slot: 'weapon',
    tier: 3,
    source: 'boss',
    unlockHint: '击破风口岭或西关旧垒头目后必得',
    materials: { iron: 10, wood: 4 },
  },

  // --- 防具类（4张）---
  {
    id: 'bp_ranger_leather',
    name: '斥候软皮甲',
    slot: 'armor',
    tier: 1,
    source: 'initial',
    unlockHint: '行会制式皮甲图谱，开局即已掌握',
    materials: { leather: 5, wood: 1 },
  },
  {
    id: 'bp_chainmail',
    name: '连环锁甲',
    slot: 'armor',
    tier: 2,
    source: 'dungeon',
    unlockHint: '塌方老矿或三岔口清剿箱笼概率获得',
    materials: { iron: 7, leather: 3 },
  },
  {
    id: 'bp_weave_robe',
    name: '麻布道袍',
    slot: 'armor',
    tier: 3,
    source: 'reputation',
    unlockHint: '六合行会声望达到 60 时由总舵赠予',
    materials: { leather: 4, jade: 4 },
  },
  {
    id: 'bp_heavy_plate',
    name: '水龟甲重铠',
    slot: 'armor',
    tier: 4,
    source: 'boss',
    unlockHint: '击破芦苇水寨或西关旧垒首领后取得',
    materials: { iron: 12, leather: 6 },
  },

  // --- 饰品/随身件（4张）---
  {
    id: 'bp_bronze_amulet',
    name: '六合铜牌',
    slot: 'accessory',
    tier: 1,
    source: 'initial',
    unlockHint: '游侠入行会时统一配发的腰牌图样',
    materials: { iron: 3, leather: 2 },
  },
  {
    id: 'bp_wolf_pendant',
    name: '狼牙护腕',
    slot: 'accessory',
    tier: 3,
    source: 'dungeon',
    unlockHint: '百草涧或北松岭探索宝箱概率获得',
    materials: { leather: 5, iron: 3 },
  },
  {
    id: 'bp_jade_pendant',
    name: '雕龙玉佩',
    slot: 'accessory',
    tier: 4,
    source: 'reputation',
    unlockHint: '铸剑谷或汤泉镇声望提升后解锁',
    materials: { jade: 6, leather: 2 },
  },
  {
    id: 'bp_star_ring',
    name: '天工扳指',
    slot: 'accessory',
    tier: 4,
    source: 'legend',
    unlockHint: '首次通关 5★ 北坡点将台后解锁',
    materials: { jade: 5, iron: 6 },
  },
];

```

## 3. 每部位八条开光批注池（`CRAFT_AFFIX_POOL`）

> 全部采用铁匠铺与江湖工艺术语，严格对应九维核心属性键名（`STAT_LABEL`）：

```
export interface CraftAffixDef {
  id: string;
  name: string;        // 开光批注名（如：血槽开锋）
  stat: string;        // 对应九维属性键
  isPercent?: boolean; // 是否百分比加成
  baseMin: number;
  baseMax: number;
}

export const CRAFT_AFFIX_POOL: Record<'weapon' | 'armor' | 'accessory', CraftAffixDef[]> = {
  weapon: [
    { id: 'w_ad_flat', name: '百炼锻实', stat: 'ad', baseMin: 4, baseMax: 9 },
    { id: 'w_ad_pct', name: '熟铁包刃', stat: 'ad', isPercent: true, baseMin: 0.06, baseMax: 0.14 },
    { id: 'w_crit', name: '血槽开锋', stat: 'critChance', isPercent: true, baseMin: 0.03, baseMax: 0.07 },
    { id: 'w_crit_dmg', name: '重脊压锋', stat: 'critDamage', isPercent: true, baseMin: 0.12, baseMax: 0.28 },
    { id: 'w_pen', name: '三棱透甲', stat: 'penetration', baseMin: 4, baseMax: 10 },
    { id: 'w_spd', name: '轻柄配重', stat: 'attackSpeed', isPercent: true, baseMin: 0.04, baseMax: 0.10 },
    { id: 'w_ap', name: '顺气木柄', stat: 'ap', baseMin: 5, baseMax: 11 },
    { id: 'w_heal', name: '细针开槽', stat: 'healingPower', baseMin: 4, baseMax: 9 },
  ],
  armor: [
    { id: 'a_armor_flat', name: '双层夹铁', stat: 'armor', baseMin: 4, baseMax: 10 },
    { id: 'a_armor_pct', name: '熟牛皮垫肩', stat: 'armor', isPercent: true, baseMin: 0.06, baseMax: 0.14 },
    { id: 'a_hp_flat', name: '鱼胶粘合', stat: 'maxHp', baseMin: 18, baseMax: 42 },
    { id: 'a_hp_pct', name: '厚背护心', stat: 'maxHp', isPercent: true, baseMin: 0.05, baseMax: 0.12 },
    { id: 'a_mr', name: '密缝防潮', stat: 'magicResist', baseMin: 4, baseMax: 9 },
    { id: 'a_tenacity', name: '桐油浸甲', stat: 'tenacity', isPercent: true, baseMin: 0.05, baseMax: 0.12 },
    { id: 'a_spd', name: '活扣束腰', stat: 'attackSpeed', isPercent: true, baseMin: 0.03, baseMax: 0.07 },
    { id: 'a_pen_res', name: '稳固护肘', stat: 'armor', baseMin: 6, baseMax: 12 },
  ],
  accessory: [
    { id: 'x_spd', name: '合手缠绳', stat: 'attackSpeed', isPercent: true, baseMin: 0.04, baseMax: 0.09 },
    { id: 'x_heal', name: '定心雕纹', stat: 'healingPower', baseMin: 5, baseMax: 11 },
    { id: 'x_pen', name: '井水淬尖', stat: 'penetration', baseMin: 4, baseMax: 9 },
    { id: 'x_crit_dmg', name: '破甲棱', stat: 'critDamage', isPercent: true, baseMin: 0.10, baseMax: 0.24 },
    { id: 'x_ad', name: '千锤压纹', stat: 'ad', baseMin: 3, baseMax: 7 },
    { id: 'x_ap', name: '养神玉扣', stat: 'ap', baseMin: 5, baseMax: 12 },
    { id: 'x_crit', name: '薄刃开尖', stat: 'critChance', isPercent: true, baseMin: 0.03, baseMax: 0.06 },
    { id: 'x_hp', name: '固本铜环', stat: 'maxHp', baseMin: 15, baseMax: 35 },
  ],
};

```