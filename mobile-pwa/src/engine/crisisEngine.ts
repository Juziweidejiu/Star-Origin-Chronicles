/**
 * 天灾大事件系统 (Crisis Engine)
 * 第一期天灾【北境大雪 · 异兽外溢】（默认下线，由 features.ts 控制）
 * 遵循严格线性世界观：险情皆源自近三十年变故与近年的气候反常
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
      id: 'north_snow_beast_surge',
      name: '北境大雪 · 异兽外溢',
      phase: 'rumor', // 初始阶段为行会传回的零星消息
      daysRemainingInPhase: 7, // 7 天后第一波外溢爆发
      totalDaysActive: 0,
      threatLevel: 15,
      fallenTowns: [],
      description: '北境连降大雪，山兽南迁觅食。老鸦岭哨所连日传来警讯，望山堡与铸剑谷沿线已有兽群踏毁驿道...',
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
        this.crisis.fallenTowns = ['tidesong_haven']; // 芦洲渡外围盐场埠告急
        message = '【兽群外溢】南迁兽群冲破苇荡防线，前线【芦洲渡】盐场埠陷入重围！六合行会紧急加价收单！';
      } else if (this.crisis.phase === 'outbreak') {
        this.crisis.phase = 'climax';
        this.crisis.daysRemainingInPhase = 10;
        this.crisis.threatLevel = 85;
        this.crisis.fallenTowns = ['tidesong_haven', 'hammerdeep_hold'];
        message = '【决战时刻】巨角山牛王率兽群踏到【铸剑谷】谷口！若不能截住这头兽王，西麓矿道将全线断绝！';
      } else if (this.crisis.phase === 'climax') {
        this.crisis.threatLevel = 100;
        message = '【危机失控】兽群踏断了中州官道，粮价飞涨，石桥镇六合行会总会发出最后总动员令！';
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
   * 生成天灾专属战役契约 (铸剑谷守卫战 / 讨伐巨角山牛王)
   */
  public generateCrisisContract(): GuildContract {
    if (this.crisis.phase === 'climax') {
      return {
        id: `crisis_climax_${Date.now()}`,
        title: '【决战兽王】深入北松岭 · 讨伐巨角山牛王',
        type: 'beast_hunt',
        townId: 'ambermill_town',
        stars: 5,
        durationDays: 3,
        goldReward: 2500,
        reputationReward: 50,
        soulCrystalReward: 15,
        description: '顶着风雪摸进北松岭深处，截住踏毁驿道的兽群首领“巨角山牛王”，把这条商道重新打通。',
        enemyClasses: ['paladin', 'arcanist', 'blademaster', 'warden'],
        enemyLevel: 5,
        status: 'available',
      };
    } else {
      return {
        id: `crisis_defense_${Date.now()}`,
        title: '【谷口阻击】铸剑谷守卫战 · 遏止兽群前锋',
        type: 'beast_hunt',
        townId: 'ambermill_town',
        stars: 4,
        durationDays: 2,
        goldReward: 1200,
        reputationReward: 30,
        soulCrystalReward: 8,
        description: '在谷口石垒后清空射界，迎击第一波冲阵的断牙山猪与铁背山猪，护住运矿车队。',
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
      this.crisis.description = '兽王首级已挂上铸剑谷门楼，兽群四散，中州官道重又通了车。行会木牌上的名字，被来往客商念了整年。';
      return '【大捷】巨角山牛王伏诛！外溢兽群溃散，北境驿道重开，你们这趟单子记进了行会总会的大账。';
    } else {
      this.crisis.threatLevel = Math.max(10, this.crisis.threatLevel - 35);
      this.crisis.fallenTowns = [];
      return '【谷口大捷】兽群前锋被打散，石垒守住了，威胁大幅回落。';
    }
  }
}
