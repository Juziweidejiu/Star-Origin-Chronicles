import React, { useState } from 'react';
import type { DungeonEvent, EventChoice, ChoiceConsequence } from '../types/narrative';
import type { Hero } from '../types/hero';

interface DungeonEventModalProps {
  event: DungeonEvent;
  squad: Hero[];
  onResolve: (consequence: ChoiceConsequence) => void;
  onClose: () => void;
}

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
        return { satisfied: false, reason: `需出战职业: ${req.classId.join('/')}` };
      }
    }

    if (req.attribute && req.minAttrValue) {
      const best = Math.max(...squad.map(h => (h.attributes as any)?.[req.attribute!] || 0));
      if (best < req.minAttrValue) {
        return { satisfied: false, reason: `需队伍最高 ${req.attribute} >= ${req.minAttrValue}` };
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
          border: '2px solid #57534e',
          borderRadius: '8px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.9), inset 0 0 30px rgba(180, 83, 9, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#e2e8f0',
        }}
      >
        {/* 顶部标题栏 (暗红与黄铜) */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #44403c',
            background: 'linear-gradient(90deg, #292524 0%, #1c1917 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📜</span>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fbbf24', letterSpacing: '0.05em' }}>
              {event.title}
            </span>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: '#3f3f46',
              color: '#a1a1aa',
              textTransform: 'uppercase',
            }}
          >
            {event.category}
          </span>
        </div>

        {/* 核心白描文本区 */}
        <div style={{ padding: '16px', fontSize: '13px', lineHeight: 1.6, color: '#d6d3d1' }}>
          <p style={{ margin: 0, borderLeft: '3px solid #78716c', paddingLeft: '10px' }}>
            {event.hook}
          </p>
        </div>

        {/* 选项区或结算结果区 */}
        <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!rollResult ? (
            // 未抉择：展示选项
            event.choices.map((choice) => {
              const { satisfied, reason } = checkRequirement(choice);
              const ratePercent = Math.round(choice.successRate * 100);

              return (
                <button
                  key={choice.id}
                  disabled={!satisfied}
                  onClick={() => handleSelectChoice(choice)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: satisfied ? '1px solid #78716c' : '1px solid #3f3f46',
                    background: satisfied
                      ? 'linear-gradient(180deg, #27272a 0%, #18181b 100%)'
                      : '#18181b',
                    color: satisfied ? '#f3f4f6' : '#71717a',
                    cursor: satisfied ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: satisfied ? '#fafafa' : '#a1a1aa' }}>
                      {choice.label}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: choice.successRate === 1.0 ? '#10b981' : '#f59e0b',
                        fontWeight: 'bold',
                      }}
                    >
                      {choice.successRate === 1.0 ? '确定无虞' : `成功率 ${ratePercent}%`}
                    </span>
                  </div>

                  {choice.flavor && (
                    <div style={{ fontSize: '11px', color: '#a8a29e' }}>
                      {choice.flavor}
                    </div>
                  )}

                  {!satisfied && reason && (
                    <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>
                      ⚠️ {reason}
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            // 抉择已完成：展示冷硬结算结果
            <div
              style={{
                background: rollResult.success ? 'rgba(6, 78, 59, 0.4)' : 'rgba(127, 29, 29, 0.4)',
                border: rollResult.success ? '1px solid #059669' : '1px solid #dc2626',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontWeight: 'bold',
                    fontSize: '13px',
                    color: rollResult.success ? '#34d399' : '#f87171',
                  }}
                >
                  {selectedChoice ? `【${selectedChoice.label}】` : ''}
                  {rollResult.success ? '得手' : '失算与厄运'}
                </span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                  骰目检定: {rollResult.rolledValue}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#e5e7eb', lineHeight: 1.5 }}>
                {rollResult.consequence.resultNarrative}
              </div>

              {/* 数值变化徽章 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {rollResult.consequence.stressChange !== 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: rollResult.consequence.stressChange > 0 ? '#450a0a' : '#14532d',
                      color: rollResult.consequence.stressChange > 0 ? '#fca5a5' : '#86efac',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    👑 压力 {rollResult.consequence.stressChange > 0 ? `+${rollResult.consequence.stressChange}` : rollResult.consequence.stressChange}
                  </span>
                )}

                {rollResult.consequence.moraleChange !== 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: rollResult.consequence.moraleChange > 0 ? '#1e3a8a' : '#7f1d1d',
                      color: rollResult.consequence.moraleChange > 0 ? '#93c5fd' : '#fca5a5',
                    }}
                  >
                    ⚔️ 士气 {rollResult.consequence.moraleChange > 0 ? `+${rollResult.consequence.moraleChange}` : rollResult.consequence.moraleChange}
                  </span>
                )}

                {rollResult.consequence.goldChange && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#78350f',
                      color: '#fde68a',
                    }}
                  >
                    🪙 金币 {rollResult.consequence.goldChange > 0 ? `+${rollResult.consequence.goldChange}` : rollResult.consequence.goldChange}
                  </span>
                )}

                {rollResult.consequence.hpPercentChange && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#991b1b',
                      color: '#fecaca',
                    }}
                  >
                    🩸 队伍生命 {rollResult.consequence.hpPercentChange}%
                  </span>
                )}

                {rollResult.consequence.rationChange && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#374151',
                      color: '#d1d5db',
                    }}
                  >
                    🍞 口粮 {rollResult.consequence.rationChange > 0 ? `+${rollResult.consequence.rationChange}` : rollResult.consequence.rationChange}
                  </span>
                )}
              </div>

              {/* 关闭/离开按钮 */}
              <button
                onClick={onClose}
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#d97706',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                收起行囊，继续前行 ➔
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
