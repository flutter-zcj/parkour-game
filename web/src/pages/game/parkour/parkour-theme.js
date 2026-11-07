/**
 * @file 月光跑酷主题常量。
 * UI 与美术风格严格参考 3DMoonRunner 源码（Assets/GUI、Previews、Model/Texture）：
 * 深蓝星空 + 紫灰夜景建筑 + 石板路 + 暖黄窗光 + 破旧木板按钮 + 金色 B 币。
 * 场景采用伪 3D 透视投影（第三人称背面视角，与源码一致）。
 */

/** 设计分辨率（横屏） */
export const DESIGN_W = 1334;
export const DESIGN_H = 750;

/** 透视投影参数 */
export const PERSP = {
  horizonY: 244,        // 地平线 y
  baseY: 662,           // z=0 处玩家脚底 y
  camDepth: 520,        // 透视深度常数：scale = camDepth / (z + camDepth)
  roadHalf: 560,        // z=0 处路面半宽
  laneUnit: 300,        // z=0 处相邻车道中心间距
  zFar: 2400,           // 远处生成距离
  zHit: 30,             // 碰撞判定 z 窗口
  segLen: 120,          // 路面分段长度
  heightUnit: 1         // 世界高度 → 屏幕像素
};

/** 三条车道的世界 x（-1/0/1） */
export const LANES = [-1, 0, 1];

/** 速度（世界 z 单位/秒），每 300m 递增一档，上限对齐源码 20 */
export const SPEED_START = 620;
export const SPEED_MAX = 1320;
export const SPEED_STEP = 26;
export const SPEED_ADD_DISTANCE = 300;
export const SPEED_ADD_RATE = 46;

/** 跳跃与滑铲 */
export const JUMP_V = 900;
export const GRAVITY = 2200;
export const SLIDE_MS = 620;

/** 道具持续时间（毫秒，对齐源码 Magnet 15s / Shoe 10s / Multiply 10s / Star 3s） */
export const ITEM_DUR = {
  magnet: 15000,
  shoe: 10000,
  x2: 10000,
  star: 3200
};

/** 道具键与源码素材对应 */
export const ITEM_KEYS = ['magnet', 'shoe', 'star', 'x2'];
export const ITEM_NAMES = { magnet: '磁铁', shoe: '弹跳鞋', star: '星星冲刺', x2: '双倍金币' };

/** 障碍物类型 */
export const OBS = {
  BUS: 'bus',        // 公交车：必须换道
  CAR: 'car',        // 汽车：可跳过或换道
  STONE: 'stone',    // 石墩：可跳过或换道
  BOARD: 'board',    // 低梁：必须滑铲
  GAP: 'gap'         // 断桥：必须跳跃
};

/** 夜景调色板（取自源码贴图与预览图） */
export const PALETTE = {
  skyTop: 0x0a1028,
  skyBottom: 0x2a4670,
  moon: 0xfff3c4,
  buildingWall: 0x2a2b45,
  buildingDark: 0x171a30,
  windowLight: 0xffe79a,
  lamp: 0xffd98a,
  road: 0x3a3a4e,
  roadDark: 0x181a27,
  laneLine: 0xe8f1ff,
  wood: 0x6b3d16,
  woodDark: 0x3d210b,
  woodEdge: 0xd8c9a8,
  gold: 0xffd34d,
  goldEdge: 0xd9962e,
  uiText: 0xffffff,
  hair: 0xf2f0e6,
  coat: 0x8b4a24,
  scarf: 0xffd24d,
  pants: 0x2c4a8c,
  shoeColor: 0x241d18
};

/** 角色动作枚举 */
export const POSE = {
  RUN: 'run',
  JUMP: 'jump',
  SLIDE: 'slide'
};
