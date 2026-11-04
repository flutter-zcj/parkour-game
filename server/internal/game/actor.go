package game

import (
	"encoding/json"

	clog "github.com/cherry-game/cherry/logger"
	cproto "github.com/cherry-game/cherry/net/proto"

	"github.com/flutter-zcj/parkour-server/internal/line"
)

// PlayerActor 每个连接一个实例，负责处理该连接的全部请求。
// 方法签名固定为 func(session, args []byte)，由 cherry 的 invoke 反射调用。
type PlayerActor struct {
	line.ActorBase
	store *Store // 共享存储
}

// NewPlayerActor 创建绑定存储的业务 actor。
func NewPlayerActor(store *Store) *PlayerActor {
	return &PlayerActor{store: store}
}

// RegisterAll 把全部业务方法注册到本地 mailbox，创建 child actor 后必须调用。
func (p *PlayerActor) RegisterAll() {
	handlers := map[string]func(*cproto.Session, *request){
		"Login":      p.Login,
		"PlayerInfo": p.PlayerInfo,
		"RunEnd":     p.RunEnd,
		"Revive":     p.Revive,
		"BoxDraw":    p.BoxDraw,
		"RankList":   p.RankList,
		"UseRole":    p.UseRole,
		"Ping":       p.Ping,
	}
	for name, fn := range handlers {
		p.Local().Register(name, fn)
	}
}

// request 客户端上行载荷的通用结构。
type request struct {
	Token    string `json:"token"`
	Nickname string `json:"nickname"`
	RunID    string `json:"run_id"`
	Score    int    `json:"score"`
	Distance int    `json:"distance"`
	Coins    int    `json:"coins"`
	Count    int    `json:"count"`
	SKU      string `json:"sku"`
	Role     string `json:"role"`
}

// fail 统一错误响应。
func fail(p *PlayerActor, session *cproto.Session, mid uint32, msg string) {
	p.Response(session, mid, map[string]interface{}{"error": msg})
	clog.Warnf("[game] fail: %s", msg)
}

// payload 把结构体统一转成 map 便于序列化。
func payload(v interface{}) map[string]interface{} {
	data, _ := json.Marshal(v)
	m := map[string]interface{}{}
	_ = json.Unmarshal(data, &m)
	return m
}

// Login 登录：优先 token 续档，否则按昵称建新档。
func (p *PlayerActor) Login(session *cproto.Session, req *request) {
	mid := session.Mid
	var player *Player
	if req.Token != "" {
		if uid := p.store.VerifyToken(req.Token); uid != "" {
			player, _ = p.store.Load(uid)
		}
	}
	if player == nil {
		player = p.store.CreateNew(req.Nickname)
		if err := p.store.Save(player); err != nil {
			fail(p, session, mid, "建档失败")
			return
		}
	}
	token := p.store.IssueToken(player.UID, player.TokenIssuedAt)
	p.Response(session, mid, payload(map[string]interface{}{
		"token":       token,
		"player":      player,
		"box_cost":    BoxDrawCostDiamonds,
		"revive_cost": ReviveCostCoins,
	}))
}

// PlayerInfo 拉取最新档案。
func (p *PlayerActor) PlayerInfo(session *cproto.Session, req *request) {
	mid := session.Mid
	player := p.mustAuth(session, mid, req)
	if player == nil {
		return
	}
	p.Response(session, mid, payload(map[string]interface{}{"player": player}))
}

// RunEnd 局内结算上报。
func (p *PlayerActor) RunEnd(session *cproto.Session, req *request) {
	mid := session.Mid
	player := p.mustAuth(session, mid, req)
	if player == nil {
		return
	}
	if req.Score < 0 || req.Coins < 0 || req.Distance < 0 {
		fail(p, session, mid, "非法结算数据")
		return
	}
	// 服务端侧合理性校验：分数与米数、金币的比例上限
	if req.Coins > req.Distance/10+50 {
		fail(p, session, mid, "结算数据异常")
		return
	}
	rsp, err := p.store.Settle(player, req.Score, req.Distance, req.Coins)
	if err != nil {
		fail(p, session, mid, "结算失败")
		return
	}
	p.Response(session, mid, payload(rsp))
}

// Revive 复活一次：扣金币。
func (p *PlayerActor) Revive(session *cproto.Session, req *request) {
	mid := session.Mid
	player := p.mustAuth(session, mid, req)
	if player == nil {
		return
	}
	if player.Coins < ReviveCostCoins {
		fail(p, session, mid, "金币不足，复活需 300")
		return
	}
	player.Coins -= ReviveCostCoins
	if err := p.store.Save(player); err != nil {
		fail(p, session, mid, "存档失败")
		return
	}
	p.Response(session, mid, payload(map[string]interface{}{"ok": true, "coins": player.Coins}))
}

// BoxDraw 盲盒抽奖。
func (p *PlayerActor) BoxDraw(session *cproto.Session, req *request) {
	mid := session.Mid
	player := p.mustAuth(session, mid, req)
	if player == nil {
		return
	}
	if req.Count <= 0 {
		req.Count = 1
	}
	if req.Count > 10 {
		fail(p, session, mid, "单次最多十连")
		return
	}
	results := make([]BoxPrize, 0, req.Count)
	for i := 0; i < req.Count; i++ {
		prize, err := p.store.DrawBox(player)
		if err != nil {
			fail(p, session, mid, err.Error())
			return
		}
		results = append(results, prize)
	}
	p.Response(session, mid, payload(map[string]interface{}{
		"results": results, "diamonds": player.Diamonds, "coins": player.Coins,
	}))
}

// RankList 排行榜查询。
func (p *PlayerActor) RankList(session *cproto.Session, req *request) {
	mid := session.Mid
	player := p.mustAuth(session, mid, req)
	if player == nil {
		return
	}
	top := p.store.Top(20)
	myRank := p.store.myRank(player.UID)
	p.Response(session, mid, payload(map[string]interface{}{
		"top": top, "my_rank": myRank, "my_score": player.BestScore,
	}))
}

// UseRole 切换使用中的角色。
func (p *PlayerActor) UseRole(session *cproto.Session, req *request) {
	mid := session.Mid
	player := p.mustAuth(session, mid, req)
	if player == nil {
		return
	}
	owned := false
	for _, r := range player.Roles {
		if r == req.Role {
			owned = true
			break
		}
	}
	if !owned {
		fail(p, session, mid, "尚未拥有该角色")
		return
	}
	player.UsingRole = req.Role
	if err := p.store.Save(player); err != nil {
		fail(p, session, mid, "存档失败")
		return
	}
	p.Response(session, mid, payload(map[string]interface{}{"using_role": player.UsingRole}))
}

// Ping 心跳保活。
func (p *PlayerActor) Ping(session *cproto.Session, _ *request) {
	p.Response(session, session.Mid, map[string]interface{}{"pong": true})
}

// mustAuth 校验 token 并载入档案；失败时直接下发错误响应并返回 nil。
func (p *PlayerActor) mustAuth(session *cproto.Session, mid uint32, req *request) *Player {
	uid := p.store.VerifyToken(req.Token)
	if uid == "" {
		fail(p, session, mid, "登录态失效，请重新进入")
		return nil
	}
	player, err := p.store.Load(uid)
	if err != nil || player == nil {
		fail(p, session, mid, "档案不存在")
		return nil
	}
	return player
}
