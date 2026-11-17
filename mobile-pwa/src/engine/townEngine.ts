/**
 * 城镇运营与后勤模拟引擎 (Town & Logistics Engine)
 * 负责据点体系、酒馆刷新、公会契约生成、时间推进、口粮/薪水消耗与圣所召魂
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

// 四大核心据点初始配置 (东亚/星原战纪设定，繁华且富有探索感)
export const TOWNS_CONFIG: Record<TownId, Omit<TownNode, 'reputation' | 'reputationLevel' | 'supplyCostMod' | 'rewardMod'>> = {
  frostmoon_keep: {
    id: 'frostmoon_keep',
    name: '霜月城',
    subtitle: '雪峰温泉之都 · 北境商盟中枢',
    description: '极北雪峰与地底温泉交汇处的繁华石构城邦，炉火常温，商旅云集，公会总舵与精锐冒险者驻扎地。',
    buildings: ['tavern', 'guild', 'market', 'infirmary', 'sanctuary'],
    distanceFromCapital: 0
  },
  breeze_bastion: {
    id: 'breeze_bastion',
    name: '听风关',
    subtitle: '峡谷咽喉 · 游侠与行商集散地',
    description: '扼守崇山峻岭要道的大型关隘，盛产良弓与飞刀，茶肆酒坊热闹非凡，常有外围异动情报。',
    buildings: ['tavern', 'guild', 'market', 'infirmary'],
    distanceFromCapital: 1
  },
  azure_wharf: {
    id: 'azure_wharf',
    name: '碧落行坞',
    subtitle: '水上行坞 · 云舟与奇珍港口',
    description: '依傍碧落大湖而建的宏伟水寨行坞，机巧工坊林立，四海奇珍与机关火器在此汇聚交易。',
    buildings: ['tavern', 'guild', 'market'],
    distanceFromCapital: 2
  },
  vermilion_corridor: {
    id: 'vermilion_corridor',
    name: '朱雀回廊',
    subtitle: '红枫幽径 · 灵脉圣所与古祭台',
    description: '红枫漫山的幽静官道驿站，坐落着古朴温润的星原引魂圣所，能调理气脉并引渡阵亡英灵。',
    buildings: ['sanctuary', 'infirmary', 'tavern'],
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
    return { reputationLevel: 'revered', supplyCostMod: 0.8, rewardMod: 1.25 }; // 崇拜：8折买入，25%赏金加成
  } else if (score >= 20) {
    return { reputationLevel: 'friendly', supplyCostMod: 0.9, rewardMod: 1.1 };  // 友善：9折买入，10%赏金加成
  } else if (score >= -20) {
    return { reputationLevel: 'neutral', supplyCostMod: 1.0, rewardMod: 1.0 };   // 中立：原价
  } else {
    return { reputationLevel: 'hostile', supplyCostMod: 1.3, rewardMod: 0.8 };   // 敌对：涨价30%，降赏金
  }
}

// 契约模板配置 (丰富生态：矿洞哥布林、荒原兽群、前朝关隘、商队押运、山林盗匪)
const CONTRACT_TITLES: Record<ContractType, { titles: string[]; desc: string; baseEnemy: ClassId[] }> = {
  bandit_camp: {
    titles: ['清剿黑煞寨沿途哨卡', '拔除断龙崖流寇盘踞点', '追缉截道巨寇残党'],
    desc: '一群残忍的凶悍劫匪封锁了商道咽喉，公会悬赏佣兵将其头目与喽啰尽数肃清。',
    baseEnemy: ['warden', 'blademaster', 'ranger', 'druid']
  },
  beast_hunt: {
    titles: ['霜爪雪猿窟领地驱逐', '暗夜赤焰狼群围堵', '深沼毒鳞巨蜥清扫'],
    desc: '野性凶兽频繁侵扰官道与近郊农庄，请深入荒原险境斩除兽群首领。',
    baseEnemy: ['guardian', 'blademaster', 'ranger', 'druid']
  },
  goblin_mine: {
    titles: ['赤耳哥布林矿洞扫荡', '夺回被侵占的铜铁矿坑', '拆毁哥布林地底陷阱阵'],
    desc: '狡诈凶暴的赤耳哥布林占据了富矿坑道，遍设暗箭毒刺，急需实战小队深入清剿。',
    baseEnemy: ['warden', 'arcanist', 'blademaster', 'ranger']
  },
  caravan_escort: {
    titles: ['北境雪莲珍药商队护送', '碧落奇珍机巧货船保卫', '霜月城军备物资押送'],
    desc: '穿越险峻峡谷的商贾车队需要经验老道的高手随行护卫，击退沿途袭扰。',
    baseEnemy: ['guardian', 'blademaster', 'ranger', 'arcanist']
  },
  ruins_cleansing: {
    titles: ['前朝沉陷关隘异动拔除', '探明古烽燧妖兽巢穴', '清缴荒山旧校场聚集猛兽'],
    desc: '三十年前边塞战役废弃的沉陷工事中盘踞着危险生物，公会悬赏探明虚实并彻底肃清。',
    baseEnemy: ['arcanist', 'paladin', 'blademaster', 'bard']
  }
};

const RECRUIT_STORIES = [
  '霜月边关退役的直剑士，剑招沉稳如松，渴望在精锐佣兵团一展胸中韬略。',
  '红枫驿走出的游方医者，行囊常备银针与甘草，近身短打拳脚亦不容小觑。',
  '崇山幽谷出身的矫捷猎手，百步穿杨，深谙山野追踪与机关暗道。',
  '碧落工坞的机关热衷者，怀揣自制短铳与飞爪，立志游历天下名城。',
  '游历江湖的刀客，豪爽仗义，在多次硬仗中战功卓著，视伙伴为手足。'
];

export class TownEngine {
  towns: Record<TownId, TownNode>;
  logistics: CompanyLogistics;
  contracts: Record<TownId, GuildContract[]>;
  tavernRecruits: Record<TownId, TavernRecruit[]>;
  fallenSouls: FallenSoul[];

  constructor() {
    // 初始化据点及声望
    this.towns = {
      frostmoon_keep: {
        ...TOWNS_CONFIG.frostmoon_keep,
        reputation: 25,
        ...calculateReputationDetails(25)
      },
      breeze_bastion: {
        ...TOWNS_CONFIG.breeze_bastion,
        reputation: 10,
        ...calculateReputationDetails(10)
      },
      azure_wharf: {
        ...TOWNS_CONFIG.azure_wharf,
        reputation: 0,
        ...calculateReputationDetails(0)
      },
      vermilion_corridor: {
        ...TOWNS_CONFIG.vermilion_corridor,
        reputation: 5,
        ...calculateReputationDetails(5)
      }
    };

    // 初始后勤数据
    this.logistics = {
      day: 1,
      currentTownId: 'frostmoon_keep',
      gold: 1200,
      rations: 35,
      soulCrystals: 2,
      medicines: 3,
      dailyFoodCost: 4,
      weeklyWageCost: 80
    };

    this.contracts = {
      frostmoon_keep: [],
      breeze_bastion: [],
      azure_wharf: [],
      vermilion_corridor: []
    };

    this.tavernRecruits = {
      frostmoon_keep: [],
      breeze_bastion: [],
      azure_wharf: [],
      vermilion_corridor: []
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
      'bandit_camp', 'beast_hunt', 'goblin_mine', 'caravan_escort', 'ruins_cleansing'
    ];

    const newContracts: GuildContract[] = [];
    const count = 3; // 每个据点 3 个在榜委托

    for (let i = 0; i < count; i++) {
      const type = contractTypes[Math.floor(Math.random() * contractTypes.length)];
      const stars = (Math.floor(Math.random() * 3) + 1) as ContractDifficulty; // 1-3星初始
      const cfg = CONTRACT_TITLES[type];
      const title = cfg.titles[Math.floor(Math.random() * cfg.titles.length)];
      
      const baseGold = stars * 180 + Math.floor(Math.random() * 80);
      const finalGold = Math.round(baseGold * town.rewardMod);
      const rep = stars * 15;

      newContracts.push({
        id: `c_${townId}_${Date.now()}_${i}`,
        title,
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
        id: `rec_${townId}_${Date.now()}_${i}`,
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
      return { success: false, message: `行军 ${travelDays} 天需要口粮 ${neededFood} 份，当前仅有 ${this.logistics.rations} 份！` };
    }

    // 扣除口粮并推进天数
    this.advanceDays(travelDays, roster);
    this.logistics.currentTownId = targetTownId;

    return { 
      success: true, 
      message: `行军 ${travelDays} 天，安全抵达【${targetTown.name}】！消耗口粮 ${neededFood} 份。` 
    };
  }

  // 购买口粮
  buyRations(amount: number): { success: boolean; message: string } {
    const currentTown = this.towns[this.logistics.currentTownId];
    const unitPrice = Math.round(6 * currentTown.supplyCostMod);
    const totalCost = unitPrice * amount;

    if (this.logistics.gold < totalCost) {
      return { success: false, message: `金币不足！购买 ${amount} 份口粮需要 ${totalCost} G。` };
    }

    this.logistics.gold -= totalCost;
    this.logistics.rations += amount;
    return { success: true, message: `成功采购 ${amount} 份行军口粮，花费 ${totalCost} G。` };
  }

  // 购买疗伤药剂
  buyMedicine(amount: number): { success: boolean; message: string } {
    const currentTown = this.towns[this.logistics.currentTownId];
    const unitPrice = Math.round(50 * currentTown.supplyCostMod);
    const totalCost = unitPrice * amount;

    if (this.logistics.gold < totalCost) {
      return { success: false, message: `金币不足！购买 ${amount} 瓶金创药需要 ${totalCost} G。` };
    }

    this.logistics.gold -= totalCost;
    this.logistics.medicines += amount;
    return { success: true, message: `成功采购 ${amount} 瓶金创药，花费 ${totalCost} G。` };
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
      return { success: false, message: `雇佣签约金不足！需要 ${recruit.hireCost} G。` };
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
      return { success: false, message: `医馆诊金不足！需要 ${cost} G。` };
    }

    this.logistics.gold -= cost;
    hero.currentHp = hero.maxHp;
    hero.injuries = [];
    hero.stress = Math.max(0, hero.stress - 20);

    return { success: true, message: `${hero.name} 伤势已彻底愈合，创伤清空，支付诊金 ${cost} G。` };
  }

  // 圣所举行灵魂召回仪式 (复活阵亡英雄)
  reviveSoul(fallenIndex: number, roster: Hero[]): { success: boolean; message: string; revivedHero?: Hero } {
    const town = this.towns[this.logistics.currentTownId];
    if (!town.buildings.includes('sanctuary')) {
      return { success: false, message: '只有在配有圣所的据点（如霜月城、朱雀回廊）才能进行灵魂引渡仪式！' };
    }

    const soul = this.fallenSouls[fallenIndex];
    if (!soul) {
      return { success: false, message: '未找到对应阵亡英灵的魂核。' };
    }

    if (this.logistics.gold < soul.revivalCostGold) {
      return { success: false, message: `圣所供奉金币不足！需要 ${soul.revivalCostGold} G。` };
    }

    if (this.logistics.soulCrystals < soul.revivalSoulCrystals) {
      return { success: false, message: `稀有魂晶不足！召回此魂魄需要 ${soul.revivalSoulCrystals} 颗魂晶。` };
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
      message: `星辉引渡！【${revived.name}】的英魂循脉归位，重获新生！`,
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

    // 奖励金币与魂晶
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
      message: `契约【${contract.title}】圆满达成！获得赏金 ${contract.goldReward} G，声望 +${contract.reputationReward}！`
    };
  }

  // 时间与后勤天数推进
  advanceDays(days: number, roster: Hero[]): { log: string[] } {
    const logs: string[] = [];

    for (let d = 0; d < days; d++) {
      this.logistics.day += 1;
      this.updateLogisticsCosts(roster);

      // 消耗口粮
      if (this.logistics.rations >= this.logistics.dailyFoodCost) {
        this.logistics.rations -= this.logistics.dailyFoodCost;
      } else {
        // 断粮饥饿
        this.logistics.rations = 0;
        logs.push(`⚠️ 第 ${this.logistics.day} 天：佣兵团口粮告罄！全员饥饿，士气严重下挫！`);
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
          logs.push(`🚨 第 ${this.logistics.day} 天：金库告急，无法足额支付佣金！队员怨气沸腾！`);
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
        logs.push(`🔄 各城邦公会契约与酒馆已动态更新招募名单。`);
      }
    }

    return { log: logs };
  }
}
