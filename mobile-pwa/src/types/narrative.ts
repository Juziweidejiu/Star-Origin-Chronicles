/**
 * 《三岔口》叙事、奇遇抉择与营地台词类型系统
 *
 * 核心基调：接悬赏、走野外、营地整备、回城开光
 * 风格：东方侠客奇幻，人妖异兽共存，行会、门派、官府并行
 *
 * 【世界观铁律】：
 * 1. 严格线性历史：不存在“远古高等文明”“失落科技”“古神降级”等设定。
 *    当今的铁器、火铳、机关、阵法，都是近三十年工匠一步步改良出来的。
 * 2. 险地来源有限：矿难、撤防、水患、兽群南迁，全部发生在近三十年内。
 * 3. 叙事只说人话：禁止网文浮夸词与空泛荒凉渲染，禁止颜色字与冷热词。
 */

import type { ClassId } from './hero';

// 探索副本大类生态
export type DungeonEcoTheme =
  | 'goblin_cave'          // 山魈与异族盘踞的矿洞/哨站
  | 'beast_den'            // 猛兽巢穴（山猪/头狼/巨蛙/山牛）
  | 'dragon_roost'         // 山雕与巨兽的崖巢
  | 'labyrinth'            // 自然地质与旧驿道岔路
  | 'frontier_fort'        // 当朝/前朝边防旧垒与军库
  | 'subterranean_cavern'  // 塌方老矿与地下暗河
  | 'noble_mausoleum'      // 前朝诸侯地宫
  | 'trial_grounds'        // 边关校场与世家试剑壁
  | 'any';

// 选项判定条件
export interface ChoiceRequirement {
  classId?: ClassId[];        // 需要特定职业在场
  attribute?: string;         // 需要特定属性检定 (如 bravery, composure, weaponSkill)
  minAttrValue?: number;      // 检定阈值
  goldCost?: number;          // 消耗铜钱
  rationCost?: number;        // 消耗干粮
}

// 选项后果与结算
export interface ChoiceConsequence {
  stressChange: number;       // 压力增减 (例如 +15 或 -10)
  moraleChange: number;       // 士气增减 (例如 -10 或 +15)
  goldChange?: number;        // 铜钱增减
  hpPercentChange?: number;   // 全员或单体生命百分比变化 (负数为扣血)
  rationChange?: number;      // 干粮变动
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
  title: string;              // 事件标题 (4-10字，如 "北松岭的风干兽骨")
  theme: DungeonEcoTheme;
  category: 'curio' | 'encounter' | 'dilemma' | 'ambush' | 'trial' | 'hunt';
  hook: string;               // 场景白描 (<= 140字，聚焦地貌细节、光线、风声、战术考量)
  choices: EventChoice[];     // 2-3个权衡抉择
  tags?: string[];
}

// 营地碎碎念/伙伴羁绊对话 (Camp Bark / Dialogue)
export interface CampDialogue {
  id: string;
  speakerName?: string;       // 发言角色名 (如 陈砚、徐阿秋、石铁山)
  speakerClass?: ClassId;     // 指定发言职业，留空则任意
  personality: 'heroic' | 'stoic' | 'cynical' | 'gentle' | 'pragmatic' | 'playful'; // 性格基调
  condition: 'idle' | 'cooking' | 'repairing' | 'after_victory' | 'injured' | 'low_morale' | 'high_stress';
  text: string;               // 短台词 (<= 40字，伙伴互动、生活气息、战术探讨)
}

// 违禁词黑名单：网文套路 + 非线性历史 + 空泛荒凉渲染 + 野炊残留
export const PURPLE_PROSE_BLACKLIST: string[] = [
  // 1. 远古/高文明禁止词（非线性世界观与古神降维）
  '远古', '古文明', '超古代', '失落文明', '先祖科技', '先史', '史前',
  '青铜守卫', '古代守卫', '古神', '断代遗产', '高维', '遗落科技',
  '苍古', '太古', '上古', '亘古', '深渊', '幽暗', '神殿',

  // 2. 空泛荒凉与宗教舶来词
  '废弃', '荒废', '遗弃', '破败', '萧条', '荒芜', '枯竭',
  '阴暗', '阴森', '幽冥', '灰烬', '死寂', '鬼魅',
  '修道院', '教团', '大教堂', '十字军',

  // 3. 浮夸网文与滥俗词汇
  '瞳孔骤缩', '瞳孔微缩', '倒吸一口凉气', '嘴角泛起冷笑', '嘴角勾起一抹',
  '修罗场', '宛如地狱般的', '血雾喷涌', '血肉横飞', '恐怖如斯',
  '碎成齑粉', '毁天灭地', '苍穹', '滔天', '宛若神明', '蝼蚁',
  '桀桀', '暴怒如狂', '震颤不已', '冷冽的杀意', '杀神附体',
  '深不可测', '撕心裂肺', '生不如死', '骇人听闻',

  // 4. 旧稿残留：星象、玄学与野炊食材
  '星原', '星陨', '星辉', '裂甲', '穿云', '断岳', '通脉', '锋锐', '窥机',
  '炖汤', '五花肉', '史莱姆凝胶', '魔核',
];

// 命名刻线：任何颜色字与冷热词都不得进入专名、装备名、怪物名与界面文案
export const BANNED_COLOR_AND_TEMP_CHARS: string[] = [
  '青', '黑', '红', '赤', '朱', '白', '黄', '金', '银', '蓝', '绿',
  '紫', '翠', '碧', '苍', '灰', '墨', '乌', '寒', '热', '冰', '霜',
  '炎', '烈', '暖',
];

// AI 模板化痕迹：A与B的C 地名、小说式书名、高危姓氏连用
export const AI_TEMPLATE_PATTERNS: RegExp[] = [
  /[\u4e00-\u9fa5]{1,3}与[\u4e00-\u9fa5]{1,3}的[\u4e00-\u9fa5]{1,3}/,
  /《[^》]*(战纪|江湖志|大陆|传说|演义)[^》]*》/,
  /(沈|顾|陆|裴|楚|季|洛|墨)[\u4e00-\u9fa5]?(云舒|微凉|清弦|秋水|少陵|素问|破军|惊鸿|凌霄|无尘)/,
];

/**
 * 校验叙事文本质量
 * @param text 待校验文本
 * @param strictEntityMode 为 true 时连专名模板（A与B的C、小说式书名）一起拦
 */
export function validateNarrativeQuality(
  text: string,
  strictEntityMode: boolean = false,
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  for (const word of PURPLE_PROSE_BLACKLIST) {
    if (text.includes(word)) {
      reasons.push(`包含违禁词：「${word}」`);
    }
  }

  for (const ch of BANNED_COLOR_AND_TEMP_CHARS) {
    if (text.includes(ch)) {
      reasons.push(`包含颜色字/冷热词：「${ch}」`);
    }
  }

  if (strictEntityMode) {
    for (const pattern of AI_TEMPLATE_PATTERNS) {
      if (pattern.test(text)) {
        reasons.push(`命中模板化专名：${pattern.source}`);
      }
    }
  }

  return { passed: reasons.length === 0, reasons };
}
