import { describe, expect, it } from 'vitest';
import type { Equipment } from '../../types/hero';
import {
  BLUEPRINTS,
  BLUEPRINT_MAP,
  emptyMaterials,
  type Blueprint,
} from '../blueprintData';
import {
  BOSS_MARKUP,
  DEFAULT_SETTINGS,
  PHASE_ROUNDS,
  PROF_MAX_XP,
  PROF_STEP,
  QUALITY_MAX,
  QUALITY_MIN,
  addMaterials,
  bossQuality,
  canPay,
  craftBeat,
  craftGoldCost,
  craftMaterialCost,
  formatAffixValue,
  judgeBeat,
  payMaterials,
  professionBar,
  professionGain,
  professionLevel,
  professionMods,
  rarityOfQuality,
  rollCraftDrop,
  salvageMaterials,
  settleCraft,
  startCraft,
  unlockByProgress,
  withXp,
  xpOf,
  type CraftSession,
  type CraftSettings,
} from '../craftEngine';

const bp = (id: string): Blueprint => {
  const found = BLUEPRINT_MAP[id];
  if (!found) throw new Error(`missing blueprint ${id}`);
  return found;
};

/** 固定序列随机源，用尽后从头循环 */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const makeSession = (overrides: Partial<CraftSession> = {}): CraftSession => ({
  blueprintId: 'bp_steel_sword',
  tier: 2,
  settings: DEFAULT_SETTINGS,
  phase: 'heat',
  step: 0,
  zoneCenter: 50,
  zoneWidth: 20,
  speed: 1,
  quality: 0.9,
  perfectHeat: 0,
  perfectHammer: 0,
  quench: null,
  finished: false,
  ...overrides,
});

const settings = (overrides: Partial<CraftSettings> = {}): CraftSettings => ({ ...DEFAULT_SETTINGS, ...overrides });

describe('备料与工钱', () => {
  it('基础料按档位放大，精煤不超过 3，辅料各一件', () => {
    const light = craftMaterialCost(bp('bp_steel_sword'), settings({ grade: 1, coal: 0 }));
    const heavy = craftMaterialCost(bp('bp_steel_sword'), settings({ grade: 3, coal: 3, oil: true, sand: true }));
    expect(light.iron).toBe(6);
    expect(heavy.iron).toBe(18);
    expect(heavy.coal).toBe(3);
    expect(heavy.oil).toBe(1);
    expect(heavy.sand).toBe(1);
    expect(craftMaterialCost(bp('bp_steel_sword'), settings({ coal: 9 })).coal).toBe(3);
  });

  it('工钱随品阶上涨，老板代打加价', () => {
    expect(craftGoldCost(bp('bp_steel_sword'))).toBe(140);
    expect(craftGoldCost(bp('bp_steel_sword'), 1, true)).toBe(Math.round(140 * BOSS_MARKUP));
    expect(craftGoldCost(bp('bp_star_ring'))).toBeGreaterThan(craftGoldCost(bp('bp_steel_sword')));
  });

  it('材料不足时无法支付，支付后不会赊账', () => {
    const bag = emptyMaterials();
    bag.iron = 4;
    const cost = craftMaterialCost(bp('bp_steel_sword'), settings({ grade: 1, coal: 0 }));
    expect(canPay(bag, cost)).toBe(false);
    expect(canPay({ ...bag, iron: 6 }, cost)).toBe(true);
    const paid = payMaterials({ ...bag, iron: 6 }, cost);
    expect(paid.iron).toBe(0);
  });

  it('回收材料不会把背包减成负数', () => {
    const bag = addMaterials(emptyMaterials(), { iron: 5 });
    expect(addMaterials(bag, { iron: -9 }).iron).toBe(0);
  });
});

describe('熟练度', () => {
  it('等级按每 150 经验一档，封顶 5 级', () => {
    expect(professionLevel(0)).toBe(1);
    expect(professionLevel(PROF_STEP - 1)).toBe(1);
    expect(professionLevel(PROF_STEP)).toBe(2);
    expect(professionLevel(PROF_MAX_XP)).toBe(5);
    expect(professionLevel(99999)).toBe(5);
    expect(professionBar(380)).toMatchObject({ level: 3, current: 80 });
  });

  it('满级才把命中区和完美判定拉到最大', () => {
    const low = professionMods(0);
    const high = professionMods(PROF_MAX_XP);
    expect(low).toMatchObject({ level: 1, speed: 1, win: 1, perfect: 0.18 });
    expect(high.win).toBeGreaterThan(low.win);
    expect(high.speed).toBeLessThan(low.speed);
    expect(high.perfect).toBeGreaterThan(low.perfect);
  });

  it('同一张图纸刷到第 10 件后收益减半，第 20 件后归零', () => {
    const base = professionGain(1.1, 4, 0);
    expect(base).toBeGreaterThan(0);
    expect(professionGain(1.1, 4, 9)).toBe(base);
    expect(professionGain(1.1, 4, 10)).toBe(34);
    expect(professionGain(1.1, 4, 19)).toBe(34);
    expect(professionGain(1.1, 4, 20)).toBe(0);
  });

  it('写入经验时会封顶', () => {
    const progress = withXp({ materials: emptyMaterials(), unlocked: [], xp: {}, counts: {} }, 2, 9999);
    expect(xpOf(progress, 2)).toBe(PROF_MAX_XP);
  });
});

describe('锻造状态机', () => {
  it('淬火油抬高起步品质，熟练度只影响难度不影响起始值', () => {
    const plain = startCraft(bp('bp_steel_sword'), settings(), 0, seq(0.5));
    const oiled = startCraft(bp('bp_steel_sword'), settings({ oil: true }), PROF_MAX_XP, seq(0.5));
    expect(plain.quality).toBeCloseTo(0.87, 3);
    expect(oiled.quality).toBeCloseTo(0.98, 3);
    expect(oiled.quality).toBeGreaterThan(plain.quality);
  });

  it('判定：中心完美、半区良好、区外失手', () => {
    const mods = professionMods(0);
    const session = makeSession({ zoneCenter: 50, zoneWidth: 20 });
    expect(judgeBeat(session, 50, mods)).toBe('perfect');
    expect(judgeBeat(session, 58, mods)).toBe('good');
    expect(judgeBeat(session, 70, mods)).toBe('miss');
  });

  it('淬火按偏差分完美/偏早偏晚/失手，阶段结束即成品', () => {
    const mods = professionMods(0);
    const quench = makeSession({ phase: 'quench', step: 0 });
    expect(judgeBeat(quench, 50, mods)).toBe('perfect');
    expect(judgeBeat(quench, 44, mods)).toBe('good');

    const done = craftBeat(quench, 50, 0);
    expect(done.finished).toBe(true);
    expect(done.phase).toBe('quench');
    expect(done.session.quench).toBe('exact');
  });

  it('打满 5 次火候 + 4 次锻打 + 1 次淬火才结束', () => {
    let session = startCraft(bp('bp_steel_sword'), settings(), 0, seq(0.5));
    let beats = 0;
    while (!session.finished) {
      const outcome = craftBeat(session, session.zoneCenter, 0, seq(0.5));
      session = outcome.session;
      beats += 1;
      expect(beats).toBeLessThanOrEqual(10);
    }
    expect(beats).toBe(PHASE_ROUNDS.heat + PHASE_ROUNDS.hammer + PHASE_ROUNDS.quench);
    expect(session.perfectHeat).toBe(PHASE_ROUNDS.heat);
    expect(session.perfectHammer).toBe(PHASE_ROUNDS.hammer);
    expect(session.quality).toBeGreaterThan(1.1);
  });

  it('品质不会被失手打到下限以下，也不会超过上限', () => {
    let session = makeSession({ quality: 0.84 });
    for (let i = 0; i < 5; i += 1) {
      session = craftBeat(session, 0, 0, seq(0.5)).session;
    }
    expect(session.quality).toBe(QUALITY_MIN);

    const capped = craftBeat(makeSession({ quality: QUALITY_MAX, phase: 'quench' }), 50, 0, seq(0.5));
    expect(capped.session.quality).toBe(QUALITY_MAX);
  });
});

describe('成品结算', () => {
  it('品质分档：0.82 起算，1.30 封顶', () => {
    expect(rarityOfQuality(0.82)).toBe('common');
    expect(rarityOfQuality(0.95)).toBe('uncommon');
    expect(rarityOfQuality(1.05)).toBe('rare');
    expect(rarityOfQuality(1.16)).toBe('epic');
    expect(rarityOfQuality(1.26)).toBe('legendary');
  });

  it('普通品质没有词条，史诗最多三条', () => {
    const common = settleCraft(makeSession({ quality: 0.83, finished: true }), bp('bp_steel_sword'), 'c1', seq(0.5));
    expect(common.rarity).toBe('common');
    expect(common.affixes).toHaveLength(0);
    expect(common.affixText).toBeUndefined();

    const epic = settleCraft(makeSession({ quality: 1.16, finished: true }), bp('bp_steel_sword'), 'c2', seq(0.5));
    expect(epic.rarity).toBe('epic');
    expect(epic.affixes.length).toBeGreaterThanOrEqual(1);
    expect(epic.affixes.length).toBeLessThanOrEqual(3);
  });

  it('词条数量由完美次数与星陨砂决定，但不超过品阶上限', () => {
    const perfect = makeSession({
      quality: 1.26,
      perfectHeat: 5,
      perfectHammer: 4,
      settings: settings({ sand: true }),
      finished: true,
    });
    const withSand = settleCraft(perfect, bp('bp_steel_sword'), 'a', seq(0.5));
    expect(withSand.rarity).toBe('legendary');
    expect(withSand.affixes).toHaveLength(4);

    const noBonus = settleCraft(
      makeSession({ quality: 1.26, finished: true }),
      bp('bp_steel_sword'),
      'b',
      seq(0.5),
    );
    expect(noBonus.affixes).toHaveLength(1);
  });

  it('成品带打造标记与图纸来源，名字带品阶前缀', () => {
    const item = settleCraft(makeSession({ quality: 1.05, finished: true }), bp('bp_steel_sword'), 'x', seq(0.5));
    expect(item.crafted).toBe(true);
    expect(item.blueprintId).toBe('bp_steel_sword');
    expect(item.name).toContain(bp('bp_steel_sword').name);
    expect(item.affixText?.length ?? 0).toBeGreaterThan(0);
  });

  it('老板代打品质锁在 1.00-1.06', () => {
    expect(bossQuality(() => 0)).toBe(1);
    expect(bossQuality(() => 0.999)).toBeCloseTo(1.06, 2);
  });

  it('词条数值按百分比 / 定值分别格式化', () => {
    expect(formatAffixValue({ stat: 'critChance', kind: 'percent', value: 0.045, label: '暴击' })).toBe('+5%');
    expect(formatAffixValue({ stat: 'maxHp', kind: 'flat', value: 35, label: '生命' })).toBe('+35');
    expect(formatAffixValue({ stat: 'ad', kind: 'flat', value: 7, label: '物攻' })).toBe('+7');
  });
});

describe('掉落与解锁', () => {
  it('分解按部位回收基础料', () => {
    const weapon = { slot: 'weapon', rarity: 'rare', tier: 3 } as Equipment;
    const armor = { slot: 'armor', rarity: 'rare', tier: 3 } as Equipment;
    const trinket = { slot: 'trinket', rarity: 'epic', tier: 4 } as Equipment;
    expect(salvageMaterials(weapon).iron).toBeGreaterThan(0);
    expect(salvageMaterials(weapon).wood).toBeGreaterThan(0);
    expect(salvageMaterials(armor).leather).toBeGreaterThan(0);
    expect(salvageMaterials(trinket).jade).toBeGreaterThan(0);
    expect(salvageMaterials(trinket).sand).toBe(1);
  });

  it('只掉未解锁的图纸，已集齐时改给辅料', () => {
    const all = BLUEPRINTS.map(item => item.id);
    const empty = rollCraftDrop(5, [], BLUEPRINTS, true, seq(0, 0, 0));
    expect(empty.blueprintId).toBeTruthy();
    expect(all).toContain(empty.blueprintId);

    const none = rollCraftDrop(5, all, BLUEPRINTS, true, () => 0.1);
    expect(none.blueprintId).toBeUndefined();
    expect(none.materials.sand ?? none.materials.oil).toBe(1);
  });

  it('低星地牢不会掉高阶图纸', () => {
    const drop = rollCraftDrop(1, [], BLUEPRINTS, false, seq(0, 0, 0));
    if (drop.blueprintId) {
      const found = bp(drop.blueprintId);
      expect(found.source).toBe('dungeon');
      expect(found.stars ?? 1).toBeLessThanOrEqual(1);
    }
  });

  it('声望与五星首通按门槛解锁', () => {
    const repLow = unlockByProgress(BLUEPRINTS, [], { reputation: 0, clearedStars: 0 });
    expect(repLow).not.toContain('bp_jade_pendant');
    const repHigh = unlockByProgress(BLUEPRINTS, [], { reputation: 60, clearedStars: 5 });
    expect(repHigh).toContain('bp_jade_pendant');
    expect(repHigh).toContain('bp_star_ring');
  });
});
