/**
 * @file 月光跑酷音频管理。
 * 音效严格取自 3DMoonRunner 源码 Assets/Audio（button / coin / getitem / hit / slide），
 * 按源码 AudioManager 的 5 个播放入口（PlayButtonAudio / PlayCoinAudio /
 * PlayGetItemAudio / PlayHitAudio / PlaySlideAudio）建立语义别名映射；
 * BGM 与夜风环境音为程序化合成的无缝循环（贴合源码月光夜景氛围，不含原作森林音乐）。
 * 通过 Web Audio 解码后播放，符合浏览器自动播放策略（首次交互后 resume）。
 */

/** 实际音频文件清单：bufferKey -> 文件名（无扩展名） */
const FILES = {
  button: 'button',
  coin: 'coin',
  getitem: 'getitem',
  hit: 'hit',
  slide: 'slide',
  bgm_menu: 'bgm_menu',
  bgm_run: 'bgm_run',
  amb_night: 'amb_night'
};

/**
 * 语义别名：业务侧沿用旧 key，统一映射到源码 5 个原版音效。
 * 对齐 AudioManager：所有方向手势（换道/跳/滑）均播放 slide，按钮播放 button。
 */
const ALIAS = {
  click: 'button',
  enter: 'button',
  boxopen: 'button',
  reward: 'button',
  levelup: 'button',
  revive: 'button',
  cheer: 'button',
  taunt: 'button',
  fast: 'button',
  coin2: 'coin',
  item: 'getitem',
  box: 'getitem',
  crash: 'hit',
  death: 'hit',
  lane: 'slide',
  jump: 'slide',
  jump_voice: 'slide'
};

/** 音量档位：BGM 低、环境更低、音效中 */
const VOLUME = {
  bgm: 0.5,
  amb: 0.22,
  sfx: 0.85
};

/** 同一音效最小重触发间隔（毫秒），避免密集连击叠加爆音 */
const THROTTLE_MS = 28;

/**
 * 跑酷音频管理器，负责解码、循环与播放。
 */
export default class ParkourAudio {
  /**
   * 构造音频管理器
   * @param {string} base 音频目录基址（线上 H5 与本地预览基准不同，由调用方注入）
   */
  constructor(base = 'static/game/parkour/moon/audio/') {
    this.base = base;
    this.ctx = null;
    this.enabled = true;
    this.buffers = {};
    this.bgmSource = null;
    this.bgmName = '';
    this.ambSource = null;
    this.lastPlay = {};
  }

  /**
   * 确保 AudioContext 已创建；预解码静默失败不影响游戏
   * @returns {Object|null} AudioContext
   */
  ensure() {
    if (typeof window === 'undefined') {
      return null;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new Ctx();
      this.preload();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * 拉取并解码全部音频文件
   * @returns {void}
   */
  preload() {
    Object.keys(FILES).forEach((key) => {
      const url = this.base + FILES[key] + '.ogg';
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((buf) => this.ctx.decodeAudioData(buf))
        .then((audio) => {
          this.buffers[key] = audio;
        })
        .catch(() => {});
    });
  }

  /**
   * 播放一次性音效
   * @param {string} key 业务语义键（经 ALIAS 映射到源码音效）
   * @param {number} gain 相对音量（0~1）
   * @returns {void}
   */
  play(key, gain = 1) {
    const ctx = this.ensure();
    const name = ALIAS[key] || key;
    if (!ctx || !this.enabled || !this.buffers[name]) {
      return;
    }
    const now = ctx.currentTime * 1000;
    if (this.lastPlay[name] && now - this.lastPlay[name] < THROTTLE_MS) {
      return;
    }
    this.lastPlay[name] = now;
    const src = ctx.createBufferSource();
    const amp = ctx.createGain();
    src.buffer = this.buffers[name];
    amp.gain.value = VOLUME.sfx * gain;
    src.connect(amp);
    amp.connect(ctx.destination);
    src.start();
  }

  /**
   * 播放可循环 BGM；重复调用同名时忽略，换曲时淡出旧曲
   * @param {string} key 音频键
   * @returns {void}
   */
  playBgm(key) {
    const ctx = this.ensure();
    if (!ctx || !this.enabled || !this.buffers[key]) {
      return;
    }
    if (this.bgmName === key) {
      return;
    }
    this.stopBgm();
    const src = ctx.createBufferSource();
    const amp = ctx.createGain();
    src.buffer = this.buffers[key];
    src.loop = true;
    amp.gain.setValueAtTime(0.0001, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(VOLUME.bgm, ctx.currentTime + 0.8);
    src.connect(amp);
    amp.connect(ctx.destination);
    src.start();
    this.bgmSource = src;
    this.bgmAmp = amp;
    this.bgmName = key;
    // 主菜单叠加夜风氛围，跑动时关闭以免与节奏 BGM 的低频叠加
    this.playAmbience(key === 'bgm_menu');
  }

  /**
   * 停止当前 BGM（带 0.25s 淡出，避免切曲爆音）
   * @returns {void}
   */
  stopBgm() {
    const ctx = this.ctx;
    if (this.bgmSource) {
      const src = this.bgmSource;
      const amp = this.bgmAmp;
      try {
        if (ctx && amp) {
          amp.gain.cancelScheduledValues(ctx.currentTime);
          amp.gain.setValueAtTime(Math.max(amp.gain.value, 0.0001), ctx.currentTime);
          amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
          src.stop(ctx.currentTime + 0.28);
        } else {
          src.stop();
        }
      } catch (err) {
        /* 已停止则忽略 */
      }
      this.bgmSource = null;
      this.bgmAmp = null;
      this.bgmName = '';
    }
  }

  /**
   * 播放/停止环境音层（夜风）
   * @param {boolean} on 是否开启
   * @returns {void}
   */
  playAmbience(on) {
    const ctx = this.ensure();
    if (!ctx || !this.enabled) {
      return;
    }
    if (on && !this.ambSource && this.buffers.amb_night) {
      const src = ctx.createBufferSource();
      const amp = ctx.createGain();
      src.buffer = this.buffers.amb_night;
      src.loop = true;
      amp.gain.value = VOLUME.amb;
      src.connect(amp);
      amp.connect(ctx.destination);
      src.start();
      this.ambSource = src;
    }
    if (!on && this.ambSource) {
      try {
        this.ambSource.stop();
      } catch (err) {
        /* 已停止则忽略 */
      }
      this.ambSource = null;
    }
  }

  /**
   * 静音开关，静音时停掉全部循环声
   * @param {boolean} enabled 是否开启声音
   * @returns {void}
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBgm();
      this.playAmbience(false);
    }
  }
}
