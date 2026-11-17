/**
 * 天灾大事件系统 (Crisis Engine)
 * Milestone 3 核心：第一期天灾【夜王复苏 · 亡灵狂潮】
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
  fallenTowns: TownId[]; // 被亡灵围攻/沦陷的前线城镇
  description: string;
  specialContractId?: string; // 大型战役委托
}

export class CrisisEngine {
  public crisis: CrisisState;

  constructor() {
    this.crisis = {
      id: 'night_king_resurgence',
      name: '夜王复苏 · 亡灵狂潮',
      phase: 'rumor', // 初始阶段为传闻与异动
      daysRemainingInPhase: 7, // 7 天后第一波狂潮爆发
      totalDaysActive: 0,
      threatLevel: 15,
      fallenTowns: [],
      description: '北境古老冻土下的古墓群发生诡异震颤，死者从墓穴中破棺而出，四野游民纷纷目睹幽绿魂火...',
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
        this.crisis.fallenTowns = ['forgotten_abbey']; // 遗忘修道院首当其冲失守
        message = '🚨【天灾爆发】亡灵大军从永夜裂隙涌出，前线【遗忘修道院】陷入重围！各大城邦紧急发布战争悬赏！';
      } else if (this.crisis.phase === 'outbreak') {
        this.crisis.phase = 'climax';
        this.crisis.daysRemainingInPhase = 10;
        this.crisis.threatLevel = 85;
        this.crisis.fallenTowns = ['forgotten_abbey', 'pine_town'];
        message = '💀【决战时刻】夜王亲率不朽死灵骑士团进逼！若不能攻破巫妖墓地斩杀夜王化身，全境将沦为死域！';
      } else if (this.crisis.phase === 'climax') {
        this.crisis.threatLevel = 100;
        message = '☠️【天灾失控】亡灵狂潮淹没了边防据点，城邦物价飞涨，各公会发出最后召集令！';
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
   * 生成天灾专属战役契约 (守城战役 / 突袭巫妖墓地)
   */
  public generateCrisisContract(): GuildContract {
    if (this.crisis.phase === 'climax') {
      return {
        id: `crisis_climax_${Date.now()}`,
        title: '【终局决战】决战夜王 · 突袭巫妖墓地',
        type: 'undead_crypt',
        townId: 'ash_stronghold',
        stars: 5,
        durationDays: 3,
        goldReward: 2500,
        reputationReward: 50,
        soulCrystalReward: 15,
        description: '潜入极北地脉巫妖墓地最底层，消灭夜王化身与骸骨近卫，彻底粉碎亡灵狂潮！',
        enemyClasses: ['paladin', 'arcanist', 'blademaster', 'warden'],
        enemyLevel: 5,
        status: 'available',
      };
    } else {
      return {
        id: `crisis_defense_${Date.now()}`,
        title: '【天灾防线】修道院阻击战 · 斩断亡灵前锋',
        type: 'undead_crypt',
        townId: 'ash_stronghold',
        stars: 4,
        durationDays: 2,
        goldReward: 1200,
        reputationReward: 30,
        soulCrystalReward: 8,
        description: '抵挡亡灵大军的前锋死灵法师，解救陷于围困的平民与守备军。',
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
      return '🎉【史诗胜利】危机核心被击溃！边境重见安宁，星原探险团成为全境传奇！';
    } else {
      this.crisis.threatLevel = Math.max(10, this.crisis.threatLevel - 35);
      return '⚔️【战术大捷】亡灵前锋被重创崩溃，据点防御稳固，威胁度大幅降低！';
    }
  }
}
