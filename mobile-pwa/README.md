# 三岔口

移动端 PWA 地牢冒险 RPG。React 19 + Vite 8 + TypeScript，全部界面为内联样式 + `pz-` 设计 token，
无 Tailwind、无组件库，构建产物单包直出，可离线安装为手机桌面应用。

> 上手前请先读仓库根的 `AGENTS.md`（目录约定 / 命令 / 调试入口 / 截图管线）、
> `TODO.md`（当前优先级）与 `PROJECT_HANDOFF.md`（逐里程碑交付记录）。

---

## 快速开始

```bash
cd mobile-pwa
npm install          # 会自动装好 pre-commit 钩子
npm run dev          # http://127.0.0.1:5199/game/
```

打开后默认落在「据点」。调试时可直接跳到目标界面：

| 参数 | 例 | 说明 |
| --- | --- | --- |
| `?tab=` | `?tab=roster` | `town` / `dungeon` / `combat` / `roster` / `story` |
| `?b=` | `?b=blacksmith` | `guild` / `tavern` / `market` / `infirmary` / `sanctuary` / `blacksmith` |

例：`http://127.0.0.1:5199/game/?tab=roster`

---

## 命令

| 命令 | 作用 | 耗时 |
| --- | --- | --- |
| `npm run dev` | 开发服务器（端口 5199 已固定，被占用会直接报错） | — |
| `npm run check` | **提交前必跑**：类型检查 + lint | ~1s |
| `npm run test` | 引擎层单测（vitest） | ~0.4s |
| `npm run build` | 生产构建（`tsc -b && vite build`） | ~1s |
| `npm run verify` | 完整门禁：类型 + lint + 构建 | ~2s |
| `npm run setup:hooks` | 重装 pre-commit 钩子（`npm install` 已自动执行） | — |

`pre-commit` 钩子会在提交前跑 `npm run check`，不过就拦下。应急绕过：`git commit --no-verify`。

---

## 项目结构

```
mobile-pwa/
├── src/
│   ├── engine/        纯逻辑：战斗、地牢、成长、公会、铁匠、存档（无 React，可单测）
│   ├── components/    界面组件；ui/ 下是 Card / Btn / Seal / Tag / StatBar / WinRing / Masthead
│   ├── types/         hero / world / dungeon / formation / guild / progression …
│   ├── data/          英雄名库、叙事事件、营地对话
│   ├── config/        stageThemes 战场主题、features 功能开关
│   └── index.css      设计 token（pz-*）与公共类
└── scripts/           install-hooks.mjs
design/               UI 原型与 headless 截图壳页（不参与构建）
tools/re/             早期逆向分析脚本（不参与构建，仅存档）
scripts/              数值模拟 sim_balance.mjs
```

**引擎层不得 import React 或操作 DOM**，否则单测跑不起来。

---

## 玩法与系统一览

- **地牢**：程序化生成 5–7 间房（战斗 / 机关 / 宝箱 / 营地 / 奇遇 / 首领），偶发岔路。
- **战斗**：3×3 隐形格战场，自动推进；暴击 / 穿透 / 减伤按九维属性计算，可 1x/2x 倍速、手动放大招。
- **成长**：英雄有 CA（当前能力）/ PA（潜力上限）、30 维属性、20 级经验曲线；越级挑战有压制/加成。
- **公会**：S/A/B/C/D 五级悬赏，接单前给出胜率百分比、危险度与战术建议。
- **铁匠铺**：开炉打造 / 回炉精淬（一次性 +18%）/ 重洗开光批注 / 拆解回料。
- **城镇**：四座生活化城镇（石桥镇、汤泉镇、铸剑谷、芦洲渡），各有不同建筑与物价。
- **存档**：`localStorage` 键 `starfall.save.v1`，800ms 防抖自动保存，刷新不丢进度。

---

## 质量与流程

- **单测**：`mobile-pwa/src/engine/__tests__/`，覆盖存档往返、经验曲线、城镇刷新、胜率估算。
- **提交钩子**：`.git/hooks/pre-commit` 跑 `npm run check`。
- **CI**：`.github/workflows/ci.yml` 在 push / PR 时跑 `npm run verify` + `npm test`。
  仓库主远端在 Gitee，若用 Gitee Go，把同样的三步（install → verify → test）配成一条流水线即可。
- **数值改动**：修改 `ENEMY_TUNING` / `CLASS_CONFIG` / `statResolver` 等强度常量前，
  先跑 `node scripts/sim_balance.mjs` 并附结果到提交说明。

---

## 部署

```bash
bash deploy-pwa.sh    # 构建并同步到 https://orange-fit.top/game/
```

Vite `base` 固定为 `/game/`，部署后需挂在该路径下；`index.html` 已带 PWA meta 与 `viewport-fit=cover`。
