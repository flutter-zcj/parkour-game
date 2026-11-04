// Package game 跑酷游戏的业务层：玩家档案、结算上报、盲盒抽奖与排行榜。
// 存储采用 JSON 文件（每玩家一档），适合单机小规模部署；并发由 actor 串行化保证。
package game

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// 玩家初始数值与经济参数，与需求文档《竞品还原需求规格说明书》一致。
const (
	InitialCoins        = 500  // 初始金币
	InitialEnergy       = 30   // 初始体力
	MaxEnergy           = 30   // 体力上限
	EnergyRecoverSec    = 360  // 每 6 分钟恢复 1 点体力
	ReviveCostCoins     = 300  // 复活一次消耗金币
	BoxDrawCostDiamonds = 20   // 盲盒单抽钻石
	MaxNicknameLen      = 16   // 昵称最大长度
	MaxTopRank          = 100  // 排行榜保留条数
	MaxSavePerPlayer    = 1    // 每玩家档案份数
)

// Rarity 指盲盒奖品稀有度。
type Rarity string

// 四档稀有度，概率见 BoxProb。
const (
	RarityCommon   Rarity = "common"   // 普通
	RarityRare     Rarity = "rare"     // 稀有
	RarityEpic     Rarity = "epic"     // 史诗
	RarityLegendary Rarity = "legendary" // 传说
)

// BoxProb 盲盒稀有度概率表，合计 100%。
var BoxProb = []struct {
	Rarity Rarity
	Weight int
}{
	{RarityCommon, 70},
	{RarityRare, 20},
	{RarityEpic, 8},
	{RarityLegendary, 2},
}

// BoxPrize 奖池条目。
type BoxPrize struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Rarity Rarity `json:"rarity"`
	Kind   string `json:"kind"` // role / skin / item / coins
	Value  int    `json:"value"`
}

// BoxPrizes 预置奖池，与原作「角色 + 皮肤碎片 + 道具」的结构对应，名称做合规替换。
var BoxPrizes = []BoxPrize{
	{ID: "role_forest", Name: "森林游侠", Rarity: RarityCommon, Kind: "role", Value: 1},
	{ID: "role_ninja", Name: "疾风忍者", Rarity: RarityCommon, Kind: "role", Value: 1},
	{ID: "role_santa", Name: "雪原使者", Rarity: RarityRare, Kind: "role", Value: 1},
	{ID: "role_dino", Name: "恐龙侠客", Rarity: RarityRare, Kind: "role", Value: 1},
	{ID: "role_pilot", Name: "电玩飞侠", Rarity: RarityEpic, Kind: "role", Value: 1},
	{ID: "role_astronaut", Name: "太空漫步者", Rarity: RarityEpic, Kind: "role", Value: 1},
	{ID: "item_magnet", Name: "磁铁", Rarity: RarityCommon, Kind: "item", Value: 1},
	{ID: "item_shield", Name: "护盾", Rarity: RarityCommon, Kind: "item", Value: 1},
	{ID: "item_double", Name: "双倍得分", Rarity: RarityCommon, Kind: "item", Value: 1},
	{ID: "coins_100", Name: "金币 100", Rarity: RarityCommon, Kind: "coins", Value: 100},
	{ID: "coins_500", Name: "金币 500", Rarity: RarityRare, Kind: "coins", Value: 500},
	{ID: "coins_2000", Name: "金币 2000", Rarity: RarityEpic, Kind: "coins", Value: 2000},
	{ID: "role_king", Name: "森林之王", Rarity: RarityLegendary, Kind: "role", Value: 1},
}

// DailyTask 每日任务定义。
type DailyTask struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Goal  int    `json:"goal"`
	Reward int   `json:"reward"`
}

// DailyTasks 每日任务表（3 条，对齐原作「任务链」的轻量版）。
var DailyTasks = []DailyTask{
	{ID: "distance_2000", Name: "单日累计跑 2000 米", Goal: 2000, Reward: 200},
	{ID: "coins_300", Name: "单日收集 300 金币", Goal: 300, Reward: 150},
	{ID: "runs_5", Name: "完成 5 局", Goal: 5, Reward: 300},
}

// DailyState 玩家当日任务进度。
type DailyState struct {
	Date     string         `json:"date"`      // YYYY-MM-DD
	Distance int            `json:"distance"`  // 累计米数
	Coins    int            `json:"coins"`     // 累计金币
	Runs     int            `json:"runs"`      // 完成局数
	Done     map[string]bool `json:"done"`     // 已领奖任务
}

// EnergyState 体力池。
type EnergyState struct {
	Value    int   `json:"value"`
	UpdateAt int64 `json:"update_at"` // 上次结算时间戳（秒）
}

// Player 玩家档案（持久化单位）。
type Player struct {
	UID           string            `json:"uid"`
	Nickname      string            `json:"nickname"`
	Coins         int               `json:"coins"`
	Diamonds      int               `json:"diamonds"`
	BestScore     int               `json:"best_score"`
	TotalRuns     int               `json:"total_runs"`
	TotalDistance int               `json:"total_distance"`
	Roles         []string          `json:"roles"`
	UsingRole     string            `json:"using_role"`
	Items         map[string]int    `json:"items"`
	Daily         DailyState        `json:"daily"`
	Energy        EnergyState       `json:"energy"`
	TokenIssuedAt int64             `json:"token_issued_at"`
	UpdatedAt     int64             `json:"updated_at"`
}

// RankEntry 排行榜条目。
type RankEntry struct {
	UID      string `json:"uid"`
	Nickname string `json:"nickname"`
	Score    int    `json:"score"`
	UpdateAt int64  `json:"update_at"`
}

// Store 玩家档案与排行榜的文件存储。
type Store struct {
	dir     string            // 存档目录
	jwtKey  []byte            // 签发密钥
	mu      sync.RWMutex      // 排行榜读写锁
	ranking []RankEntry       // 排行榜内存副本
}

// NewStore 创建存储，目录不存在则建立。
func NewStore(dir, jwtSecret string) (*Store, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	s := &Store{dir: dir, jwtKey: []byte(jwtSecret)}
	s.loadRanking()
	return s, nil
}

// savePath 计算玩家档案路径。
func (s *Store) savePath(uid string) string {
	return filepath.Join(s.dir, "player_"+uid+".json")
}

// Load 读取玩家档案，不存在则返回 nil。
func (s *Store) Load(uid string) (*Player, error) {
	data, err := os.ReadFile(s.savePath(uid))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	p := &Player{}
	if err := json.Unmarshal(data, p); err != nil {
		return nil, fmt.Errorf("parse player %s: %w", uid, err)
	}
	return p, nil
}

// Save 落盘玩家档案。
func (s *Store) Save(p *Player) error {
	p.UpdatedAt = time.Now().Unix()
	data, err := json.Marshal(p)
	if err != nil {
		return err
	}
	tmp := s.savePath(p.UID) + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.savePath(p.UID))
}

// CreateNew 建立新档案：随机 UID、初始经济、默认角色。
func (s *Store) CreateNew(nickname string) *Player {
	uid := randomUID()
	if nickname == "" {
		nickname = "跑者" + uid[len(uid)-4:]
	}
	if len([]rune(nickname)) > MaxNicknameLen {
		nickname = string([]rune(nickname)[:MaxNicknameLen])
	}
	now := time.Now().Unix()
	p := &Player{
		UID:       uid,
		Nickname:  nickname,
		Coins:     InitialCoins,
		Diamonds:  50,
		Roles:     []string{"role_forest"},
		UsingRole: "role_forest",
		Items:     map[string]int{"magnet": 1, "shield": 1},
		Daily:     DailyState{Date: today(), Done: map[string]bool{}},
		Energy:    EnergyState{Value: InitialEnergy, UpdateAt: now},
		TokenIssuedAt: now,
	}
	return p
}

// Settle 结算一局：入账金币、更新最高分与每日任务，返回结算摘要。
func (s *Store) Settle(p *Player, score, distance, coins int) (map[string]interface{}, error) {
	ensureDaily(p)
	p.Coins += coins
	p.TotalRuns++
	p.TotalDistance += distance
	p.Daily.Distance += distance
	p.Daily.Coins += coins
	p.Daily.Runs++

	bestBefore := p.BestScore
	if score > p.BestScore {
		p.BestScore = score
	}

	rewards := checkTasks(p)
	if err := s.Save(p); err != nil {
		return nil, err
	}

	myRank, _ := s.UpdateRank(p.UID, p.Nickname, score)
	return map[string]interface{}{
		"coins_added":  coins,
		"total_coins":  p.Coins,
		"score":        score,
		"best":         p.BestScore,
		"new_record":   score > bestBefore,
		"rank":         myRank,
		"task_rewards": rewards,
		"daily":        p.Daily,
		"energy":       p.Energy,
	}, nil
}

// ensureDaily 惰性重置每日任务与体力池。
func ensureDaily(p *Player) {
	now := time.Now().Unix()
	if p.Daily.Date != today() {
		p.Daily = DailyState{Date: today(), Done: map[string]bool{}}
	}
	if p.Energy.Value < MaxEnergy && now-p.Energy.UpdateAt >= EnergyRecoverSec {
		gain := int((now - p.Energy.UpdateAt) / EnergyRecoverSec)
		p.Energy.Value += gain
		if p.Energy.Value > MaxEnergy {
			p.Energy.Value = MaxEnergy
			p.Energy.UpdateAt = now
		} else {
			p.Energy.UpdateAt += int64(gain * EnergyRecoverSec)
		}
	}
}

// checkTasks 结算后判定达成并自动发奖。
func checkTasks(p *Player) []string {
	rewards := make([]string, 0)
	for _, t := range DailyTasks {
		if p.Daily.Done[t.ID] {
			continue
		}
		reached := false
		switch t.ID {
		case "distance_2000":
			reached = p.Daily.Distance >= t.Goal
		case "coins_300":
			reached = p.Daily.Coins >= t.Goal
		case "runs_5":
			reached = p.Daily.Runs >= t.Goal
		}
		if reached {
			p.Daily.Done[t.ID] = true
			p.Coins += t.Reward
			rewards = append(rewards, t.Name)
		}
	}
	return rewards
}

// UpdateRank 更新排行榜并返回名次（0 表示未上榜）。
func (s *Store) UpdateRank(uid, nickname string, score int) (int, error) {
	if score <= 0 {
		return s.myRank(uid), nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().Unix()
	found := false
	for i := range s.ranking {
		if s.ranking[i].UID == uid {
			if score > s.ranking[i].Score {
				s.ranking[i].Score = score
				s.ranking[i].Nickname = nickname
				s.ranking[i].UpdateAt = now
			}
			found = true
			break
		}
	}
	if !found {
		s.ranking = append(s.ranking, RankEntry{UID: uid, Nickname: nickname, Score: score, UpdateAt: now})
	}
	sort.SliceStable(s.ranking, func(i, j int) bool { return s.ranking[i].Score > s.ranking[j].Score })
	if len(s.ranking) > MaxTopRank {
		s.ranking = s.ranking[:MaxTopRank]
	}
	if err := s.saveRanking(); err != nil {
		return 0, err
	}
	return s.myRankLocked(uid), nil
}

// Top 返回前 N 名。
func (s *Store) Top(n int) []RankEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if n > len(s.ranking) {
		n = len(s.ranking)
	}
	out := make([]RankEntry, n)
	copy(out, s.ranking[:n])
	return out
}

// myRank 计算玩家名次（带锁包装）。
func (s *Store) myRank(uid string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.myRankLocked(uid)
}

// myRankLocked 计算名次（调用方需已持锁）。
func (s *Store) myRankLocked(uid string) int {
	for i := range s.ranking {
		if s.ranking[i].UID == uid {
			return i + 1
		}
	}
	return 0
}

// rankingPath 排行榜落盘路径。
func (s *Store) rankingPath() string {
	return filepath.Join(s.dir, "ranking.json")
}

// loadRanking 启动时恢复排行榜。
func (s *Store) loadRanking() {
	data, err := os.ReadFile(s.rankingPath())
	if err != nil {
		return
	}
	var list []RankEntry
	if json.Unmarshal(data, &list) == nil {
		s.ranking = list
	}
}

// saveRanking 排行榜落盘。
func (s *Store) saveRanking() error {
	data, err := json.Marshal(s.ranking)
	if err != nil {
		return err
	}
	return os.WriteFile(s.rankingPath(), data, 0o644)
}

// DrawBox 单抽一次盲盒，扣钻石并结算奖励，返回奖品。
func (s *Store) DrawBox(p *Player) (BoxPrize, error) {
	if p.Diamonds < BoxDrawCostDiamonds {
		return BoxPrize{}, fmt.Errorf("钻石不足，单抽需 %d", BoxDrawCostDiamonds)
	}
	p.Diamonds -= BoxDrawCostDiamonds
	prize := rollPrize()
	applyPrize(p, prize)
	if err := s.Save(p); err != nil {
		return BoxPrize{}, err
	}
	return prize, nil
}

// rollPrize 按概率表随机一条奖品。
func rollPrize() BoxPrize {
	total := 0
	for _, e := range BoxProb {
		total += e.Weight
	}
	r := randInt(total)
	acc := 0
	rarity := RarityCommon
	for _, e := range BoxProb {
		acc += e.Weight
		if r < acc {
			rarity = e.Rarity
			break
		}
	}
	pool := make([]BoxPrize, 0)
	for _, p := range BoxPrizes {
		if p.Rarity == rarity {
			pool = append(pool, p)
		}
	}
	return pool[randInt(len(pool))]
}

// applyPrize 把奖品写入档案。
func applyPrize(p *Player, prize BoxPrize) {
	switch prize.Kind {
	case "coins":
		p.Coins += prize.Value
	case "item":
		p.Items[prize.ID[len("item_"):]] += prize.Value
	case "role", "skin":
		exists := false
		for _, r := range p.Roles {
			if r == prize.ID {
				exists = true
				break
			}
		}
		// 重复抽到角色折算为 500 金币
		if exists {
			p.Coins += 500
		} else {
			p.Roles = append(p.Roles, prize.ID)
		}
	}
}

// IssueToken 为玩家签发 HMAC-SHA256 的会话令牌。
func (s *Store) IssueToken(uid string, at int64) string {
	payload := fmt.Sprintf("%s.%d", uid, at)
	mac := hmac.New(sha256.New, s.jwtKey)
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil)) + "." + payload
}

// VerifyToken 校验令牌并返回 UID；非法或超期（30 天）返回空。
func (s *Store) VerifyToken(token string) string {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return ""
	}
	payload := parts[1]
	mac := hmac.New(sha256.New, s.jwtKey)
	mac.Write([]byte(payload))
	want := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(want), []byte(parts[0])) {
		return ""
	}
	seg := strings.SplitN(payload, ".", 2)
	if len(seg) != 2 {
		return ""
	}
	var issued int64
	if _, err := fmt.Sscanf(seg[1], "%d", &issued); err != nil {
		return ""
	}
	if time.Since(time.Unix(issued, 0)) > 30*24*time.Hour {
		return ""
	}
	return seg[0]
}

// randomUID 生成 12 位十六进制随机 ID。
func randomUID() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// randInt 返回 [0,n) 的随机整数。
func randInt(n int) int {
	if n <= 0 {
		return 0
	}
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	v := int(b[0])<<24 | int(b[1])<<16 | int(b[2])<<8 | int(b[3])
	if v < 0 {
		v = -v
	}
	return v % n
}

// today 返回本地日期串 YYYY-MM-DD。
func today() string {
	return time.Now().Format("2006-01-02")
}
