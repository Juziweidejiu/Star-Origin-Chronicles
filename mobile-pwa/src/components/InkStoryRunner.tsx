import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { Compiler } from 'inkjs/full';
import { SAMPLE_INK_STORIES, type InkStoryMeta } from '../data/sampleInkStories';

interface HistoryEntry {
  id: string;
  type: 'narrative' | 'choice_taken' | 'system';
  content: string;
}

interface InkStoryRunnerProps {
  onStoryEnd?: (finalState: Record<string, any>) => void;
  onApplyEffectsToGame?: (effects: { stressDelta?: number; goldDelta?: number; message?: string }) => void;
}

export const InkStoryRunner: React.FC<InkStoryRunnerProps> = ({
  onApplyEffectsToGame,
}) => {
  const [selectedStoryMeta, setSelectedStoryMeta] = useState<InkStoryMeta>(SAMPLE_INK_STORIES[0]);
  const [customSource, setCustomSource] = useState<string>(SAMPLE_INK_STORIES[0].source);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const [storyInstance, setStoryInstance] = useState<any | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentChoices, setCurrentChoices] = useState<Array<{ index: number; text: string }>>([]);
  const [isEnded, setIsEnded] = useState<boolean>(false);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [compileError, setCompileError] = useState<string | null>(null);

  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // 初始化并编译 Ink 剧本
  const initStory = (source: string) => {
    try {
      setCompileError(null);
      const compiler = new Compiler(source);
      const story = compiler.Compile();

      setStoryInstance(story);
      setHistory([]);
      setIsEnded(false);

      // 读取第一段文本
      const lines: string[] = [];
      while (story.canContinue) {
        const text = story.Continue();
        if (text && text.trim().length > 0) {
          lines.push(text.trim());
        }
      }

      const initialHistory: HistoryEntry[] = lines.map((l, i) => ({
        id: `init_${i}_${Date.now()}`,
        type: 'narrative',
        content: l,
      }));

      setHistory(initialHistory);

      // 获取当前可选项
      const choices = (story.currentChoices || []).map((c: any) => ({
        index: c.index,
        text: c.text,
      }));
      setCurrentChoices(choices);

      // 检查变量状态
      readVariables(story);

      if (!story.canContinue && choices.length === 0) {
        setIsEnded(true);
      }
    } catch (err: any) {
      console.error('Ink compile error:', err);
      setCompileError(err?.message || 'Ink 剧本编译异常，请检查语法结构。');
      setStoryInstance(null);
    }
  };

  // 读取 Ink 全局变量
  const readVariables = (story: any) => {
    if (!story || !story.variablesState) return;
    try {
      const vars: Record<string, any> = {};
      const commonVars = ['squad_stress', 'gold_gained', 'got_relic', 'rations', 'got_map', 'team_morale'];
      for (const key of commonVars) {
        try {
          const val = story.variablesState[key];
          if (val !== undefined && val !== null) {
            vars[key] = typeof val === 'object' && 'value' in val ? val.value : val;
          }
        } catch {
          // ignore missing vars
        }
      }
      setVariables(vars);
    } catch {
      // ignore
    }
  };

  // 挂载时加载默认剧本
  useEffect(() => {
    initStory(selectedStoryMeta.source);
  }, [selectedStoryMeta]);

  // 每次记录更新时滚动到底部
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentChoices]);

  // 执行分支抉择
  const handleChoose = (choiceIndex: number, choiceText: string) => {
    if (!storyInstance) return;

    try {
      // 记录玩家做出的选择
      const updatedHistory: HistoryEntry[] = [
        ...history,
        {
          id: `choice_${Date.now()}`,
          type: 'choice_taken',
          content: `❯ 你选择了：${choiceText}`,
        },
      ];

      storyInstance.ChooseChoiceIndex(choiceIndex);

      // 继续推进后续叙事
      const newLines: string[] = [];
      while (storyInstance.canContinue) {
        const text = storyInstance.Continue();
        if (text && text.trim().length > 0) {
          newLines.push(text.trim());
        }
      }

      newLines.forEach((line, idx) => {
        updatedHistory.push({
          id: `line_${Date.now()}_${idx}`,
          type: 'narrative',
          content: line,
        });
      });

      setHistory(updatedHistory);

      const nextChoices = (storyInstance.currentChoices || []).map((c: any) => ({
        index: c.index,
        text: c.text,
      }));
      setCurrentChoices(nextChoices);

      readVariables(storyInstance);

      if (!storyInstance.canContinue && nextChoices.length === 0) {
        setIsEnded(true);
        // 如果有与外部游戏联动的变量，触发反馈
        if (onApplyEffectsToGame) {
          const stress = variables['squad_stress'] || 0;
          const gold = variables['gold_gained'] || 0;
          if (stress !== 0 || gold !== 0) {
            onApplyEffectsToGame({
              stressDelta: stress,
              goldDelta: gold,
              message: `完成物语【${selectedStoryMeta.title}】，影响结算中`,
            });
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to step story:', err);
    }
  };

  const handleRestart = () => {
    initStory(isEditorOpen ? customSource : selectedStoryMeta.source);
  };

  return (
    <div style={{
      background: '#0d1117',
      borderRadius: '10px',
      border: '1px solid #30363d',
      padding: '14px',
      color: '#c9d1d9',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      {/* 头部标题与控制条 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #21262d', paddingBottom: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📜</span>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#e6edf3', letterSpacing: '0.5px' }}>
              {selectedStoryMeta.title}
            </span>
            <span style={{ fontSize: '10px', background: '#238636', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>
              Ink.js DSL
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '3px' }}>
            {selectedStoryMeta.summary}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsEditorOpen(!isEditorOpen)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: isEditorOpen ? '#30363d' : '#21262d',
              color: '#58a6ff',
              border: '1px solid #30363d',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {isEditorOpen ? '关闭源码' : '查看/编辑Ink'}
          </button>
          <button
            onClick={handleRestart}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: '#21262d',
              color: '#f0883e',
              border: '1px solid #30363d',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ↺ 重置
          </button>
        </div>
      </div>

      {/* 剧本选择器 */}
      {!isEditorOpen && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {SAMPLE_INK_STORIES.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedStoryMeta(s);
                setCustomSource(s.source);
              }}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                borderRadius: '6px',
                border: selectedStoryMeta.id === s.id ? '1px solid #58a6ff' : '1px solid #30363d',
                background: selectedStoryMeta.id === s.id ? '#1f2937' : '#161b22',
                color: selectedStoryMeta.id === s.id ? '#58a6ff' : '#8b949e',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: selectedStoryMeta.id === s.id ? 'bold' : 'normal',
              }}
            >
              📖 {s.title}
            </button>
          ))}
        </div>
      )}

      {/* 源码编辑器/测试区 */}
      {isEditorOpen && (
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '6px', padding: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>✏️ Ink 脚本源文本 (支持在线修改即时编译)</span>
            <span style={{ color: '#58a6ff', cursor: 'pointer' }} onClick={() => initStory(customSource)}>
              ▶ 应用并重新编译
            </span>
          </div>
          <textarea
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            rows={10}
            style={{
              width: '100%',
              background: '#0d1117',
              color: '#7ee787',
              fontFamily: 'monospace',
              fontSize: '11px',
              border: '1px solid #30363d',
              borderRadius: '4px',
              padding: '6px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>
      )}

      {/* 编译错误提示 */}
      {compileError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '11px',
          color: '#f87171',
        }}>
          ⚠️ 编译失败: {compileError}
        </div>
      )}

      {/* 内部变量监视看板 */}
      {Object.keys(variables).length > 0 && (
        <div style={{
          background: '#161b22',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #21262d',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11px',
        }}>
          <span style={{ color: '#8b949e' }}>📊 剧本内部状态:</span>
          {Object.entries(variables).map(([k, v]) => (
            <span key={k} style={{ color: typeof v === 'number' && v > 0 ? '#f59e0b' : '#38bdf8' }}>
              {k}: <strong>{String(v)}</strong>
            </span>
          ))}
        </div>
      )}

      {/* 叙事输出卷轴区 (暗黑风格羊皮纸/石碑质感) */}
      <div style={{
        background: '#161b22',
        border: '1px solid #21262d',
        borderRadius: '8px',
        padding: '14px',
        minHeight: '180px',
        maxHeight: '340px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {history.map((entry) => {
          if (entry.type === 'choice_taken') {
            return (
              <div
                key={entry.id}
                style={{
                  fontSize: '12px',
                  color: '#e3b341',
                  fontStyle: 'italic',
                  padding: '4px 8px',
                  background: 'rgba(227, 179, 65, 0.08)',
                  borderRadius: '4px',
                  borderLeft: '3px solid #e3b341',
                }}
              >
                {entry.content}
              </div>
            );
          }
          return (
            <p
              key={entry.id}
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#e6edf3',
                fontFamily: 'serif',
                letterSpacing: '0.3px',
              }}
            >
              {entry.content}
            </p>
          );
        })}

        {isEnded && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: 'rgba(56, 189, 248, 0.1)',
            borderRadius: '6px',
            border: '1px dashed #38bdf8',
            textAlign: 'center',
            fontSize: '12px',
            color: '#38bdf8',
            fontWeight: 'bold',
          }}>
            ✦ 本段物语探索已落幕 ✦
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      {/* 分支抉择按钮区 */}
      {!isEnded && currentChoices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 'bold' }}>
            ⚖️ 你的决断：
          </div>
          {currentChoices.map((choice) => (
            <button
              key={choice.index}
              onClick={() => handleChoose(choice.index, choice.text)}
              style={{
                width: '100%',
                padding: '10px 14px',
                textAlign: 'left',
                background: '#21262d',
                color: '#f0f6fc',
                border: '1px solid #30363d',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                lineHeight: '1.4',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#30363d';
                e.currentTarget.style.borderColor = '#58a6ff';
                e.currentTarget.style.color = '#58a6ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#21262d';
                e.currentTarget.style.borderColor = '#30363d';
                e.currentTarget.style.color = '#f0f6fc';
              }}
            >
              <span>{choice.text}</span>
              <span style={{ fontSize: '11px', color: '#8b949e' }}>▶</span>
            </button>
          ))}
        </div>
      )}

      {/* 结语操作 */}
      {isEnded && (
        <button
          onClick={handleRestart}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #38bdf8',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            color: '#38bdf8',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          ↺ 开启新的抉择与轮回
        </button>
      )}
    </div>
  );
};
