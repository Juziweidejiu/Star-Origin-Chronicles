import type { Hero } from '../types/hero';
import { CLASS_CONFIG } from './heroFactory';

export interface CombatUnit {
  hero: Hero;
  side: 'player' | 'enemy';
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
  type: 'attack' | 'heal' | 'skill' | 'ult' | 'death';
}

export class CombatEngine {
  units: CombatUnit[] = [];
  logs: CombatLog[] = [];
  isFinished = false;
  winner: 'player' | 'enemy' | null = null;

  constructor(playerParty: Hero[], enemyParty: Hero[]) {
    this.units = [
      ...playerParty.map(h => ({
        hero: h,
        side: 'player' as const,
        currentHp: h.currentHp,
        maxHp: h.maxHp,
        resource: 0,
        isDead: false,
        actionCooldown: Math.random() * 0.8,
        autoUlt: true
      })),
      ...enemyParty.map(h => ({
        hero: h,
        side: 'enemy' as const,
        currentHp: h.currentHp,
        maxHp: h.maxHp,
        resource: 0,
        isDead: false,
        actionCooldown: Math.random() * 0.8,
        autoUlt: true
      }))
    ];
  }

  // 步进一个时间切片 (dt: 秒)
  tick(dt: number) {
    if (this.isFinished) return;

    for (const unit of this.units) {
      if (unit.isDead) continue;

      unit.actionCooldown -= dt;

      // 资源自然微量积攒
      if (unit.resource < 100) {
        unit.resource = Math.min(100, unit.resource + dt * 6);
      }

      // 如果自动大招开启且能量满了，立即施放大招
      if (unit.autoUlt && unit.resource >= 100) {
        this.triggerUltimate(unit);
      }

      // 普攻或战术技能动作
      if (unit.actionCooldown <= 0) {
        this.executeAction(unit);
        // 原版攻击间隔公式: (2.0 - speed * 0.04) * (1 - 0.02 * (decisions - 10))
        const speed = unit.hero.attributes.speed || 10;
        const decisions = unit.hero.attributes.decisions || 10;
        const interval = Math.max(0.8, Math.min(2.5, (2.0 - speed * 0.04) * (1 - 0.02 * (decisions - 10))));
        unit.actionCooldown = interval;
      }
    }

    this.checkEndCondition();
  }

  // 手动/自动触发终极技能 (Ultimate)
  triggerUltimate(unit: CombatUnit): boolean {
    if (unit.isDead || unit.resource < 100) return false;

    unit.resource = 0;
    const targets = this.units.filter(u => !u.isDead && u.side !== unit.side);
    const allies = this.units.filter(u => !u.isDead && u.side === unit.side);

    if (unit.hero.role === 'healer') {
      // 全体圣疗
      for (const ally of allies) {
        const heal = Math.round(unit.hero.attributes.healing * 4 + 30);
        ally.currentHp = Math.min(ally.maxHp, ally.currentHp + heal);
      }
      this.addLog(`✨ [${unit.hero.name}] 释放大招【群体治愈光环】！全队恢复生命！`, 'ult');
    } else if (unit.hero.role === 'tank') {
      // 破阵战吼 + 全体嘲讽
      this.addLog(`🛡️ [${unit.hero.name}] 释放大招【不动如山·嘲讽咆哮】！嘲讽所有敌人！`, 'ult');
      for (const t of targets) {
        const dmg = Math.round(unit.hero.attributes.power * 1.5 + 15);
        t.currentHp = Math.max(0, t.currentHp - dmg);
        if (t.currentHp <= 0) this.handleDeath(t);
      }
    } else {
      // 强袭绝杀
      const target = targets.sort((a, b) => a.currentHp - b.currentHp)[0];
      if (target) {
        const dmg = Math.round(unit.hero.attributes.power * 3.8 + 50);
        target.currentHp = Math.max(0, target.currentHp - dmg);
        this.addLog(`⚡ [${unit.hero.name}] 释放绝杀【破空斩】对 [${target.hero.name}] 造成 ${dmg} 点暴击伤害！`, 'ult');
        if (target.currentHp <= 0) this.handleDeath(target);
      }
    }
    return true;
  }

  private executeAction(unit: CombatUnit) {
    const enemies = this.units.filter(u => !u.isDead && u.side !== unit.side);
    const allies = this.units.filter(u => !u.isDead && u.side === unit.side);
    if (!enemies.length) return;

    const cfg = CLASS_CONFIG[unit.hero.classId];

    // 简单匹配 Gambit
    if (unit.hero.role === 'healer') {
      const lowestAlly = allies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
      if (lowestAlly && lowestAlly.currentHp < lowestAlly.maxHp) {
        const heal = Math.round(unit.hero.attributes.healing * 1.8 + 10);
        lowestAlly.currentHp = Math.min(lowestAlly.maxHp, lowestAlly.currentHp + heal);
        unit.resource = Math.min(100, unit.resource + 15);
        this.addLog(`💚 [${unit.hero.name}] 治疗 [${lowestAlly.hero.name}] +${heal} HP`, 'heal');
        return;
      }
    }

    // 默认攻击残血目标
    const target = enemies.sort((a, b) => a.currentHp - b.currentHp)[0];
    if (target) {
      // 原版普攻伤害基础公式
      const pAttr = unit.hero.attributes.weaponSkill || 10;
      const sAttr = unit.hero.attributes.power || 10;
      const rawDmg = Math.round((pAttr * 0.72 + sAttr * 0.28) * 1.1 * cfg.dmgMod * (unit.side === 'player' ? 1.0 : 0.85));
      const mit = (target.hero.attributes.mitigation || 5) * 0.6;
      const dmg = Math.max(3, Math.round(rawDmg * (1 - mit / 100)));

      target.currentHp = Math.max(0, target.currentHp - dmg);
      unit.resource = Math.min(100, unit.resource + 12);

      this.addLog(`⚔️ [${unit.hero.name}] 命中 [${target.hero.name}] -${dmg} HP`, 'attack');

      if (target.currentHp <= 0) {
        this.handleDeath(target);
      }
    }
  }

  private handleDeath(unit: CombatUnit) {
    unit.isDead = true;
    this.addLog(`💀 [${unit.hero.name}] 倒下了！`, 'death');
  }

  private checkEndCondition() {
    const alivePlayers = this.units.filter(u => !u.isDead && u.side === 'player');
    const aliveEnemies = this.units.filter(u => !u.isDead && u.side === 'enemy');

    if (!alivePlayers.length) {
      this.isFinished = true;
      this.winner = 'enemy';
      this.addLog(`🚩 佣兵团战败溃退！`, 'death');
    } else if (!aliveEnemies.length) {
      this.isFinished = true;
      this.winner = 'player';
      this.addLog(`🏆 战斗胜利！敌人被全歼！`, 'skill');
    }
  }

  private addLog(text: string, type: CombatLog['type']) {
    this.logs.unshift({
      id: Math.random().toString(36).slice(2, 7),
      timestamp: Date.now(),
      text,
      type
    });
    if (this.logs.length > 50) this.logs.pop();
  }
}
