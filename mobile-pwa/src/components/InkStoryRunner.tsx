import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { Compiler } from 'inkjs/full';
import { AlertTriangle, ChevronRight, Code2, Play, RotateCcw } from 'lucide-react';
import { SAMPLE_INK_STORIES, type InkStoryMeta } from '../data/sampleInkStories';
import { Btn, Card, Tag } from './ui';

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
          content: choiceText,
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
    <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 头部：剧本名与工具 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '10px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--pz-line)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--pz-serif)',
                fontSize: '16px',
                color: 'var(--pz-ink)',
                letterSpacing: '.02em',
              }}
            >
              {selectedStoryMeta.title}
            </span>
            <Tag tone="brass">Ink 脚本</Tag>
          </div>
          <div className="pz-sub" style={{ marginTop: '3px' }}>{selectedStoryMeta.summary}</div>
        </div>

        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
          <Btn
            size="sm"
            variant={isEditorOpen ? 'brass' : 'ghost'}
            onClick={() => setIsEditorOpen(!isEditorOpen)}
            title="查看或修改 Ink 源文本"
          >
            <Code2 size={12} style={{ marginRight: '3px' }} />
            源码
          </Btn>
          <Btn size="sm" onClick={handleRestart} title="从头重读这段物语">
            <RotateCcw size={12} style={{ marginRight: '3px' }} />
            重置
          </Btn>
        </div>
      </div>

      {/* 剧本选择器 */}
      {!isEditorOpen && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {SAMPLE_INK_STORIES.map(s => {
            const active = selectedStoryMeta.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStoryMeta(s);
                  setCustomSource(s.source);
                }}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontFamily: 'var(--pz-sans)',
                  borderRadius: 'var(--pz-r-seal)',
                  border: active ? '1px solid var(--pz-wine)' : '1px solid var(--pz-line)',
                  background: active ? 'rgba(138,59,50,.10)' : 'var(--pz-page)',
                  color: active ? 'var(--pz-wine)' : 'var(--pz-ink-2)',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.title}
              </button>
            );
          })}
        </div>
      )}

      {/* 源码编辑器 */}
      {isEditorOpen && (
        <div
          style={{
            background: 'var(--pz-sunken)',
            border: '1px solid var(--pz-line)',
            borderRadius: 'var(--pz-r-btn)',
            padding: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
              fontSize: '10px',
              color: 'var(--pz-ink-3)',
              letterSpacing: '.08em',
            }}
          >
            <span>Ink 源文本 · 改完即时编译</span>
            <button
              onClick={() => initStory(customSource)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 8px',
                fontSize: '10px',
                background: 'transparent',
                border: '1px solid rgba(138,59,50,.4)',
                borderRadius: 'var(--pz-r-seal)',
                color: 'var(--pz-wine)',
                cursor: 'pointer',
                fontFamily: 'var(--pz-sans)',
              }}
            >
              <Play size={10} />
              应用
            </button>
          </div>
          <textarea
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            rows={10}
            style={{
              width: '100%',
              background: 'var(--pz-page)',
              color: 'var(--pz-ink)',
              fontFamily: 'var(--pz-mono)',
              fontSize: '11px',
              lineHeight: 1.55,
              border: '1px solid var(--pz-line)',
              borderRadius: 'var(--pz-r-seal)',
              padding: '8px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>
      )}

      {/* 编译错误 */}
      {compileError && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'flex-start',
            background: 'rgba(138,59,50,.08)',
            border: '1px solid rgba(138,59,50,.4)',
            borderRadius: 'var(--pz-r-btn)',
            padding: '8px 10px',
            fontSize: '11px',
            lineHeight: 1.5,
            color: 'var(--pz-wine)',
          }}
        >
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>编译失败：{compileError}</span>
        </div>
      )}

      {/* 变量看板 */}
      {Object.keys(variables).length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '6px 10px',
            background: 'var(--pz-sunken)',
            border: '1px solid var(--pz-line)',
            borderRadius: 'var(--pz-r-btn)',
            fontSize: '10px',
            color: 'var(--pz-ink-3)',
          }}
        >
          <span style={{ letterSpacing: '.08em' }}>剧本状态</span>
          {Object.entries(variables).map(([k, v]) => (
            <span key={k} style={{ fontFamily: 'var(--pz-mono)' }}>
              <span style={{ color: 'var(--pz-ink-3)' }}>{k}</span>{' '}
              <strong style={{ color: typeof v === 'number' && v > 0 ? 'var(--pz-brass-deep)' : 'var(--pz-ink-2)' }}>
                {String(v)}
              </strong>
            </span>
          ))}
        </div>
      )}

      {/* 叙事卷轴 */}
      <div
        style={{
          background: 'var(--pz-page)',
          border: '1px solid var(--pz-line)',
          borderRadius: 'var(--pz-r-btn)',
          padding: '14px 14px 14px 16px',
          minHeight: '180px',
          maxHeight: '340px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: 'inset 3px 0 0 rgba(217,164,91,.35)',
        }}
      >
        {history.map((entry) => {
          if (entry.type === 'choice_taken') {
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontFamily: 'var(--pz-serif)',
                  color: 'var(--pz-wine)',
                  padding: '4px 8px',
                  background: 'rgba(138,59,50,.07)',
                  borderRadius: 'var(--pz-r-seal)',
                }}
              >
                <ChevronRight size={12} style={{ flexShrink: 0 }} />
                <span>{entry.content}</span>
              </div>
            );
          }
          return (
            <p
              key={entry.id}
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.75,
                color: 'var(--pz-ink)',
                fontFamily: 'var(--pz-serif)',
                letterSpacing: '.01em',
              }}
            >
              {entry.content}
            </p>
          );
        })}

        {isEnded && (
          <div
            style={{
              marginTop: '6px',
              padding: '8px 12px',
              border: '1px dashed rgba(169,121,58,.6)',
              borderRadius: 'var(--pz-r-btn)',
              background: 'rgba(217,164,91,.10)',
              textAlign: 'center',
              fontSize: '11px',
              letterSpacing: '.14em',
              color: 'var(--pz-brass-deep)',
            }}
          >
            本段物语已落幕
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      {/* 分支抉择 */}
      {!isEnded && currentChoices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              fontSize: '10px',
              letterSpacing: '.16em',
              color: 'var(--pz-ink-3)',
              marginBottom: '1px',
            }}
          >
            你的决断
          </div>
          {currentChoices.map((choice) => (
            <button
              key={choice.index}
              onClick={() => handleChoose(choice.index, choice.text)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '10px 12px',
                textAlign: 'left',
                background: 'var(--pz-page)',
                color: 'var(--pz-ink)',
                border: '1px solid var(--pz-line-2)',
                borderRadius: 'var(--pz-r-btn)',
                cursor: 'pointer',
                fontSize: '13px',
                lineHeight: 1.5,
                fontFamily: 'var(--pz-sans)',
              }}
            >
              <span>{choice.text}</span>
              <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--pz-brass-deep)' }} />
            </button>
          ))}
        </div>
      )}

      {/* 结语 */}
      {isEnded && (
        <Btn variant="main" block onClick={handleRestart}>
          再走一遍
        </Btn>
      )}
    </Card>
  );
};
