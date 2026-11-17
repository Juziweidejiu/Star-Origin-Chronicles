import React from 'react';
import type { CrisisState } from '../engine/crisisEngine';
import { TOWNS_CONFIG } from '../engine/townEngine';

interface CrisisAlertProps {
  crisis: CrisisState;
  onAcceptCrisisBattle: () => void;
}

export const CrisisAlert: React.FC<CrisisAlertProps> = ({ crisis, onAcceptCrisisBattle }) => {
  if (crisis.phase === 'resolved' || crisis.threatLevel === 0) return null;

  const isHighDanger = crisis.threatLevel >= 50;

  return (
    <div
      style={{
        background: isHighDanger ? 'linear-gradient(135deg, #450a0a, #7f1d1d)' : '#1e293b',
        border: `1px solid ${isHighDanger ? '#ef4444' : '#f59e0b'}`,
        borderRadius: '8px',
        padding: '10px 12px',
        marginBottom: '10px',
        boxShadow: isHighDanger ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '16px' }}>{isHighDanger ? '🚨' : '⚠️'}</span>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: isHighDanger ? '#fca5a5' : '#fcd34d' }}>
            世界异动：{crisis.name}
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: isHighDanger ? '#ef4444' : '#f59e0b',
            color: '#0f172a',
            fontWeight: 'bold',
          }}
        >
          威胁度 {crisis.threatLevel}%
        </span>
      </div>

      <div style={{ fontSize: '11px', color: '#e2e8f0', marginTop: '6px', lineHeight: '1.4' }}>
        {crisis.description}
      </div>

      {crisis.fallenTowns.length > 0 && (
        <div style={{ fontSize: '10px', color: '#f87171', marginTop: '4px', fontWeight: 'bold' }}>
          🛡️ 受袭前线：{crisis.fallenTowns.map(t => TOWNS_CONFIG[t]?.name ?? t).join('、')}
        </div>
      )}

      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onAcceptCrisisBattle}
          style={{
            padding: '5px 12px',
            fontSize: '11px',
            borderRadius: '6px',
            border: 'none',
            background: '#ef4444',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ⚔️ 接取兽潮特别阻击令
        </button>
      </div>
    </div>
  );
};
