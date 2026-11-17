/**
 * 实时战斗引擎
 * 伤害体系：物攻/法攻 -> 对应防御减伤（护甲公式）-> 穿透 -> 暴击
 * 战术阵型：前排/中排/后排仇恨权重、前排近战阻挡、战位属性修正
 */

import type { Hero, ResolvedStats } from '../types/hero';
import type { GridSlotId, GridColumn } from '../types/formation';
import { GRID_SLOTS } from '../types/formation';
import { getPositionCombatModifier } from './formationEngine';
import { DAMAGE_TYPE, resolveStats } from './statResolver';
import type { CombatFxEvent } from '../types/combatVisual';

export interface CombatUnit {
  hero: Hero;
  side: 'player' | 'enemy';
  slotId: GridSlotId;     // 所在 3x3 网格槽位
  col: GridColumn;        // 前排 / 中排 / 后排
  threatMult: number;     // 仇恨倍率 (前排 4.5, 中排 1.2, 后排 0.55)
  stats: ResolvedStats;
  currentHp: number;
  maxHp: number;
  resource: number;       // 0 - 100
  isDead: boolean;
  actionCooldown: number; // 剩余冷却时间（秒）
  autoUlt: boolean;       // 是否自动释放大招
}

export interface CombatLog {
  id: string;
  timestamp: number;
  text: string;
  type: 'attack' | 'heal' | 'skill' | 'ult' | 'death' | 'crit' | 'block';
}

/** 护甲减伤：AR/(AR+80)，上限 75% */
export function mitigationRate(defense: number, penetration: number): number {
  const effective = Math.max(0, defense - penetration);
  return Math.min(0.75, effective / (effective + 80));
}

import { assignEnemyFormation } from '../types/enemyFormation';

export class CombatEngine {
  units: CombatUnit[] = [];
  logs: CombatLog[] = [];
  isFinished = false;
  winner: 'player' | 'enemy' | null = null;
  focusedTargetId: string | null = null; // 玩家手动集火标记
  onCombatFx?: (event: CombatFxEvent) => void; // 动效回调钩子

  constructor(
    playerParty: Hero[],
    enemyParty: Hero[],
    playerSlotMap: Record<string, GridSlotId> = {},
    enemySlotMap?: Record<string, GridSlotId>
  ) {
    const finalEnemySlotMap = enemySlotMap || assignEnemyFormation(enemyParty);

    // 玩家方：根据阵型槽位设定列与修正
    const makePlayer = (h: Hero): CombatUnit => {
      const stats = resolveStats(h);
      const slotId = playerSlotMap[h.id] || (h.role === 'tank' ? 'front_center' : h.role === 'healer' ? 'back_center' : 'mid_center');
      const slotMeta = GRID_SLOTS.find(s => s.id === slotId);
      const col = slotMeta ? slotMeta.col : (h.role === 'tank' ? 'front' : h.role === 'healer' ? 'back' : 'mid');
      const mod = getPositionCombatModifier(col);

      // 阵型站位带来的属性微调 (前排减伤、后排输出/治疗增益、中排暴击)
      const adjustedStats: ResolvedStats = {
        ...stats,
        critChance: Math.min(0.75, stats.critChance + mod.critBonus),
        healingPower: Math.round(stats.healingPower * (1 + mod.healingDealtMod)),
      };

      return {
        hero: h,
        side: 'player',
        slotId,
        col,
        threatMult: mod.threatMultiplier,
        stats: adjustedStats,
        currentHp: Math.min(h.currentHp > 0 ? h.currentHp : adjustedStats.maxHp, adjustedStats.maxHp),
        maxHp: adjustedStats.maxHp,
        resource: 0,
        isDead: false,
        actionCooldown: 0.3 + Math.random() * 0.6,
        autoUlt: true,
      };
    };

    // 敌方：基于 3x3 网格槽位生成真实站位
    const makeEnemy = (h: Hero, idx: number): CombatUnit => {
      const stats = resolveStats(h);
      const slotId = finalEnemySlotMap[h.id] || (idx === 0 ? 'front_center' : 'mid_center');
      const slotMeta = GRID_SLOTS.find(s => s.id === slotId);
      const col = slotMeta ? slotMeta.col : 'mid';
      const mod = getPositionCombatModifier(col);

      return {
        hero: h,
        side: 'enemy',
        slotId,
        col,
        threatMult: mod.threatMultiplier,
        stats,
        currentHp: Math.min(h.currentHp > 0 ? h.currentHp : stats.maxHp, stats.maxHp),
        maxHp: stats.maxHp,
        resource: 0,
        isDead: false,
        actionCooldown: 0.3 + Math.random() * 0.6,
        autoUlt: true,
      };
    };

    this.units = [
      ...playerParty.map(h => makePlayer(h)),
      ...enemyParty.map((h, idx) => makeEnemy(h, idx)),
    ];
  }

  // 步进一个时间切片 (dt: 秒)
  tick(dt: number) {
    if (this.isFinished) return;

    for (const unit of this.units) {
      if (unit.isDead) continue;

      unit.actionCooldown -= dt;

      if (unit.resource < 100) {
        unit.resource = Math.min(100, unit.resource + dt * 6);
      }

      if (unit.autoUlt && unit.resource >= 100) {
        this.triggerUltimate(unit);
      }

      if (unit.actionCooldown <= 0) {
        this.executeAction(unit);
        unit.actionCooldown = unit.stats.attackInterval;
      }
    }

    this.checkEndCondition();
  }

  // 手动/自动触发终极技能
  triggerUltimate(unit: CombatUnit): boolean {
    if (unit.isDead || unit.resource < 100) return false;

    unit.resource = 0;
    const targets = this.units.filter(u => !u.isDead && u.side !== unit.side);
    const allies = this.units.filter(u => !u.isDead && u.side === unit.side);

    if (unit.hero.role === 'healer') {
      const heal = Math.round(unit.stats.healingPower * 1.8 + 20);
      for (const ally of allies) {
        ally.currentHp = Math.min(ally.maxHp, ally.currentHp + heal);
        this.onCombatFx?.({ type: 'heal', sourceId: unit.hero.id, targetId: ally.hero.id, value: heal, label: `+${heal}` });
      }
      this.onCombatFx?.({ type: 'ult_burst', sourceId: unit.hero.id, label: '回春圣域' });
      this.addLog(`✨ [${unit.hero.name}] 释放【回春圣域】，全队恢复 ${heal} 生命！`, 'ult');
    } else if (unit.hero.role === 'tank') {
      this.addLog(`🛡️ [${unit.hero.name}] 释放【不动如山·战吼】，震慑全场并吸引仇恨！`, 'ult');
      this.onCombatFx?.({ type: 'ult_burst', sourceId: unit.hero.id, label: '不动如山·战吼' });
      this.onCombatFx?.({ type: 'crit_shake' });
      unit.threatMult *= 1.5; // 战吼大幅提升嘲讽仇恨
      for (const t of targets) {
        const dmg = Math.max(1, Math.round(this.attackPower(unit) * 1.0));
        this.applyDamage(t, dmg, false, unit.hero.id);
        this.addLog(`💥 [${t.hero.name}] 被战吼冲击 -${dmg} HP`, 'skill');
      }
    } else {
      // 输出终极技能：优先针对敌方前排突破，或者如果能斩杀则点杀残血
      const target = this.selectAttackTarget(unit, targets, true);
      if (target) {
        const { dmg, crit } = this.rollDamage(unit, target, 3.0);
        this.onCombatFx?.({ type: 'ult_burst', sourceId: unit.hero.id, targetId: target.hero.id, value: dmg, label: '破空斩' });
        this.applyDamage(target, dmg, crit, unit.hero.id);
        this.addLog(
          `⚡ [${unit.hero.name}] 释放绝杀【破空斩】对 [${target.hero.name}] 造成 ${dmg} 点${crit ? '暴击' : ''}伤害！`,
          'ult',
        );
      }
    }
    return true;
  }

  private attackPower(unit: CombatUnit): number {
    return DAMAGE_TYPE[unit.hero.classId] === 'magic' ? unit.stats.ap : unit.stats.ad;
  }

  /**
   * 战术寻敌算法：
   * 1. 若敌方有前排存活：近战单位必须优先攻击前排（前排阻挡掩护后排）
   * 2. 远程物理（游侠）与法术（奥术师）：可跨越前排，通过仇恨与血量权重精准狙击
   * 3. 仇恨权重筛选（加权随机 + 残血吸引）
   */
  private selectAttackTarget(
    attacker: CombatUnit,
    candidates: CombatUnit[],
    isUlt = false
  ): CombatUnit | null {
    if (candidates.length === 0) return null;

    const isRanged = attacker.hero.classId === 'ranger' || DAMAGE_TYPE[attacker.hero.classId] === 'magic';
    const frontRow = candidates.filter(u => u.col === 'front');

    let eligible = candidates;
    // 近战普通攻击：前排只要有人，就受到防线阻挡，无法直击后排
    if (!isRanged && !isUlt && frontRow.length > 0) {
      eligible = frontRow;
    }

    // 玩家集火标记优先：若目标在合法攻击列表中，且集火目标存活，优先锁定
    if (attacker.side === 'player' && this.focusedTargetId) {
      const focused = eligible.find(u => u.hero.id === this.focusedTargetId);
      if (focused) return focused;
    }

    // 综合评分：仇恨倍率 (threatMult) * 伤残加成 (越残血仇恨略高) * 随机浮动
    let bestTarget = eligible[0];
    let highestScore = -1;

    for (const target of eligible) {
      const hpPercent = target.currentHp / target.maxHp;
      // 残血吸引系数：低于 40% 血量时容易被盯上 (最多 1.4x)
      const lowHpFactor = hpPercent < 0.4 ? 1.4 : (1.8 - hpPercent);
      const score = (target.threatMult * 10) * lowHpFactor * (0.85 + Math.random() * 0.3);

      if (score > highestScore) {
        highestScore = score;
        bestTarget = target;
      }
    }

    return bestTarget;
  }

  /** 计算一次攻击：伤害浮动 ±8%，暴击，防御穿透，站位承伤/输出修正 */
  private rollDamage(attacker: CombatUnit, defender: CombatUnit, mult = 1): { dmg: number; crit: boolean } {
    const isMagic = DAMAGE_TYPE[attacker.hero.classId] === 'magic';
    const power = isMagic ? attacker.stats.ap : attacker.stats.ad;
    const crit = Math.random() < attacker.stats.critChance;
    const variance = 0.92 + Math.random() * 0.16;

    const defense = isMagic ? defender.stats.magicResist : defender.stats.armor;
    const reduction = mitigationRate(defense, attacker.stats.penetration);

    // 站位承伤与输出修正
    const attackerColMod = getPositionCombatModifier(attacker.col);
    const defenderColMod = getPositionCombatModifier(defender.col);

    let raw = power * mult * variance
      * (crit ? attacker.stats.critDamage : 1)
      * (1 - reduction)
      * (1 + attackerColMod.damageDealtMod)
      * (1 + defenderColMod.damageTakenMod);

    // 敌方微调 -8%，给玩家稳定的操作空间
    if (attacker.side === 'enemy') raw *= 0.92;

    return { dmg: Math.max(1, Math.round(raw)), crit };
  }

  private applyDamage(target: CombatUnit, dmg: number, crit: boolean, sourceId?: string) {
    target.currentHp = Math.max(0, target.currentHp - dmg);
    if (crit) {
      this.addLog(`💢 暴击！[${target.hero.name}] -${dmg} HP`, 'crit');
      this.onCombatFx?.({ type: 'crit_shake' });
      this.onCombatFx?.({ type: 'hit', sourceId, targetId: target.hero.id, value: dmg, label: `CRIT! -${dmg}` });
    } else {
      this.onCombatFx?.({ type: 'hit', sourceId, targetId: target.hero.id, value: dmg, label: `-${dmg}` });
    }
    if (target.currentHp <= 0) this.handleDeath(target);
  }

  private executeAction(unit: CombatUnit) {
    const enemies = this.units.filter(u => !u.isDead && u.side !== unit.side);
    const allies = this.units.filter(u => !u.isDead && u.side === unit.side);
    if (!enemies.length) return;

    if (unit.hero.role === 'healer') {
      const lowestAlly = allies.slice().sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
      if (lowestAlly && lowestAlly.currentHp < lowestAlly.maxHp * 0.92) {
        const heal = Math.round(unit.stats.healingPower * (0.9 + Math.random() * 0.2));
        lowestAlly.currentHp = Math.min(lowestAlly.maxHp, lowestAlly.currentHp + heal);
        unit.resource = Math.min(100, unit.resource + 15);
        this.onCombatFx?.({ type: 'heal', sourceId: unit.hero.id, targetId: lowestAlly.hero.id, value: heal, label: `+${heal}` });
        this.addLog(`💚 [${unit.hero.name}] 治疗 [${lowestAlly.hero.name}] +${heal} HP`, 'heal');
        return;
      }
    }

    // 阵型战术寻敌
    const target = this.selectAttackTarget(unit, enemies);
    if (!target) return;

    const isMagic = DAMAGE_TYPE[unit.hero.classId] === 'magic';
    const { dmg, crit } = this.rollDamage(unit, target, 1.0);
    this.applyDamage(target, dmg, crit, unit.hero.id);
    unit.resource = Math.min(100, unit.resource + 12);

    if (!crit) {
      const positionLabel = target.col === 'front' ? '前线' : target.col === 'mid' ? '中排' : '后方';
      this.addLog(
        `${isMagic ? '🔮' : '⚔️'} [${unit.hero.name}] 击中${positionLabel} [${target.hero.name}] -${dmg} HP`,
        'attack',
      );
    }
  }

  private handleDeath(unit: CombatUnit) {
    unit.isDead = true;
    this.addLog(`💀 [${unit.hero.name}] 倒下了！`, 'death');
  }

  private checkEndCondition() {
    const alivePlayers = this.units.filter(u => !u.isDead && u.side === 'player');
    const aliveEnemies = this.units.filter(u => !u.isDead && u.side === 'enemy');

    if (aliveEnemies.length === 0) {
      this.isFinished = true;
      this.winner = 'player';
      this.addLog('🏆 战斗胜利！敌人全军覆没。', 'skill');
    } else if (alivePlayers.length === 0) {
      this.isFinished = true;
      this.winner = 'enemy';
      this.addLog('☠️ 团灭败北…全体探险者溃退！', 'death');
    }
  }

  getAliveUnits(side: 'player' | 'enemy'): CombatUnit[] {
    return this.units.filter(u => !u.isDead && u.side === side);
  }

  private addLog(text: string, type: CombatLog['type']) {
    this.logs.unshift({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      text,
      type,
    });
    if (this.logs.length > 50) this.logs.pop();
  }
}
