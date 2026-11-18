# 存档迁移层设计方案（P1-1）

> 状态：**已落地**（`saveEngine.ts` 迁移链 + 14 条单测，`SAVE_VERSION` 仍为 1）
> 适用版本：Milestone 30 之后（`SAVE_VERSION = 1`）
> 相关文件：`mobile-pwa/src/engine/saveEngine.ts`、`mobile-pwa/src/engine/__tests__/saveEngine.test.ts`、`mobile-pwa/src/App.tsx`
> 上游约束：`AGENTS.md` §6 存档、`TODO.md` P1-1

---

## 1. 现状缺陷（为什么要先做）

| 位置 | 现状 | 后果 |
| --- | --- | --- |
| `saveEngine.ts:73` | `if (d.version !== SAVE_VERSION) return false` | 版本只认精确相等，任何结构变更都把旧档判成「无存档」 |
| `saveEngine.ts:82` | `loadSave` 无迁移概念，解析后直接校验 | 没有可插拔的升级链 |
| `saveEngine.ts:25` | `SAVE_KEY = 'starfall.save.v1'` | 键名里嵌了 `v1`。若误以为要同步改成 `v2`，旧档将永远读不到——静默全量丢档 |
| `saveEngine.ts:89-93` | 版本不符只 `console.warn`，不备份 | 下次自动保存（800ms 防抖）会**直接覆盖写掉**那个「看不懂但可能是新版本」的档 |
| `App.tsx:52-64` | 直接信任 `save.roster` / `deployedHeroIds` | 存档里残留的已删英雄 id 会进首发列表（靠 `deployedSquad` 兜底才没炸） |

核心结论：**迁移层不是「加功能」，是修一个已在线的数据丢失路径。**

---

## 2. 目标与非目标

### 目标

1. 版本升级链：`v1 → v2 → … → SAVE_VERSION` 逐级跑，任一级缺失即失败。
2. 迁移前先备份原档，失败一律「不写、不删」。
3. 升级成功后自愈回写，避免每次启动重复迁移。
4. 迁移函数是**纯函数**（不碰 `localStorage`），可脱离 `window` 单测。

### 非目标（本阶段不做）

- 不改 `DungeonInstance` 结构、不改任何 UI、不 bump `SAVE_VERSION`。
- 不做存档压缩 / 云同步 / 多槽位。

---

## 3. 总体架构：把 `loadSave` 拆成四段

```
readRaw()        读字符串 → JSON.parse → 拿到 { raw, rawText }
   ↓
migrateRaw()     raw.version → 逐级跑 migrations，得到「当前版本形态」的普通对象
   ↓
normalizeSave()  裁字段 / 补安全默认 / 交叉校验，产出 SaveData
   ↓
persist()        仅当发生过升级时回写一次（受 suspendSave 管）
```

对外契约不变：`loadSave(): SaveData | null`。`App.tsx` **一行都不用改**——这是本方案能半天落地的关键。

### 3.1 关键接口

```ts
/** 一级迁移：把 version === from 的存档翻译成 from + 1 的形态 */
export type SaveMigration = (old: SavePayloadRaw) => SavePayloadRaw;
export type SaveMigrationTable = Readonly<Record<number, SaveMigration>>;

export const SAVE_MIGRATIONS: SaveMigrationTable = {
  // 1: migrateV1ToV2,   // ← P1-2 落地后打开
};

/** 纯函数，测试直接注入自定义迁移表 */
export function applyMigrations(
  raw: unknown,
  migrations: SaveMigrationTable,
  targetVersion: number,
): MigrationOutcome;
// = { ok: true; data; from; migrated } | { ok: false; status: 'corrupt'|'tooNew'|'gap'|'migrationFailed'; fromVersion?; error? }

export type LoadStatus = 'ok' | 'empty' | 'corrupt' | 'tooNew' | 'gap' | 'migrationFailed';

export interface LoadDiagnostics {
  status: LoadStatus;
  fromVersion?: number;
  error?: unknown;
}

/** 可注入 Storage 与迁移表的读档缝，单测用它跑真实的备份 / 回写路径 */
export function readSave(
  s: Storage,
  migrations?: SaveMigrationTable,   // 默认 SAVE_MIGRATIONS
  targetVersion?: number,            // 默认 SAVE_VERSION
): { save: SaveData | null; diag: LoadDiagnostics };

export function loadSaveDetailed(): { save: SaveData | null; diag: LoadDiagnostics };
export function loadSave(): SaveData | null;  // = loadSaveDetailed().save
```

`applyMigrations` 返回 `from` 是给回写和日志用的；`migrated` 决定是否自愈。失败不返回 `null`，而是带 `status` 的联合类型——这样诊断信息不会在函数边界丢掉。

`SavePayloadRaw` 定义为 `Record<string, unknown>` 的别名，代表「尚未校验的存档主体」——迁移函数在旧形态上工作，因此不能用 `SaveData` 约束入参。

### 3.2 迁移链执行规则

1. `version` 必须是不小于 1 的整数；`NaN` / 字符串 / 缺省 → `corrupt`。
2. `version === target`：跳过链路，直接 normalize。
3. `version > target`（用户回滚到旧构建）：判 `tooNew`，**返回 null 但先把原文复制到备份键**，见第 5 节。
4. `version < target`：`for (v = from; v < target; v++)`，取 `migrations[v]`；表里缺这一级 → `gap`，返回 null。
5. 单级抛异常 → `migrationFailed`，返回 null；不写盘。
6. 循环次数上限 `target - from`，不依赖 `while` 自增，杜绝死循环。
7. 迁移函数只做「旧形态 → 新形态」，**不读 storage、不读 `Date.now()`、不做随机**，保证同输入同输出。

---

## 4. `normalizeSave`：迁移与兜底的分界线

这是最容易做错的地方，定一条铁律：

> **`saveEngine` 只做「翻译结构」和「裁掉非法字段」，绝不创造玩法状态。**

理由：`TownEngine` / `generateHero` 才是默认值的唯一归属地。迁移里自己造一个「初始城镇」会和引擎默认值漂移成两套真相。所以：

- 允许：`Array.isArray(x) ? x : []`、负数钳到 0、非法 `formationPreset` 回落到 `'shield_wall'`、`formationAssignments` 丢弃未知 `slotId`、`deployedHeroIds` 收敛到 `roster` 里真实存在的 id。
- 允许：`dungeon` 结构不合法 → 置 `null`（等价于「这一趟作废回城」，远比恢复出半截战场安全，也与既有「战斗瞬时态不存盘」的取舍一致）。
- 禁止：补英雄属性、补金币、补契约、补地牢房间。
- `town.*` 五个字段沿用现有 `applyTownSave` 的逐字段守卫（已有），normalize 层不再重复。

`roster` 判空仍保留 `length > 0` → 否则 `corrupt`（此时 App 会走 4 人新档，是安全降级）。

---

## 5. 备份与自愈回写

两个键，都放在 `SAVE_KEY` 之外：

```
starfall.save.v1                  ← 主档（键名永久冻结，见下）
starfall.save.v1.backup           ← 升级前快照 / 未来版本保命副本
```

- **升级前**：把 `rawText` 原样写进 `.backup`（只在 `.backup` 空缺时写，**永不覆盖**已经存下的原始档——第一份才是最接近「用户真进度」的那份）。
- **升级成功后**：`{ ...migrated, version: SAVE_VERSION, savedAt: 原 savedAt }` 回写主档，**保留原 `savedAt`**，否则「上次保存」会撒谎成「刚刚」。
- **`tooNew` 时**：先把 `rawText` 复制进 `.backup`，再返回 null。这样即使用户用旧构建打开，随后触发的自动保存也不会把新版本的档彻底铲掉——`.backup` 里还留着。
- 回写走 `writeSave` 的同一套 `try/catch` 与 `suspendSave` 闸门；写失败不影响本次游戏继续（内存里已有迁移结果）。

### 键名决策（重要）

`SAVE_KEY` 保持字符串 `'starfall.save.v1'` 不动，并在常量上方加注释：

> 此 `.v1` 是命名空间历史遗留，**不是真实版本号**；真实版本只看 `payload.version`。

真版本 bump 到 2 时**绝不能**改这个字符串。同时定义 `const BACKUP_KEY = SAVE_KEY + '.backup'`，未来若要彻底改名再走 `LEGACY_KEYS` 兼容读。

---

## 6. 与 P1-2 的衔接（为什么现在不 bump）

`SAVE_VERSION` 现在**保持 1**，只上机制。原因：

- `TODO.md` 里 `SAVE_VERSION = 2` 的语义已约定给「地牢改图」。若现在先用 2 做空升级，P1-2 就得用 3，文档与代码对不上。
- 真正的 `migrateV1ToV2` 内容取决于 P1-2 的图结构定稿（线性 `rooms[]` + `currentRoomIndex` → `nodes[] + visitedPath`，且**必须保住进行中的位置**：`currentRoomIndex: i` 应映射成 `currentNodeId = n{i}`，并把 `n0..ni` 填进 `visitedPath`）。这个映射得等图格式定了才能写对。

所以 P1-1 的交付物是「一条空链路 + 一套纯函数 + 可注入的测试」，P1-2 只需往 `SAVE_MIGRATIONS` 里塞一个 `1: migrateV1ToV2` 并 bump 常量。

同时，normalize 层**从今天就生效**（版本相等也会跑），立刻拿到「残留 id / 非法阵型槽位 / 坏 dungeon」的清理收益，不是空转。

---

## 7. 测试清单

全部针对**纯函数** `applyMigrations` 与可注入 Storage 的 `readSave`，不需要真实 `localStorage`。已落地 14 条：

1. `1 → 2 → 3` 链式：三级依次生效，字段累积正确。
2. 顺序保证：用「打标数组」验证执行次序是 1→2→3 而非反序。
3. 缺级（表里只有 1、目标 3）→ `null` + `gap`。
4. 单级抛异常 → `null` + `migrationFailed`，且原始 storage 内容**逐字节未变**。
5. `version` 为 `'1'` / `NaN` / `null` / `undefined` → `corrupt`。
6. `version > target` → `tooNew`，原档仍在、`.backup` 已生成。
7. 幂等：迁移成功后 storage 里是 `SAVE_VERSION`；再 `loadSave()` 一次不再触发迁移（可用计数迁移表断言第二遍零调用）。
8. 升级回写保留原 `savedAt`。
9. `suspendSave()` 时迁移仍能读出数据，但不回写。

外加既有 9 条全绿（`saveEngine.test.ts` 合计 23 条，全仓 44 条）。注意其中「版本号不匹配时判为不可用」一条语义已变为「版本不符 → 走迁移或 `tooNew`」：断言仍是 `loadSave() === null` + 原档仍在，**运行时行为不变**，只是判定路径换了。

---

## 8. 改动面与工期

| 文件 | 改动 |
| --- | --- |
| `mobile-pwa/src/engine/saveEngine.ts` | +约 110 行（`applyMigrations` / `normalizeSave` / `loadSaveDetailed` / 备份与回写）。`isUsableSave` 拆成 `isVersioned` + `validatePayload` |
| `mobile-pwa/src/engine/__tests__/saveEngine.test.ts` | +约 9 条用例 |
| `App.tsx` / 组件 / 类型 | **零改动** |

工期约半天。收口条件：`npm run check`、`npm run test`（实测 4 files / 44 tests 全绿）、`npm run build`。**不需要**跑 `scripts/sim_balance.mjs`（不碰数值）。

---

## 9. 验收标准

1. 现存 v1 档启动后：数据完整、`.backup` 未生成（因为没升级）、`savedAt` 不变。
2. 手工把 storage 里 `version` 改成 `0` 且注入 `1→2` 空迁移：能读进、storage 里版本变成目标版、`.backup` 为原始文本。
3. 手工把 `version` 改成 `99`：判 `tooNew` 走新档，但刷新几次后 `.backup` 里仍是那份 `99` 的原文。
4. 迁移函数里 `throw`：游戏正常起新档，console 一条 `[save] 迁移失败 1→2`，原档未被覆盖。

---

## 10. 实施顺序

1. `saveEngine.ts`：抽出 `readRaw` / `isVersioned`，加 `applyMigrations`（空迁移表）与 `normalizeSave`，`loadSave` 改为薄包装。
2. 补 9 条纯函数单测，跑 `npm run test` 确认既有 30 条不回归。
3. 加备份与自愈回写，补第 6/8/9 条用例。
4. `npm run check` → `npm run build` → 更新 `TODO.md`（P1-1 打勾、P1-2 标注「依赖已就绪」）与 `PROJECT_HANDOFF.md`（追加 Milestone 记录）。
5. 提交：`feat(save): add versioned migration chain with backup and self-heal`，推送双远程。
