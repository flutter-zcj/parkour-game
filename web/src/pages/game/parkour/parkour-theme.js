/**
 * @file 跑酷主题常量。
 * 配色取自原作「圆润森林风」：木框 + 藤蔓绿 + 金色描边 + 暖色地面，
 * 所有 UI 与场景绘制统一从这里取色，保证美术风格一致。
 */

/** 设计分辨率，与 ddz 一致 */
export const DESIGN_W = 750;
export const DESIGN_H = 1334;

/** 三条车道的 x 坐标（等分） */
export const LANES = [190, 375, 560];

/** 玩家脚底基准线 y */
export const GROUND_Y = 1010;

/** 场景滚动速度（像素/秒），开局与上限 */
export const SPEED_START = 340;
export const SPEED_MAX = 720;
export const SPEED_STEP = 6;

/** 圆润森林风调色板 */
export const PALETTE = {
  skyTop: 0x8fd3f0,
  skyBottom: 0xd8f0c2,
  hillFar: 0xa8d48e,
  hillNear: 0x7cbf6b,
  treeDark: 0x3f7d3a,
  treeLight: 0x5da54b,
  trunk: 0x8a5a33,
  ground: 0xd9a35f,
  groundDark: 0xb9823f,
  laneLine: 0xe8c58a,
  bearFur: 0x9c6b3f,
  bearBelly: 0xe8cfa8,
  bearDark: 0x6f4a28,
  boxWood: 0xc98d4b,
  boxLine: 0x8a5a33,
  fence: 0xc9a06b,
  gold: 0xffd34d,
  goldEdge: 0xd9962e,
  uiPanel: 0xfdf3dd,
  uiPanelEdge: 0xc98d4b,
  uiText: 0x5b3a1e,
  uiBtn: 0xffb84d,
  uiBtnEdge: 0xe08f2a,
  magnet: 0xe05252,
  shield: 0x4da3ff,
  double: 0xb26ee0,
  rocket: 0xff8c42,
  heart: 0xff6b6b
};

/** 道具持续时间（毫秒） */
export const ITEM_DUR = {
  magnet: 8000,
  double: 8000,
  rocket: 3200
};

/** 角色动作枚举 */
export const POSE = {
  RUN: 'run',
  JUMP: 'jump',
  SLIDE: 'slide'
};
