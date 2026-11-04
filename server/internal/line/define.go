// Package line 提供 JSON 行协议的网络解析器。
// 包结构：一行一条消息，形如 {"cmd":"login","data":{...}}，与前端 ddz-net.js 的约定一致。
// 本包 fork 自 cherry/net/parser/simple，仅把二进制分帧(MID+Len+Data)替换为 JSON 行分帧。
package line

import (
	"encoding/binary"
	"sync/atomic"
	"time"
)

// Remote function name constants.
const (
	ResponseFuncName = "response"
)

// Package-level configuration shared by all line-protocol agents.
var (
	heartbeatTime                  = time.Second * 60 // heartbeat interval
	writeBacklog                   = 64               // write and pending channel buffer size
	endian        binary.ByteOrder = binary.BigEndian // byte order (kept for compatibility)
	maxLineSize                    = 1 << 20          // 单行最大字节数，防止恶意超长行
	midSeq                         = uint32(1000)     // cmd -> mid 自增分配器
)

// SetHeartbeatTime sets the heartbeat interval for agent connections.
// Values less than 1 second are ignored.
func SetHeartbeatTime(t time.Duration) {
	if t.Seconds() > 1 {
		heartbeatTime = t
	}
}

// SetWriteBacklog sets the size of the write and pending channel buffers.
func SetWriteBacklog(backlog int) {
	if backlog > 0 {
		writeBacklog = backlog
	}
}

// SetEndian sets the byte order (kept for API compatibility with simple package).
func SetEndian(e binary.ByteOrder) {
	if e != nil {
		endian = e
	}
}

// allocMID 分配一个全局自增的消息 ID。
func allocMID() uint32 {
	return atomic.AddUint32(&midSeq, 1)
}
