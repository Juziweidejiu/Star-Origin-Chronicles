/**
 * 战斗/地牢平衡模拟器
 * 用法: node scripts/sim_balance.mjs [runs] [stars...]
 * 例:   node scripts/sim_balance.mjs 200 1 2 3
 *
 * 通过 Vite 的 ssrLoadModule 直接 import TS 引擎，保证与线上代码同源。
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../mobile-pwa');

// vite 装在 mobile-pwa 里，root 目录直接 import 'vite' 解析不到，走绝对路径
const { createServer } = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);

const runs = Number(process.argv[2] || 200);
const starArgs = process.argv.slice(3).map(Number).filter(n => n >= 1 && n <= 5);
const stars = starArgs.length ? starArgs : [1, 2, 3, 4, 5];

const server = await createServer({
  root,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
});

const load = p => server.ssrLoadModule(p);

const { generateDungeonFromContract, generateRandomLoot } = await load('/src/engine/dungeonEngine.ts');
const { CombatEngine } = await load('/src/engine/combatEngine.ts');
const { generateHero } = await load('/src/engine/heroFactory.ts');
const { resolveStats } = await load('/src/engine/statResolver.ts');
const { createEnemyParty } = await load('/src/engine/enemyFactory.ts');
const enemyMod = await load('/src/engine/enemyFactory.ts');
const { ENEMY_TUNING } = enemyMod;

/**
 * 玩家阵容。
 * 装备按「上一星级」的水平模拟成长曲线：1★ 裸装，5★ 带 T4 装备。
 */
function makeRoster(star = 1) {
  const squad = [
    generateHero('blademaster', true, 'female'),
    generateHero('guardian', false, 'male'),
    generateHero('cleric', false, 'female'),
    generateHero('ranger', false, 'male'),
  ];
  const gearTier = Math.max(0, star - 1);
  if (gearTier > 0) {
    for (const hero of squad) {
      hero.equipment.weapon = generateRandomLoot(gearTier);
      hero.equipment.armor = generateRandomLoot(gearTier);
      hero.equipment.trinket = generateRandomLoot(gearTier);
      // 保证槽位正确
      const slots = ['weapon', 'armor', 'trinket'];
      for (const slot of slots) {
        let item = hero.equipment[slot];
        let guard = 0;
        while (item && item.slot !== slot && guard++ < 12) {
          item = generateRandomLoot(gearTier);
        }
        hero.equipment[slot] = item && item.slot === slot ? item : undefined;
      }
    }
  }
  return squad;
}

function makeContract(stars) {
  return {
    id: `sim_${stars}`,
    title: '模拟契约',
    type: 'bandit_camp',
    stars,
    townId: 'frostmoon_keep',
    enemyClasses: ['guardian', 'blademaster', 'arcanist', 'ranger'],
    enemyLevel: stars,
    rewardGold: 100,
    rewardSoulCrystals: 1,
    durationDays: 1,
    description: '',
  };
}

function runBattle(squad, room, stars) {
  const enemies = createEnemyParty(room.enemyClasses || ['guardian'], room.enemyLevel || stars, Boolean(room.isBoss));
  // 模拟实战中玩家采用【盾墙】阵型布阵 (护卫前排、剑圣/游侠中排、医官后排)
  const slotMap = {};
  for (const h of squad) {
    if (h.role === 'tank') slotMap[h.id] = 'front_center';
    else if (h.role === 'healer') slotMap[h.id] = 'back_center';
    else slotMap[h.id] = 'mid_center';
  }
  const engine = new CombatEngine(squad, enemies, slotMap);
  let elapsed = 0;
  while (!engine.isFinished && elapsed < 240) {
    engine.tick(0.05);
    elapsed += 0.05;
  }
  for (const u of engine.units.filter(u => u.side === 'player')) {
    const hero = squad.find(h => h.id === u.hero.id);
    if (!hero) continue;
    if (engine.winner === 'player') {
      hero.currentHp = u.isDead ? Math.max(1, Math.round(u.maxHp * 0.15)) : Math.min(u.maxHp, u.currentHp + Math.round(u.maxHp * 0.08));
    } else {
      hero.currentHp = Math.max(1, Math.round(u.maxHp * 0.2));
    }
  }
  return { winner: engine.winner, elapsed, rounds: engine.logs.length };
}

function runDungeon(stars) {
  const squad = makeRoster(stars);
  for (const h of squad) {
    h.maxHp = resolveStats(h).maxHp;
    h.currentHp = h.maxHp;
  }
  const dungeon = generateDungeonFromContract(makeContract(stars));
  let roomIndex = 0;

  for (const room of dungeon.rooms) {
    roomIndex++;
    if (room.type === 'battle' || room.type === 'boss') {
      const res = runBattle(squad, room, stars);
      if (res.winner !== 'player') return { cleared: false, reached: roomIndex, total: dungeon.rooms.length };
    } else if (room.type === 'trap') {
      const vanguard = squad.slice().sort((a, b) => b.attributes.agility - a.attributes.agility)[0];
      const success = (vanguard?.attributes.agility || 10) >= 12;
      if (!success && vanguard) vanguard.currentHp = Math.max(1, vanguard.currentHp - (room.trapDamage || 20));
    } else if (room.type === 'camp') {
      for (const h of squad) h.currentHp = Math.min(h.maxHp, h.currentHp + Math.round(h.maxHp * 0.25));
    }
  }
  return { cleared: true, reached: dungeon.rooms.length, total: dungeon.rooms.length };
}

function measure(star, n) {
  let clears = 0;
  let reachedSum = 0;
  const wipeAt = {};
  for (let i = 0; i < n; i++) {
    const res = runDungeon(star);
    if (res.cleared) clears++;
    else {
      reachedSum += res.reached;
      wipeAt[res.reached] = (wipeAt[res.reached] || 0) + 1;
    }
  }
  return {
    rate: (clears / n) * 100,
    avgReach: clears === n ? '—' : (reachedSum / (n - clears)).toFixed(1),
    wipeAt,
  };
}

if (process.argv.includes('--grid')) {
  const runsPerCell = Number(process.argv[process.argv.indexOf('--grid') + 1]) || 40;
  const targets = { 1: 80, 2: 65, 3: 50, 4: 35, 5: 20 };
  const results = [];

  for (const a of [0.15, 0.22, 0.3]) {
    for (const h of [0.2, 0.3, 0.4]) {
      for (const bossHp of [1.9, 2.2, 2.5]) {
        for (let i = 0; i < 5; i++) {
          ENEMY_TUNING.attrByStars[i] = 1 + a * i;
          ENEMY_TUNING.hpByStars[i] = 1 + h * i;
          ENEMY_TUNING.bossExtraByStars[i] = 0;
        }
        ENEMY_TUNING.bossHpMult = bossHp;

        const rates = {};
        let score = 0;
        for (const star of [1, 2, 3, 4, 5]) {
          rates[star] = measure(star, runsPerCell).rate;
          score += Math.abs(rates[star] - targets[star]);
        }
        results.push({ a, h, bossHp, rates, score });
      }
    }
  }

  results.sort((x, y) => x.score - y.score);
  console.log('candidates (target 80/65/50/35/20):');
  for (const r of results.slice(0, 10)) {
    console.log(
      `  attr+${r.a}/star hp+${r.h}/star bossHp=${r.bossHp} -> ` +
        [1, 2, 3, 4, 5].map(s => `${s}star:${r.rates[s].toFixed(0)}%`).join(' ') +
        `  |dev ${r.score.toFixed(0)}`,
    );
  }
  await server.close();
  process.exit(0);
}

if (process.argv.includes('--detail')) {
  const n = Number(process.argv[process.argv.indexOf('--detail') + 1]) || 60;
  for (const star of [1, 2, 3, 4, 5]) {
    const rows = [];
    for (const [label, count, boss] of [['warmup2', 2, false], ['normal3', 3, false], ['boss3', 3, true]]) {
      let wins = 0;
      let time = 0;
      let hpLeft = 0;
      for (let i = 0; i < n; i++) {
        const squad = makeRoster(star);
        for (const h of squad) { h.maxHp = resolveStats(h).maxHp; h.currentHp = h.maxHp; }
        const room = {
          enemyClasses: new Array(count).fill('blademaster'),
          enemyLevel: star,
          isBoss: boss,
        };
        const res = runBattle(squad, room, star);
        if (res.winner === 'player') wins++;
        time += res.elapsed;
        hpLeft += squad.reduce((s, h) => s + h.currentHp / h.maxHp, 0) / squad.length;
      }
      rows.push(`${label} win ${(wins / n * 100).toFixed(0)}% ${(time / n).toFixed(1)}s hpLeft ${(hpLeft / n * 100).toFixed(0)}%`);
    }
    console.log(`${star}star: ${rows.join(' | ')}`);
  }
  await server.close();
  process.exit(0);
}

const summary = [];
for (const star of stars) {
  const res = measure(star, runs);
  summary.push({ star, ...res });
  console.log(
    `${star}star clear ${res.rate.toFixed(1).padStart(5)}%  avgWipeRoom ${String(res.avgReach).padStart(4)}  wipeAt ${JSON.stringify(res.wipeAt)}`,
  );
}

const target = [80, 65, 50, 35, 20];
console.log('\ntarget curve: ' + target.map((t, i) => `${i + 1}star ${t}%`).join('  '));
console.log('actual curve: ' + summary.map(s => `${s.star}star ${s.rate.toFixed(0)}%`).join('  '));

await server.close();
