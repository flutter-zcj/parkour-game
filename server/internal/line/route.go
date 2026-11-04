package line

import (
	cfacade "github.com/cherry-game/cherry/facade"
	clog "github.com/cherry-game/cherry/logger"
	cproto "github.com/cherry-game/cherry/net/proto"
)

// NodeRoute describes the target actor and function for a given cmd.
type (
	NodeRoute struct {
		NodeType string // target node type
		ActorID  string // target actor id
		FuncName string // target function name
	}

	// DataRouteFunc is called to route a decoded message to the target actor.
	DataRouteFunc func(agent *Agent, msg *Message, route *NodeRoute)
)

var (
	nodeRouteMap    = map[uint32]*NodeRoute{} // mid -> target route
	onDataRouteFunc = DefaultDataRoute        // data routing handler
)

// AddNodeRoute maps a mid (message id) to a NodeRoute for routing incoming messages.
func AddNodeRoute(mid uint32, nodeRoute *NodeRoute) {
	if nodeRoute == nil {
		return
	}
	nodeRouteMap[mid] = nodeRoute
}

// GetNodeRoute returns the NodeRoute for the given message id.
func GetNodeRoute(mid uint32) (*NodeRoute, bool) {
	routeActor, found := nodeRouteMap[mid]
	return routeActor, found
}

// DefaultDataRoute routes a decoded message to the target actor locally.
// 本服务为单机模式，只实现本地投递。
func DefaultDataRoute(agent *Agent, msg *Message, route *NodeRoute) {
	session := agent.NewSession(msg.MID)
	targetPath := cfacade.NewChildPath(agent.NodeID(), route.ActorID, session.Sid)
	LocalDataRoute(agent, session, msg, route, targetPath)
}

// LocalDataRoute posts a message to a local actor on this node.
func LocalDataRoute(agent *Agent, session *cproto.Session, msg *Message, nodeRoute *NodeRoute, targetPath string) {
	message := cfacade.GetMessage()
	message.Source = session.AgentPath
	message.Target = targetPath
	message.FuncName = nodeRoute.FuncName
	message.Session = session
	message.Args = msg.Data

	agent.ActorSystem().PostLocal(message)
}

// unused guard：保留 clog 引用以便调试时打开
var _ = clog.Warnf
