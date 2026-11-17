/**
 * 《星原战纪》高品质探险与营地奇遇样本库
 * 
 * 核心基调：探险、生存、浪漫羁绊、对抗危机
 * 坚守铁律：
 * 1. 严格线性历史，杜绝“远古文明/超古代科技/青铜守卫”。
 * 2. 探索对象聚焦异族据点、猛兽龙巢、地质溶洞与前朝关隘。
 * 3. 角色男女参半，全员英姿飒爽、实力强劲，对话生动富有生活与战术气息。
 */

import type { DungeonEvent, CampDialogue } from '../types/narrative';

export const MOCK_DUNGEON_EVENTS: DungeonEvent[] = [
  {
    id: 'event_goblin_cache',
    title: '赤耳哥布林的积铁坑',
    theme: 'goblin_cave',
    category: 'encounter',
    hook: '废弃矿道拐角处挖了个深坑，坑底堆满哥布林从行商马车上抢来的生铁锭与碎银两。上方拉着几根系着羊骨铃铛的极细韧藤。',
    choices: [
      {
        id: 'c1',
        label: '由秦渊飞爪隔空起出铁锭',
        flavor: '利用绳索机关避开骨铃报警，但需沉稳手法。',
        requirement: { attribute: 'composure', minAttrValue: 12 },
        successRate: 0.8,
        successConsequence: {
          stressChange: -5,
          moraleChange: 10,
          goldChange: 130,
          resultNarrative: '飞爪无声扣住麻袋。全队利落地将沉甸甸的精铁块拉起，铃铛未发出一丝声响。'
        },
        failureConsequence: {
          stressChange: 15,
          moraleChange: -5,
          hpPercentChange: -5,
          resultNarrative: '骨铃被藤条扯响。黑暗中射来几排淬了草汁的竹箭，擦伤了掩护的前排皮甲。'
        }
      },
      {
        id: 'c2',
        label: '楚清弦重戟直接扫碎警铃',
        flavor: '以强悍武力先发制人，准备正面迎战伏兵。',
        successRate: 1.0,
        successConsequence: {
          stressChange: 5,
          moraleChange: 15,
          goldChange: 70,
          resultNarrative: '大戟横空砸断支撑木架。几只惊慌失措的哥布林尖叫逃窜，现场留下一箱散落的粗制箭簇。'
        }
      },
      {
        id: 'c3',
        label: '在周围洒下驱兽椒粉离开',
        flavor: '不为散碎银两耽搁主线探索时间。',
        successRate: 1.0,
        successConsequence: {
          stressChange: 0,
          moraleChange: 0,
          resultNarrative: '队伍贴着干燥的岩壁快速穿过，没有惊动坑道深处的巡逻异族。'
        }
      }
    ]
  },
  {
    id: 'event_wyvern_cliff_nest',
    title: '雷鸣飞龙崖的脱落龙鳞',
    theme: 'dragon_roost',
    category: 'hunt',
    hook: '狂风呼啸的陡峭岩缝间挂着一层泛着青紫电弧的蜕化龙鳞，足有半面圆盾大小。头顶万仞绝壁上方，隐约传来成体飞龙高亢的破空厉啼。',
    choices: [
      {
        id: 'c1',
        label: '由沈云舒提剑攀岩割取',
        flavor: '轻身剑术能快速借力，但高空碎石极易脱手。',
        successRate: 0.75,
        successConsequence: {
          stressChange: -5,
          moraleChange: 15,
          goldChange: 180,
          resultNarrative: '沈云舒踏岩如飞，长剑精准剔下完整鳞片。这块坚硬的避雷甲片能在工坊打造极品护心镜。'
        },
        failureConsequence: {
          stressChange: 20,
          moraleChange: -5,
          hpPercentChange: -12,
          resultNarrative: '陡峭风化岩层突然碎裂。云舒虽以剑刺壁缓住跌势，但滑落时手腕仍被锋利晶体划出一道血口。'
        }
      },
      {
        id: 'c2',
        label: '顾平川张重弓戒备崖顶',
        flavor: '放弃采鳞，全神贯注警戒龙巢动向。',
        successRate: 1.0,
        successConsequence: {
          stressChange: -10,
          moraleChange: 5,
          resultNarrative: '重箭在弦，队伍趁飞龙盘旋入云的间隙安全脱离了俯冲攻击范围。'
        }
      }
    ]
  },
  {
    id: 'event_frontier_armory',
    title: '前朝关隘沉陷武库',
    theme: 'frontier_fort',
    category: 'curio',
    hook: '三十年前边塞城墙塌落形成的空洞里，斜插着几具覆满风干桐油布的防潮木箱。封条已被潮气侵蚀，依稀能辨出昔日戍卫军营的官印。',
    choices: [
      {
        id: 'c1',
        label: '陆曜合力撬开油封箱盖',
        flavor: '官家封箱虽保存完好，但也可能被前人设置了防盗撞针。',
        successRate: 0.85,
        successConsequence: {
          stressChange: -5,
          moraleChange: 10,
          goldChange: 150,
          resultNarrative: '桐油布揭开，里面整齐码放着两卷未受潮的精锻锁子甲甲叶和半盒防锈红桐油。'
        },
        failureConsequence: {
          stressChange: 15,
          moraleChange: -5,
          hpPercentChange: -6,
          resultNarrative: '箱底的火石撞针被锈水卡死引燃，烟雾呛得前排连声咳嗽，灼焦了一幅皮质护臂。'
        }
      },
      {
        id: 'c2',
        label: '温竹君检查箱侧药囊',
        flavor: '边塞驻军通常会在军械库备置防瘴止血药散。',
        successRate: 0.9,
        successConsequence: {
          stressChange: -15,
          moraleChange: 10,
          resultNarrative: '竹君从蜡封陶罐中起出数份干燥良好的黄连雄黄散，全队所受轻伤得以迅速敷治。'
        }
      }
    ]
  }
];

export const MOCK_CAMP_DIALOGUES: CampDialogue[] = [
  {
    id: 'camp_1',
    speakerName: '陆曜',
    personality: 'heroic',
    condition: 'cooking',
    text: '今晚炖了雪原野猪肉配松子，少陵加了山姜驱寒。吃饱了，明天才能顶住飞龙风压。'
  },
  {
    id: 'camp_2',
    speakerName: '楚清弦',
    personality: 'heroic',
    condition: 'repairing',
    text: '前边矿坑的哥布林机关很多。云舒你带队盯紧脚下，冲阵破门交给我和大戟！'
  },
  {
    id: 'camp_3',
    speakerName: '季秋水',
    personality: 'stoic',
    condition: 'after_victory',
    text: '刀锋没有卷刃。刚才那一刀很顺畅，你的策应时机抓得很好，谢谢。'
  },
  {
    id: 'camp_4',
    speakerName: '沈云舒',
    personality: 'playful',
    condition: 'idle',
    text: '听风关的酒馆老板说过，越过这座断崖就是碧落湖。真想尝尝那里的清蒸银鱼。'
  },
  {
    id: 'camp_5',
    speakerName: '温竹君',
    personality: 'gentle',
    condition: 'injured',
    text: '别乱动，先把金针拔出来。皮外伤敷了金疮药，好好睡一觉明天就结痂了。'
  },
  {
    id: 'camp_6',
    speakerName: '白苏',
    personality: 'pragmatic',
    condition: 'repairing',
    text: '火铳的撞针刚刚调校完毕，填装了双倍碎钢砂。再遇到带甲的巨熊，我一枪就能破防！'
  },
  {
    id: 'camp_7',
    speakerName: '裴少陵',
    personality: 'cynical',
    condition: 'idle',
    text: '风向往南偏了三刻，今晚没有雨。守夜排班照旧，某些人别又在树杈上偷吃松子糖。'
  }
];

export const GOLD_STANDARD_DUNGEON_EVENTS = MOCK_DUNGEON_EVENTS;

export function getCampDialogueForHero(hero: { name?: string; stress: number; currentHp: number; maxHp: number; classId?: string; traits?: string[] }): CampDialogue {
  if (hero.stress >= 60) {
    const list = MOCK_CAMP_DIALOGUES.filter(d => d.condition === 'high_stress');
    return list[Math.floor(Math.random() * list.length)] || MOCK_CAMP_DIALOGUES[0];
  }
  if (hero.currentHp / hero.maxHp <= 0.4) {
    const list = MOCK_CAMP_DIALOGUES.filter(d => d.condition === 'injured');
    return list[Math.floor(Math.random() * list.length)] || MOCK_CAMP_DIALOGUES[4];
  }
  if (hero.name) {
    const nameSpecific = MOCK_CAMP_DIALOGUES.find(d => d.speakerName === hero.name);
    if (nameSpecific) return nameSpecific;
  }
  const idle = MOCK_CAMP_DIALOGUES.filter(d => d.condition === 'idle' || d.condition === 'cooking' || d.condition === 'repairing');
  return idle[Math.floor(Math.random() * idle.length)] || MOCK_CAMP_DIALOGUES[0];
}

