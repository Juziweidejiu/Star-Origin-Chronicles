# 《星原战纪》路线蓝图

> 最后更新：2026-11-18
> 当前版本：Milestone 35（铁匠铺打造进工程）
> 新会话从这里开始读：本文件 → `AGENTS.md` → `PROJECT_HANDOFF.md`

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
| M29 | `BattlePawn` memo 化 + `sameVisual()` 逐字段比较（解掉「视觉态每次新引用导致 memo 失效」）；性能清单清零 |
| M30 | GitHub 镜像（公开仓）+ Actions 真跑绿灯；双远程推送流程；`?perf=1` 真机性能采样器（FPS/p95/掉帧/卡死/LongTask/LoAF，纯 DOM 挂载） |
| M31 | 存档迁移层（P1-1）：链式 `SAVE_MIGRATIONS` + 原档备份 + 自愈回写 + 结构归一；`readSave` 可注入测试缝；单测 30 → 44 |
| M32 | 应用壳重构：页眉/底栏钉死，只有中栏滚动；`visualViewport` 动态视口；切 tab 回顶 |
| M33 | 页内「上不动、下滚动」：城镇瘦身横幅 + 镇志浮层；名册编队固定 + 队员/背包互斥折叠 + 状态/职业/排序筛选 |
| M34 | 铁匠铺打造原型（`design/crafting-demo.html`）：图纸册 / 备料 / 三段式小游戏 / 词条点亮 / 老板代打 / 按品阶熟练度 / 资产槽 |
| M35 | 铁匠铺进工程：`blueprintData` + `craftEngine`（纯函数状态机）+ 存档 `craft` 段 + `BlacksmithView` 拆分 + 战斗掉落图纸材料 + 声望解锁 + 12 张图纸卡面 |

---

## 🔴 P0 · 数值校准（暂缓，等发话）

- 问题：新档 4 人对 3★ 契约只有 42% 胜率。
- 目标曲线：1★≈85% / 2★≈72% / 3★≈55% / 4★≈38% / 5★≈22%。
- 改法：调 `guildEngine.calculatePartyPower` 权重与 `calculateEnemyPower` 系数，或调 `ENEMY_TUNING`；每次改完跑 `node scripts/sim_balance.mjs`。
- 用户原话：「先不调数值，先优化。我们现在没人玩，主要是开发流程。」

---

## 🟠 P1 · 下一步建议（新会话从这里开工）

### 1. 存档迁移层（✅ 已完成，Milestone 31）
- [x] `saveEngine.ts` 版本不符不再直接 `return null`：先备份原档 → 逐级跑 `SAVE_MIGRATIONS` → 归一化 → 自愈回写。
- [x] `applyMigrations` 纯函数 + `readSave(s, migrations, target)` 测试缝，失败分 `corrupt / tooNew / gap / migrationFailed` 四类。
- [x] `BACKUP_KEY = 'starfall.save.v1.backup'`，只在空缺时写，永不覆盖第一份原始档；`tooNew` 也留副本防自动保存铲档。
- [x] 单测 9 → 23 条（全仓 30 → 44），`check` / `test` / `build` 全绿。
- [x] 方案文档：`docs/SAVE_MIGRATION.md`。
- 注意：`SAVE_VERSION` 仍为 1；落地 P1-2 时登记 `1: migrateV1ToV2` 再 bump，`SAVE_KEY` 字符串**不得改动**。

### 2. 《杀戮尖塔》式地牢路线图（约 2 天，存档前置已就绪）
- 现状：生成器产**线性数组** + `branchOptions` 二选一；`DungeonView` 是横向圆点条，玩家不能自选节点。
- Demo 承诺：`design/demo-c-route.html` 手绘分支地图，玩家自己点下一格。
- [ ] 生成器改图：深 6–8 层、每层 1–3 节点、节点带边；一条偏战斗主干 + 一条偏事件/宝箱侧翼，中间可横切。
- [ ] `DungeonInstance` 加 `nodes: { id, layer, col, type, edges }[]` + `visitedPath`，bump `SAVE_VERSION = 2`。
- [ ] `DungeonView` 重写：SVG 连线 + 绝对定位节点 + 点可达节点出详情面板（收益/预估胜率/危险度/消耗）+ 「进入此间」。
- 约定：**不允许回头**；先生成器 + 类型 + 单测（拓扑连通、Boss 可达），再改 UI。

### 3. 战斗状态效果（1–2 天）
- [ ] 眩晕 / 流血 / 灼烧 / 破甲 / 虚弱 / 嘲讽。
- [ ] 韧性（tenacity）参与控制时长减免。
- [ ] 单位头顶状态图标 + 结算面板统计。

### 4. 技能库扩充（2–3 天）
- [ ] 每职业 2–3 个小技能 + 冷却。
- [ ] 战斗中可点技能按钮（CD 转圈），或用 Gambit 条件式自动触发。

### 5. 压力崩溃接进战斗（1–2 天）
- [ ] 承暴击 +3~5、队友倒地 +5~8、击杀强敌 −2。
- [ ] 100 压力心理检定：小概率「豪杰/振奋」，大概率「偏执/自私/绝望」。

### 6. 铁匠铺打造（图纸 / 材料 / 小游戏，✅ 已进工程）
- [x] 原型：`design/crafting-demo.html`（单文件，复用 pz token，不接入构建）；示例插画 `design/assets/items/sword.svg`。
- 已定分工：图纸定底子（部位/基础属性/词条池）、材料定上限（品质区间/词条数）、小游戏定实际发挥。
- 已定交互：三段式（火候 5 → 锻打 4 → 淬火 1）；老板代打 1.6 倍工钱、品质保底 1.00–1.06、不涨熟练度；熟练度按品阶 T1–T5 各 5 级，只由自打获得。
- [x] `engine/blueprintData.ts`（12 张图纸 / 7 种材料 / 每部位 8 条词条）+ `engine/craftEngine.ts`（`startCraft / craftBeat / settleCraft` 纯函数状态机、熟练度、代打、回收、掉落、声望解锁）。
- [x] 存档新增 `craft`（材料 / 已解锁图纸 / 分品阶熟练度 / 打造件数），`SAVE_VERSION` 仍为 1，旧档自动补默认。
- [x] `components/BlacksmithView.tsx` 从 `TownView.tsx` 拆出：图纸册 / 打造台 / 重铸 / 洗练 / 分解五个页签 + 全屏锻造层 + 成品对比弹层。
- [x] 战斗胜利掉落材料与图纸（首领必掉未拥有），声望 60 / 五星首通解锁头像图纸。
- [x] 图纸卡面：`mobile-pwa/public/art/items/{blueprintId}.svg`（12 张，`scripts/gen_item_art.mjs` 生成）。
- [x] 洗练锁定：点词条选中，洗练时保留该条（耗星陨砂 1），其余重掷。
- [ ] 后续：词条真实战斗效果（v2）、图纸残页合成、委托队列。
- 资产约定：`public/art/{icons|items|heroes|npc}/{id}.webp`，缺图回落线性图标；v1 不改 `combatEngine`。

---

## 🟡 P2 · 其他玩法与联调

- [ ] 胜率校准（见 P0，暂缓）
- [ ] 特质矩阵与羁绊（合击技 / 掩护挡刀）
- [ ] 天灾系统重启（`ENABLE_WORLD_CRISIS = false`）
- [ ] 立绘/模型接入：`BattlePawn` 已留剪影/立绘/模型三态槽，但缺图片资源 id 字段与存档字段
- [ ] iOS 真机 PWA 联调（手势、震动、全屏、首屏体积）
- [ ] 结算弹窗分段渲染（削掉 300ms 峰值挂载）

---

## 🔧 技术债（不单独排期，顺手处理）

- [ ] **引擎不可变化重构**：`TownEngine` 是可变类实例，靠 `triggerUpdate()` 强制重渲染；`.oxlintrc.json` 已关闭 `react/immutability`（26 条）。副作用是 `React.memo` 必须逐字段比较、`useMemo` 缓存易过期。等测试网更厚再动。
- [ ] `App.tsx` 已 1400+ 行，按 tab 抽到 `screens/` 目录（每次动某个 tab 时顺手做）。
- [ ] 组件层/E2E 测试：CI 已通，可接 Playwright 三条冒烟（进入城镇 → 接取 → 打完一间）。
- [ ] 六套战场主题色未逐一验证对比度。

---

## 工程约定

- 提交前必须 `npm run check`（pre-commit 钩子拦截）；完整门禁 `npm run verify`。
- 引擎层 `src/engine/` 不得 import React 或操作 DOM（单测跑不起来）。
- 改数值前先跑 `node scripts/sim_balance.mjs`。
- 每个里程碑：更新 `PROJECT_HANDOFF.md` → `npm run check` → 提交 → 推送两个远程：
  ```bash
  git push origin main    # Gitee（主仓）
  git push github main    # GitHub 镜像，触发免费 Actions CI
  ```
- 真机性能采样：`https://orange-fit.top/game/?perf=1`，打完一局点「复制报告」。
