#!/usr/bin/env node
/**
 * 安装本地 Git 钩子（不引入 husky 依赖）。
 *
 * 由 package.json 的 "prepare" 脚本在 `npm install` 后自动执行，
 * 也可以手动跑：npm run setup:hooks
 *
 * 钩子内容刻意保持极简：只跑 `npm run check`（tsc -b && oxlint），
 * 不跑 build、不跑测试，保证每次提交的等待时间在 1~2 秒内。
 * 需要更强门禁时用 `npm run verify`，不必塞进钩子。
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

let hooksDir;
try {
  const gitDir = execSync('git rev-parse --absolute-git-dir', { encoding: 'utf8' }).trim();
  hooksDir = join(gitDir, 'hooks');
} catch {
  console.warn('[hooks] 当前目录不在 Git 仓库内，跳过钩子安装。');
  process.exit(0);
}

const PRE_COMMIT = `#!/bin/sh
# 由 mobile-pwa/scripts/install-hooks.mjs 自动生成，请勿手改。
# 提交前跑类型检查 + lint。应急绕过：git commit --no-verify
if [ ! -d mobile-pwa/node_modules ]; then
  echo "[pre-commit] 未找到 mobile-pwa/node_modules，跳过检查。"
  exit 0
fi
cd mobile-pwa || exit 1
npm run --silent check
if [ $? -ne 0 ]; then
  echo ""
  echo "[pre-commit] 类型检查或 lint 未通过，提交已中止。"
  echo "          修完再提交；确需绕过用：git commit --no-verify"
  exit 1
fi
`;

mkdirSync(hooksDir, { recursive: true });
const target = join(hooksDir, 'pre-commit');
writeFileSync(target, PRE_COMMIT, { mode: 0o755 });
try {
  chmodSync(target, 0o755);
} catch {
  /* Windows 上可能不支持，忽略 */
}
console.log(`[hooks] 已安装 pre-commit 钩子 → ${target}`);
