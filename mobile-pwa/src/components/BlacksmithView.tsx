import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Flame,
  Gem,
  Hammer,
  Lock,
  Pickaxe,
  Recycle,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
} from 'lucide-react';
import type { Equipment, Hero } from '../types/hero';
import type { CompanyLogistics } from '../types/world';
import { Btn } from './ui';
import {
  CRAFT_AFFIX_POOL,
  BLUEPRINTS,
  BLUEPRINT_MAP,
  MATERIALS,
  TIER_COLOR,
  TIER_LABEL,
  blueprintBase,
  type Blueprint,
  type MaterialId,
} from '../engine/blueprintData';
import {
  BOSS_MARKUP,
  DEFAULT_SETTINGS,
  MATERIAL_ORDER,
  PHASE_ROUNDS,
  addMaterials,
  blueprintBookProgress,
  bossQuality,
  canPay,
  costText,
  craftBeat,
  craftGoldCost,
  craftMaterialCost,
  formatAffixValue,
  professionBar,
  professionGain,
  professionMods,
  rarityRank,
  rerollAffixes,
  salvageMaterials,
  settleCraft,
  startCraft,
  withXp,
  xpOf,
  type CraftProgress,
  type CraftSession,
  type CraftSettings,
} from '../engine/craftEngine';
import { RARITY_LABEL, qualityLabel } from '../engine/dungeonEngine';
import { reforgeCost, reforgeEquipment, rerollCost, salvageYield } from '../engine/blacksmithEngine';
import { STAT_LABEL } from '../engine/statResolver';

const SLOT_LABEL: Record<Equipment['slot'], string> = { weapon: '武器', armor: '护甲', trinket: '饰品' };

let craftSerial = 0;
const nextCraftId = () => {
  craftSerial += 1;
  return `craft_${Date.now().toString(36)}_${craftSerial.toString(36)}`;
};
const SLOT_ICON: Record<Equipment['slot'], React.ReactNode> = {
  weapon: <Swords size={16} />,
  armor: <Shield size={16} />,
  trinket: <Gem size={16} />,
};

const GRADE_LABEL: Record<1 | 2 | 3, string> = { 1: '省料', 2: '足料', 3: '豪掷' };
const PHASE_ACTION: Record<CraftSession['phase'], string> = { heat: '鼓 风', hammer: '落 锤', quench: '入 水' };
const PHASE_HINT: Record<CraftSession['phase'], string> = {
  heat: '指针落进黄铜区再鼓风，火候越准品质越高',
  hammer: '锤头扫过砧面，贴着砧心落锤',
  quench: '指针压到正中的红线时入水',
};
const PHASE_TITLE: Record<CraftSession['phase'], string> = { heat: '火候', hammer: '锻打', quench: '淬火' };

function cents(value: number): string {
  return value.toFixed(2);
}

/** 顶部材料条：一眼看清家底 */
const MaterialBar: React.FC<{ craft: CraftProgress }> = ({ craft }) => (
  <div className="pz-card pz-row" style={{ gap: 6, padding: '8px 10px', flexWrap: 'wrap', flex: '0 0 auto' }}>
    {MATERIAL_ORDER.map((id) => (
      <span
        key={id}
        className="pz-micro"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--pz-ink-2)' }}
      >
        <span style={{ color: MATERIALS[id].kind === 'base' ? 'var(--pz-brass-deep)' : 'var(--pz-wine)' }}>
          {MATERIALS[id].short}
        </span>
        {craft.materials[id] ?? 0}
      </span>
    ))}
  </div>
);

const PERCENT_STATS = new Set(['critChance', 'critDamage', 'attackSpeed', 'tenacity']);

/** 图纸卡面：public/art/items/{id}.svg，取不到时回落到部位图标 */
const BlueprintArt: React.FC<{ bp: Blueprint; size: number; muted?: boolean }> = ({ bp, size, muted }) => {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span style={{ color: muted ? 'var(--pz-ink-3)' : TIER_COLOR[bp.tier], display: 'flex' }}>
        {SLOT_ICON[bp.slot]}
      </span>
    );
  }
  return (
    <img
      src={`${import.meta.env.BASE_URL}art/items/${bp.id}.svg`}
      alt=""
      width={size}
      height={size}
      onError={() => setBroken(true)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        opacity: muted ? 0.45 : 1,
        filter: muted ? 'grayscale(1)' : undefined,
        flex: '0 0 auto',
      }}
    />
  );
};

const StatChips: React.FC<{ base: Partial<Record<string, number>> }> = ({ base }) => (
  <div className="pz-row" style={{ gap: 5, flexWrap: 'wrap' }}>
    {Object.entries(base).map(([key, value]) => (
      <span
        key={key}
        className="pz-tag"
        style={{ fontSize: 11, padding: '2px 6px', color: 'var(--pz-ink-2)' }}
      >
        {STAT_LABEL[key as keyof typeof STAT_LABEL] ?? key} +{PERCENT_STATS.has(key) ? `${Math.round((value ?? 0) * 100)}%` : (value ?? 0)}
      </span>
    ))}
  </div>
);

interface BenchProps {
  bp: Blueprint;
  craft: CraftProgress;
  gold: number;
  discount: number;
  onBack: () => void;
  onSelf: (settings: CraftSettings) => void;
  onBoss: (settings: CraftSettings, goldCost: number) => void;
  notice: string | null;
}

const CraftBench: React.FC<BenchProps> = ({ bp, craft, gold, discount, onBack, onSelf, onBoss, notice }) => {
  const [settings, setSettings] = useState<CraftSettings>(DEFAULT_SETTINGS);
  const mats = craftMaterialCost(bp, settings);
  const goldCost = craftGoldCost(bp, discount);
  const bossGold = craftGoldCost(bp, discount, true);
  const affordable = canPay(craft.materials, mats) && gold >= goldCost;
  const bossAffordable = canPay(craft.materials, mats) && gold >= bossGold;
  const prof = professionBar(xpOf(craft, bp.tier));
  const mods = professionMods(xpOf(craft, bp.tier));
  const owned = craft.unlocked.includes(bp.id);
  const made = craft.counts[bp.id] ?? 0;

  return (
    <div className="pz-col" style={{ gap: 10 }}>
      <button
        onClick={onBack}
        className="pz-row"
        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--pz-ink-3)', fontSize: 12, gap: 4, cursor: 'pointer' }}
      >
        <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} /> 返回图纸册
      </button>

      <div className="pz-card" style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <BlueprintArt bp={bp} size={46} />
        <div className="pz-col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--pz-serif)', fontSize: 15, fontWeight: 700 }}>{bp.name}</span>
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
            {TIER_LABEL[bp.tier]} · {SLOT_LABEL[bp.slot]} · 已打 {made} 件
          </span>
        </div>
        <span className="pz-tag" style={{ fontSize: 10, color: TIER_COLOR[bp.tier] }}>
          T{bp.tier}
        </span>
      </div>

      <div className="pz-card" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>底板属性</div>
        <StatChips base={blueprintBase(bp)} />
        <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginTop: 2, lineHeight: 1.5 }}>
          词条池 {CRAFT_AFFIX_POOL[bp.slot].length} 条：{CRAFT_AFFIX_POOL[bp.slot].slice(0, 4).map((d) => d.name).join(' / ')}
          {CRAFT_AFFIX_POOL[bp.slot].length > 4 ? ' …' : ''}
        </div>
      </div>

      <div className="pz-card" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="pz-row" style={{ justifyContent: 'space-between' }}>
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>备料档次 · 决定品质区间与容错</span>
        </div>
        <div className="pz-row" style={{ gap: 6 }}>
          {([1, 2, 3] as const).map((grade) => {
            const on = settings.grade === grade;
            return (
              <button
                key={grade}
                onClick={() => setSettings((s) => ({ ...s, grade }))}
                className="pz-btn pz-btn--ghost"
                style={{
                  flex: 1,
                  fontSize: 12,
                  padding: '5px 0',
                  background: on ? 'var(--pz-raised)' : 'transparent',
                  borderColor: on ? 'var(--pz-brass-deep)' : 'var(--pz-line)',
                  color: on ? 'var(--pz-ink)' : 'var(--pz-ink-3)',
                }}
              >
                {GRADE_LABEL[grade]} ×{grade}
              </button>
            );
          })}
        </div>

        <div className="pz-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>精煤 · 每份拓宽火候容错</span>
          <div className="pz-row" style={{ gap: 4 }}>
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setSettings((s) => ({ ...s, coal: n }))}
                className="pz-btn pz-btn--quiet"
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  fontSize: 11,
                  background: settings.coal === n ? 'var(--pz-raised)' : 'transparent',
                  borderColor: settings.coal === n ? 'var(--pz-brass-deep)' : 'var(--pz-line)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="pz-row" style={{ gap: 6 }}>
          <button
            onClick={() => setSettings((s) => ({ ...s, oil: !s.oil }))}
            className="pz-btn pz-btn--ghost"
            style={{
              flex: 1,
              fontSize: 11,
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderColor: settings.oil ? 'var(--pz-brass-deep)' : 'var(--pz-line)',
              background: settings.oil ? 'var(--pz-raised)' : 'transparent',
            }}
          >
            <Flame size={12} /> 淬火油 {craft.materials.oil ?? 0}
          </button>
          <button
            onClick={() => setSettings((s) => ({ ...s, sand: !s.sand }))}
            className="pz-btn pz-btn--ghost"
            style={{
              flex: 1,
              fontSize: 11,
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderColor: settings.sand ? 'var(--pz-brass-deep)' : 'var(--pz-line)',
              background: settings.sand ? 'var(--pz-raised)' : 'transparent',
            }}
          >
            <Sparkles size={12} /> 星陨砂 {craft.materials.sand ?? 0}
          </button>
        </div>
        <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
          淬火油把品质下限抬到 0.98；星陨砂额外一条词条
        </div>

        <div
          className="pz-row"
          style={{ borderTop: '1px dashed var(--pz-line)', paddingTop: 6, justifyContent: 'space-between', fontSize: 12 }}
        >
          <span style={{ color: 'var(--pz-ink-2)' }}>{costText(mats)}</span>
          <span style={{ color: 'var(--pz-ink-3)' }}>工钱 {goldCost} 金</span>
        </div>
      </div>

      <div className="pz-row" style={{ gap: 6 }}>
        <Btn variant="main" block onClick={() => onSelf(settings)} disabled={!owned || !affordable}>
          自己打造
        </Btn>
        <Btn variant="brass" block onClick={() => onBoss(settings, bossGold)} disabled={!owned || !bossAffordable}>
          交给老板 · {bossGold} 金
        </Btn>
      </div>
      <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
        老板出品：品质 1.00–1.06 保底 · 词条随机 · 不涨熟练度 · 工钱{' '}
        {Math.round((BOSS_MARKUP - 1) * 100)}% 加价
      </div>

      <div className="pz-card" style={{ padding: '8px 10px' }}>
        <div className="pz-row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
            匠艺 T{bp.tier} · Lv.{prof.level}
          </span>
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
            {prof.current}/{prof.need} xp
          </span>
        </div>
        <div className="pz-bar" style={{ height: 5 }}>
          <span style={{ width: `${Math.round(prof.pct * 100)}%`, background: 'var(--pz-brass)' }} />
        </div>
        <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginTop: 5 }}>
          命中区 ×{mods.win.toFixed(2)}、指针 −{Math.round((1 - mods.speed) * 100)}%
        </div>
      </div>

      {notice && (
        <div className="pz-micro" style={{ color: 'var(--pz-wine)' }}>
          {notice}
        </div>
      )}
    </div>
  );
};

interface MinigameProps {
  session: CraftSession;
  bp: Blueprint;
  mods: ReturnType<typeof professionMods>;
  onBeat: (pos: number) => void;
  onExit: () => void;
}

const CraftMinigame: React.FC<MinigameProps> = ({ session, bp, mods, onBeat, onExit }) => {
  const [pos, setPos] = useState(50);
  const posRef = useRef(50);
  const dirRef = useRef(1);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      posRef.current += dirRef.current * session.speed * 55 * dt;
      if (posRef.current >= 98) {
        posRef.current = 98;
        dirRef.current = -1;
      } else if (posRef.current <= 2) {
        posRef.current = 2;
        dirRef.current = 1;
      }
      setPos(posRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [session.speed]);

  const total = PHASE_ROUNDS[session.phase];
  const zoneLeft = session.phase === 'quench' ? 50 - session.zoneWidth / 2 : session.zoneCenter - session.zoneWidth / 2;
  const qualityPct = Math.max(0, Math.min(1, (session.quality - 0.82) / 0.48));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'radial-gradient(70% 55% at 50% 42%, #3A2A18, #14100A 78%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 16px 22px',
        color: 'var(--pz-ink)',
      }}
    >
      <div className="pz-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="pz-micro" style={{ color: 'rgba(243,233,210,.6)', letterSpacing: '.16em' }}>
          {bp.name}
        </span>
        <button
          onClick={onExit}
          className="pz-micro"
          style={{ background: 'none', border: 'none', color: 'rgba(243,233,210,.6)', cursor: 'pointer' }}
        >
          退出
        </button>
      </div>

      <div className="pz-col" style={{ gap: 6, marginTop: 14 }}>
        <div className="pz-row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#E8D9BB' }}>火候 · 品质 {cents(session.quality)}</span>
          <span className="pz-micro" style={{ color: 'rgba(243,233,210,.55)' }}>
            {PHASE_TITLE[session.phase]} {Math.min(session.step + 1, total)}/{total}
          </span>
        </div>
        <div className="pz-bar" style={{ height: 5, background: 'rgba(255,255,255,.12)' }}>
          <span style={{ width: `${Math.round(qualityPct * 100)}%`, background: 'linear-gradient(90deg,#B4632A,#D9A45B)' }} />
        </div>
      </div>

      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          margin: '14px 0 10px',
          borderRadius: 14,
          border: '1px solid rgba(243,233,210,.12)',
          background: 'radial-gradient(70% 46% at 50% 74%, rgba(255,168,78,.18), rgba(0,0,0,.35) 72%)',
          boxShadow: 'inset 0 -20px 40px rgba(0,0,0,.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 14px 18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', color: session.phase === 'quench' ? '#8FD3D8' : '#E8D9BB' }}>
          {session.phase === 'quench' ? <Gem size={64} /> : <Hammer size={64} />}
        </div>

        <div className="pz-col" style={{ gap: 8 }}>
          <div style={{ position: 'relative', height: 26, borderRadius: 5, background: 'rgba(255,255,255,.10)' }}>
            <span
              style={{
                position: 'absolute',
                top: 4,
                bottom: 4,
                left: `${zoneLeft}%`,
                width: `${session.zoneWidth}%`,
                borderRadius: 4,
                background: 'linear-gradient(180deg, rgba(217,164,91,.5), rgba(217,164,91,.22))',
                boxShadow: '0 0 14px rgba(255,180,80,.35)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: -3,
                bottom: -3,
                left: `${pos}%`,
                width: 2,
                marginLeft: -1,
                background: '#F3E9D2',
                boxShadow: '0 0 8px rgba(255,240,210,.9)',
              }}
            />
          </div>
          <div className="pz-row" style={{ justifyContent: 'space-between' }}>
            <span className="pz-micro" style={{ color: 'rgba(243,233,210,.5)' }}>
              {PHASE_HINT[session.phase]}
            </span>
            <span className="pz-micro" style={{ color: 'rgba(243,233,210,.4)' }}>
              完美 ±{((session.zoneWidth * mods.perfect) / 2).toFixed(1)}
            </span>
          </div>
          <div className="pz-row" style={{ gap: 5 }}>
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i < session.step ? 'var(--pz-brass)' : 'rgba(255,255,255,.16)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onBeat(posRef.current)}
        className="pz-btn pz-btn--main"
        style={{ height: 46, fontSize: 16, letterSpacing: '.1em', flex: '0 0 auto' }}
      >
        {PHASE_ACTION[session.phase]}
      </button>
    </div>
  );
};

const ResultSheet: React.FC<{
  item: Equipment;
  bp: Blueprint;
  current?: Equipment;
  source: 'self' | 'boss';
  xpGain: number;
  onClose: () => void;
}> = ({ item, bp, current, source, xpGain, onClose }) => {
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (item.affixes.length === 0) return;
    const timer = window.setInterval(() => {
      setLit((n) => {
        if (n >= item.affixes.length) {
          window.clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, 220);
    return () => window.clearInterval(timer);
  }, [item]);

  const better = (key: string): number => {
    const a = (item.base[key as keyof typeof item.base] ?? 0) as number;
    const b = (current?.base[key as keyof typeof current.base] ?? 0) as number;
    return a - b;
  };
  const keys = Array.from(new Set([...Object.keys(item.base), ...Object.keys(current?.base ?? {})]));

  return (
    <div
      className="pz-col"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 130,
        background: 'rgba(20,16,10,.72)',
        justifyContent: 'center',
        padding: 16,
        gap: 10,
      }}
    >
      <div className="pz-card pz-col" style={{ padding: '14px 14px 12px', gap: 8, maxHeight: '86vh', overflowY: 'auto' }}>
        <div className="pz-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--pz-serif)', fontSize: 16, fontWeight: 700 }}>{item.name}</span>
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
            {TIER_LABEL[bp.tier]} · {SLOT_LABEL[item.slot]}
          </span>
        </div>
        <div className="pz-row" style={{ gap: 6, alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, color: 'var(--pz-wine)', fontWeight: 600 }}>{RARITY_LABEL[item.rarity]}</span>
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
            品质 {cents(item.quality)} · {qualityLabel(item.quality)}
          </span>
        </div>

        <div style={{ borderTop: '1px dashed var(--pz-line)', paddingTop: 6 }} className="pz-col">
          <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginBottom: 4 }}>
            底板 · 与现役对比
          </div>
          {keys.map((key) => {
            const diff = better(key);
            const fmt = (v: number) =>
              PERCENT_STATS.has(key) ? `${Math.round(v * 1000) / 10}%` : `${Math.round(v * 10) / 10}`;
            return (
              <div key={key} className="pz-row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--pz-ink-2)' }}>{STAT_LABEL[key as keyof typeof STAT_LABEL] ?? key}</span>
                <span className="pz-row" style={{ gap: 4 }}>
                  <span>{fmt((item.base[key as keyof typeof item.base] ?? 0) as number)}</span>
                  {diff !== 0 && (
                    <span style={{ color: diff > 0 ? 'var(--pz-success)' : 'var(--pz-wine)', fontSize: 11 }}>
                      {diff > 0 ? '▲' : '▼'}
                      {fmt(Math.abs(diff))}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: '1px dashed var(--pz-line)', paddingTop: 6 }} className="pz-col">
          <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', marginBottom: 4 }}>
            词条 {item.affixes.length > 0 ? `${lit}/${item.affixes.length}` : '· 无'}
          </div>
          {item.affixes.length === 0 && (
            <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
              这件的火候只够做个素件，没有多余词条。
            </div>
          )}
          {item.affixes.map((affix, i) => (
            <div
              key={`${affix.label}-${i}`}
              className="pz-row"
              style={{
                justifyContent: 'space-between',
                fontSize: 12,
                opacity: i < lit ? 1 : 0,
                transform: i < lit ? 'none' : 'translateY(3px)',
                transition: 'opacity .22s ease, transform .22s ease',
              }}
            >
              <span style={{ color: 'var(--pz-brass-deep)' }}>{affix.name ? `${affix.name}·` : ''}{affix.label}</span>
              <span style={{ color: 'var(--pz-ink-2)' }}>{formatAffixValue(affix)}</span>
            </div>
          ))}
        </div>

        <div className="pz-micro" style={{ color: 'var(--pz-ink-3)', borderTop: '1px dashed var(--pz-line)', paddingTop: 6 }}>
          {source === 'boss'
            ? `老板代打 · 品质 ${cents(item.quality)}（保底 1.00–1.06）· 不涨熟练度`
            : `亲手打造 · 匠艺 +${xpGain} xp · ${bp.name}`}
        </div>

        <Btn variant="main" block onClick={onClose}>
          收下
        </Btn>
      </div>
    </div>
  );
};

type Tab = 'book' | 'craft' | 'reforge' | 'reroll' | 'salvage';

export interface BlacksmithViewProps {
  roster: Hero[];
  inventory: Equipment[];
  craft: CraftProgress;
  logistics: CompanyLogistics;
  discount: number;
  initialTab?: string | null;
  initialBlueprint?: string | null;
  onInventoryChange: (next: Equipment[]) => void;
  onRosterChange: (next: Hero[]) => void;
  onCraftChange: (next: CraftProgress) => void;
  onLogMessage: (msg: string) => void;
  triggerUpdate: () => void;
}

const BlacksmithView: React.FC<BlacksmithViewProps> = ({
  roster,
  inventory,
  craft: rawCraft,
  logistics,
  discount,
  initialTab,
  initialBlueprint,
  onInventoryChange,
  onRosterChange,
  onCraftChange,
  onLogMessage,
  triggerUpdate,
}) => {
  const craft = rawCraft;
  const [tab, setTab] = useState<Tab>(() => {
    const allowed: Tab[] = ['book', 'craft', 'reforge', 'reroll', 'salvage'];
    return allowed.includes(initialTab as Tab) ? (initialTab as Tab) : 'book';
  });
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialBlueprint && BLUEPRINT_MAP[initialBlueprint] ? initialBlueprint : null,
  );
  const [session, setSession] = useState<CraftSession | null>(null);
  const [result, setResult] = useState<{ item: Equipment; bp: Blueprint; source: 'self' | 'boss'; xpGain: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lockPick, setLockPick] = useState<Record<string, number | null>>({});

  const selected = selectedId ? BLUEPRINT_MAP[selectedId] : null;
  const book = blueprintBookProgress(craft.unlocked, BLUEPRINTS);

  const equipped = useMemo(() => {
    const rows: { hero: Hero; item: Equipment }[] = [];
    roster.forEach((hero) => {
      (['weapon', 'armor', 'trinket'] as const).forEach((slot) => {
        const item = hero.equipment[slot];
        if (item) rows.push({ hero, item });
      });
    });
    return rows.sort((a, b) => rarityRank(b.item.rarity) - rarityRank(a.item.rarity));
  }, [roster]);

  const openBlueprint = (bp: Blueprint) => {
    if (!craft.unlocked.includes(bp.id)) {
      onLogMessage(`图纸「${bp.name}」还没收录：${bp.hint}`);
      return;
    }
    setSelectedId(bp.id);
    setTab('craft');
    setNotice(null);
  };

  const payCraft = (bp: Blueprint, settings: CraftSettings, goldCost: number): boolean => {
    const mats = craftMaterialCost(bp, settings);
    if (!canPay(craft.materials, mats)) {
      setNotice('材料不足，去地牢或分解旧军械补一批。');
      return false;
    }
    if (logistics.gold < goldCost) {
      setNotice(`金币不足，还差 ${goldCost - logistics.gold}。`);
      return false;
    }
    logistics.gold -= goldCost;
    onCraftChange({ ...craft, materials: addMaterials(craft.materials, negate(mats)) });
    triggerUpdate();
    return true;
  };

  const handleSelf = (bp: Blueprint, settings: CraftSettings) => {
    const goldCost = Math.round(craftGoldCost(bp, discount));
    if (!payCraft(bp, settings, goldCost)) return;
    setNotice(null);
    setSession(startCraft(bp, settings, xpOf(craft, bp.tier)));
  };

  const handleBoss = (bp: Blueprint, settings: CraftSettings, goldCost: number) => {
    if (!payCraft(bp, settings, goldCost)) return;
    const item = settleCraft(
      {
        blueprintId: bp.id,
        tier: bp.tier,
        settings,
        phase: 'quench',
        step: 1,
        zoneCenter: 50,
        zoneWidth: 20,
        speed: 1,
        quality: bossQuality(),
        perfectHeat: 0,
        perfectHammer: 0,
        quench: 'exact',
        finished: true,
      },
      bp,
      nextCraftId(),
    );
    finishCraft(item, bp, 'boss', 0);
  };

  const finishCraft = (item: Equipment, bp: Blueprint, source: 'self' | 'boss', xpGain: number) => {
    onInventoryChange([...inventory, item]);
    const made = craft.counts[bp.id] ?? 0;
    let next: CraftProgress = { ...craft, counts: { ...craft.counts, [bp.id]: made + 1 } };
    if (source === 'self' && xpGain > 0) {
      next = withXp(next, bp.tier, xpOf(next, bp.tier) + xpGain);
    }
    onCraftChange(next);
    setSession(null);
    setResult({ item, bp, source, xpGain });
    onLogMessage(`出炉：${item.name}（品质 ${cents(item.quality)}，${item.affixes.length} 条词条）`);
  };

  const handleBeat = (pos: number) => {
    if (!session || !selected) return;
    const outcome = craftBeat(session, pos, xpOf(craft, selected.tier));
    setSession(outcome.session);
    if (!outcome.finished) return;
    const made = craft.counts[selected.id] ?? 0;
    const xpGain =
      outcome.session.settings.grade > 0
        ? professionGain(outcome.session.quality, outcome.session.perfectHeat + outcome.session.perfectHammer, made)
        : 0;
    const item = settleCraft(outcome.session, selected, nextCraftId());
    finishCraft(item, selected, 'self', xpGain);
  };

  const exitMinigame = () => {
    if (!session || !selected) return;
    const mats = craftMaterialCost(selected, session.settings);
    logistics.gold += Math.round(craftGoldCost(selected, discount));
    onCraftChange({ ...craft, materials: addMaterials(craft.materials, mats) });
    triggerUpdate();
    setSession(null);
    onLogMessage('熄火收工，材料已退回。');
  };

  const handleReforge = (hero: Hero, item: Equipment) => {
    const res = reforgeEquipment(item, logistics, discount);
    if (!res.success || !res.item) {
      onLogMessage(res.message);
      return;
    }
    const nextRoster = roster.map((h) =>
      h.id === hero.id ? { ...h, equipment: { ...h.equipment, [item.slot]: res.item } } : h,
    );
    onRosterChange(nextRoster);
    onLogMessage(res.message);
    triggerUpdate();
  };

  const handleReroll = (hero: Hero, item: Equipment, lockIndex: number | null) => {
    const cost = rerollCost(item, discount);
    const lockSand = lockIndex !== null ? 1 : 0;
    if (logistics.gold < cost.gold || logistics.forgeStones < cost.stones) {
      onLogMessage('金币或锻造晶石不足，无法洗练。');
      return;
    }
    if (lockSand > 0 && (craft.materials.sand ?? 0) < lockSand) {
      onLogMessage('星陨砂不足，锁定词条需要 1 份。');
      return;
    }
    logistics.gold -= cost.gold;
    logistics.forgeStones -= cost.stones;
    logistics.ironOre -= cost.ore;

    const next = rerollAffixes(item, lockIndex);
    if (lockSand > 0) {
      onCraftChange({ ...craft, materials: addMaterials(craft.materials, { sand: -lockSand }) });
    }
    const nextRoster = roster.map((h) =>
      h.id === hero.id ? { ...h, equipment: { ...h.equipment, [item.slot]: next } } : h,
    );
    onRosterChange(nextRoster);
    onLogMessage(
      lockIndex !== null
        ? `洗练 ${item.name}：锁定 1 条词条，其余重掷（星陨砂 -1）。`
        : `洗练 ${item.name}：词条已重掷。`,
    );
    setLockPick(prev => ({ ...prev, [item.id]: null }));
    triggerUpdate();
  };

  const handleSalvage = (item: Equipment) => {
    const yieldGold = salvageYield(item);
    const mats = salvageMaterials(item);
    logistics.gold += yieldGold.gold;
    logistics.forgeStones += yieldGold.stones;
    logistics.ironOre += yieldGold.ore;
    onInventoryChange(inventory.filter((i) => i.id !== item.id));
    onCraftChange({ ...craft, materials: addMaterials(craft.materials, mats) });
    triggerUpdate();
    onLogMessage(`分解 ${item.name}：${costText(mats)}，金币 +${yieldGold.gold}`);
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'book', label: '图纸册', icon: <BookOpen size={12} /> },
    { key: 'craft', label: '打造台', icon: <Hammer size={12} /> },
    { key: 'reforge', label: '重铸', icon: <RefreshCw size={12} /> },
    { key: 'reroll', label: '洗练', icon: <Sparkles size={12} /> },
    { key: 'salvage', label: '分解', icon: <Recycle size={12} /> },
  ];

  return (
    <div className="pz-page" style={{ gap: 10 }}>
      <div className="pz-card pz-col" style={{ padding: '10px 12px', gap: 4, flex: '0 0 auto' }}>
        <div className="pz-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--pz-serif)', fontSize: 16, fontWeight: 700 }}>军械工坊</span>
          <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
            图纸 {book.owned}/{book.total}
          </span>
        </div>
        <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
          图纸定底子，材料定上限，手上的功夫定发挥。
        </div>
      </div>

      <div className="pz-row" style={{ gap: 4, flex: '0 0 auto' }}>
        {tabs.map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={on ? 'pz-btn pz-btn--main' : 'pz-btn pz-btn--ghost'}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                fontSize: 11,
                padding: '6px 2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                whiteSpace: 'nowrap',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <MaterialBar craft={craft} />

      <div className="pz-page-scroll pz-col" style={{ gap: 10 }}>
        {tab === 'book' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {BLUEPRINTS.map((bp) => {
              const owned = craft.unlocked.includes(bp.id);
              return (
                <button
                  key={bp.id}
                  onClick={() => openBlueprint(bp)}
                  className="pz-card pz-col"
                  style={{
                    padding: '8px 9px',
                    gap: 5,
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderTop: `3px solid ${owned ? TIER_COLOR[bp.tier] : 'var(--pz-line)'}`,
                    opacity: owned ? 1 : 0.72,
                  }}
                >
                  <div className="pz-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <BlueprintArt bp={bp} size={48} muted={!owned} />
                    <span className="pz-tag" style={{ fontSize: 9, padding: '1px 5px', color: TIER_COLOR[bp.tier] }}>
                      T{bp.tier}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--pz-serif)', fontSize: 13, fontWeight: 700, color: owned ? 'var(--pz-ink)' : 'var(--pz-ink-3)' }}>{bp.name}</span>
                  <span className="pz-micro" style={{ color: 'var(--pz-ink-3)', lineHeight: 1.4 }}>
                    {owned ? costText(bp.cost) : `${TIER_LABEL[bp.tier]} · ${bp.hint}`}
                  </span>
                  {!owned && (
                    <span className="pz-row" style={{ gap: 3, color: 'var(--pz-ink-3)', fontSize: 10 }}>
                      <Lock size={10} /> 未解锁
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'craft' &&
          (selected ? (
            <CraftBench
              bp={selected}
              craft={craft}
              gold={logistics.gold}
              discount={discount}
              notice={notice}
              onBack={() => {
                setSelectedId(null);
                setTab('book');
              }}
              onSelf={(settings) => handleSelf(selected, settings)}
              onBoss={(settings, goldCost) => handleBoss(selected, settings, goldCost)}
            />
          ) : (
            <div className="pz-card pz-col" style={{ padding: 14, gap: 6, alignItems: 'center' }}>
              <Pickaxe size={20} style={{ color: 'var(--pz-ink-3)' }} />
              <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                先去图纸册挑一张图纸。
              </span>
              <Btn variant="ghost" size="sm" onClick={() => setTab('book')}>
                打开图纸册
              </Btn>
            </div>
          ))}

        {tab === 'reforge' && (
          <div className="pz-col" style={{ gap: 8 }}>
            {equipped.length === 0 && <EmptyLine text="名册里还没有穿戴中的装备。" />}
            {equipped.map(({ hero, item }) => {
              const cost = reforgeCost(item, discount);
              const done = item.reforged;
              return (
                <div key={`${hero.id}-${item.id}`} className="pz-card pz-col" style={{ padding: '8px 10px', gap: 4 }}>
                  <div className="pz-row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                    <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                      {hero.name} · {SLOT_LABEL[item.slot]}
                    </span>
                  </div>
                  <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                    {RARITY_LABEL[item.rarity]} · 品质 {cents(item.quality)} · {done ? '已重铸' : `重铸 +18% · ${cost} 金`}
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => handleReforge(hero, item)} disabled={done || logistics.gold < cost}>
                    {done ? '每件仅一次' : '重铸'}
                  </Btn>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'reroll' && (
          <div className="pz-col" style={{ gap: 8 }}>
            {equipped.length === 0 && <EmptyLine text="没有可洗练的装备。" />}
            {equipped.map(({ hero, item }) => {
              const cost = rerollCost(item, discount);
              const locked = lockPick[item.id] ?? null;
              const sand = craft.materials.sand ?? 0;
              const short = logistics.gold < cost.gold
                || logistics.forgeStones < cost.stones
                || (locked !== null && sand < 1);
              return (
                <div key={`${hero.id}-${item.id}`} className="pz-card pz-col" style={{ padding: '8px 10px', gap: 4 }}>
                  <div className="pz-row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                    <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                      {hero.name} · {SLOT_LABEL[item.slot]}
                    </span>
                  </div>
                  {item.affixes.length > 0 ? (
                    <div className="pz-row" style={{ flexWrap: 'wrap', gap: 4 }}>
                      {item.affixes.map((affix, idx) => {
                        const active = locked === idx;
                        return (
                          <button
                            key={`${affix.stat}-${idx}`}
                            onClick={() => setLockPick(prev => ({ ...prev, [item.id]: active ? null : idx }))}
                            style={{
                              fontSize: 11,
                              padding: '3px 7px',
                              borderRadius: 999,
                              border: `1px solid ${active ? 'var(--pz-brass-deep)' : 'var(--pz-line)'}`,
                              background: active ? 'var(--pz-brass)' : 'var(--pz-raised)',
                              color: active ? '#2A2115' : 'var(--pz-ink-2)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            {active && <Lock size={10} />}
                            {affix.name ? `${affix.name}·${affix.label}` : affix.label} {formatAffixValue(affix)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>无词条可洗。</span>
                  )}
                  <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                    {cost.gold} 金 · {cost.stones} 锻石 · {locked !== null ? '锁 1 条：星陨砂 1' : `点词条可锁定（现有星陨砂 ${sand}）`}
                  </div>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReroll(hero, item, locked)}
                    disabled={short || item.affixes.length === 0}
                  >
                    {locked !== null ? '洗练（锁定 1 条）' : '洗练词条'}
                  </Btn>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'salvage' && (
          <div className="pz-col" style={{ gap: 8 }}>
            {inventory.length === 0 && <EmptyLine text="背包里没有待分解的军械。" />}
            {inventory.map((item) => {
              const gain = salvageMaterials(item);
              const gold = salvageYield(item);
              return (
                <div key={item.id} className="pz-card pz-col" style={{ padding: '8px 10px', gap: 4 }}>
                  <div className="pz-row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                    <span className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                      T{item.tier} · {RARITY_LABEL[item.rarity]}
                    </span>
                  </div>
                  <div className="pz-micro" style={{ color: 'var(--pz-ink-3)' }}>
                    回收 {costText(gain)} · {gold.gold} 金
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => handleSalvage(item)}>
                    分解
                  </Btn>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {session && selected && (
        <CraftMinigame
          session={session}
          bp={selected}
          mods={professionMods(xpOf(craft, selected.tier))}
          onBeat={handleBeat}
          onExit={exitMinigame}
        />
      )}

      {result && (
        <ResultSheet
          key={result.item.id}
          item={result.item}
          bp={result.bp}
          current={equipped.find((row) => row.item.slot === result.item.slot)?.item}
          source={result.source}
          xpGain={result.xpGain}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
};

const EmptyLine: React.FC<{ text: string }> = ({ text }) => (
  <div
    className="pz-micro"
    style={{ padding: '18px 12px', textAlign: 'center', color: 'var(--pz-ink-3)', border: '1px dashed var(--pz-line)', borderRadius: 8 }}
  >
    {text}
  </div>
);

function negate(cost: Partial<Record<MaterialId, number>>): Partial<Record<MaterialId, number>> {
  const out: Partial<Record<MaterialId, number>> = {};
  (Object.keys(cost) as MaterialId[]).forEach((id) => {
    out[id] = -(cost[id] ?? 0);
  });
  return out;
}

export default BlacksmithView;
