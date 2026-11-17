import { useState, useEffect, useMemo } from 'react';
import { generateHero, heroRoleLabel } from './engine/heroFactory';
import { CombatEngine, type CombatUnit } from './engine/combatEngine';
import { TownEngine } from './engine/townEngine';
import { CrisisEngine } from './engine/crisisEngine';
import { generateDungeonFromContract } from './engine/dungeonEngine';
import { createEnemyParty } from './engine/enemyFactory';
import { resolveStats, STAT_LABEL, describeBase } from './engine/statResolver';
import { TownView } from './components/TownView';
import { DungeonView } from './components/DungeonView';
import { CrisisAlert } from './components/CrisisAlert';
import type { Hero, Equipment } from './types/hero';
import type { GuildContract } from './types/world';
import type { DungeonInstance, DungeonRoom } from './types/dungeon';
import type { DungeonEvent, ChoiceConsequence } from './types/narrative';
import { InkStoryRunner } from './components/InkStoryRunner';
import { DungeonEventModal } from './components/DungeonEventModal';
import { CampBarkBubble } from './components/CampBarkBubble';
import { FormationModal } from './components/FormationModal';
import { CombatStage } from './components/CombatStage';
import type { Projectile } from './components/CombatProjectiles';
import type { FloatingTextItem, UnitVisualState, UltCinematicEvent } from './types/combatVisual';
import { GOLD_STANDARD_DUNGEON_EVENTS, getCampDialogueForHero } from './data/mockNarratives';
import { ENABLE_WORLD_CRISIS } from './config/features';
import type { FormationPresetId, FormationSlotAssignment, GridSlotId } from './types/formation';
import { GRID_SLOTS } from './types/formation';
import { FORMATION_PRESETS, applyPresetToParty } from './engine/formationEngine';

export function App() {
  const [activeTab, setActiveTab] = useState<'roster' | 'dungeon' | 'combat' | 'town' | 'story'>('town');
  const [storySubTab, setStorySubTab] = useState<'ink' | 'event' | 'bark'>('ink');
  const [interactiveEvent, setInteractiveEvent] = useState<DungeonEvent | null>(null);
  const [, setTickCounter] = useState(0);
  const triggerUpdate = () => setTickCounter(c => c + 1);

  // 初始化城镇、后勤与天灾引擎
  const [townEngine] = useState<TownEngine>(() => new TownEngine());
  const [crisisEngine] = useState<CrisisEngine>(() => new CrisisEngine());

  // 佣兵团名册 (主角 + 3名初始战友) — 男女比例 2:2，全员实力均衡
  const [roster, setRoster] = useState<Hero[]>(() => [
    generateHero('blademaster', true, 'female'), // 主角团长
    generateHero('guardian', false, 'male'),     // 重装前锋
    generateHero('cleric', false, 'female'),     // 战地医官
    generateHero('ranger', false, 'male')        // 远程猎手
  ]);

  // 出战先遣队（4 人名单 ID）
  const [deployedHeroIds, setDeployedHeroIds] = useState<string[]>(() => []);

  // 阵型系统状态：当前预设 + 4 人槽位分配 + 阵型弹窗
  const [currentFormationPreset, setCurrentFormationPreset] = useState<FormationPresetId>('shield_wall');
  const [formationAssignments, setFormationAssignments] = useState<FormationSlotAssignment[]>(() => []);
  const [showFormationModal, setShowFormationModal] = useState<boolean>(false);

  // 初始化首发 4 人名单与阵型
  useEffect(() => {
    if (roster.length > 0 && deployedHeroIds.length === 0) {
      const initialDeployed = roster.slice(0, 4).map(h => h.id);
      setDeployedHeroIds(initialDeployed);
      const activeParty = roster.filter(h => initialDeployed.includes(h.id));
      setFormationAssignments(applyPresetToParty('shield_wall', activeParty));
    }
  }, [roster]);

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
  const [currentContract, setCurrentContract] = useState<GuildContract | null>(null);
  const [currentDungeon, setCurrentDungeon] = useState<DungeonInstance | null>(null);
  const [activeDungeonRoom, setActiveDungeonRoom] = useState<DungeonRoom | null>(null);
  // 队伍公共背包（未装备的战利品）
  const [inventory, setInventory] = useState<Equipment[]>([]);
  const [inventoryTarget, setInventoryTarget] = useState<string>('');

  // 战斗状态机
  const [engine, setEngine] = useState<CombatEngine | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [combatSpeed, setCombatSpeed] = useState<1 | 2>(1); // 1x / 2x 倍速
  const [combatUnits, setCombatUnits] = useState<CombatUnit[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isAutoUlt, setIsAutoUlt] = useState<boolean>(true);
  const [battleRewardClaimed, setBattleRewardClaimed] = useState<boolean>(false);
  const [focusedTargetId, setFocusedTargetId] = useState<string | null>(null);
  const [systemNotice, setSystemNotice] = useState<string>('欢迎来到《星原战纪》！请在城镇接取委托、整备队伍，踏上原野与迷宫探险旅程。');

  // Milestone 13 战斗视觉动效状态
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [visualStates, setVisualStates] = useState<Record<string, UnitVisualState>>({});
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [ultEvent, setUltEvent] = useState<UltCinematicEvent | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [showCombatLogs, setShowCombatLogs] = useState<boolean>(false); // 战况日志折叠状态（默认收起以省屏幕空间）

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
    setActiveDungeonRoom(room);
    setBattleRewardClaimed(false);
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
      // 1. 浮动跳字
      if (fx.targetId && fx.label) {
        const textItem: FloatingTextItem = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          targetId: fx.targetId,
          text: fx.label,
          type: fx.type === 'crit_shake' ? 'crit' : fx.type === 'heal' ? 'heal' : fx.type === 'ult_burst' ? 'ult' : fx.label.startsWith('CRIT') ? 'crit' : 'damage',
          xOffset: Math.round((Math.random() - 0.5) * 26),
          createdAt: Date.now(),
        };
        setFloatingTexts(prev => [...prev.slice(-12), textItem]);
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

          // 弹道动画步进 (250ms 完成飞行)
          const startTime = performance.now();
          const duration = 240;
          const animFrame = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            setProjectiles(prev =>
              prev.map(p => (p.id === pId ? { ...p, progress } : p))
            );
            if (progress < 1) {
              requestAnimationFrame(animFrame);
            } else {
              setProjectiles(prev => prev.filter(p => p.id !== pId));
            }
          };
          requestAnimationFrame(animFrame);
        }
      }

      if (fx.targetId) {
        const isCrit = fx.label?.startsWith('CRIT');
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
    setEngine(eng);
    setCombatUnits([...eng.units]);
    setLogs([...eng.logs]);
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

  // 启封宝箱
  const handleOpenChest = (room: DungeonRoom) => {
    if (room.chestGold) {
      townEngine.logistics.gold += room.chestGold;
    }
    if (room.chestItem && currentDungeon) {
      currentDungeon.lootItems.push(room.chestItem);
    }
    room.cleared = true;
    setSystemNotice(`✨ 储物箱启封！缴获金币 ${room.chestGold} G，获得战备物资！`);
    triggerUpdate();
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
    setActiveTab('dungeon');
    setTickCounter(c => c + 1);
  };

  // 结算完成地牢
  const handleFinishDungeon = (victory: boolean) => {
    if (victory && currentContract) {
      const res = townEngine.completeContract(currentContract, roster);
      if (ENABLE_WORLD_CRISIS) {
        // 推进天灾时间
        const crisisRes = crisisEngine.advanceDay();
        if (currentContract.id.startsWith('crisis_')) {
          const victoryMsg = crisisEngine.resolveCrisisVictory();
          setSystemNotice(`${res.message} | ${victoryMsg}`);
        } else {
          setSystemNotice(res.message + (crisisRes.message ? ` | ${crisisRes.message}` : ''));
        }
      } else {
        setSystemNotice(res.message);
      }
    }
    // 未穿戴的战利品回收进背包
    if (currentDungeon && currentDungeon.lootItems.length > 0) {
      setInventory(prev => [...prev, ...currentDungeon.lootItems]);
    }
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
      setLogs([...engine.logs]);

      // 战斗结束结算
      if (engine.isFinished && !battleRewardClaimed) {
        // 同步存活/伤亡状态回名册
        const updatedRoster = [...roster];
        engine.units.filter(u => u.side === 'player').forEach(u => {
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
        });
        setRoster(updatedRoster);

        if (engine.winner === 'player') {
          if (activeDungeonRoom) {
            activeDungeonRoom.cleared = true;
          }
          if (activeDungeonRoom?.isBoss) {
            setSystemNotice('👑 最终首领已被斩杀！地牢全线扫清！');
          } else {
            setSystemNotice('🎉 房间守卫已被全歼，道路畅通！');
          }
        } else if (engine.winner === 'enemy') {
          setSystemNotice('💀 战役失败，先遣队败退！队员重创，请回圣所与医馆救治！');
        }
        setBattleRewardClaimed(true);
        triggerUpdate();
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
      clearInterval(cleanupTimer);
    };
  }, [isRunning, engine, battleRewardClaimed, roster, townEngine, activeDungeonRoom, combatSpeed]);

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
    setLogs([...engine.logs]);
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
  const currentTown = townEngine.towns[townEngine.logistics.currentTownId];

  return (
    <div style={{ 
      maxWidth: '480px', 
      margin: '0 auto', 
      minHeight: '100vh', 
      width: '100%',
      background: '#0f172a', 
      color: '#f8fafc', 
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: 'sans-serif' 
    }}>
      
      {/* 顶部 iOS 状态栏（包含安全区域适配 Safe Area Inset Top） */}
      <header style={{ 
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: '10px',
        paddingLeft: '14px',
        paddingRight: '14px',
        background: '#1e293b', 
        borderBottom: '1px solid #334155',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8' }}>⚔️ 星原战纪</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
              第 {townEngine.logistics.day} 天 · {currentTown.name}
            </span>
          </div>
          <button 
            onClick={toggleAutoUlt}
            style={{ 
              padding: '3px 8px', 
              fontSize: '10px', 
              borderRadius: '12px', 
              border: 'none', 
              cursor: 'pointer',
              background: isAutoUlt ? '#10b981' : '#64748b', 
              color: '#fff', 
              fontWeight: 'bold' 
            }}
          >
            {isAutoUlt ? '⚡ 大招: 自动' : '✋ 大招: 手动'}
          </button>
        </div>

        {/* 后勤资源状态条 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', background: '#0b1329', padding: '4px 8px', borderRadius: '6px' }}>
          <span style={{ color: '#eab308' }}>💰 {townEngine.logistics.gold} G</span>
          <span style={{ color: '#38bdf8' }}>🍞 {townEngine.logistics.rations} 份口粮</span>
          <span style={{ color: '#a855f7' }}>✨ {townEngine.logistics.soulCrystals} 魂晶</span>
          <span style={{ color: '#10b981' }}>🧪 {townEngine.logistics.medicines} 药剂</span>
        </div>
      </header>

      {/* 广播通知浮条 */}
      {systemNotice && (
        <div style={{ background: '#334155', padding: '6px 12px', fontSize: '11px', color: '#38bdf8', borderBottom: '1px solid #475569', display: 'flex', justifyContent: 'space-between' }}>
          <span>🔔 {systemNotice}</span>
          <span onClick={() => setSystemNotice('')} style={{ cursor: 'pointer', color: '#94a3b8', marginLeft: '8px' }}>✕</span>
        </div>
      )}

      {/* 核心展示区 */}
      <main style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        
        {/* 天灾大事件告警栏 (Milestone 3) — 通过 ENABLE_WORLD_CRISIS 开关控制 */}
        {ENABLE_WORLD_CRISIS && (
          <CrisisAlert
            crisis={crisisEngine.crisis}
            onAcceptCrisisBattle={handleAcceptCrisisBattle}
          />
        )}

        {/* 顶部五 Tab 切换 */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {(['town', 'dungeon', 'combat', 'roster', 'story'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px 2px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab ? '#38bdf8' : '#1e293b',
                color: activeTab === tab ? '#0f172a' : '#94a3b8',
                fontWeight: 'bold',
                fontSize: '11px'
              }}
            >
              {tab === 'town' && '🏰 据点'}
              {tab === 'dungeon' && `🗝️ 地牢${currentDungeon ? '●' : ''}`}
              {tab === 'combat' && '🗡️ 战役'}
              {tab === 'roster' && `👥 名册`}
              {tab === 'story' && '📜 物语'}
            </button>
          ))}
        </div>

        {/* Tab 1: 城邦运营与公会据点 */}
        {activeTab === 'town' && (
          <TownView 
            townEngine={townEngine}
            roster={roster}
            onRosterChange={setRoster}
            onSelectContract={handleSelectContract}
            onLogMessage={msg => setSystemNotice(msg)}
            triggerUpdate={triggerUpdate}
          />
        )}

        {/* Tab 2: 深度地牢探索系统 (Milestone 3 核心) */}
        {activeTab === 'dungeon' && (
          <div>
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

        {/* Tab 3: 地牢交战 / 讨伐战场 */}
        {activeTab === 'combat' && (
          <div>
            {currentContract && (
              <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#eab308', fontWeight: 'bold' }}>战场：</span> {activeDungeonRoom?.title || currentContract.title}
                  <span style={{ color: '#38bdf8', marginLeft: '6px' }}>({currentContract.stars}★)</span>
                </div>
                <button
                  onClick={() => setShowFormationModal(true)}
                  style={{ fontSize: '10px', padding: '2px 8px', background: '#334155', border: '1px solid #475569', borderRadius: '4px', color: '#fde047', cursor: 'pointer' }}
                >
                  📐 阵型: {FORMATION_PRESETS[currentFormationPreset]?.name}
                </button>
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
            />

            {/* 战役结果通知 */}
            {engine?.isFinished && (
              <div style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                background: engine.winner === 'player' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                border: engine.winner === 'player' ? '1px solid #10b981' : '1px solid #ef4444',
                marginBottom: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: engine.winner === 'player' ? '#34d399' : '#f87171' }}>
                  {engine.winner === 'player' ? '🎉 房间肃清！斩杀所有强敌！' : '💀 战役惨败，先遣队溃退！'}
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
                    style={{ marginTop: '8px', padding: '6px 16px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    {activeDungeonRoom?.isBoss ? '夺得最终胜利 · 离开地牢 🏆' : '返回探险沙盘 · 选择前进路线 🧭'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleFinishDungeon(false);
                    }}
                    style={{ marginTop: '8px', padding: '6px 16px', background: '#ef4444', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    撤回城邦医馆 🏥
                  </button>
                )}
              </div>
            )}

            {/* 战斗快捷控制台：暂停/继续 + 1x/2x 倍速 + 自动/手动大招 */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button
                onClick={() => setIsRunning(!isRunning)}
                style={{ flex: 1.2, padding: '7px', background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
              >
                {isRunning ? '⏸️ 暂停' : '▶️ 演练'}
              </button>
              <button
                onClick={() => setCombatSpeed(s => s === 1 ? 2 : 1)}
                style={{ flex: 1, padding: '7px', background: combatSpeed === 2 ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #38bdf8', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
              >
                ⚡ {combatSpeed}x 倍速
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
                style={{ flex: 1.4, padding: '7px', background: isAutoUlt ? '#ca8a04' : '#1e293b', color: '#fff', border: '1px solid #eab308', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
              >
                {isAutoUlt ? '🤖 自动大招: 开' : '✋ 手动释放'}
              </button>
            </div>

            {/* 战况日志：默认折叠以节约移动端屏幕高度，点击展开 */}
            <div
              style={{
                background: '#0b1329',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                overflow: 'hidden',
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
                  background: 'rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                    📜 战术推演日志
                  </span>
                  {logs.length > 0 && (
                    <span style={{ fontSize: '9px', color: '#64748b' }}>
                      ({logs.length} 条记录 · 最新: {logs[logs.length - 1]?.text?.slice(0, 14)}...)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: '#38bdf8' }}>
                  {showCombatLogs ? '收起 ▲' : '展开日志 ▼'}
                </div>
              </div>

              {showCombatLogs && (
                <div style={{ padding: '6px 10px', maxHeight: '140px', overflowY: 'auto', borderTop: '1px solid #1e293b' }}>
                  {logs.length === 0 ? (
                    <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', padding: '6px 0' }}>暂无战况数据</div>
                  ) : (
                    logs.map(log => (
                      <div
                        key={log.id}
                        style={{
                          fontSize: '10px',
                          margin: '2px 0',
                          color: log.type === 'ult' ? '#eab308' : log.type === 'heal' ? '#34d399' : log.type === 'death' ? '#f87171' : '#cbd5e1'
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>现役名册 {roster.length}/8 人</span>
                <span style={{ marginLeft: '8px', color: '#34d399' }}>首发 {deployedSquad.length}/4</span>
                <span style={{ marginLeft: '6px', color: '#a78bfa' }}>待命 {Math.max(0, roster.length - deployedSquad.length)} 人</span>
                <div style={{ marginTop: '2px', color: '#eab308' }}>当前阵型：【{FORMATION_PRESETS[currentFormationPreset]?.name}】</div>
              </div>
              <button
                onClick={() => setShowFormationModal(true)}
                style={{ padding: '4px 10px', background: '#d97706', border: 'none', borderRadius: '6px', color: '#0f172a', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
              >
                📐 调整 3×3 阵型
              </button>
            </div>
            {roster.map(hero => {
              const isDeployed = deployedHeroIds.includes(hero.id);
              const heroSlot = formationAssignments.find(a => a.heroId === hero.id)?.slotId;
              const slotMeta = GRID_SLOTS.find(s => s.id === heroSlot);

              return (
                <div 
                  key={hero.id} 
                  style={{ 
                    background: isDeployed ? '#1e293b' : 'rgba(15, 23, 42, 0.75)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: isDeployed ? '1px solid #334155' : '1px dashed #475569',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#f8fafc' }}>
                        {hero.isLeader ? '👑 ' : ''}{hero.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#38bdf8' }}>Lv.{hero.level} {heroRoleLabel(hero)}</span>
                      
                      {/* 出战/待命徽章 */}
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          backgroundColor: isDeployed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                          border: isDeployed ? '1px solid #10b981' : '1px solid #64748b',
                          color: isDeployed ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {isDeployed ? `⚔️ 首发出战 (${slotMeta ? slotMeta.name : '阵中'})` : '💤 驻营待命'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#eab308', fontWeight: 'bold' }}>CA {hero.currentAbility} / PA {hero.potentialAbility}</span>
                      
                      {/* 轮换上阵/下阵操作 */}
                      {!isDeployed ? (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSwapHeroDeploy(e.target.value, hero.id);
                              e.target.value = "";
                            }
                          }}
                          style={{
                            background: '#d97706',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="" disabled>换上出战 🔁</option>
                          {deployedSquad.map(d => (
                            <option key={d.id} value={d.id}>替换: {d.name} ({heroRoleLabel(d)})</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setShowFormationModal(true)}
                          style={{
                            background: '#334155',
                            color: '#cbd5e1',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                          title="调整该队员在 3x3 阵型中的位置"
                        >
                          调位
                        </button>
                      )}
                    </div>
                  </div>
                
                {/* 装备栏（点击卸下） */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '10px' }}>
                  {([
                    ['weapon', '🗡️', hero.equipment.weapon],
                    ['armor', '🛡️', hero.equipment.armor],
                    ['trinket', '💍', hero.equipment.trinket],
                  ] as const).map(([slot, icon, item]) => (
                    <span
                      key={slot}
                      onClick={() => item && handleUnequipItem(hero.id, slot)}
                      style={{
                        background: '#0b1329',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: item ? '#cbd5e1' : '#475569',
                        cursor: item ? 'pointer' : 'default',
                      }}
                      title={item ? `${describeBase(item)}${item.affixText ? ' | ' + item.affixText : ''}` : ''}
                    >
                      {icon} {item?.name || '无'}
                    </span>
                  ))}
                </div>

                {/* 状态与伤残 */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                  <span>生命: {hero.currentHp}/{hero.maxHp}</span>
                  <span>士气: {hero.morale}</span>
                  <span>压力: {hero.stress}/100</span>
                  <span style={{ color: hero.injuries.length > 0 ? '#ef4444' : '#10b981' }}>
                    {hero.injuries.length > 0 ? `伤残: ${hero.injuries.join(',')}` : '健康'}
                  </span>
                </div>

                {/* 九项核心属性面板 */}
                {(() => {
                  const st = resolveStats(hero);
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '8px', fontSize: '10px', color: '#cbd5e1', background: '#0b1329', padding: '8px', borderRadius: '6px' }}>
                      <span>⚔️ {STAT_LABEL.ad} {st.ad}</span>
                      <span>🔮 {STAT_LABEL.ap} {st.ap}</span>
                      <span>❤️ {STAT_LABEL.maxHp} {st.maxHp}</span>
                      <span>🛡️ {STAT_LABEL.armor} {st.armor}</span>
                      <span>✨ {STAT_LABEL.magicResist} {st.magicResist}</span>
                      <span>⚡ 攻速 {(1 / st.attackInterval).toFixed(2)}/s</span>
                      <span>💢 {STAT_LABEL.critChance} {Math.round(st.critChance * 100)}%</span>
                      <span>🔥 {STAT_LABEL.critDamage} {Math.round(st.critDamage * 100)}%</span>
                      <span>🗡️ {STAT_LABEL.penetration} {st.penetration}</span>
                    </div>
                  );
                })()}

                {/* 原始属性（装备不写回这里） */}
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  力量 {hero.attributes.strength} | 武器 {hero.attributes.weaponSkill} | 坚毅 {hero.attributes.resolve} | 抗压 {hero.hidden.pressure}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {hero.traits.map(t => (
                    <span key={t} style={{ fontSize: '10px', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#34d399' }}>
                      {t}
                    </span>
                  ))}
                  <span style={{ fontSize: '10px', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                    周薪: {hero.wage} G
                  </span>
                </div>
              </div>
            );
          })}

            {/* 公共背包 */}
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b' }}>
                  🎒 队伍背包 ({inventory.length})
                </span>
                <select
                  value={inventoryTarget || roster[0]?.id || ''}
                  onChange={e => setInventoryTarget(e.target.value)}
                  style={{ background: '#0f172a', color: '#38bdf8', border: '1px solid #475569', borderRadius: '4px', padding: '3px 6px', fontSize: '11px' }}
                >
                  {roster.map(h => (
                    <option key={h.id} value={h.id}>穿戴至: {h.name}</option>
                  ))}
                </select>
              </div>

              {inventory.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#64748b' }}>背包空空如也，去地牢里翻箱倒柜吧。</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {inventory.map(item => {
                    const rarityColor =
                      item.rarity === 'legendary' ? '#f97316'
                      : item.rarity === 'epic' ? '#a855f7'
                      : item.rarity === 'rare' ? '#38bdf8'
                      : item.rarity === 'uncommon' ? '#10b981'
                      : '#cbd5e1';
                    return (
                      <div
                        key={item.id}
                        style={{ background: '#0f172a', padding: '6px 10px', borderRadius: '6px', borderLeft: `4px solid ${rarityColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}
                      >
                        <div>
                          <span style={{ fontWeight: 'bold', color: rarityColor }}>{item.name}</span>
                          <span style={{ color: '#94a3b8', marginLeft: '6px' }}>[{item.slot}] T{item.tier}</span>
                          <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                            {describeBase(item)}
                            {item.affixText ? ` · ${item.affixText}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEquipItem(inventoryTarget || roster[0]?.id || '', item)}
                          style={{ padding: '4px 8px', background: '#38bdf8', color: '#0f172a', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          装备
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Tab 5: 暗黑叙事与 DSL 剧本系统 */}
        {activeTab === 'story' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 子 Tab 切换 */}
            <div style={{ display: 'flex', gap: '6px', background: '#0b1329', padding: '4px', borderRadius: '8px' }}>
              {(
                [
                  { id: 'ink', label: '📜 Ink分支剧本' },
                  { id: 'event', label: '⚖️ 偶发事件库' },
                  { id: 'bark', label: '🏕️ 营地碎碎念' },
                ] as const
              ).map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setStorySubTab(sub.id)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: storySubTab === sub.id ? '#38bdf8' : 'transparent',
                    color: storySubTab === sub.id ? '#0f172a' : '#94a3b8',
                    fontWeight: 'bold',
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* 子面板 1: Ink.js DSL 剧本运行器 */}
            {storySubTab === 'ink' && (
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
            )}

            {/* 子面板 2: 暗黑地牢偶发事件检定架 */}
            {storySubTab === 'event' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', padding: '0 4px' }}>
                  暗黑低魔风格事件库（已消除网文修饰与无谓血浆），支持队伍属性与职业检定：
                </div>
                {GOLD_STANDARD_DUNGEON_EVENTS.map((ev: DungeonEvent) => (
                  <div
                    key={ev.id}
                    style={{
                      background: '#1e293b',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#fbbf24' }}>
                        {ev.title}
                      </span>
                      <span style={{ fontSize: '10px', background: '#334155', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px' }}>
                        {ev.category} · {ev.theme}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                      {ev.hook}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      抉择分支: {ev.choices.map((c) => `[${c.label}]`).join(' ')}
                    </div>
                    <button
                      onClick={() => setInteractiveEvent(ev)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#38bdf8',
                        color: '#0f172a',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer',
                        marginTop: '4px',
                      }}
                    >
                      ▶ 带领当前小队进行互动检定
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 子面板 3: 佣兵营地碎碎念 (Bark) 展示 */}
            {storySubTab === 'bark' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', padding: '0 4px' }}>
                  基于性格特质（沉稳/酗酒/贪婪/偏执等）与压力动态生成的营地短台词：
                </div>
                {roster.map(hero => {
                  const bark = getCampDialogueForHero(hero);
                  return (
                    <div
                      key={hero.id}
                      style={{
                        background: '#1e293b',
                        borderRadius: '8px',
                        border: '1px solid #334155',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>
                          {hero.name} ({heroRoleLabel(hero)})
                        </span>
                        <span style={{ fontSize: '11px', color: hero.stress > 60 ? '#f87171' : '#38bdf8' }}>
                          压力: {hero.stress}/100
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {hero.traits.map(t => (
                          <span
                            key={t}
                            style={{
                              fontSize: '10px',
                              background: '#334155',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              color: '#34d399',
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

      {/* 底部 PWA 离线提示（包含底部小黑条安全区域 Safe Area Inset Bottom） */}
      <footer style={{ 
        paddingTop: '8px', 
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        textAlign: 'center', 
        fontSize: '10px', 
        color: '#64748b', 
        background: '#0b1329', 
        borderTop: '1px solid #1e293b' 
      }}>
        星原战纪 · 移动端 PWA 运营引擎 · 离线自动运算
      </footer>

    </div>
  );
}

export default App;
