/**
 * @file 月光跑酷 Phaser 3 场景工厂（UI 严格参考 3DMoonRunner 源码）。
 *
 * 视觉：深蓝星空 + 月亮光晕 + 紫灰夜景建筑夹道 + 石板路透视 + 暖黄路灯，
 *       HUD 全部使用源码 Assets/GUI 原版 PNG（金币、分数条、木板道具按钮、暂停、音效）。
 * 玩法：第三人称伪 3D 三车道、手势/键盘换道、二段跳、滑铲、速度递增、
 *       磁铁/弹跳鞋/双倍金币/星星冲刺、金币连击、相机抖动（对齐源码 Script）。
 * 关卡：按源码 PatternManager 以预设 Pattern 成组生成「障碍 + 金币引导线」，
 *       含新手引导、单侧封锁、连跳、滑铲、断桥、Z 字换道等 12 组节奏；
 *       金币飞入 HUD、连击浮字、落地扬尘、冲刺残影与放射速度线为打击反馈。
 */
import {
  DESIGN_W, DESIGN_H, PERSP, LANES, SPEED_START, SPEED_MAX, SPEED_STEP,
  SPEED_ADD_DISTANCE, SPEED_ADD_RATE, JUMP_V, GRAVITY, SLIDE_MS,
  ITEM_DUR, ITEM_KEYS, ITEM_NAMES, OBS, PALETTE as C, POSE
} from './parkour-theme.js';

const STATE = { READY: 0, RUNNING: 1, PAUSED: 2, OVER: 3 };
const DEFAULT_BASE = 'static/game/parkour/moon/';
const UI_MAP = {
  magnet: 'b-itemmagnet', shoe: 'b-itemshoe', star: 'b-itemstar', x2: 'b-itemx2'
};

/**
 * 生成一串同车道金币（对齐源码金币成串摆放）
 * @param {number} lane 车道索引 0/1/2
 * @param {number} n 金币数量
 * @param {number} dz0 起始深度偏移
 * @param {number} step 相邻间距
 * @returns {Array} 单元数组
 */
function coinLine(lane, n, dz0 = 0, step = 96) {
  const cells = [];
  for (let i = 0; i < n; i++) {
    cells.push({ t: 'coin', lane, dz: dz0 + i * step });
  }
  return cells;
}

/**
 * 构造障碍单元
 * @param {string} type 障碍类型
 * @param {number} lane 车道索引
 * @param {number} dz 深度偏移
 * @returns {Object} 单元
 */
function obs(type, lane, dz = 0) {
  return { t: 'obs', type, lane, dz };
}

/**
 * 构造道具单元
 * @param {number} lane 车道索引
 * @param {number} dz 深度偏移
 * @returns {Object} 单元
 */
function item(lane, dz = 0) {
  return { t: 'item', lane, dz };
}

/**
 * 源码 PatternManager.Pattern 概念：预设的「障碍 + 金币引导线」组合。
 * gap 为下一组生成的滚动距离；cells 中 dz 越大表示越晚到达玩家。
 * 硬性约束：每组至少留一条可通行车道，且相邻单元间距保证玩家有反应时间。
 */
const PATTERNS = [
  // —— 新手引导：先吃币、再遇单个可跳障碍 ——
  { id: 'intro', gap: 720, cells: [...coinLine(1, 6)] },
  { id: 'first_obs', gap: 780, cells: [obs('car', 1, 0), ...coinLine(0, 4, 140)] },
  // —— 常规节奏 ——
  { id: 'coin_wave', gap: 1220, cells: [
    ...coinLine(0, 3), ...coinLine(1, 3, 290), ...coinLine(2, 3, 580)
  ] },
  { id: 'wall_left', gap: 840, cells: [
    obs('bus', 0, 0), obs('bus', 1, 0), ...coinLine(2, 5)
  ] },
  { id: 'wall_right', gap: 840, cells: [
    obs('bus', 1, 0), obs('bus', 2, 0), ...coinLine(0, 5)
  ] },
  { id: 'slide', gap: 840, cells: [obs('board', 1, 0), ...coinLine(1, 3, 260)] },
  { id: 'gap', gap: 860, cells: [obs('gap', 1, 0), ...coinLine(1, 4, 260)] },
  { id: 'jump2', gap: 960, cells: [
    obs('car', 1, 0), obs('stone', 1, 320), ...coinLine(0, 4, 140)
  ] },
  { id: 'item_run', gap: 940, cells: [item(1, 0), ...coinLine(1, 6, 160)] },
  { id: 'zigzag', gap: 1280, cells: [
    obs('car', 0, 0), obs('stone', 2, 320), obs('car', 1, 640), ...coinLine(1, 3, 740)
  ] },
  { id: 'shoe_triple', gap: 1160, cells: [
    obs('car', 1, 0), obs('car', 1, 280), obs('stone', 1, 560), ...coinLine(0, 3, 720)
  ] },
  { id: 'mixed', gap: 1320, cells: [
    obs('bus', 2, 0), ...coinLine(0, 3), obs('board', 0, 620), ...coinLine(2, 3, 760)
  ] }
];

/**
 * 创建跑酷场景类
 * @param {Object} Phaser Phaser 全局对象
 * @param {Object} callbacks 回调集合 { onReady, onGameOver, onPause, onSoundToggle, assetBase }
 * @returns {Object} Scene 类
 */
export default function createParkourScene(Phaser, callbacks) {
  const base = (callbacks && callbacks.assetBase) || DEFAULT_BASE;

  class ParkourScene extends Phaser.Scene {
    constructor() {
      super('parkour');
      this.state = STATE.READY;
      this.speed = SPEED_START;
      this.distance = 0;
      this.score = 0;
      this.bonusScore = 0;
      this.coins = 0;
      this.lives = 1;
      this.lane = 1;
      this.jumpY = 0;
      this.jumpV = 0;
      this.doubleJump = false;
      this.pose = POSE.RUN;
      this.poseTimer = 0;
      this.items = {};
      this.inventory = { magnet: 0, shoe: 0, star: 0, x2: 0 };
      this.obstacles = [];
      this.picks = [];
      this.fx = [];
      this.combo = 0;
      this.comboUntil = 0;
      this.scrollZ = 0;
      this.nextSpawnAt = 1400;
      this.milestone = 250;
      this.patternCount = 0;
      this.lastPatternId = '';
      this.lastTrailAt = 0;
      this.invincibleUntil = 0;
      this.player = null;
      this.hud = {};
      this.itemBtns = {};
      this.soundOn = true;
      this.handlers = {};
    }

    /**
     * 预加载源码 UI 与场景贴图
     * @returns {void}
     */
    preload() {
      ['b-itemmagnet', 'b-itemshoe', 'b-itemstar', 'b-itemx2', 'b-pause', 'coin',
        'scorebar', 'sound-on', 'sound-off'].forEach((key) => {
        this.load.image('ui_' + key, base + 'ui/' + key + '.png');
      });
      this.load.image('bg_sky', base + 'bg/sky.jpg');
      this.load.image('bg_building_a', base + 'bg/building_a.jpg');
      this.load.image('bg_building_b', base + 'bg/building_b.jpg');
      for (let i = 0; i < 8; i++) {
        this.load.image('road_' + i, base + 'road/road_' + i + '.jpg');
      }
      this.load.image('fx_coin', base + 'fx/coin.png');
      this.load.image('fx_collect', base + 'fx/coin_collect.png');
      ITEM_KEYS.forEach((key) => {
        this.load.image('fx_item_' + key, base + 'fx/item_' + key + '.png');
      });
    }

    /**
     * 初始化：生成纹理、搭建世界、注册输入
     * @returns {void}
     */
    create() {
      this.makeTextures();
      this.buildWorld();
      this.buildPlayer();
      this.buildHud();
      this.bindInput();
      this.resetRun();
      this.setHudVisible(false);
      if (callbacks && callbacks.onReady) {
        callbacks.onReady(this);
      }
    }

    /**
     * 显示/隐藏局内 HUD（主菜单对齐源码 PlayUI 不显示 HUD）
     * @param {boolean} visible 是否显示
     * @returns {void}
     */
    setHudVisible(visible) {
      Object.keys(this.hud).forEach((key) => {
        if (this.hud[key] && this.hud[key].setVisible) {
          this.hud[key].setVisible(visible);
        }
      });
      Object.keys(this.itemBtns).forEach((key) => {
        const box = this.itemBtns[key];
        box.btn.setVisible(visible);
        box.badge.setVisible(visible);
        box.timer.setVisible(visible);
        if (!visible) {
          box.ring.clear();
        }
      });
      if (this.toast) {
        this.toast.setVisible(visible);
      }
    }

    /** ============ 投影 ============ */

    /**
     * 透视缩放
     * @param {number} z 深度
     * @returns {number} 缩放系数
     */
    scaleAt(z) {
      return PERSP.camDepth / (Math.max(0, z) + PERSP.camDepth);
    }

    /**
     * 某深度的地面屏幕 y
     * @param {number} z 深度
     * @returns {number} y
     */
    groundY(z) {
      return PERSP.horizonY + (PERSP.baseY - PERSP.horizonY) * this.scaleAt(z);
    }

    /**
     * 世界 x → 屏幕 x
     * @param {number} worldX 车道世界坐标 -1/0/1
     * @param {number} z 深度
     * @returns {number} x
     */
    screenX(worldX, z) {
      return DESIGN_W / 2 + worldX * PERSP.laneUnit * this.scaleAt(z);
    }

    /** ============ 程序化纹理 ============ */

    /**
     * 生成角色、障碍、光晕等程序化纹理
     * @returns {void}
     */
    makeTextures() {
      const g = this.add.graphics();

      // 光晕（路灯/月亮/道具通用）
      for (let i = 12; i >= 1; i--) {
        g.fillStyle(0xffd98a, 0.035 + (12 - i) * 0.004);
        g.fillCircle(64, 64, i * 5);
      }
      g.generateTexture('glow', 128, 128);
      g.clear();

      // 月亮
      g.fillStyle(0xfff3c4, 0.16);
      g.fillCircle(80, 80, 78);
      g.fillStyle(0xfff8dd, 0.5);
      g.fillCircle(80, 80, 52);
      g.fillStyle(0xfffdf0, 1);
      g.fillCircle(80, 80, 40);
      g.generateTexture('moon', 160, 160);
      g.clear();

      this.makeHeroFrames(g);
      this.makeObstacleFrames(g);
      g.destroy();
    }

    /**
     * 生成 Q 版白发角色背影（源码预览图角色：白发 + 棕外套 + 黄围巾 + 蓝裤）
     * @param {Object} g Graphics 画笔
     * @returns {void}
     */
    makeHeroFrames(g) {
      const drawHero = (legPhase, armPhase, crouch) => {
        const top = crouch ? 44 : 0;
        // 深色轮廓垫底（让角色从夜景里跳出来）
        g.fillStyle(0x120d0a, 0.85);
        g.fillRoundedRect(48, 80 + top, 84, crouch ? 68 : 82, 24);
        g.fillCircle(90, 46 + top, 42);
        // 腿（蓝色牛仔裤 + 鞋）
        g.fillStyle(0x1d2c4e, 1);
        g.fillRoundedRect(57, 148 + top - legPhase, 24, 46, 11);
        g.fillRoundedRect(99, 148 + top + legPhase, 24, 46, 11);
        g.fillStyle(C.pants, 1);
        g.fillRoundedRect(59, 148 + top - legPhase, 20, 36, 9);
        g.fillRoundedRect(101, 148 + top + legPhase, 20, 36, 9);
        g.fillStyle(C.shoeColor, 1);
        g.fillEllipse(68, 196 + top - legPhase, 34, 17);
        g.fillEllipse(112, 196 + top + legPhase, 34, 17);
        g.fillStyle(0x5b5f6e, 0.7);
        g.fillEllipse(68, 192 + top - legPhase, 22, 6);
        g.fillEllipse(112, 192 + top + legPhase, 22, 6);
        // 外套
        g.fillStyle(C.coat, 1);
        g.fillRoundedRect(52, 84 + top, 76, crouch ? 62 : 76, 22);
        g.fillStyle(0xa85d2c, 0.55);
        g.fillRoundedRect(58, 88 + top, 64, 20, 12);
        g.lineStyle(3, 0x5d3016, 0.9);
        g.lineBetween(90, 100 + top, 90, 154 + top);
        g.fillStyle(0xffd98a, 0.9);
        g.fillCircle(90, 118 + top, 3);
        g.fillCircle(90, 136 + top, 3);
        // 手臂（摆动幅度加大）
        g.fillStyle(0x7a3f1e, 1);
        g.fillRoundedRect(30, 96 + top - armPhase, 24, 56, 11);
        g.fillRoundedRect(126, 96 + top + armPhase, 24, 56, 11);
        g.fillStyle(C.coat, 1);
        g.fillRoundedRect(32, 96 + top - armPhase, 20, 46, 9);
        g.fillRoundedRect(128, 96 + top + armPhase, 20, 46, 9);
        g.fillStyle(0xf0c9a0, 1);
        g.fillCircle(42, 150 + top - armPhase, 11);
        g.fillCircle(138, 150 + top + armPhase, 11);
        // 围巾（黄，带飘带）
        g.fillStyle(0xc99a25, 1);
        g.fillRoundedRect(48, 76 + top, 84, 18, 9);
        g.fillStyle(C.scarf, 1);
        g.fillRoundedRect(50, 76 + top, 80, 13, 7);
        g.fillTriangle(116, 80 + top, 166, 62 + top, 132, 102 + top);
        g.fillStyle(0xffe98f, 0.8);
        g.fillRoundedRect(56, 78 + top, 34, 5, 2);
        // 头：白发 + 发丝 + 呆毛
        g.fillStyle(0xcfcabc, 1);
        g.fillCircle(90, 46 + top, 40);
        g.fillStyle(C.hair, 1);
        g.fillCircle(90, 43 + top, 37);
        g.fillStyle(0xffffff, 0.55);
        g.fillEllipse(76, 30 + top, 32, 15);
        g.lineStyle(3, 0xc2bdae, 0.9);
        g.beginPath();
        g.arc(90, 45 + top, 29, 0.2, Math.PI - 0.2, false);
        g.strokePath();
        g.lineStyle(3, 0xd8d2c2, 0.8);
        g.lineBetween(90, 10 + top, 96, 2 + top);
        g.lineBetween(96, 2 + top, 104, 6 + top);
        // 耳朵
        g.fillStyle(0xf0c9a0, 1);
        g.fillCircle(53, 54 + top, 9);
        g.fillCircle(127, 54 + top, 9);
      };
      drawHero(-9, -8, false);
      g.generateTexture('hero_run1', 180, 210);
      g.clear();
      drawHero(9, 8, false);
      g.generateTexture('hero_run2', 180, 210);
      g.clear();
      // 跳跃：蜷腿举臂
      g.fillStyle(0x120d0a, 0.85);
      g.fillRoundedRect(48, 74, 84, 88, 24);
      g.fillCircle(90, 42, 42);
      g.fillStyle(C.pants, 1);
      g.fillCircle(66, 158, 18);
      g.fillCircle(114, 158, 18);
      g.fillStyle(C.shoeColor, 1);
      g.fillEllipse(64, 178, 28, 14);
      g.fillEllipse(116, 178, 28, 14);
      g.fillStyle(C.coat, 1);
      g.fillRoundedRect(52, 78, 76, 82, 22);
      g.fillRoundedRect(26, 54, 22, 54, 10);
      g.fillRoundedRect(132, 54, 22, 54, 10);
      g.fillStyle(0xf0c9a0, 1);
      g.fillCircle(37, 54, 10);
      g.fillCircle(143, 54, 10);
      g.lineStyle(3, 0x5d3016, 0.9);
      g.lineBetween(90, 104, 90, 154);
      g.fillStyle(0xc99a25, 1);
      g.fillRoundedRect(48, 70, 84, 18, 9);
      g.fillStyle(C.scarf, 1);
      g.fillRoundedRect(50, 70, 80, 13, 7);
      g.fillTriangle(116, 74, 168, 50, 132, 100);
      g.fillStyle(0xcfcabc, 1);
      g.fillCircle(90, 42, 40);
      g.fillStyle(C.hair, 1);
      g.fillCircle(90, 40, 37);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(76, 28, 30, 14);
      g.lineStyle(3, 0xc2bdae, 0.9);
      g.beginPath();
      g.arc(90, 42, 29, 0.2, Math.PI - 0.2, false);
      g.strokePath();
      g.generateTexture('hero_jump', 180, 210);
      g.clear();
      // 滑铲：贴地前倾
      drawHero(6, 4, true);
      g.generateTexture('hero_slide', 180, 210);
      g.clear();
    }

    /**
     * 生成障碍物正面精灵（配色取自源码 Tx_Buss / Tx_Car / Tx_Stone / Tx_Board）
     * @param {Object} g Graphics 画笔
     * @returns {void}
     */
    makeObstacleFrames(g) {
      // 公交车尾：深灰车身 + 亮黄大窗 + 红色尾灯
      g.fillStyle(0x14161f, 1);
      g.fillRoundedRect(0, 12, 240, 176, 12);
      g.fillStyle(0x2c3040, 1);
      g.fillRoundedRect(8, 20, 224, 160, 10);
      g.fillStyle(0xffe066, 1);
      g.fillRoundedRect(22, 30, 196, 62, 6);
      g.fillStyle(0xfff3b0, 0.7);
      g.fillRoundedRect(28, 34, 184, 20, 4);
      g.fillStyle(0x1b1e28, 1);
      g.fillRoundedRect(22, 104, 196, 54, 6);
      g.fillStyle(0x8b2b2b, 1);
      g.fillRoundedRect(16, 120, 22, 30, 5);
      g.fillRoundedRect(202, 120, 22, 30, 5);
      g.fillStyle(0xff6b4a, 1);
      g.fillRoundedRect(18, 124, 18, 12, 3);
      g.fillRoundedRect(204, 124, 18, 12, 3);
      g.fillStyle(0x0b0c12, 1);
      g.fillRoundedRect(16, 168, 46, 26, 8);
      g.fillRoundedRect(178, 168, 46, 26, 8);
      g.fillStyle(0xc9a227, 1);
      g.fillRoundedRect(96, 166, 48, 12, 3);
      g.generateTexture('obs_bus', 240, 200);
      g.clear();

      // 汽车尾：青灰车身 + 后窗 + 尾灯
      g.fillStyle(0x0f1119, 1);
      g.fillRoundedRect(0, 40, 200, 100, 22);
      g.fillStyle(0x3b4a58, 1);
      g.fillRoundedRect(8, 26, 184, 76, 24);
      g.fillStyle(0x7fa2b8, 0.85);
      g.fillRoundedRect(28, 32, 144, 44, 14);
      g.fillStyle(0xff5b4a, 1);
      g.fillRoundedRect(12, 78, 34, 18, 6);
      g.fillRoundedRect(154, 78, 34, 18, 6);
      g.fillStyle(0x15161d, 1);
      g.fillRoundedRect(14, 120, 40, 24, 8);
      g.fillRoundedRect(146, 120, 40, 24, 8);
      g.fillStyle(0xd9dee6, 0.55);
      g.fillRoundedRect(84, 108, 32, 8, 3);
      g.generateTexture('obs_car', 200, 148);
      g.clear();

      // 石墩：三层灰台
      g.fillStyle(0x232634, 1);
      g.fillRect(24, 44, 112, 116);
      g.fillStyle(0x5b6070, 1);
      g.fillRoundedRect(18, 26, 124, 30, 6);
      g.fillStyle(0x767c8d, 1);
      g.fillRoundedRect(8, 12, 144, 24, 6);
      g.fillStyle(0x9aa0ae, 0.6);
      g.fillRoundedRect(14, 14, 132, 7, 3);
      g.fillStyle(0x3b4050, 1);
      g.fillRoundedRect(30, 62, 100, 92, 4);
      g.lineStyle(3, 0x2a2e3c, 0.8);
      g.lineBetween(34, 104, 126, 104);
      g.lineBetween(34, 134, 126, 134);
      g.generateTexture('obs_stone', 160, 164);
      g.clear();

      // 低梁木板：悬空横梁 + A 形支架（需滑铲）
      g.fillStyle(0x54331a, 1);
      g.fillRoundedRect(0, 0, 260, 46, 6);
      g.fillStyle(0x7b4d24, 1);
      g.fillRoundedRect(6, 4, 248, 16, 4);
      g.lineStyle(4, 0x33200e, 0.9);
      g.lineBetween(10, 30, 250, 30);
      g.lineBetween(60, 4, 60, 42);
      g.lineBetween(200, 4, 200, 42);
      g.fillStyle(0x3a2412, 1);
      g.fillTriangle(40, 46, 76, 46, 40, 120);
      g.fillTriangle(220, 46, 184, 46, 220, 120);
      g.generateTexture('obs_board', 260, 124);
      g.clear();

      // 断桥：黑色缺口
      g.fillStyle(0x08090f, 1);
      g.fillRoundedRect(0, 0, 280, 74, 6);
      g.fillStyle(0x3a3d52, 1);
      g.fillRect(0, 0, 280, 10);
      g.fillRect(0, 64, 280, 10);
      g.lineStyle(3, 0x6b6f86, 0.7);
      g.lineBetween(20, 12, 20, 62);
      g.lineBetween(260, 12, 260, 62);
      g.generateTexture('obs_gap', 280, 74);
      g.clear();
    }

    /** ============ 世界 ============ */

    /**
     * 搭建伪 3D 世界：星空、月亮、建筑夹道、石板路、路灯
     * @returns {void}
     */
    buildWorld() {
      this.add.image(DESIGN_W / 2, DESIGN_H / 2, 'bg_sky')
        .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(-10);
      this.add.image(760, 128, 'moon').setDisplaySize(150, 150).setDepth(-7).setAlpha(0.92);

      // 地平线远端亮光
      const glow = this.add.image(DESIGN_W / 2, PERSP.horizonY - 20, 'glow')
        .setDisplaySize(620, 250).setDepth(-8).setAlpha(0.42);
      glow.setTint(0xffd98a);

      // 前景人行道：遮住路面底边以下的天空，避免露出亮蓝地平雾
      this.add.rectangle(0, PERSP.baseY, DESIGN_W, DESIGN_H - PERSP.baseY, C.roadDark)
        .setOrigin(0).setDepth(4);

      // 建筑列（左右各 9 段）
      this.buildings = [];
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 9; i++) {
          const img = this.add.image(0, 0, 'bg_building_a').setOrigin(0.5, 1).setDepth(1);
          img.side = side;
          img.slot = i;
          this.buildings.push(img);
        }
      }

      // 路灯（每侧 5 盏）
      this.lamps = [];
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 5; i++) {
          const halo = this.add.image(0, 0, 'glow').setDepth(4);
          const pole = this.add.rectangle(0, 0, 6, 60, 0x1d2230).setOrigin(0.5, 1).setDepth(5);
          const head = this.add.image(0, 0, 'glow').setDepth(6);
          this.lamps.push({ halo, pole, head, side, slot: i });
        }
      }

      // 路面分段（近→远）
      this.roadSegs = [];
      const segCount = Math.ceil(PERSP.zFar / PERSP.segLen) + 1;
      for (let i = 0; i < segCount; i++) {
        this.roadSegs.push(this.add.image(0, 0, 'road_0').setOrigin(0.5, 1).setDepth(2));
      }
      this.roadGfx = this.add.graphics().setDepth(3);
      this.starGfx = this.add.graphics().setDepth(30);
    }

    /**
     * 更新透视世界（路面、车道线、路肩、建筑、路灯）
     * @returns {void}
     */
    updateWorld() {
      // 路肩底色（左右梯形）
      const g = this.roadGfx;
      g.clear();
      g.fillStyle(C.roadDark, 1);
      const nearHalf = PERSP.roadHalf + 190;
      g.fillPoints([
        { x: DESIGN_W / 2 - nearHalf, y: PERSP.baseY },
        { x: DESIGN_W / 2 - PERSP.roadHalf, y: PERSP.baseY },
        { x: DESIGN_W / 2 - PERSP.roadHalf * this.scaleAt(PERSP.zFar), y: this.groundY(PERSP.zFar) },
        { x: 0, y: this.groundY(PERSP.zFar) }
      ], true);
      g.fillPoints([
        { x: DESIGN_W / 2 + PERSP.roadHalf, y: PERSP.baseY },
        { x: DESIGN_W / 2 + nearHalf, y: PERSP.baseY },
        { x: DESIGN_W, y: this.groundY(PERSP.zFar) },
        { x: DESIGN_W / 2 + PERSP.roadHalf * this.scaleAt(PERSP.zFar), y: this.groundY(PERSP.zFar) }
      ], true);

      // 路面分段
      const shift = this.scrollZ % PERSP.segLen;
      const frame = Math.floor(this.scrollZ / PERSP.segLen);
      for (let i = 0; i < this.roadSegs.length; i++) {
        const z0 = Math.max(0, i * PERSP.segLen - shift);
        const z1 = z0 + PERSP.segLen;
        const y0 = this.groundY(z0);
        const y1 = this.groundY(z1);
        const w = 2 * PERSP.roadHalf * this.scaleAt(z0);
        const img = this.roadSegs[i];
        img.setPosition(DESIGN_W / 2, y0);
        img.setDisplaySize(w, Math.max(1, y0 - y1));
        img.setTexture('road_' + (((i + frame) % 8) + 8) % 8);
      }

      // 车道线：外侧两条实线 + 内侧两条虚线
      this.drawPerspLine(g, -1.5, C.laneLine, 0.95, 6, false);
      this.drawPerspLine(g, 1.5, C.laneLine, 0.95, 6, false);
      this.drawPerspLine(g, -0.5, C.laneLine, 0.32, 3, true);
      this.drawPerspLine(g, 0.5, C.laneLine, 0.32, 3, true);

      // 建筑
      const gap = 300;
      const total = gap * 9;
      const off = this.scrollZ % total;
      this.buildings.forEach((b) => {
        let z = b.slot * gap - off;
        if (z < -gap) {
          z += total;
        }
        const zz = Math.max(0, z);
        const s = this.scaleAt(zz);
        const gy = this.groundY(zz);
        const w = 430 * s;
        const h = 820 * s;
        const x = DESIGN_W / 2 + b.side * (PERSP.roadHalf * s + w * 0.33);
        b.setPosition(x, gy + 12 * s);
        b.setDisplaySize(w, h);
        b.setTexture((b.slot + Math.floor(this.scrollZ / total)) % 2 === 0 ? 'bg_building_a' : 'bg_building_b');
        b.setFlipX(b.side > 0);
        b.setAlpha(Phaser.Math.Clamp(1 - zz / PERSP.zFar * 0.5, 0.5, 1));
      });

      // 路灯
      const lampGap = 560;
      const lampTotal = lampGap * 5;
      const lampOff = this.scrollZ % lampTotal;
      this.lamps.forEach((l) => {
        let z = l.slot * lampGap - lampOff;
        if (z < -lampGap) {
          z += lampTotal;
        }
        const zz = Math.max(0, z);
        const s = this.scaleAt(zz);
        const gy = this.groundY(zz);
        const x = DESIGN_W / 2 + l.side * (PERSP.roadHalf * s + 96 * s);
        l.pole.setPosition(x, gy).setDisplaySize(Math.max(2, 7 * s), Math.max(8, 116 * s));
        l.head.setPosition(x, gy - 116 * s).setDisplaySize(Math.max(8, 96 * s), Math.max(8, 96 * s)).setAlpha(0.85);
        l.halo.setPosition(x, gy - 116 * s).setDisplaySize(Math.max(20, 300 * s), Math.max(20, 300 * s)).setAlpha(0.25 * s);
        l.pole.setAlpha(Phaser.Math.Clamp(s * 1.2, 0.3, 1));
      });

      // 星星冲刺：从地平线中心向外发散的速度线
      if (this.items.star && this.state === STATE.RUNNING) {
        const cx = DESIGN_W / 2;
        for (let i = 0; i < 18; i++) {
          const spread = ((i * 197 + Math.floor(this.scrollZ / 2)) % DESIGN_W) - DESIGN_W / 2;
          const strong = i % 3 === 0;
          g.lineStyle(strong ? 4 : 2, 0xfff2c0, strong ? 0.55 : 0.3);
          g.lineBetween(cx + spread * 0.18, PERSP.horizonY + 30,
            cx + spread * 1.25, PERSP.baseY + 60);
        }
      }
    }

    /**
     * 画一条透视车道线
     * @param {Object} g Graphics
     * @param {number} worldX 车道世界坐标
     * @param {number} color 颜色
     * @param {number} alpha 透明度
     * @param {number} width 线宽
     * @param {boolean} dashed 是否虚线
     * @returns {void}
     */
    drawPerspLine(g, worldX, color, alpha, width, dashed) {
      g.lineStyle(width, color, alpha);
      for (let z = 0; z < PERSP.zFar; z += PERSP.segLen) {
        if (dashed && (Math.floor((z + this.scrollZ) / PERSP.segLen) % 2 === 0)) {
          continue;
        }
        const z2 = Math.min(PERSP.zFar, z + PERSP.segLen);
        g.lineBetween(
          this.screenX(worldX, z), this.groundY(z),
          this.screenX(worldX, z2), this.groundY(z2)
        );
      }
    }

    /** ============ 玩家 ============ */

    /**
     * 建立玩家精灵
     * @returns {void}
     */
    buildPlayer() {
      this.player = this.add.sprite(DESIGN_W / 2, PERSP.baseY, 'hero_run1')
        .setOrigin(0.5, 1).setDepth(20);
      this.player.playFrame = POSE.RUN;
      this.playerShadow = this.add.ellipse(DESIGN_W / 2, PERSP.baseY + 4, 120, 26, 0x000000, 0.34)
        .setDepth(19);
      this.heroGlow = this.add.image(DESIGN_W / 2, PERSP.baseY - 90, 'glow')
        .setDisplaySize(180, 180).setDepth(18).setAlpha(0);
    }

    /**
     * 建立原版 GUI HUD
     * @returns {void}
     */
    buildHud() {
      const add = (x, y, key, w, h, depth) => this.add.image(x, y, 'ui_' + key)
        .setOrigin(0, 0).setDisplaySize(w, h).setDepth(depth);
      const font = { fontFamily: 'Arial, sans-serif', fontStyle: 'bold', color: '#ffffff' };

      // 左上：金币图标 + 深灰分数条 + 金币数
      add(22, 18, 'coin', 62, 62, 42);
      add(68, 20, 'scorebar', 258, 78, 41);
      this.hud.coinText = this.add.text(150, 34, '0', Object.assign({}, font, { fontSize: '40px' }))
        .setOrigin(0, 0).setDepth(43);

      // 顶部中央：距离 / 分数
      this.hud.distance = this.add.text(DESIGN_W / 2, 20, '0 m', Object.assign({}, font, {
        fontSize: '34px', stroke: '#101426', strokeThickness: 6
      })).setOrigin(0.5, 0).setDepth(42);
      this.hud.score = this.add.text(DESIGN_W / 2, 62, 'SCORE 0', Object.assign({}, font, {
        fontSize: '24px', color: '#ffe6a8', stroke: '#101426', strokeThickness: 5
      })).setOrigin(0.5, 0).setDepth(42);

      // 右上：竖排 4 个原版木板道具按钮（背包数量 + 激活倒计时）
      ITEM_KEYS.forEach((key, i) => {
        const y = 26 + i * 88;
        const btn = add(DESIGN_W - 104, y, UI_MAP[key], 78, 76, 42).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => this.useItem(key));
        const ring = this.add.graphics().setDepth(41);
        const badge = this.add.text(DESIGN_W - 26, y + 4, '', Object.assign({}, font, {
          fontSize: '26px', color: '#ffd34d', stroke: '#2a1608', strokeThickness: 5
        })).setOrigin(1, 0).setDepth(44);
        const timer = this.add.text(DESIGN_W - 65, y + 78, '', Object.assign({}, font, {
          fontSize: '20px', color: '#ffe6a8', stroke: '#2a1608', strokeThickness: 4
        })).setOrigin(0.5, 0).setDepth(44);
        this.itemBtns[key] = { btn, ring, badge, timer, x: DESIGN_W - 104, y };
      });

      // 左下：暂停按钮（源码 b-pause）
      this.hud.pause = add(22, DESIGN_H - 88, 'b-pause', 72, 70, 42).setInteractive({ useHandCursor: true });
      this.hud.pause.on('pointerdown', () => {
        if (this.state === STATE.RUNNING) {
          this.pauseRun();
          if (callbacks && callbacks.onPause) {
            callbacks.onPause(this.getStats());
          }
        }
      });

      // 右下：音效开关（源码 sound-on / sound-off）
      this.hud.sound = add(DESIGN_W - 86, DESIGN_H - 84, 'sound-on', 64, 64, 42)
        .setInteractive({ useHandCursor: true });
      this.hud.sound.on('pointerdown', () => {
        this.soundOn = !this.soundOn;
        this.hud.sound.setTexture('ui_sound-' + (this.soundOn ? 'on' : 'off'));
        if (callbacks && callbacks.onSoundToggle) {
          callbacks.onSoundToggle(this.soundOn);
        }
      });

      // 中央飘字
      this.toast = this.add.text(DESIGN_W / 2, 190, '', Object.assign({}, font, {
        fontSize: '52px', color: '#ffd34d', stroke: '#2a1608', strokeThickness: 9
      })).setOrigin(0.5).setDepth(50).setAlpha(0);
      this.toastTimer = null;
    }

    /**
     * 显示中央飘字
     * @param {string} msg 文案
     * @returns {void}
     */
    showToast(msg) {
      this.toast.setText(msg).setAlpha(1).setScale(0.7);
      this.tweens.add({ targets: this.toast, scale: 1, duration: 180, ease: 'Back.Out' });
      if (this.toastTimer) {
        this.toastTimer.remove();
      }
      this.toastTimer = this.time.delayedCall(900, () => {
        this.tweens.add({ targets: this.toast, alpha: 0, y: 150, duration: 320, onComplete: () => {
          this.toast.y = 190;
        } });
      });
    }

    /** ============ 输入 ============ */

    /**
     * 注册手势（对齐源码 GetInputDirection 四方向）与键盘输入
     * @returns {void}
     */
    bindInput() {
      this.swipeStart = null;
      this.input.on('pointerdown', (p) => {
        if (this.inHud(p.x, p.y)) {
          this.swipeStart = null;
          return;
        }
        this.swipeStart = { x: p.x, y: p.y };
      });
      this.input.on('pointerup', (p) => {
        if (!this.swipeStart) {
          return;
        }
        const dx = p.x - this.swipeStart.x;
        const dy = p.y - this.swipeStart.y;
        this.swipeStart = null;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
          return;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
          this.moveLane(dx > 0 ? 1 : -1);
        } else if (dy < 0) {
          this.doJump();
        } else {
          this.doSlide();
        }
      });
      const kb = this.input.keyboard;
      if (kb) {
        kb.on('keydown-LEFT', () => this.moveLane(-1));
        kb.on('keydown-A', () => this.moveLane(-1));
        kb.on('keydown-RIGHT', () => this.moveLane(1));
        kb.on('keydown-D', () => this.moveLane(1));
        kb.on('keydown-UP', () => this.doJump());
        kb.on('keydown-W', () => this.doJump());
        kb.on('keydown-SPACE', () => this.doJump());
        kb.on('keydown-DOWN', () => this.doSlide());
        kb.on('keydown-S', () => this.doSlide());
      }
    }

    /**
     * 判断点击是否落在 HUD 区域（避免手势误触）
     * @param {number} x x
     * @param {number} y y
     * @returns {boolean} 是否在 HUD
     */
    inHud(x, y) {
      return (x < 340 && y < 110) || (x > DESIGN_W - 130) ||
        (x < 120 && y > DESIGN_H - 110) || (x > DESIGN_W - 110 && y > DESIGN_H - 110);
    }

    /**
     * 换道
     * @param {number} dir -1 左 / 1 右
     * @returns {void}
     */
    moveLane(dir) {
      if (this.state !== STATE.RUNNING) {
        return;
      }
      const next = Phaser.Math.Clamp(this.lane + dir, 0, 2);
      if (next !== this.lane) {
        this.lane = next;
        this.handlers.lane && this.handlers.lane();
      }
    }

    /**
     * 跳跃（支持二段跳，对齐源码 canDoubleJump）
     * @returns {void}
     */
    doJump() {
      if (this.state !== STATE.RUNNING || this.items.star) {
        return;
      }
      if (this.jumpY <= 1 && this.jumpV === 0) {
        this.jumpV = this.items.shoe ? JUMP_V * 1.45 : JUMP_V;
        this.doubleJump = true;
        this.setPose(POSE.JUMP);
        this.handlers.jump && this.handlers.jump();
      } else if (this.doubleJump) {
        this.jumpV = JUMP_V * 0.86;
        this.doubleJump = false;
        this.spawnBurst(this.player.x, this.player.y - 60, 0xffe6a8);
        this.handlers.jump && this.handlers.jump();
      }
    }

    /**
     * 滑铲（空中下划快速落地，对齐源码 QuickGround）
     * @returns {void}
     */
    doSlide() {
      if (this.state !== STATE.RUNNING || this.items.star) {
        return;
      }
      if (this.jumpY > 1) {
        this.jumpV = -GRAVITY * 0.55;
      }
      this.setPose(POSE.SLIDE);
      this.poseTimer = SLIDE_MS;
      this.handlers.slide && this.handlers.slide();
    }

    /**
     * 切换姿态
     * @param {string} pose 姿态
     * @returns {void}
     */
    setPose(pose) {
      this.pose = pose;
      const frames = { run: 'hero_run1', jump: 'hero_jump', slide: 'hero_slide' };
      if (this.player.playFrame !== pose) {
        this.player.playFrame = pose;
        this.player.setTexture(frames[pose]);
      }
    }

    /**
     * 挂接音频回调（由页面层注入）
     * @param {Object} actions 动作回调集合
     * @returns {void}
     */
    setActions(actions) {
      this.handlers = actions || {};
    }

    /** ============ 实体 ============ */

    /**
     * 选取本组 Pattern：前两组固定为新手引导，之后按距离解锁难度并避免连续重复
     * @returns {Object} Pattern
     */
    pickPattern() {
      if (this.patternCount < 2) {
        return PATTERNS[this.patternCount];
      }
      const pool = this.distance < 300 ? PATTERNS.slice(0, 4) : PATTERNS;
      let pat = Phaser.Utils.Array.GetRandom(pool);
      let guard = 0;
      while (pat.id === this.lastPatternId && guard < 4) {
        pat = Phaser.Utils.Array.GetRandom(pool);
        guard += 1;
      }
      this.lastPatternId = pat.id;
      return pat;
    }

    /**
     * 按预设 Pattern 成组生成障碍/金币/道具（对齐源码 PatternManager）
     * @returns {void}
     */
    spawn() {
      while (this.scrollZ >= this.nextSpawnAt) {
        const pat = this.pickPattern();
        const z = PERSP.zFar;
        pat.cells.forEach((c) => {
          const laneX = LANES[c.lane];
          if (c.t === 'obs') {
            this.addObstacle(c.type, laneX, z + c.dz);
          } else if (c.t === 'item') {
            this.addItemPickup(laneX, z + c.dz);
          } else {
            this.addPickup('coin', laneX, z + c.dz);
          }
        });
        this.nextSpawnAt += pat.gap;
        this.patternCount += 1;
      }
    }

    /**
     * 添加障碍
     * @param {string} type 类型
     * @param {number} laneX 车道世界 x
     * @param {number} z 深度
     * @returns {void}
     */
    addObstacle(type, laneX, z) {
      const size = {
        bus: [230, 190], car: [180, 132], stone: [140, 144], board: [250, 118], gap: [270, 70]
      }[type];
      const img = this.add.image(0, 0, 'obs_' + type).setOrigin(0.5, 1);
      this.obstacles.push({ img, type, lane: laneX, z, w: size[0], h: size[1], hit: false });
    }

    /**
     * 添加金币
     * @param {string} kind 类型
     * @param {number} laneX 车道世界 x
     * @param {number} z 深度
     * @returns {void}
     */
    addPickup(kind, laneX, z) {
      const img = this.add.image(0, 0, 'fx_coin').setOrigin(0.5, 0.5);
      this.picks.push({ img, kind: 'coin', lane: laneX, z, w: 62, h: 62, float: 62, hit: false });
    }

    /**
     * 添加道具方块
     * @param {number} laneX 车道世界 x
     * @param {number} z 深度
     * @returns {void}
     */
    addItemPickup(laneX, z) {
      const key = Phaser.Utils.Array.GetRandom(ITEM_KEYS);
      const img = this.add.image(0, 0, 'fx_item_' + key).setOrigin(0.5, 0.5);
      this.picks.push({ img, kind: 'item', itemKey: key, lane: laneX, z, w: 88, h: 88, float: 76, hit: false });
    }

    /**
     * 更新所有实体的透视位置并回收
     * @param {number} dy 本帧滚动量
     * @returns {void}
     */
    updateEntities(dy) {
      const update = (list, isPick) => {
        for (let i = list.length - 1; i >= 0; i--) {
          const e = list[i];
          e.z -= dy;
          if (e.z < -140) {
            e.img.destroy();
            list.splice(i, 1);
            continue;
          }
          this.placeEntity(e, isPick);
        }
      };
      update(this.obstacles, false);
      update(this.picks, true);
    }

    /**
     * 按透视投影摆放实体
     * @param {Object} e 实体
     * @param {boolean} isPick 是否拾取物
     * @returns {void}
     */
    placeEntity(e, isPick) {
      const z = Math.max(0, e.z);
      const s = this.scaleAt(z);
      let laneX = e.lane;
      // 磁铁：把附近金币吸向玩家所在车道
      if (isPick && e.kind === 'coin' && this.items.magnet && z < 700) {
        laneX += (LANES[this.lane] - laneX) * Phaser.Math.Clamp((700 - z) / 700, 0, 1) * 0.9;
      }
      const floatY = isPick ? e.float + Math.sin(this.time.now / 220 + e.z / 90) * 10 : 0;
      const x = this.screenX(laneX, z);
      const y = this.groundY(z) - floatY * s;
      e.img.setPosition(x, y);
      e.img.setDisplaySize(e.w * s, e.h * s);
      e.img.setDepth(10 + (PERSP.zFar - z) / 60);
      e.img.setAlpha(Phaser.Math.Clamp((PERSP.zFar - z) / 320, 0.15, 1));
      if (isPick) {
        e.img.rotation = Math.sin(this.time.now / 300 + e.z / 120) * 0.16;
      }
    }

    /** ============ 碰撞与结算 ============ */

    /**
     * 碰撞检测（对齐源码 Board 滑铲 / 障碍伤害 / 磁铁吸币 / 相机抖动）
     * @param {number} time 总时间
     * @param {number} dy 本帧滚动量
     * @returns {void}
     */
    checkCollide(time, dy) {
      const window = PERSP.zHit + dy + 14;
      const laneTol = this.items.magnet ? 1.35 : 0.45;
      for (let i = this.picks.length - 1; i >= 0; i--) {
        const p = this.picks[i];
        if (p.z > -window && p.z < window && Math.abs(p.lane - LANES[this.lane]) < laneTol) {
          this.collect(p);
          p.img.destroy();
          this.picks.splice(i, 1);
        }
      }
      if (this.items.star || time < this.invincibleUntil) {
        return;
      }
      for (const o of this.obstacles) {
        if (o.hit || o.z > PERSP.zHit || o.z < -window) {
          continue;
        }
        if (Math.abs(o.lane - LANES[this.lane]) > 0.45) {
          continue;
        }
        o.hit = true;
        if (this.canPass(o)) {
          continue;
        }
        this.hitObstacle(o, time);
        break;
      }
    }

    /**
     * 判定玩家是否能通过障碍
     * @param {Object} o 障碍
     * @returns {boolean} 是否通过
     */
    canPass(o) {
      if (o.type === OBS.BOARD) {
        return this.pose === POSE.SLIDE;
      }
      if (o.type === OBS.GAP) {
        return this.jumpY > 90;
      }
      if (o.type === OBS.CAR || o.type === OBS.STONE) {
        return this.jumpY > 150 || (this.items.shoe && this.jumpY > 70);
      }
      return false;
    }

    /**
     * 拾取入账
     * @param {Object} p 拾取物
     * @returns {void}
     */
    collect(p) {
      if (p.kind === 'coin') {
        const mult = this.items.x2 ? 2 : 1;
        this.coins += mult;
        this.bonusScore += 10 * mult;
        this.combo = this.time.now < this.comboUntil ? this.combo + 1 : 1;
        this.comboUntil = this.time.now + 1400;
        if (this.combo > 0 && this.combo % 8 === 0) {
          this.showToast('COMBO ×' + this.combo);
          this.bonusScore += 50;
        }
        this.spawnBurst(p.img.x, p.img.y, 0xffd34d);
        this.flyCoin(p.img.x, p.img.y, mult);
        this.floatText(this.player.x, this.player.y - 130, '+' + mult, '#ffd34d', 30);
        if (this.combo >= 3) {
          this.floatText(this.player.x + 96, this.player.y - 172, '×' + this.combo, '#ffe6a8', 25);
        }
        this.handlers.coin && this.handlers.coin();
      } else {
        this.inventory[p.itemKey] += 1;
        if (!this.items[p.itemKey]) {
          this.activateItem(p.itemKey);
        } else {
          this.showToast('获得 ' + ITEM_NAMES[p.itemKey]);
        }
        this.floatText(p.img.x, p.img.y - 40, ITEM_NAMES[p.itemKey], '#ffe6a8', 26);
        this.handlers.item && this.handlers.item();
      }
    }

    /**
     * 点击 HUD 按钮使用背包道具
     * @param {string} key 道具键
     * @returns {void}
     */
    useItem(key) {
      if (this.state !== STATE.RUNNING || this.items[key] || this.inventory[key] <= 0) {
        return;
      }
      this.inventory[key] -= 1;
      this.activateItem(key);
      this.handlers.click && this.handlers.click();
    }

    /**
     * 激活道具
     * @param {string} key 道具键
     * @returns {void}
     */
    activateItem(key) {
      this.items[key] = this.time.now + ITEM_DUR[key];
      this.showToast(ITEM_NAMES[key] + '!');
      this.spawnBurst(this.player.x, this.player.y - 90, 0xffe6a8);
      this.handlers.item && this.handlers.item();
      if (key === 'star') {
        this.invincibleUntil = this.time.now + ITEM_DUR.star;
      }
    }

    /**
     * 撞击障碍：相机抖动 + 结算（对齐源码 CameraShake / hit）
     * @param {Object} o 障碍
     * @param {number} time 总时间
     * @returns {void}
     */
    hitObstacle(o, time) {
      this.handlers.crash && this.handlers.crash();
      this.cameras.main.shake(240, 0.014);
      this.spawnBurst(this.player.x, this.player.y - 80, 0xff6b4a);
      if (this.items.star || time < this.invincibleUntil) {
        return;
      }
      this.lives -= 1;
      if (this.lives <= 0) {
        this.handlers.death && this.handlers.death();
        this.gameOver();
      }
    }

    /**
     * 生成粒子爆发
     * @param {number} x x
     * @param {number} y y
     * @param {number} color 颜色
     * @returns {void}
     */
    spawnBurst(x, y, color) {
      for (let i = 0; i < 7; i++) {
        const dot = this.add.circle(x, y, Phaser.Math.Between(3, 7), color, 0.9).setDepth(48);
        const ang = Math.random() * Math.PI * 2;
        const dist = Phaser.Math.Between(30, 90);
        this.tweens.add({
          targets: dot, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist,
          alpha: 0, scale: 0.3, duration: 460, onComplete: () => dot.destroy()
        });
      }
    }

    /**
     * 金币飞向左上 HUD 的收集动画（对齐源码 Item.hitEffect）
     * @param {number} x 起点 x
     * @param {number} y 起点 y
     * @param {number} mult 金币倍率
     * @returns {void}
     */
    flyCoin(x, y, mult) {
      const icon = this.add.image(x, y, 'fx_coin').setDisplaySize(46, 46).setDepth(49);
      this.tweens.add({
        targets: icon, x: 53, y: 49, scale: 0.34, alpha: 0.25,
        duration: 420, ease: 'Cubic.In', onComplete: () => icon.destroy()
      });
      if (mult > 1) {
        this.floatText(x, y - 36, '×2', '#ffe6a8', 26);
      }
    }

    /**
     * 场景内浮动文字（上浮淡出）
     * @param {number} x x
     * @param {number} y y
     * @param {string} msg 文案
     * @param {string} color 颜色
     * @param {number} size 字号
     * @returns {void}
     */
    floatText(x, y, msg, color, size) {
      const t = this.add.text(x, y, msg, {
        fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
        fontSize: size + 'px', color, stroke: '#1a1424', strokeThickness: 5
      }).setOrigin(0.5).setDepth(49);
      this.tweens.add({
        targets: t, y: y - 70, alpha: 0, scale: 1.25,
        duration: 640, ease: 'Cubic.Out', onComplete: () => t.destroy()
      });
    }

    /**
     * 落地扬尘
     * @param {number} x x
     * @param {number} y y
     * @returns {void}
     */
    spawnDust(x, y) {
      for (let i = 0; i < 5; i++) {
        const d = this.add.ellipse(x + Phaser.Math.Between(-26, 26), y,
          Phaser.Math.Between(14, 26), 9, 0xb9c2da, 0.5).setDepth(9);
        this.tweens.add({
          targets: d, x: d.x + Phaser.Math.Between(-40, 40), y: y - 18,
          alpha: 0, scale: 0.4, duration: 380, onComplete: () => d.destroy()
        });
      }
    }

    /**
     * 星星冲刺残影（对齐源码 QuickMove 的 20 速冲刺表现）
     * @returns {void}
     */
    spawnTrail() {
      const ghost = this.add.image(this.player.x, this.player.y, this.player.texture.key)
        .setDisplaySize(this.player.displayWidth, this.player.displayHeight)
        .setDepth(this.player.depth - 1).setAlpha(0.32);
      this.tweens.add({
        targets: ghost, alpha: 0, scaleX: 0.85,
        duration: 260, onComplete: () => ghost.destroy()
      });
    }

    /** ============ 生命周期 ============ */

    /**
     * 重置一局
     * @returns {void}
     */
    resetRun() {
      this.speed = SPEED_START;
      this.distance = 0;
      this.score = 0;
      this.bonusScore = 0;
      this.coins = 0;
      this.combo = 0;
      this.comboUntil = 0;
      this.lives = 1;
      this.lane = 1;
      this.jumpY = 0;
      this.jumpV = 0;
      this.doubleJump = false;
      this.poseTimer = 0;
      this.items = {};
      this.inventory = { magnet: 0, shoe: 0, star: 0, x2: 0 };
      this.invincibleUntil = 0;
      this.milestone = SPEED_ADD_DISTANCE;
      this.obstacles.forEach((o) => o.img.destroy());
      this.picks.forEach((p) => p.img.destroy());
      this.obstacles = [];
      this.picks = [];
      this.scrollZ = 0;
      this.nextSpawnAt = 1400;
      this.patternCount = 0;
      this.lastPatternId = '';
      this.lastTrailAt = 0;
      this.setPose(POSE.RUN);
      this.player.setPosition(DESIGN_W / 2, PERSP.baseY);
      this.player.setAngle(0).setAlpha(1);
      this.refreshHud();
    }

    /**
     * 开始一局
     * @returns {void}
     */
    startRun() {
      this.resetRun();
      this.setHudVisible(true);
      this.state = STATE.RUNNING;
    }

    /**
     * 暂停
     * @returns {void}
     */
    pauseRun() {
      if (this.state === STATE.RUNNING) {
        this.state = STATE.PAUSED;
      }
    }

    /**
     * 恢复
     * @returns {void}
     */
    resumeRun() {
      if (this.state === STATE.PAUSED) {
        this.state = STATE.RUNNING;
      }
    }

    /**
     * 结束一局并回调
     * @returns {void}
     */
    gameOver() {
      this.state = STATE.OVER;
      this.player.setAngle(18);
      if (callbacks && callbacks.onGameOver) {
        callbacks.onGameOver(this.getStats());
      }
    }

    /**
     * 复活：清屏障碍 + 2 秒无敌
     * @returns {void}
     */
    revive() {
      this.obstacles.forEach((o) => o.img.destroy());
      this.obstacles = [];
      this.lives = 1;
      this.invincibleUntil = this.time.now + 2000;
      this.player.setAngle(0);
      this.state = STATE.RUNNING;
      this.handlers.revive && this.handlers.revive();
    }

    /**
     * 回到待机主菜单
     * @returns {void}
     */
    toReady() {
      this.resetRun();
      this.setHudVisible(false);
      this.state = STATE.READY;
    }

    /**
     * 当前局内数据
     * @returns {Object} 统计
     */
    getStats() {
      return {
        score: this.score,
        distance: Math.floor(this.distance),
        coins: this.coins
      };
    }

    /**
     * 帧循环
     * @param {number} time 总时间
     * @param {number} delta 帧间隔
     * @returns {void}
     */
    update(time, delta) {
      const dt = Math.min(delta, 40) / 1000;
      if (this.state === STATE.READY) {
        // 主菜单：世界缓慢流动，不生成实体
        this.scrollZ += SPEED_START * 0.22 * dt;
        this.updateWorld();
        this.updatePlayerVisual(dt);
        return;
      }
      if (this.state !== STATE.RUNNING) {
        return;
      }
      this.speed = Math.min(SPEED_MAX, this.speed + SPEED_STEP * dt);
      // 星星冲刺：对齐源码 QuickMove，直接拉到最大速度
      const dy = (this.items.star ? SPEED_MAX : this.speed) * dt;
      this.distance += dy / 10;
      this.score = Math.floor(this.distance) + this.bonusScore;
      if (this.distance >= this.milestone) {
        this.milestone += SPEED_ADD_DISTANCE;
        this.speed = Math.min(SPEED_MAX, this.speed + SPEED_ADD_RATE);
        this.showToast('SPEED UP!');
        this.handlers.levelup && this.handlers.levelup();
      }
      this.scrollZ += dy;
      this.updateWorld();
      this.updatePlayerPhysics(dt);
      this.updateItems(time);
      this.spawn();
      this.updateEntities(dy);
      this.checkCollide(time, dy);
      this.refreshHud();
    }

    /**
     * 玩家物理与姿态
     * @param {number} dt 秒
     * @returns {void}
     */
    updatePlayerPhysics(dt) {
      if (this.jumpV !== 0 || this.jumpY > 0) {
        this.jumpY += this.jumpV * dt;
        // jumpV 为正表示上升，重力持续向下减速（源码 moveDirection.y -= gravity * deltaTime）
        this.jumpV -= GRAVITY * dt;
        if (this.jumpY <= 0) {
          this.jumpY = 0;
          this.jumpV = 0;
          this.doubleJump = false;
          this.spawnDust(this.player.x, PERSP.baseY - 4);
          if (this.pose === POSE.JUMP) {
            this.setPose(POSE.RUN);
          }
        }
      }
      if (this.poseTimer > 0) {
        this.poseTimer -= dt * 1000;
        if (this.poseTimer <= 0 && this.pose === POSE.SLIDE && this.jumpY <= 0) {
          this.setPose(POSE.RUN);
        }
      }
      this.updatePlayerVisual(dt);
    }

    /**
     * 玩家精灵位置与动画
     * @param {number} dt 秒
     * @returns {void}
     */
    updatePlayerVisual(dt) {
      const targetX = this.screenX(LANES[this.lane], 0);
      const diff = targetX - this.player.x;
      this.player.x += diff * Math.min(1, dt * 13);
      this.player.setAngle(Phaser.Math.Clamp(diff * 0.035, -14, 14));
      const bob = this.state === STATE.RUNNING && this.jumpY <= 0 && this.pose === POSE.RUN
        ? Math.abs(Math.sin(this.time.now / 90)) * 5 : 0;
      this.player.y = PERSP.baseY - this.jumpY - bob;
      // 星星冲刺：节流生成残影，强化速度感
      if (this.state === STATE.RUNNING && this.items.star &&
          this.time.now - this.lastTrailAt > 55) {
        this.lastTrailAt = this.time.now;
        this.spawnTrail();
      }
      this.playerShadow.setPosition(this.player.x, PERSP.baseY + 4)
        .setScale(Phaser.Math.Clamp(1 - this.jumpY / 500, 0.45, 1), 1)
        .setAlpha(Phaser.Math.Clamp(0.34 - this.jumpY / 1200, 0.08, 0.34));
      this.heroGlow.setPosition(this.player.x, this.player.y - 90)
        .setAlpha(this.items.star ? 0.5 : this.items.shoe ? 0.22 : 0);
      if (this.pose === POSE.RUN && this.state === STATE.RUNNING) {
        this.player.setTexture(Math.floor(this.time.now / 120) % 2 === 0 ? 'hero_run1' : 'hero_run2');
        this.player.playFrame = POSE.RUN;
      }
    }

    /**
     * 更新道具计时
     * @param {number} time 总时间
     * @returns {void}
     */
    updateItems(time) {
      Object.keys(ITEM_DUR).forEach((key) => {
        if (this.items[key] && time > this.items[key]) {
          delete this.items[key];
        }
      });
    }

    /**
     * 刷新 HUD 文本与道具按钮状态
     * @returns {void}
     */
    refreshHud() {
      this.hud.coinText.setText(String(this.coins));
      this.hud.distance.setText(Math.floor(this.distance) + ' m');
      this.hud.score.setText('SCORE ' + this.score);
      ITEM_KEYS.forEach((key) => {
        const box = this.itemBtns[key];
        const active = !!this.items[key];
        const left = active ? Math.ceil((this.items[key] - this.time.now) / 1000) : 0;
        box.badge.setText(this.inventory[key] > 0 ? '×' + this.inventory[key] : '');
        box.timer.setText(active ? left + 's' : '');
        box.btn.setAlpha(active ? 1 : this.inventory[key] > 0 ? 0.92 : 0.72);
        box.ring.clear();
        if (active) {
          box.ring.lineStyle(4, C.gold, 0.95);
          box.ring.strokeRoundedRect(box.x - 3, box.y - 3, 84, 82, 6);
        }
      });
    }
  }

  return ParkourScene;
}
