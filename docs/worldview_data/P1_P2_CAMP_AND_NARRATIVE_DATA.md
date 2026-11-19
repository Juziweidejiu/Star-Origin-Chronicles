# P1 & P2 营地兵刃养护与新版去 AI 味质检数据

> 对接 `mobile-pwa/src/components/DungeonView.tsx`（营地整备）与 `mobile-pwa/src/types/narrative.ts`（叙事与命名质检）。

## 1. `DungeonView.tsx` 营地兵刃养护选项（替代原野炊做饭）

```
export interface CampWeaponPrepOption {
  id: 'sharpen_blade' | 'oil_armor' | 'tune_string';
  title: string;
  subtitle: string;
  materialHint: string;
  effectSummary: string;
  campBarkPool: string[];
  buff: {
    critChanceBonus?: number;
    penetrationBonus?: number;
    armorBonus?: number;
    attackSpeedBonus?: number;
    stressDelta: number;
    hpRestoreRatio: number;
  };
}

export const CAMP_WEAPON_PREP_OPTIONS: CampWeaponPrepOption[] = [
  {
    id: 'sharpen_blade',
    title: '开锋磨刃',
    subtitle: '摊开磨刀石，把卷口的地方重新推平',
    materialHint: '耗磨刀石 / 砺石磨刀砂',
    effectSummary: '下两场暴击率 +8%、穿透 +6，回复 18% 体力',
    campBarkPool: [
      '陈砚：这把直剑刚才磕在山魈木盾上崩了个小口，磨两下还能接着使。',
      '徐阿秋：刀口快了三分，待会儿照着甲缝捅就行。',
      '独眼老冯：少用蛮力硬砍，省着点刃口。',
    ],
    buff: {
      critChanceBonus: 0.08,
      penetrationBonus: 6,
      stressDelta: -8,
      hpRestoreRatio: 0.18,
    },
  },
  {
    id: 'oil_armor',
    title: '桐油拭甲',
    subtitle: '把甲片缝里的泥水擦干，刷上一层桐油',
    materialHint: '耗桐油',
    effectSummary: '下两场护甲 +10、减轻重伤恶化，回复 25% 体力',
    campBarkPool: [
      '石铁山：林子里湿气重，铁甲不刷油明天就得生锈卡扣。',
      '赵英：皮衬松了半寸，趁歇脚紧一紧带子。',
      '许半夏：顺便把伤口重新包扎一遍，别沾了生水。',
    ],
    buff: {
      armorBonus: 10,
      stressDelta: -10,
      hpRestoreRatio: 0.25,
    },
  },
  {
    id: 'tune_string',
    title: '校弦缠柄',
    subtitle: '换掉起毛的弓弦，重新缠紧刀柄麻绳',
    materialHint: '耗韧兽筋 / 麻绳',
    effectSummary: '下两场攻速 +10%，围坐闲聊全队压力 -16',
    campBarkPool: [
      '唐远：牛筋弦沾了露水容易发软，烤干了拉着才脆。',
      '丁小锤：这根手铳的火门通好了，下回肯定不哑火。',
      '林禾：大伙儿喝口水歇歇肩，前面离出口不远了。',
    ],
    buff: {
      attackSpeedBonus: 0.1,
      stressDelta: -16,
      hpRestoreRatio: 0.2,
    },
  },
];

```

## 2. `narrative.ts` 新版去 AI 味黑名单与结构校验器

```
// 1. 网文套路、非线性历史、颜色/冷热修饰及中二词条拦截表
export const PURPLE_PROSE_BLACKLIST: string[] = [
  // 网文与血浆套路词
  '瞳孔骤缩', '瞳孔微缩', '倒吸一口凉气', '嘴角勾起', '冷笑', '修罗场',
  '血雾', '血肉横飞', '恐怖如斯', '碎成齑粉', '毁天灭地', '苍穹', '蝼蚁',
  '桀桀', '暴怒如狂', '冷冽杀意', '深不可测',
  // 非线性历史与虚无套路词
  '远古', '超古代', '古文明', '太古', '上古', '亘古', '失落文明', '先祖科技',
  '青铜守卫', '构装体傀儡', '古神', '深渊', '幽暗', '阴暗', '阴森', '死寂',
  '鬼魅', '荒废', '废弃', '破败', '萧条', '荒芜', '枯竭', '修道院', '教团', '大教堂',
  // 网文高危人名部件
  '云舒', '微凉', '清弦', '秋水', '少陵', '素问', '破军', '惊鸿', '凌霄', '无尘',
  '沈云', '裴少', '墨微', '楚清', '顾平', '季秋',
  // 中二武器词条与玄幻名词
  '星原', '星陨', '星辉', '裂甲', '穿云', '断岳', '通脉', '锋锐', '窥机',
  // 《迷宫饭》野炊残留词（确保不混入新生态）
  '炖汤', '五花肉', '史莱姆凝胶', '魔核',
];

// 2. 地名/怪物/道具高危颜色字与冷热词（用于严格校验新增专有名词）
export const BANNED_COLOR_AND_TEMP_CHARS = [
  '青', '黑', '红', '赤', '朱', '白', '黄', '金', '银',
  '蓝', '绿', '紫', '翠', '碧', '苍', '灰', '墨', '乌',
  '寒', '热', '冰', '霜', '炎', '烈', '暖',
];

// 3. 结构性 AI 味正则（拦截 "X与Y的Z" 地名、小说式书名、"动词+形容词+怪名"）
export const AI_TEMPLATE_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: '翻译腔地名（A与B的C）', regex: /[\u4e00-\u9fa5]{1,4}与[\u4e00-\u9fa5]{1,4}[镇城谷堡渡驿港宿]/ },
  { name: '小说式标题后缀', regex: /《[\u4e00-\u9fa5]{2,6}(?:战纪|江湖志|大陆|传说|演义)》/ },
  { name: '网文高危姓氏连用', regex: /(?:沈|顾|陆|裴|墨|楚|季|洛)(?:云|微|清|秋|少|素|破|惊|凌|无)/ },
];

export interface NarrativeValidationResult {
  passed: boolean;
  reasons: string[];
}

/**
 * 校验文案或专有名词是否符合《百炼行》v2 去 AI 味规范
 * @param text 待检查文本
 * @param strictEntityMode 校验地名/怪物/武器名时开启，会额外拦截颜色字与冷热词
 */
export function validateNarrativeQuality(
  text: string,
  strictEntityMode = false,
): NarrativeValidationResult {
  const reasons: string[] = [];

  for (const word of PURPLE_PROSE_BLACKLIST) {
    if (text.includes(word)) {
      reasons.push(`命中违禁词：${word}`);
    }
  }

  for (const rule of AI_TEMPLATE_PATTERNS) {
    if (rule.regex.test(text)) {
      reasons.push(`命中 AI 模板（${rule.name}）`);
    }
  }

  if (strictEntityMode) {
    for (const ch of BANNED_COLOR_AND_TEMP_CHARS) {
      if (text.includes(ch)) {
        reasons.push(`专有名词禁用颜色或冷热字：${ch}`);
      }
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

```