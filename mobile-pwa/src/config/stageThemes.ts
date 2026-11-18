/**
 * 战场环境主题
 * 羊皮纸 / 墨线 / 黄铜的纸面语言下，各副本只调整石色、壁炬与浮尘，
 * 不改变战场结构与占格逻辑。
 */

import type { CSSProperties } from 'react';
import type { DungeonInstance } from '../types/dungeon';

export type StageTheme = DungeonInstance['theme'];

export interface StageEnvironment {
  id: StageTheme;
  name: string;
  /** 远处地面石色 */
  floorTop: string;
  /** 近处地面石色 */
  floorBottom: string;
  /** 后墙石色 */
  wall: string;
  /** 壁炬暖光 */
  torch: string;
  /** 该副本的氛围色（散落物、暗角） */
  accent: string;
  /** 空中浮尘颜色 */
  mote: string;
}

export const STAGE_THEMES: Record<StageTheme, StageEnvironment> = {
  catacomb: {
    id: 'catacomb',
    name: '矿道与暗河',
    floorTop: '#C9B491',
    floorBottom: '#EDE1C5',
    wall: '#AF9873',
    torch: 'rgba(92, 200, 255, .20)',
    accent: 'rgba(47, 110, 143, .18)',
    mote: '#DCEFF6',
  },
  ruins: {
    id: 'ruins',
    name: '关隘与旧墟',
    floorTop: '#CFB295',
    floorBottom: '#F0E2C9',
    wall: '#B99A78',
    torch: 'rgba(228, 87, 61, .22)',
    accent: 'rgba(138, 59, 50, .18)',
    mote: '#F7DFC8',
  },
  wilds: {
    id: 'wilds',
    name: '深林与猎场',
    floorTop: '#BEC0A0',
    floorBottom: '#E9E6C9',
    wall: '#A9A883',
    torch: 'rgba(232, 164, 74, .26)',
    accent: 'rgba(78, 122, 90, .18)',
    mote: '#E4F0CD',
  },
  crypt: {
    id: 'crypt',
    name: '覆雪古战场',
    floorTop: '#C8C6C0',
    floorBottom: '#EDEBE4',
    wall: '#B2AFA8',
    torch: 'rgba(147, 197, 253, .24)',
    accent: 'rgba(47, 110, 143, .14)',
    mote: '#EAF4FF',
  },
  forest: {
    id: 'forest',
    name: '山丘与兽林',
    floorTop: '#C3C2A2',
    floorBottom: '#EBE7CB',
    wall: '#A8A882',
    torch: 'rgba(240, 200, 120, .28)',
    accent: 'rgba(78, 122, 90, .20)',
    mote: '#E8F3D2',
  },
  citadel: {
    id: 'citadel',
    name: '堡垒与要塞',
    floorTop: '#CFBB97',
    floorBottom: '#F1E5CB',
    wall: '#B79F7B',
    torch: 'rgba(217, 164, 91, .34)',
    accent: 'rgba(169, 121, 58, .20)',
    mote: '#F8E9C6',
  },
};

/** 把主题写进 CSS 变量，供 .cs-stage 使用 */
export function stageThemeVars(env: StageEnvironment): CSSProperties {
  return {
    ['--cs-floor-a' as string]: env.floorTop,
    ['--cs-floor-b' as string]: env.floorBottom,
    ['--cs-wall' as string]: env.wall,
    ['--cs-torch' as string]: env.torch,
    ['--cs-accent' as string]: env.accent,
    ['--cs-mote' as string]: env.mote,
  } as CSSProperties;
}
