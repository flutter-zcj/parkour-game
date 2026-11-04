<template>
  <view class="hall">
    <view class="hall-sky"></view>
    <view class="hall-city">
      <view class="city-tower"></view>
      <view class="city-tower city-tower--2"></view>
      <view class="city-hall"></view>
      <view class="city-block city-block--1"></view>
      <view class="city-block city-block--2"></view>
      <view class="city-block city-block--3"></view>
      <view class="city-ground"></view>
    </view>

    <view class="top">
      <view class="top-row">
        <view class="back" @click="onBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="avatar">
          <view class="avatar-face">
            <view class="avatar-hat"></view>
            <view class="avatar-brow avatar-brow--l"></view>
            <view class="avatar-brow avatar-brow--r"></view>
            <view class="avatar-eye avatar-eye--l"></view>
            <view class="avatar-eye avatar-eye--r"></view>
            <view class="avatar-mouth"></view>
          </view>
          <text class="avatar-lv">{{ level }}</text>
        </view>
        <view class="uid">
          <text class="uid-line">ID-{{ uid }}</text>
          <text class="uid-line uid-line--sub">PH{{ uid }}</text>
        </view>
        <view class="flex1"></view>
        <view class="loc" @click="onEntry('定位')">
          <view class="loc-pin"></view>
          <text class="loc-text">宁波</text>
        </view>
      </view>

      <view class="top-row top-row--wallet">
        <view class="cur cur--gold" @click="onWallet('欢乐豆')">
          <view class="cur-icon cur-icon--bean"></view>
          <text class="cur-num">{{ beansText }}</text>
          <view class="cur-plus">+</view>
        </view>
        <view class="cur cur--red" @click="onWallet('奖券')">
          <view class="cur-icon cur-icon--ticket"></view>
          <text class="cur-num">{{ coupon }}</text>
          <view class="cur-plus">+</view>
        </view>
        <view class="flex1"></view>
        <view class="quick" @click="onEntry('保险箱')">
          <view class="quick-icon quick-icon--safe">
            <view class="safe-dial"></view>
          </view>
          <text class="quick-txt">保险箱</text>
        </view>
        <view class="quick" @click="onEntry('电视赛')">
          <view class="quick-icon quick-icon--tv">
            <view class="tv-screen"></view>
          </view>
          <text class="quick-txt">电视赛</text>
        </view>
        <view class="quick" @click="onEntry('公会')">
          <view class="quick-icon quick-icon--guild">
            <view class="guild-shield"></view>
          </view>
          <text class="quick-txt">公会</text>
        </view>
      </view>
    </view>

    <view class="rank">
      <text class="rank-title">排行榜</text>
      <view v-for="(face, i) in rankFaces" :key="i" class="rank-item" @click="onEntry('排行榜')">
        <view class="rank-face" :class="'rank-face--' + i"></view>
      </view>
      <view class="rank-more" @click="onEntry('排行榜')">
        <text class="rank-more-txt">›</text>
      </view>
    </view>

    <view class="gift" @click="onEntry('新手礼包')">
      <text class="gift-tag">待领取</text>
      <view class="gift-box">
        <view class="gift-lid"></view>
        <view class="gift-body"></view>
        <view class="gift-band"></view>
      </view>
      <text class="gift-txt">新手礼包</text>
    </view>

    <view class="main">
      <view class="banner" @click="onEntry('活动中心')">
        <view class="banner-glow"></view>
        <view class="skyline">
          <view class="sk sk--1"></view>
          <view class="sk sk--2"></view>
          <view class="sk-tower">
            <view class="tw-mast"></view>
            <view class="tw-arm tw-arm--1"></view>
            <view class="tw-arm tw-arm--2"></view>
            <view class="tw-body"></view>
            <view class="tw-base"></view>
          </view>
          <view class="sk sk--3"></view>
          <view class="sk sk--4"></view>
          <view class="sk sk--5"></view>
        </view>
        <view class="skyline skyline--far">
          <view class="fk fk--1"></view>
          <view class="fk fk--2"></view>
          <view class="fk fk--3"></view>
          <view class="fk fk--4"></view>
        </view>
        <view class="banner-ribbon"></view>
        <text class="banner-title">上电视</text>
        <text class="banner-title banner-title--2">去比赛</text>
        <view class="banner-go">
          <text class="banner-go-txt">›</text>
        </view>
      </view>

      <view class="grid">
        <view class="cell cell--red" @click="enterRoom(rooms[1])">
          <view class="cell-flag">经典</view>
          <view class="cell-face">
            <view class="cf-hat"></view>
            <view class="cf-brow cf-brow--l"></view>
            <view class="cf-brow cf-brow--r"></view>
            <view class="cf-eye cf-eye--l"></view>
            <view class="cf-eye cf-eye--r"></view>
            <view class="cf-stash"></view>
            <view class="cf-mouth"></view>
          </view>
          <view class="cell-foot">
            <text class="cell-name">经典地主</text>
            <text class="cell-hint">底分 100</text>
          </view>
        </view>

        <view class="cell cell--green" @click="enterRoom(rooms[2])">
          <view class="cell-tile">
            <text class="tile-txt">高</text>
          </view>
          <view class="cell-foot">
            <text class="cell-name">高级场</text>
            <text class="cell-hint cell-hint--light">1.9 万在线</text>
          </view>
        </view>

        <view class="cell cell--blue" @click="enterRoom(rooms[0])">
          <view class="cell-medal">
            <text class="medal-txt">新</text>
          </view>
          <view class="cell-foot">
            <text class="cell-name cell-name--sm">新手场</text>
            <text class="cell-hint cell-hint--light">3.2 万在线</text>
          </view>
        </view>

        <view class="cell cell--purple cell--sm" @click="onEntry('比赛')">
          <view class="cell-ico cell-ico--cup"></view>
          <text class="cell-name cell-name--plain">比赛</text>
        </view>
        <view class="cell cell--purple cell--sm" @click="onEntry('好友约战')">
          <view class="cell-free">免费</view>
          <view class="cell-ico cell-ico--friend"></view>
          <text class="cell-name cell-name--plain">好友约战</text>
        </view>
        <view class="cell cell--purple cell--sm" @click="onEntry('更多游戏')">
          <view class="cell-ico cell-ico--grid"></view>
          <text class="cell-name cell-name--plain">更多游戏</text>
        </view>

        <view class="cell cell--purple cell--sm cell--ops" @click="onEntry('每日签到')">
          <view class="cell-ico cell-ico--sign"></view>
          <text class="cell-name cell-name--plain">每日签到</text>
        </view>
        <view class="cell cell--purple cell--sm cell--ops" @click="onEntry('幸运转盘')">
          <view class="cell-ico cell-ico--wheel"></view>
          <text class="cell-name cell-name--plain">幸运转盘</text>
        </view>
        <view class="cell cell--start" @click="enterRoom(rooms[1])">
          <text class="start-txt">快速开始</text>
          <text class="start-sub">底分 100 · 秒开局</text>
        </view>
      </view>
    </view>

    <view class="nav">
      <view v-for="item in navs" :key="item.key" class="nav-item" @click="onEntry(item.name)">
        <view class="nav-icon" :class="'nav-icon--' + item.key">
          <text class="nav-glyph">{{ item.glyph }}</text>
        </view>
        <text class="nav-txt">{{ item.name }}</text>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * 游戏大厅页。
 * 版式依据宁波地主实机大厅效果图：淡蓝紫城市剪影背景、顶部方形头像与双货币、
 * 左侧排行榜浮条、右侧游戏宫格、底部八项功能导航与快速开始按钮。
 * 功能名取自原版 SceneTopTitleCfg3D，场次沿用新手场 / 普通场 / 高级场三档。
 */
export default
{
  data()
  {
    return {
      nickname: '玩家',
      uid: '5105996',
      level: 12,
      beans: 3680000,
      coupon: 0,
      rankFaces: [0, 1, 2],
      rooms: [
        {
          id: 'novice',
          name: '新手场',
          desc: '底分低，先熟悉规则再上桌',
          base: 10,
          gate: '0 豆',
          online: '3.2 万',
          tone: 'blue'
        },
        {
          id: 'normal',
          name: '经典场',
          desc: '标准三人斗地主，赢豆主战场',
          base: 100,
          gate: '1,000 豆',
          online: '8.6 万',
          tone: 'red'
        },
        {
          id: 'senior',
          name: '高级场',
          desc: '高底分对局，一局定输赢',
          base: 1000,
          gate: '10,000 豆',
          online: '1.9 万',
          tone: 'green'
        }
      ],
      navs: [
        { key: 'shop', name: '商城', glyph: '商' },
        { key: 'act', name: '活动', glyph: '活' },
        { key: 'task', name: '任务', glyph: '任' },
        { key: 'award', name: '领奖', glyph: '奖' },
        { key: 'mail', name: '邮件', glyph: '邮' },
        { key: 'pvp', name: '约战', glyph: '战' },
        { key: 'service', name: '客服', glyph: '服' },
        { key: 'more', name: '更多', glyph: '更' }
      ]
    };
  },

  computed:
  {
    /**
     * 欢乐豆展示文案
     * @returns {string} 文案
     */
    beansText()
    {
      const n = Number(this.beans) || 0;
      if (n >= 10000)
      {
        return (n / 10000).toFixed(1) + '万';
      }
      return String(n);
    }
  },

  mounted()
  {
    const saved = uni.getStorageSync('ddz_nickname');
    if (saved)
    {
      this.nickname = saved;
    }
    const coin = uni.getStorageSync('ddz_coin');
    if (coin)
    {
      this.beans = coin;
    }
    const uid = uni.getStorageSync('ddz_uid');
    if (uid)
    {
      this.uid = String(uid);
    }
    else
    {
      const gen = String(Math.floor(Math.random() * 9000000 + 1000000));
      uni.setStorageSync('ddz_uid', gen);
      this.uid = gen;
    }
  },

  methods:
  {
    /**
     * 进入指定场次的牌桌
     * @param {Object} room 场次配置
     * @returns {void}
     */
    enterRoom(room)
    {
      uni.setStorageSync('ddz_room', room.id);
      uni.setStorageSync('ddz_base', room.base);
      uni.navigateTo({ url: '/pages/game/ddz' });
    },

    /**
     * 返回上一页
     * @returns {void}
     */
    onBack()
    {
      const stack = getCurrentPages();
      if (stack.length > 1)
      {
        uni.navigateBack();
      }
      else
      {
        uni.showToast({ title: '已在大厅首页', icon: 'none' });
      }
    },

    /**
     * 统一的功能入口点击反馈
     * @param {string} name 入口名称
     * @returns {void}
     */
    onEntry(name)
    {
      uni.showToast({ title: name + '开放中', icon: 'none' });
    },

    /**
     * 货币入口点击
     * @param {string} name 货币名称
     * @returns {void}
     */
    onWallet(name)
    {
      uni.showToast({ title: '获取' + name, icon: 'none' });
    }
  }
};
</script>

<style lang="scss" scoped>
.hall { position: relative; width: 100%; height: 100vh; overflow: hidden; }
.flex1 { flex: 1; }

.hall-sky { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(180deg, #eaf2fc 0%, #d6e3f6 30%, #bfd2ec 58%, #a6bfdf 82%, #93aed2 100%); }
.hall-city { position: absolute; left: 0; right: 0; top: 620rpx; bottom: 122rpx; width: 100%; opacity: 0.72; -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #000000 46%, #000000 100%); }

.city-tower { position: absolute; left: 96rpx; bottom: 78rpx; width: 52rpx; height: 102rpx; background: #8ba7cb; border-radius: 4rpx 4rpx 0 0; }
.city-tower::before { content: ''; position: absolute; left: -14rpx; top: -18rpx; width: 80rpx; height: 24rpx; background: #7d9ac0; border-radius: 8rpx 8rpx 2rpx 2rpx; }
.city-tower::after { content: ''; position: absolute; left: 22rpx; top: -44rpx; width: 8rpx; height: 28rpx; background: #7d9ac0; }
.city-tower--2 { left: 158rpx; bottom: 74rpx; width: 38rpx; height: 82rpx; background: #9ab4d4; }
.city-tower--2::before { left: -10rpx; width: 58rpx; height: 20rpx; background: #8aa6c9; }
.city-tower--2::after { display: none; }

.city-hall { position: absolute; left: 24rpx; bottom: 62rpx; width: 300rpx; height: 70rpx; background: #93aecd; border-radius: 8rpx 8rpx 0 0; }
.city-hall::before { content: ''; position: absolute; left: -22rpx; top: -16rpx; width: 344rpx; height: 22rpx; background: #829dc0; border-radius: 10rpx 10rpx 0 0; }

.city-block { position: absolute; bottom: 56rpx; background: #a2bada; border-radius: 6rpx 6rpx 0 0; }
.city-block--1 { left: 356rpx; width: 92rpx; height: 124rpx; }
.city-block--2 { left: 462rpx; width: 128rpx; height: 86rpx; }
.city-block--3 { left: 604rpx; width: 104rpx; height: 148rpx; }
.city-ground { position: absolute; left: 0; bottom: 0; width: 100%; height: 40rpx; background: linear-gradient(180deg, #93aed2 0%, #a6bfdf 100%); }

.top { position: absolute; top: 0; left: 0; width: 100%; padding: 16rpx 20rpx 0; box-sizing: border-box; z-index: 6; }
.top-row { display: flex; align-items: center; }

.back { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: linear-gradient(180deg, #ffe08a, #f0a518); display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 0 #c07a0c, 0 6rpx 12rpx rgba(120, 70, 0, 0.18); }
.back-icon { font-size: 50rpx; line-height: 50rpx; color: #7a4400; font-weight: bold; margin-top: -8rpx; }

.avatar { position: relative; width: 84rpx; height: 84rpx; margin-left: 10rpx; border-radius: 16rpx; background: linear-gradient(180deg, #fff6dd, #f2cf92); border: 4rpx solid #f7d67a; box-shadow: 0 3rpx 0 #c9932c; }
.avatar-face { position: absolute; left: 5rpx; top: 5rpx; right: 5rpx; bottom: 5rpx; border-radius: 10rpx; background: linear-gradient(180deg, #dceafb, #aac7e8); overflow: hidden; }
.avatar-hat { position: absolute; left: 12rpx; top: 6rpx; width: 44rpx; height: 17rpx; border-radius: 11rpx 11rpx 3rpx 3rpx; background: linear-gradient(180deg, #f0553c, #c62b1c); }
.avatar-brow { position: absolute; top: 28rpx; width: 11rpx; height: 4rpx; border-radius: 3rpx; background: #6b3a16; }
.avatar-brow--l { left: 16rpx; }
.avatar-brow--r { right: 16rpx; }
.avatar-eye { position: absolute; top: 36rpx; width: 7rpx; height: 7rpx; border-radius: 50%; background: #2a1608; }
.avatar-eye--l { left: 18rpx; }
.avatar-eye--r { right: 18rpx; }
.avatar-mouth { position: absolute; left: 22rpx; top: 48rpx; width: 24rpx; height: 8rpx; border-radius: 0 0 10rpx 10rpx; background: #a8402e; }
.avatar-lv { position: absolute; left: -8rpx; bottom: -15rpx; padding: 0 9rpx; height: 25rpx; line-height: 25rpx; border-radius: 13rpx; background: #e8452c; border: 2rpx solid #fff2c8; color: #fff6d8; font-size: 17rpx; font-weight: bold; }

.uid { margin-left: 14rpx; }
.uid-line { display: block; font-size: 25rpx; color: #27476e; font-weight: bold; letter-spacing: 1rpx; text-shadow: 0 1rpx 0 rgba(255, 255, 255, 0.95), 0 0 8rpx rgba(255, 255, 255, 0.8); }
.uid-line--sub { margin-top: 2rpx; font-size: 20rpx; color: #5b7ea6; font-weight: normal; }

.loc { display: flex; align-items: center; height: 46rpx; padding: 0 16rpx 0 10rpx; border-radius: 23rpx; background: rgba(255, 255, 255, 0.9); box-shadow: 0 3rpx 8rpx rgba(50, 80, 130, 0.16); }
.loc-pin { width: 16rpx; height: 16rpx; border-radius: 50% 50% 50% 0; background: #3f8fd6; transform: rotate(-45deg); }
.loc-text { margin-left: 8rpx; font-size: 22rpx; color: #2f6fb4; font-weight: bold; }

.top-row--wallet { margin-top: 12rpx; }
.cur { display: flex; align-items: center; height: 52rpx; padding: 0 8rpx; margin-right: 10rpx; border-radius: 26rpx; box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, 0.55), 0 3rpx 8rpx rgba(50, 80, 130, 0.16); }
.cur--gold { background: linear-gradient(180deg, #8fc4f0, #5b9ed8); }
.cur--red { background: linear-gradient(180deg, #f0928a, #d8554a); }
.cur-icon { width: 36rpx; height: 36rpx; border-radius: 50%; flex-shrink: 0; }
.cur-icon--bean { background: radial-gradient(circle at 34% 28%, #fff8d8, #ffc21a 58%, #c88200); box-shadow: 0 0 0 2rpx rgba(255, 255, 255, 0.55); }
.cur-icon--ticket { background: radial-gradient(circle at 34% 28%, #ffe3a8, #f0a020 58%, #a86400); box-shadow: 0 0 0 2rpx rgba(255, 255, 255, 0.55); }
.cur-num { min-width: 68rpx; margin-left: 8rpx; font-size: 24rpx; color: #ffffff; font-weight: bold; text-shadow: 0 2rpx 3rpx rgba(20, 60, 110, 0.35); }
.cur-plus { width: 36rpx; height: 36rpx; line-height: 32rpx; text-align: center; border-radius: 50%; background: linear-gradient(180deg, #ffe07a, #f0a518); color: #7a4400; font-size: 26rpx; font-weight: bold; }

.quick { display: flex; flex-direction: column; align-items: center; margin-left: 14rpx; }
.quick-icon { position: relative; width: 46rpx; height: 42rpx; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 0 rgba(60, 20, 0, 0.35); }
.quick-icon--safe { background: linear-gradient(180deg, #ffd45e, #e08a10); }
.quick-icon--tv { background: linear-gradient(180deg, #7fd0ff, #2f8fd6); }
.quick-icon--guild { background: linear-gradient(180deg, #ff9a6a, #d8452c); }
.safe-dial { width: 18rpx; height: 18rpx; border-radius: 50%; border: 3rpx solid #8a5200; }
.tv-screen { width: 28rpx; height: 20rpx; border-radius: 3rpx; background: rgba(255, 255, 255, 0.85); }
.guild-shield { width: 20rpx; height: 24rpx; background: rgba(255, 255, 255, 0.9); border-radius: 4rpx 4rpx 50% 50%; }
.quick-txt { margin-top: 4rpx; font-size: 17rpx; color: #46688f; }

.rank { position: absolute; left: 14rpx; top: 300rpx; width: 92rpx; display: flex; flex-direction: column; align-items: center; z-index: 4; }
.rank-title { padding: 2rpx 8rpx; border-radius: 8rpx; background: rgba(95, 130, 180, 0.42); font-size: 18rpx; color: #ffffff; text-shadow: 0 1rpx 2rpx rgba(30, 60, 110, 0.6); }
.rank-item { width: 72rpx; height: 72rpx; margin-top: 12rpx; border-radius: 14rpx; background: linear-gradient(180deg, #fff3d0, #e8b95e); border: 3rpx solid #fff8e0; box-shadow: 0 3rpx 0 #b8822c; overflow: hidden; }
.rank-face { width: 100%; height: 100%; }
.rank-face--0 { background: radial-gradient(circle at 50% 36%, #ffe3c2 0%, #ffd08a 44%, #e8452c 45%, #c9301f 100%); }
.rank-face--1 { background: radial-gradient(circle at 50% 36%, #e8f4ff 0%, #a8d4f5 44%, #2f8fd6 45%, #1a5f96 100%); }
.rank-face--2 { background: radial-gradient(circle at 50% 36%, #fff5d6 0%, #ffd97a 44%, #3fc9a6 45%, #1fa383 100%); }
.rank-more { width: 54rpx; height: 38rpx; margin-top: 12rpx; border-radius: 19rpx; background: rgba(255, 255, 255, 0.82); display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 6rpx rgba(50, 80, 130, 0.14); }
.rank-more-txt { font-size: 28rpx; color: #4a6b96; line-height: 28rpx; margin-top: -4rpx; }

.gift { position: absolute; left: 12rpx; top: 782rpx; width: 96rpx; display: flex; flex-direction: column; align-items: center; z-index: 4; }
.gift-tag { padding: 0 8rpx; height: 24rpx; line-height: 24rpx; border-radius: 8rpx; background: #ffd45e; color: #7a4400; font-size: 16rpx; font-weight: bold; box-shadow: 0 2rpx 4rpx rgba(120, 70, 0, 0.25); }
.gift-box { position: relative; width: 62rpx; height: 58rpx; margin-top: 6rpx; }
.gift-lid { position: absolute; left: -2rpx; top: 0; width: 66rpx; height: 17rpx; border-radius: 5rpx; background: linear-gradient(180deg, #ff8a6a, #e8452c); }
.gift-body { position: absolute; left: 4rpx; top: 15rpx; width: 54rpx; height: 42rpx; border-radius: 0 0 5rpx 5rpx; background: linear-gradient(180deg, #ff7a5a, #cf2f1c); }
.gift-band { position: absolute; left: 26rpx; top: 0; width: 12rpx; height: 57rpx; background: #ffd45e; opacity: 0.9; }
.gift-txt { margin-top: 5rpx; font-size: 18rpx; color: #ffffff; font-weight: bold; text-shadow: 0 2rpx 3rpx rgba(40, 70, 120, 0.5); }

.main { position: absolute; left: 118rpx; right: 18rpx; top: 262rpx; }

.banner { position: relative; width: 100%; height: 300rpx; border-radius: 18rpx; overflow: hidden; background: linear-gradient(160deg, #f2e2ff 0%, #cfb4f0 40%, #9a7ad8 100%); border: 3rpx solid rgba(255, 255, 255, 0.9); box-shadow: 0 6rpx 16rpx rgba(70, 50, 130, 0.2); }
.banner-glow { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: radial-gradient(80% 60% at 50% 0%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 70%); }

.skyline { position: absolute; left: 0; right: 0; bottom: 78rpx; height: 210rpx; display: flex; align-items: flex-end; justify-content: space-around; padding: 0 10rpx; box-sizing: border-box; }
.skyline--far { bottom: 78rpx; height: 150rpx; opacity: 0.38; }
.sk { width: 54rpx; border-radius: 5rpx 5rpx 0 0; background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(206, 196, 240, 0.75)); }
.sk--1 { height: 108rpx; width: 62rpx; }
.sk--2 { height: 156rpx; width: 48rpx; }
.sk--3 { height: 132rpx; width: 58rpx; }
.sk--4 { height: 176rpx; width: 44rpx; }
.sk--5 { height: 96rpx; width: 64rpx; }

.sk-tower { position: relative; width: 40rpx; height: 200rpx; }
.tw-mast { position: absolute; left: 18rpx; top: 0; width: 4rpx; height: 30rpx; background: rgba(255, 255, 255, 0.95); }
.tw-arm { position: absolute; left: 2rpx; width: 36rpx; height: 4rpx; background: rgba(255, 255, 255, 0.9); }
.tw-arm--1 { top: 30rpx; }
.tw-arm--2 { top: 52rpx; left: 8rpx; width: 24rpx; }
.tw-body { position: absolute; left: 12rpx; top: 62rpx; width: 16rpx; height: 106rpx; border-radius: 6rpx 6rpx 0 0; background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(216, 206, 245, 0.8)); }
.tw-base { position: absolute; left: 2rpx; bottom: 0; width: 36rpx; height: 34rpx; border-radius: 5rpx 5rpx 0 0; background: rgba(255, 255, 255, 0.9); }

.fk { border-radius: 4rpx 4rpx 0 0; background: rgba(255, 255, 255, 0.8); }
.fk--1 { width: 70rpx; height: 76rpx; }
.fk--2 { width: 52rpx; height: 118rpx; }
.fk--3 { width: 84rpx; height: 62rpx; }
.fk--4 { width: 46rpx; height: 96rpx; }

.banner-ribbon { position: absolute; left: 0; bottom: 0; width: 100%; height: 96rpx; background: linear-gradient(180deg, rgba(110, 64, 190, 0) 0%, rgba(88, 46, 160, 0.8) 62%, rgba(72, 36, 140, 0.92) 100%); }
.banner-title { position: absolute; left: 22rpx; bottom: 52rpx; font-size: 42rpx; color: #ffffff; font-weight: bold; letter-spacing: 3rpx; text-shadow: 0 4rpx 0 #5a2e9c, 0 6rpx 10rpx rgba(50, 24, 90, 0.45); }
.banner-title--2 { bottom: 10rpx; left: 40rpx; font-size: 38rpx; }
.banner-go { position: absolute; right: 14rpx; bottom: 22rpx; width: 50rpx; height: 50rpx; border-radius: 50%; background: linear-gradient(180deg, #ffd45e, #f0a518); display: flex; align-items: center; justify-content: center; box-shadow: 0 3rpx 0 #b06a00; }
.banner-go-txt { font-size: 32rpx; color: #7a4400; line-height: 32rpx; margin-top: -4rpx; margin-left: 2rpx; }

.grid { display: flex; flex-wrap: wrap; justify-content: space-between; margin-top: 14rpx; }
.cell { position: relative; width: 32%; height: 206rpx; margin-bottom: 14rpx; border-radius: 16rpx; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; border: 3rpx solid rgba(255, 255, 255, 0.92); box-shadow: 0 5rpx 0 rgba(60, 50, 100, 0.2); }
.cell--sm { height: 128rpx; }
.cell--red { background: linear-gradient(165deg, #ffd45e 0%, #f57a2a 36%, #e5381f 100%); }
.cell--green { background: linear-gradient(165deg, #7ff0d0 0%, #2fc9a6 45%, #128a70 100%); }
.cell--blue { background: linear-gradient(165deg, #8fd0ff 0%, #3f97e8 45%, #1e5fb0 100%); }
.cell--purple { background: linear-gradient(165deg, #c8b8ff 0%, #9a86e8 45%, #6e58c8 100%); }

.cell-foot { position: relative; width: 100%; padding-bottom: 12rpx; display: flex; flex-direction: column; align-items: center; }
.cell-name { font-size: 33rpx; color: #ffffff; font-weight: bold; letter-spacing: 1rpx; text-shadow: 0 3rpx 0 rgba(90, 40, 0, 0.45), 0 4rpx 8rpx rgba(0, 0, 0, 0.18); }
.cell-name--sm { font-size: 29rpx; }
.cell-name--plain { font-size: 29rpx; text-shadow: 0 3rpx 0 rgba(70, 50, 130, 0.55); }
.cell-hint { margin-top: 3rpx; font-size: 18rpx; color: rgba(255, 255, 255, 0.86); }
.cell-hint--light { color: rgba(255, 255, 255, 0.8); }

.cell-flag { position: absolute; right: 0; top: 0; padding: 0 10rpx; height: 28rpx; line-height: 28rpx; background: #e5381f; border-radius: 0 0 0 12rpx; color: #fff2c8; font-size: 16rpx; font-weight: bold; }

.cell-face { position: absolute; left: 50%; top: 20rpx; width: 96rpx; height: 96rpx; margin-left: -48rpx; }
.cf-hat { position: absolute; left: 18rpx; top: 0; width: 60rpx; height: 26rpx; border-radius: 14rpx 14rpx 4rpx 4rpx; background: #ffd45e; box-shadow: 0 2rpx 0 #b06a00; }
.cf-brow { position: absolute; top: 38rpx; width: 20rpx; height: 6rpx; border-radius: 4rpx; background: #7a3c0a; }
.cf-brow--l { left: 20rpx; transform: rotate(-12deg); }
.cf-brow--r { right: 20rpx; transform: rotate(12deg); }
.cf-eye { position: absolute; top: 50rpx; width: 10rpx; height: 10rpx; border-radius: 50%; background: #5a2c08; }
.cf-eye--l { left: 26rpx; }
.cf-eye--r { right: 26rpx; }
.cf-stash { position: absolute; left: 22rpx; top: 64rpx; width: 52rpx; height: 12rpx; border-radius: 8rpx 8rpx 4rpx 4rpx; background: #7a3c0a; }
.cf-mouth { position: absolute; left: 38rpx; top: 76rpx; width: 20rpx; height: 8rpx; border-radius: 0 0 10rpx 10rpx; background: #a8402e; }

.cell-tile { position: absolute; left: 50%; top: 22rpx; width: 76rpx; height: 86rpx; margin-left: -38rpx; border-radius: 10rpx; background: linear-gradient(180deg, #fffdf4, #e8dfc8); box-shadow: 0 3rpx 0 #b8a480; display: flex; align-items: center; justify-content: center; }
.tile-txt { font-size: 44rpx; color: #d8352a; font-weight: bold; }

.cell-medal { position: absolute; left: 50%; top: 20rpx; width: 84rpx; height: 84rpx; margin-left: -42rpx; border-radius: 50%; background: radial-gradient(circle at 38% 30%, #ffe9a8, #f0a020 62%, #c06a00); border: 4rpx solid #fff3c8; display: flex; align-items: center; justify-content: center; }
.medal-txt { font-size: 38rpx; color: #7a2c00; font-weight: bold; }

.cell-ico { position: absolute; left: 50%; top: 22rpx; width: 44rpx; height: 44rpx; margin-left: -22rpx; }
.cell-ico--cup { background: linear-gradient(180deg, #fff3c8, #ffd45e); border-radius: 6rpx 6rpx 50% 50%; }
.cell-ico--friend { border-radius: 50%; background: linear-gradient(180deg, #ffffff, #d8e0f5); }
.cell-ico--grid { background: linear-gradient(180deg, #ffffff, #d8e0f5); border-radius: 6rpx; box-shadow: inset 14rpx 0 0 -8rpx #9a86e8, inset -14rpx 0 0 -8rpx #9a86e8, inset 0 14rpx 0 -8rpx #9a86e8, inset 0 -14rpx 0 -8rpx #9a86e8; }
.cell-ico--sign { background: linear-gradient(180deg, #fffdf4, #e8dfc8); border-radius: 6rpx; box-shadow: inset 0 -12rpx 0 -6rpx #9a86e8; }
.cell-ico--wheel { border-radius: 50%; background: conic-gradient(#ffd45e 0deg 60deg, #ffffff 60deg 120deg, #ffd45e 120deg 180deg, #ffffff 180deg 240deg, #ffd45e 240deg 300deg, #ffffff 300deg 360deg); box-shadow: 0 0 0 3rpx rgba(255, 255, 255, 0.9); }
.cell--ops { background: linear-gradient(165deg, #efe6ff 0%, #c9b8f5 45%, #9a86e8 100%); }
.cell--ops .cell-name--plain { color: #4a3570; text-shadow: 0 2rpx 0 rgba(255, 255, 255, 0.75); }

.cell--start { background: linear-gradient(180deg, #ffd85e 0%, #f5930f 52%, #dd6a0c 100%); border-color: #fff6d8; box-shadow: 0 6rpx 0 #a84e06, 0 0 22rpx rgba(255, 176, 40, 0.55); flex-direction: column; align-items: center; justify-content: center; padding-bottom: 0; }
.start-txt { font-size: 32rpx; color: #ffffff; font-weight: bold; letter-spacing: 2rpx; text-shadow: 0 3rpx 0 #a84e06; }
.start-sub { margin-top: 6rpx; font-size: 16rpx; color: #fff0c8; text-shadow: 0 2rpx 0 rgba(150, 70, 0, 0.5); }

.cell-free { position: absolute; left: 0; top: 0; padding: 0 10rpx; height: 26rpx; line-height: 26rpx; background: #e5381f; border-radius: 0 0 12rpx 0; color: #fff2c8; font-size: 16rpx; font-weight: bold; }


.nav { position: absolute; left: 0; bottom: 0; width: 100%; height: 122rpx; display: flex; align-items: center; justify-content: space-around; padding: 0 10rpx; box-sizing: border-box; background: linear-gradient(180deg, #a8301f 0%, #7a1c10 100%); border-top: 3rpx solid #e8a13a; }
.nav-item { display: flex; flex-direction: column; align-items: center; width: 80rpx; }
.nav-icon { width: 50rpx; height: 50rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 0 rgba(60, 10, 0, 0.45); }
.nav-icon--shop { background: linear-gradient(180deg, #ffe08a, #f0a518); }
.nav-icon--act { background: linear-gradient(180deg, #ffb07a, #e8602c); }
.nav-icon--task { background: linear-gradient(180deg, #9fe0ff, #2f8fd6); }
.nav-icon--award { background: linear-gradient(180deg, #ffe9a8, #e8b030); }
.nav-icon--mail { background: linear-gradient(180deg, #c8e8ff, #4a9ee0); }
.nav-icon--pvp { background: linear-gradient(180deg, #ffd0b0, #e8703c); }
.nav-icon--service { background: linear-gradient(180deg, #b8f0e0, #2fc9a6); }
.nav-icon--more { background: linear-gradient(180deg, #ffe08a, #e08a10); }
.nav-glyph { font-size: 25rpx; color: #6b2c00; font-weight: bold; }
.nav-txt { margin-top: 4rpx; font-size: 18rpx; color: #ffe9c0; }
</style>
