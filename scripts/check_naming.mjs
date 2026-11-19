/**
 * 命名红线门禁：扫描 mobile-pwa/src 下所有字符串字面量、模板字符串与 JSX 文本，
 * 命中颜色字 / 冷热词即失败。零豁免（规则定义文件本身除外）。
 *
 * 注释不参与扫描，避免误伤设计说明。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANNED_COLOR_AND_TEMP_CHARS, SKIP_FILES } from './naming_rules.mjs';

const ROOT = fileURLToPath(new URL('../mobile-pwa', import.meta.url));
const SRC = join(ROOT, 'src');
const BANNED = new Set(BANNED_COLOR_AND_TEMP_CHARS);
const SKIP = new Set(SKIP_FILES);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(name))) out.push(p);
  }
  return out;
}

/**
 * 去掉注释，保留字符串与 JSX 文本；同时记录每个字符的原始行号。
 */
function stripComments(source) {
  const out = [];
  const lines = [];
  let line = 1;
  let state = 'code'; // code | line | block | single | double | template
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '\n') {
      line += 1;
      if (state === 'line') state = 'code';
      if (state !== 'block') {
        out.push(ch);
        lines.push(line - 1);
      }
      continue;
    }

    if (state === 'line') continue;
    if (state === 'block') {
      if (ch === '*' && next === '/') { state = 'code'; i += 1; }
      continue;
    }

    if (state === 'code') {
      if (ch === '/' && next === '/') { state = 'line'; i += 1; continue; }
      if (ch === '/' && next === '*') { state = 'block'; i += 1; continue; }
      if (ch === "'") state = 'single';
      else if (ch === '"') state = 'double';
      else if (ch === '`') state = 'template';
      out.push(ch);
      lines.push(line);
      continue;
    }

    // 字符串内部
    if (ch === '\\') {
      out.push(ch);
      lines.push(line);
      if (i + 1 < source.length) {
        i += 1;
        if (source[i] === '\n') line += 1;
        out.push(source[i]);
        lines.push(line);
      }
      continue;
    }
    if ((state === 'single' && ch === "'") || (state === 'double' && ch === '"') || (state === 'template' && ch === '`')) {
      state = 'code';
    }
    out.push(ch);
    lines.push(line);
  }
  return { text: out.join(''), lines };
}

const problems = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split('\\').join('/');
  if (SKIP.has(rel)) continue;
  const { text, lines } = stripComments(readFileSync(file, 'utf8'));
  for (let i = 0; i < text.length; i += 1) {
    if (!BANNED.has(text[i])) continue;
    const from = Math.max(0, i - 12);
    const to = Math.min(text.length, i + 12);
    problems.push({
      file: rel,
      line: lines[i],
      char: text[i],
      context: text.slice(from, to).replace(/\s+/g, ' ').trim(),
    });
  }
}

if (problems.length === 0) {
  console.log('[naming] 通过：未发现颜色字 / 冷热词。');
  process.exit(0);
}

console.error(`[naming] 失败：发现 ${problems.length} 处颜色字 / 冷热词。规则见 docs/LEXICON_AND_GATES.md`);
for (const p of problems) {
  console.error(`  ${p.file}:${p.line}  「${p.char}」  …${p.context}…`);
}
process.exit(1);
