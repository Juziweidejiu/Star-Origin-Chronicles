/**
 * 公会任务板胜率评估与战术建议引擎 (Guild Board Odds Calculator)
 * 根据出战队伍实力与任务难度，计算胜率、危险度标签与战术贴士
 */

import type { Hero } from '../types/hero';
import type { ContractType, GuildContract } from '../types/world';
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

/** 按契约类型维护的战术贴士，与怪物显示名解耦 */
export const TACTIC_TIPS: Record<ContractType, string[]> = {
  slime_infestation: [
    '井下胶妖软韧抗劈砍，普通刀剑砍上去容易卸力，建议带上阵法或火器手从旁破防。',
    '老矿积水多、胶妖会缠住前排脚踝，前锋记得在营地抹好桐油，避免护甲吃瘪。',
  ],
  goblin_mine: [
    '矿坑山魈爱举木盾抱团，还带投石手躲在后排砸人，让游侠先点掉后排投石手最稳。',
    '山魈敲锣会引来矿道深处的帮手，前排尽量快刀压住阵脚，别拖太久。',
  ],
  bandit_camp: [
    '风口岭山贼懂阵型，寨门盾手死扛正面，后排火铳和弩手专点脆皮，阵型别把医官放太靠前。',
    '山贼放出的铁背山猪冲撞很猛，前锋站稳盾墙抗住第一波，再集火拆掉对面的输出手。',
  ],
  caravan_escort: [
    '官道劫匪和苇丛水匪最爱绕后偷袭，中排最好摆一个能兼顾保护的剑客或长枪手。',
    '水区泥龟硬壳难啃，别把主力输出全耗在前排龟壳上，找机会用高穿透兵刃开缝。',
  ],
  beast_hunt: [
    '毒斑巨蛙喷的瘴雾会持续掉血，进百草涧务必带上百草堂医官清创止毒。',
    '北松岭头狼和山牛皮糙肉厚、扑咬狠，出门前多备点磨刀石，把暴击与穿透拉起来再打。',
  ],
  ruins_cleansing: [
    '发条木甲卫和箱魅甲片极厚，建议给主力换上带“三棱透甲”或“重脊压锋”开光的兵器。',
    '旧垒深处独眼巨汉单下劈砍极疼，千万别带轻伤硬撑，伤重了先去汤泉镇泡汤养好再来。',
  ],
};

/** 同一契约类型的提示按任务 id 稳定轮换，避免每次打开面板都变 */
export function generateTacticTip(contractType: ContractType, seed = 0): string {
  const pool = TACTIC_TIPS[contractType] ?? TACTIC_TIPS.goblin_mine;
  return pool[Math.abs(seed) % pool.length];
}

function tacticSeed(contract: GuildContract): number {
  let hash = 0;
  for (const ch of contract.id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return hash;
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
    dangerLabel = '轻松碾压';
    dangerColor = '#22c55e';
  } else if (winRate >= 75) {
    dangerLevel = 'balanced';
    dangerLabel = '势均力敌';
    dangerColor = '#eab308';
  } else if (winRate >= 50) {
    dangerLevel = 'tough';
    dangerLabel = '苦战险胜';
    dangerColor = '#f97316';
  } else {
    dangerLevel = 'perilous';
    dangerLabel = '九死一生';
    dangerColor = '#ef4444';
  }
  
  const tacticTip = generateTacticTip(contract.type, tacticSeed(contract));
  
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
