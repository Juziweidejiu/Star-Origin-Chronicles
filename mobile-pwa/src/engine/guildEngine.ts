/**
 * 公会任务板胜率评估与战术建议引擎 (Guild Board Odds Calculator)
 * 根据出战队伍实力与任务难度，计算胜率、危险度标签与战术贴士
 */

import type { Hero } from '../types/hero';
import type { GuildContract } from '../types/world';
import type { ContractOddsEstimate } from '../types/guild';
import { resolveStats } from './statResolver';
import { recommendedLevelForStars } from './progressionEngine';

/**
 * 计算队伍综合战力评分
 */
function calculatePartyPower(party: Hero[]): number {
  let totalPower = 0;
  
  for (const hero of party) {
    const stats = resolveStats(hero);
    
    // 综合评分：HP权重0.8 + 攻击权重1.2 + 防御权重1.0 + 暴击加成
    const offensivePower = (stats.ad + stats.ap) * 1.2;
    const defensivePower = (stats.armor + stats.magicResist) * 1.0;
    const hpPower = stats.maxHp * 0.8;
    const critBonus = stats.critChance * stats.critDamage * 50;
    // 攻速通过 attackInterval 反映，interval越小越快，这里简化为固定加成
    const speedBonus = (2.0 - stats.attackInterval) * 100;
    
    totalPower += offensivePower + defensivePower + hpPower + critBonus + speedBonus;
  }
  
  return Math.round(totalPower);
}

/**
 * 计算敌方战力评分（基于星级与职业编制）
 */
function calculateEnemyPower(contract: GuildContract): number {
  const stars = contract.stars;
  const enemyCount = stars === 5 ? 4 : 3; // 5星4敌，其余3敌
  
  // 基础战力：星级 * 敌人数量 * 基础系数
  const basePower = stars * enemyCount * 450;
  
  // Boss房额外战力
  const bossMult = 1.0; // 普通契约无boss加成
  
  return Math.round(basePower * bossMult);
}

/**
 * 根据目标魔物生态生成战术贴士
 */
function generateTacticTip(contract: GuildContract): string {
  const monsterType = contract.targetMonster || '';
  
  // 根据魔物类型给出针对性战术建议
  if (monsterType.includes('史莱姆')) {
    return '史莱姆物理免伤较高，建议优先使用法系远程职业破防！';
  } else if (monsterType.includes('拟态') || monsterType.includes('宝箱')) {
    return '拟态怪下颚护甲极硬，建议法系绕后或使用穿透属性武器！';
  } else if (monsterType.includes('蛛') || monsterType.includes('蜘蛛')) {
    return '巨型毒蛛会结网减速，建议游侠远程风筝或前排坚守防线！';
  } else if (monsterType.includes('枭熊')) {
    return '枭熊皮糙肉厚且狂暴，务必带足治疗并集火单体击破！';
  } else if (monsterType.includes('食人魔')) {
    return '食人魔力大无脑，保持阵型距离用远程消耗，切勿被近身！';
  } else if (monsterType.includes('飞龙') || monsterType.includes('翼')) {
    return '飞龙机动性极高，必须配置游侠/奥术师远程狙击能力！';
  } else if (monsterType.includes('发条') || monsterType.includes('守卫')) {
    return '发条傀儡无痛觉但抗物理，集中法系火力攻击机械关节！';
  } else if (monsterType.includes('哥布林')) {
    return '哥布林群体作战狡诈，注意暗箭陷阱，优先清理弓手！';
  } else if (monsterType.includes('劫匪') || monsterType.includes('盗')) {
    return '劫匪编制均衡，注意保护后排法师，前排坚守吸收火力！';
  } else {
    return '敌人编制未明，建议坦克守前线、治疗居中、远程输出后排！';
  }
}

/**
 * 评估任务胜率与危险度
 */
export function estimateContractOdds(
  party: Hero[],
  contract: GuildContract
): ContractOddsEstimate {
  const partyPower = calculatePartyPower(party);
  const enemyPower = calculateEnemyPower(contract);
  
  // 等级压制修正：队伍平均等级高于推荐等级则更有把握，反之越级作战风险上升
  const avgLevel = party.length > 0 ? party.reduce((sum, h) => sum + h.level, 0) / party.length : 1;
  const levelGap = avgLevel - recommendedLevelForStars(contract.stars);
  const levelFactor = Math.max(0.85, Math.min(1.15, 1 + levelGap * 0.03));
  const adjustedPartyPower = Math.round(partyPower * levelFactor);

  // 战力比值映射为胜率：开方压缩，避免高星契约一律显示“九死一生”
  const powerRatio = adjustedPartyPower / Math.max(enemyPower, 1);
  const winRate = Math.round(Math.min(95, Math.max(5, 100 * Math.pow(powerRatio, 0.55))));
  
  // 根据胜率判定危险等级
  let dangerLevel: 'breeze' | 'balanced' | 'tough' | 'perilous';
  let dangerLabel: string;
  let dangerColor: string;
  
  if (winRate >= 90) {
    dangerLevel = 'breeze';
    dangerLabel = '轻松碾压 🟢';
    dangerColor = '#22c55e';
  } else if (winRate >= 75) {
    dangerLevel = 'balanced';
    dangerLabel = '势均力敌 🟡';
    dangerColor = '#eab308';
  } else if (winRate >= 50) {
    dangerLevel = 'tough';
    dangerLabel = '苦战险胜 🟠';
    dangerColor = '#f97316';
  } else {
    dangerLevel = 'perilous';
    dangerLabel = '九死一生 🔴';
    dangerColor = '#ef4444';
  }
  
  const tacticTip = generateTacticTip(contract);
  
  return {
    winRate,
    dangerLevel,
    dangerLabel,
    dangerColor,
    tacticTip,
    partyPower: adjustedPartyPower,
    enemyPower
  };
}
