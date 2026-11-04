/**
 * @file 跑酷 Phaser 场景工厂。
 * 导出 createParkourScene(Phaser, callbacks)，返回 Scene 类。
 * 全部美术为程序化绘制（Graphics.generateTexture），配色统一取自 parkour-theme，
 * 与原作「圆润森林风」保持一致：三层视差森林 + 木质感车道 + 金色 UI。
 */
import { DESIGN_W, DESIGN_H, LANES, GROUND_Y, SPEED_START, SPEED_MAX, SPEED_STEP, PALETTE as C, ITEM_DUR, POSE } from './parkour-theme.js';

const STATE = { READY: 0, RUNNING: 1, PAUSED: 2, OVER: 3 };

/**
 * 创建跑酷场景类
 * @param {Object} Phaser Phaser 全局对象
 * @param {Object} callbacks 回调集合 { onReady, onGameOver, onHud }
 * @returns {Object} Scene 类
 */
export default function createParkourScene(Phaser, callbacks) {
  class ParkourScene extends Phaser.Scene {
    constructor() {
      super('parkour');
      this.state = STATE.READY;
      this.speed = SPEED_START;
      this.distance = 0;
      this.score = 0;
      this.coins = 0;
      this.lives = 1;
      this.lane = 1;
      this.pose = POSE.RUN;
      this.poseTimer = 0;
      this.items = {};
      this.obstacles = [];
      this.picks = [];
      this.player = null;
      this.hud = {};
      this.shakeUntil = 0;
    }

    /**
     * 初始化：生成纹理、搭建背景、注册输入
     * @returns {void}
     */
    create() {
      this.makeTextures();
      this.buildBackground();
      this.buildGround();
      this.buildPlayer();
      this.buildHud();
      this.bindInput();
      this.resetRun();
      if (callbacks && callbacks.onReady) {
        callbacks.onReady(this);
      }
    }

    /**
     * 程序化生成全部纹理
     * @returns {void}
     */
    makeTextures() {
      const g = this.add.graphics();
      // 地面块（带车道纹理）
      g.fillStyle(C.ground, 1);
      g.fillRect(0, 0, 120, 60);
      g.fillStyle(C.groundDark, 1);
      g.fillRect(0, 52, 120, 8);
      g.fillStyle(C.laneLine, 1);
      g.fillRect(0, 6, 120, 4);
      g.generateTexture('ground_tile', 120, 60);
      g.clear();

      // 玩家三姿态（Q 版小熊，圆润卡通）
      this.makePlayerFrames(g);
      // 障碍物
      this.makeObstacleFrames(g);
      // 金币与道具
      this.makePickupFrames(g);
      g.destroy();
    }

    /**
     * 生成玩家三姿态帧
     * @param {Object} g Graphics 画笔
     * @returns {void}
     */
    makePlayerFrames(g) {
      const fur = C.bearFur;
      const belly = C.bearBelly;
      const dark = C.bearDark;
      // run：直立奔跑，双腿分开
      g.fillStyle(fur, 1);
      g.fillCircle(60, 44, 30);
      g.fillCircle(60, 88, 38);
      g.fillStyle(belly, 1);
      g.fillEllipse(60, 96, 40, 34);
      g.fillStyle(dark, 1);
      g.fillCircle(46, 40, 7);
      g.fillCircle(74, 40, 7);
      g.fillCircle(60, 54, 6);
      g.fillStyle(fur, 1);
      g.fillCircle(34, 34, 12);
      g.fillCircle(86, 34, 12);
      g.fillStyle(fur, 1);
      g.fillRoundedRect(38, 112, 16, 24, 8);
      g.fillRoundedRect(66, 112, 16, 24, 8);
      g.generateTexture('bear_run', 120, 140);
      g.clear();

      // jump：蜷腿抱膝
      g.fillStyle(fur, 1);
      g.fillCircle(60, 44, 30);
      g.fillCircle(60, 84, 38);
      g.fillStyle(belly, 1);
      g.fillEllipse(60, 92, 40, 34);
      g.fillStyle(dark, 1);
      g.fillCircle(46, 40, 7);
      g.fillCircle(74, 40, 7);
      g.fillStyle(fur, 1);
      g.fillCircle(32, 44, 12);
      g.fillCircle(88, 44, 12);
      g.fillCircle(44, 118, 14);
      g.fillCircle(76, 118, 14);
      g.generateTexture('bear_jump', 120, 140);
      g.clear();

      // slide：贴地滑行
      g.fillStyle(fur, 1);
      g.fillEllipse(60, 104, 96, 52);
      g.fillCircle(28, 78, 26);
      g.fillStyle(belly, 1);
      g.fillEllipse(66, 108, 52, 30);
      g.fillStyle(dark, 1);
      g.fillCircle(20, 74, 6);
      g.fillCircle(34, 70, 6);
      g.generateTexture('bear_slide', 120, 140);
      g.clear();
    }

    /**
     * 生成障碍物帧：木箱 / 栅栏 / 低梁 / 断崖
     * @param {Object} g Graphics 画笔
     * @returns {void}
     */
    makeObstacleFrames(g) {
      // 木箱（跳过）
      g.fillStyle(C.boxWood, 1);
      g.fillRoundedRect(4, 4, 92, 92, 10);
      g.lineStyle(6, C.boxLine, 1);
      g.strokeRoundedRect(4, 4, 92, 92, 10);
      g.lineBetween(4, 4, 96, 96);
      g.lineBetween(96, 4, 4, 96);
      g.generateTexture('obs_box', 100, 100);
      g.clear();

      // 栅栏（跳过，矮宽）
      g.fillStyle(C.fence, 1);
      g.fillRect(0, 30, 110, 10);
      g.fillRect(0, 60, 110, 10);
      g.fillRect(8, 0, 14, 90);
      g.fillRect(48, 0, 14, 90);
      g.fillRect(88, 0, 14, 90);
      g.generateTexture('obs_fence', 110, 90);
      g.clear();

      // 低梁（滑铲过）
      g.fillStyle(C.treeDark, 1);
      g.fillRoundedRect(0, 0, 110, 64, 8);
      g.fillStyle(C.treeLight, 1);
      g.fillRoundedRect(6, 6, 98, 24, 6);
      g.generateTexture('obs_beam', 110, 64);
      g.clear();

      // 断崖（必须跳）
      g.fillStyle(C.groundDark, 1);
      g.fillRect(0, 40, 120, 20);
      g.fillStyle(0x000000, 0.55);
      g.fillRect(6, 0, 108, 40);
      g.generateTexture('obs_gap', 120, 60);
      g.clear();
    }

    /**
     * 生成金币与道具帧
     * @param {Object} g Graphics 画笔
     * @returns {void}
     */
    makePickupFrames(g) {
      // 金币
      g.fillStyle(C.goldEdge, 1);
      g.fillCircle(24, 24, 22);
      g.fillStyle(C.gold, 1);
      g.fillCircle(24, 24, 16);
      g.generateTexture('pick_coin', 48, 48);
      g.clear();

      // 磁铁
      g.fillStyle(C.magnet, 1);
      g.fillRoundedRect(6, 6, 52, 52, 14);
      g.lineStyle(4, 0xffffff, 0.9);
      g.strokeRoundedRect(10, 10, 44, 44, 10);
      g.generateTexture('pick_magnet', 64, 64);
      g.clear();

      // 护盾
      g.fillStyle(C.shield, 1);
      g.fillRoundedRect(6, 6, 52, 52, 14);
      g.lineStyle(4, 0xffffff, 0.9);
      g.strokeRoundedRect(10, 10, 44, 44, 10);
      g.generateTexture('pick_shield', 64, 64);
      g.clear();

      // 双倍
      g.fillStyle(C.double, 1);
      g.fillRoundedRect(6, 6, 52, 52, 14);
      g.lineStyle(4, 0xffffff, 0.9);
      g.strokeRoundedRect(10, 10, 44, 44, 10);
      g.generateTexture('pick_double', 64, 64);
      g.clear();

      // 火箭
      g.fillStyle(C.rocket, 1);
      g.fillRoundedRect(6, 6, 52, 52, 14);
      g.lineStyle(4, 0xffffff, 0.9);
      g.strokeRoundedRect(10, 10, 44, 44, 10);
      g.generateTexture('pick_rocket', 64, 64);
      g.clear();
    }

    /**
     * 搭建三层视差背景
     * @returns {void}
     */
    buildBackground() {
      this.add.rectangle(0, 0, DESIGN_W, DESIGN_H, C.skyTop).setOrigin(0);
      this.add.rectangle(0, DESIGN_H * 0.35, DESIGN_W, DESIGN_H * 0.65, C.skyBottom).setOrigin(0);
      // 远山
      const g = this.add.graphics();
      g.fillStyle(C.hillFar, 1);
      for (let i = 0; i < 4; i++) {
        g.fillCircle(90 + i * 210, 700, 130);
      }
      g.generateTexture('hill_far', DESIGN_W, 840);
      g.clear();
      g.fillStyle(C.hillNear, 1);
      for (let i = 0; i < 5; i++) {
        g.fillCircle(60 + i * 170, 760, 110);
      }
      g.generateTexture('hill_near', DESIGN_W, 880);
      g.destroy();
      this.hillFar = this.add.image(0, 0, 'hill_far').setOrigin(0);
      this.hillNear = this.add.image(0, 0, 'hill_near').setOrigin(0);
      this.makeTreeTexture();
      // 树列（近景装饰，左右两列）
      this.trees = [];
      for (let i = 0; i < 8; i++) {
        const side = i % 2 === 0 ? 40 : DESIGN_W - 40;
        const tree = this.add.image(side, i * 240 - 100, 'tree_' + (i % 2 === 0 ? 'l' : 'r'));
        tree.setDepth(6);
        this.trees.push(tree);
      }
    }

    /**
     * 生成树纹理（左右镜像共用）
     * @returns {void}
     */
    makeTreeTexture() {
      const g = this.add.graphics();
      g.fillStyle(C.trunk, 1);
      g.fillRect(28, 150, 24, 70);
      g.fillStyle(C.treeDark, 1);
      g.fillCircle(40, 100, 62);
      g.fillStyle(C.treeLight, 1);
      g.fillCircle(40, 84, 48);
      g.generateTexture('tree_l', 80, 230);
      g.clear();
      g.fillStyle(C.trunk, 1);
      g.fillRect(28, 150, 24, 70);
      g.fillStyle(C.treeLight, 1);
      g.fillCircle(40, 100, 62);
      g.fillStyle(C.treeDark, 1);
      g.fillCircle(40, 84, 48);
      g.generateTexture('tree_r', 80, 230);
      g.destroy();
    }

    /**
     * 搭建滚动地面
     * @returns {void}
     */
    buildGround() {
      this.groundTop = this.add.tileSprite(0, GROUND_Y, DESIGN_W, 120, 'ground_tile').setOrigin(0).setDepth(5);
      this.groundBottom = this.add.rectangle(0, GROUND_Y + 120, DESIGN_W, DESIGN_H - GROUND_Y - 120, C.groundDark).setOrigin(0).setDepth(5);
    }

    /**
     * 建立玩家精灵
     * @returns {void}
     */
    buildPlayer() {
      this.player = this.add.sprite(LANES[this.lane], GROUND_Y - 70, 'bear_run').setDepth(10);
      this.player.playFrame = POSE.RUN;
      this.player.vy = 0;
      this.player.groundY = GROUND_Y - 70;
    }

    /**
     * 搭建 HUD（分数/金币/距离/暂停）
     * @returns {void}
     */
    buildHud() {
      const pad = 24;
      this.hud.score = this.add.text(DESIGN_W - pad, pad, '0', {
        fontFamily: 'sans-serif', fontSize: '44px', color: '#5b3a1e', fontStyle: 'bold'
      }).setOrigin(1, 0).setDepth(20);
      this.hud.coinIcon = this.add.image(pad + 24, pad + 60, 'pick_coin').setDepth(20);
      this.hud.coins = this.add.text(pad + 58, pad + 38, '0', {
        fontFamily: 'sans-serif', fontSize: '34px', color: '#5b3a1e', fontStyle: 'bold'
      }).setOrigin(0, 0).setDepth(20);
      this.hud.distance = this.add.text(pad, DESIGN_H - 60, '0 m', {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#7a5230'
      }).setOrigin(0, 1).setDepth(20);
      this.hud.pauseBtn = this.add.text(DESIGN_W - pad - 90, pad + 44, 'II', {
        fontFamily: 'sans-serif', fontSize: '44px', color: '#5b3a1e', backgroundColor: '#fdf3dd',
        padding: { x: 16, y: 4 }
      }).setOrigin(0, 0).setDepth(20).setInteractive({ useHandCursor: true });
      this.hud.pauseBtn.on('pointerdown', () => {
        if (this.state === STATE.RUNNING) {
          this.pauseRun();
          if (callbacks && callbacks.onPause) {
            callbacks.onPause();
          }
        }
      });
      // 顶部渐变遮罩底
      this.add.rectangle(0, 0, DESIGN_W, 120, 0xffffff, 0.28).setOrigin(0).setDepth(19);
    }

    /**
     * 注册键盘与指针输入
     * @returns {void}
     */
    bindInput() {
      const kb = this.input.keyboard;
      if (kb) {
        kb.on('keydown-LEFT', () => this.moveLane(-1));
        kb.on('keydown-RIGHT', () => this.moveLane(1));
        kb.on('keydown-UP', () => this.doJump());
        kb.on('keydown-DOWN', () => this.doSlide());
      }
      this.input.on('pointerdown', (p) => {
        if (this.state !== STATE.RUNNING) {
          return;
        }
        if (p.x < DESIGN_W * 0.3) {
          this.moveLane(-1);
        } else if (p.x > DESIGN_W * 0.7) {
          this.moveLane(1);
        } else if (p.y < DESIGN_H * 0.42) {
          this.doJump();
        } else {
          this.doSlide();
        }
      });
    }

    /**
     * 重置一局
     * @returns {void}
     */
    resetRun() {
      this.speed = SPEED_START;
      this.distance = 0;
      this.score = 0;
      this.bonusScore = 0;
      this.invincibleUntil = 0;
      this.coins = 0;
      this.lives = 1;
      this.lane = 1;
      this.items = {};
      this.obstacles.forEach((o) => o.destroy());
      this.picks.forEach((p) => p.destroy());
      this.obstacles = [];
      this.picks = [];
      this.scrollTotal = 0;
      this.nextSpawnAt = 1200;
      this.player.setPosition(LANES[1], GROUND_Y - 70);
      this.player.setTexture('bear_run');
      this.player.vy = 0;
      this.player.angle = 0;
      this.setPose(POSE.RUN);
      this.refreshHud();
    }

    /**
     * 开始一局
     * @returns {void}
     */
    startRun() {
      this.resetRun();
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
        this.events.emit && null;
        this.audioLane && this.audioLane();
      }
    }

    /**
     * 跳跃
     * @returns {void}
     */
    doJump() {
      if (this.state !== STATE.RUNNING || this.items.rocket) {
        return;
      }
      if (this.player.y >= this.player.groundY - 2) {
        this.player.vy = -760;
        this.setPose(POSE.JUMP);
        this.jumpAction && this.jumpAction();
      }
    }

    /**
     * 滑铲
     * @returns {void}
     */
    doSlide() {
      if (this.state !== STATE.RUNNING || this.items.rocket) {
        return;
      }
      this.setPose(POSE.SLIDE);
      this.poseTimer = 520;
      this.slideAction && this.slideAction();
    }

    /**
     * 切换姿态
     * @param {string} pose 姿态
     * @returns {void}
     */
    setPose(pose) {
      this.pose = pose;
      const frames = { run: 'bear_run', jump: 'bear_jump', slide: 'bear_slide' };
      if (this.player.playFrame !== pose) {
        this.player.playFrame = pose;
        this.player.setTexture(frames[pose]);
      }
    }

    /**
     * 帧循环：滚动世界、生成实体、碰撞与 HUD
     * @param {number} time 总时间
     * @param {number} delta 帧间隔
     * @returns {void}
     */
    update(time, delta) {
      if (this.state !== STATE.RUNNING) {
        return;
      }
      const dt = delta / 1000;
      this.speed = Math.min(SPEED_MAX, this.speed + SPEED_STEP * dt);
      const dy = this.speed * dt;
      this.distance += dy / 10;
      this.score = Math.floor(this.distance) + this.bonusScore;

      this.scrollWorld(dy);
      this.updatePlayer(dt);
      this.updateItems(time);
      this.spawn(dy);
      this.updateEntities(dy);
      this.checkCollide(time);
      this.refreshHud();
    }

    /**
     * 滚动视差世界
     * @param {number} dy 本帧滚动量
     * @returns {void}
     */
    scrollWorld(dy) {
      this.groundTop.tilePositionY -= dy;
      this.hillFar.y += dy * 0.08;
      this.hillNear.y += dy * 0.16;
      if (this.hillFar.y > 40) {
        this.hillFar.y = 0;
      }
      if (this.hillNear.y > 60) {
        this.hillNear.y = 0;
      }
      this.trees.forEach((tree) => {
        tree.y += dy * 0.55;
        if (tree.y > DESIGN_H + 130) {
          tree.y = -130;
        }
      });
    }

    /**
     * 更新玩家位置与姿态
     * @param {number} dt 秒
     * @returns {void}
     */
    updatePlayer(dt) {
      const targetX = LANES[this.lane];
      this.player.x += (targetX - this.player.x) * Math.min(1, dt * 14);
      if (this.items.rocket) {
        this.player.y += (300 - this.player.y) * Math.min(1, dt * 6);
        this.player.angle = Math.sin(this.time.now / 180) * 6;
        this.player.y = 300 + Math.sin(this.time.now / 260) * 26;
        return;
      }
      this.player.angle = 0;
      if (this.player.vy !== 0 || this.player.y < this.player.groundY) {
        this.player.vy += 2100 * dt;
        this.player.y += this.player.vy * dt;
        if (this.player.y >= this.player.groundY) {
          this.player.y = this.player.groundY;
          this.player.vy = 0;
          if (this.pose === POSE.JUMP) {
            this.setPose(POSE.RUN);
          }
        }
      } else if (this.pose === POSE.RUN && Math.floor(this.time.now / 160) % 2 === 0) {
        this.player.setScale(1.04, 0.96);
      } else {
        this.player.setScale(1, 1);
      }
      if (this.poseTimer > 0) {
        this.poseTimer -= dt * 1000;
        if (this.poseTimer <= 0 && this.pose === POSE.SLIDE) {
          this.setPose(POSE.RUN);
        }
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
     * 按节奏生成实体
     * @param {number} dt 秒
     * @returns {void}
     */
    spawn(dy) {
      this.scrollTotal += dy;
      while (this.scrollTotal >= this.nextSpawnAt) {
        this.spawnPattern(-160);
        this.nextSpawnAt += 300 + Math.random() * 260;
      }
    }

    /**
     * 生成一组障碍/奖励
     * @param {number} y 生成 y
     * @returns {void}
     */
    spawnPattern(y) {
      const roll = Math.random();
      if (roll < 0.4) {
        // 障碍行：1~2 车道
        const lanes = Phaser.Utils.Array.Shuffle([0, 1, 2]).slice(0, Math.random() < 0.7 ? 1 : 2);
        lanes.forEach((ln) => {
          const kinds = ['obs_box', 'obs_fence', 'obs_beam', 'obs_gap'];
          const kind = Phaser.Utils.Array.GetRandom(kinds);
          this.addObstacle(kind, ln, y);
        });
      } else if (roll < 0.75) {
        // 金币串
        const ln = Phaser.Math.Between(0, 2);
        const n = Phaser.Math.Between(4, 7);
        for (let i = 0; i < n; i++) {
          this.addPickup('pick_coin', ln, y + i * 70, 'coin');
        }
        if (Math.random() < 0.3) {
          const keys = ['pick_magnet', 'pick_shield', 'pick_double', 'pick_rocket'];
          this.addPickup(Phaser.Utils.Array.GetRandom(keys), (ln + 1) % 3, y + 40, 'item');
        }
      } else {
        // 道具 + 少量金币
        const keys = ['pick_magnet', 'pick_shield', 'pick_double', 'pick_rocket'];
        this.addPickup(Phaser.Utils.Array.GetRandom(keys), Phaser.Math.Between(0, 2), y, 'item');
      }
    }

    /**
     * 添加障碍
     * @param {string} tex 纹理键
     * @param {number} ln 车道
     * @param {number} y y 坐标
     * @returns {void}
     */
    addObstacle(tex, ln, y) {
      const img = this.add.image(LANES[ln], y, tex).setDepth(8);
      img.kind = 'obstacle';
      img.obsType = tex;
      img.lane = ln;
      this.obstacles.push(img);
    }

    /**
     * 添加可拾取物
     * @param {string} tex 纹理键
     * @param {number} ln 车道
     * @param {number} y y 坐标
     * @param {string} kind coin / item
     * @returns {void}
     */
    addPickup(tex, ln, y, kind) {
      const img = this.add.image(LANES[ln], y, tex).setDepth(7);
      img.kind = kind;
      img.pickType = tex.replace('pick_', '');
      img.lane = ln;
      this.picks.push(img);
    }

    /**
     * 推动实体滚动并回收出屏对象
     * @param {number} dy 滚动量
     * @returns {void}
     */
    updateEntities(dy) {
      const recycle = (list) => {
        for (let i = list.length - 1; i >= 0; i--) {
          const img = list[i];
          img.y += dy;
          if (img.y > DESIGN_H + 200) {
            img.destroy();
            list.splice(i, 1);
          }
        }
      };
      recycle(this.obstacles);
      recycle(this.picks);
    }

    /**
     * 碰撞检测（AABB）
     * @param {number} time 总时间
     * @returns {void}
     */
    checkCollide(time) {
      const px = this.player.x;
      const py = this.player.y;
      const pw = this.pose === POSE.SLIDE ? 96 : 60;
      const ph = this.pose === POSE.SLIDE ? 56 : 120;
      // 磁铁吸金币
      if (this.items.magnet) {
        this.picks.forEach((p) => {
          if (p.kind === 'coin') {
            const d = Phaser.Math.Distance.Between(px, py, p.x, p.y);
            if (d < 300) {
              p.x += (px - p.x) * 0.12;
              p.y += (py - p.y) * 0.12;
            }
          }
        });
      }
      for (let i = this.picks.length - 1; i >= 0; i--) {
        const p = this.picks[i];
        if (Math.abs(p.x - px) < 52 && Math.abs(p.y - py) < 70) {
          this.collect(p);
          p.destroy();
          this.picks.splice(i, 1);
        }
      }
      if (this.items.rocket || time < this.invincibleUntil) {
        return;
      }
      for (const o of this.obstacles) {
        if (o.lane !== this.lane && Math.abs(o.x - px) > 60) {
          continue;
        }
        const ow = o.width * 0.8;
        const oh = o.height * 0.8;
        if (Math.abs(o.x - px) < ow / 2 + pw / 2 && Math.abs(o.y - py) < oh / 2 + ph / 2) {
          this.hitObstacle(o, time);
          break;
        }
      }
    }

    /**
     * 拾取物入账
     * @param {Object} p 拾取物
     * @returns {void}
     */
    collect(p) {
      if (p.kind === 'coin') {
        this.coins += this.items.double ? 2 : 1;
        this.bonusScore += this.items.double ? 20 : 10;
        this.coinAction && this.coinAction();
      } else if (p.pickType === 'magnet') {
        this.items.magnet = this.time.now + ITEM_DUR.magnet;
        this.rewardAction && this.rewardAction('magnet');
      } else if (p.pickType === 'shield') {
        this.items.shield = true;
        this.rewardAction && this.rewardAction('shield');
      } else if (p.pickType === 'double') {
        this.items.double = this.time.now + ITEM_DUR.double;
        this.rewardAction && this.rewardAction('double');
      } else if (p.pickType === 'rocket') {
        this.items.rocket = this.time.now + ITEM_DUR.rocket;
        this.fastAction && this.fastAction();
      }
    }

    /**
     * 撞上障碍：护盾抵消或结算
     * @param {Object} o 障碍
     * @param {number} time 总时间
     * @returns {void}
     */
    hitObstacle(o, time) {
      if (this.items.shield) {
        delete this.items.shield;
        this.invincibleUntil = time + 1200;
        o.destroy();
        this.obstacles = this.obstacles.filter((x) => x !== o);
        this.crashAction && this.crashAction(true);
        return;
      }
      this.lives -= 1;
      if (this.lives <= 0) {
        this.crashAction && this.crashAction(false);
        this.gameOver();
      }
    }

    /**
     * 结束一局并回调
     * @returns {void}
     */
    gameOver() {
      this.state = STATE.OVER;
      this.deathAction && this.deathAction();
      if (callbacks && callbacks.onGameOver) {
        callbacks.onGameOver({
          score: this.score,
          distance: Math.floor(this.distance),
          coins: this.coins
        });
      }
    }

    /**
     * 复活：清屏障碍 + 2 秒无敌
     * @returns {void}
     */
    revive() {
      this.obstacles.forEach((o) => o.destroy());
      this.obstacles = [];
      this.lives = 1;
      this.invincibleUntil = this.time.now + 2000;
      this.state = STATE.RUNNING;
      this.reviveAction && this.reviveAction();
    }

    /**
     * 刷新 HUD 文本
     * @returns {void}
     */
    refreshHud() {
      this.hud.score.setText(String(this.score));
      this.hud.coins.setText(String(this.coins));
      this.hud.distance.setText(Math.floor(this.distance) + ' m');
    }

    /**
     * 挂接音频回调（由页面层注入）
     * @param {Object} actions 动作回调集合
     * @returns {void}
     */
    setActions(actions) {
      this.jumpAction = actions.jump;
      this.slideAction = actions.slide;
      this.audioLane = actions.lane;
      this.coinAction = actions.coin;
      this.crashAction = actions.crash;
      this.deathAction = actions.death;
      this.reviveAction = actions.revive;
      this.rewardAction = actions.reward;
      this.fastAction = actions.fast;
    }
  }

  return ParkourScene;
}
