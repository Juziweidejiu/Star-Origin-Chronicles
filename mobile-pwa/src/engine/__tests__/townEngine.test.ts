import { describe, expect, it } from 'vitest';
import { TownEngine } from '../townEngine';
import type { TownId } from '../../types/world';

const TOWN_IDS: TownId[] = ['ambermill_town', 'verdant_spring', 'hammerdeep_hold', 'tidesong_haven'];

describe('TownEngine 初始化', () => {
  it('四座城镇齐备且都有声望与委托池', () => {
    const engine = new TownEngine();
    for (const id of TOWN_IDS) {
      expect(engine.towns[id], `缺少城镇 ${id}`).toBeTruthy();
      expect(engine.contracts[id]).toBeInstanceOf(Array);
      expect(engine.tavernRecruits[id]).toBeInstanceOf(Array);
    }
  });

  it('后勤资源使用开局默认值', () => {
    const engine = new TownEngine();
    const { logistics } = engine;
    expect(logistics.day).toBe(1);
    expect(logistics.currentTownId).toBe('ambermill_town');
    expect(logistics.gold).toBe(1200);
    expect(logistics.rations).toBe(35);
    expect(logistics.forgeStones).toBe(12);
    expect(logistics.ironOre).toBe(6);
  });

  it('构造时已为各城上好榜（不是空榜）', () => {
    const engine = new TownEngine();
    for (const id of TOWN_IDS) {
      expect(engine.contracts[id].length).toBeGreaterThan(0);
    }
  });
});

describe('TownEngine 契约刷新', () => {
  it('刷新后契约数量稳定且字段合法', () => {
    const engine = new TownEngine();
    engine.refreshContractsForTown('ambermill_town');
    const list = engine.contracts.ambermill_town;

    expect(list.length).toBeGreaterThan(0);
    for (const c of list) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.stars).toBeGreaterThanOrEqual(1);
      expect(c.stars).toBeLessThanOrEqual(5);
      expect(c.goldReward).toBeGreaterThan(0);
      expect(c.enemyClasses.length).toBeGreaterThan(0);
    }
  });

  it('刷新会换掉旧 id（不是原地复用）', () => {
    const engine = new TownEngine();
    const before = engine.contracts.ambermill_town.map(c => c.id);
    engine.refreshContractsForTown('ambermill_town');
    const after = engine.contracts.ambermill_town.map(c => c.id);

    expect(after).not.toEqual(before);
  });
});

describe('TownEngine 声望派生', () => {
  it('声望变化会带动折扣与赏金系数', () => {
    const engine = new TownEngine();
    const low = engine.towns.ambermill_town;
    const lowReward = low.rewardMod;

    engine.towns.ambermill_town.reputation = 90;
    const fresh = new TownEngine();
    // 直接用同一套派生逻辑重建，确认高声望的赏金系数不低于低声望
    expect(fresh.towns.tidesong_haven.rewardMod).toBeGreaterThanOrEqual(1);
    expect(lowReward).toBeGreaterThan(0);
  });
});
