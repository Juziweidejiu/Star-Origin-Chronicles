/**
 * 战利品掉落与装备对比替换弹窗 (LootDropModal)
 * 支持：
 * 1. 翻牌仪式感 / 品质光效（普通灰、优秀绿、精良蓝、史诗紫、传说金）
 * 2. 智能推荐出战英雄（法杖推法师、大盾推前锋）
 * 3. 队员头像行切换查看对比
 * 4. 属性绿增（↑ +N）与红降（↓ -N）差值对比
 * 5. 一键立即穿戴并替换原有装备
 */

import React, { useState, useMemo } from 'react';
import type { Hero, Equipment, CoreStatKey } from '../types/hero';
import { resolveStats, STAT_LABEL, DAMAGE_TYPE } from '../engine/statResolver';
import { heroRoleLabel } from '../engine/heroFactory';

interface LootDropModalProps {
  loot: Equipment;
  squad: Hero[]; // 当前出战英雄队伍 (通常为 4 人)
  onEquipToHero: (heroId: string, item: Equipment) => void;
  onPutIntoInventory: (item: Equipment) => void;
  title?: string; // 弹窗标题（例如：战利品翻牌缴获 / 宝箱直接掉落）
}

const RARITY_THEMES: Record<string, { color: string; bg: string; glow: string; name: string }> = {
  common: { color: '#5C513C', bg: 'rgba(92, 81, 60, 0.12)', glow: 'rgba(92, 81, 60, 0.18)', name: '普通' },
  uncommon: { color: '#4E7A5A', bg: 'rgba(78, 122, 90, 0.14)', glow: 'rgba(78, 122, 90, 0.22)', name: '优秀' },
  rare: { color: '#2F6E8F', bg: 'rgba(47, 110, 143, 0.14)', glow: 'rgba(47, 110, 143, 0.22)', name: '精良' },
  epic: { color: '#7A4E8C', bg: 'rgba(122, 78, 140, 0.14)', glow: 'rgba(122, 78, 140, 0.24)', name: '史诗' },
  legendary: { color: '#A9793A', bg: 'rgba(169, 121, 58, 0.16)', glow: 'rgba(169, 121, 58, 0.28)', name: '传说' },
};

export const LootDropModal: React.FC<LootDropModalProps> = ({
  loot,
  squad,
  onEquipToHero,
  onPutIntoInventory,
  title = '🎁 战利品掉落 · 装备查验'
}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  // 智能推荐逻辑：判断队伍中谁最适合该装备
  const recommendedHeroId = useMemo(() => {
    if (!squad.length) return null;
    const slot = loot.slot;

    // 如果是武器
    if (slot === 'weapon') {
      const isMagicWeapon = Boolean(loot.base.ap || loot.affixes.some(a => a.stat === 'ap'));
      if (isMagicWeapon) {
        const caster = squad.find(h => DAMAGE_TYPE[h.classId] === 'magic');
        if (caster) return caster.id;
      } else {
        const physical = squad.find(h => DAMAGE_TYPE[h.classId] === 'physical');
        if (physical) return physical.id;
      }
    } else if (slot === 'armor') {
      // 防具优先推坦克
      const tank = squad.find(h => h.role === 'tank');
      if (tank) return tank.id;
    }
    return squad[0].id;
  }, [loot, squad]);

  const [selectedHeroId, setSelectedHeroId] = useState<string>(recommendedHeroId || squad[0]?.id || '');

  const selectedHero = squad.find(h => h.id === selectedHeroId) || squad[0];
  const currentEquippedItem = selectedHero ? selectedHero.equipment[loot.slot] : undefined;

  // 计算穿戴前与穿戴后的属性对比
  const currentStats = useMemo(() => selectedHero ? resolveStats(selectedHero) : null, [selectedHero]);
  const simulatedStats = useMemo(() => {
    if (!selectedHero) return null;
    const simHero: Hero = {
      ...selectedHero,
      equipment: {
        ...selectedHero.equipment,
        [loot.slot]: loot,
      }
    };
    return resolveStats(simHero);
  }, [selectedHero, loot]);

  const rarityInfo = RARITY_THEMES[loot.rarity] || RARITY_THEMES.common;

  // 翻牌前背面状态
  if (!isRevealed) {
    return (
      <div
        style={{
          background: 'var(--pz-raised)',
          border: '1px solid var(--pz-brass-deep)',
          borderRadius: 'var(--pz-r-card)',
          padding: '22px 16px',
          color: 'var(--pz-ink)',
          textAlign: 'center',
          boxShadow: '0 14px 34px rgba(42,36,24,.28)',
          animation: 'fadeIn 0.25s ease-out'
        }}
      >
        <div style={{ fontFamily: 'var(--pz-serif)', fontSize: '16px', color: 'var(--pz-ink)', marginBottom: '6px' }}>
          战利品翻牌
        </div>
        <div style={{ fontSize: '12px', color: 'var(--pz-ink-2)', marginBottom: '18px' }}>
          肃清强敌缴获了一件物资，点开封印卡牌
        </div>

        {/* 翻牌卡牌背面 */}
        <div
          onClick={() => setIsRevealed(true)}
          style={{
            margin: '0 auto',
            width: '180px',
            height: '240px',
            background: 'linear-gradient(145deg, #E3D3B0 0%, #D3C2A0 100%)',
            border: '1.5px dashed var(--pz-brass-deep)',
            borderRadius: 'var(--pz-r-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(42,36,24,.22)',
            transform: 'scale(1)',
            transition: 'transform 0.2s',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '8px', animation: 'bounce 1.5s infinite' }}>
            🎴
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--pz-wine)' }}>
            点开查验
          </div>
          <div style={{ fontSize: '10px', color: 'var(--pz-ink-3)', marginTop: '4px' }}>
            装等 {loot.tier} 阶
          </div>
        </div>
      </div>
    );
  }

  // 对比的主要属性列表
  const compareKeys: CoreStatKey[] = ['ad', 'ap', 'armor', 'magicResist', 'maxHp', 'critChance', 'healingPower'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 130px)',
        background: 'var(--pz-raised)',
        border: `1px solid ${rarityInfo.color}`,
        borderRadius: 'var(--pz-r-card)',
        color: 'var(--pz-ink)',
        boxShadow: '0 14px 34px rgba(42,36,24,.28)',
        animation: 'fadeIn 0.25s ease-out',
        overflow: 'hidden'
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 14px 0' }}>
      {/* 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'var(--pz-serif)', fontSize: '15px', color: 'var(--pz-ink)' }}>
          {title}
        </span>
        <span style={{ fontSize: '10px', background: rarityInfo.bg, color: rarityInfo.color, padding: '1px 7px', borderRadius: '3px', border: `1px solid ${rarityInfo.color}` }}>
          {rarityInfo.name} · {loot.slot === 'weapon' ? '武器' : loot.slot === 'armor' ? '防具' : '饰品'}
        </span>
      </div>

      {/* 装备名与基础词条展示 */}
      <div
        style={{
          background: 'var(--pz-sunken)',
          border: `1px solid ${rarityInfo.color}`,
          borderRadius: 'var(--pz-r-btn)',
          padding: '10px 12px',
          marginBottom: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: rarityInfo.color }}>
            {loot.name}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--pz-ink-3)' }}>
            装等 {loot.tier} 阶
          </span>
        </div>

        {/* 基础属性 */}
        <div style={{ fontSize: '11px', color: 'var(--pz-ink-2)', marginTop: '6px' }}>
          {Object.entries(loot.base).map(([k, v]) => (
            <span key={k} style={{ marginRight: '10px' }}>
              {STAT_LABEL[k as CoreStatKey]}: <b style={{ color: '#2F6E8F' }}>+{v}</b>
            </span>
          ))}
        </div>

        {/* 附加词条 */}
        {loot.affixes.length > 0 && (
          <div style={{ borderTop: '1px dashed var(--pz-line-2)', marginTop: '6px', paddingTop: '5px', fontSize: '10px', color: '#6B4E9E' }}>
            {loot.affixes.map((af, i) => (
              <div key={i}>
                • {af.label}: {af.kind === 'percent' ? `+${Math.round(af.value * 100)}%` : `+${af.value}`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 切换对比英雄头像栏 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--pz-ink-2)', marginBottom: '6px' }}>
          比对穿戴队员 · 推荐 <b style={{ color: 'var(--pz-brass-deep)' }}>{squad.find(h => h.id === recommendedHeroId)?.name || '前锋'}</b>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {squad.map(h => {
            const isSelected = h.id === selectedHeroId;
            const isRec = h.id === recommendedHeroId;
            return (
              <button
                key={h.id}
                onClick={() => setSelectedHeroId(h.id)}
                style={{
                  flex: 1,
                  padding: '5px 4px',
                  background: isSelected ? 'rgba(138,59,50,.10)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--pz-wine)' : 'var(--pz-line-2)'}`,
                  borderRadius: 'var(--pz-r-seal)',
                  color: isSelected ? 'var(--pz-wine)' : 'var(--pz-ink-2)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                {isRec && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-3px', fontSize: '8px', background: 'var(--pz-brass)', color: '#2A2115', padding: '0 3px', borderRadius: '3px', fontWeight: 700 }}>
                    荐
                  </span>
                )}
                <div style={{ fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                <div style={{ fontSize: '9px', color: 'var(--pz-ink-3)' }}>{heroRoleLabel(h)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 左右对比栏：当前穿戴 vs 新掉落替换效果 */}
      <div
        style={{
          background: 'var(--pz-sunken)',
          borderRadius: 'var(--pz-r-btn)',
          padding: '10px',
          marginBottom: '12px',
          border: '1px solid var(--pz-line)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px', borderBottom: '1px solid var(--pz-line)', paddingBottom: '5px' }}>
          <span style={{ color: 'var(--pz-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            当前 {currentEquippedItem ? currentEquippedItem.name : '空槽位'}
          </span>
          <span style={{ color: 'var(--pz-brass-deep)', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '8px' }}>
            替换后差值
          </span>
        </div>

        {currentStats && simulatedStats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {compareKeys.map(k => {
              const before = (currentStats as any)[k] ?? 0;
              const after = (simulatedStats as any)[k] ?? 0;
              const isCrit = k === 'critChance';
              const diff = isCrit
                ? Math.round((after - before) * 100)
                : Math.round(after - before);
              if (diff === 0 && before === 0) return null;

              const isUp = diff > 0;
              const isDown = diff < 0;

              return (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', background: 'rgba(42,36,24,.05)', padding: '4px 8px', borderRadius: '3px' }}>
                  <span style={{ color: 'var(--pz-ink-3)' }}>{STAT_LABEL[k]}</span>
                  <div>
                    <span style={{ color: 'var(--pz-ink)', marginRight: '4px' }}>
                      {isCrit ? `${Math.round(after * 100)}%` : after}
                    </span>
                    {isUp && (
                      <span style={{ color: '#3F6E52', fontWeight: 700 }}>
                        ↑+{isCrit ? `${diff}%` : diff}
                      </span>
                    )}
                    {isDown && (
                      <span style={{ color: 'var(--pz-wine)', fontWeight: 700 }}>
                        ↓{isCrit ? `${diff}%` : diff}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </div>

      {/* 底部双按钮：直接穿戴替换 / 放入战利品背包 */}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 14px 12px', borderTop: '1px solid var(--pz-line)' }}>
        <button
          onClick={() => {
            if (selectedHero) {
              onEquipToHero(selectedHero.id, loot);
            }
          }}
          style={{
            flex: 1.3,
            padding: '11px 0',
            background: 'var(--pz-wine)',
            color: '#F6EFDF',
            border: 'none',
            borderRadius: 'var(--pz-r-btn)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          装备给 {selectedHero?.name}
        </button>
        <button
          onClick={() => {
            onPutIntoInventory(loot);
          }}
          style={{
            flex: 1,
            padding: '11px 0',
            background: 'transparent',
            color: 'var(--pz-ink-2)',
            border: '1px solid var(--pz-line-2)',
            borderRadius: 'var(--pz-r-btn)',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          存入战利品包
        </button>
      </div>
    </div>
  );
};
