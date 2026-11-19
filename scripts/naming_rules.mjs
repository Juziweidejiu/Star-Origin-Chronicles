/**
 * 命名红线规则（与 src/types/narrative.ts 保持同一份口径）
 * 改这里必须同步改 narrative.ts，并在 docs/LEXICON_AND_GATES.md 记录。
 */
export const BANNED_COLOR_AND_TEMP_CHARS = [
  '青', '黑', '红', '赤', '朱', '白', '黄', '金', '银', '蓝', '绿',
  '紫', '翠', '碧', '苍', '灰', '墨', '乌', '寒', '热', '冰', '霜',
  '炎', '烈', '暖',
];

/** 门禁跳过的文件：规则定义本身 */
export const SKIP_FILES = ['src/types/narrative.ts'];
