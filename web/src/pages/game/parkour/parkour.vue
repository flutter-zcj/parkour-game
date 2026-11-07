<style lang="scss" scoped>
/* UI 严格参考 3DMoonRunner 源码 Assets/GUI：破旧木板 + 撕裂灰白边框 + 金色文字 */
.parkour-page{position:relative;width:100%;height:100vh;background:#0a1028;overflow:hidden;box-sizing:border-box}
.parkour-page.rotate{position:fixed;top:0;left:100vw;width:100vh;height:100vw;transform:rotate(90deg);transform-origin:0 0;z-index:99}
.parkour-canvas{position:absolute;inset:0}
.parkour-tips{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:26px;color:#ffe6a8;background:rgba(20,16,10,.9);border:3px solid #d8c9a8;padding:14px 30px;border-radius:6px;z-index:60}
.parkour-mask{position:absolute;inset:0;background:rgba(6,8,20,.74);display:flex;align-items:center;justify-content:center;z-index:50}
.parkour-ready{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:52}
.parkour-readybg{position:absolute;inset:0;background-size:cover;background-position:center;filter:brightness(.62)}
.parkour-readycover{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,10,26,.45),rgba(8,10,26,.8))}
.parkour-panel{position:relative;width:560px;max-height:96vh;overflow-y:auto;box-sizing:border-box;background:#5c3414;border:7px solid #cfc2a6;border-radius:8px;padding:10px 20px 12px;box-shadow:0 0 0 4px #3d210b,0 14px 50px rgba(0,0,0,.7);animation:slideIn .45s ease-out}
.parkour-panel::after{position:absolute;content:'';inset:6px;border:2px solid rgba(60,32,10,.55);pointer-events:none}
.parkour-panel.menu{position:relative;width:480px}
.parkour-title{position:relative;text-align:center;font-size:28px;font-weight:800;color:#ffdf8c;letter-spacing:4px;text-shadow:0 2px 0 #3d210b,0 0 14px rgba(255,200,90,.5);margin:0 0 6px}
.parkour-subtitle{position:relative;text-align:center;font-size:15px;color:#f3e2c0;margin:-4px 0 8px;letter-spacing:2px}
.parkour-row{position:relative;display:flex;justify-content:space-between;font-size:16px;color:#f3e2c0;padding:2px 6px;border-bottom:1px dashed rgba(255,225,170,.28)}
.parkour-row b{position:relative;color:#ffd34d;font-size:18px}
.parkour-stats{position:relative;display:grid;grid-template-columns:1fr 1fr;column-gap:14px}
.parkour-btnrow{position:relative;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px}
.parkour-btn{position:relative;width:170px;height:96px;background-size:100% 100%;background-repeat:no-repeat;border:0;border-radius:0;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#ffe6a8;letter-spacing:2px;text-shadow:0 2px 4px #2a1608;transition:transform .12s ease}
.parkour-btn:active{position:relative;transform:scale(.94)}
.parkour-btn.small{position:relative;width:132px;height:74px;font-size:16px}
.parkour-btn.menu-play{position:relative;width:190px;height:107px}
.parkour-btn.dim{position:relative;opacity:.45;pointer-events:none}
.parkour-best{position:relative;text-align:center;font-size:16px;color:#ffe6a8;margin:4px 0}
.parkour-boxlist{position:relative;display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.parkour-prize{position:relative;background:rgba(255,243,221,.92);border:2px solid #c98d4b;border-radius:6px;padding:5px 10px;font-size:15px;color:#5b3a1e}
.parkour-prize.legendary{position:relative;border-color:#e05252;color:#b02a2a}
.parkour-prize.epic{position:relative;border-color:#b26ee0;color:#7b3fa8}
.parkour-rank{position:relative;margin:6px 0;max-height:150px;overflow-y:auto}
.parkour-rankrow{position:relative;display:flex;justify-content:space-between;font-size:16px;color:#f3e2c0;padding:4px 4px;border-bottom:1px dashed rgba(255,225,170,.28)}
@keyframes slideIn{from{transform:translateX(-110%);opacity:0}to{transform:translateX(0);opacity:1}}
</style>
<template>
  <view class="parkour-page" :class="{ rotate: isPortrait }">
    <view id="parkour-canvas" class="parkour-canvas"></view>
    <view v-if="tips" class="parkour-tips">{{ tips }}</view>

    <!-- 主菜单：官方宣传图 + 原版 PLAY 木板按钮（对齐源码 PlayUI） -->
    <view v-if="overlay === 'ready'" class="parkour-ready">
      <view class="parkour-readybg" :style="{ backgroundImage: 'url(' + assetBase + 'bg/logo.jpg)' }"></view>
      <view class="parkour-readycover"></view>
      <view class="parkour-panel menu">
        <view class="parkour-title">月光跑酷</view>
        <view class="parkour-subtitle">3D MOON RUNNER</view>
        <view class="parkour-best">历史最高 {{ player.best_score || 0 }} 分 · 金币 {{ player.coins || 0 }}</view>
        <view class="parkour-btnrow">
          <view class="parkour-btn menu-play" :style="btnStyle('b-play')" @click="startGame"></view>
        </view>
        <view class="parkour-btnrow">
          <view class="parkour-btn small" :style="btnStyle('b-blank')" @click="openRank">排行榜</view>
          <view class="parkour-btn small" :style="btnStyle('b-blank')" @click="openBoxPanel">盲盒抽奖</view>
        </view>
      </view>
    </view>

    <!-- 暂停面板（对齐源码 ResumeUI） -->
    <view v-if="overlay === 'pause'" class="parkour-mask">
      <view class="parkour-panel">
        <view class="parkour-title">暂停</view>
        <view class="parkour-row"><span>当前得分</span><b>{{ run.score }}</b></view>
        <view class="parkour-row"><span>当前金币</span><b>{{ run.coins }}</b></view>
        <view class="parkour-row"><span>奔跑距离</span><b>{{ run.distance }} m</b></view>
        <view class="parkour-btnrow">
          <view class="parkour-btn" :style="btnStyle('b-resume')" @click="resumeGame"></view>
          <view class="parkour-btn" :style="btnStyle('b-restart')" @click="startGame"></view>
        </view>
        <view class="parkour-btnrow">
          <view class="parkour-btn small" :style="btnStyle('b-exit')" @click="toReady"></view>
        </view>
      </view>
    </view>

    <!-- 结算面板（对齐源码 RestartUI） -->
    <view v-if="overlay === 'over'" class="parkour-mask">
      <view class="parkour-panel">
        <view class="parkour-title">{{ over.rank === 1 ? '新纪录！' : '本局结束' }}</view>
        <view class="parkour-stats">
          <view class="parkour-row"><span>得分</span><b>{{ over.score }}</b></view>
          <view class="parkour-row"><span>距离</span><b>{{ over.distance }} m</b></view>
          <view class="parkour-row"><span>金币</span><b>+{{ over.coins }}</b></view>
          <view class="parkour-row"><span>历史最高</span><b>{{ over.best }}</b></view>
          <view class="parkour-row"><span>金币余额</span><b>{{ player.coins }}</b></view>
          <view v-if="over.task_rewards && over.task_rewards.length" class="parkour-row"><span>任务奖励</span><b>{{ over.task_rewards.join('、') }}</b></view>
        </view>
        <view class="parkour-btnrow">
          <view class="parkour-btn" :class="{ dim: reviving || player.coins < 300 }" :style="btnStyle('b-blank')" @click="doRevive">复活 300 金币</view>
          <view class="parkour-btn" :style="btnStyle('b-restart')" @click="startGame"></view>
        </view>
        <view class="parkour-btnrow">
          <view class="parkour-btn small" :style="btnStyle('b-blank')" @click="openRank">排行榜</view>
          <view class="parkour-btn small" :style="btnStyle('b-blank')" @click="openBoxPanel">盲盒抽奖</view>
          <view class="parkour-btn small" :style="btnStyle('b-exit')" @click="toReady"></view>
        </view>
      </view>
    </view>

    <!-- 盲盒面板 -->
    <view v-if="overlay === 'box'" class="parkour-mask">
      <view class="parkour-panel">
        <view class="parkour-title">盲盒抽奖</view>
        <view class="parkour-row"><span>钻石余额</span><b>{{ player.diamonds }}</b></view>
        <view class="parkour-boxlist">
          <view v-for="prize in boxResults" :key="prize.id" class="parkour-prize" :class="prize.rarity">{{ prize.name }}</view>
        </view>
        <view class="parkour-btnrow">
          <view class="parkour-btn small" :class="{ dim: drawing || player.diamonds < 20 }" :style="btnStyle('b-blank')" @click="drawBox(1)">单抽 20 钻</view>
          <view class="parkour-btn small" :class="{ dim: drawing || player.diamonds < 200 }" :style="btnStyle('b-blank')" @click="drawBox(10)">十连 200 钻</view>
        </view>
        <view class="parkour-btnrow">
          <view class="parkour-btn small" :style="btnStyle('b-blank')" @click="closeBox">返回</view>
        </view>
      </view>
    </view>

    <!-- 排行榜面板 -->
    <view v-if="overlay === 'rank'" class="parkour-mask">
      <view class="parkour-panel">
        <view class="parkour-title">排行榜</view>
        <view class="parkour-row"><span>我的名次</span><b>{{ rank.my_rank || '未上榜' }}（{{ rank.my_score || 0 }} 分）</b></view>
        <view class="parkour-rank">
          <view v-for="(item, idx) in rank.top" :key="item.uid" class="parkour-rankrow">
            <span>{{ idx + 1 }}. {{ item.nickname }}</span><b>{{ item.score }}</b>
          </view>
        </view>
        <view class="parkour-btnrow">
          <view class="parkour-btn small" :style="btnStyle('b-blank')" @click="closeRank">返回</view>
        </view>
      </view>
    </view>
  </view>
</template>
<script>
/**
 * 组件名称：parkour
 * 功能说明：月光跑酷游戏页（UI 严格参考 3DMoonRunner 源码 Assets/GUI），
 *           Phaser 场景生命周期、WebSocket 长连接、主菜单/暂停/结算/盲盒/排行榜弹窗、横屏强制显示
 * 研发时间：2026/11/04
 * 研发人员：郑朝军
 *
 * 变量说明：
 * @data {String}  tips        - 连接提示文案
 * @data {String}  overlay     - 当前弹窗：ready/pause/over/box/rank/空
 * @data {Object}  run         - 局内暂停数据
 * @data {Object}  over        - 结算面板数据
 * @data {Object}  player      - 玩家档案（金币/钻石/最高分）
 * @data {Array}   boxResults  - 盲盒抽取结果
 * @data {Object}  rank        - 排行榜数据
 * @data {Boolean} reviving    - 是否正在复活
 * @data {Boolean} drawing     - 是否正在抽卡
 * @data {String}  returnOverlay - 关闭盲盒/排行榜后返回的界面（ready/over）
 * @data {Boolean} isPortrait  - 设备是否处于竖屏（竖屏时页面旋转 90° 强制横屏显示）
 * @data {Number}  fitTimer    - 等待 Phaser canvas 就绪的轮询定时器 ID
 * @data {Object}  net         - 网络客户端
 * @data {Object}  audio       - 音频管理器
 * @data {Object}  game        - Phaser.Game 实例
 * @data {Object}  scene       - 当前场景实例
 *
 * 事件说明：
 * @event boot            - 初始化 Phaser 与网络
 * @event disablePcAdapt  - 解除 PC 适配模拟器，保证游戏全屏直跑
 * @event updateOrientation - 检测横竖屏并切换旋转兜底
 * @event lockLandscape   - 尝试全屏 + 原生横屏锁定
 * @event fitCanvas       - 按容器布局尺寸缩放居中画布
 * @event assetBase       - 计算源码 UI 素材基址
 * @event btnStyle        - 生成原版木板按钮背景样式
 * @event connect         - 建立 WebSocket 并注册指令处理
 * @event resolveUrl      - 计算 WebSocket 地址
 * @event bindSceneActions- 注入音频回调
 * @event startGame       - 开始新的一局
 * @event resumeGame      - 恢复暂停的局
 * @event toReady         - 返回主菜单
 * @event pauseGame       - 暂停弹窗
 * @event handleGameOver  - 结算上报并弹面板
 * @event doRevive        - 看广告复活
 * @event openBoxPanel    - 打开盲盒面板
 * @event drawBox         - 抽盲盒
 * @event closeBox        - 关闭盲盒面板
 * @event openRank        - 打开排行榜
 * @event closeRank       - 关闭排行榜
 * @event shutdown        - 释放场景与连接
 *
 * 插槽说明：无
 *
 * 修改时间：2026/11/05（基于 3DMoonRunner 源码重做 UI 与伪 3D 场景）
 */
import ParkourNet from './parkour-net.js';
import ParkourAudio from './parkour-audio.js';
import createParkourScene from './parkour-game.js';
import { DESIGN_W, DESIGN_H } from './parkour-theme.js';

export default {
  data() {
    return {
      tips: '正在连接服务器…',
      overlay: '',
      run: { score: 0, coins: 0, distance: 0 },
      over: { score: 0, distance: 0, coins: 0, best: 0, rank: 0, task_rewards: [] },
      player: { coins: 0, diamonds: 0, best_score: 0 },
      boxResults: [],
      rank: { top: [], my_rank: 0, my_score: 0 },
      reviving: false,
      drawing: false,
      returnOverlay: 'ready',
      isPortrait: false,
      fitTimer: null,
      net: null,
      audio: null,
      game: null,
      scene: null
    };
  },

  computed: {
    /**
     * 源码 UI 素材基址（兼容 hash 路由与子路径部署）
     * @returns {string} 素材目录绝对 URL
     */
    assetBase() {
      if (typeof window === 'undefined') {
        return 'static/game/parkour/moon/';
      }
      const href = window.location.href.split('#')[0];
      return href.substring(0, href.lastIndexOf('/') + 1) + 'static/game/parkour/moon/';
    }
  },

  mounted() {
    this.disablePcAdapt();
    this.audio = new ParkourAudio();
    this.updateOrientation();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.updateOrientation);
      window.addEventListener('orientationchange', this.updateOrientation);
    }
    this.boot();
  },

  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.updateOrientation);
      window.removeEventListener('orientationchange', this.updateOrientation);
    }
    this.shutdown();
  },

  methods: {
    /**
     * 解除模板的 PC 适配（宽屏时 adapt-pc 会把应用藏进 iframe 手机模拟器）
     * @returns {void}
     */
    disablePcAdapt() {
      try {
        const doc = (window.top || window).document;
        if (doc.body.hasAttribute('adapt')) {
          doc.body.removeAttribute('adapt');
          const sim = doc.querySelector('uni-adapt-pc');
          if (sim) {
            sim.style.display = 'none';
          }
        }
      } catch (e) {
        // 跨域等异常时忽略
      }
    },

    /**
     * 检测横竖屏：竖屏时通过 CSS 旋转强制横屏显示
     * @returns {void}
     */
    updateOrientation() {
      if (typeof window === 'undefined') {
        return;
      }
      this.isPortrait = window.innerHeight > window.innerWidth;
      this.$nextTick(() => {
        window.requestAnimationFrame(() => this.fitCanvas());
      });
    },

    /**
     * 尝试原生横屏锁定（需全屏授权，失败则静默降级为 CSS 旋转）
     * @returns {void}
     */
    lockLandscape() {
      try {
        const el = document.documentElement;
        const tryLock = () => {
          const orientation = window.screen.orientation;
          if (orientation && orientation.lock) {
            const locked = orientation.lock('landscape');
            if (locked && locked.catch) {
              locked.catch(() => {});
            }
          }
        };
        if (el.requestFullscreen) {
          const full = el.requestFullscreen();
          if (full && full.then) {
            full.then(tryLock).catch(() => tryLock());
          } else {
            tryLock();
          }
        } else {
          tryLock();
        }
      } catch (e) {
        // 全屏或方向锁定不可用时忽略，CSS 旋转兜底
      }
    },

    /**
     * 初始化 Phaser 与网络
     * @returns {void}
     */
    boot() {
      const Phaser = typeof window !== 'undefined' ? window.Phaser : null;
      if (!Phaser) {
        this.tips = '游戏引擎未加载';
        return;
      }
      this.$nextTick(() => {
        const SceneClass = createParkourScene(Phaser, {
          assetBase: this.assetBase,
          onReady: (scene) => {
            this.scene = scene;
            this.bindSceneActions();
          },
          onGameOver: (result) => this.handleGameOver(result),
          onPause: (stats) => this.pauseGame(stats),
          onSoundToggle: (enabled) => this.audio.setEnabled(enabled)
        });
        this.game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: 'parkour-canvas',
          width: DESIGN_W,
          height: DESIGN_H,
          backgroundColor: '#0a1028',
          // 竖屏时父容器带 rotate 变换，FIT 量到的 bbox 与布局不符，改为手动缩放
          scale: { mode: Phaser.Scale.NONE },
          scene: [SceneClass]
        });
        this.$nextTick(() => {
          // Phaser.Game 异步 boot，canvas 就绪前先轮询
          this.fitTimer = setInterval(() => {
            if (this.game && this.game.canvas) {
              this.fitCanvas();
              clearInterval(this.fitTimer);
              this.fitTimer = null;
            }
          }, 100);
        });
        this.connect();
      });
    },

    /**
     * 按画布容器布局尺寸缩放并居中游戏画布（横竖屏通用）
     * @returns {void}
     */
    fitCanvas() {
      const wrap = typeof document !== 'undefined' ? document.getElementById('parkour-canvas') : null;
      if (!wrap || !this.game || !this.game.canvas) {
        return;
      }
      const w = wrap.offsetWidth;
      const h = wrap.offsetHeight;
      if (!w || !h) {
        return;
      }
      const ratio = Math.min(w / DESIGN_W, h / DESIGN_H);
      const cw = Math.floor(DESIGN_W * ratio);
      const ch = Math.floor(DESIGN_H * ratio);
      const c = this.game.canvas;
      c.style.width = cw + 'px';
      c.style.height = ch + 'px';
      c.style.marginLeft = Math.floor((w - cw) / 2) + 'px';
      c.style.marginTop = Math.floor((h - ch) / 2) + 'px';
    },

    /**
     * 生成原版木板按钮背景样式
     * @param {string} name 素材名（不含扩展名）
     * @returns {Object} 行内样式
     */
    btnStyle(name) {
      return { backgroundImage: 'url(' + this.assetBase + 'ui/' + name + '.png)' };
    },

    /**
     * 建立 WebSocket 并注册指令处理
     * @returns {void}
     */
    connect() {
      const url = this.resolveUrl();
      const net = new ParkourNet(url);
      net.on('login', (data) => {
        net.saveLogin(data);
        this.player = data.player;
        this.tips = '';
        this.audio.play('enter');
        this.audio.playBgm('bgm_menu');
        // 对齐源码：登录后进入主菜单（PlayUI），点击 PLAY 才开局
        this.overlay = 'ready';
      });
      net.on('run_end', (data) => {
        this.player.coins = data.total_coins;
        this.over.best = data.best;
        this.over.rank = data.rank;
        this.over.task_rewards = data.task_rewards || [];
      });
      net.on('revive', () => {
        this.reviving = false;
        this.overlay = '';
        this.scene.revive();
      });
      net.on('box_draw', (data) => {
        this.drawing = false;
        this.boxResults = data.results || [];
        this.player.diamonds = data.diamonds;
        this.player.coins = data.coins;
        this.audio.play('boxopen');
      });
      net.on('rank_list', (data) => {
        this.rank = data;
      });
      net.on('error', (data) => {
        uni.showToast({ title: data.message || '操作失败', icon: 'none' });
        this.drawing = false;
        this.reviving = false;
      });
      this.net = net;
      net.connect().catch(() => {
        this.tips = '连接服务器失败，请检查网络';
      });
    },

    /**
     * 计算 WebSocket 地址，生产环境走同域反代
     * @returns {string} ws 地址
     */
    resolveUrl() {
      const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      return proto + window.location.host + '/parkour-ws/';
    },

    /**
     * 把音频回调注入场景
     * @returns {void}
     */
    bindSceneActions() {
      this.scene.setActions({
        jump: () => this.audio.play('jump'),
        slide: () => this.audio.play('slide'),
        lane: () => this.audio.play('lane', 0.6),
        coin: () => this.audio.play('coin', 0.7),
        item: () => this.audio.play('reward'),
        crash: () => this.audio.play('crash'),
        death: () => this.audio.play('death'),
        revive: () => this.audio.play('revive'),
        levelup: () => this.audio.play('levelup'),
        click: () => this.audio.play('click')
      });
    },

    /**
     * 开始新的一局
     * @returns {void}
     */
    startGame() {
      this.overlay = '';
      this.lockLandscape();
      this.audio.play('click');
      this.audio.playBgm('bgm_run');
      this.scene.startRun();
    },

    /**
     * 恢复暂停的局
     * @returns {void}
     */
    resumeGame() {
      this.overlay = '';
      this.audio.play('click');
      this.scene.resumeRun();
    },

    /**
     * 返回主菜单（对齐源码 Exit / RestartUI）
     * @returns {void}
     */
    toReady() {
      this.overlay = 'ready';
      this.audio.play('click');
      this.audio.playBgm('bgm_menu');
      this.scene.toReady();
    },

    /**
     * 局内暂停入口（HUD 暂停按钮触发）
     * @param {Object} stats 局内统计
     * @returns {void}
     */
    pauseGame(stats) {
      this.run = stats || { score: this.scene.score, coins: this.scene.coins, distance: Math.floor(this.scene.distance) };
      this.overlay = 'pause';
    },

    /**
     * 结算：上报服务器并弹出结算面板
     * @param {Object} result 本局结果
     * @returns {void}
     */
    handleGameOver(result) {
      this.audio.playBgm('bgm_menu');
      this.net.send('run_end', {
        token: this.net.token,
        score: result.score,
        distance: result.distance,
        coins: result.coins
      });
      this.over = Object.assign({}, this.over, result);
      this.overlay = 'over';
    },

    /**
     * 复活（消耗 300 金币）
     * @returns {void}
     */
    doRevive() {
      if (this.reviving || this.player.coins < 300) {
        return;
      }
      this.reviving = true;
      this.audio.play('click');
      this.net.send('revive', { token: this.net.token });
    },

    /**
     * 打开盲盒面板
     * @returns {void}
     */
    openBoxPanel() {
      this.returnOverlay = this.overlay === 'ready' ? 'ready' : 'over';
      this.boxResults = [];
      this.overlay = 'box';
      this.audio.play('click');
    },

    /**
     * 抽盲盒
     * @param {number} count 抽数量
     * @returns {void}
     */
    drawBox(count) {
      if (this.drawing) {
        return;
      }
      this.drawing = true;
      this.audio.play('box');
      this.net.send('box_draw', { token: this.net.token, count });
    },

    /**
     * 关闭盲盒面板，回到来源界面
     * @returns {void}
     */
    closeBox() {
      this.overlay = this.returnOverlay;
      this.audio.play('click');
    },

    /**
     * 打开排行榜
     * @returns {void}
     */
    openRank() {
      this.returnOverlay = this.overlay === 'ready' ? 'ready' : 'over';
      this.audio.play('click');
      this.net.send('rank_list', { token: this.net.token });
      this.overlay = 'rank';
    },

    /**
     * 关闭排行榜
     * @returns {void}
     */
    closeRank() {
      this.overlay = this.returnOverlay;
      this.audio.play('click');
    },

    /**
     * 释放场景与连接
     * @returns {void}
     */
    shutdown() {
      if (this.fitTimer) {
        clearInterval(this.fitTimer);
        this.fitTimer = null;
      }
      if (this.net) {
        this.net.stopPing();
        if (this.net.ws) {
          this.net.ws.onclose = null;
          this.net.ws.close();
        }
        this.net = null;
      }
      if (this.game) {
        this.game.destroy(true);
        this.game = null;
      }
      this.audio = null;
      this.scene = null;
    }
  }
};
</script>
