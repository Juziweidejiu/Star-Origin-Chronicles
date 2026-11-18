import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Crown, Grid3x3, Package, Shield, Sword, Gem } from 'lucide-react';
import type { ClassId, Equipment, Hero } from '../types/hero';
import type { FormationSlotAssignment, GridColumn, GridRow } from '../types/formation';
import { GRID_SLOTS } from '../types/formation';
import { CLASS_CONFIG, heroRoleLabel } from '../engine/heroFactory';
import { heroXpProgress } from '../engine/progressionEngine';
import { resolveStats, describeBase, STAT_LABEL } from '../engine/statResolver';
import { RARITY_LABEL } from '../engine/dungeonEngine';
import { Btn, Card, Tag } from './ui';

interface RosterViewProps {
  roster: Hero[];
  deployedHeroIds: string[];
  formationAssignments: FormationSlotAssignment[];
  formationPresetName: string;
  inventory: Equipment[];
  inventoryTarget: string;
  onInventoryTargetChange: (id: string) => void;
  onOpenFormation: () => void;
  onSwapHero: (deployedId: string, reserveId: string) => void;
  onUnequip: (heroId: string, slot: 'weapon' | 'armor' | 'trinket') => void;
  onEquip: (heroId: string, item: Equipment) => void;
}

const RARITY_COLOR: Record<string, string> = {
  legendary: '#A9793A',
  epic: '#7A4E8C',
  rare: '#2F6E8F',
  uncommon: '#4E7A5A',
  common: '#5C513C',
};

const COLUMNS: { key: GridColumn; label: string }[] = [
  { key: 'front', label: '前排' },
  { key: 'mid', label: '中排' },
  { key: 'back', label: '后卫' },
];
const ROWS: GridRow[] = ['top', 'center', 'bottom'];

/** 折叠条：标题 + 摘要，点击展开/收起下方滑动区 */
const FoldBar: React.FC<{
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  style?: React.CSSProperties;
}> = ({ title, summary, open, onToggle, style }) => (
  <button
    onClick={onToggle}
    aria-expanded={open}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      flex: '0 0 auto',
      padding: '8px 10px',
      borderRadius: 'var(--pz-r-card)',
      border: `1px solid ${open ? 'var(--pz-brass-deep)' : 'var(--pz-line)'}`,
      background: open ? 'var(--pz-raised)' : 'rgba(255,255,255,.32)',
      color: 'var(--pz-ink)',
      fontFamily: 'var(--pz-sans)',
      textAlign: 'left',
      cursor: 'pointer',
      ...style,
    }}
  >
    <span style={{ width: 3, height: 16, background: 'var(--pz-brass)', borderRadius: 2, flexShrink: 0 }} />
    <span style={{ flex: 1, minWidth: 0 }}>
      <span
        style={{
          display: 'block',
          fontFamily: 'var(--pz-serif)',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </span>
      <span
        className="pz-micro"
        style={{ display: 'block', color: 'var(--pz-ink-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {summary}
      </span>
    </span>
    <ChevronDown
      size={15}
      color="var(--pz-ink-3)"
      style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .18s' }}
    />
  </button>
);

export const RosterView: React.FC<RosterViewProps> = ({
  roster,
  deployedHeroIds,
  formationAssignments,
  formationPresetName,
  inventory,
  inventoryTarget,
  onInventoryTargetChange,
  onOpenFormation,
  onSwapHero,
  onUnequip,
  onEquip,
}) => {
  const deployedSquad = roster.filter(h => deployedHeroIds.includes(h.id));
  const reserves = roster.filter(h => !deployedHeroIds.includes(h.id));
  const slotHero = (col: GridColumn, row: GridRow) => {
    const meta = GRID_SLOTS.find(s => s.col === col && s.row === row);
    if (!meta) return undefined;
    const assign = formationAssignments.find(a => a.slotId === meta.id);
    if (!assign) return undefined;
    return roster.find(h => h.id === assign.heroId);
  };

  const [openPanel, setOpenPanel] = useState<'roster' | 'inventory' | null>(() => {
    // 便于直接调试展开状态：?panel=roster / ?panel=inventory
    const q = new URLSearchParams(window.location.search).get('panel');
    return q === 'roster' || q === 'inventory' ? q : null;
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'deployed' | 'reserve'>('all');
  const [classFilter, setClassFilter] = useState<ClassId | 'all'>('all');
  const [sortBy, setSortBy] = useState<'level' | 'ability' | 'hp'>('level');

  const classOptions = useMemo(() => Array.from(new Set(roster.map(h => h.classId))), [roster]);

  const visibleHeroes = useMemo(() => {
    const filtered = roster.filter(h => {
      if (statusFilter === 'deployed' && !deployedHeroIds.includes(h.id)) return false;
      if (statusFilter === 'reserve' && deployedHeroIds.includes(h.id)) return false;
      if (classFilter !== 'all' && h.classId !== classFilter) return false;
      return true;
    });
    if (sortBy === 'ability') return filtered.sort((a, b) => b.currentAbility - a.currentAbility);
    if (sortBy === 'hp') return filtered.sort((a, b) => b.maxHp - a.maxHp);
    return filtered.sort((a, b) => b.level - a.level);
  }, [roster, deployedHeroIds, statusFilter, classFilter, sortBy]);

  const hasFilter = statusFilter !== 'all' || classFilter !== 'all';
  const resetFilters = () => {
    setStatusFilter('all');
    setClassFilter('all');
  };

  const avgLevel = roster.length ? Math.round(roster.reduce((sum, h) => sum + h.level, 0) / roster.length) : 0;
  const totalWage = roster.reduce((sum, h) => sum + h.wage, 0);
  const injuredCount = roster.filter(h => h.injuries.length > 0).length;
  const stressedCount = roster.filter(h => h.stress >= 60).length;

  const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: 'var(--pz-raised)',
    color: 'var(--pz-ink)',
    border: '1px solid var(--pz-line)',
    borderRadius: 4,
    padding: '4px 6px',
    fontSize: 12,
  };
  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 10px',
    borderRadius: 999,
    border: `1px solid ${active ? 'var(--pz-brass-deep)' : 'var(--pz-line)'}`,
    background: active ? 'var(--pz-brass)' : 'rgba(255,255,255,.32)',
    color: active ? '#2A2115' : 'var(--pz-ink-2)',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    fontFamily: 'var(--pz-sans)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div className="pz-page">
      {/* 固定区：名册概览 + 3×3 编队 */}
      <Card style={{ flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div>
            <div className="pz-h2" style={{ fontFamily: 'var(--pz-serif)' }}>
              现役名册 <span className="pz-mono" style={{ fontFamily: 'var(--pz-mono)' }}>{roster.length}/8</span>
            </div>
            <div className="pz-sub" style={{ marginTop: 2 }}>
              首发 {deployedSquad.length} · 待命 {reserves.length} · 阵型「{formationPresetName}」
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={onOpenFormation}>
            <Grid3x3 size={13} /> 调位
          </Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {COLUMNS.map(c => (
            <div key={c.key} className="pz-micro" style={{ textAlign: 'center', color: 'var(--pz-ink-3)', letterSpacing: '.14em' }}>
              {c.label}
            </div>
          ))}
          {ROWS.map(row =>
            COLUMNS.map(col => {
              const hero = slotHero(col.key, row);
              if (!hero) {
                return (
                  <div
                    key={col.key + row}
                    style={{
                      minHeight: 54,
                      borderRadius: 'var(--pz-r-seal)',
                      border: '1px dashed var(--pz-line)',
                      background: 'rgba(42,36,24,.025)',
                    }}
                  />
                );
              }
              const hpRatio = hero.maxHp > 0 ? hero.currentHp / hero.maxHp : 0;
              return (
                <div
                  key={col.key + row}
                  onClick={onOpenFormation}
                  style={{
                    minHeight: 54,
                    padding: '4px 5px',
                    borderRadius: 'var(--pz-r-seal)',
                    border: '1px solid var(--pz-line-2)',
                    background: 'var(--pz-raised)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 3,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {hero.isLeader ? <Crown size={9} color="var(--pz-brass-deep)" /> : null}
                    <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {hero.name}
                    </span>
                  </div>
                  <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', lineHeight: 1 }}>
                    {heroRoleLabel(hero)} · {hero.level}级
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(42,36,24,.14)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, hpRatio * 100))}%`,
                        height: '100%',
                        background: hpRatio < 0.4 ? 'var(--pz-combat)' : 'var(--pz-success)',
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div
          className="pz-micro"
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--pz-ink-3)' }}
        >
          点击站位或「调位」进入 3×3 编队 <ChevronRight size={11} />
        </div>
      </Card>

      {/* 折叠区：队员 / 团队背包（互斥展开） */}
      <div className="pz-col" style={{ flex: 1, minHeight: 0, gap: 8 }}>
        <div className="pz-row" style={{ gap: 6, flex: '0 0 auto', alignItems: 'stretch' }}>
          <FoldBar
            title="队员"
            summary={`首发 ${deployedSquad.length} / 待命 ${reserves.length}`}
            open={openPanel === 'roster'}
            onToggle={() => setOpenPanel(openPanel === 'roster' ? null : 'roster')}
            style={{ flex: 1, minWidth: 0 }}
          />
          <FoldBar
            title="团队背包"
            summary={`${inventory.length} 件`}
            open={openPanel === 'inventory'}
            onToggle={() => setOpenPanel(openPanel === 'inventory' ? null : 'inventory')}
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>

        {openPanel === 'roster' && (
          <div className="pz-col" style={{ flex: '0 0 auto', gap: 6 }}>
            <div className="pz-between" style={{ gap: 6 }}>
              <div className="pz-row" style={{ gap: 4 }}>
                {(
                  [
                    ['all', '全部'],
                    ['deployed', '首发'],
                    ['reserve', '待命'],
                  ] as const
                ).map(([key, label]) => (
                  <button key={key} onClick={() => setStatusFilter(key)} style={pillStyle(statusFilter === key)}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', whiteSpace: 'nowrap' }}>
                显示 {visibleHeroes.length} / {roster.length} 人
              </span>
            </div>
            <div className="pz-row" style={{ gap: 6 }}>
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value as ClassId | 'all')}
                style={selectStyle}
                aria-label="按职业筛选"
              >
                <option value="all">全部职业</option>
                {classOptions.map(c => (
                  <option key={c} value={c}>
                    {CLASS_CONFIG[c].name}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'level' | 'ability' | 'hp')}
                style={selectStyle}
                aria-label="排序方式"
              >
                <option value="level">按等级</option>
                <option value="ability">按战力 CA</option>
                <option value="hp">按生命</option>
              </select>
            </div>
          </div>
        )}

        <div className="pz-page-scroll pz-col" style={{ gap: 10 }}>
          {openPanel === 'roster' &&
            (visibleHeroes.length === 0 ? (
              <div
                className="pz-body"
                style={{
                  padding: '22px 12px',
                  textAlign: 'center',
                  color: 'var(--pz-ink-3)',
                  border: '1px dashed var(--pz-line-2)',
                  borderRadius: 'var(--pz-r-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>没有符合筛选的队员。</span>
                {hasFilter && (
                  <Btn variant="quiet" size="sm" onClick={resetFilters}>
                    清除筛选
                  </Btn>
                )}
              </div>
            ) : (
              visibleHeroes.map(hero => {
        const isDeployed = deployedHeroIds.includes(hero.id);
        const xp = heroXpProgress(hero);
        const st = resolveStats(hero);
        const hpRatio = hero.maxHp > 0 ? hero.currentHp / hero.maxHp : 0;

        return (
          <Card key={hero.id} variant={isDeployed ? 'raised' : 'flat'} style={{ opacity: isDeployed ? 1 : 0.94 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {hero.isLeader ? <Crown size={13} color="var(--pz-brass-deep)" /> : null}
                  <span className="pz-h2" style={{ fontFamily: 'var(--pz-serif)' }}>{hero.name}</span>
                  <Tag tone={isDeployed ? 'safe' : 'default'}>{isDeployed ? '首发' : '待命'}</Tag>
                </div>
                <div className="pz-sub" style={{ marginTop: 2 }}>
                  {hero.level} 级 {heroRoleLabel(hero)} · 周薪 {hero.wage} G
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="pz-mono" style={{ fontSize: 12, color: 'var(--pz-ink-2)' }}>
                  CA {hero.currentAbility}
                  <span style={{ color: 'var(--pz-ink-3)' }}> / {hero.potentialAbility}</span>
                </div>
                {!isDeployed && deployedSquad.length > 0 ? (
                  <select
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) {
                        onSwapHero(e.target.value, hero.id);
                        e.target.value = '';
                      }
                    }}
                    style={{
                      marginTop: 4,
                      background: 'var(--pz-brass)',
                      color: '#2A2115',
                      border: 'none',
                      borderRadius: 4,
                      padding: '3px 6px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <option value="" disabled>
                      换上首发
                    </option>
                    {deployedSquad.map(d => (
                      <option key={d.id} value={d.id}>
                        替换 {d.name}
                      </option>
                    ))}
                  </select>
                ) : isDeployed ? (
                  <Btn variant="quiet" size="sm" onClick={onOpenFormation} style={{ marginTop: 4 }}>
                    调位
                  </Btn>
                ) : null}
              </div>
            </div>

            {/* 生命 / 士气 / 压力 */}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', width: 26 }}>生命</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(42,36,24,.12)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, hpRatio * 100))}%`,
                    height: '100%',
                    background: hpRatio < 0.4 ? 'var(--pz-combat)' : 'var(--pz-success)',
                  }}
                />
              </div>
              <span className="pz-mono" style={{ fontSize: 11, color: 'var(--pz-ink-2)' }}>
                {hero.currentHp}/{hero.maxHp}
              </span>
            </div>

            {/* 经验 / 成长 */}
            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', width: 26 }}>经验</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(42,36,24,.12)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${xp.percent}%`,
                    height: '100%',
                    background: xp.isMax ? 'var(--pz-brass)' : 'var(--pz-dungeon)',
                  }}
                />
              </div>
              <span className="pz-mono" style={{ fontSize: 11, color: 'var(--pz-ink-3)' }}>
                {xp.isMax ? '满级' : `${xp.into}/${xp.need}`}
              </span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', gap: 10, fontSize: 11, color: 'var(--pz-ink-2)' }}>
              <span>士气 {hero.morale}</span>
              <span>压力 {hero.stress}/100</span>
              <span style={{ color: hero.injuries.length ? 'var(--pz-wine)' : 'var(--pz-success)' }}>
                {hero.injuries.length ? `伤残 ${hero.injuries.join('、')}` : '肢体健康'}
              </span>
            </div>

            {/* 装备 */}
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(
                [
                  ['weapon', Sword, hero.equipment.weapon],
                  ['armor', Shield, hero.equipment.armor],
                  ['trinket', Gem, hero.equipment.trinket],
                ] as const
              ).map(([slot, Icon, item]) => (
                <div
                  key={slot}
                  onClick={() => item && onUnequip(hero.id, slot)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 7px',
                    borderRadius: 'var(--pz-r-seal)',
                    border: '1px solid ' + (item ? 'var(--pz-line)' : 'transparent'),
                    background: item ? 'rgba(247,239,221,.55)' : 'transparent',
                    cursor: item ? 'pointer' : 'default',
                    fontSize: 11,
                  }}
                  title={item ? `${describeBase(item)}${item.affixText ? ' | ' + item.affixText : ''}` : ''}
                >
                  <Icon size={12} color={item ? RARITY_COLOR[item.rarity] : 'var(--pz-ink-3)'} />
                  {item ? (
                    <span style={{ color: RARITY_COLOR[item.rarity], fontWeight: 700 }}>{item.name}</span>
                  ) : (
                    <span style={{ color: 'var(--pz-ink-3)' }}>未佩戴</span>
                  )}
                  {item ? (
                    <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginLeft: 'auto' }}>
                      {RARITY_LABEL[item.rarity]} · T{item.tier}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            {/* 九维面板 */}
            <div
              style={{
                marginTop: 8,
                padding: '7px 9px',
                borderRadius: 'var(--pz-r-seal)',
                background: 'var(--pz-sunken)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '3px 8px',
                fontSize: 11,
              }}
            >
              <span>{STAT_LABEL.ad} <b className="pz-mono">{st.ad}</b></span>
              <span>{STAT_LABEL.ap} <b className="pz-mono">{st.ap}</b></span>
              <span>{STAT_LABEL.maxHp} <b className="pz-mono">{st.maxHp}</b></span>
              <span>{STAT_LABEL.armor} <b className="pz-mono">{st.armor}</b></span>
              <span>{STAT_LABEL.magicResist} <b className="pz-mono">{st.magicResist}</b></span>
              <span>攻速 <b className="pz-mono">{(1 / st.attackInterval).toFixed(2)}</b></span>
              <span>{STAT_LABEL.critChance} <b className="pz-mono">{Math.round(st.critChance * 100)}%</b></span>
              <span>{STAT_LABEL.critDamage} <b className="pz-mono">{Math.round(st.critDamage * 100)}%</b></span>
              <span>{STAT_LABEL.penetration} <b className="pz-mono">{st.penetration}</b></span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {hero.traits.map(t => (
                <Tag key={t} tone="safe">{t}</Tag>
              ))}
            </div>
          </Card>
                );
              })))}

          {openPanel === 'inventory' && (
            <Card style={{ flex: '0 0 auto' }}>
              {inventory.length === 0 ? (
          <div className="pz-body" style={{ color: 'var(--pz-ink-3)' }}>
            背包空着。地牢里的箱子还没打开。
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Package size={13} color="var(--pz-ink-3)" />
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>穿戴至</span>
              <select
                value={inventoryTarget || roster[0]?.id || ''}
                onChange={e => onInventoryTargetChange(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--pz-raised)',
                  color: 'var(--pz-ink)',
                  border: '1px solid var(--pz-line)',
                  borderRadius: 4,
                  padding: '4px 6px',
                  fontSize: 12,
                }}
              >
                {roster.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pz-col" style={{ gap: 6 }}>
              {inventory.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 9px',
                    borderRadius: 'var(--pz-r-seal)',
                    borderLeft: `3px solid ${RARITY_COLOR[item.rarity]}`,
                    background: 'rgba(247,239,221,.6)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: RARITY_COLOR[item.rarity] }}>
                      {item.name}
                      <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', fontWeight: 400, marginLeft: 5 }}>
                        T{item.tier}
                      </span>
                    </div>
                    <div className="pz-micro" style={{ color: 'var(--pz-ink-2)', marginTop: 1 }}>
                      {describeBase(item)}
                      {item.affixText ? <span style={{ color: 'var(--pz-ink-3)' }}> · {item.affixText}</span> : null}
                    </div>
                  </div>
                  <Btn size="sm" variant="brass" onClick={() => onEquip(inventoryTarget || roster[0]?.id || '', item)}>
                    装备
                  </Btn>
                </div>
              ))}
            </div>
          </>
              )}
            </Card>
          )}

          {openPanel === null && (
            <Card style={{ flex: '0 0 auto' }}>
              <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', letterSpacing: '.12em' }}>队伍概览</div>
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 10px', fontSize: 12 }}>
                <span className="pz-between">
                  <span style={{ color: 'var(--pz-ink-2)' }}>平均等级</span>
                  <b className="pz-mono">{avgLevel}</b>
                </span>
                <span className="pz-between">
                  <span style={{ color: 'var(--pz-ink-2)' }}>周薪合计</span>
                  <b className="pz-mono">{totalWage} G</b>
                </span>
                <span className="pz-between">
                  <span style={{ color: 'var(--pz-ink-2)' }}>带伤</span>
                  <b className="pz-mono" style={{ color: injuredCount ? 'var(--pz-wine)' : 'inherit' }}>{injuredCount} 人</b>
                </span>
                <span className="pz-between">
                  <span style={{ color: 'var(--pz-ink-2)' }}>高压</span>
                  <b className="pz-mono" style={{ color: stressedCount ? 'var(--pz-wine)' : 'inherit' }}>{stressedCount} 人</b>
                </span>
              </div>
              <div
                className="pz-body"
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '1px dashed var(--pz-line)',
                  color: 'var(--pz-ink-3)',
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                名册已收起 · 点上方「队员」查看九维与装备，或「团队背包」给队员换装。
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
