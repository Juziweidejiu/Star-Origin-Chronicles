import React from 'react';
import type { CampDialogue } from '../types/narrative';
import type { Hero } from '../types/hero';

interface CampBarkBubbleProps {
  dialogue: CampDialogue;
  speaker?: Hero;
}

/** 性格 → 印刷友好色（纸面上可读的低饱和色） */
const PERSONALITY_COLOR: Record<string, string> = {
  cynical: '#8A6B2F',
  stoic: '#2F6E8F',
  superstitious: '#7A4E8C',
  weary: '#6B6152',
  grim: '#8A3B32',
  heroic: '#A9652F',
  gentle: '#3F6B4E',
  pragmatic: '#A9793A',
  playful: '#6A5AA8',
};

const PERSONALITY_LABEL: Record<string, string> = {
  cynical: '敏锐',
  stoic: '沉稳',
  superstitious: '直觉',
  weary: '疲惫',
  grim: '冷冽',
  heroic: '豪迈',
  gentle: '温和',
  pragmatic: '工巧',
  playful: '洒脱',
};

export const CampBarkBubble: React.FC<CampBarkBubbleProps> = ({ dialogue, speaker }) => {
  const speakerName = speaker?.name || dialogue.speakerName || '探险者';
  const tagColor = PERSONALITY_COLOR[dialogue.personality] || 'var(--pz-ink-3)';
  const tagLabel = PERSONALITY_LABEL[dialogue.personality] || dialogue.personality;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px 10px',
        background: 'var(--pz-page)',
        border: '1px solid var(--pz-line)',
        borderLeft: `3px solid ${tagColor}`,
        borderRadius: 'var(--pz-r-btn)',
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--pz-serif)',
          fontSize: '13px',
          lineHeight: '18px',
          color: tagColor,
          flexShrink: 0,
          opacity: 0.85,
        }}
      >
        话
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--pz-ink)' }}>
            {speakerName}
          </span>
          <span
            style={{
              fontSize: '9px',
              padding: '0 4px',
              borderRadius: 'var(--pz-r-seal)',
              background: 'rgba(42,36,24,.06)',
              color: tagColor,
              letterSpacing: '.06em',
            }}
          >
            {tagLabel}
          </span>
        </div>

        <div
          style={{
            fontSize: '13px',
            color: 'var(--pz-ink-2)',
            lineHeight: 1.6,
            fontFamily: 'var(--pz-serif)',
          }}
        >
          “{dialogue.text}”
        </div>
      </div>
    </div>
  );
};
