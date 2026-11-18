import { describe, expect, it } from 'vitest';
import type { Hero } from '../../types/hero';
import {
  MAX_HERO_LEVEL,
  levelForXp,
  levelSuppressionMultiplier,
  recommendedLevelForStars,
  xpTotalForLevel,
} from '../progressionEngine';

/** 只要等级与经验两个字段，其余属性与本文件无关 */
const fakeHero = (experience: number, level: number) => ({ experience, level }) as Hero;

describe('经验曲线', () => {
  it('升级阈值符合 0.9x² + 6x 的二次曲线', () => {
    expect(xpTotalForLevel(1)).toBe(0);
    expect(xpTotalForLevel(2)).toBe(7);
    expect(xpTotalForLevel(3)).toBe(16);
    expect(xpTotalForLevel(4)).toBe(27);
    expect(xpTotalForLevel(5)).toBe(39);
    expect(xpTotalForLevel(10)).toBe(127);
    expect(xpTotalForLevel(20)).toBe(439);
  });

  it('阈值随等级严格递增', () => {
    for (let level = 2; level <= MAX_HERO_LEVEL; level++) {
      expect(xpTotalForLevel(level)).toBeGreaterThan(xpTotalForLevel(level - 1));
    }
  });

  it('levelForXp 是 xpTotalForLevel 的逆函数', () => {
    for (let level = 1; level <= MAX_HERO_LEVEL; level++) {
      expect(levelForXp(xpTotalForLevel(level))).toBe(level);
    }
    // 差一点不到阈值时仍停在原等级
    expect(levelForXp(xpTotalForLevel(5) - 1)).toBe(4);
  });

  it('经验不足 / 超出上限时收敛到 1..20', () => {
    expect(levelForXp(-100)).toBe(1);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(999999)).toBe(MAX_HERO_LEVEL);
  });

  it('negative 经验不会把等级算成非整数', () => {
    expect(Number.isInteger(levelForXp(-1))).toBe(true);
  });

  it('属性成长不会越界读等级', () => {
    expect(levelForXp(xpTotalForLevel(20) + 5000)).toBe(20);
    expect(fakeHero(0, 1).level).toBe(1);
  });
});

describe('等级压制', () => {
  it('同级互相无修正', () => {
    expect(levelSuppressionMultiplier(10, 10)).toBeCloseTo(1, 5);
  });

  it('等级劣势被压到下限 0.85，优势封顶 1.15', () => {
    expect(levelSuppressionMultiplier(1, 20)).toBe(0.85);
    expect(levelSuppressionMultiplier(20, 1)).toBe(1.15);
  });

  it('每差一级修正 2%，且夹在 [0.85, 1.15] 之间', () => {
    expect(levelSuppressionMultiplier(10, 8)).toBeCloseTo(1.04, 5);
    expect(levelSuppressionMultiplier(8, 10)).toBeCloseTo(0.96, 5);
  });
});

describe('推荐等级', () => {
  it('星级越高推荐等级越高，并夹在 1..20', () => {
    expect(recommendedLevelForStars(1)).toBe(3);
    expect(recommendedLevelForStars(3)).toBe(7);
    expect(recommendedLevelForStars(5)).toBe(11);
    // 0 星视为无效输入，按 1 星兜底（实现里 `stars || 1`），故与 1 星同值
    expect(recommendedLevelForStars(0)).toBe(recommendedLevelForStars(1));
    expect(recommendedLevelForStars(99)).toBe(MAX_HERO_LEVEL);
  });
});
