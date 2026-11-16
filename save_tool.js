const fs = require('fs');
const path = require('path');
const { getSavePath, decodeSave, encodeSave, getSaveDir } = require('./save_codec');

function printUsage() {
  console.log(`
========================================================================
   Dungeons & Dynasties (地牢与门阀) - 存档查看与修改器 (CLI)
========================================================================
用法:
  node save_tool.js view [slot]
      查看指定槽位（默认1）的公会概况与阵容成员
  node save_tool.js export [slot] [out_json]
      将指定存档解密并导出为可读的 JSON 文件
  node save_tool.js import [slot] [in_json]
      将修改后的 JSON 文件重新加密、签名并回写覆盖至指定存档
  node save_tool.js modify-gold [slot] <amount>
      快速修改金币数量
  node save_tool.js modify-hero [slot] <hero_name> [ca] [pa]
      快速修改指定英雄的当前能力(CA)和潜力能力(PA) (1-200)
  node save_tool.js heal-all [slot]
      清除全队疲劳(fatigue=0)、心能压力(stress=0)、治愈所有伤病
========================================================================
`);
}

const args = process.argv.slice(2);
const command = args[0] || 'view';

function getSlot(arg) {
  const s = parseInt(arg || '1', 10);
  return isNaN(s) ? 1 : s;
}

function backupSave(slotPath) {
  const backupPath = slotPath + `.bak_${Date.now()}`;
  fs.copyFileSync(slotPath, backupPath);
  console.log(`[Backup] 已创建安全备份: ${backupPath}`);
}

async function main() {
  if (command === 'view') {
    const slot = getSlot(args[1]);
    const p = getSavePath(slot);
    if (!fs.existsSync(p)) {
      console.error(`[Error] 存档未找到: ${p}`);
      return;
    }
    const { state } = decodeSave(p);
    const g = state.guild;
    console.log(`\n=== 公会档案 (Slot ${slot}) ===`);
    console.log(`公会名称: ${g.name}`);
    console.log(`金币储备: ${g.gold} G | 声望等级: ${g.renown} | 赞助人信任度: ${g.patronConfidence || 100}%`);
    console.log(`赛程时间: 第 ${g.day || 1} 天 | 当前名册人数: ${g.roster ? g.roster.length : 0} 人`);
    console.log(`------------------------------------------------------------------------------------------------`);
    console.log(`| # | 姓名                | 种族/职业            | 年龄 | 等级 | CA / PA   | 压力 | 疲劳 | 士气 | 周薪   |`);
    console.log(`------------------------------------------------------------------------------------------------`);
    (g.roster || []).forEach((h, idx) => {
      const name = (h.name || '未知').padEnd(16, ' ');
      const classStr = `${h.raceId || 'human'} ${h.classId || 'novice'}`.padEnd(18, ' ');
      const age = String(h.age).padStart(3, ' ');
      const lvl = String(h.level).padStart(2, ' ');
      const capa = `${h.currentAbility || 0}/${h.potentialAbility || 0}`.padEnd(8, ' ');
      const str = String(h.stress || 0).padStart(3, ' ');
      const fat = String(h.fatigue || 0).padStart(3, ' ');
      const mor = String(h.morale || 100).padStart(3, ' ');
      const wage = `${h.oathWage || 0}G`.padStart(5, ' ');
      console.log(`| ${(idx + 1).toString().padStart(2, ' ')} | ${name} | ${classStr} | ${age} |  ${lvl}  | ${capa} | ${str}  | ${fat}  | ${mor}  | ${wage} |`);
    });
    console.log(`------------------------------------------------------------------------------------------------\n`);
  } else if (command === 'export') {
    const slot = getSlot(args[1]);
    const outPath = args[2] || `slot${slot}_decrypted.json`;
    const p = getSavePath(slot);
    if (!fs.existsSync(p)) {
      console.error(`[Error] 存档未找到: ${p}`);
      return;
    }
    const { state } = decodeSave(p);
    fs.writeFileSync(outPath, JSON.stringify(state, null, 2), 'utf8');
    console.log(`[Success] 存档 slot${slot} 已解密导出至: ${outPath} (大小: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
  } else if (command === 'import') {
    const slot = getSlot(args[1]);
    const inPath = args[2] || `slot${slot}_decrypted.json`;
    if (!fs.existsSync(inPath)) {
      console.error(`[Error] 未找到待导入的 JSON 文件: ${inPath}`);
      return;
    }
    const p = getSavePath(slot);
    if (fs.existsSync(p)) {
      backupSave(p);
    }
    const rawJson = fs.readFileSync(inPath, 'utf8');
    const state = JSON.parse(rawJson);
    const encoded = encodeSave(state);
    fs.writeFileSync(p, encoded, 'utf8');
    console.log(`[Success] 已成功重新加密、签名并回写至: ${p}`);
  } else if (command === 'modify-gold') {
    const slot = getSlot(args[1]);
    const amount = parseInt(args[2], 10);
    if (isNaN(amount)) {
      console.error('[Error] 请输入合法的金币数值，例如: node save_tool.js modify-gold 1 99999');
      return;
    }
    const p = getSavePath(slot);
    if (!fs.existsSync(p)) {
      console.error(`[Error] 存档未找到: ${p}`);
      return;
    }
    backupSave(p);
    const { state } = decodeSave(p);
    const oldGold = state.guild.gold;
    state.guild.gold = amount;
    fs.writeFileSync(p, encodeSave(state), 'utf8');
    console.log(`[Success] Slot ${slot} 金币修改完成: ${oldGold} -> ${amount} G`);
  } else if (command === 'heal-all') {
    const slot = getSlot(args[1]);
    const p = getSavePath(slot);
    if (!fs.existsSync(p)) {
      console.error(`[Error] 存档未找到: ${p}`);
      return;
    }
    backupSave(p);
    const { state } = decodeSave(p);
    let count = 0;
    (state.guild.roster || []).forEach(h => {
      h.stress = 0;
      h.fatigue = 0;
      h.injury = null;
      h.condition = 100;
      count++;
    });
    fs.writeFileSync(p, encodeSave(state), 'utf8');
    console.log(`[Success] Slot ${slot} 全队治愈完成！共净化 ${count} 位英雄的压力、疲劳与伤病。`);
  } else if (command === 'modify-hero') {
    const slot = getSlot(args[1]);
    const targetName = args[2];
    const ca = parseInt(args[3], 10);
    const pa = parseInt(args[4], 10);
    if (!targetName) {
      console.error('[Error] 请提供英雄姓名，例如: node save_tool.js modify-hero 1 乌尔苏拉 150 180');
      return;
    }
    const p = getSavePath(slot);
    if (!fs.existsSync(p)) {
      console.error(`[Error] 存档未找到: ${p}`);
      return;
    }
    const { state } = decodeSave(p);
    const hero = (state.guild.roster || []).find(h => h.name && h.name.includes(targetName));
    if (!hero) {
      console.error(`[Error] 未找到包含名称 "${targetName}" 的英雄`);
      return;
    }
    backupSave(p);
    if (!isNaN(ca)) hero.currentAbility = Math.min(200, Math.max(1, ca));
    if (!isNaN(pa)) hero.potentialAbility = Math.min(200, Math.max(1, pa));
    fs.writeFileSync(p, encodeSave(state), 'utf8');
    console.log(`[Success] 英雄 "${hero.name}" 属性修改完成: CA=${hero.currentAbility}, PA=${hero.potentialAbility}`);
  } else {
    printUsage();
  }
}

main().catch(err => {
  console.error('[Fatal Error]', err);
});
