#!/usr/bin/env node

/**
 * ==============================================================================
 * 《破晓佣兵团》暗黑叙事批量生成与质检验收流水线
 * 
 * 核心目标：
 * 1. 彻底过滤中二网文腔、廉价血腥煽情与亢长废话
 * 2. 产出符合《暗黑地牢》(Darkest Dungeon) 与《战场兄弟》(Battle Brothers) 的克制冷硬白描
 * 3. 严格遵循 UI 盒子字数硬约束与 TypeScript Schema
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

// 违禁词库：网文常见词、过度血腥夸张词、日漫轻小说感叹词
const PURPLE_PROSE_BLACKLIST = [
  '瞳孔骤缩', '瞳孔微缩', '倒吸一口凉气', '嘴角泛起冷笑', '嘴角勾起一抹',
  '修罗场', '宛如地狱般的', '血雾喷涌', '血肉横飞', '恐怖如斯',
  '碎成齑粉', '毁天灭地', '苍穹', '滔天', '宛若神明', '蝼蚁',
  '桀桀', '暴怒如狂', '震颤不已', '冷冽的杀意', '杀神附体',
  '深不可测', '撕心裂肺', '生不如死', '骇人听闻'
];

// 系统设定与生成Prompt
const NARRATIVE_DESIGNER_SYSTEM_PROMPT = `
你是一名资深暗黑低魔奇幻CRPG（如《Darkest Dungeon》、《Battle Brothers》）的首席叙事文案设计师。
你的任务是为移动端回合制游戏《破晓佣兵团》生成【地下城奇遇事件】与【营地佣兵短对话】。

【叙事风格军规】：
1. 【冷峻克制，绝对白描】：禁止任何主观抒情与心理煽情。只描述现场的物理实物：生锈的铁钉、发霉的皮革、马粪油脂味、寒冷泥泞、带缺口的断刃。
2. 【生存代价，没有爽文英雄】：选择总是两难的。收益永远伴随着创伤、压力上升、金币耗损或武器耐久破损。
3. 【极度精炼，贴合UI】：
   - 奇遇场景 hook: 80~130字。
   - 选项 label: 6~12字（动词打头）。
   - 选项 flavor: 15~28字。
   - 结算 narrative: 40~75字。
   - 营地短台词: 15~35字（糙汉、疲倦、现实、算账视角）。
4. 【死刑黑名单】：绝对严禁使用任何网文词汇，如：瞳孔骤缩、倒吸凉气、嘴角冷笑、血雾、修罗场、恐怖如斯、蝼蚁等。

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
      issues.push(`[${fieldName}] 命中违禁网文词: "${bad}"`);
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
 * 真实 LLM API 生成（支持 OpenAI / DeepSeek / 任何兼容 OpenAI 协议的 API）
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
      title: '封死的地窖铁门',
      theme: 'ruins',
      category: 'curio',
      hook: '塌陷的石阶尽头横着一扇灌了铅的铸铁门，门栓上插着半柄断裂的宽刃剑。缝隙里渗出潮湿的酒糟气与发馊的油脂味。',
      choices: [
        {
          id: `c_${index}_1`,
          label: '合力砸开锁扣',
          flavor: '可能会破坏里面的藏品，并发出巨响。',
          successRate: 0.75,
          successConsequence: {
            stressChange: 5,
            moraleChange: 10,
            goldChange: 120,
            resultNarrative: '铁闩崩裂。几坛尚未挥发的麦酒和一小袋行商银币滚落出来。'
          },
          failureConsequence: {
            stressChange: 15,
            moraleChange: -5,
            hpPercentChange: -5,
            resultNarrative: '飞溅的铁屑划破了手背，刺耳的撞击声引来了远处的徘徊者。'
          }
        },
        {
          id: `c_${index}_2`,
          label: '在门缝塞入细油绳探路',
          flavor: '观察内部是否有可燃毒气或盘踞毒虫。',
          requirement: { attribute: 'anticipation', minAttrValue: 12 },
          successRate: 0.9,
          successConsequence: {
            stressChange: -5,
            moraleChange: 5,
            resultNarrative: '油绳没有变色，地窖里没有毒瘴，佣兵们松了一口气。'
          }
        }
      ]
    },
    {
      title: '被遗弃的溃兵木桩',
      theme: 'forest',
      category: 'dilemma',
      hook: '林间小径旁立着三根削尖的原木，上面绑着风干的领主军溃兵皮甲。一具残缺的布袋还吊在枝头，底下滴落着浑浊的雨水。',
      choices: [
        {
          id: `c_${index}_1`,
          label: '割断绳索取下布袋',
          flavor: '溃兵往往藏匿着劫掠来的贵重细软。',
          successRate: 0.8,
          successConsequence: {
            stressChange: -5,
            moraleChange: 5,
            goldChange: 85,
            resultNarrative: '袋里除了一双磨平的旧军靴，还有两只金耳坠与三枚受潮火石。'
          },
          failureConsequence: {
            stressChange: 12,
            moraleChange: -5,
            resultNarrative: '绳索扯断了腐烂的蜂巢，蛰咬使得探路哨兵满面红肿。'
          }
        },
        {
          id: `c_${index}_2`,
          label: '拔起木桩劈作营火柴木',
          flavor: '行军需要干燥的柴薪，死人的晦气不必理会。',
          successRate: 1.0,
          successConsequence: {
            stressChange: 5,
            moraleChange: 5,
            rationChange: 1,
            resultNarrative: '硬木被砍成适手的柴块，今晚的营火有了着落。'
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
      personality: 'weary',
      condition: 'idle',
      text: '把潮湿的裹脚布烤干。生冻疮比被箭射中还折磨人。'
    },
    {
      id: `camp_gen_${Date.now()}_2`,
      personality: 'cynical',
      condition: 'high_stress',
      text: '老爷们坐在城堡里数金币，我们在烂泥里替他捞祖坟。'
    },
    {
      id: `camp_gen_${Date.now()}_3`,
      personality: 'stoic',
      condition: 'injured',
      text: '肋骨没断，还能挥剑。把绷带再勒紧一圈。'
    }
  ];
}

/**
 * 运行主入口
 */
async function main() {
  console.log('='.repeat(70));
  console.log('🛡️  破晓佣兵团 · 暗黑叙事质量过滤与生成流水线');
  console.log('='.repeat(70));

  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  let generatedEvents = [];
  let generatedDialogues = [];

  if (apiKey) {
    console.log(`📡 检测到 API 密钥，开始通过远程 LLM (${baseUrl}) 批量生成...`);
    const prompt = `请生成 2 个地下城奇遇事件和 3 条营地台词。严格遵循冷峻克制白描军规与UI字数硬约束。
必须严格输出满足以下格式的 JSON 对象：
{
  "events": [
    {
      "id": "ev_llm_1",
      "title": "标题(6-10字)",
      "theme": "crypt",
      "category": "curio",
      "hook": "80-130字冷硬现场白描",
      "choices": [
        {
          "id": "c_1",
          "label": "动词开头(6-12字)",
          "flavor": "15-28字选项代价考量",
          "successRate": 0.75,
          "successConsequence": {
            "stressChange": 5,
            "goldChange": 100,
            "resultNarrative": "40-75字成功结算描述"
          },
          "failureConsequence": {
            "stressChange": 15,
            "hpPercentChange": -10,
            "resultNarrative": "40-75字失败结算描述"
          }
        },
        {
          "id": "c_2",
          "label": "保守抉择(6-12字)",
          "flavor": "15-28字稳妥观察考量",
          "successRate": 1.0,
          "successConsequence": {
            "stressChange": -5,
            "resultNarrative": "40-75字稳妥结算描述"
          }
        }
      ]
    }
  ],
  "dialogues": [
    {
      "id": "camp_llm_1",
      "personality": "weary",
      "condition": "idle",
      "text": "极简短佣兵台词(必须控制在15~30字之间，严禁超长，如鞋袜、干粮、生锈铁剑、伤口发炎)"
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
      console.log(`  ✅ 事件 [${ev.title}] (${ev.id}) 质检通过！风格冷硬，无网文词，字数达标。`);
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
    const errs = validateText(d.text, 40, 'camp.dialogue');
    if (errs.length === 0) {
      console.log(`  ✅ 营地台词 [${d.personality}]: "${d.text}"`);
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

  const exportPath = path.join(outDir, 'generated_narratives.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    stats: {
      totalGenerated: generatedEvents.length,
      passed: passedCount
    },
    events: validatedEvents,
    dialogues: validatedDialogues
  };

  fs.writeFileSync(exportPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`\n📦 质检合格的叙事数据已持久化导出至: ${exportPath}`);
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
