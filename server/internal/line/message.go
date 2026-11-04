package line

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"sync"
)

// Message is one decoded line-protocol message.
type Message struct {
	MID  uint32 // 分配给 cmd 的内部消息 ID
	CMD  string // 客户端指令名
	Data []byte // data 字段的原始 JSON 字节
}

var (
	cmdToMid   = map[string]uint32{}     // cmd -> mid
	midToCmd   = map[uint32]string{}     // mid -> cmd
	cmdMu      sync.RWMutex              // 注册表读写锁
)

// RegisterCMD 注册指令并分配消息 ID，重复注册返回既有 ID。
func RegisterCMD(cmd string) uint32 {
	cmdMu.Lock()
	defer cmdMu.Unlock()
	if mid, ok := cmdToMid[cmd]; ok {
		return mid
	}
	mid := allocMID()
	cmdToMid[cmd] = mid
	midToCmd[mid] = cmd
	return mid
}

// CMDOfMID returns the cmd name bound to a mid.
func CMDOfMID(mid uint32) (string, bool) {
	cmdMu.RLock()
	defer cmdMu.RUnlock()
	cmd, ok := midToCmd[mid]
	return cmd, ok
}

// wireMsg 与客户端约定的行协议载体。
type wireMsg struct {
	CMD  string          `json:"cmd"`
	Data json.RawMessage `json:"data"`
}

// parseLine 把一行 JSON 解析为内部 Message。
func parseLine(line []byte) (Message, bool) {
	trimmed := bytes.TrimSpace(line)
	if len(trimmed) == 0 {
		return Message{}, false
	}
	var wire wireMsg
	if err := json.Unmarshal(trimmed, &wire); err != nil || wire.CMD == "" {
		return Message{}, false
	}
	cmdMu.RLock()
	mid, ok := cmdToMid[wire.CMD]
	cmdMu.RUnlock()
	if !ok {
		return Message{}, false
	}
	data := []byte(wire.Data)
	if len(data) == 0 {
		data = []byte("{}")
	}
	return Message{MID: mid, CMD: wire.CMD, Data: data}, true
}

// pack 把待发送载荷按行协议打包：{"cmd":..,"data":..}\n。
// data 必须是已序列化的 JSON 字节。
func pack(mid uint32, data []byte) ([]byte, error) {
	cmd, ok := CMDOfMID(mid)
	if !ok {
		return nil, fmt.Errorf("mid %d not registered", mid)
	}
	buf := &bytes.Buffer{}
	buf.WriteString(`{"cmd":`)
	cmdJSON, _ := json.Marshal(cmd)
	buf.Write(cmdJSON)
	buf.WriteString(`,"data":`)
	if len(bytes.TrimSpace(data)) == 0 {
		buf.WriteString("{}")
	} else {
		buf.Write(bytes.TrimSpace(data))
	}
	buf.WriteString("}\n")
	return buf.Bytes(), nil
}

// ReadMessage 按行从缓冲读取并解析一条消息。
// 返回 isBreak=true 表示连接应关闭（EOF 或致命错误）。
func ReadMessage(reader *bufio.Reader) (msg Message, isBreak bool, err error) {
	line, err := readLine(reader)
	if err != nil {
		return Message{}, true, err
	}
	parsed, ok := parseLine(line)
	if !ok {
		// 非法行跳过，不断连接
		return Message{}, false, nil
	}
	return parsed, false, nil
}

// readLine 从缓冲读取一行，限制单行大小。
func readLine(reader *bufio.Reader) ([]byte, error) {
	var buf []byte
	for {
		chunk, err := reader.ReadSlice('\n')
		if err == bufio.ErrBufferFull {
			buf = append(buf, chunk...)
			if len(buf) > maxLineSize {
				return nil, io.ErrShortBuffer
			}
			continue
		}
		if err != nil {
			return nil, err
		}
		if buf == nil {
			return chunk, nil
		}
		buf = append(buf, chunk...)
		if len(buf) > maxLineSize {
			return nil, io.ErrShortBuffer
		}
		return buf, nil
	}
}
