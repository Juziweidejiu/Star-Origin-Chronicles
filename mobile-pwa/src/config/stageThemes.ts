/**
 * 地牢与战场主题环境配置
 * 适配 Milestone 13：可无缝继承探索副本的主题背景、光影与地面粒子
 */

import type { DungeonInstance } from '../types/dungeon';

export type StageTheme = DungeonInstance['theme'];

export interface StageEnvironment {
  id: StageTheme;
  name: string;
  // 渐变天空与远景背景
  bgGradient: string;
  // 地面网格/地坪材质渐变
  groundGradient: string;
  // 环境光氛围色 (RGBA)
  ambientGlow: string;
  // 暗角氛围 (Vignette)
  vignetteColor: string;
  // 环境微粒标识与颜色
  particleColor: string;
  particleType: 'dust' | 'sparks' | 'leaves' | 'frost' | 'fog';
  // 地坪材质纹理微透明线
  gridBorderColor: string;
}

export const STAGE_THEMES: Record<StageTheme, StageEnvironment> = {
  catacomb: {
    id: 'catacomb',
    name: '幽暗矿道与暗河',
    bgGradient: 'linear-gradient(180deg, #090e17 0%, #0c1626 60%, #0f2038 100%)',
    groundGradient: 'linear-gradient(180deg, #111d2e 0%, #0a111a 100%)',
    ambientGlow: 'rgba(56, 189, 248, 0.08)', // 萤石幽蓝
    vignetteColor: 'radial-gradient(ellipse at center, transparent 40%, rgba(3, 7, 18, 0.85) 100%)',
    particleColor: '#38bdf8',
    particleType: 'dust',
    gridBorderColor: 'rgba(56, 189, 248, 0.15)',
  },
  ruins: {
    id: 'ruins',
    name: '残破关隘与古墟',
    bgGradient: 'linear-gradient(180deg, #150f14 0%, #1f141a 60%, #2a1622 100%)',
    groundGradient: 'linear-gradient(180deg, #22141c 0%, #11090d 100%)',
    ambientGlow: 'rgba(239, 68, 68, 0.08)', // 战火残焰暗红
    vignetteColor: 'radial-gradient(ellipse at center, transparent 40%, rgba(10, 4, 8, 0.9) 100%)',
    particleColor: '#f97316',
    particleType: 'sparks',
    gridBorderColor: 'rgba(244, 63, 94, 0.18)',
  },
  wilds: {
    id: 'wilds',
    name: '幽暗深林与猎场',
    bgGradient: 'linear-gradient(180deg, #07130e 0%, #0d1e16 60%, #132b1f 100%)',
    groundGradient: 'linear-gradient(180deg, #12281d 0%, #060e0a 100%)',
    ambientGlow: 'rgba(16, 185, 129, 0.08)', // 碧落流萤幽绿
    vignetteColor: 'radial-gradient(ellipse at center, transparent 45%, rgba(2, 8, 5, 0.88) 100%)',
    particleColor: '#34d399',
    particleType: 'leaves',
    gridBorderColor: 'rgba(16, 185, 129, 0.16)',
  },
  crypt: {
    id: 'crypt',
    name: '极夜覆雪古战场',
    bgGradient: 'linear-gradient(180deg, #0d1117 0%, #131a26 60%, #1a2333 100%)',
    groundGradient: 'linear-gradient(180deg, #151e2e 0%, #0a0d14 100%)',
    ambientGlow: 'rgba(147, 197, 253, 0.09)', // 极夜霜白
    vignetteColor: 'radial-gradient(ellipse at center, transparent 40%, rgba(5, 8, 13, 0.9) 100%)',
    particleColor: '#93c5fd',
    particleType: 'frost',
    gridBorderColor: 'rgba(147, 197, 253, 0.15)',
  },
  forest: {
    id: 'forest',
    name: '迷雾山丘与兽林',
    bgGradient: 'linear-gradient(180deg, #0a110f 0%, #101c18 60%, #182823 100%)',
    groundGradient: 'linear-gradient(180deg, #14221d 0%, #080d0b 100%)',
    ambientGlow: 'rgba(52, 211, 153, 0.08)',
    vignetteColor: 'radial-gradient(ellipse at center, transparent 45%, rgba(3, 7, 5, 0.85) 100%)',
    particleColor: '#a7f3d0',
    particleType: 'fog',
    gridBorderColor: 'rgba(52, 211, 153, 0.15)',
  },
  citadel: {
    id: 'citadel',
    name: '霜月堡垒与要塞',
    bgGradient: 'linear-gradient(180deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
    groundGradient: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    ambientGlow: 'rgba(234, 179, 8, 0.08)',
    vignetteColor: 'radial-gradient(ellipse at center, transparent 40%, rgba(15, 23, 42, 0.9) 100%)',
    particleColor: '#fde047',
    particleType: 'sparks',
    gridBorderColor: 'rgba(234, 179, 8, 0.18)',
  },
};
