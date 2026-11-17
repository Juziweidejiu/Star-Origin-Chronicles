/**
 * 高质量暗黑佣兵风格样本库
 * 遵循克制白描、现实代价与生存压迫原则，作为前端默认数据与生成样本基准
 */

import type { DungeonEvent, CampDialogue } from '../types/narrative';

export const MOCK_DUNGEON_EVENTS: DungeonEvent[] = [
  {
    id: 'event_collapsed_cart',
    title: '倾覆的补给车',
    theme: 'any',
    category: 'curio',
    hook: '一辆折断车轴的辎重车横在泥沼中，挽马早已被剥皮剔骨。篷布下渗着酸腐的油脂味，但暗格里似乎还锁着军用皮袋。',
    choices: [
      {
        id: 'c1',
        label: '撬锁搜刮暗格',
        flavor: '可能遗留值钱金银，也可能暗藏防盗倒钩。',
        successRate: 0.7,
        successConsequence: {
          stressChange: -5,
          moraleChange: 10,
          goldChange: 140,
          resultNarrative: '铁锁应声崩断。你们起出了半袋未发黑的银币与两块油脂硬干粮。'
        },
        failureConsequence: {
          stressChange: 15,
          moraleChange: -5,
          hpPercentChange: -8,
          resultNarrative: '暗槽里弹出一截淬过马粪的生锈倒刺，扎透了先锋的皮手套。'
        }
      },
      {
        id: 'c2',
        label: '切下马肉熏制',
        flavor: '虽然腥臊变质，但饥饿比毒素更致命。',
        successRate: 1.0,
        successConsequence: {
          stressChange: 10,
          moraleChange: -5,
          rationChange: 3,
          resultNarrative: '你们割下几大块尚有韧性的冷肉，撒上粗盐塞进背囊。没人说话，士气有些低落。'
        }
      },
      {
        id: 'c3',
        label: '低头快速绕行',
        flavor: '死者留下的气味容易引来地底掠食者。',
        successRate: 1.0,
        successConsequence: {
          stressChange: 0,
          moraleChange: 0,
          resultNarrative: '你们踩着深过脚踝的污泥悄声穿过，没有惊动周围隐约的刮擦声。'
        }
      }
    ]
  },
  {
    id: 'event_weeping_statue',
    title: '渗黑油的无脸神龛',
    theme: 'crypt',
    category: 'dilemma',
    hook: '石壁凹槽里供奉着一尊被凿去面孔的盲圣人像。神像合十的掌心里积了一小汪黑沉如沥青的香油，散发着刺鼻的干松脂气味。',
    choices: [
      {
        id: 'c1',
        label: '以战团火把引燃黑油',
        flavor: '圣光或许能涤荡污浊，亦或激怒盘踞之物。',
        requirement: { classId: ['cleric', 'paladin'] },
        successRate: 0.8,
        successConsequence: {
          stressChange: -20,
          moraleChange: 15,
          resultNarrative: '火光腾起纯白焰浪。积压在胸口的寒意如退潮般消散，佣兵们握紧了兵器。'
        },
        failureConsequence: {
          stressChange: 25,
          moraleChange: -10,
          hpPercentChange: -5,
          resultNarrative: '烈火发出毒蛇般的嘶鸣，浓黑的烟尘扑面而来，呛得全队剧烈咳嗽，眼眶刺痛。'
        }
      },
      {
        id: 'c2',
        label: '用空水壶收集黑油',
        flavor: '涂在箭头或刀锋上能灼烧野兽。',
        successRate: 0.65,
        successConsequence: {
          stressChange: 5,
          moraleChange: 5,
          goldChange: 60,
          resultNarrative: '小心刮取了半壶油脂，炼金商贩一定会为这种地下原油出个好价钱。'
        },
        failureConsequence: {
          stressChange: 12,
          moraleChange: -5,
          resultNarrative: '油脂沾染皮肤瞬间带来剧烈灼痛，只得匆忙洗去，白白耗费了清水。'
        }
      },
      {
        id: 'c3',
        label: '背身肃立致敬并离去',
        flavor: '不要直视没有眼睛的偶像。',
        successRate: 1.0,
        successConsequence: {
          stressChange: -5,
          moraleChange: 0,
          resultNarrative: '全队低头默行，神龛后的滴答声逐渐隐入黑暗。'
        }
      }
    ]
  },
  {
    id: 'event_deserter_skeleton',
    title: '靠墙坐化的巡林客',
    theme: 'forest',
    category: 'curio',
    hook: '一具皮甲风化的骸骨蜷缩在枯根下，膝上横着一把上弦的紫衫木复合弓。指骨紧扣着搭箭处的弦丝，头骨侧面有一个整齐的钝器凹痕。',
    choices: [
      {
        id: 'c1',
        label: '收殓骸骨并取下长弓',
        flavor: '老猎手的手艺值得被继承，哪怕带走它需要打扰死者。',
        requirement: { attribute: 'composure', minAttrValue: 12 },
        successRate: 0.85,
        successConsequence: {
          stressChange: -5,
          moraleChange: 10,
          goldChange: 90,
          resultNarrative: '你轻巧拨开指骨。这柄风干的硬木弓保养极佳，还余留着几根淬钢破甲箭。'
        },
        failureConsequence: {
          stressChange: 18,
          moraleChange: -10,
          resultNarrative: '松动的机关绳索触发了贴地暗箭，弩箭擦着副官的胫甲激飞，吓出一身冷汗。'
        }
      },
      {
        id: 'c2',
        label: '在他胸口放一枚铜板离去',
        flavor: '给同行留一份送渡费，是流浪佣兵最后的迷信。',
        requirement: { goldCost: 10 },
        successRate: 1.0,
        successConsequence: {
          stressChange: -10,
          moraleChange: 5,
          goldChange: -10,
          resultNarrative: '铜板落入残破衣襟，发出微弱轻响。队伍里的老兵神色柔和了些许。'
        }
      }
    ]
  }
];

export const MOCK_CAMP_DIALOGUES: CampDialogue[] = [
  {
    id: 'camp_1',
    personality: 'weary',
    condition: 'idle',
    text: '别看那些骨头。把硬面包泡软，嚼烂了咽下去。'
  },
  {
    id: 'camp_2',
    personality: 'cynical',
    condition: 'high_stress',
    text: '这趟赏金哪怕加两倍，也买不回老子烂掉的三根脚趾。'
  },
  {
    id: 'camp_3',
    personality: 'stoic',
    condition: 'injured',
    text: '伤口只是被锈铁划了一下。用烈酒冲过就行，死不了。'
  },
  {
    id: 'camp_4',
    personality: 'grim',
    condition: 'low_morale',
    text: '回去的路上少了一半背囊。我们抬不走所有人。'
  },
  {
    id: 'camp_5',
    personality: 'superstitious',
    condition: 'idle',
    text: '把油灯芯剪短点。光亮太刺眼，引来的不只是飞蛾。'
  },
  {
    id: 'camp_6',
    speakerClass: 'blademaster',
    personality: 'stoic',
    condition: 'after_victory',
    text: '剑刃卷了三个缺口。磨刀石递我，天亮前还有硬仗。'
  },
  {
    id: 'camp_7',
    speakerClass: 'cleric',
    personality: 'weary',
    condition: 'high_stress',
    text: '神不会垂怜躲在地底的老鼠。握紧武器比念祷词管用。'
  }
];

export const GOLD_STANDARD_DUNGEON_EVENTS = MOCK_DUNGEON_EVENTS;

export function getCampDialogueForHero(hero: { stress: number; currentHp: number; maxHp: number; classId?: string; traits?: string[] }): CampDialogue {
  if (hero.stress >= 60) {
    const list = MOCK_CAMP_DIALOGUES.filter(d => d.condition === 'high_stress');
    return list[Math.floor(Math.random() * list.length)] || MOCK_CAMP_DIALOGUES[1];
  }
  if (hero.currentHp / hero.maxHp <= 0.4) {
    const list = MOCK_CAMP_DIALOGUES.filter(d => d.condition === 'injured');
    return list[Math.floor(Math.random() * list.length)] || MOCK_CAMP_DIALOGUES[2];
  }
  if (hero.classId) {
    const classSpecific = MOCK_CAMP_DIALOGUES.find(d => d.speakerClass === hero.classId);
    if (classSpecific) return classSpecific;
  }
  const idle = MOCK_CAMP_DIALOGUES.filter(d => d.condition === 'idle');
  return idle[Math.floor(Math.random() * idle.length)] || MOCK_CAMP_DIALOGUES[0];
}
