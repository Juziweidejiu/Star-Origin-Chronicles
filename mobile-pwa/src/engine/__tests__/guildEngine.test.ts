import { describe, expect, it } from 'vitest';
import { generateHero } from '../heroFactory';
import { estimateContractOdds } from '../guildEngine';
import type { GuildContract } from '../../types/world';
import type { Hero } from '../../types/hero';

function makeParty(size = 4): Hero[] {
  const classes = ['blademaster', 'guardian', 'cleric', 'ranger'] as const;
  return Array.from({ length: size }, (_, i) => generateHero(classes[i % classes.length], i === 0));
}

/** 只构造胜率计算真正读到的字段，其余用可选字段补齐 */
function makeContract(stars: number): GuildContract {
  return {
    id: `test_${stars}`,
    title: `测试契约 ${stars} 星`,
    description: '测试用契约',
    stars,
    enemyLevel: stars,
    enemyClasses: ['guardian', 'blademaster', 'ranger'],
    goldReward: 100,
    reputationReward: 5,
    durationDays: 2,
  } as GuildContract;
}

describe('guildEngine.estimateContractOdds', () => {
  it('胜率始终夹在 5..95 之间', () => {
    const party = makeParty();
    for (let stars = 1; stars <= 5; stars++) {
      const odds = estimateContractOdds(party, makeContract(stars));
      expect(odds.winRate).toBeGreaterThanOrEqual(5);
      expect(odds.winRate).toBeLessThanOrEqual(95);
    }
  });

  it('星级越高，胜率不升（更强敌人不该更容易）', () => {
    const party = makeParty();
    const rates = [1, 2, 3, 4, 5].map(s => estimateContractOdds(party, makeContract(s)).winRate);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThanOrEqual(rates[i - 1]);
    }
  });

  it('每次都给得出危险度标签与战术建议', () => {
    const party = makeParty();
    const odds = estimateContractOdds(party, makeContract(3));
    expect(['breeze', 'balanced', 'tough', 'perilous']).toContain(odds.dangerLevel);
    expect(odds.dangerLabel.length).toBeGreaterThan(0);
    expect(odds.dangerColor).toMatch(/^#/);
    expect(typeof odds.tacticTip).toBe('string');
  });

  it('战力数值都是有限正数', () => {
    const odds = estimateContractOdds(makeParty(), makeContract(2));
    expect(Number.isFinite(odds.partyPower)).toBe(true);
    expect(Number.isFinite(odds.enemyPower)).toBe(true);
    expect(odds.partyPower).toBeGreaterThan(0);
    expect(odds.enemyPower).toBeGreaterThan(0);
  });

  it('队伍越强胜率越高（同一份契约）', () => {
    const weak = estimateContractOdds(makeParty(2), makeContract(3));
    const strong = estimateContractOdds(makeParty(4), makeContract(3));
    expect(strong.winRate).toBeGreaterThanOrEqual(weak.winRate);
  });
});
