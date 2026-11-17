/**
 * 冒险公会契约与任务板分级系统类型定义 (Guild Contract Board System)
 * 遵循日漫奇幻冒险与《迷宫饭》生活生态风格，S/A/B/C/D 五阶分级
 */

import type { ContractDifficulty } from './world';

// 任务难度等级（日漫冒险公会阶位）
export type GuildContractRank = 'S' | 'A' | 'B' | 'C' | 'D';

// 探险团公会声望阶位
export type GuildReputationTier = 'novice_copper' | 'veteran_iron' | 'senior_silver' | 'elite_gold' | 'legend_mithril';

// 战术胜率评估结果
export interface ContractOddsEstimate {
  winRate: number;              // 胜率百分比 (0 - 100)
  dangerLevel: 'breeze' | 'balanced' | 'tough' | 'perilous'; // 轻松碾压 | 势均力敌 | 苦战险胜 | 九死一生
  dangerLabel: string;          // 显示文本（如 "势均力敌"）
  dangerColor: string;          // 对应颜色
  tacticTip: string;            // 日漫探险战术贴士 (针对魔物弱点与站位建议)
  partyPower: number;           // 队伍综合评估分
  enemyPower: number;           // 敌方综合评估分
}

// 魔物生态主要种类
export type MonsterEcologyType = 
  | 'slime'             // 史莱姆（果园/农场浅滩）
  | 'mimic'             // 拟态宝箱怪（密林深处/假宝箱）
  | 'giant_spider'      // 巨型洞穴捕鸟蛛（水井暗渠/矿坑）
  | 'owlbear'           // 穴居枭熊（黑松针叶林熊洞）
  | 'ogre'              // 食人魔蛮力士（山谷岩穴）
  | 'wyvern'            // 双足飞龙/翼手龙（雷鸣断崖）
  | 'clockwork_golem'   // 弹簧发条重装守卫（旧关隘武库机关）
  | 'beast_pack'        // 狼群/狂暴雪猿
  | 'goblin_troop';     // 矿洞赤耳哥布林

// 星级与 Rank 映射转换
export function rankToStars(rank: GuildContractRank): ContractDifficulty {
  switch (rank) {
    case 'S': return 5;
    case 'A': return 4;
    case 'B': return 3;
    case 'C': return 2;
    case 'D': return 1;
  }
}

export function starsToRank(stars: ContractDifficulty): GuildContractRank {
  switch (stars) {
    case 5: return 'S';
    case 4: return 'A';
    case 3: return 'B';
    case 2: return 'C';
    case 1: return 'D';
    default: return 'D';
  }
}
