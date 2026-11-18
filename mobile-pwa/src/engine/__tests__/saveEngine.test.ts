import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { TownEngine } from '../townEngine';
import type { Hero } from '../../types/hero';
import {
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  loadSave,
  writeSave,
  type SavePayload,
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
