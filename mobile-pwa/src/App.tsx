import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { BookOpen, Castle, Map, Swords, Users } from 'lucide-react';
import { generateHero, heroRoleLabel } from './engine/heroFactory';
import { CombatEngine, type CombatUnit } from './engine/combatEngine';
import { TownEngine } from './engine/townEngine';
import { CrisisEngine } from './engine/crisisEngine';
import { generateDungeonFromContract } from './engine/dungeonEngine';
import { createEnemyParty } from './engine/enemyFactory';
import { resolveStats } from './engine/statResolver';
import { TownView } from './components/TownView';
import { RosterView } from './components/RosterView';
import { DungeonView } from './components/DungeonView';
import { CrisisAlert } from './components/CrisisAlert';
import type { Hero, Equipment } from './types/hero';
import type { GuildContract } from './types/world';
import type { DungeonInstance, DungeonRoom } from './types/dungeon';
import type { DungeonEvent, ChoiceConsequence } from './types/narrative';
const InkStoryRunner = lazy(() =>
  import('./components/InkStoryRunner').then(m => ({ default: m.InkStoryRunner }))
);
import { DungeonEventModal } from './components/DungeonEventModal';
import { CampBarkBubble } from './components/CampBarkBubble';
import { FormationModal } from './components/FormationModal';
import { Btn, Card } from './components/ui';
import { CombatStage } from './components/CombatStage';
import { BattleStatsModal } from './components/BattleStatsModal';
import { LootDropModal } from './components/LootDropModal';
import type { BattleSettlementSummary } from './types/combatSettlement';
import { generateRandomLoot } from './engine/dungeonEngine';
import { applyBattleExperience, applyDelveProgression } from './engine/progressionEngine';
import type { HeroProgressionResult } from './types/progression';
import type { Projectile } from './components/CombatProjectiles';
import type { FloatingTextItem, UnitVisualState, UltCinematicEvent } from './types/combatVisual';
import { GOLD_STANDARD_DUNGEON_EVENTS, getCampDialogueForHero } from './data/mockNarratives';
import { ENABLE_WORLD_CRISIS } from './config/features';
import type { FormationPresetId, FormationSlotAssignment, GridSlotId } from './types/formation';
import { FORMATION_PRESETS, applyPresetToParty } from './engine/formationEngine';
import { applyTownSave, loadSave, writeSave } from './engine/saveEngine';
import type { SavePayload } from './engine/saveEngine';
import { BLUEPRINTS, BLUEPRINT_MAP, initialBlueprints, starterMaterials } from './engine/blueprintData';
import { addMaterials, rollCraftDrop, unlockByProgress } from './engine/craftEngine';
import type { CraftProgress } from './engine/craftEngine';

export function App() {
  // 启动时只读一次存档：把「读档 + 名册/首发/阵型兜底」在一个惰性 state 里一次算完。
  // 好处：render 期间不再读 ref.current，也省掉挂载后再补一次初始化的 effect。
  const [boot] = useState(() => {
    const save = loadSave();
    const starterRoster: Hero[] = [
      generateHero('blademaster', true, 'female'), // 主角团长
      generateHero('guardian', false, 'male'),     // 重装前锋
      generateHero('cleric', false, 'female'),     // 战地医官
      generateHero('ranger', false, 'male')        // 远程猎手
    ];
    const roster = save && save.roster.length > 0 ? save.roster : starterRoster;
    const deployedHeroIds =
      save?.deployedHeroIds?.length ? save.deployedHeroIds : roster.slice(0, 4).map(h => h.id);
    const formationAssignments = save?.formationAssignments?.length
      ? save.formationAssignments
      : applyPresetToParty('shield_wall', roster.filter(h => deployedHeroIds.includes(h.id)));
    return {
      save,
      roster,
      deployedHeroIds,
      formationAssignments,
      formationPreset: (save?.formationPreset ?? 'shield_wall') as FormationPresetId
    };
  });

  const [activeTab, setActiveTab] = useState<'roster' | 'dungeon' | 'combat' | 'town' | 'story'>(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'roster' || t === 'dungeon' || t === 'combat' || t === 'story') return t;
    // 有未完成的地牢就回到探险沙盘，否则回城
    return boot.save?.dungeon ? 'dungeon' : 'town';
  });
  const [storySubTab, setStorySubTab] = useState<'ink' | 'event' | 'bark'>('ink');
  const [interactiveEvent, setInteractiveEvent] = useState<DungeonEvent | null>(null);
  const [, setTickCounter] = useState(0);
  const triggerUpdate = () => setTickCounter(c => c + 1);

  // 初始化城镇、后勤与天灾引擎
  const [townEngine] = useState<TownEngine>(() => {
    const engine = new TownEngine();
    if (boot.save) applyTownSave(engine, boot.save.town);
    return engine;
  });
  const [crisisEngine] = useState<CrisisEngine>(() => new CrisisEngine());

  // 佣兵团名册 (主角 + 3名初始战友) — 男女比例 2:2，全员实力均衡
  const [roster, setRoster] = useState<Hero[]>(boot.roster);

  // 出战先遣队（4 人名单 ID）
  const [deployedHeroIds, setDeployedHeroIds] = useState<string[]>(boot.deployedHeroIds);

  // 阵型系统状态：当前预设 + 4 人槽位分配 + 阵型弹窗
  const [currentFormationPreset, setCurrentFormationPreset] =
    useState<FormationPresetId>(boot.formationPreset);
  const [formationAssignments, setFormationAssignments] =
    useState<FormationSlotAssignment[]>(boot.formationAssignments);
  const [showFormationModal, setShowFormationModal] = useState<boolean>(false);

  // 获取当前首发出战的 4 位英雄对象列表
  const deployedSquad = useMemo(() => {
    const list = roster.filter(h => deployedHeroIds.includes(h.id));
    if (list.length === 0) return roster.slice(0, 4);
    return list;
  }, [roster, deployedHeroIds]);

  const handleApplyFormationPreset = (presetId: FormationPresetId) => {
    setCurrentFormationPreset(presetId);
    setFormationAssignments(applyPresetToParty(presetId, deployedSquad));
  };

  // 替补与首发队员一对一轮换
  const handleSwapHeroDeploy = (outgoingHeroId: string, incomingHeroId: string) => {
    const outgoing = roster.find(h => h.id === outgoingHeroId);
    const incoming = roster.find(h => h.id === incomingHeroId);
    if (!incoming) return;

    setDeployedHeroIds(prev => {
      const next = prev.filter(id => id !== outgoingHeroId);
      if (!next.includes(incomingHeroId)) {
        next.push(incomingHeroId);
      }
      return next.slice(0, 4);
    });

    // 继承或更新阵型槽位
    setFormationAssignments(prev => {
      const outgoingSlot = prev.find(a => a.heroId === outgoingHeroId)?.slotId;
      const filtered = prev.filter(a => a.heroId !== outgoingHeroId && a.heroId !== incomingHeroId);
      if (outgoingSlot) {
        filtered.push({ heroId: incomingHeroId, slotId: outgoingSlot });
      }
      return filtered;
    });

    setSystemNotice(`🔄 轮换调整：【${incoming.name}】上阵出战，【${outgoing?.name || '队员'}】转入待命席！`);
  };

  // 当前进行中的任务契约与地牢探索实例
  const [currentContract, setCurrentContract] = useState<GuildContract | null>(
    boot.save?.dungeon?.contract ?? null
  );
  const [currentDungeon, setCurrentDungeon] = useState<DungeonInstance | null>(
    boot.save?.dungeon?.dungeon ?? null
  );
  const [activeDungeonRoom, setActiveDungeonRoom] = useState<DungeonRoom | null>(null);
  // 队伍公共背包（未装备的战利品）
  const [inventory, setInventory] = useState<Equipment[]>(boot.save?.inventory ?? []);
  const [inventoryTarget, setInventoryTarget] = useState<string>('');
  // 打造进度：材料 / 已解锁图纸 / 熟练度
  const [craft, setCraft] = useState<CraftProgress>(
    () =>
      boot.save?.craft ?? {
        materials: starterMaterials(),
        unlocked: initialBlueprints(),
        xp: {},
        counts: {},
      },
  );

  // 战斗结算时读取最新打造进度（避免把 craft 塞进战斗 effect 依赖导致计时器重置）
  const craftRef = useRef(craft);
  useEffect(() => {
    craftRef.current = craft;
  }, [craft]);

  // 声望 / 五星首通解锁图纸（非战斗掉落），返回本次新解锁的图纸名
  const unlockBlueprintsByProgress = (announce = true): string => {
    const reputation = townEngine.towns[townEngine.logistics.currentTownId]?.reputation ?? 0;
    const clearedStars = Object.values(townEngine.contracts)
      .flat()
      .reduce((max, c) => (c.status === 'completed' ? Math.max(max, c.stars) : max), 0);
    const gained = unlockByProgress(BLUEPRINTS, craftRef.current.unlocked, { reputation, clearedStars });
    if (gained.length === 0) return '';
    setCraft(prev => ({
      ...prev,
      unlocked: [...prev.unlocked, ...gained.filter(id => !prev.unlocked.includes(id))],
    }));
    const names = gained.map(id => BLUEPRINT_MAP[id]?.name).filter(Boolean).join('、');
    if (announce) setSystemNotice(`声望与战绩已解锁新图纸：「${names}」，去军械工坊看看。`);
    return names;
  };

  // 老档补算一次（声望早已达标但当时还没有图纸系统）
  useEffect(() => {
    unlockBlueprintsByProgress(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 自动保存 ────────────────────────────────────────────────
  // 每次渲染后刷新一份快照引用（只引用现成对象，不做深拷贝），再由 800ms 防抖写入。
  // 战斗中每 200ms 都会重渲染，定时器被不断重置，等价于只在操作间歇落盘。
  // 快照在 effect 内赋值而不是 render 期间赋值：render 阶段不碰 ref。
  const saveSnapshotRef = useRef<SavePayload | null>(null);

  useEffect(() => {
    saveSnapshotRef.current = {
      town: {
        towns: townEngine.towns,
        logistics: townEngine.logistics,
        contracts: townEngine.contracts,
        tavernRecruits: townEngine.tavernRecruits,
        fallenSouls: townEngine.fallenSouls,
      },
      roster,
      deployedHeroIds,
      formationPreset: currentFormationPreset,
      formationAssignments,
      inventory,
      craft,
      dungeon: currentContract && currentDungeon
        ? { contract: currentContract, dungeon: currentDungeon, roomIndex: currentDungeon.currentRoomIndex }
        : null,
    };

    const timer = window.setTimeout(() => {
      if (saveSnapshotRef.current) writeSave(saveSnapshotRef.current);
    }, 800);
    return () => window.clearTimeout(timer);
  });

  // 关页/切后台时立即落盘，避免防抖窗口内丢最后一步操作
  useEffect(() => {
    const flush = () => {
      if (saveSnapshotRef.current) writeSave(saveSnapshotRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // 战斗状态机
  const [engine, setEngine] = useState<CombatEngine | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [combatSpeed, setCombatSpeed] = useState<1 | 2>(1); // 1x / 2x 倍速
  const [combatUnits, setCombatUnits] = useState<CombatUnit[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  /** 已同步的日志条数，用于避免每 tick 全量拷贝 */
  const logCountRef = useRef(0);
  const [isAutoUlt, setIsAutoUlt] = useState<boolean>(true);
  const [battleRewardClaimed, setBattleRewardClaimed] = useState<boolean>(false);
  const [focusedTargetId, setFocusedTargetId] = useState<string | null>(null);
  const [systemNotice, setSystemNotice] = useState<string>('欢迎来到《星原战纪》！请在城镇接取委托、整备队伍，踏上原野与迷宫探险旅程。');

  // 战斗视觉动效状态
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [visualStates, setVisualStates] = useState<Record<string, UnitVisualState>>({});
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [ultEvent, setUltEvent] = useState<UltCinematicEvent | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [showCombatLogs, setShowCombatLogs] = useState<boolean>(false); // 战况日志折叠状态（默认收起以省屏幕空间）

  // 战斗结算两步走与掉落弹窗状态
  const [settlementStep, setSettlementStep] = useState<'idle' | 'stats' | 'loot'>('idle');
  const [settlementSummary, setSettlementSummary] = useState<BattleSettlementSummary | null>(null);
  const [battleProgression, setBattleProgression] = useState<HeroProgressionResult[] | null>(null);
  const [activeLootDrop, setActiveLootDrop] = useState<Equipment | null>(null);
  const [lootModalTitle, setLootModalTitle] = useState<string>('🎁 战利品掉落 · 装备查验');

  // 结算叙事分支/事件后果对游戏数值的影响
  const handleApplyNarrativeConsequence = (consequence: ChoiceConsequence) => {
    let msg = consequence.resultNarrative;
    if (consequence.goldChange) {
      townEngine.logistics.gold = Math.max(0, townEngine.logistics.gold + consequence.goldChange);
      msg += ` [金币 ${consequence.goldChange > 0 ? '+' : ''}${consequence.goldChange}]`;
    }
    if (consequence.rationChange) {
      townEngine.logistics.rations = Math.max(0, townEngine.logistics.rations + consequence.rationChange);
      msg += ` [口粮 ${consequence.rationChange > 0 ? '+' : ''}${consequence.rationChange}]`;
    }
    if (consequence.stressChange) {
      roster.forEach(h => {
        h.stress = Math.min(100, Math.max(0, h.stress + consequence.stressChange!));
      });
      msg += ` [全队压力 ${consequence.stressChange > 0 ? '+' : ''}${consequence.stressChange}]`;
    }
    if (consequence.moraleChange) {
      roster.forEach(h => {
        h.morale = Math.max(0, h.morale + consequence.moraleChange!);
      });
      msg += ` [全队士气 ${consequence.moraleChange > 0 ? '+' : ''}${consequence.moraleChange}]`;
    }
    if (consequence.hpPercentChange) {
      const vanguard = roster.find(h => h.currentHp > 0);
      if (vanguard) {
        const delta = Math.round(vanguard.maxHp * (consequence.hpPercentChange / 100));
        vanguard.currentHp = Math.min(vanguard.maxHp, Math.max(1, vanguard.currentHp + delta));
        msg += ` [${vanguard.name} 生命 ${delta > 0 ? '+' : ''}${delta}]`;
      }
    }
    setSystemNotice(msg);
    triggerUpdate();
  };

  // 接取契约并生成程序化地牢
  const handleSelectContract = (contract: GuildContract) => {
    setCurrentContract(contract);
    const dungeon = generateDungeonFromContract(contract);
    setCurrentDungeon(dungeon);
    setActiveTab('dungeon');
    setSystemNotice(`🗝️ 探险先锋已抵达【${contract.title}】探索区域！`);
  };

  // 接取天灾战役
  const handleAcceptCrisisBattle = () => {
    const crisisContract = crisisEngine.generateCrisisContract();
    handleSelectContract(crisisContract);
  };

  // 启动地牢房间战斗
  const startRoomBattle = (room: DungeonRoom) => {
    resetCombatSession({ keepRoom: true });
    setActiveDungeonRoom(room);
    setActiveTab('combat');

    // 挑选当前首发阵容中存活的佣兵出战 (若首发存活不足，自动从替补中补足存活成员)
    let activeDeploy = deployedSquad.filter(h => h.currentHp > 0);
    if (activeDeploy.length < 4) {
      const reservesAlive = roster.filter(h => !deployedHeroIds.includes(h.id) && h.currentHp > 0);
      const needed = 4 - activeDeploy.length;
      activeDeploy = [...activeDeploy, ...reservesAlive.slice(0, needed)];
    }

    if (activeDeploy.length === 0) {
      setSystemNotice('⚠️ 佣兵团全员重伤倒下！请先前往医馆治疗或圣所召魂。');
      return;
    }

    const enemyClasses = room.enemyClasses || ['guardian', 'blademaster'];
    const stars = room.enemyLevel || currentContract?.stars || 1;
    const contractType = currentContract?.type || 'goblin_mine';
    const enemies = createEnemyParty(enemyClasses, stars, Boolean(room.isBoss), contractType);

    const playerSlotMap: Record<string, GridSlotId> = {};
    for (const a of formationAssignments) {
      playerSlotMap[a.heroId] = a.slotId;
    }

    const eng = new CombatEngine(activeDeploy, enemies, playerSlotMap);
    eng.units.forEach(u => {
      if (u.side === 'player') u.autoUlt = isAutoUlt;
    });

    // 绑定实时动效管线
    eng.onCombatFx = (fx) => {
      // 1. 浮动跳字（同一目标连续出伤时向上错行，避免数字糊成一坨）
      if (fx.targetId && fx.label) {
        const targetId = fx.targetId;
        const isCritFx = fx.type === 'crit_shake' || fx.label.startsWith('暴击') || fx.label.startsWith('CRIT');
        const textType: FloatingTextItem['type'] =
          isCritFx ? 'crit'
          : fx.type === 'heal' ? 'heal'
          : fx.type === 'ult_burst' ? 'ult'
          : 'damage';

        setFloatingTexts(prev => {
          const now = Date.now();
          const alive = prev.filter(t => now - t.createdAt < 1000);
          const sameTarget = alive.filter(t => t.targetId === targetId).length;
          const stack = sameTarget % 4;
          const textItem: FloatingTextItem = {
            id: `${now}_${Math.random().toString(36).slice(2, 6)}`,
            targetId,
            text: fx.label ?? '',
            type: textType,
            xOffset: Math.round((Math.random() - 0.5) * 30) + (stack % 2 === 0 ? -8 : 8),
            stack,
            createdAt: now,
          };
          return [...alive.slice(-13), textItem];
        });
      }

      // 2. 角色打击与受击瞬态微动效 + 远程飞弹弹道
      if (fx.sourceId) {
        const sourceUnit = eng.units.find(u => u.hero.id === fx.sourceId);
        const targetUnit = fx.targetId ? eng.units.find(u => u.hero.id === fx.targetId) : null;
        const isRanged = sourceUnit?.hero.classId === 'ranger' || sourceUnit?.hero.classId === 'arcanist' || sourceUnit?.hero.classId === 'cleric';

        setVisualStates(prev => ({
          ...prev,
          [fx.sourceId!]: {
            ...prev[fx.sourceId!],
            isAttacking: true,
            attackMotion: isRanged ? 'cast' : 'lunge',
            isHit: false,
            isCritHit: false,
            isHealing: false,
            isDead: false,
          },
        }));
        setTimeout(() => {
          setVisualStates(prev => ({
            ...prev,
            [fx.sourceId!]: { ...prev[fx.sourceId!], isAttacking: false },
          }));
        }, 220);

        // 如果是远程或治疗，产生飞弹弹道动画
        if (isRanged && sourceUnit && targetUnit && sourceUnit.slotId && targetUnit.slotId) {
          const pId = `${Date.now()}_proj_${Math.random().toString(36).slice(2, 6)}`;
          const projType = fx.type === 'heal' ? 'holy' : sourceUnit.hero.classId === 'ranger' ? 'arrow' : 'magic';

          // 垂直纵向布局下的坐标计算 (上：敌方 3x3，中：交火线，下：我方 3x3)
          const isPlayerSource = sourceUnit.side === 'player';
          const sRowIdx = sourceUnit.slotId.endsWith('top') ? 0 : sourceUnit.slotId.endsWith('center') ? 1 : 2;
          const tRowIdx = targetUnit.slotId.endsWith('top') ? 0 : targetUnit.slotId.endsWith('center') ? 1 : 2;

          // X 坐标：3 列从左至右 (top: 80px, center: 160px, bottom: 240px 左右)
          const startX = 65 + sRowIdx * 80;
          const targetX = 65 + tRowIdx * 80;

          // Y 坐标：敌方 (上方后/中/前，约 50~180px)，玩家 (下方前/中/后，约 260~390px)
          const sColDist = sourceUnit.col === 'front' ? 0 : sourceUnit.col === 'mid' ? 1 : 2;
          const tColDist = targetUnit.col === 'front' ? 0 : targetUnit.col === 'mid' ? 1 : 2;

          const startY = isPlayerSource ? 260 + sColDist * 70 : 180 - sColDist * 70;
          const targetY = targetUnit.side === 'enemy' ? 180 - tColDist * 70 : 260 + tColDist * 70;

          const newProj: Projectile = {
            id: pId,
            sourceSlotId: sourceUnit.slotId,
            targetSlotId: targetUnit.slotId,
            type: projType,
            progress: 0,
            startX,
            startY,
            targetX,
            targetY,
          };

          setProjectiles(prev => [...prev, newProj]);

          // 飞行由 CSS 过渡完成，这里只在落地后移除，避免逐帧驱动 React 重渲染
          setTimeout(() => {
            setProjectiles(prev => prev.filter(p => p.id !== pId));
          }, 280);
        }
      }

      if (fx.targetId) {
        const isCrit = fx.label?.startsWith('暴击') || fx.label?.startsWith('CRIT');
        setVisualStates(prev => ({
          ...prev,
          [fx.targetId!]: {
            ...prev[fx.targetId!],
            isAttacking: false,
            isHit: !isCrit && fx.type !== 'heal',
            isCritHit: Boolean(isCrit),
            isHealing: fx.type === 'heal',
            isDead: false,
          },
        }));
        setTimeout(() => {
          setVisualStates(prev => ({
            ...prev,
            [fx.targetId!]: {
              ...prev[fx.targetId!],
              isHit: false,
              isCritHit: false,
              isHealing: false,
            },
          }));
        }, 200);
      }

      // 3. 暴击全屏微震
      if (fx.type === 'crit_shake') {
        setIsScreenShaking(true);
        setTimeout(() => setIsScreenShaking(false), 140);
      }

      // 4. 终极技能特写横幅
      if (fx.type === 'ult_burst' && fx.sourceId) {
        const caster = eng.units.find(u => u.hero.id === fx.sourceId);
        if (caster) {
          setUltEvent({
            id: `${Date.now()}`,
            casterId: caster.hero.id,
            casterName: caster.hero.name,
            casterClass: caster.hero.classId,
            ultName: fx.label || '必杀奥义',
            role: caster.hero.role,
            durationMs: 700,
          });
          setTimeout(() => setUltEvent(null), 700);
        }
      }
    };

    setFocusedTargetId(null);
    setFloatingTexts([]);
    setVisualStates({});
    setSettlementStep('idle');
    setSettlementSummary(null);
    setActiveLootDrop(null);
    setEngine(eng);
    setCombatUnits([...eng.units]);
    logCountRef.current = eng.logs.length;
    setLogs(eng.logs.slice(-60));
    setIsRunning(true);
    setActiveTab('combat');
    setSystemNotice(`⚔️ 突入【${room.title}】！`);
  };

  // 拆除陷阱
  const handleDisarmTrap = (room: DungeonRoom) => {
    // 根据先锋敏捷判定
    const vanguard = roster.find(h => h.currentHp > 0) || roster[0];
    const trapDmg = room.trapDamage || 20;
    const isSuccess = (vanguard?.attributes.agility || 10) >= 12;

    if (isSuccess) {
      setSystemNotice(`🛠️ ${vanguard.name} 身手矫健，成功解除暗器机关！`);
    } else {
      vanguard.currentHp = Math.max(1, vanguard.currentHp - trapDmg);
      vanguard.stress = Math.min(100, vanguard.stress + 15);
      setSystemNotice(`💥 拆除机关失败！机关触发造成 ${trapDmg} 点穿刺伤，队伍压力上升！`);
    }

    room.cleared = true;
    triggerUpdate();
  };

  // 启封宝箱（带品质光效与装备对比替换弹窗）
  const handleOpenChest = (room: DungeonRoom) => {
    if (room.chestGold) {
      townEngine.logistics.gold += room.chestGold;
    }
    room.cleared = true;

    // 如果宝箱包含装备，直接弹出战利品弹窗供穿戴替换
    if (room.chestItem) {
      setActiveLootDrop(room.chestItem);
      setLootModalTitle('📦 储物宝箱 · 军械启封');
      setSystemNotice(`✨ 宝箱启封！缴获金币 ${room.chestGold || 0} G，发现珍稀装备【${room.chestItem.name}】！`);
    } else {
      setSystemNotice(`✨ 储物箱启封！缴获金币 ${room.chestGold || 0} G！`);
    }
    triggerUpdate();
  };

  /**
   * 清空一场战斗的全部临时状态。
   * 战斗结束、撤退、开新战斗前都必须调用，否则「战役」页会残留上一场的战场与结算数据。
   */
  const resetCombatSession = (opts?: { keepRoom?: boolean }) => {
    setEngine(null);
    setCombatUnits([]);
    logCountRef.current = 0;
    setLogs([]);
    if (!opts?.keepRoom) setActiveDungeonRoom(null);
    setFloatingTexts([]);
    setVisualStates({});
    setProjectiles([]);
    setUltEvent(null);
    setIsScreenShaking(false);
    setFocusedTargetId(null);
    setSettlementStep('idle');
    setSettlementSummary(null);
    setBattleProgression(null);
    setActiveLootDrop(null);
    setBattleRewardClaimed(false);
    setIsRunning(true);
    setShowCombatLogs(false);
  };

  // 推进地牢房间（支持指定二选一分支房间）
  const advanceDungeonRoom = (targetRoom?: DungeonRoom) => {
    if (!currentDungeon) return;
    const nextIdx = currentDungeon.currentRoomIndex + 1;
    if (nextIdx < currentDungeon.totalRooms) {
      if (targetRoom) {
        // 如果玩家选择了特定分支房间，则替换并设为当前
        targetRoom.index = nextIdx;
        targetRoom.status = 'current';
        currentDungeon.rooms[nextIdx] = targetRoom;
      } else {
        currentDungeon.rooms[nextIdx].status = 'current';
      }
      currentDungeon.currentRoomIndex = nextIdx;
    } else {
      currentDungeon.isCompleted = true;
      handleFinishDungeon(true);
    }
  };

  // 战后回地牢继续探索
  const handleReturnToDungeonAfterBattle = () => {
    if (activeDungeonRoom) {
      activeDungeonRoom.cleared = true;
    }
    resetCombatSession();
    setActiveTab('dungeon');
    setTickCounter(c => c + 1);
  };

  // 结算完成地牢
  const handleFinishDungeon = (victory: boolean) => {
    if (victory && currentContract) {
      const res = townEngine.completeContract(currentContract, roster);
      // 声望 / 五星首通解锁的图纸随结算一起提示
      const unlockNames = unlockBlueprintsByProgress(false);
      const unlockSuffix = unlockNames ? ` | 声望达成，解锁图纸「${unlockNames}」` : '';
      if (ENABLE_WORLD_CRISIS) {
        // 推进天灾时间
        const crisisRes = crisisEngine.advanceDay();
        if (currentContract.id.startsWith('crisis_')) {
          const victoryMsg = crisisEngine.resolveCrisisVictory();
          setSystemNotice(`${res.message} | ${victoryMsg}${unlockSuffix}`);
        } else {
          setSystemNotice(res.message + (crisisRes.message ? ` | ${crisisRes.message}` : '') + unlockSuffix);
        }
      } else {
        setSystemNotice(res.message + unlockSuffix);
      }
    }
    // 未穿戴的战利品回收进背包
    if (currentDungeon && currentDungeon.lootItems.length > 0) {
      setInventory(prev => [...prev, ...currentDungeon.lootItems]);
    }
    resetCombatSession();
    setCurrentDungeon(null);
    setCurrentContract(null);
    setActiveTab('town');
    triggerUpdate();
  };

  // 装备变更后同步显示用的生命上限（真实战斗值由 resolveStats 推导）
  const syncHeroMaxHp = (hero: Hero) => {
    const stats = resolveStats(hero);
    const ratio = hero.maxHp > 0 ? hero.currentHp / hero.maxHp : 1;
    hero.maxHp = stats.maxHp;
    hero.currentHp = Math.max(1, Math.min(stats.maxHp, Math.round(stats.maxHp * ratio)));
  };

  // 装备穿戴（只替换引用，不写回基础属性）
  const handleEquipItem = (heroId: string, item: Equipment) => {
    const hero = roster.find(h => h.id === heroId);
    if (!hero) return;

    const previous =
      item.slot === 'weapon' ? hero.equipment.weapon
      : item.slot === 'armor' ? hero.equipment.armor
      : hero.equipment.trinket;

    if (item.slot === 'weapon') hero.equipment.weapon = item;
    else if (item.slot === 'armor') hero.equipment.armor = item;
    else hero.equipment.trinket = item;

    syncHeroMaxHp(hero);

    // 卸下的旧装备回到背包
    setInventory(prev => [...prev.filter(i => i.id !== item.id), ...(previous ? [previous] : [])]);
    if (currentDungeon) {
      currentDungeon.lootItems = currentDungeon.lootItems.filter(i => i.id !== item.id);
    }

    const stats = resolveStats(hero);
    setSystemNotice(`🛡️ ${hero.name} 穿戴【${item.name}】：物攻 ${stats.ad} / 物防 ${stats.armor} / 生命 ${stats.maxHp}`);
    triggerUpdate();
  };

  // 卸下装备到背包
  const handleUnequipItem = (heroId: string, slot: 'weapon' | 'armor' | 'trinket') => {
    const hero = roster.find(h => h.id === heroId);
    if (!hero || !hero.equipment[slot]) return;
    const item = hero.equipment[slot]!;
    hero.equipment[slot] = undefined;
    syncHeroMaxHp(hero);
    setInventory(prev => [...prev, item]);
    setSystemNotice(`📦 ${hero.name} 卸下了【${item.name}】`);
    triggerUpdate();
  };

  // 战斗心跳 Tick
  useEffect(() => {
    if (!isRunning || !engine || engine.isFinished) return;

    // 清理超过 1.2 秒的浮动跳字
    const cleanupTimer = setInterval(() => {
      const now = Date.now();
      setFloatingTexts(prev => prev.filter(t => now - t.createdAt < 1200));
    }, 400);

    const stepDt = 0.2 * combatSpeed;
    const intervalMs = Math.round(200 / combatSpeed);

    const timer = setInterval(() => {
      engine.tick(stepDt);
      setCombatUnits([...engine.units]);
      // 日志只在条目数变化时才同步，避免每 200ms 全量拷贝并重渲染
      if (engine.logs.length !== logCountRef.current) {
        logCountRef.current = engine.logs.length;
        setLogs(engine.logs.slice(-60));
      }

      // 战斗结束结算
      if (engine.isFinished && !battleRewardClaimed) {
        const stars = currentContract?.stars || 1;
        const isBossFight = Boolean(activeDungeonRoom?.isBoss);
        const preliminarySummary = engine.getSettlementSummary(null);
        const mvpId = preliminarySummary.mvpHeroId;

        const playerUnits = engine.units.filter(u => u.side === 'player');
        const clearedFights = currentDungeon
          ? currentDungeon.rooms.filter(r => r.type === 'battle' && (r.cleared || r.index === activeDungeonRoom?.index)).length
          : 1;
        const partyAbility = playerUnits.reduce((sum, u) => sum + u.hero.currentAbility, 0);

        // 同步存活/伤亡状态回名册，并结算经验与成长
        const updatedRoster = [...roster];
        const progressionResults: HeroProgressionResult[] = [];
        playerUnits.forEach(u => {
          const hero = updatedRoster.find(h => h.id === u.hero.id);
          if (!hero) return;

          if (engine.winner === 'player') {
            if (u.isDead) {
              // 胜利后倒地：保留残命，带回营地救治
              hero.currentHp = Math.max(1, Math.round(u.maxHp * 0.15));
              if (!hero.injuries.includes('重伤')) hero.injuries.push('重伤');
              hero.stress = Math.min(100, hero.stress + 20);
            } else {
              // 战后包扎：恢复 8% 生命上限
              const regen = Math.round(u.maxHp * 0.08);
              hero.currentHp = Math.min(u.maxHp, u.currentHp + regen);
            }
          } else {
            // 溃退：全员保留 20% 生命，代价是压力与士气
            hero.currentHp = Math.max(1, Math.round(u.maxHp * 0.2));
            hero.stress = Math.min(100, hero.stress + 30);
            hero.morale = Math.max(0, hero.morale - 15);
          }

          const isMvp = engine.winner === 'player' && u.hero.id === mvpId;
          if (engine.winner === 'player') {
            // 首领房视作本次契约收官：经验 + CA + 属性成长一并结算
            const prog = isBossFight
              ? applyDelveProgression(hero, {
                  stars,
                  isBoss: true,
                  isContractClear: true,
                  victory: true,
                  isMvp,
                  fights: Math.max(1, clearedFights),
                  partyAbility
                })
              : applyBattleExperience(hero, { stars, victory: true, isMvp });
            progressionResults.push(prog);
          } else {
            progressionResults.push(applyBattleExperience(hero, { stars, victory: false, isMvp: false }));
          }
        });
        setRoster(updatedRoster);

        const levelUps = progressionResults.filter(p => p.levelAfter > p.levelBefore);
        const levelUpSuffix = levelUps.length > 0
          ? ` | 🎉 ${levelUps.map(p => `${p.heroName} 升至 Lv.${p.levelAfter}`).join('、')}`
          : '';

        if (engine.winner === 'player') {
          if (activeDungeonRoom) {
            activeDungeonRoom.cleared = true;
          }

          // 打造资源：每场胜利掉基础料，首领房还有概率直接给一张没解锁的图纸
          const craftDrop = rollCraftDrop(stars, craftRef.current.unlocked, BLUEPRINTS, isBossFight);
          const dropBlueprint = craftDrop.blueprintId ? BLUEPRINT_MAP[craftDrop.blueprintId] : undefined;
          const matTotal = Object.values(craftDrop.materials).reduce<number>((sum, n) => sum + (n ?? 0), 0);
          const craftSuffix = ` | 材料 +${matTotal}${dropBlueprint ? ` · 新图纸「${dropBlueprint.name}」` : ''}`;
          setCraft(prev => ({
            ...prev,
            materials: addMaterials(prev.materials, craftDrop.materials),
            unlocked:
              dropBlueprint && !prev.unlocked.includes(dropBlueprint.id)
                ? [...prev.unlocked, dropBlueprint.id]
                : prev.unlocked,
          }));

          // 战利品掉落与结算面板触发逻辑：
          // 仅在最终首领房间 (isBoss) 胜利时触发战役总评 (MVP 榜) 与 极品装备翻牌结算
          // 普通小怪房间胜利后直接进入快捷返回沙盘模式，避免频繁弹窗与装备爆仓
          if (isBossFight) {
            // 最终首领房间必掉落 1 件高阶军械装备
            const dropLoot = generateRandomLoot(stars);
            const summary = engine.getSettlementSummary(dropLoot);
            setSettlementSummary(summary);
            setBattleProgression(progressionResults);
            setSettlementStep('stats'); // 仅 Boss 战进入结算面板与翻牌两步走
            setSystemNotice(`👑 最终首领已被斩杀！缴获极品军械！${levelUpSuffix}${craftSuffix}`);
          } else {
            // 普通战斗胜利：不弹大面板不塞背包，仅静默累积经验
            setSettlementSummary(null);
            setBattleProgression(null);
            setSettlementStep('idle');
            setSystemNotice(`🎉 房间守卫已被全歼，道路畅通！${levelUpSuffix}${craftSuffix}`);
          }
        } else if (engine.winner === 'enemy') {
          const summary = engine.getSettlementSummary(null);
          setSettlementSummary(summary);
          setBattleProgression(progressionResults);
          setSettlementStep('stats'); // 败北展示数据统计以便玩家分析原因
          setSystemNotice(`💀 战役失败，先遣队败退！队员重创，请回圣所与医馆救治！${levelUpSuffix}`);
        }
        setBattleRewardClaimed(true);
        triggerUpdate();
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
      clearInterval(cleanupTimer);
    };
  }, [isRunning, engine, battleRewardClaimed, roster, townEngine, activeDungeonRoom, combatSpeed, currentDungeon, currentContract]);

  // 切换自动/手动大招
  const toggleAutoUlt = () => {
    const nextVal = !isAutoUlt;
    setIsAutoUlt(nextVal);
    if (engine) {
      engine.units.forEach(u => {
        if (u.side === 'player') u.autoUlt = nextVal;
      });
    }
  };

  // 玩家手动释放大招
  const handleManualUlt = (unit: CombatUnit) => {
    if (!engine || unit.side !== 'player' || unit.resource < 100 || unit.isDead) return;
    engine.triggerUltimate(unit);
    setCombatUnits([...engine.units]);
    logCountRef.current = engine.logs.length;
    setLogs(engine.logs.slice(-60));
  };

  // 玩家手动点选集火目标
  const handleSelectFocusedTarget = (unit: CombatUnit) => {
    if (unit.side !== 'enemy' || unit.isDead) return;
    const newTargetId = focusedTargetId === unit.hero.id ? null : unit.hero.id;
    setFocusedTargetId(newTargetId);
    if (engine) engine.focusedTargetId = newTargetId;
    if (newTargetId) {
      setSystemNotice(`🎯 全队远程与先锋已锁定集火目标：【${unit.hero.name}】！`);
    }
  };

  const playerUnits = combatUnits.filter(u => u.side === 'player');
  const enemyUnits = combatUnits.filter(u => u.side === 'enemy');
  /** 战斗进行中 / 结算未确认时，底部导航被锁住，避免状态被中途切走 */
  const navLock: 'fighting' | 'settling' | null = engine
    ? (engine.isFinished ? 'settling' : 'fighting')
    : null;
  const currentTown = townEngine.towns[townEngine.logistics.currentTownId];

  /** 主内容区滚动容器：切 tab 时回到顶部，避免带着上一页的滚动位置 */
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  /** 软键盘弹出时用可视视口高度压缩壳，避免输入框被键盘遮住 */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const sync = () => {
      const shrunk = window.innerHeight - vv.height;
      if (shrunk > 80) {
        root.style.setProperty('--pz-vh', `${Math.round(vv.height)}px`);
      } else {
        root.style.removeProperty('--pz-vh');
      }
    };
    sync();
    vv.addEventListener('resize', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      root.style.removeProperty('--pz-vh');
    };
  }, []);

  return (
    <div className="pz pz-shell" style={{
      maxWidth: '480px',
      margin: '0 auto',
      width: '100%',
      background: 'var(--pz-page)',
      color: 'var(--pz-ink)'
    }}>

      {/* 顶部页眉：深木底 + 黄铜双线（壳内固定，不随内容滚动） */}
      <header className="pz-grain" style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
        paddingBottom: '9px',
        paddingLeft: '14px',
        paddingRight: '14px',
        background: 'linear-gradient(180deg, #3A2E1F 0%, #2A2115 100%)',
        color: '#F3E9D2',
        borderBottom: '3px double rgba(217,164,91,.55)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--pz-serif)', fontSize: '16px', fontWeight: 700, letterSpacing: '.06em', color: '#F0DFBC' }}>
              星原战纪
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(243,233,210,.58)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              第 {townEngine.logistics.day} 天 · {currentTown.name}
            </span>
          </div>
          <button
            onClick={toggleAutoUlt}
            style={{
              padding: '3px 9px',
              fontSize: '10px',
              borderRadius: '999px',
              cursor: 'pointer',
              background: isAutoUlt ? 'rgba(111,191,139,.22)' : 'transparent',
              border: `1px solid ${isAutoUlt ? 'var(--pz-success)' : 'rgba(243,233,210,.32)'}`,
              color: isAutoUlt ? '#9BD4B0' : 'rgba(243,233,210,.7)',
              fontWeight: 700,
              fontFamily: 'var(--pz-sans)',
              whiteSpace: 'nowrap'
            }}
          >
            {isAutoUlt ? '大招 · 自动' : '大招 · 手动'}
          </button>
        </div>

        {/* 后勤资源 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '7px',
          padding: '4px 9px',
          borderRadius: '6px',
          background: 'rgba(0,0,0,.22)',
          border: '1px solid rgba(217,164,91,.18)',
          fontSize: '11px',
          fontFamily: 'var(--pz-mono)'
        }}>
          <span style={{ color: '#E3BE72' }}>{townEngine.logistics.gold} G</span>
          <span style={{ color: '#8FC7C4' }}>{townEngine.logistics.rations} 口粮</span>
          <span style={{ color: '#B49BE0' }}>{townEngine.logistics.soulCrystals} 魂晶</span>
          <span style={{ color: '#86C69A' }}>{townEngine.logistics.medicines} 药剂</span>
        </div>
      </header>

      {/* 广播通知 */}
      {systemNotice && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '7px 13px',
          fontSize: '12px',
          color: 'var(--pz-ink)',
          background: 'var(--pz-raised)',
          borderBottom: '1px solid var(--pz-line)',
          animation: 'fadeIn .2s ease-out'
        }}>
          <span style={{ lineHeight: 1.45 }}>{systemNotice}</span>
          <span onClick={() => setSystemNotice('')} style={{ cursor: 'pointer', color: 'var(--pz-ink-3)', flexShrink: 0 }}>✕</span>
        </div>
      )}

      {/* 核心展示区 */}
      <main ref={mainRef} style={{
        flex: 1,
        minHeight: 0,
        padding: '12px',
        overflowY: 'auto'
      }}>

        {/* 天灾大事件告警栏 (Milestone 3) — 通过 ENABLE_WORLD_CRISIS 开关控制 */}
        {ENABLE_WORLD_CRISIS && (
          <CrisisAlert
            crisis={crisisEngine.crisis}
            onAcceptCrisisBattle={handleAcceptCrisisBattle}
          />
        )}

        {/* Tab 1: 城邦运营与公会据点 */}
        {activeTab === 'town' && (
          <TownView 
            townEngine={townEngine}
            roster={roster}
            deployedHeroIds={deployedHeroIds}
            inventory={inventory}
            craft={craft}
            onRosterChange={setRoster}
            onInventoryChange={setInventory}
            onCraftChange={setCraft}
            onSelectContract={handleSelectContract}
            onLogMessage={msg => setSystemNotice(msg)}
            triggerUpdate={triggerUpdate}
          />
        )}

        {/* Tab 2: 深度地牢探索系统 (Milestone 3 核心) */}
        {activeTab === 'dungeon' && (
          <div>
            {/* 宝箱房直接掉落装备弹窗展示与穿戴对比 */}
            {activeLootDrop && (
              <div style={{ marginBottom: '14px' }}>
                <LootDropModal
                  loot={activeLootDrop}
                  squad={deployedSquad}
                  title={lootModalTitle}
                  onEquipToHero={(heroId, item) => {
                    handleEquipItem(heroId, item);
                    setActiveLootDrop(null);
                  }}
                  onPutIntoInventory={(item) => {
                    if (currentDungeon) {
                      currentDungeon.lootItems.push(item);
                    } else {
                      setInventory(prev => [...prev, item]);
                    }
                    setSystemNotice(`🎒 【${item.name}】已放入探险战利品行囊！`);
                    setActiveLootDrop(null);
                  }}
                />
              </div>
            )}

            {currentDungeon ? (
              <DungeonView
                dungeon={currentDungeon}
                squad={deployedSquad.filter(h => h.currentHp > 0)}
                rations={townEngine.logistics.rations}
                onEnterBattle={startRoomBattle}
                onDisarmTrap={handleDisarmTrap}
                onOpenChest={handleOpenChest}
                onCampRest={(consumedRations, msg, buff) => {
                  townEngine.logistics.rations = Math.max(0, townEngine.logistics.rations - consumedRations);
                  if (buff && currentDungeon) {
                    currentDungeon.campBuff = buff;
                  }
                  setSystemNotice(msg);
                  triggerUpdate();
                }}
                onEquipItem={handleEquipItem}
                onExitDungeon={() => handleFinishDungeon(false)}
                onApplyNarrativeConsequence={handleApplyNarrativeConsequence}
                onSelectBranchRoom={(chosenRoom) => {
                  advanceDungeonRoom(chosenRoom);
                  setTickCounter(c => c + 1);
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗝️</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>当前未在任何地牢探险中</div>
                <div style={{ fontSize: '11px', marginTop: '6px' }}>
                  请前往【🏰据点】的【冒险者公会】接取契约任务，即可踏入程序化地牢序列！
                </div>
                <button
                  onClick={() => setActiveTab('town')}
                  style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    background: '#38bdf8',
                    color: '#0f172a',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  前往公会接取契约
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: 地牢交战 / 讨伐战场 — 无进行中战斗时的空态 */}
        {activeTab === 'combat' && !engine && (
          <div className="pz-card" style={{ textAlign: 'center', padding: '30px 18px' }}>
            <div className="pz-h3" style={{ marginBottom: '8px' }}>战场空着</div>
            <div className="pz-sub" style={{ lineHeight: 1.75, marginBottom: '16px' }}>
              眼下没有正在进行的遭遇战。
              <br />
              去公会挑一张悬赏，或者回到地牢继续往里走。
            </div>
            <div className="pz-col" style={{ gap: '8px' }}>
              <button
                className="pz-btn pz-btn--main pz-btn--block"
                onClick={() => setActiveTab('town')}
              >
                去公会看榜
              </button>
              {currentDungeon && (
                <button
                  className="pz-btn pz-btn--block"
                  onClick={() => setActiveTab('dungeon')}
                >
                  回到地牢 · 第 {(currentDungeon.currentRoomIndex ?? 0) + 1} 间
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: 地牢交战 / 讨伐战场 */}
        {activeTab === 'combat' && engine && (
          <div className="pz-combat-page" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
            {currentContract && (
              <div
                className="pz-between"
                style={{
                  background: 'var(--pz-raised)',
                  padding: '8px 10px',
                  borderRadius: 'var(--pz-r-btn)',
                  border: '1px solid var(--pz-line)',
                  marginBottom: '8px',
                  fontSize: '12px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{ color: 'var(--pz-ink-2)', fontSize: '11px' }}>战场 · </span>
                  <span style={{ color: 'var(--pz-ink)', fontWeight: 600 }}>
                    {activeDungeonRoom?.title || currentContract.title}
                  </span>
                  <span className="pz-mono" style={{ color: 'var(--pz-brass-deep)', marginLeft: '6px', fontSize: '11px' }}>
                    {currentContract.stars}★
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowFormationModal(true)}
                    disabled={navLock === 'fighting'}
                    title={navLock === 'fighting' ? '战斗中不能改动阵型' : '调整阵型'}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: 'transparent',
                      border: '1px solid var(--pz-line-2)',
                      borderRadius: 'var(--pz-r-seal)',
                      color: navLock === 'fighting' ? 'rgba(42,36,24,.30)' : 'var(--pz-ink-2)',
                      cursor: navLock === 'fighting' ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    阵型 · {FORMATION_PRESETS[currentFormationPreset]?.name}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('现在收兵撤退，本次探险到此结束（已入袋的战利品保留）。确定吗？')) {
                        handleFinishDungeon(false);
                      }
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: 'transparent',
                      border: '1px solid rgba(138,59,50,.45)',
                      borderRadius: 'var(--pz-r-seal)',
                      color: 'var(--pz-wine)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    撤退
                  </button>
                </div>
              </div>
            )}

            {/* Milestone 13: 沉浸式战术战斗舞台 (双向 3x3 自走棋微缩战场，含棋子对撞、弹道与浮动跳字) */}
            <CombatStage
              theme={currentDungeon?.theme || 'catacomb'}
              playerUnits={playerUnits}
              enemyUnits={enemyUnits}
              visualStates={visualStates}
              floatingTexts={floatingTexts}
              projectiles={projectiles}
              ultEvent={ultEvent}
              focusedTargetId={focusedTargetId}
              isAutoUlt={isAutoUlt}
              isScreenShaking={isScreenShaking}
              onSelectTarget={handleSelectFocusedTarget}
              onTriggerUlt={handleManualUlt}
              resultOverlay={engine?.isFinished ? (
                settlementStep === 'stats' && settlementSummary ? (
                  <BattleStatsModal
                    summary={settlementSummary}
                    progression={battleProgression ?? undefined}
                    onNext={() => {
                      if (engine.winner === 'player') {
                        if (settlementSummary.lootDrop) {
                          // 进入第二步：战利品翻牌与装备对比替换
                          setActiveLootDrop(settlementSummary.lootDrop);
                          setLootModalTitle('🎁 战役大捷 · 战利品查验');
                          setSettlementStep('loot');
                        } else {
                          // 没有掉落装备，直接返回沙盘
                          if (activeDungeonRoom?.isBoss) {
                            advanceDungeonRoom();
                          } else {
                            handleReturnToDungeonAfterBattle();
                          }
                          setSettlementStep('idle');
                        }
                      } else {
                        // 败北撤回医馆
                        handleFinishDungeon(false);
                        setSettlementStep('idle');
                      }
                    }}
                  />
                ) : settlementStep === 'loot' && activeLootDrop ? (
                  <LootDropModal
                    loot={activeLootDrop}
                    squad={deployedSquad}
                    title={lootModalTitle}
                    onEquipToHero={(heroId, item) => {
                      handleEquipItem(heroId, item);
                      setActiveLootDrop(null);
                      setSettlementStep('idle');
                      if (activeDungeonRoom?.isBoss) {
                        advanceDungeonRoom();
                      } else {
                        handleReturnToDungeonAfterBattle();
                      }
                    }}
                    onPutIntoInventory={(item) => {
                      if (currentDungeon) {
                        currentDungeon.lootItems.push(item);
                      } else {
                        setInventory(prev => [...prev, item]);
                      }
                      setSystemNotice(`🎒 【${item.name}】已放入探险战利品行囊！`);
                      setActiveLootDrop(null);
                      setSettlementStep('idle');
                      if (activeDungeonRoom?.isBoss) {
                        advanceDungeonRoom();
                      } else {
                        handleReturnToDungeonAfterBattle();
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    padding: '16px',
                    borderRadius: 'var(--pz-r-card)',
                    background: 'var(--pz-raised)',
                    border: `1px solid ${engine.winner === 'player' ? 'rgba(74,122,94,.5)' : 'rgba(138,59,50,.5)'}`,
                    boxShadow: '0 8px 24px rgba(42,36,24,.28)',
                    textAlign: 'center',
                    animation: 'popIn .22s ease-out'
                  }}>
                    <div style={{ fontFamily: 'var(--pz-serif)', fontSize: '16px', color: engine.winner === 'player' ? '#3F6E52' : 'var(--pz-wine)', marginBottom: '5px' }}>
                      {engine.winner === 'player' ? '房间肃清' : '先遣队溃退'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--pz-ink-2)', marginBottom: '12px', lineHeight: 1.6 }}>
                      {engine.winner === 'player' ? '阵地已清，可整队推进至下一节点。' : '全队士气动荡，需撤回城邦修整。'}
                    </div>
                    {engine.winner === 'player' ? (
                      <button
                        onClick={() => {
                          if (activeDungeonRoom?.isBoss) {
                            advanceDungeonRoom();
                          } else {
                            handleReturnToDungeonAfterBattle();
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '11px 16px',
                          background: 'var(--pz-wine)',
                          color: '#F6EFDF',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: 'var(--pz-r-btn)',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        {activeDungeonRoom?.isBoss ? '夺得最终胜利 · 离开地牢' : '返回路线图 · 继续推进'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleFinishDungeon(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '11px 16px',
                          background: 'var(--pz-wine)',
                          color: '#F6EFDF',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: 'var(--pz-r-btn)',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        撤回城邦医馆
                      </button>
                    )}
                  </div>
                )
              ) : null}
            />

            {/* 战斗快捷控制台：暂停/继续 + 1x/2x 倍速 + 自动/手动大招 */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexShrink: 0 }}>
              <button
                onClick={() => setIsRunning(!isRunning)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: 'transparent',
                  color: 'var(--pz-ink-2)',
                  border: '1px solid var(--pz-line-2)',
                  borderRadius: 'var(--pz-r-btn)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {isRunning ? '暂停' : '继续'}
              </button>
              <button
                onClick={() => setCombatSpeed(s => (s === 1 ? 2 : 1))}
                className="pz-mono"
                style={{
                  flex: 1,
                  padding: '8px',
                  background: combatSpeed === 2 ? 'rgba(169,121,58,.14)' : 'transparent',
                  color: combatSpeed === 2 ? 'var(--pz-brass-deep)' : 'var(--pz-ink-2)',
                  border: `1px solid ${combatSpeed === 2 ? 'var(--pz-brass-deep)' : 'var(--pz-line-2)'}`,
                  borderRadius: 'var(--pz-r-btn)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {combatSpeed}x 倍速
              </button>
              <button
                onClick={() => {
                  const next = !isAutoUlt;
                  setIsAutoUlt(next);
                  if (engine) {
                    engine.units.forEach(u => {
                      if (u.side === 'player') u.autoUlt = next;
                    });
                  }
                }}
                style={{
                  flex: 1.3,
                  padding: '8px',
                  background: isAutoUlt ? 'rgba(111,191,139,.14)' : 'transparent',
                  color: isAutoUlt ? '#3F6E52' : 'var(--pz-ink-2)',
                  border: `1px solid ${isAutoUlt ? 'rgba(74,122,94,.55)' : 'var(--pz-line-2)'}`,
                  borderRadius: 'var(--pz-r-btn)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {isAutoUlt ? '大招 · 自动' : '大招 · 手动'}
              </button>
            </div>

            {/* 战况日志：默认折叠以节约移动端屏幕高度，展开后占满战场之外的剩余空间 */}
            <div
              style={{
                background: 'var(--pz-sunken)',
                borderRadius: 'var(--pz-r-btn)',
                border: '1px solid var(--pz-line)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                flex: showCombatLogs ? '1 1 auto' : '0 0 auto',
                minHeight: 0,
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div
                onClick={() => setShowCombatLogs(!showCombatLogs)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 10px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '11px', color: 'var(--pz-ink-2)', fontWeight: 600 }}>
                    战况简报
                  </span>
                  {logs.length > 0 && (
                    <span
                      style={{ fontSize: '10px', color: 'var(--pz-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {logs.length} 条 · {logs[logs.length - 1]?.text?.slice(0, 16)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--pz-brass-deep)', whiteSpace: 'nowrap' }}>
                  {showCombatLogs ? '收起' : '展开'}
                </div>
              </div>

              {showCombatLogs && (
                <div style={{ padding: '6px 10px', flex: '1 1 auto', minHeight: 0, overflowY: 'auto', borderTop: '1px solid var(--pz-line)' }}>
                  {logs.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--pz-ink-3)', textAlign: 'center', padding: '6px 0' }}>暂无战况数据</div>
                  ) : (
                    logs.map(log => (
                      <div
                        key={log.id}
                        style={{
                          fontSize: '11px',
                          margin: '2px 0',
                          color:
                            log.type === 'ult'
                              ? 'var(--pz-brass-deep)'
                              : log.type === 'heal'
                                ? '#3F6E52'
                                : log.type === 'death'
                                  ? 'var(--pz-wine)'
                                  : 'var(--pz-ink-2)',
                        }}
                      >
                        {log.text}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: 佣兵名册 */}
        {activeTab === 'roster' && (
          <RosterView
            roster={roster}
            deployedHeroIds={deployedHeroIds}
            formationAssignments={formationAssignments}
            formationPresetName={FORMATION_PRESETS[currentFormationPreset]?.name || '自由'}
            inventory={inventory}
            inventoryTarget={inventoryTarget}
            onInventoryTargetChange={setInventoryTarget}
            onOpenFormation={() => setShowFormationModal(true)}
            onSwapHero={handleSwapHeroDeploy}
            onUnequip={handleUnequipItem}
            onEquip={handleEquipItem}
          />
        )}

        {/* Tab 5: 暗黑叙事与 DSL 剧本系统 */}
        {activeTab === 'story' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 子 Tab 切换 */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--pz-sunken)', padding: '4px', borderRadius: 'var(--pz-r-btn)', border: '1px solid var(--pz-line)' }}>
              {(
                [
                  { id: 'ink', label: '分支剧本' },
                  { id: 'event', label: '偶发事件' },
                  { id: 'bark', label: '营地碎念' },
                ] as const
              ).map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setStorySubTab(sub.id)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '11px',
                    borderRadius: 'var(--pz-r-seal)',
                    border: storySubTab === sub.id ? '1px solid var(--pz-wine)' : '1px solid transparent',
                    cursor: 'pointer',
                    background: storySubTab === sub.id ? 'rgba(138,59,50,.10)' : 'transparent',
                    color: storySubTab === sub.id ? 'var(--pz-wine)' : 'var(--pz-ink-3)',
                    fontWeight: storySubTab === sub.id ? 700 : 500,
                    fontFamily: 'var(--pz-sans)',
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* 子面板 1: Ink.js DSL 剧本运行器 */}
            {storySubTab === 'ink' && (
              <Suspense
                fallback={
                  <Card variant="sunken">
                    <div className="pz-sub">正在展开卷轴…</div>
                  </Card>
                }
              >
              <InkStoryRunner
                onApplyEffectsToGame={({ stressDelta, goldDelta, message }) => {
                  if (goldDelta) townEngine.logistics.gold += goldDelta;
                  if (stressDelta) {
                    roster.forEach(h => {
                      h.stress = Math.min(100, Math.max(0, h.stress + stressDelta));
                    });
                  }
                  setSystemNotice(message || '物语分支推进完成，影响已作用至佣兵团！');
                  triggerUpdate();
                }}
              />
              </Suspense>
            )}

            {/* 子面板 2: 偶发事件检定架 */}
            {storySubTab === 'event' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="pz-sub" style={{ padding: '0 2px' }}>
                  按队伍属性与职业做检定，成败都会留痕。
                </div>
                {GOLD_STANDARD_DUNGEON_EVENTS.map((ev: DungeonEvent) => (
                  <div
                    key={ev.id}
                    className="pz-card"
                    style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '7px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--pz-serif)', fontSize: '14px', color: 'var(--pz-ink)' }}>
                        {ev.title}
                      </span>
                      <span style={{ fontSize: '9px', background: 'rgba(42,36,24,.06)', color: 'var(--pz-ink-3)', padding: '1px 6px', borderRadius: 'var(--pz-r-seal)', whiteSpace: 'nowrap' }}>
                        {ev.category} · {ev.theme}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--pz-ink-2)', lineHeight: 1.6 }}>
                      {ev.hook}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--pz-ink-3)' }}>
                      分支：{ev.choices.map((c) => `[${c.label}]`).join(' ')}
                    </div>
                    <Btn variant="main" block onClick={() => setInteractiveEvent(ev)}>
                      带队上前做检定
                    </Btn>
                  </div>
                ))}
              </div>
            )}

            {/* 子面板 3: 佣兵营地碎念 (Bark) */}
            {storySubTab === 'bark' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="pz-sub" style={{ padding: '0 2px' }}>
                  按性格与压力现取的几句闲话。
                </div>
                {roster.map(hero => {
                  const bark = getCampDialogueForHero(hero);
                  return (
                    <div
                      key={hero.id}
                      className="pz-card"
                      style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--pz-serif)', fontSize: '13px', color: 'var(--pz-ink)' }}>
                          {hero.name}
                          <span style={{ fontSize: '10px', color: 'var(--pz-ink-3)', marginLeft: '5px', fontFamily: 'var(--pz-sans)' }}>
                            {heroRoleLabel(hero)}
                          </span>
                        </span>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--pz-mono)', color: hero.stress > 60 ? 'var(--pz-combat)' : 'var(--pz-ink-3)' }}>
                          压力 {hero.stress}/100
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {hero.traits.map(t => (
                          <span
                            key={t}
                            style={{
                              fontSize: '9px',
                              background: 'rgba(111,191,139,.14)',
                              padding: '1px 6px',
                              borderRadius: 'var(--pz-r-seal)',
                              color: '#3F6B4E',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <CampBarkBubble dialogue={bark} speaker={hero} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* 阵型调整弹窗 */}
      {showFormationModal && (
        <FormationModal
          party={deployedSquad}
          allHeroes={roster}
          assignments={formationAssignments}
          currentPreset={currentFormationPreset}
          onApplyPreset={handleApplyFormationPreset}
          onUpdateAssignments={(next) => {
            setFormationAssignments(next);
            setCurrentFormationPreset('custom');
          }}
          onSwapHeroDeploy={handleSwapHeroDeploy}
          onClose={() => setShowFormationModal(false)}
        />
      )}

      {/* 独立互动检定事件模态框 */}
      {interactiveEvent && (
        <DungeonEventModal
          event={interactiveEvent}
          squad={deployedSquad.filter(h => h.currentHp > 0)}
          onClose={() => setInteractiveEvent(null)}
          onResolve={(consequence) => {
            handleApplyNarrativeConsequence(consequence);
          }}
        />
      )}

      {/* 底部导航（壳内固定，不随内容滚动） */}
      <nav style={{
        flexShrink: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--pz-sunken)',
        borderTop: '1px solid var(--pz-line-2)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -6px 18px rgba(42,36,24,.10)'
      }}>
        {([
          ['town', '据点', Castle],
          ['dungeon', '地牢', Map],
          ['combat', '战役', Swords],
          ['roster', '名册', Users],
          ['story', '物语', BookOpen],
        ] as const).map(([key, label, Icon]) => {
          const on = activeTab === key;
          const locked = Boolean(navLock) && key !== 'combat';
          return (
            <button
              key={key}
              onClick={() => {
                if (locked) {
                  setSystemNotice(
                    navLock === 'fighting'
                      ? '战斗还在进行。先打完这一场，或者用战场上方的「撤退」收兵。'
                      : '这一场的结算还没确认，先结算完再离开。'
                  );
                  setActiveTab('combat');
                  return;
                }
                setActiveTab(key);
              }}
              style={{
                flex: 1,
                position: 'relative',
                padding: '7px 2px 8px',
                border: 'none',
                borderTop: `2px solid ${on ? 'var(--pz-wine)' : 'transparent'}`,
                background: 'transparent',
                color: locked ? 'rgba(42,36,24,.28)' : on ? 'var(--pz-wine)' : 'var(--pz-ink-3)',
                cursor: locked ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                fontFamily: 'var(--pz-sans)',
                fontSize: '10px',
                fontWeight: on ? 700 : 500
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
              {key === 'dungeon' && currentDungeon && (
                <span style={{
                  position: 'absolute',
                  top: '5px',
                  right: '50%',
                  marginRight: '-16px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--pz-combat)'
                }} />
              )}
            </button>
          );
        })}
      </nav>

    </div>
  );
}

export default App;
