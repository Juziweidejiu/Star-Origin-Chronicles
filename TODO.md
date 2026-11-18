# 《星原战纪》路线蓝图

> 最后更新：2026-11-18
> 当前版本：Milestone 28（开发流程基建 + 性能收尾）

---

## 已完成（里程碑摘要）

| 阶段 | 内容 |
|---|---|
| M1–19 | 叙事 DSL + 反套话管线 + Ink 运行器；东方化重制；战斗引擎（暴击/穿透/减伤）；平衡模拟；3×3 阵型；纵向自走棋战场；地牢分支；营地暖汤；MVP/榜单结算 |
| M20 | 词条对齐九维属性；结算弹窗仅 Boss 房 |
| M21 | S/A/B/C/D 公会任务板 + 胜率演算 + 战术建议；4 座生活化城镇；魔物生态扩充 |
| M22 | 英雄经验/等级/CA 成长系统 + 等级压制 |
| M23 | 铁匠铺：打造 / 重铸 / 洗练 / 分解（品质 0.82–1.18，一次性重铸 +18%） |
| M24 | 羊皮纸设计 token + 公共组件；全界面换皮；隐形格 3×3 窟室战场；战斗性能优化（rAF 弹道 → CSS transition、跳字样式外提、布局指纹、日志增量）；暴击中文化；伤害数字错行 |
| M25 | 存档持久化（`starfall.save.v1`，800ms 防抖 + pagehide 落盘 + 重开新档） |
| M26 | DevEx：固定 dev 端口、`check`/`verify`/`test` 脚本、pre-commit 钩子、vitest + 30 个引擎单测、`AGENTS.md` |
| M27 | 仓库卫生（74 个逆向脚本 → `tools/re/`）、`mobile-pwa/README.md` 重写、GitHub Actions CI |
| M28 | oxlint 41 → 0 warning；去 3 处 `backdrop-filter`；`tabular-nums`；`React.lazy` 拆出 Ink 剧本（主包 681 → 425 kB，另出 257 kB 懒加载 chunk） |

---

## 🔴 P0 · 数值校准（暂缓，等你发话）

**问题**：新档 4 人对 3★ 契约只有 42% 胜率，会连续刷出「九死一生」。

**目标曲线**（1★ 新手友好，5★ 终点）：

| 星级 | 1★ | 2★ | 3★ | 4★ | 5★ |
|---|---|---|---|---|---|
| 目标胜率 | ≈85% | ≈72% | ≈55% | ≈38% | ≈22% |

**改法**：调 `guildEngine.calculatePartyPower` 的权重与 `calculateEnemyPower` 的系数，或调 `ENEMY_TUNING`；每次改完必须跑 `node scripts/sim_balance.mjs` 并附结果。

> 用户明确指示：「先不调数值，先优化。我们现在没人玩，主要是开发流程。」——本条列入待办但不插队。

---

## 🟡 P1 · 性能（还剩一项大的）

- [ ] **战场单单位 memo 重渲染**
  - 现状：心跳每 200ms `setCombatUnits([...engine.units])`，7 个单位整树重渲染。`engine.units` 内部对象是原地 mutate 的，不能直接 `React.memo` 浅比较。
  - 方案：给每个 unit 加递增 `version`，`BattlePawn` 用 memo 比较 `hp / version / 动画态`。
  - 收益：战斗最卡的一块；工作量中等，需回归验证。

已完成：弹道 CSS 化、跳字样式外提、布局指纹、日志增量、去 backdrop-filter、拆包、tabular-nums。

---

## 🟡 P2 · 未来玩法蓝图

### 1. 《杀戮尖塔》式地牢路线图（已确认要做，排在未来）

**现状**：`generateDungeonFromContract` 产出**单向递增的房间数组** + 挂在某一间上的 `branchOptions` 二选一；`DungeonView` 是一排横向圆点 + 当前房间卡。
**Demo 承诺**：`design/demo-c-route.html` 是手绘分支地图，玩家**自己点下一格**、未连通节点不可点、点节点先看详情（收益/预估胜率/危险度/体力消耗）再进入。

**要真落地需改三处**（估约 2 天）：
- [ ] 生成器改图：深 6–8 层、每层 1–3 节点、节点间有边；仅可从当前层走到相邻已连通节点；一条偏战斗主干 + 一条偏事件/宝箱侧翼，中间可横切；保留主题/星级/房型权重。
- [ ] `DungeonInstance` 结构变更：`nodes: { id, layer, col, type, edges: id[] }[]` + `visitedPath`；牵动 `DungeonView`、`App` 推进逻辑、存档；需 bump `SAVE_VERSION = 2` 并写迁移（旧档线性地牢折叠成直路）。
- [ ] `DungeonView` 路线区重写：SVG 连线 + 绝对定位节点 + 选中详情面板。

**建议顺序**：先生成器 + 类型 + 单测（拓扑连通、Boss 可达），再改 UI。待定：是否允许回头（建议不允许）。

### 2. 其余玩法
- [ ] 技能库扩充（每职业 2–3 个小技能 + CD）
- [ ] 战斗状态效果（眩晕 / 流血 / 破甲 / 嘲讽，韧性生效）
- [ ] 压力崩溃（100 压力触发美德或偏执）
- [ ] 特质矩阵与羁绊
- [ ] 天灾系统重启（`ENABLE_WORLD_CRISIS = false`）
- [ ] iOS 真机 PWA 联调

---

## 🔧 技术债

- [ ] **引擎不可变化重构**：`react/immutability` 已在 `.oxlintrc.json` 关闭。原因是引擎用可变领域对象（`townEngine.logistics.gold -= 50`、`currentDungeon.rooms[i].cleared = true`），靠 `triggerUpdate()` 强制重渲染。改成不可变需让引擎所有方法返回新对象——大重构、高回归风险，等有测试网兜住再动。
- [ ] `App.tsx` 已 1400+ 行，可按 tab 拆成 `screens/` 目录
- [ ] 六套战场主题色未验证切换效果

---

## 工程约定

- 提交前必须 `npm run check` 通过（pre-commit 钩子会拦），完整门禁 `npm run verify`
- 引擎层 `src/engine/` 不得 import React 或操作 DOM（否则单测跑不了）
- 改数值前先跑 `scripts/sim_balance.mjs`
- 每个里程碑：更新 `PROJECT_HANDOFF.md` → `check` → 提交 → `push origin main`（Gitee）
