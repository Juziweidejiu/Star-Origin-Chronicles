/**
 * 《三岔口》高品质探险与营地奇遇样本库
 *
 * 核心基调：接单、探路、清剿、回营整备
 * 坚守铁律：
 * 1. 严格线性历史，杜绝“远古文明/超古代科技/失传机关术”。
 * 2. 探索对象聚焦异兽巢穴、近三十年荒置的矿坑与旧垒。
 * 3. 全员对话带行会游侠的市井与战术气息，不堆砌空泛抒情。
 */

import type { DungeonEvent, CampDialogue } from '../types/narrative';

export const MOCK_DUNGEON_EVENTS: DungeonEvent[] = [
  {
    id: 'event_goblin_cache',
    title: '塌方老矿的积铁坑',
    theme: 'subterranean_cavern',
    category: 'encounter',
    hook: '渗水巷道拐角处挖了个深坑，坑底堆着尖耳山魈从运煤车上抢来的生铁锭与一袋铜钱。坑口拉着几根系着羊骨铃铛的细韧藤。',
    choices: [
      {
        id: 'c1',
        label: '由冯阿七飞爪隔空起出铁锭',
        flavor: '绳索手法够稳就能避开骨铃，惊动了就得在窄巷里接战。',
        requirement: { attribute: 'composure', minAttrValue: 12 },
        successRate: 0.8,
        successConsequence: {
          stressChange: -5,
          moraleChange: 10,
          goldChange: 130,
          resultNarrative: '飞爪无声扣住麻袋。全队把沉甸甸的生铁锭拉了上来，骨铃一声未响。'
        },
        failureConsequence: {
          stressChange: 15,
          moraleChange: -5,
          hpPercentChange: -5,
          resultNarrative: '骨铃被藤条扯响。巷道深处射来几排削尖的竹箭，擦伤了掩护的前排皮甲。'
        }
      },
      {
        id: 'c2',
        label: '石铁山举盾直接撞碎骨铃',
        flavor: '以厚盾先发制人，把伏兵从暗处逼出来正面打。',
        successRate: 1.0,
        successConsequence: {
          stressChange: 5,
          moraleChange: 15,
          goldChange: 70,
          resultNarrative: '厚盾横撞，支撑木架应声断裂。几只尖耳山魈丢下铁镐逃窜，留下一箱散落的粗制箭簇。'
        }
      },
      {
        id: 'c3',
        label: '在坑口洒下驱兽椒粉离开',
        flavor: '不为这点矿料耽误主线探索。',
        successRate: 1.0,
        successConsequence: {
          stressChange: 0,
          moraleChange: 0,
          resultNarrative: '队伍贴着干燥的岩壁快速穿过，没有惊动巷道深处的巡逻山魈。'
        }
      }
    ]
  },
  {
    id: 'event_wyvern_cliff_nest',
    title: '北松岭的头狼窝',
    theme: 'beast_den',
    category: 'hunt',
    hook: '背风的岩窝里铺着厚厚一层兽毛，窝边挂着半副被啃净的山牛角。坡上雪线边缘有一串新鲜的爪印，一直延伸到松林深处。',
    choices: [
      {
        id: 'c1',
        label: '由唐远张弓守在林缘',
        flavor: '头狼绕后时先吃一箭，全队不至于被冲散。',
        successRate: 0.75,
        successConsequence: {
          stressChange: -5,
          moraleChange: 15,
          goldChange: 180,
          resultNarrative: '独眼头狼刚探出松枝，唐远一箭钉穿它的前腿。剩下两只山猪掉头就跑，窝里留下完整的山牛角。'
        },
        failureConsequence: {
          stressChange: 20,
          moraleChange: -5,
          hpPercentChange: -12,
          resultNarrative: '头狼从侧坡绕了上来。队伍边退边打，唐远的手背被狼牙划开一道口子。'
        }
      },
      {
        id: 'c2',
        label: '赵英挺长枪堵住窝口',
        flavor: '放弃皮毛，先把这群畜生赶出松岭。',
        successRate: 1.0,
        successConsequence: {
          stressChange: -10,
          moraleChange: 5,
          resultNarrative: '长枪在窝口压住来路，头狼试探两次便退了。队伍趁势退出松林，无人带伤。'
        }
      }
    ]
  },
  {
    id: 'event_frontier_armory',
    title: '西关旧垒的封存兵库',
    theme: 'frontier_fort',
    category: 'curio',
    hook: '三十年前撤防留下的旧值房里，斜插着几具覆满干裂油布的防潮木箱。封条早被潮气蚀穿，箱侧还能辨出当年边军的官印。',
    choices: [
      {
        id: 'c1',
        label: '许知微拆开箱侧机关',
        flavor: '官家封箱多半带防盗撞针，硬撬容易引燃箱底火石。',
        successRate: 0.85,
        successConsequence: {
          stressChange: -5,
          moraleChange: 10,
          goldChange: 150,
          resultNarrative: '算盘珠拨了三下，许知微摸清机簧走向。箱里整齐码着两卷未受潮的锁甲甲叶和半罐防锈桐油。'
        },
        failureConsequence: {
          stressChange: 15,
          moraleChange: -5,
          hpPercentChange: -6,
          resultNarrative: '机簧锈死引燃了箱底火石，呛人的烟直往屋里灌，前排一副皮护臂被燎焦。'
        }
      },
      {
        id: 'c2',
        label: '许半夏翻检箱侧药囊',
        flavor: '边军值房常备防瘴止血的药散。',
        successRate: 0.9,
        successConsequence: {
          stressChange: -15,
          moraleChange: 10,
          resultNarrative: '许半夏从蜡封陶罐里起出几包干燥的止血药散，队里几处轻伤当场敷好。'
        }
      }
    ]
  }
];

export const MOCK_CAMP_DIALOGUES: CampDialogue[] = [
  {
    id: 'camp_1',
    speakerName: '陈砚',
    personality: 'heroic',
    condition: 'cooking',
    text: '锅里煮的是干粮配腌菜，别嫌寡淡。明早要过风口岭，肚子里有点干粮才扛得住山风。'
  },
  {
    id: 'camp_2',
    speakerName: '石铁山',
    personality: 'stoic',
    condition: 'repairing',
    text: '盾面上的凹坑我敲平了。前边矿道窄，山魈的吹箭专挑缝隙钻，都把护颈系紧。'
  },
  {
    id: 'camp_3',
    speakerName: '徐阿秋',
    personality: 'pragmatic',
    condition: 'after_victory',
    text: '刀口没卷。刚才你那一下抢得很准，省了我半口气，回头请你喝渡口的茶。'
  },
  {
    id: 'camp_4',
    speakerName: '林禾',
    personality: 'playful',
    condition: 'idle',
    text: '石桥镇的说书先生讲过，翻过这道岭就是芦洲渡。等这趟单子结了，我想去听一回夜场鼓书。'
  },
  {
    id: 'camp_5',
    speakerName: '许半夏',
    personality: 'gentle',
    condition: 'injured',
    text: '别乱动，先把细针起了。皮外伤敷过伤药，睡一觉明天就收口。'
  },
  {
    id: 'camp_6',
    speakerName: '丁小锤',
    personality: 'pragmatic',
    condition: 'repairing',
    text: '手铳的机簧刚调好，火药压实了。再碰上披甲的箱魅，一响就能把它的锁舌打崩。'
  },
  {
    id: 'camp_7',
    speakerName: '唐远',
    personality: 'cynical',
    condition: 'idle',
    text: '风从北面压下来，后半夜要有雪。守夜排两班，谁也别躲在松树底下打盹。'
  },
  {
    id: 'camp_8',
    speakerName: '赵英',
    personality: 'heroic',
    condition: 'high_stress',
    text: '都别绷着。这趟接的是行会木牌上的明单，打不过就退，没人会拿命去填。'
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
