/**
 * 《星原战纪》叙事、奇遇抉择与营地台词类型系统
 * 
 * 核心基调：探险 (Exploration)、生存 (Survival)、浪漫羁绊 (Camaraderie)、对抗危机 (Crisis)
 * 风格：东亚二次元奇幻探险，男女参半，全员英姿飒爽、各有千秋、强劲实力
 * 
 * 【世界观铁律】：
 * 1. 严格线性历史发展：绝对不存在“远古高等文明”、“超古代遗迹”、“失落科技”、“青铜守卫”等降级科幻设定。
 *    当今时代的铁器、火铳、机关、阵法即为文明一步一个脚印演进的最高水准。
 * 2. 探索对象丰富多元：异族巢穴（哥布林/穴居兽人）、猛兽与龙穴、地质迷宫溶洞、当朝/前朝边塞旧址与王陵、演武试炼场。
 * 3. 严禁网文浮夸词汇（修罗场、毁天灭地、苍穹、蝼蚁等）与虚假血浆煽情。
 */

import type { ClassId } from './hero';

// 探索副本大类生态
export type DungeonEcoTheme = 
  | 'goblin_cave'          // 哥布林与异族矿洞/哨站
  | 'beast_den'             // 猛兽巢穴 (巨熊/雪猿/狼群)
  | 'dragon_roost'          // 飞龙崖与巨龙巢穴
  | 'labyrinth'             // 自然地质与奇石迷宫
  | 'frontier_fort'         // 当代/前朝废弃边防要塞与军库
  | 'subterranean_cavern'   // 沉星晶石窟/地下盲河溶洞
  | 'noble_mausoleum'       // 前朝落败诸侯地宫王陵
  | 'trial_grounds'         // 边关校场与世家试剑壁
  | 'any';

// 选项判定条件
export interface ChoiceRequirement {
  classId?: ClassId[];        // 需要特定职业在场
  attribute?: string;         // 需要特定属性检定 (如 bravery, composure, weaponSkill)
  minAttrValue?: number;      // 检定阈值
  goldCost?: number;          // 消耗金币
  rationCost?: number;        // 消耗口粮
}

// 选项后果与结算
export interface ChoiceConsequence {
  stressChange: number;       // 压力增减 (例如 +15 或 -10)
  moraleChange: number;       // 士气增减 (例如 -10 或 +15)
  goldChange?: number;        // 金币增减
  hpPercentChange?: number;   // 全员或单体生命百分比变化 (负数为扣血)
  rationChange?: number;      // 口粮变动
  addTrait?: string;          // 附加创伤/正面特质 (如 'keen_eyed', 'hardened')
  removeTrait?: string;       // 驱散特质
  resultNarrative: string;    // 冷峻结果白描（<= 80字，严禁网文浮夸抒情）
}

// 单个交互选项
export interface EventChoice {
  id: string;
  label: string;              // 行为动作短语 (<= 14字，如 "踢开石槽搜查军粮暗格")
  flavor?: string;            // 额外考量/战术预判 (<= 30字)
  requirement?: ChoiceRequirement;
  successRate: number;        // 判定成功率 0.0 ~ 1.0 (1.0 为无风险直接结算)
  successConsequence: ChoiceConsequence;
  failureConsequence?: ChoiceConsequence; // 失败惩罚
}

// 副本奇遇事件 (Dungeon / Exploration Event)
export interface DungeonEvent {
  id: string;
  title: string;              // 事件标题 (4-10字，如 "飞龙崖风干骸骨")
  theme: DungeonEcoTheme;
  category: 'curio' | 'encounter' | 'dilemma' | 'ambush' | 'trial' | 'hunt';
  hook: string;               // 场景白描 (<= 140字，聚焦地貌细节、光线、风声、战术考量)
  choices: EventChoice[];     // 2-3个权衡抉择
  tags?: string[];
}

// 营地碎碎念/伙伴羁绊对话 (Camp Bark / Dialogue)
export interface CampDialogue {
  id: string;
  speakerName?: string;       // 发言角色名 (如 沈云舒, 楚清弦, 陆曜, 季秋水)
  speakerClass?: ClassId;     // 指定发言职业，留空则任意
  personality: 'heroic' | 'stoic' | 'cynical' | 'gentle' | 'pragmatic' | 'playful'; // 性格基调
  condition: 'idle' | 'cooking' | 'repairing' | 'after_victory' | 'injured' | 'low_morale' | 'high_stress';
  text: string;               // 短台词 (<= 40字，伙伴互动、生活气息、战术探讨)
}

// 违禁词黑名单：网文词 + 严厉禁止“远古高文明/失落科技”词汇 + AI生硬套路词汇
export const PURPLE_PROSE_BLACKLIST: string[] = [
  // 1. 远古/高文明禁止词（严禁非线性世界观与古神降维）
  '远古', '古文明', '超古代', '失落文明', '先祖科技', '先史', '史前',
  '青铜守卫', '古代守卫', '古神', '断代遗产', '高维', '遗落科技',
  '苍古', '太古', '上古', '亘古',

  // 2. 虚无荒凉生硬套路词（禁止空泛渲染荒凉）
  '废弃', '荒废', '遗弃', '破败', '萧条', '荒芜', '枯竭',
  '幽暗', '阴暗', '阴森', '幽冥', '灰烬', '死寂', '鬼魅',
  '深渊', '修道院', '教团', '大教堂', '十字军',

  // 3. 浮夸网文与滥俗词汇
  '瞳孔骤缩', '瞳孔微缩', '倒吸一口凉气', '嘴角泛起冷笑', '嘴角勾起一抹',
  '修罗场', '宛如地狱般的', '血雾喷涌', '血肉横飞', '恐怖如斯',
  '碎成齑粉', '毁天灭地', '苍穹', '滔天', '宛若神明', '蝼蚁',
  '桀桀', '暴怒如狂', '震颤不已', '冷冽的杀意', '杀神附体',
  '深不可测', '撕心裂肺', '生不如死', '骇人听闻'
];

/**
 * 校验叙事文本质量工具函数
 */
export function validateNarrativeQuality(text: string, maxLength: number = 150): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (text.length > maxLength) {
    violations.push(`文本超出UI显示限制（当前 ${text.length} 字，上限 ${maxLength} 字）`);
  }

  for (const word of PURPLE_PROSE_BLACKLIST) {
    if (text.includes(word)) {
      violations.push(`包含违禁词汇(网文或超古代文明词): "${word}"`);
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}
