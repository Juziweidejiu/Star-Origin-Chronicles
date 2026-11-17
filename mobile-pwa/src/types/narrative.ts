/**
 * 游戏叙事、奇遇抉择与营地台词类型系统
 * 严格遵从《暗黑地牢》(Darkest Dungeon) 与《战场兄弟》(Battle Brothers) 的克制、冷硬、白描叙事基调
 * 杜绝网文套路、过度血腥煽情与无意义长句
 */

import type { ClassId } from './hero';

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
  addTrait?: string;          // 附加创伤/正面特质 (如 'night_blindness', 'hardened')
  removeTrait?: string;       // 驱散特质
  resultNarrative: string;    // 冷峻结果白描（<= 80字，严禁网文浮夸抒情）
}

// 单个交互选项
export interface EventChoice {
  id: string;
  label: string;              // 行为动作短语 (<= 14字，如 "踢开石棺撬出镶金把手")
  flavor?: string;            // 额外考量/心理预判 (<= 30字)
  requirement?: ChoiceRequirement;
  successRate: number;        // 判定成功率 0.0 ~ 1.0 (1.0 为无风险直接结算)
  successConsequence: ChoiceConsequence;
  failureConsequence?: ChoiceConsequence; // 失败惩罚
}

// 地下城奇遇事件 (Dungeon Event / Curio)
export interface DungeonEvent {
  id: string;
  title: string;              // 事件标题 (4-10字，如 "锈蚀的无名墓碑")
  theme: 'catacomb' | 'ruins' | 'forest' | 'crypt' | 'citadel' | 'any';
  category: 'curio' | 'encounter' | 'dilemma' | 'ambush';
  hook: string;               // 场景白描 (<= 140字，聚焦现场细节、光线、气味、生存压迫)
  choices: EventChoice[];     // 2-3个高代价两难抉择
  tags?: string[];
}

// 营地碎碎念/氛围对话 (Camp Bark / Dialogue)
export interface CampDialogue {
  id: string;
  speakerClass?: ClassId;     // 指定发言职业，留空则任意
  personality: 'cynical' | 'stoic' | 'superstitious' | 'weary' | 'grim'; // 性格基调
  condition: 'low_morale' | 'high_stress' | 'injured' | 'after_victory' | 'hungry' | 'idle';
  text: string;               // 短台词 (<= 40字，口语化、糙汉感、佣兵务实视角)
}

// 防网文/防紫墨水违禁词黑名单 (Purple Prose Blacklist)
export const PURPLE_PROSE_BLACKLIST: string[] = [
  '瞳孔骤缩',
  '瞳孔微缩',
  '倒吸一口凉气',
  '嘴角泛起冷笑',
  '嘴角勾起一抹',
  '修罗场',
  '宛如地狱般的',
  '血雾喷涌',
  '血肉横飞',
  '恐怖如斯',
  '碎成齑粉',
  '毁天灭地',
  '苍穹',
  '滔天',
  '宛若神明',
  '蝼蚁',
  '桀桀',
  '暴怒如狂',
  '震颤不已'
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
      violations.push(`包含网文/过度滥用词汇: "${word}"`);
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}
