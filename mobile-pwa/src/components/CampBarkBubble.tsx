import React from 'react';
import type { CampDialogue } from '../types/narrative';
import type { Hero } from '../types/hero';

interface CampBarkBubbleProps {
  dialogue: CampDialogue;
  speaker?: Hero;
}

export const CampBarkBubble: React.FC<CampBarkBubbleProps> = ({ dialogue, speaker }) => {
  const personalityColorMap: Record<string, string> = {
    cynical: '#eab308',      // 讽刺/现实：金黄
    stoic: '#38bdf8',        // 坚韧/寡言：天蓝
    superstitious: '#c084fc',// 迷信/疑神疑鬼：淡紫
    weary: '#94a3b8',        // 疲惫/沧桑：岩灰
    grim: '#f87171',         // 冷酷/死寂：暗红
  };

  const personalityLabelMap: Record<string, string> = {
    cynical: '现实',
    stoic: '沉稳',
    superstitious: '迷信',
    weary: '疲惫',
    grim: '冷硬',
  };

  const speakerName = speaker?.name || '老兵佣兵';
  const tagColor = personalityColorMap[dialogue.personality] || '#94a3b8';
  const tagLabel = personalityLabelMap[dialogue.personality] || dialogue.personality;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(24, 24, 27, 0.95)',
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        maxWidth: '100%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#27272a',
          border: `1px solid ${tagColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          flexShrink: 0,
        }}
      >
        🗣️
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f3f4f6' }}>
            {speakerName}
          </span>
          <span
            style={{
              fontSize: '9px',
              padding: '1px 4px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: tagColor,
            }}
          >
            {tagLabel}
          </span>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: '#d4d4d8',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}
        >
          “{dialogue.text}”
        </div>
      </div>
    </div>
  );
};
