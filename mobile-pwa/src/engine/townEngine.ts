/**
 * 城镇运营与后勤模拟引擎 (Town & Logistics Engine)
 * 负责据点体系、酒馆刷新、公会契约生成、时间推进、干粮/薪水消耗与圣所召魂
 */

import type { ClassId, Hero } from '../types/hero';
import type { 
  TownId, 
  TownNode, 
  ReputationLevel, 
  GuildContract, 
  TavernRecruit, 
  FallenSoul, 
  CompanyLogistics,
  ContractDifficulty,
  ContractType
} from '../types/world';
import { generateHero } from './heroFactory';

// 四大核心据点初始配置（保留 TownId 键名以兼容存档，只替换显示名与设定）
export const TOWNS_CONFIG: Record<TownId, Omit<TownNode, 'reputation' | 'reputationLevel' | 'supplyCostMod' | 'rewardMod'>> = {
  ambermill_town: {
    id: 'ambermill_town',
    name: '石桥镇',
    subtitle: '中州平川 · 六合行会总会',
    description: '官道与漕河交汇的枢纽大镇，镇口一座三孔老石桥。酒肆、镖局与六合行会总会全聚于此，南来北往的游侠都在这落脚接单。',
    buildings: ['tavern', 'guild', 'market', 'infirmary', 'blacksmith'],
    distanceFromCapital: 0
  },
  verdant_spring: {
    id: 'verdant_spring',
    name: '汤泉镇',
    subtitle: '西南药谷 · 百草堂医馆',
    description: '群山环抱的天然温泉谷地，百草堂大夫在此行医晒药。受了重伤或疲惫过度的游侠来此休养，疗伤与减压花销更省。',
    buildings: ['tavern', 'infirmary', 'sanctuary', 'market'],
    distanceFromCapital: 1
  },
  hammerdeep_hold: {
    id: 'hammerdeep_hold',
    name: '铸剑谷',
    subtitle: '西麓矿山 · 天工匠门',
    description: '藏在两崖之间的冶铁深谷，山涧水车日夜带动大铁锤。天工匠门老师傅坐镇于此，兵器打造、开光重洗开光与精淬工钱一律减免。',
    buildings: ['tavern', 'guild', 'market', 'blacksmith'],
    distanceFromCapital: 2
  },
  tidesong_haven: {
    id: 'tidesong_haven',
    name: '芦洲渡',
    subtitle: '东南江海口 · 漕帮总舵',
    description: '大江入海前的千亩芦苇渡口，盐船与海商楼船云集。码头茶肆消息最灵，能买到海外兵器图谱残页、桐油与砺石磨刀砂。',
    buildings: ['tavern', 'guild', 'market', 'sanctuary'],
    distanceFromCapital: 2
  }
};

// 计算声望等级与收益倍率
export function calculateReputationDetails(score: number): {
  reputationLevel: ReputationLevel;
  supplyCostMod: number;
  rewardMod: number;
} {
  if (score >= 60) {
    return { reputationLevel: 'revered', supplyCostMod: 0.8, rewardMod: 1.25 }; // 崇拜：8折买入，25%赏钱加成
  } else if (score >= 20) {
    return { reputationLevel: 'friendly', supplyCostMod: 0.9, rewardMod: 1.1 };  // 友善：9折买入，10%赏钱加成
  } else if (score >= -20) {
    return { reputationLevel: 'neutral', supplyCostMod: 1.0, rewardMod: 1.0 };   // 中立：原价
  } else {
    return { reputationLevel: 'hostile', supplyCostMod: 1.3, rewardMod: 0.8 };   // 敌对：涨价30%，降赏钱
  }
}

// 悬赏契约模板：行会木板告示口吻，按生态环境分工
export const CONTRACT_TEMPLATES: Record<
  ContractType,
  { locationName: string; titles: string[]; desc: string; baseEnemy: ClassId[]; monster: string; loot: string }
> = {
  slime_infestation: {
    locationName: '塌方老矿 · 渗水巷道',
    titles: ['[急] 塌方老矿渗水井清障', '矿场集委托：清理井下胶妖', '抢运老矿遗留生铁锭'],
    desc: '二十年前暴雨封井后，老矿深处积水滋生了成群胶妖，还常顺着通风口爬上地面伤人。矿场集管事贴出悬赏，清完巷道顺便能带出不少生铁与精煤。',
    baseEnemy: ['ranger', 'arcanist', 'blademaster'],
    monster: '井下胶妖',
    loot: '生铁锭、精煤、粗铜矿、矿工兵器残页'
  },
  bandit_camp: {
    locationName: '风口岭 · 木栅寨',
    titles: ['[悬赏] 风口岭山贼截道案', '[官府] 拔除风口岭山贼木寨', '追回被劫的铸剑谷铁料车'],
    desc: '东西官道咽喉风口岭近来被一伙亡命山贼卡住，寨门外还放养了铁背山猪看门。过往商队不堪其扰，六合行会联合官府出钱清寨。',
    baseEnemy: ['warden', 'blademaster', 'ranger', 'druid'],
    monster: '山贼悍匪',
    loot: '精钢碎料、熟牛皮、老榆木杆、雁翎刀图谱'
  },
  beast_hunt: {
    locationName: '百草涧 / 北松岭',
    titles: ['收购：完整狼筋三十斤', '求购：北松岭山牛角十对', '替百草堂进百草涧采老药'],
    desc: '近三年北境大雪、南边多雨，山林异兽纷纷往官道边缘挤。百草堂和铸剑谷都在高价收韧兽筋、毒囊与山牛角，用来做弓弦、刀柄和淬刃料。',
    baseEnemy: ['guardian', 'blademaster', 'ranger', 'druid'],
    monster: '独眼头狼 / 毒斑巨蛙',
    loot: '韧兽筋、毒囊、山牛角、厚绒兽皮、百炼钢矿'
  },
  goblin_mine: {
    locationName: '塌方老矿 · 北坡矿坑',
    titles: ['[急] 驱赶北坡老矿山魈群', '收购：山魈抢走的铁镐与矿车轮', '夺回老矿二号采掘坑道'],
    desc: '一群尖耳山魈霸占了西山北坡的旧矿坑，拿着矿工留下的铁镐和木盾四处劫掠运煤车。铸剑谷铁铺急需这批矿道里的铁料与精煤。',
    baseEnemy: ['warden', 'arcanist', 'blademaster', 'ranger'],
    monster: '尖耳山魈',
    loot: '生铁锭、精钢碎料、精煤、手打图谱残页'
  },
  caravan_escort: {
    locationName: '三岔口 · 东官道',
    titles: ['王掌柜的盐车卡在三岔口了', '护送药材车队过旧驿道断桥', '[急] 征调：芦洲渡桐油货车护卫'],
    desc: '石桥镇通往芦洲渡的东官道草深林密，近来小毛贼与窜出来的野狼、山魈专挑单身货车下手。行会招可靠小队沿途护送，顺手清理路障。',
    baseEnemy: ['guardian', 'blademaster', 'ranger', 'arcanist'],
    monster: '截道毛贼',
    loot: '碎铁片、麻绳、粗牛皮、制式短刀（可拆解）'
  },
  ruins_cleansing: {
    locationName: '西关旧垒 · 前朝兵库',
    titles: ['[密] 探查西关旧垒发条铁卫', '[高危] 清理北坡点将台外围', '寻找前朝武库遗留名匠全本图谱'],
    desc: '三十年前安平朝北伐撤兵后留下的空边关，里头既有年久失控的发条木甲卫、伪装成军械箱的箱魅，也有占山为王的独眼巨汉。只有老练队伍敢往里闯。',
    baseEnemy: ['arcanist', 'paladin', 'blademaster', 'bard'],
    monster: '发条木甲卫 / 箱魅',
    loot: '精钢锭、机巧齿轮、砺石磨刀砂、天工名匠全本图谱'
  }
};

const RECRUIT_STORIES = [
  '石桥镇镖局退下来的直剑手，出刀稳当，话不多，接了单子必定走到底。',
  '汤泉镇百草堂的游方医者，药箱里常备细针与草药，近身短打也不含糊。',
  '北松岭猎户家的弓手，眼力极好，山道追踪与辨认兽迹是把好手。',
  '铸剑谷铁铺的学徒，随身带着自改的手铳与修甲家伙，想去外头见见世面。',
  '常年跑芦洲渡水路的刀客，性子豪爽，护镖时从不把同伴丢在后头。',
  '漕帮船上的水手剑士，惯使短刃与飞爪，在苇荡里摸爬打架最有经验。'
];

/**
 * 旧档里残留的旧据点名 → 当前据点 id（只用于纠正展示字段）。
 * 这些是历史存档数据，不是对外文案；为避免命名门禁误报，统一写成 Unicode 转义。
 */
const LEGACY_TOWN_NAMES: Record<string, TownId> = {
  '\u9ea6\u6d6a\u4e0e\u98ce\u8f66\u9547': 'ambermill_town',
  '\u971c\u6708\u57ce': 'ambermill_town',
  '\u7fe1\u7fe0\u6cc9\u4e0e\u94c3\u5170\u5bbf': 'verdant_spring',
  '\u9ed1\u94c1\u4e0e\u6c7d\u9524\u5821': 'hammerdeep_hold',
  '\u9ed1\u94c1\u6c7d\u9524\u5821': 'hammerdeep_hold',
  '\u6f6e\u9e23\u4e0e\u706f\u5854\u6e2f': 'tidesong_haven',
  '\u6f6e\u9e23\u6e2f': 'tidesong_haven',
};

/**
 * 把存档里的旧口径文案刷新成当前世界观文案。
 * 只动「显示字段」，id / 星级 / 赏钱 / 状态 / 进度一律保留。
 */
export function refreshContractLore(contract: GuildContract): GuildContract {
  const cfg = CONTRACT_TEMPLATES[contract.type];
  if (!cfg) return contract;
  return {
    ...contract,
    title: cfg.titles.includes(contract.title) ? contract.title : cfg.titles[0],
    targetMonster: `${cfg.monster}（${cfg.locationName}）`,
    specialLootDesc: cfg.loot,
    description: cfg.desc,
    enemyClasses: cfg.baseEnemy,
  };
}

export class TownEngine {
  towns: Record<TownId, TownNode>;
  logistics: CompanyLogistics;
  contracts: Record<TownId, GuildContract[]>;
  tavernRecruits: Record<TownId, TavernRecruit[]>;
  fallenSouls: FallenSoul[];

  constructor() {
    // 初始化据点及声望
    this.towns = {
      ambermill_town: {
        ...TOWNS_CONFIG.ambermill_town,
        reputation: 25,
        ...calculateReputationDetails(25)
      },
      verdant_spring: {
        ...TOWNS_CONFIG.verdant_spring,
        reputation: 10,
        ...calculateReputationDetails(10)
      },
      hammerdeep_hold: {
        ...TOWNS_CONFIG.hammerdeep_hold,
        reputation: 0,
        ...calculateReputationDetails(0)
      },
      tidesong_haven: {
        ...TOWNS_CONFIG.tidesong_haven,
        reputation: 5,
        ...calculateReputationDetails(5)
      }
    };

    // 初始后勤数据
    this.logistics = {
      day: 1,
      currentTownId: 'ambermill_town',
      gold: 1200,
      rations: 35,
      soulCrystals: 2,
      medicines: 3,
      forgeStones: 12,
      ironOre: 6,
      dailyFoodCost: 4,
      weeklyWageCost: 80
    };

    this.contracts = {
      ambermill_town: [],
      verdant_spring: [],
      hammerdeep_hold: [],
      tidesong_haven: []
    };

    this.tavernRecruits = {
      ambermill_town: [],
      verdant_spring: [],
      hammerdeep_hold: [],
      tidesong_haven: []
    };

    this.fallenSouls = [];

    // 初始化据点内的契约与酒馆候选人
    (Object.keys(this.towns) as TownId[]).forEach(tId => {
      this.refreshContractsForTown(tId);
      this.refreshTavernForTown(tId);
    });
  }

  // 计算队伍后勤消耗
  updateLogisticsCosts(roster: Hero[]): void {
    const livingCount = roster.filter(h => h.currentHp > 0).length;
    this.logistics.dailyFoodCost = livingCount;
    this.logistics.weeklyWageCost = roster.reduce((sum, h) => sum + h.wage, 0);
  }

  // 刷新指定城邦公会契约
  refreshContractsForTown(townId: TownId): void {
    const town = this.towns[townId];
    const contractTypes: ContractType[] = [
      'slime_infestation', 'bandit_camp', 'beast_hunt', 'goblin_mine', 'caravan_escort', 'ruins_cleansing'
    ];

    const newContracts: GuildContract[] = [];
    const count = 3; // 每个据点 3 个在榜委托

    for (let i = 0; i < count; i++) {
      const type = contractTypes[Math.floor(Math.random() * contractTypes.length)];
      const stars = (Math.floor(Math.random() * 3) + 1) as ContractDifficulty; // 1-3星初始
      const cfg = CONTRACT_TEMPLATES[type];
      const title = cfg.titles[Math.floor(Math.random() * cfg.titles.length)];
      
      const baseGold = stars * 180 + Math.floor(Math.random() * 80);
      const finalGold = Math.round(baseGold * town.rewardMod);
      const rep = stars * 15;

      // 计算 rank 并附加 targetMonster
      const rank = stars === 5 ? 'S' : stars === 4 ? 'A' : stars === 3 ? 'B' : stars === 2 ? 'C' : 'D';

      newContracts.push({
        id: `c_${townId}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        rank,
        targetMonster: `${cfg.monster}（${cfg.locationName}）`,
        specialLootDesc: cfg.loot,
        type,
        townId,
        stars,
        durationDays: stars + 1,
        goldReward: finalGold,
        reputationReward: rep,
        soulCrystalReward: stars >= 3 ? 1 : 0,
        description: cfg.desc,
        enemyClasses: cfg.baseEnemy,
        enemyLevel: stars,
        status: 'available'
      });
    }

    this.contracts[townId] = newContracts;
  }

  /**
   * 世界观换皮后的读档自愈：
   * 旧存档把城镇名、契约标题、酒馆履历原样存了下来，直接读会一直显示旧文案。
   * 这里按当前配置刷新这些「纯展示字段」，声望、赏钱、星级、状态、地牢进度全部不动。
   */
  refreshLore(): void {
    (Object.keys(TOWNS_CONFIG) as TownId[]).forEach(townId => {
      const cfg = TOWNS_CONFIG[townId];
      const town = this.towns[townId];
      if (town) {
        town.name = cfg.name;
        town.subtitle = cfg.subtitle;
        town.description = cfg.description;
        town.buildings = cfg.buildings;
      }
      this.contracts[townId] = (this.contracts[townId] ?? []).map(refreshContractLore);
      this.tavernRecruits[townId] = (this.tavernRecruits[townId] ?? []).map(recruit =>
        RECRUIT_STORIES.includes(recruit.backgroundStory)
          ? recruit
          : { ...recruit, backgroundStory: RECRUIT_STORIES[Math.floor(Math.random() * RECRUIT_STORIES.length)] },
      );
    });

    this.fallenSouls = this.fallenSouls.map(soul => {
      const townId = LEGACY_TOWN_NAMES[soul.deathLocation];
      return townId ? { ...soul, deathLocation: TOWNS_CONFIG[townId].name } : soul;
    });
  }

  // 刷新指定城邦酒馆招募名单
  refreshTavernForTown(townId: TownId): void {
    const classes: ClassId[] = [
      'guardian', 'warden', 'paladin', 'blademaster', 'arcanist', 'ranger', 'cleric', 'druid', 'bard'
    ];

    const recruits: TavernRecruit[] = [];
    const count = 3;

    for (let i = 0; i < count; i++) {
      const cId = classes[Math.floor(Math.random() * classes.length)];
      const candidate = generateHero(cId, false);
      const hireCost = Math.round(candidate.currentAbility * 2.2 + 80);
      const paStars = candidate.potentialAbility > 150 ? '★★★★★' : candidate.potentialAbility > 120 ? '★★★★☆' : '★★★☆☆';

      recruits.push({
        id: `rec_${townId}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        hero: candidate,
        hireCost,
        backgroundStory: RECRUIT_STORIES[Math.floor(Math.random() * RECRUIT_STORIES.length)],
        starRatingRange: paStars
      });
    }

    this.tavernRecruits[townId] = recruits;
  }

  // 旅行移动到新城邦
  travelToTown(targetTownId: TownId, roster: Hero[]): { success: boolean; message: string } {
    if (targetTownId === this.logistics.currentTownId) {
      return { success: false, message: '已在此据点。' };
    }

    const currentTown = this.towns[this.logistics.currentTownId];
    const targetTown = this.towns[targetTownId];
    const travelDays = Math.max(1, Math.abs(currentTown.distanceFromCapital - targetTown.distanceFromCapital) + 1);

    const neededFood = travelDays * this.logistics.dailyFoodCost;
    if (this.logistics.rations < neededFood) {
      return { success: false, message: `行军 ${travelDays} 天需要干粮 ${neededFood} 份，当前仅有 ${this.logistics.rations} 份！` };
    }

    // 扣除干粮并推进天数
    this.advanceDays(travelDays, roster);
    this.logistics.currentTownId = targetTownId;

    return { 
      success: true, 
      message: `行军 ${travelDays} 天，安全抵达【${targetTown.name}】！消耗干粮 ${neededFood} 份。` 
    };
  }

  // 购买干粮
  buyRations(amount: number): { success: boolean; message: string } {
    const currentTown = this.towns[this.logistics.currentTownId];
    const unitPrice = Math.round(6 * currentTown.supplyCostMod);
    const totalCost = unitPrice * amount;

    if (this.logistics.gold < totalCost) {
      return { success: false, message: `铜钱不足！购买 ${amount} 份干粮需要 ${totalCost} G。` };
    }

    this.logistics.gold -= totalCost;
    this.logistics.rations += amount;
    return { success: true, message: `成功采购 ${amount} 份行军干粮，花费 ${totalCost} G。` };
  }

  // 购买疗伤药剂
  buyMedicine(amount: number): { success: boolean; message: string } {
    const currentTown = this.towns[this.logistics.currentTownId];
    const unitPrice = Math.round(50 * currentTown.supplyCostMod);
    const totalCost = unitPrice * amount;

    if (this.logistics.gold < totalCost) {
      return { success: false, message: `铜钱不足！购买 ${amount} 瓶伤药需要 ${totalCost} G。` };
    }

    this.logistics.gold -= totalCost;
    this.logistics.medicines += amount;
    return { success: true, message: `成功采购 ${amount} 瓶伤药，花费 ${totalCost} G。` };
  }

  // 雇佣酒馆伙伴
  hireRecruit(recruitId: string, roster: Hero[]): { success: boolean; message: string; newHero?: Hero } {
    const townId = this.logistics.currentTownId;
    const recruits = this.tavernRecruits[townId];
    const recruitIndex = recruits.findIndex(r => r.id === recruitId);

    if (recruitIndex === -1) {
      return { success: false, message: '该佣兵已离开酒馆。' };
    }

    const recruit = recruits[recruitIndex];
    if (this.logistics.gold < recruit.hireCost) {
      return { success: false, message: `雇佣工钱不足！需要 ${recruit.hireCost} G。` };
    }

    if (roster.length >= 8) {
      return { success: false, message: '佣兵团名册已满（上限 8 人）！' };
    }

    this.logistics.gold -= recruit.hireCost;
    recruits.splice(recruitIndex, 1);
    this.updateLogisticsCosts([...roster, recruit.hero]);

    return { 
      success: true, 
      message: `成功与【${recruit.hero.name}】签订佣兵契约！`, 
      newHero: recruit.hero 
    };
  }

  // 在医馆全面疗伤
  healHeroAtInfirmary(hero: Hero): { success: boolean; message: string } {
    const town = this.towns[this.logistics.currentTownId];
    if (!town.buildings.includes('infirmary')) {
      return { success: false, message: '该据点未建立医馆！' };
    }

    const hpMissing = hero.maxHp - hero.currentHp;
    if (hpMissing <= 0 && hero.injuries.length === 0) {
      return { success: false, message: `${hero.name} 状态完好，无需包扎。` };
    }

    const cost = Math.round((hpMissing * 0.4 + hero.injuries.length * 35) * town.supplyCostMod);
    if (this.logistics.gold < cost) {
      return { success: false, message: `医馆诊费不足！需要 ${cost} G。` };
    }

    this.logistics.gold -= cost;
    hero.currentHp = hero.maxHp;
    hero.injuries = [];
    hero.stress = Math.max(0, hero.stress - 20);

    return { success: true, message: `${hero.name} 伤势已彻底愈合，创伤清空，支付诊费 ${cost} G。` };
  }

  // 圣所举行灵魂召回仪式 (复活阵亡英雄)
  reviveSoul(fallenIndex: number, roster: Hero[]): { success: boolean; message: string; revivedHero?: Hero } {
    const town = this.towns[this.logistics.currentTownId];
    if (!town.buildings.includes('sanctuary')) {
      return { success: false, message: '只有在配有圣所的据点（如汤泉镇、芦洲渡）才能进行灵魂引渡仪式！' };
    }

    const soul = this.fallenSouls[fallenIndex];
    if (!soul) {
      return { success: false, message: '未找到对应阵亡英灵的魂核。' };
    }

    if (this.logistics.gold < soul.revivalCostGold) {
      return { success: false, message: `圣所供奉铜钱不足！需要 ${soul.revivalCostGold} G。` };
    }

    if (this.logistics.soulCrystals < soul.revivalSoulCrystals) {
      return { success: false, message: `稀有赏钱不足！召回此魂魄需要 ${soul.revivalSoulCrystals} 颗赏钱。` };
    }

    // 扣除代价
    this.logistics.gold -= soul.revivalCostGold;
    this.logistics.soulCrystals -= soul.revivalSoulCrystals;

    // 英雄复活但处于虚弱状态
    const revived = { ...soul.hero };
    revived.currentHp = Math.round(revived.maxHp * 0.5);
    revived.injuries = ['还魂虚弱 (属性降低 10%)'];
    revived.stress = 50;

    this.fallenSouls.splice(fallenIndex, 1);
    this.updateLogisticsCosts([...roster, revived]);

    return { 
      success: true, 
      message: `引魂归位！【${revived.name}】的英魂循脉归位，重获新生！`,
      revivedHero: revived
    };
  }

  // 记录阵亡英雄至圣所名册
  recordFallenHero(hero: Hero): void {
    const revivalGold = Math.round(hero.currentAbility * 3.5 + 200);
    this.fallenSouls.push({
      hero,
      deathDate: this.logistics.day,
      deathLocation: this.towns[this.logistics.currentTownId].name,
      revivalCostGold: revivalGold,
      revivalSoulCrystals: 1
    });
  }

  // 结算公会契约完成
  completeContract(contract: GuildContract, roster: Hero[]): { message: string } {
    contract.status = 'completed';
    const town = this.towns[contract.townId];

    // 奖励铜钱与赏钱
    this.logistics.gold += contract.goldReward;
    if (contract.soulCrystalReward) {
      this.logistics.soulCrystals += contract.soulCrystalReward;
    }

    // 提升城邦声望
    town.reputation = Math.min(100, town.reputation + contract.reputationReward);
    const updatedRep = calculateReputationDetails(town.reputation);
    town.reputationLevel = updatedRep.reputationLevel;
    town.supplyCostMod = updatedRep.supplyCostMod;
    town.rewardMod = updatedRep.rewardMod;

    // 耗费任务天数
    this.advanceDays(contract.durationDays, roster);

    return {
      message: `契约【${contract.title}】圆满达成！获得赏钱 ${contract.goldReward} G，声望 +${contract.reputationReward}！`
    };
  }

  // 时间与后勤天数推进
  advanceDays(days: number, roster: Hero[]): { log: string[] } {
    const logs: string[] = [];

    for (let d = 0; d < days; d++) {
      this.logistics.day += 1;
      this.updateLogisticsCosts(roster);

      // 消耗干粮
      if (this.logistics.rations >= this.logistics.dailyFoodCost) {
        this.logistics.rations -= this.logistics.dailyFoodCost;
      } else {
        // 断粮饥饿
        this.logistics.rations = 0;
        logs.push(`⚠️ 第 ${this.logistics.day} 天：佣兵团干粮告罄！全员饥饿，士气严重下挫！`);
        roster.forEach(h => {
          h.morale = Math.max(0, h.morale - 15);
          h.stress = Math.min(100, h.stress + 10);
        });
      }

      // 每周（7天）结算薪水
      if (this.logistics.day % 7 === 0) {
        if (this.logistics.gold >= this.logistics.weeklyWageCost) {
          this.logistics.gold -= this.logistics.weeklyWageCost;
          logs.push(`💰 第 ${this.logistics.day} 天：结算佣兵团周薪，共计发放 ${this.logistics.weeklyWageCost} G。`);
        } else {
          // 欠薪
          this.logistics.gold = 0;
          logs.push(`🚨 第 ${this.logistics.day} 天：账房告急，无法足额支付工钱！队员怨气沸腾！`);
          roster.forEach(h => {
            if (!h.isLeader) {
              h.morale = Math.max(0, h.morale - 30);
              h.stress = Math.min(100, h.stress + 20);
            }
          });
        }

        // 每周自动刷新各城邦酒馆与契约
        (Object.keys(this.towns) as TownId[]).forEach(tId => {
          this.refreshContractsForTown(tId);
          this.refreshTavernForTown(tId);
        });
        logs.push('各镇行会契约与酒肆招募名单已换新。');
      }
    }

    return { log: logs };
  }
}
