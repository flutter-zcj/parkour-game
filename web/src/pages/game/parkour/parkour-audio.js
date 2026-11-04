/**
 * @file 跑酷音频管理。
 * BGM 与音效取自原作资源提取的 ogg（22 条，见 static/game/parkour/audio），
 * 通过 Web Audio 解码后播放，符合浏览器自动播放策略（首次交互后 resume）。
 */

/** 音频清单：key -> 文件名（无扩展名） */
const FILES = {
  bgm_menu: 'bgm_menu',
  bgm_run: 'bgm_run',
  amb_forest: 'amb_forest',
  jump: 'jump',
  jump_voice: 'jump_voice',
  slide: 'slide',
  lane: 'lane',
  coin: 'coin',
  coin2: 'coin2',
  hit: 'hit',
  crash: 'crash',
  revive: 'revive',
  death: 'death',
  click: 'click',
  enter: 'enter',
  reward: 'reward',
  levelup: 'levelup',
  box: 'box',
  boxopen: 'boxopen',
  taunt: 'taunt',
  cheer: 'cheer',
  fast: 'fast'
};

/** 音量档位：BGM 低、环境更低、音效中 */
const VOLUME = {
  bgm: 0.45,
  amb: 0.18,
  sfx: 0.8
};

/**
 * 跑酷音频管理器，负责解码、循环与播放。
 */
export default class ParkourAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.buffers = {};
    this.bgmSource = null;
    this.bgmName = '';
    this.ambSource = null;
  }

  /**
   * 确保 AudioContext 已创建；预解码静默失败不影响游戏
   * @returns {Object|null} AudioContext
   */
  ensure() {
    if (typeof window === 'undefined' || typeof uni === 'undefined') {
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
    const base = 'static/game/parkour/audio/';
    Object.keys(FILES).forEach((key) => {
      const url = base + FILES[key] + '.ogg';
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
   * @param {string} key 音频键
   * @param {number} gain 相对音量（0~1）
   * @returns {void}
   */
  play(key, gain = 1) {
    const ctx = this.ensure();
    if (!ctx || !this.enabled || !this.buffers[key]) {
      return;
    }
    const src = ctx.createBufferSource();
    const amp = ctx.createGain();
    src.buffer = this.buffers[key];
    amp.gain.value = VOLUME.sfx * gain;
    src.connect(amp);
    amp.connect(ctx.destination);
    src.start();
  }

  /**
   * 播放可循环 BGM；重复调用同名时忽略，换曲时先停旧曲
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
    amp.gain.value = VOLUME.bgm;
    src.connect(amp);
    amp.connect(ctx.destination);
    src.start();
    this.bgmSource = src;
    this.bgmName = key;
  }

  /**
   * 停止当前 BGM
   * @returns {void}
   */
  stopBgm() {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch (err) {
        /* 已停止则忽略 */
      }
      this.bgmSource = null;
      this.bgmName = '';
    }
  }

  /**
   * 播放/停止环境音层（树林风声）
   * @param {boolean} on 是否开启
   * @returns {void}
   */
  playAmbience(on) {
    const ctx = this.ensure();
    if (!ctx || !this.enabled) {
      return;
    }
    if (on && !this.ambSource && this.buffers.amb_forest) {
      const src = ctx.createBufferSource();
      const amp = ctx.createGain();
      src.buffer = this.buffers.amb_forest;
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
