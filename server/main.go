// Package game 的 doc.go 已并入 store.go；本文件为主程序装配。
package main

import (
	"flag"
	"time"

	cherry "github.com/cherry-game/cherry"
	cconnector "github.com/cherry-game/cherry/net/connector"
	clog "github.com/cherry-game/cherry/logger"
	cserializer "github.com/cherry-game/cherry/net/serializer"

	"github.com/flutter-zcj/parkour-server/internal/game"
	"github.com/flutter-zcj/parkour-server/internal/line"
)

// 命令行参数：profile 路径、节点 ID、类型名。
var (
	profilePath = flag.String("profile", "etc/parkour.json", "profile 文件路径")
	nodeID      = flag.String("node", "parkour-1", "节点 ID")
	nodeType    = flag.String("type", "parkour", "节点类型")
	httpAddr    = flag.String("http", "", "健康检查 HTTP 地址（可选）")
)

func main() {
	flag.Parse()

	app := cherry.Configure(*profilePath, *nodeID, true, cherry.Standalone)
	app.SetSerializer(cserializer.NewJSON())

	store := newStore(app)

	agentActor := line.NewActor("user")
	agentActor.AddConnector(cconnector.NewWS(":9108"))
	agentActor.SetOnNewAgent(func(newAgent *line.Agent) {
		newAgent.AddOnClose(func(a *line.Agent) {
			clog.Infof("[gate] session closed. [sid = %s]", a.SID())
		})
		childActor := game.NewPlayerActor(store)
		agentActor.Child().Create(newAgent.SID(), childActor)
		childActor.RegisterAll()
	})
	agentActor.SetHeartbeatTime(600 * time.Second)

	// 注册 cmd -> 方法 路由
	register := func(cmd, fn string) {
		agentActor.RegisterRoute(cmd, &line.NodeRoute{NodeType: *nodeType, ActorID: "user", FuncName: fn})
	}
	register("login", "Login")
	register("player_info", "PlayerInfo")
	register("run_end", "RunEnd")
	register("revive", "Revive")
	register("box_draw", "BoxDraw")
	register("rank_list", "RankList")
	register("use_role", "UseRole")
	register("ping", "Ping")

	app.SetNetParser(agentActor)
	app.AddActors(agentActor)
	app.Startup()
}

// newStore 从 profile settings 读取数据目录与密钥。
func newStore(app *cherry.AppBuilder) *game.Store {
	dataDir := "/root/zbcx/parkour-data"
	secret := "parkour-secret-please-change"
	if v := app.Settings().GetString("data_dir"); v != "" {
		dataDir = v
	}
	if v := app.Settings().GetString("jwt_secret"); v != "" {
		secret = v
	}
	store, err := game.NewStore(dataDir, secret)
	if err != nil {
		clog.Panicf("init store fail: %v", err)
	}
	clog.Infof("[main] store ready. data_dir = %s", dataDir)
	return store
}

