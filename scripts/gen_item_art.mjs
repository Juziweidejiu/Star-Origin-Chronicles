/**
 * 生成图纸卡面插画（线性 + 淡彩，透明底）。
 * 产物：mobile-pwa/public/art/items/{blueprintId}.svg
 * 用法：node scripts/gen_item_art.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../mobile-pwa/public/art/items');
mkdirSync(outDir, { recursive: true });

const INK = '#3A2E20';
const STEEL = '#C9C2B2';
const STEEL_DARK = '#8E8779';
const WOOD = '#8A6A44';
const LEATHER = '#7A5B3C';
const PAPER = '#F3E9D6';

/** 每张图纸：品阶主色 + 画法 */
const TIER_COLOR = { 1: '#7A6C55', 2: '#3F7E6B', 3: '#6B4E9E', 4: '#B4632A', 5: '#A9761F' };

const wrap = (body, tier) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none">
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${STEEL}" />
      <stop offset="1" stop-color="${STEEL_DARK}" />
    </linearGradient>
  </defs>
  <ellipse cx="60" cy="106" rx="26" ry="4" fill="${INK}" opacity="0.10" />
  <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">
${body}
  </g>
  <circle cx="60" cy="60" r="46" stroke="${TIER_COLOR[tier]}" stroke-width="1" opacity="0.35" stroke-dasharray="2 5" />
</svg>
`;

/** 武器：剑 / 戟 / 杖 / 弓 */
const weapons = {
  bp_steel_sword: `
    <path d="M60 20 L66 30 V74 H54 V30 Z" fill="url(#edge)" />
    <path d="M60 24 V72" stroke="${INK}" stroke-width="1" opacity="0.35" />
    <path d="M44 76 H76" stroke-width="4" />
    <path d="M60 78 V96" stroke-width="5" />
    <circle cx="60" cy="99" r="4" fill="${WOOD}" />`,
  bp_breach_halberd: `
    <path d="M60 18 V104" stroke-width="4" stroke="${WOOD}" />
    <path d="M60 26 C74 30 78 46 72 58 L60 52 Z" fill="url(#edge)" />
    <path d="M60 24 L60 56" stroke-width="2" />
    <path d="M60 62 L52 74" stroke-width="3" />
    <circle cx="60" cy="24" r="4" fill="${STEEL}" />`,
  bp_wood_staff: `
    <path d="M60 30 V104" stroke-width="4" stroke="${WOOD}" />
    <path d="M60 20 C48 26 48 42 60 44 C72 42 72 26 60 20 Z" fill="${PAPER}" />
    <circle cx="60" cy="32" r="5" fill="${TIER_COLOR[2]}" opacity="0.55" />
    <path d="M46 52 C54 56 66 56 74 52" stroke-width="2" opacity="0.6" />`,
  bp_short_bow: `
    <path d="M74 22 C46 34 46 86 74 98" stroke-width="4" stroke="${WOOD}" />
    <path d="M74 22 L74 98" stroke-width="1.6" />
    <path d="M60 60 H84" stroke-width="2" stroke="${STEEL_DARK}" />
    <path d="M84 60 L78 56 M84 60 L78 64" stroke-width="2" />`,
};

/** 护甲：锁子甲 / 重铠 / 法袍 / 皮甲 */
const armors = {
  bp_chainmail: `
    <path d="M42 34 L52 28 H68 L78 34 L84 62 L74 66 L72 100 H48 L46 66 L36 62 Z" fill="${STEEL}" opacity="0.55" />
    <path d="M52 28 L60 40 L68 28" />
    <g opacity="0.5" stroke-width="1">
      <path d="M48 48 H72 M46 60 H74 M46 72 H74 M46 84 H74" />
      <path d="M54 42 V94 M66 42 V94" />
    </g>`,
  bp_heavy_plate: `
    <path d="M40 32 L54 26 H66 L80 32 L86 60 L76 64 L74 102 H46 L44 64 L34 60 Z" fill="${STEEL}" opacity="0.7" />
    <path d="M60 30 V100" stroke-width="1.6" opacity="0.5" />
    <path d="M42 48 H78 M44 66 H76" stroke-width="2.4" />
    <circle cx="60" cy="47" r="5" fill="${TIER_COLOR[4]}" opacity="0.6" />`,
  bp_weave_robe: `
    <path d="M48 26 L60 32 L72 26 L86 58 L76 64 L74 102 H46 L44 64 L34 58 Z" fill="${PAPER}" />
    <path d="M60 32 V102" stroke-width="1.4" opacity="0.5" />
    <path d="M50 66 C56 72 64 72 70 66" stroke-width="2" stroke="${TIER_COLOR[3]}" />
    <path d="M46 88 H74" stroke-width="2" opacity="0.5" />`,
  bp_ranger_leather: `
    <path d="M44 30 L60 36 L76 30 L82 60 L72 66 L70 100 H50 L48 66 L38 60 Z" fill="${LEATHER}" opacity="0.75" />
    <path d="M48 40 L74 92" stroke-width="2.4" opacity="0.8" />
    <path d="M54 56 H60 M64 56 H70" stroke-width="2" />`,
  };

/** 饰品：狼牙 / 玉佩 / 指环 / 护符 */
const trinkets = {
  bp_wolf_pendant: `
    <path d="M40 26 C52 40 68 40 80 26" stroke-width="2" />
    <path d="M60 40 C70 44 72 62 60 82 C48 62 50 44 60 40 Z" fill="${PAPER}" />
    <path d="M60 48 V76" stroke-width="1.4" opacity="0.5" />`,
  bp_jade_pendant: `
    <path d="M40 26 C52 40 68 40 80 26" stroke-width="2" />
    <circle cx="60" cy="64" r="20" fill="${TIER_COLOR[2]}" opacity="0.35" />
    <circle cx="60" cy="64" r="8" fill="${PAPER}" />
    <path d="M60 44 V34" stroke-width="2" />`,
  bp_star_ring: `
    <circle cx="60" cy="68" r="20" stroke-width="5" />
    <path d="M60 40 L64 52 L77 54 L67 62 L70 75 L60 68 L50 75 L53 62 L43 54 L56 52 Z" fill="${TIER_COLOR[4]}" opacity="0.75" />`,
  bp_bronze_amulet: `
    <path d="M40 26 C52 40 68 40 80 26" stroke-width="2" />
    <circle cx="60" cy="62" r="18" fill="${PAPER}" />
    <circle cx="60" cy="62" r="18" stroke-width="3" />
    <path d="M60 52 V72 M50 62 H70" stroke-width="2" />`,
};

const all = { ...weapons, ...armors, ...trinkets };

const tierOf = {
  bp_steel_sword: 2,
  bp_breach_halberd: 3,
  bp_wood_staff: 2,
  bp_short_bow: 2,
  bp_chainmail: 2,
  bp_heavy_plate: 4,
  bp_weave_robe: 3,
  bp_ranger_leather: 1,
  bp_wolf_pendant: 3,
  bp_jade_pendant: 4,
  bp_star_ring: 4,
  bp_bronze_amulet: 1,
};

let count = 0;
for (const [id, body] of Object.entries(all)) {
  writeFileSync(resolve(outDir, `${id}.svg`), wrap(body, tierOf[id]), 'utf8');
  count += 1;
}
console.log(`wrote ${count} item illustrations to ${outDir}`);
