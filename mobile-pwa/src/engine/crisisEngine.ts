/**
 * 天灾大事件系统 (Crisis Engine)
 * Milestone 3 核心：第一期天灾【星原异动 · 极夜狂暴兽潮】
 * 遵循严格线性世界观与日式东亚奇幻风格
 */

import type { TownId, GuildContract } from '../types/world';

export type CrisisPhase = 'dormant' | 'rumor' | 'outbreak' | 'climax' | 'resolved';

export interface CrisisState {
  id: string;
  name: string;
  phase: CrisisPhase;
  daysRemainingInPhase: number;
  totalDaysActive: number;
  threatLevel: number; // 0 - 100
  fallenTowns: TownId[]; // 遭受兽潮围攻的前线关隘
  description: string;
  specialContractId?: string; // 大型战役委托
}

export class CrisisEngine {
  public crisis: CrisisState;

  constructor() {
    this.crisis = {
      id: 'stellar_beast_surge',
      name: '星原异动 · 极夜狂暴兽潮',
      phase: 'rumor', // 初始阶段为传闻与异动
      daysRemainingInPhase: 7, // 7 天后第一波狂潮爆发
      totalDaysActive: 0,
      threatLevel: 15,
      fallenTowns: [],
      description: '北境天幕划过幽蓝流星雨，群山深处的凶暴兽群与荒原巨猿受地脉异动惊扰，正发狂集结...',
    };
  }

  /**
   * 每天推进世界时间，同步更新天灾进程
   */
  public advanceDay(): { message?: string; triggeredPhaseChange: boolean } {
    this.crisis.totalDaysActive += 1;
    this.crisis.daysRemainingInPhase -= 1;
    let message = '';
    let triggeredPhaseChange = false;

    if (this.crisis.daysRemainingInPhase <= 0) {
      triggeredPhaseChange = true;
      if (this.crisis.phase === 'rumor') {
        this.crisis.phase = 'outbreak';
        this.crisis.daysRemainingInPhase = 14;
        this.crisis.threatLevel = 50;
        this.crisis.fallenTowns = ['vermilion_corridor']; // 朱雀回廊前线驿站告急
        message = '🚨【兽潮爆发】狂暴兽群突破红枫山防线，前线【朱雀回廊】陷入重围！各大城邦紧急发布联合救援赏金！';
      } else if (this.crisis.phase === 'outbreak') {
        this.crisis.phase = 'climax';
        this.crisis.daysRemainingInPhase = 10;
        this.crisis.threatLevel = 85;
        this.crisis.fallenTowns = ['vermilion_corridor', 'breeze_bastion'];
        message = '⚔️【决战时刻】狂暴首领“霜甲巨猿王”率群兽兵临【听风关】！若不能斩断兽王中枢，全境防线将全线崩溃！';
      } else if (this.crisis.phase === 'climax') {
        this.crisis.threatLevel = 100;
        message = '💥【危机失控】极夜兽潮冲垮了边境商道，城邦物价飞涨，霜月城公会发出最后总动员令！';
      }
    } else {
      // 狂潮爆发期的每日恶化
      if (this.crisis.phase === 'outbreak') {
        this.crisis.threatLevel = Math.min(80, this.crisis.threatLevel + 2);
      } else if (this.crisis.phase === 'climax') {
        this.crisis.threatLevel = Math.min(100, this.crisis.threatLevel + 3);
      }
    }

    return { message: message || undefined, triggeredPhaseChange };
  }

  /**
   * 生成天灾专属战役契约 (听风关防御战 / 讨伐霜甲巨猿王)
   */
  public generateCrisisContract(): GuildContract {
    if (this.crisis.phase === 'climax') {
      return {
        id: `crisis_climax_${Date.now()}`,
        title: '【决战兽王】突入雷鸣崖 · 讨伐霜甲巨猿王',
        type: 'beast_hunt',
        townId: 'frostmoon_keep',
        stars: 5,
        durationDays: 3,
        goldReward: 2500,
        reputationReward: 50,
        soulCrystalReward: 15,
        description: '突入暴风雪与雷暴交织的险峻山崖，直取发狂兽群的源头霸主“霜甲巨猿王”，彻底平息兽潮！',
        enemyClasses: ['paladin', 'arcanist', 'blademaster', 'warden'],
        enemyLevel: 5,
        status: 'available',
      };
    } else {
      return {
        id: `crisis_defense_${Date.now()}`,
        title: '【要塞阻击】听风关守卫战 · 遏止兽潮前锋',
        type: 'beast_hunt',
        townId: 'frostmoon_keep',
        stars: 4,
        durationDays: 2,
        goldReward: 1200,
        reputationReward: 30,
        soulCrystalReward: 8,
        description: '在要塞关隘坚壁清野，迎击第一波冲击城墙的凶暴赤狼与变异巨蜥，保护物资车队。',
        enemyClasses: ['arcanist', 'blademaster', 'guardian'],
        enemyLevel: 3,
        status: 'available',
      };
    }
  }

  /**
   * 玩家击破天灾专属战役，平息或逆转危机
   */
  public resolveCrisisVictory(): string {
    if (this.crisis.phase === 'climax') {
      this.crisis.phase = 'resolved';
      this.crisis.threatLevel = 0;
      this.crisis.fallenTowns = [];
      this.crisis.description = '危机魁首已被斩杀，凶潮退去，星原大陆迎来了久违的清晨！探险团名垂青史！';
      return '🎉【史诗胜利】兽王授首！汹涌兽潮彻底溃散，边境重见安宁，星原探险团成为全境传奇！';
    } else {
      this.crisis.threatLevel = Math.max(10, this.crisis.threatLevel - 35);
      this.crisis.fallenTowns = [];
      return '⚔️【战术大捷】兽潮前锋被重创崩溃，据点防御稳固，威胁度大幅降低！';
    }
  }
}
