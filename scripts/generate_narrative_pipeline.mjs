#!/usr/bin/env node

/**
 * ==============================================================================
 * 《星原战纪》东方二次元奇幻探险叙事生成与质检流水线
 * 
 * 核心基调：
 * 1. 探险 (Exploration)、生存 (Survival)、浪漫羁绊 (Camaraderie)、对抗危机 (Crisis)
 * 2. 角色：东亚二次元风，男女参半，全员英姿飒爽、各有千秋、强劲实力
 * 3. 【核心铁律·禁远古高等文明】：
 *    - 历史发展严格线性，不存在任何“远古文明”、“超古代神迹”、“失落科技”、“先祖魔法断代”。
 *    - 严禁出现“青铜守卫”、“古代守卫”、“构装体傀儡”、“超古代遗物”。
 *    - 副本生态：哥布林与异族矿洞、猛兽与龙穴、地质迷宫溶洞、当朝/前朝边塞旧址与王陵、演武试炼场。
 * 4. 严禁网文浮夸抒情（修罗场、毁天灭地、苍穹、蝼蚁等）与虚假血浆煽情。
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 自动加载根目录 .env 与 .env.local（若存在）
function loadEnv() {
  const projectRoot = path.resolve(__dirname, '..');
  for (const file of ['.env', '.env.local']) {
    const fullPath = path.join(projectRoot, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

// 违禁词库：网文滥俗词 + 严厉禁止“远古高文明/失落科技/青铜守卫”词汇
const PURPLE_PROSE_BLACKLIST = [
  // 1. 严禁非线性世界观与古文明机械词
  '远古', '古文明', '超古代', '失落文明', '先祖科技', '先史', '史前',
  '青铜守卫', '古代守卫', '古神', '断代遗产', '高维', '遗落科技',

  // 2. 网文常见中二夸张词
  '瞳孔骤缩', '瞳孔微缩', '倒吸一口凉气', '嘴角泛起冷笑', '嘴角勾起一抹',
  '修罗场', '宛如地狱般的', '血雾喷涌', '血肉横飞', '恐怖如斯',
  '碎成齑粉', '毁天灭地', '苍穹', '滔天', '宛若神明', '蝼蚁',
  '桀桀', '暴怒如狂', '震颤不已', '冷冽的杀意', '杀神附体',
  '深不可测', '撕心裂肺', '生不如死', '骇人听闻'
];

// 系统设定与生成Prompt
const NARRATIVE_DESIGNER_SYSTEM_PROMPT = `
你是一名资深东亚二次元奇幻探险战记（如《星原战纪》）的首席叙事文案设计师。
你的任务是为移动端角色扮演游戏生成【探索奇遇事件】与【营地伙伴短对话】。

【四大核心基调】：
1. 【探险】：聚焦未知探索的惊险与好奇，涵盖五大生态（赤耳哥布林矿洞、猛兽与飞龙巢穴、地质晶石迷宫、前朝沉陷关隘武库、军门实战试炼场）。
2. 【生存】：充满真实冒险生活细节（烹饪野炊、整理箭羽、擦拭刀剑、采药包扎），绝非自虐式绝望。
3. 【浪漫羁绊】：东亚二次元风，男女参半，全员英姿飒爽、各有千秋、强劲实力（男：沈云舒、陆曜、裴少陵、秦渊、顾平川；女：楚清弦、季秋水、温竹君、白苏、墨微凉），彼此信任，配合默契。
4. 【对抗危机】：在边塞风云与魔物侵袭中共同破局。

【绝对世界观铁律·禁远古高等文明】：
- 严禁出现“远古文明”、“超古代科技”、“失落魔法”、“先民遗产”！
- 严禁出现“青铜守卫”、“古代守卫”、“构装体傀儡”！
- 人类历史是实打实【线性发展】的，当今各城邦的铁器、机关、火器即为历史一步一个脚印演进的最高水准。

【字数与UI硬约束】：
- 奇遇场景 hook: 80~130字（白描生动，环境细节与战术考量清晰）。
- 选项 label: 6~12字（动词打头，战术明确）。
- 选项 flavor: 15~28字。
- 结算 narrative: 40~75字。
- 营地短台词: 15~35字（有名字、性格鲜明、战术与烟火气）。

【死刑黑名单】：绝对严禁使用任何网文词汇（瞳孔骤缩、倒吸凉气、嘴角冷笑、血雾、修罗场等）以及古文明词（远古、超古代、青铜守卫等）。

输出必须为严格合法的 JSON 对象，不带任何 Markdown 包裹或解释。
`;

/**
 * 文本质检器：字数与违禁词检查
 */
function validateText(text, maxLen, fieldName) {
  const issues = [];
  if (!text || typeof text !== 'string') {
    issues.push(`[${fieldName}] 缺失或非字符串`);
    return issues;
  }
  if (text.length > maxLen) {
    issues.push(`[${fieldName}] 超长 (${text.length}/${maxLen}字)`);
  }
  for (const bad of PURPLE_PROSE_BLACKLIST) {
    if (text.includes(bad)) {
      issues.push(`[${fieldName}] 命中违禁词: "${bad}"`);
    }
  }
  return issues;
}

/**
 * 完整事件 Schema 校验
 */
function validateEvent(event) {
  const errors = [];
  if (!event.id || !event.title || !event.hook || !Array.isArray(event.choices)) {
    errors.push('基础字段缺失 (id, title, hook, choices)');
    return { valid: false, errors };
  }

  errors.push(...validateText(event.title, 14, 'title'));
  errors.push(...validateText(event.hook, 145, 'hook'));

  if (event.choices.length < 2 || event.choices.length > 3) {
    errors.push(`选项数量应为2-3个，当前为 ${event.choices.length}`);
  }

  event.choices.forEach((c, idx) => {
    errors.push(...validateText(c.label, 14, `choice[${idx}].label`));
    if (c.flavor) errors.push(...validateText(c.flavor, 35, `choice[${idx}].flavor`));
    if (c.successConsequence?.resultNarrative) {
      errors.push(...validateText(c.successConsequence.resultNarrative, 85, `choice[${idx}].success.narrative`));
    }
    if (c.failureConsequence?.resultNarrative) {
      errors.push(...validateText(c.failureConsequence.resultNarrative, 85, `choice[${idx}].failure.narrative`));
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 真实 LLM API 生成（支持 OpenAI / Gemini / 兼容 OpenAI 协议的本地代理）
 */
async function callLlmApi(prompt, apiKey, baseUrl) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const modelName = process.env.LLM_MODEL || (baseUrl.includes('8317') ? 'gemini-3.8-flash-tiered' : 'gpt-4o-mini');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: NARRATIVE_DESIGNER_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API 响应错误 [${response.status}]: ${errText}`);
  }

  const json = await response.json();
  const rawContent = json.choices?.[0]?.message?.content || '{}';
  const cleanJson = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleanJson);
}

/**
 * 内置的高质量合成生成器（用于离线测试或 CI 质检流水线演示）
 */
function generateSyntheticEvent(index) {
  const templates = [
    {
      title: '赤耳哥布林的积铁坑',
      theme: 'goblin_cave',
      category: 'encounter',
      hook: '废弃矿道拐角处挖了个深坑，坑底堆满哥布林从行商马车上抢来的生铁锭与碎银两。上方拉着几根系着羊骨铃铛的极细韧藤。',
      choices: [
        {
          id: `c_${index}_1`,
          label: '由秦渊飞爪取铁锭',
          flavor: '避开骨铃暗锁，需极高的轻身手法。',
          successRate: 0.8,
          successConsequence: {
            stressChange: -5,
            moraleChange: 10,
            goldChange: 130,
            resultNarrative: '飞爪无声扣住麻袋。全队利落地将精铁块拉起，未发出一丝声响。'
          },
          failureConsequence: {
            stressChange: 15,
            moraleChange: -5,
            hpPercentChange: -5,
            resultNarrative: '骨铃被藤条扯响，黑暗中射来两排竹箭，擦伤了掩护的前排皮甲。'
          }
        },
        {
          id: `c_${index}_2`,
          label: '楚清弦重戟破网扫除',
          flavor: '以强悍正面武力扫碎埋伏。',
          successRate: 1.0,
          successConsequence: {
            stressChange: 5,
            moraleChange: 15,
            goldChange: 70,
            resultNarrative: '重戟横空砸断支撑木架。几只惊慌失措的哥布林尖叫逃窜。'
          }
        }
      ]
    },
    {
      title: '雷鸣飞龙崖脱落龙鳞',
      theme: 'dragon_roost',
      category: 'hunt',
      hook: '陡峭岩缝间挂着一层泛着青紫微光的蜕化龙鳞，足有半面圆盾大。万仞绝壁上方传来飞龙高亢的厉啼，狂风扑面。',
      choices: [
        {
          id: `c_${index}_1`,
          label: '由沈云舒攀岩采割',
          flavor: '剑术身法轻灵，但风势极其凶猛。',
          successRate: 0.75,
          successConsequence: {
            stressChange: -5,
            moraleChange: 15,
            goldChange: 180,
            resultNarrative: '云舒踏岩如飞，长剑精准剔下完整鳞片，防雷甲片入手。'
          },
          failureConsequence: {
            stressChange: 20,
            moraleChange: -5,
            hpPercentChange: -10,
            resultNarrative: '岩层碎裂，滑落时手腕被尖石割破，但全队迅速退入岩洞。'
          }
        },
        {
          id: `c_${index}_2`,
          label: '顾平川张重弓戒备',
          flavor: '放弃采鳞，全神贯注警戒龙巢动向。',
          successRate: 1.0,
          successConsequence: {
            stressChange: -10,
            moraleChange: 5,
            resultNarrative: '重箭在弦，队伍趁飞龙盘旋入云的间隙安全脱离了威胁区域。'
          }
        }
      ]
    }
  ];

  const base = templates[index % templates.length];
  return {
    id: `synth_event_${Date.now()}_${index}`,
    ...base
  };
}

/**
 * 营地台词生成器
 */
function generateSyntheticDialogues() {
  return [
    {
      id: `camp_gen_${Date.now()}_1`,
      speakerName: '陆曜',
      personality: 'heroic',
      condition: 'cooking',
      text: '今晚炖了雪原野猪肉配松子，多喝一碗驱寒，明天顶住飞龙风压。'
    },
    {
      id: `camp_gen_${Date.now()}_2`,
      speakerName: '楚清弦',
      personality: 'heroic',
      condition: 'repairing',
      text: '矿坑里的机关很多，大家盯紧脚下，正面冲阵交给我和大戟！'
    },
    {
      id: `camp_gen_${Date.now()}_3`,
      speakerName: '季秋水',
      personality: 'stoic',
      condition: 'after_victory',
      text: '刚才那一刀出得很顺畅。你的侧翼策应时机抓得很好，多谢。'
    }
  ];
}

/**
 * 运行主入口
 */
async function main() {
  console.log('='.repeat(70));
  console.log('🛡️  《星原战纪》东方二次元奇幻探险叙事生成与质检流水线');
  console.log('='.repeat(70));

  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  let generatedEvents = [];
  let generatedDialogues = [];

  if (apiKey) {
    console.log(`📡 检测到 API 密钥，开始通过远程 LLM (${baseUrl}) 批量生成...`);
    const prompt = `请生成 2 个探索奇遇事件和 3 条营地台词。
【严格约束】：
1. 游戏为东方二次元奇幻探险战记《星原战纪》，基调为探险、生存、浪漫羁绊与对抗危机。
2. 绝对严禁“远古、古文明、超古代、失落科技、青铜守卫”等词汇！历史严格线性发展！
3. 事件生态可选：哥布林矿洞(goblin_cave)、飞龙巢穴(dragon_roost)、猛兽雪猿窟(beast_den)、晶石溶洞迷宫(labyrinth)、前朝关隘(frontier_fort)。
4. 角色采用东亚二次元姓名（男：沈云舒、陆曜、裴少陵、秦渊、顾平川；女：楚清弦、季秋水、温竹君、白苏、墨微凉），男女参半，英姿飒爽，实力强劲。
5. 营地台词必须极简短（控制在15~30字之间，严禁超长，体现野炊、修武器、并肩战友感）。

必须严格输出满足以下格式的 JSON 对象：
{
  "events": [
    {
      "id": "ev_llm_1",
      "title": "标题(6-10字)",
      "theme": "goblin_cave",
      "category": "encounter",
      "hook": "80-130字生动现场白描与探索细节",
      "choices": [
        {
          "id": "c_1",
          "label": "动词开头(6-12字)",
          "flavor": "15-28字战术抉择考量",
          "successRate": 0.75,
          "successConsequence": {
            "stressChange": -5,
            "goldChange": 120,
            "resultNarrative": "40-75字成功结算描述"
          },
          "failureConsequence": {
            "stressChange": 15,
            "hpPercentChange": -8,
            "resultNarrative": "40-75字受挫结算描述"
          }
        },
        {
          "id": "c_2",
          "label": "稳妥对策(6-12字)",
          "flavor": "15-28字稳妥戒备考量",
          "successRate": 1.0,
          "successConsequence": {
            "stressChange": 0,
            "resultNarrative": "40-75字稳妥脱离描述"
          }
        }
      ]
    }
  ],
  "dialogues": [
    {
      "id": "camp_llm_1",
      "speakerName": "陆曜",
      "personality": "heroic",
      "condition": "cooking",
      "text": "简短台词(15~30字，带生活与战意，严禁超35字)"
    }
  ]
}`;
    try {
      const result = await callLlmApi(prompt, apiKey, baseUrl);
      if (result.events) generatedEvents = result.events;
      if (result.dialogues) generatedDialogues = result.dialogues;
    } catch (err) {
      console.warn(`⚠️ 远程 API 调用失败 (${err.message})，回退至流水线基准合成生成器。`);
      generatedEvents = [generateSyntheticEvent(1), generateSyntheticEvent(2)];
      generatedDialogues = generateSyntheticDialogues();
    }
  } else {
    console.log('💡 未设置 OPENAI_API_KEY，启用内置基准合成生成器演示质检流水线...');
    generatedEvents = [generateSyntheticEvent(1), generateSyntheticEvent(2)];
    generatedDialogues = generateSyntheticDialogues();
  }

  console.log(`\n🔍 开始执行叙事质检验收（共 ${generatedEvents.length} 个事件，${generatedDialogues.length} 条台词）:`);
  
  let passedCount = 0;
  const validatedEvents = [];

  for (const ev of generatedEvents) {
    const check = validateEvent(ev);
    if (check.valid) {
      console.log(`  ✅ 事件 [${ev.title}] (${ev.id}) 质检通过！生态明确，无古文明/网文词，字数达标。`);
      validatedEvents.push(ev);
      passedCount++;
    } else {
      console.error(`  ❌ 事件 [${ev.title || '未知'}] 质检不合格，已被拦截丢弃:`);
      check.errors.forEach(e => console.error(`     - ${e}`));
    }
  }

  // 质检台词
  const validatedDialogues = [];
  for (const d of generatedDialogues) {
    const errs = validateText(d.text, 35, 'camp.dialogue');
    if (errs.length === 0) {
      console.log(`  ✅ 营地台词 [${d.speakerName || d.personality}]: "${d.text}"`);
      validatedDialogues.push(d);
    } else {
      console.error(`  ❌ 营地台词违规: ${errs.join(', ')}`);
    }
  }

  // 导出到前端 assets / data 目录
  const outDir = path.resolve(__dirname, '../mobile-pwa/src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'generated_narratives.json');

  const exportPayload = {
    generatedAt: new Date().toISOString(),
    stats: {
      totalGenerated: generatedEvents.length,
      passed: passedCount
    },
    events: validatedEvents,
    dialogues: validatedDialogues
  };

  fs.writeFileSync(outFile, JSON.stringify(exportPayload, null, 2), 'utf-8');
  console.log(`\n📦 质检合格的叙事数据已持久化导出至: ${outFile}`);
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('❌ 流水线执行严重异常:', err);
  process.exit(1);
});
