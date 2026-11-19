import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { TownEngine } from '../townEngine';
import type { Hero } from '../../types/hero';
import {
  BACKUP_KEY,
  SAVE_KEY,
  SAVE_MIGRATIONS,
  SAVE_VERSION,
  applyMigrations,
  clearSave,
  loadSave,
  readSave,
  resetSave,
  writeSave,
  type SavePayload,
  type SavePayloadRaw,
} from '../saveEngine';

/** 用内存实现顶替 localStorage：node 环境没有 window */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null; }
  key(index: number) { return [...this.map.keys()][index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
}

const memory = new MemoryStorage();

beforeAll(() => {
  // saveEngine 通过 window.localStorage 探测存储，这里补一个最小 window
  (globalThis as unknown as { window: unknown }).window = { localStorage: memory };
});

afterAll(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

const fakeHero = () => ({ id: 'h1', name: '沈素问', level: 3, experience: 16 }) as Hero;

function buildPayload(overrides: Partial<SavePayload> = {}): SavePayload {
  const engine = new TownEngine();
  return {
    town: {
      towns: engine.towns,
      logistics: engine.logistics,
      contracts: engine.contracts,
      tavernRecruits: engine.tavernRecruits,
      fallenSouls: engine.fallenSouls,
    },
    roster: [fakeHero()],
    deployedHeroIds: ['h1'],
    formationPreset: 'shield_wall',
    formationAssignments: [{ heroId: 'h1', slotId: 'front_center' }],
    inventory: [],
    dungeon: null,
    ...overrides,
  };
}

describe('存档读写', () => {
  it('写入后能原样读回', () => {
    clearSave();
    expect(writeSave(buildPayload())).toBe(true);

    const loaded = loadSave();
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SAVE_VERSION);
    expect(loaded!.roster[0].name).toBe('沈素问');
    expect(loaded!.deployedHeroIds).toEqual(['h1']);
    expect(loaded!.town.logistics.gold).toBe(1200);
  });

  it('存档带上版本号与时间戳', () => {
    clearSave();
    writeSave(buildPayload());
    const raw = JSON.parse(memory.getItem(SAVE_KEY)!);
    expect(raw.version).toBe(SAVE_VERSION);
    expect(typeof raw.savedAt).toBe('number');
  });

  it('没有存档时返回 null', () => {
    clearSave();
    expect(loadSave()).toBeNull();
  });

  it('版本号不匹配时判为不可用，但不清掉原存档', () => {
    clearSave();
    writeSave(buildPayload());
    const raw = JSON.parse(memory.getItem(SAVE_KEY)!);
    raw.version = SAVE_VERSION + 1;
    memory.setItem(SAVE_KEY, JSON.stringify(raw));

    expect(loadSave()).toBeNull();
    expect(memory.getItem(SAVE_KEY)).not.toBeNull();
  });

  it('名册为空 / 字段缺失的存档会被拒绝', () => {
    clearSave();
    memory.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, town: {}, roster: [] }));
    expect(loadSave()).toBeNull();
  });

  it('损坏的 JSON 不会抛异常', () => {
    clearSave();
    memory.setItem(SAVE_KEY, '{ 这不是 JSON');
    expect(() => loadSave()).not.toThrow();
    expect(loadSave()).toBeNull();
  });

  it('clearSave 之后读不到内容', () => {
    writeSave(buildPayload());
    expect(loadSave()).not.toBeNull();
    clearSave();
    expect(loadSave()).toBeNull();
  });


  it('字符串字段保持 JSON 往返一致（阵型 / 槽位）', () => {
    clearSave();
    writeSave(buildPayload());
    const loaded = loadSave()!;
    expect(loaded.formationPreset).toBe('shield_wall');
    expect(loaded.formationAssignments[0]).toEqual({ heroId: 'h1', slotId: 'front_center' });
  });
});

describe('写入总闸 suspendSave', () => {
  it('挂起后 writeSave 直接失败，重开新档不会被旧快照覆盖', async () => {
    // suspendSave 是模块级一次性开关，必须用全新模块实例测
    vi.resetModules();
    const fresh = await import('../saveEngine');
    clearSave();

    fresh.suspendSave();
    expect(fresh.writeSave(buildPayload())).toBe(false);
    expect(loadSave()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 版本迁移链（纯函数，不依赖 window / localStorage）
// ---------------------------------------------------------------------------

const SAVED_AT = 1_700_000_000_000;

/** 造一份「指定版本号」的原始存档文本 */
function rawSave(version: number, overrides: Partial<SavePayloadRaw> = {}): SavePayloadRaw {
  return { ...buildPayload(), version, savedAt: SAVED_AT, ...overrides };
}

describe('applyMigrations', () => {
  it('逐级执行 1 → 2 → 3，顺序为升序且字段累积', () => {
    const order: number[] = [];
    const table = {
      1: (old: SavePayloadRaw) => {
        order.push(1);
        return { ...old, two: true };
      },
      2: (old: SavePayloadRaw) => {
        order.push(2);
        return { ...old, three: true };
      },
    };

    const out = applyMigrations({ version: 1, seed: 'x' }, table, 3);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(order).toEqual([1, 2]);
    expect(out.from).toBe(1);
    expect(out.migrated).toBe(true);
    expect(out.data.version).toBe(3);
    expect(out.data.seed).toBe('x');
    expect(out.data.two).toBe(true);
    expect(out.data.three).toBe(true);
  });

  it('版本已是最新时不调用任何迁移', () => {
    let calls = 0;
    const out = applyMigrations({ version: 3 }, { 1: old => { calls += 1; return old; } }, 3);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.migrated).toBe(false);
    expect(calls).toBe(0);
  });

  it('链路缺级时判 gap', () => {
    const out = applyMigrations({ version: 1 }, { 1: old => old }, 3);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.status).toBe('gap');
    expect(out.fromVersion).toBe(1);
  });

  it('迁移函数抛异常时判 migrationFailed 并带回错误', () => {
    const boom = new Error('boom');
    const out = applyMigrations({ version: 1 }, { 1: () => { throw boom; } }, 2);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.status).toBe('migrationFailed');
    expect(out.error).toBe(boom);
  });

  it('迁移函数返回非对象时判 migrationFailed', () => {
    const out = applyMigrations({ version: 1 }, { 1: (() => null) as unknown as () => SavePayloadRaw }, 2);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.status).toBe('migrationFailed');
  });

  it('版本号非法（字符串 / 0 / 负数 / NaN / 小数 / 缺失）判 corrupt', () => {
    const bad = ['1', 0, -3, NaN, 1.5, null, undefined];
    for (const version of bad) {
      const out = applyMigrations({ version }, {}, SAVE_VERSION);
      expect(out.ok).toBe(false);
      if (out.ok) return;
      expect(out.status).toBe('corrupt');
    }
  });

  it('版本高于目标时判 tooNew（回滚旧构建的保护）', () => {
    const out = applyMigrations({ version: SAVE_VERSION + 5 }, {}, SAVE_VERSION);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.status).toBe('tooNew');
    expect(out.fromVersion).toBe(SAVE_VERSION + 5);
  });
});

// ---------------------------------------------------------------------------
// 落盘行为：备份 / 自愈回写 / 失败不落盘
// ---------------------------------------------------------------------------

describe('readSave 的迁移落盘行为', () => {
  const twoStep = { 1: (old: SavePayloadRaw) => ({ ...old, migratedMark: true }) };

  it('升级成功后自愈回写，并保留原始 savedAt', () => {
    memory.clear();
    memory.setItem(SAVE_KEY, JSON.stringify(rawSave(1)));

    // 迁移函数只在「旧形态」上打标，归一化层会按白名单丢弃未知字段——
    // 因此这里用调用计数确认迁移确实跑过，而不是看标记字段。
    let calls = 0;
    const step = { 1: (old: SavePayloadRaw) => { calls += 1; return old; } };

    const { save, diag } = readSave(memory, step, 2);
    expect(diag.status).toBe('ok');
    expect(diag.fromVersion).toBe(1);
    expect(save).not.toBeNull();
    expect(save!.version).toBe(2);
    expect(calls).toBe(1);

    const written = JSON.parse(memory.getItem(SAVE_KEY)!);
    expect(written.version).toBe(2);
    expect(written.savedAt).toBe(SAVED_AT);
  });

  it('升级前把原文写进备份位，且原文之后再被覆盖也不影响备份', () => {
    memory.clear();
    const original = JSON.stringify(rawSave(1));
    memory.setItem(SAVE_KEY, original);

    readSave(memory, twoStep, 2);
    expect(memory.getItem(BACKUP_KEY)).toBe(original);

    // 第二份迁移不再覆盖已存在的备份
    memory.setItem(SAVE_KEY, original);
    readSave(memory, twoStep, 2);
    expect(memory.getItem(BACKUP_KEY)).toBe(original);
  });

  it('幂等：迁移后的档再读一次不会重复迁移', () => {
    memory.clear();
    memory.setItem(SAVE_KEY, JSON.stringify(rawSave(1)));

    let calls = 0;
    const counting = { 1: (old: SavePayloadRaw) => { calls += 1; return old; } };
    readSave(memory, counting, 2);
    expect(calls).toBe(1);

    const again = readSave(memory, counting, 2);
    expect(calls).toBe(1);
    expect(again.diag.status).toBe('ok');
    expect(again.diag.fromVersion).toBe(2);
  });

  it('迁移失败时主档逐字节未变', () => {
    memory.clear();
    const original = JSON.stringify(rawSave(1));
    memory.setItem(SAVE_KEY, original);

    const { save, diag } = readSave(memory, { 1: () => { throw new Error('boom'); } }, 2);
    expect(save).toBeNull();
    expect(diag.status).toBe('migrationFailed');
    expect(memory.getItem(SAVE_KEY)).toBe(original);
    expect(memory.getItem(BACKUP_KEY)).toBeNull();
  });

  it('遇到未来版本：主档不动，但留下保命副本', () => {
    memory.clear();
    const future = JSON.stringify(rawSave(SAVE_VERSION + 9));
    memory.setItem(SAVE_KEY, future);

    const { save, diag } = readSave(memory, twoStep, 2);
    expect(save).toBeNull();
    expect(diag.status).toBe('tooNew');
    expect(memory.getItem(SAVE_KEY)).toBe(future);
    expect(memory.getItem(BACKUP_KEY)).toBe(future);
  });

  it('suspendSave 时仍能读出迁移结果，但不回写', () => {
    vi.resetModules();
    memory.clear();
    memory.setItem(SAVE_KEY, JSON.stringify(rawSave(1)));

    return import('../saveEngine').then(fresh => {
      fresh.suspendSave();
      const { save, diag } = fresh.readSave(memory, twoStep, 2);
      expect(diag.status).toBe('ok');
      expect(save).not.toBeNull();
      expect(JSON.parse(memory.getItem(SAVE_KEY)!).version).toBe(1);
    });
  });

  it('归一化裁掉残留英雄 id 与非法阵型槽位', () => {
    memory.clear();
    const raw = rawSave(SAVE_VERSION, {
      deployedHeroIds: ['h1', '已删除的英雄'],
      formationAssignments: [
        { heroId: 'h1', slotId: 'front_center' },
        { heroId: 'h1', slotId: 'not_a_slot' },
        { heroId: '已删除的英雄', slotId: 'back_top' },
      ],
      formationPreset: '不存在的阵型',
      dungeon: { contract: {}, dungeon: { id: 'd1', rooms: [] }, roomIndex: 0 },
    });
    memory.setItem(SAVE_KEY, JSON.stringify(raw));

    const { save } = readSave(memory, SAVE_MIGRATIONS, SAVE_VERSION);
    expect(save).not.toBeNull();
    expect(save!.deployedHeroIds).toEqual(['h1']);
    expect(save!.formationAssignments).toEqual([{ heroId: 'h1', slotId: 'front_center' }]);
    expect(save!.formationPreset).toBe('shield_wall');
    expect(save!.dungeon).toBeNull();
  });
});

// 放在最后：resetSave 会永久停写，不能影响同一文件里的其它用例
describe('清档重开 resetSave', () => {
  it('连主档与备份一起清掉，并停掉后续自动保存', () => {
    writeSave(buildPayload());
    memory.setItem(BACKUP_KEY, '{"stale":true}');
    expect(loadSave()).not.toBeNull();

    resetSave();
    expect(memory.getItem(SAVE_KEY)).toBeNull();
    expect(memory.getItem(BACKUP_KEY)).toBeNull();

    writeSave(buildPayload());
    expect(memory.getItem(SAVE_KEY)).toBeNull();
  });
});

