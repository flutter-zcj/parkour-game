<style lang="scss" scoped>
.parkour-page{position:relative;width:100%;height:100vh;background:#d8f0c2;overflow:hidden;box-sizing:border-box}
.parkour-page.rotate{position:fixed;top:0;left:100vw;width:100vh;height:100vw;transform:rotate(90deg);transform-origin:0 0;z-index:99}
.parkour-canvas{position:absolute;inset:0}
.parkour-tips{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32rpx;color:#5b3a1e;background:rgba(253,243,221,.95);padding:24rpx 40rpx;border-radius:16rpx}
.parkour-mask{position:absolute;inset:0;background:rgba(43,29,12,.55);display:flex;align-items:center;justify-content:center;z-index:30}
.parkour-panel{position:relative;width:600rpx;background:#fdf3dd;border:8rpx solid #c98d4b;border-radius:24rpx;padding:40rpx;box-sizing:border-box;max-height:80vh;overflow-y:auto}
.parkour-title{position:relative;text-align:center;font-size:40rpx;font-weight:700;color:#5b3a1e;margin-bottom:30rpx}
.parkour-row{position:relative;display:flex;justify-content:space-between;margin-bottom:18rpx;font-size:30rpx;color:#7a5230}
.parkour-row b{position:relative;color:#e08f2a}
.parkour-btn{position:relative;display:block;width:100%;text-align:center;background:#ffb84d;border:4rpx solid #e08f2a;color:#5b3a1e;font-size:32rpx;font-weight:700;padding:20rpx 0;border-radius:40rpx;margin-top:24rpx}
.parkour-btn.ghost{position:relative;background:#fdf3dd;border-color:#c98d4b}
.parkour-btn:disabled{position:relative;opacity:.5}
.parkour-boxlist{position:relative;display:flex;flex-wrap:wrap;gap:12rpx;margin-top:10rpx}
.parkour-prize{position:relative;background:#fff;border:3rpx solid #c98d4b;border-radius:12rpx;padding:10rpx 18rpx;font-size:26rpx;color:#5b3a1e}
.parkour-prize.legendary{position:relative;border-color:#e05252;color:#e05252}
.parkour-prize.epic{position:relative;border-color:#b26ee0;color:#b26ee0}
.parkour-rank{position:relative;margin-top:10rpx}
.parkour-rankrow{position:relative;display:flex;justify-content:space-between;font-size:28rpx;color:#5b3a1e;padding:8rpx 0;border-bottom:1rpx dashed #d9c39a}
</style>
<template>
  <view class="parkour-page" :class="{ rotate: isPortrait }">
    <view id="parkour-canvas" class="parkour-canvas"></view>
    <view v-if="tips" class="parkour-tips">{{ tips }}</view>
    <view v-if="overlay === 'pause'" class="parkour-mask">
      <view class="parkour-panel">
        <view class="parkour-title">本局已暂停</view>
        <view class="parkour-row"><span>当前得分</span><b>{{ run.score }}</b></view>
        <view class="parkour-row"><span>当前金币</span><b>{{ run.coins }}</b></view>
        <button class="parkour-btn" @click="resumeGame">继续</button>
        <button class="parkour-btn ghost" @click="quitGame">退出本局</button>
      </view>
    </view>
    <view v-if="overlay === 'over'" class="parkour-mask">
      <view class="parkour-panel">
        <view class="parkour-title">{{ over.rank === 1 ? '新纪录！' : '本局结束' }}</view>
        <view class="parkour-row"><span>得分</span><b>{{ over.score }}</b></view>
        <view class="parkour-row"><span>距离</span><b>{{ over.distance }} m</b></view>
        <view class="parkour-row"><span>金币</span><b>+{{ over.coins }}</b></view>
        <view class="parkour-row"><span>历史最高</span><b>{{ over.best }}</b></view>
        <view class="parkour-row"><span>金币余额</span><b>{{ player.coins }}</b></view>
        <view v-if="over.task_rewards && over.task_rewards.length" class="parkour-row"><span>任务奖励</span><b>{{ over.task_rewards.join('、') }}</b></view>
        <button class="parkour-btn" :disabled="reviving || player.coins < 300" @click="doRevive">看广告复活（{{ player.coins }} / 300 金币）</button>
        <button class="parkour-btn ghost" @click="startGame">再来一局</button>
        <button class="parkour-btn ghost" @click="openBoxPanel">盲盒抽奖（{{ player.diamonds }} 钻石）</button>
        <button class="parkour-btn ghost" @click="openRank">排行榜</button>
      </view>
    </view>
    <view v-if="overlay === 'box'" class="parkour-mask">
      <view class="parkour-panel">
        <view class="parkour-title">盲盒抽奖</view>
        <view class="parkour-row"><span>钻石余额</span><b>{{ player.diamonds }}</b></view>
        <view class="parkour-boxlist">
          <view v-for="prize in boxResults" :key="prize.id" class="parkour-prize" :class="prize.rarity">{{ prize.name }}</view>
        </view>
        <button class="parkour-btn" :disabled="drawing || player.diamonds < 20" @click="drawBox(1)">单抽（20 钻石）</button>
        <button class="parkour-btn" :disabled="drawing || player.diamonds < 200" @click="drawBox(10)">十连（200 钻石）</button>
        <button class="parkour-btn ghost" @click="closeBox">返回</button>
      </view>
    </view>
    <view v-if="overlay === 'rank'" class="parkour-mask">
      <view class="parkour-panel">
        <view class="parkour-title">排行榜</view>
        <view class="parkour-row"><span>我的名次</span><b>{{ rank.my_rank || '未上榜' }}（{{ rank.my_score || 0 }} 分）</b></view>
        <view class="parkour-rank">
          <view v-for="(item, idx) in rank.top" :key="item.uid" class="parkour-rankrow">
            <span>{{ idx + 1 }}. {{ item.nickname }}</span><b>{{ item.score }}</b>
          </view>
        </view>
        <button class="parkour-btn ghost" @click="closeRank">返回</button>
      </view>
    </view>
  </view>
</template>
<script>
/**
 * 组件名称：parkour
 * 功能说明：跑酷游戏页，Phaser 场景生命周期、WebSocket 长连接、结算/复活/盲盒/排行榜弹窗
 * 研发时间：2026/11/04
 * 研发人员：郑朝军
 *
 * 变量说明：
 * @data {String}  tips        - 连接提示文案
 * @data {String}  overlay     - 当前弹窗：pause/over/box/rank
 * @data {Object}  run         - 局内暂停数据
 * @data {Object}  over        - 结算面板数据
 * @data {Object}  player      - 玩家档案（金币/钻石/最高分）
 * @data {Array}   boxResults  - 盲盒抽取结果
 * @data {Object}  rank        - 排行榜数据
 * @data {Boolean} reviving    - 是否正在复活
 * @data {Boolean} drawing     - 是否正在抽卡
 * @data {Object}  net         - 网络客户端
 * @data {Object}  audio       - 音频管理器
 * @data {Object}  game        - Phaser.Game 实例
 * @data {Object}  scene       - 当前场景实例
 * @data {Boolean} isPortrait  - 设备是否处于竖屏（竖屏时页面旋转 90° 强制横屏显示）
 * @data {Number}  fitTimer    - 等待 Phaser canvas 就绪的轮询定时器 ID
 *
 * 事件说明：
 * @event boot            - 初始化 Phaser 与网络
 * @event disablePcAdapt  - 解除 PC 适配模拟器，保证游戏全屏直跑
 * @event updateOrientation - 检测横竖屏并切换旋转兜底
 * @event lockLandscape   - 尝试全屏 + 原生横屏锁定
 * @event connect         - 建立 WebSocket 并注册指令处理
 * @event resolveUrl      - 计算 WebSocket 地址
 * @event bindSceneActions- 注入音频回调
 * @event startGame       - 开始新的一局
 * @event resumeGame      - 恢复暂停的局
 * @event quitGame        - 退出当前局
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
 * 修改时间：2026/11/05（横屏模式：CSS 旋转兜底 + 原生方向锁定）
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
      run: { score: 0, coins: 0 },
      over: { score: 0, distance: 0, coins: 0, best: 0, rank: 0, task_rewards: [] },
      player: { coins: 0, diamonds: 0, best_score: 0 },
      boxResults: [],
      rank: { top: [], my_rank: 0, my_score: 0 },
      reviving: false,
      drawing: false,
      isPortrait: false,
      fitTimer: null,
      net: null,
      audio: null,
      game: null,
      scene: null
    };
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
     * 解除模板的 PC 适配（宽屏时 adapt-pc 会把应用藏进 iframe 手机模拟器，
     * 横屏游戏页必须全屏直跑，故移除适配标记并隐藏模拟器容器）
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
      // 等 rotate 类渲染生效后再重算画布缩放
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
          onReady: (scene) => {
            this.scene = scene;
            this.bindSceneActions();
          },
          onGameOver: (result) => this.handleGameOver(result),
          onPause: () => this.pauseGame()
        });
        this.game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: 'parkour-canvas',
          width: DESIGN_W,
          height: DESIGN_H,
          backgroundColor: '#d8f0c2',
          // 竖屏时父容器带 rotate 变换，FIT 量到的 bbox 与布局不符，
          // 改为手动按 offsetWidth/offsetHeight 计算缩放（见 fitCanvas）
          scale: { mode: Phaser.Scale.NONE },
          scene: [SceneClass]
        });
        this.$nextTick(() => {
          // Phaser.Game 异步 boot，canvas 就绪前先轮询，就绪后立即适配一次
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
        if (this.scene && this.scene.state === 0) {
          this.startGame();
        }
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
     * 计算WebSocket 地址，生产环境走同域反代
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
        coin: () => this.audio.play(Math.random() < 0.5 ? 'coin' : 'coin2', 0.7),
        crash: (hasShield) => this.audio.play(hasShield ? 'click' : 'crash'),
        death: () => this.audio.play('death'),
        revive: () => this.audio.play('revive'),
        reward: () => this.audio.play('reward'),
        fast: () => this.audio.play('fast')
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
      this.audio.playAmbience(true);
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
     * 退出当前局回到待机
     * @returns {void}
     */
    quitGame() {
      this.overlay = '';
      this.audio.play('click');
      this.audio.playBgm('bgm_menu');
      this.audio.playAmbience(false);
      this.scene.resetRun();
      this.scene.state = 0;
    },

    /**
     * 局内暂停入口（HUD 按钮触发）
     * @returns {void}
     */
    pauseGame() {
      this.run.score = this.scene.score;
      this.run.coins = this.scene.coins;
      this.overlay = 'pause';
    },

    /**
     * 结算：上报服务器并弹出结算面板
     * @param {Object} result 本局结果
     * @returns {void}
     */
    handleGameOver(result) {
      this.audio.playBgm('bgm_menu');
      this.audio.playAmbience(false);
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
     * 看广告复活
     * @returns {void}
     */
    doRevive() {
      if (this.reviving) {
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
     * 关闭盲盒面板
     * @returns {void}
     */
    closeBox() {
      this.overlay = 'over';
      this.audio.play('click');
    },

    /**
     * 打开排行榜
     * @returns {void}
     */
    openRank() {
      this.audio.play('click');
      this.net.send('rank_list', { token: this.net.token });
      this.overlay = 'rank';
    },

    /**
     * 关闭排行榜
     * @returns {void}
     */
    closeRank() {
      this.overlay = 'over';
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
