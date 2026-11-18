import React, { useState } from 'react';
import type { DungeonEvent, EventChoice, ChoiceConsequence } from '../types/narrative';
import type { Hero } from '../types/hero';

interface DungeonEventModalProps {
  event: DungeonEvent;
  squad: Hero[];
  onResolve: (consequence: ChoiceConsequence) => void;
  onClose: () => void;
}

/** 数值变化的纸签配色 */
const BADGE = {
  bad: { bg: 'rgba(138,59,50,.10)', fg: '#8A3B32', line: 'rgba(138,59,50,.32)' },
  good: { bg: 'rgba(111,191,139,.12)', fg: '#3F6B4E', line: 'rgba(111,191,139,.45)' },
  plain: { bg: 'rgba(42,36,24,.05)', fg: '#5C513C', line: 'rgba(42,36,24,.18)' },
};

const Badge: React.FC<{ tone: keyof typeof BADGE; children: React.ReactNode }> = ({ tone, children }) => {
  const c = BADGE[tone];
  return (
    <span
      style={{
        fontSize: '11px',
        padding: '2px 7px',
        borderRadius: 'var(--pz-r-seal)',
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.line}`,
        fontFamily: 'var(--pz-sans)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};

export const DungeonEventModal: React.FC<DungeonEventModalProps> = ({
  event,
  squad,
  onResolve,
  onClose,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<EventChoice | null>(null);
  const [rollResult, setRollResult] = useState<{
    success: boolean;
    consequence: ChoiceConsequence;
    rolledValue: number;
  } | null>(null);

  // 检查小队是否满足选项要求
  const checkRequirement = (choice: EventChoice): { satisfied: boolean; reason?: string } => {
    const req = choice.requirement;
    if (!req) return { satisfied: true };

    if (req.classId && req.classId.length > 0) {
      const hasClass = squad.some(h => req.classId!.includes(h.classId) && h.currentHp > 0);
      if (!hasClass) {
        return { satisfied: false, reason: `需出战职业：${req.classId.join(' / ')}` };
      }
    }

    if (req.attribute && req.minAttrValue) {
      const best = Math.max(...squad.map(h => (h.attributes as any)?.[req.attribute!] || 0));
      if (best < req.minAttrValue) {
        return { satisfied: false, reason: `需队伍最高 ${req.attribute} 达到 ${req.minAttrValue}` };
      }
    }

    return { satisfied: true };
  };

  // 执行判定掷骰
  const handleSelectChoice = (choice: EventChoice) => {
    setSelectedChoice(choice);
    const roll = Math.random();
    const isSuccess = roll <= choice.successRate;
    const consequence = isSuccess
      ? choice.successConsequence
      : choice.failureConsequence || choice.successConsequence;

    setRollResult({
      success: isSuccess,
      consequence,
      rolledValue: Math.round(roll * 100),
    });

    onResolve(consequence);
  };

  const c = rollResult?.consequence;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        // 用半透墨底代替 backdrop-filter: blur()：移动端 GPU 开销大，视觉几乎无差别
        backgroundColor: 'rgba(42,36,24,.62)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '20px 14px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '390px',
          margin: 'auto',
          background: 'var(--pz-raised)',
          border: '1px solid var(--pz-line-2)',
          borderRadius: 'var(--pz-r-card)',
          boxShadow: '0 18px 40px rgba(42,36,24,.32)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 120px)',
          animation: 'riseIn .22s ease-out',
        }}
      >
        {/* 顶栏：深木 + 黄铜细线 */}
        <div
          style={{
            padding: '10px 14px',
            background: 'linear-gradient(180deg, #3A2E1F 0%, #2A2115 100%)',
            borderBottom: '1px solid rgba(217,164,91,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '9px',
                letterSpacing: '.22em',
                color: 'rgba(243,233,209,.52)',
                marginBottom: '2px',
              }}
            >
              秘境奇遇
            </div>
            <div
              style={{
                fontFamily: 'var(--pz-serif)',
                fontSize: '15px',
                color: '#F3E9D1',
                letterSpacing: '.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {event.title}
            </div>
          </div>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 7px',
              borderRadius: 'var(--pz-r-seal)',
              border: '1px solid rgba(217,164,91,.4)',
              color: 'var(--pz-brass)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {event.category}
          </span>
        </div>

        {/* 正文（可滚动） */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          <p
            style={{
              margin: 0,
              borderLeft: '2px solid var(--pz-brass)',
              paddingLeft: '10px',
              fontFamily: 'var(--pz-serif)',
              fontSize: '14px',
              lineHeight: 1.85,
              color: 'var(--pz-ink)',
            }}
          >
            {event.hook}
          </p>

          {!rollResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <div
                style={{
                  fontSize: '10px',
                  letterSpacing: '.16em',
                  color: 'var(--pz-ink-3)',
                  marginBottom: '2px',
                }}
              >
                如何应对
              </div>

              {event.choices.map(choice => {
                const { satisfied, reason } = checkRequirement(choice);
                const ratePercent = Math.round(choice.successRate * 100);
                const sure = choice.successRate >= 1;

                return (
                  <button
                    key={choice.id}
                    disabled={!satisfied}
                    onClick={() => handleSelectChoice(choice)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: '3px',
                      padding: '10px 11px',
                      borderRadius: 'var(--pz-r-btn)',
                      textAlign: 'left',
                      border: `1px solid ${satisfied ? 'var(--pz-line-2)' : 'var(--pz-line)'}`,
                      background: satisfied ? 'var(--pz-page)' : 'var(--pz-sunken)',
                      opacity: satisfied ? 1 : 0.72,
                      cursor: satisfied ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--pz-sans)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span
                        style={{
                          flex: 1,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: satisfied ? 'var(--pz-ink)' : 'var(--pz-ink-3)',
                          lineHeight: 1.45,
                        }}
                      >
                        {choice.label}
                      </span>
                      <span
                        className="pz-mono"
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: sure ? 'var(--pz-success)' : ratePercent >= 60 ? 'var(--pz-brass-deep)' : 'var(--pz-wine)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sure ? '必定得手' : `${ratePercent}%`}
                      </span>
                    </div>

                    {choice.flavor && (
                      <div style={{ fontSize: '11px', lineHeight: 1.6, color: 'var(--pz-ink-3)' }}>
                        {choice.flavor}
                      </div>
                    )}

                    {!satisfied && reason && (
                      <div style={{ fontSize: '11px', color: 'var(--pz-wine)', marginTop: '1px' }}>
                        {reason}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ marginTop: '14px' }}>
              <div
                style={{
                  padding: '11px 12px',
                  borderRadius: 'var(--pz-r-btn)',
                  background: rollResult.success ? 'rgba(111,191,139,.10)' : 'rgba(138,59,50,.08)',
                  border: `1px solid ${rollResult.success ? 'rgba(111,191,139,.5)' : 'rgba(138,59,50,.42)'}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--pz-serif)',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: rollResult.success ? '#3F6B4E' : 'var(--pz-wine)',
                    }}
                  >
                    {rollResult.success ? '得手' : '失算'}
                    {selectedChoice ? ` · ${selectedChoice.label}` : ''}
                  </span>
                  <span className="pz-mono" style={{ fontSize: '10px', color: 'var(--pz-ink-3)' }}>
                    骰目 {rollResult.rolledValue}
                    {selectedChoice ? ` / ${Math.round(selectedChoice.successRate * 100)}` : ''}
                  </span>
                </div>

                <div style={{ fontSize: '13px', lineHeight: 1.75, color: 'var(--pz-ink)' }}>
                  {rollResult.consequence.resultNarrative}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '9px' }}>
                  {!!c?.stressChange && (
                    <Badge tone={c.stressChange > 0 ? 'bad' : 'good'}>
                      压力 {c.stressChange > 0 ? `+${c.stressChange}` : c.stressChange}
                    </Badge>
                  )}
                  {!!c?.moraleChange && (
                    <Badge tone={c.moraleChange > 0 ? 'good' : 'bad'}>
                      士气 {c.moraleChange > 0 ? `+${c.moraleChange}` : c.moraleChange}
                    </Badge>
                  )}
                  {!!c?.goldChange && (
                    <Badge tone={c.goldChange > 0 ? 'good' : 'bad'}>
                      金币 {c.goldChange > 0 ? `+${c.goldChange}` : c.goldChange}
                    </Badge>
                  )}
                  {!!c?.hpPercentChange && (
                    <Badge tone={c.hpPercentChange > 0 ? 'good' : 'bad'}>
                      队伍生命 {c.hpPercentChange > 0 ? `+${c.hpPercentChange}` : c.hpPercentChange}%
                    </Badge>
                  )}
                  {!!c?.rationChange && (
                    <Badge tone={c.rationChange > 0 ? 'good' : 'plain'}>
                      口粮 {c.rationChange > 0 ? `+${c.rationChange}` : c.rationChange}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部固定 */}
        {rollResult && (
          <div
            style={{
              padding: '10px 14px calc(10px + env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid var(--pz-line)',
              background: 'var(--pz-sunken)',
              flexShrink: 0,
            }}
          >
            <button className="pz-btn pz-btn--main pz-btn--block" onClick={onClose}>
              收起行囊，继续前行
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
