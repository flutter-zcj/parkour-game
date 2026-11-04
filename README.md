# 森林大冒险 · 三车道跑酷（Phaser 3 + cherry）

对标《熊出没之熊大快跑》(v4.7.0, `com.joym.xiongdakuaipao.yyb`) 的同类玩法自研实现，
**非 IP 复刻**：玩法、系统骨架与视听风格对齐原作，全部代码与美术为原创，音频取自公开渠道提取的原版音效。

## 架构

```
浏览器（uni-app H5, prjtmpl 范式）
  ├─ pages/game/parkour/parkour.vue        页面壳：Phaser 生命周期 + 结算/盲盒/排行榜弹窗
  ├─ pages/game/parkour/parkour-game.js    Phaser 场景：三车道跑酷、程序化美术、碰撞、道具
  ├─ pages/game/parkour/parkour-net.js     WebSocket 行协议客户端（{"cmd":..,"data":..}\n）
  ├─ pages/game/parkour/parkour-audio.js   22 条 ogg 音频管理（BGM/音效/语音）
  └─ pages/game/parkour/parkour-theme.js   森林风调色板与数值常量
        │ WSS /parkour-ws/（nginx 反代）
        ▼
cherry v1.6.9 单机节点（Go, :9108）
  ├─ internal/line      JSON 行协议 parser（fork 自 cherry/simple，分帧改行协议）
  ├─ internal/game      业务 actor：登录/结算/复活/盲盒/排行榜/换装 + JWT + JSON 文件存档
  └─ main.go            装配：Configure(Standalone) + WSConnector + 路由注册
```

## 协议（一行一 JSON）

| cmd        | 上行 data                              | 下行 data 摘要 |
| ---------- | -------------------------------------- | -------------- |
| `login`    | `{token?, nickname?}`                  | token + 玩家档案 |
| `run_end`  | `{token, score, distance, coins}`      | 金币入账、最高分、名次、任务奖励 |
| `revive`   | `{token}`                              | 扣 300 金币复活 |
| `box_draw` | `{token, count}`                       | 奖品数组（四档稀有度 70/20/8/2%） |
| `rank_list`| `{token}`                              | Top20 + 我的排名 |
| `use_role` | `{token, role}`                        | 切换使用中的角色 |
| `ping`     | `{}`                                   | 心跳 |

服务端校验：token HMAC、结算比例合理性（金币 ≤ 距离/10+50）、体力/每日任务惰性结算。

## 部署（zbcx 服务器 60.204.248.157）

- 前端站点：`/www/wwwroot/parkour`（nginx 8081 `location ^~ /parkour/`）
- 后端服务：`/www/wwwroot/parkour-server`（systemd `zbcx-parkour.service`，WS :9108，nginx `/parkour-ws/` 反代）
- 数据目录：`/root/zbcx/parkour-data`（每玩家一档 JSON + ranking.json）

```bash
# 后端编译（Go 1.24+，CentOS 7 需 CGO_ENABLED=0 静态编译）
cd server && CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o parkour-server .
# 前端构建
cd web && npm install && npm run build:h5   # 产物 dist/build/h5
```

服务器上已有 ddz / guandan / mahjong 三个 cherry 前辈实例，本服务按同规范落位，端口顺延至 9108。

## 素材合规

- 音频：从原作 APK 提取的 22 条 ogg（BGM《lost temple》37s 循环、跳跃/滑铲/金币/爆炸等），仅用于学习研究，**禁止商用**。
- 美术：全部 Canvas 程序化绘制（圆润森林风：木框 + 藤蔓绿 + 金色描边），不含原作任何角色形象。
- 角色：原创 Q 版小熊；角色名（森林游侠/疾风忍者/雪原使者等）为合规替换命名。

## 目录

```
├── server/          Go 后端（cherry v1.6.9）
│   ├── main.go
│   ├── etc/parkour.json          cherry profile（端口/存储/密钥）
│   └── internal/{line,game}/
├── web/             uni-app 前端（flutter-zcj/prjtmpl 改造）
│   ├── src/pages/game/parkour/
│   └── src/static/game/          phaser.min.js + parkour/audio/*.ogg
└── deploy/
    ├── zbcx-parkour.service      systemd 单元
    └── nginx-parkour.conf        nginx location 片段
```
