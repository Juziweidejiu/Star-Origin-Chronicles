# design/ — UI 原型与截图壳页

这里的文件**不参与应用构建**，只是设计探索与视觉自查用的本地静态页面。
用任意静态服务器打开即可（推荐 `python -m http.server 5200 --bind 127.0.0.1`，然后访问 `http://127.0.0.1:5200/design/xxx.html`）。

> 目的：留住「为什么长成这样」的证据。改界面前先来这里看当时的取舍，别凭感觉推翻。

## 一、选型画廊

| 文件 | 说明 |
| --- | --- |
| `ui-lab.html` | **四向对决画廊**，一页看完所有战斗场景方案，带对比表与推荐组合 |
| `ui-plan.html` | **UI 改版方案书**：诊断 → 设计 Token → 组件规范 → 六个界面改造 → 落地五步 |

## 二、单屏原型（早期探索）

| 文件 | 回答的问题 |
| --- | --- |
| `demo-a-questboard.html` | 今天打哪一张？（公会悬赏板） |
| `demo-b-roster.html` | 带谁去、扛不扛得住？（3×3 编队名册） |
| `demo-c-route.html` | 下一间走哪边？（地牢手绘路线图） |
| `demo-d-command.html` | 现在该做什么？（一屏指挥首页） |
| `demo-layout-v2.html` | 悬赏列表 + 底部常驻决策抽屉 |
| `style-tile.html` | 最早的风格样张（单屏） |

## 三、战斗场景三案

| 文件 | 方案 |
| --- | --- |
| `demo-combat-sandbox.html` | 方案一 · 羊皮纸 3×3 战术沙盘 |
| `demo-combat-theater.html` | 方案二 · 横版卷轴剧场（左我右敌） |
| `demo-combat-hybrid.html` | 方案三 v1 · 上层首领巢穴 + 下层沙盘 |
| `demo-combat-grid.html` | **方案三 v2 · 隐形格战术战场**（已落地，见下） |

### 最终落地的方案：`demo-combat-grid.html`

- 双方各一块 **3×3 网格，格线平时不可见**，但占格逻辑真实存在。
- 首领占 **2×2** 四格，其余单位各占一格；英雄按阵型列（前排/中坚/后卫）落位。
- 一整块连续窟室场景：石砖后墙 + 两支壁炬 + 地面横缝 + 四角收暗 + 中间空地散落物（断矛/破盾/血痕）+ 浮尘。
- 三个交互按钮：`网格`（临时显现格线）、`剪影`（切剪影/立绘/模型三态造型槽）、`集火首领`。
- 点单位会亮起它真正占的格子；点首领额外扣血 + 跳字 + 震屏。

这份原型已 1:1 落到 `mobile-pwa/src/components/CombatStage.tsx` / `BattlePawn.tsx` + `index.css` 的 `.cs-*` 段。

## 四、截图壳页 `_shot-*.html`

内置浏览器截图工具在桌面窗口不在前台时会失败，因此用 **headless Chrome + iframe 壳页**代替。
壳页把应用页（`http://127.0.0.1:5199/game/`）装进固定尺寸 iframe 里，再由 Chrome 截图。

| 壳页 | 尺寸 / 目标 |
| --- | --- |
| `_shot.html` | 390×844，原型通用 |
| `_shot2.html` | 360×640，小屏检查 |
| `_shot-game.html` | 390×844 → 城镇首页 |
| `_shot-roster.html` | → 名册页 `?tab=roster` |
| `_shot-dungeon.html` | → 自动点「接取」进地牢 |
| `_shot-combat.html` | → 自动点「接取」→「列阵迎敌」→ 暂停 |
| `_shot-settle.html` | → 等战斗自然结束，抓结算面板 |
| `_shot-smith.html` | → 铁匠铺 `?b=blacksmith` |
| `_shot-tabs.html` | 三个 360 宽 iframe 并排（酒馆/市集/医馆） |

完整命令见根目录 `AGENTS.md` 第 4 节。要点：必须加 `--disable-web-security` 才能跨端口操作 iframe 内部。

## 五、约定

- 新增原型请沿用 `lab.css` 的 token（纸面 `#EFE3C8` / 墨 `#2A2418` / 黄铜 `#D9A45B` / 酒红 `#8A3B32`）。
- 原型只是**讨论用**，不要在这里堆业务逻辑；定稿后把实现搬进 `mobile-pwa/src/`。
- 已被主线取代的旧原型不要删，标一行「已被 X 取代」即可 —— 它们记录了被否掉的方向。
