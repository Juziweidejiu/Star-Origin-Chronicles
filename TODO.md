# 《星原战纪》路线蓝图

> 最后更新：2026-11-18
> 当前版本：Milestone 24（羊皮纸 UI 全量改版 + 战斗性能优化）已完成

---

## 已完成（Milestone 1–24 摘要）

| 阶段 | 内容 |
|---|---|
| M1–19 | 叙事 DSL + 反套话管线 + Ink 运行器；东方化重制；战斗引擎（暴击/穿透/减伤）；平衡模拟；3×3 阵型；纵向自走棋战场；地牢分支；营地暖汤；MVP/榜单结算 |
| M20 | 词条对齐九维属性；结算弹窗仅 Boss 房 |
| M21 | S/A/B/C/D 公会任务板 + 胜率演算 + 战术建议；4 座生活化城镇；魔物生态扩充 |
| M22 | 英雄经验/等级/CA 成长系统 + 等级压制 |
| M23 | 铁匠铺：打造 / 重铸 / 洗练 / 分解（品质 0.82–1.18，一次性重铸 +18%） |
| M24 | 羊皮纸设计 token + 公共组件；城镇/公会/名册/地牢/战场/结算全部换皮；隐形格 3×3 窟室战场；战斗性能优化（rAF 弹道 → CSS transition、跳字样式外提、布局指纹、日志增量）；暴击中文化；伤害数字错行 |

---

## P0 · 存档持久化（进行中）

**问题**：全项目无 `localStorage`/`indexedDB`。刷新页面 = 等级、金币、装备、名册、地牢进度全部归零。作为手机 PWA 这是致命的。

**方案**
- [ ] 新增 `src/engine/saveEngine.ts`
  - `SAVE_KEY = 'starfall.save'`，`SAVE_VERSION`
  - `loadSave(): SaveData | null`（try/catch + 版本校验 + 结构校验，任何异常都降级为“无存档”）
  - `writeSave(data): boolean`（配额/隐私模式失败静默返回 false）
  - `clearSave()`
  - `applyTownSave(engine, town)` 直接回填 TownEngine 的五个字段
- [ ] 存档内容：`town{towns,logistics,contracts,tavernRecruits,fallenSouls}` / `roster` / `deployedHeroIds` / `formationPreset` / `formationAssignments` / `inventory` / `dungeon{contract,dungeon,roomIndex}` / `version` / `savedAt`
- [ ] **不存**：CombatEngine、战斗瞬时状态（跳字/弹道/震屏/结算弹窗）、`activeTab`
- [ ] 写入策略：每次渲染后 800ms 防抖落盘（战斗期间每 200ms 重渲染会不断重置定时器，等于战斗时不写盘，符合预期）；`pagehide` 时立即落盘
- [ ] 读档策略：首次挂载前 `loadSave()`，各 `useState` 初始化器读存档；有未完成地牢则落地牢页
- [ ] 版本迁移框架（`migrate(oldVersion, data)`，目前仅 v1）
- [ ] UI：城镇横幅显示「已自动保存 · 第 N 天」+「重新开始」二次确认按钮

**验收**：打一场 → 刷新页面 → 金币/等级/装备/地牢进度全部还在；清空 localStorage 后能开新档。

---

## P0 · 数值校准

- [ ] 新档 4 人对 3★ 契约胜率仅 42%，会连续刷出「九死一生」
- [ ] `guildEngine` 的 `partyPower` / `enemyPower` 曲线重标定，目标：1★ ≈ 85%、2★ ≈ 72%、3★ ≈ 55%、4★ ≈ 38%、5★ ≈ 22%
- [ ] 用 `scripts/sim_balance.mjs` 做 Monte Carlo 回归

---

## P1 · 性能（剩余）

- [ ] **战场每 200ms 整场重渲染**（最大头）
  - `setCombatUnits([...engine.units])` 每 tick 新数组 → 7 个单位全部重渲染
  - `engine.units` 内部对象原地 mutate，不能直接浅比较
  - 方案：给 unit 加 `version` 递增戳，`BattlePawn` 用 `React.memo` 比较 `hp/version/动画态`
- [ ] `backdrop-filter: blur()` 用在 4 个遮罩上，移动端 GPU 开销大 → 改半透墨底 + 纸纹
- [ ] Boss 接地阴影的 `filter: blur(4px)` + 4.8s 呼吸动画每帧重绘 → 改预渲染径向渐变
- [ ] 单包 678kB → `React.lazy` 拆物语页（Ink.js 最重）、结算弹窗、大招特写
- [ ] 数字加 `font-variant-numeric: tabular-nums`，避免血量跳动

---

## P1 · 表现

- [ ] 装备/战利品清单只有文字，缺品质图标与部位图标
- [ ] 六套战场主题色（矿道/关隘/深林/雪原/兽林/堡垒）只能按 `env` 自动选，玩家看不到差异
- [ ] 城镇建筑卡缺缩略插画
- [ ] 结算面板 MVP 奖章仍是纯文字

---

## P2 · 功能

- [ ] 技能库扩充：每职业 2–3 个小技能 + CD + 手动释放
- [ ] 战斗状态效果：眩晕 / 流血 / 破甲 / 嘲讽，韧性属性生效
- [ ] 压力系统接入战斗：100 压力触发美德觉醒或偏执/自私/绝望
- [ ] 英雄特质矩阵（111 种互斥）+ 战友羁绊合击 / 掩护挡刀
- [ ] 天灾系统第二期（`ENABLE_WORLD_CRISIS` 目前在 `config/features.ts` 关闭）
- [ ] iOS 真机 PWA 联调：部署 `https://orange-fit.top/game/`，验证手势、震动、性能

---

## 工程约定

- 构建门禁：`cd mobile-pwa && npm run build`（`tsc -b && vite build`），仅允许 chunk >500kB 警告
- 无 Tailwind、无组件库；样式走 `index.css` 的 `--pz-*` token + `.pz-*` 类
- 引擎层（compatEngine / guildEngine / blacksmithEngine / progressionEngine）改数值前先跑 `scripts/sim_balance.mjs`
- 每次里程碑：更新 `PROJECT_HANDOFF.md` + 一次提交 + push 到 Gitee `origin/main`
