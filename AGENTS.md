# 星原战纪 · 开发指南

移动端 PWA 地牢冒险 RPG（React 19 + Vite 8 + TypeScript）。本文件是给**人和 AI 会话**看的上手说明：先读这里，再读 `TODO.md`（待办与优先级）与 `PROJECT_HANDOFF.md`（逐里程碑交付记录）。

---

## 1. 目录结构

| 路径 | 说明 |
| --- | --- |
| `mobile-pwa/` | **应用本体**，所有业务代码在这里 |
| `mobile-pwa/src/engine/` | 纯逻辑引擎（无 React），可单测 |
| `mobile-pwa/src/components/` | 界面组件，`ui/` 下是公共原件 |
| `mobile-pwa/src/types/` | 类型定义（`hero` / `world` / `dungeon` / `formation` / `guild` …） |
| `design/` | UI 原型与截图壳页（**未纳入构建**，本地静态预览用） |
| `scripts/` | 逆向分析脚本与数值模拟（`sim_balance.mjs`） |
| `PROJECT_HANDOFF.md` | 每个里程碑做了什么、验证数据 |
| `TODO.md` | 当前优先级（P0/P1/P2） |
| `DUNGEONS_AND_DYNASTIES_REVERSE_ENGINEERING_WHITEPAPER.md` | 原版机制逆向白皮书（**无 UI 章节**） |

> `src/engine/` 里只有纯函数与纯数据类。**不要在引擎里 import React 或操作 DOM**，否则单测跑不起来。

---

## 2. 常用命令

在 `mobile-pwa/` 下执行：

```bash
npm run dev        # 开发服务器 http://127.0.0.1:5199/game/（端口已在 vite.config.ts 固定）
npm run check      # 类型检查 + lint（提交前跑这个，约 1s）
npm run test       # vitest 单测（引擎层）
npm run build      # 生产构建
npm run verify     # 完整门禁：类型 + lint + 构建
```

**提交前必须 `npm run check` 通过。** 仓库已装好 `pre-commit` 钩子（由 `npm run setup:hooks` 或 `npm install` 自动安装），检查不过会直接拦住提交。应急绕过：`git commit --no-verify`。

---

## 3. 调试入口（URL 参数）

免去手动点击，直接落在目标界面：

| 参数 | 例 | 说明 |
| --- | --- | --- |
| `?tab=` | `?tab=roster` | `town` / `dungeon` / `combat` / `roster` / `story` |
| `?b=` | `?b=blacksmith` | 城镇建筑子页：`guild` / `tavern` / `market` / `infirmary` / `sanctuary` / `blacksmith` |

例：`http://127.0.0.1:5199/game/?tab=roster`

---

## 4. 截图 / 视觉自查管线

内置浏览器截图工具在无前台窗口时不可用，用 **headless Chrome + iframe 壳页**代替：

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --disable-gpu --hide-scrollbars `
  --disable-web-security --user-data-dir="$env:TEMP\chrome-prof" `
  --force-device-scale-factor=2 --window-size=420,900 --virtual-time-budget=9000 `
  --screenshot="$env:TEMP\shot.png" "http://127.0.0.1:5200/design/_shot-game.html"
```

要点：
- 静态壳页由 `python -m http.server 5200 --bind 127.0.0.1`（根目录 `D:\reverseGame`）提供。
- 壳页用 iframe 固定 390×844 或 360×640；**跨端口操作 iframe 必须加 `--disable-web-security`**。
- 现成壳页：`_shot-game`（城镇）、`_shot-roster`、`_shot-dungeon`（自动点接取）、`_shot-combat`、`_shot-smith`、`_shot.html`(390) / `_shot2.html`(360)。

---

## 5. 样式约定

- **没有 Tailwind，也没有组件库。** Tailwind 类名在这里不会生效。
- 全局设计 token 与公共类都在 `src/index.css`，前缀 `pz-`：
  `--pz-page / --pz-sunken / --pz-raised`（纸面三层）、`--pz-ink*`（墨色）、`--pz-brass`（黄铜）、`--pz-wine`（酒红，主行动色）、`--pz-town/dungeon/combat/success/arcane`（语义色）。
- 公共类：`.pz-card`、`.pz-btn(--main/--brass/--ghost/--quiet)`、`.pz-seal(--s~--d)`、`.pz-tag`、`.pz-bar`、`.pz-masthead`。
- 公共组件在 `src/components/ui/`：`Masthead / Card / Btn / Seal / Tag / StatBar / WinRing`。
- 正文最小 **12px**，需要读懂的长句不低于 **14px**；10–11px 只用于 2–6 字的标签。
- 图标统一用 `lucide-react`，不要用 emoji 当图标。

---

## 6. 存档

- 键名 `starfall.save.v1`，`SAVE_VERSION = 1`，实现在 `src/engine/saveEngine.ts`。
- 序列化范围：城镇（声望/后勤/契约/招募/英灵）、名册、首发、阵型、背包、当前契约与地牢进度。
- **战斗瞬时态不存盘**（引擎实例、跳字、弹道、结算面板）。
- 自动保存：每次渲染写快照 ref + 800ms 防抖；`pagehide` / `visibilitychange` 立即落盘。
- 重开新档：`suspendSave()` → `clearSave()` → reload（顺序不能反，否则防抖会把旧档写回）。

---

## 7. 改数值前先跑模拟

`scripts/sim_balance.mjs` 是蒙特卡洛战斗回归。改动 `ENEMY_TUNING`、`CLASS_CONFIG`、`statResolver` 等影响强度的常量前先跑一遍，并附结果到提交说明。目标曲线见 `TODO.md`。

---

## 8. 提交规范

```
feat(scope): 说明
fix(scope): 说明
perf(scope): 说明
style(scope): 说明
docs: 说明
```

每个里程碑完成后：更新 `PROJECT_HANDOFF.md` → `npm run check` → 提交 → 推送两个远程：

```bash
git push origin main    # Gitee（主仓）
git push github main    # GitHub 镜像，触发免费的 Actions CI
```

GitHub 侧是**公开仓库**，Actions 分钟数不限，`.github/workflows/ci.yml` 会自动跑 `npm ci → check → test → build`。
Gitee Go（`.workflows/ci.yml`）是付费功能，本项目不使用。
