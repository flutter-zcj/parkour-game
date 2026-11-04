/**
 * @file 跑酷 WebSocket 客户端。
 * 与后端约定：每条消息为一行 JSON，形如 {"cmd":"login","data":{...}}。
 * 在 ddz-net.js 的基础上增加 token 持久化与登录态管理。
 */

/**
 * 跑酷网络客户端，负责连接、重连、登录与消息分发。
 */
export default class ParkourNet {
  /**
   * @param {string} url WebSocket 地址
   */
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = {};
    this.queue = [];
    this.connected = false;
    this.retry = 0;
    this.token = uni.getStorageSync('parkour_token') || '';
    this.player = null;
    this.pingTimer = null;
  }

  /**
   * 注册消息处理器
   * @param {string} cmd 指令名
   * @param {Function} fn 回调，入参为 data
   * @returns {ParkourNet} 支持链式调用
   */
  on(cmd, fn) {
    this.handlers[cmd] = fn;
    return this;
  }

  /**
   * 建立连接并自动登录
   * @returns {Promise<void>} 登录完成后 resolve
   */
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onopen = () => {
        this.connected = true;
        this.retry = 0;
        this.queue.splice(0).forEach((line) => ws.send(line));
        this.startPing();
        this.send('login', { token: this.token });
        resolve();
      };
      ws.onmessage = (evt) => this.handleMessage(evt.data);
      ws.onclose = () => {
        this.connected = false;
        this.stopPing();
        this.scheduleReconnect();
      };
      ws.onerror = () => reject(new Error('连接失败'));
    });
  }

  /**
   * 断线后按指数退避重连，最多 6 次
   */
  scheduleReconnect() {
    if (this.retry >= 6) {
      return;
    }
    this.retry += 1;
    const delay = Math.min(1000 * this.retry, 5000);
    setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  /**
   * 每 25 秒发送一次心跳，避免服务端 600 秒空闲判定
   */
  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => this.send('ping', {}), 25000);
  }

  /**
   * 停止心跳
   */
  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * 解析下行消息并派发
   * @param {string|Blob} raw 原始消息
   */
  async handleMessage(raw) {
    let text = raw;
    if (raw instanceof Blob) {
      text = await raw.text();
    }
    if (typeof text !== 'string') {
      return;
    }
    text.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      let msg = null;
      try {
        msg = JSON.parse(trimmed);
      } catch (err) {
        return;
      }
      const fn = this.handlers[msg.cmd];
      if (fn) {
        fn(msg.data);
      }
    });
  }

  /**
   * 发送指令
   * @param {string} cmd 指令名
   * @param {Object} data 载荷
   */
  send(cmd, data = {}) {
    const line = JSON.stringify({ cmd, data }) + '\n';
    if (this.connected && this.ws && this.ws.readyState === 1) {
      this.ws.send(line);
      return;
    }
    this.queue.push(line);
  }

  /**
   * 保存登录态
   * @param {Object} data login 响应
   */
  saveLogin(data) {
    this.token = data.token;
    this.player = data.player;
    uni.setStorageSync('parkour_token', data.token);
    uni.setStorageSync('parkour_nickname', data.player.nickname);
  }
}
