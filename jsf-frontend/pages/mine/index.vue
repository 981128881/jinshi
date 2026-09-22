<template>
	<view class="mine-page">
		<view class="mine-body">
			<view
				class="user-header"
				:class="{ 'user-header--guest': !userInfo.isLogin }"
				:style="{ paddingTop: (statusBarHeight + 30) + 'px' }"
			>
				<view v-if="userInfo.isLogin" class="user-info">
					<view class="avatar" @click="goSettings">
						<image v-if="userInfo.avatar" class="avatar-img" :src="userInfo.avatar" mode="aspectFill" />
						<text v-else class="avatar-text">{{ avatarText }}</text>
					</view>
					<view class="user-text">
						<view class="nickname-row" @click="goSettings">
							<view class="nickname-wrap">
								<text class="nickname">{{ userInfo.nickname }}</text>
							</view>
							<image class="settings-icon" src="/static/icons/settings.png" mode="aspectFit" />
						</view>
						<text v-if="userInfo.phone" class="login-tip">{{ maskedPhone }}</text>
						<text v-else class="login-tip">已登录 · 点击设置资料</text>
					</view>
				</view>

				<view v-else class="guest-info">
					<image class="guest-avatar" src="/static/icons/default-avatar.png" mode="aspectFill" />
					<view class="guest-text">
						<text class="guest-title">请登录/注册您的账号</text>
						<view class="guest-login-btn" @click="goLogin">
							<text class="guest-login-text">点击登录</text>
							<text class="guest-login-arrow">›</text>
						</view>
					</view>
				</view>
			</view>

			<view class="order-card">
				<view class="card-header">
					<text class="card-title">我的预约</text>
					<text class="card-more" @click="goOrders(0)">全部预约 ›</text>
				</view>
				<view class="order-status">
					<view v-for="item in orderTabs" :key="item.status" class="status-item" @click="goOrders(item.status)">
						<image class="status-icon-img" :src="item.icon" mode="aspectFit" />
						<text class="status-label">{{ item.label }}</text>
						<view v-if="item.showCount !== false && orderCounts[item.key]" class="status-badge">{{ orderCounts[item.key] }}</view>
					</view>
				</view>
			</view>

			<view class="order-card merchant-card" @click="goMerchant">
				<view class="merchant-row">
					<view class="merchant-text">
						<text class="card-title">{{ hasShop ? '商家中心' : '商家入驻' }}</text>
						<text class="merchant-sub">{{ merchantSub }}</text>
					</view>
					<text class="card-more">›</text>
				</view>
			</view>
		</view>

		<view v-if="userInfo.isLogin" class="logout-section">
			<button
				class="logout-btn"
				:loading="isLoading('logout')"
				:disabled="isLoading('logout')"
				@click="handleLogout"
			>退出登录</button>
		</view>
		<AppHost />
	</view>
</template>

<script>
	import pageBase from '../../mixins/page-base.js'
	import { useUserStore } from '../../stores/user.js'
	import { logout } from '../../utils/auth.js'
	import { showConfirm } from '../../utils/modal.js'
	import ROUTES from '../../constants/routes.js'
	import { get } from '../../utils/request.js'

	export default {
		mixins: [pageBase],
		data() {
			return {
				statusBarHeight: 0,
				merchantShops: [],
				orderTabs: [
					{ status: 'submitted', key: 'submitted', label: '待接单', icon: '/static/icons/order/pay.png', showCount: true },
					{ status: 'accepted', key: 'accepted', label: '制作中', icon: '/static/icons/order/ship.png', showCount: true },
					{ status: 'ready', key: 'ready', label: '待取餐', icon: '/static/icons/order/receive.png', showCount: true },
					{ status: 'completed', key: 'completed', label: '已完成', icon: '/static/icons/order/done.png', showCount: false }
				]
			}
		},
		computed: {
			userStore() { return useUserStore() },
			userInfo() { return this.userStore.userInfo },
			orderCounts() { return this.userStore.orderCounts },
			avatarText() { return (this.userInfo.nickname || '微').charAt(0) },
			maskedPhone() {
				const p = this.userInfo.phone || ''
				return p.length >= 11 ? p.slice(0, 3) + '****' + p.slice(-4) : p
			},
			hasShop() {
				return this.merchantShops.length > 0
			},
			merchantSub() {
				if (!this.hasShop) return '申请开店或查看审核进度'
				const name = this.merchantShops[0]?.restaurant?.name
				return name ? `${name} · 接单与菜单` : '接单、菜单与店铺码'
			}
		},
		onShow() {
			if (this.userStore.isLogin) {
				this.userStore.loadOrderCounts()
				this.loadMerchant()
			} else {
				this.merchantShops = []
			}
		},
		onLoad() {
			const sysInfo = uni.getSystemInfoSync()
			this.statusBarHeight = sysInfo.statusBarHeight || 0
		},
		methods: {
			goLogin() {
				uni.navigateTo({ url: ROUTES.LOGIN })
			},
			goSettings() {
				if (!this.userInfo.isLogin) {
					this.requireLogin()
					return
				}
				uni.navigateTo({ url: ROUTES.SETTINGS })
			},
			requireLogin() {
				return showConfirm('请先登录后再操作', '提示', {
					confirmText: '去登录',
					cancelText: '取消'
				}).then((res) => {
					if (res.confirm) this.goLogin()
					return false
				})
			},
			async handleLogout() {
				const res = await showConfirm('确定退出登录吗？', '退出登录', {
					type: 'danger',
					confirmText: '退出',
					cancelText: '再想想'
				})
				if (res.confirm) {
					await this.runAction('logout', async () => logout())
				}
			},
			goOrders(status) {
				if (!this.userInfo.isLogin) {
					this.requireLogin()
					return
				}
				const key = !status || status === 0 || status === '0' ? 'all' : String(status)
				uni.setStorageSync('reservation_list_status', key)
				uni.navigateTo({ url: ROUTES.RESERVATION_LIST })
			},
			async loadMerchant() {
				try {
					this.merchantShops = (await get('/merchant/restaurants', {}, { auth: true, showError: false })) || []
				} catch (e) {
					this.merchantShops = []
				}
			},
			goMerchant() {
				if (!this.userInfo.isLogin) {
					this.requireLogin()
					return
				}
				uni.navigateTo({
					url: this.hasShop ? ROUTES.MERCHANT_HOME : ROUTES.ONBOARDING_APPLY
				})
			}
		}
	}
</script>

<style scoped>
.mine-page {
	min-height: 100vh;
	background: var(--color-bg);
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
}
.mine-body {
	flex: 1;
	padding-bottom: 24rpx;
	background: linear-gradient(165deg, #E8EFE4 0%, #F5F4F0 48%, #F5F4F0 100%);
	background-repeat: no-repeat;
	background-size: 100% 520rpx;
}
.user-header {
	background: transparent;
	padding: 0 32rpx 48rpx;
}
.user-header--guest {
	padding-bottom: 40rpx;
}
.user-info { display: flex; align-items: center; }
.avatar {
	width: 120rpx; height: 120rpx; border-radius: 50%;
	background: rgba(255, 255, 255, 0.85);
	border: 4rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 0 8rpx 24rpx rgba(136, 168, 123, 0.18);
	display: flex; align-items: center; justify-content: center;
	margin-right: 24rpx; overflow: hidden;
	flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; }
.avatar-text { font-size: 48rpx; color: var(--color-primary-dark); font-weight: 600; }
.user-text {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}
.nickname-row {
	display: flex;
	align-items: center;
	min-width: 0;
	margin-bottom: 8rpx;
}
.nickname-wrap {
	flex: 1;
	min-width: 0;
	overflow: hidden;
}
.nickname {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 36rpx;
	color: var(--color-text);
	font-weight: 600;
}
.settings-icon {
	width: 36rpx;
	height: 36rpx;
	margin-left: 12rpx;
	flex-shrink: 0;
}
.login-tip { font-size: 24rpx; color: #6B7280; }
.guest-info {
	display: flex;
	align-items: center;
}
.guest-avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	margin-right: 24rpx;
	flex-shrink: 0;
	background: rgba(255, 255, 255, 0.9);
	border: 4rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 0 8rpx 24rpx rgba(136, 168, 123, 0.18);
}
.guest-text {
	flex: 1;
	display: flex;
	flex-direction: column;
}
.guest-title {
	font-size: 32rpx;
	color: var(--color-text);
	font-weight: 600;
	margin-bottom: 20rpx;
}
.guest-login-btn {
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	padding: 10rpx 28rpx;
	background: #ffffff;
	border-radius: 9999px;
	box-shadow: 0 4rpx 16rpx rgba(136, 168, 123, 0.16);
}
.guest-login-text {
	font-size: 24rpx;
	color: var(--color-primary-dark);
	font-weight: 500;
}
.guest-login-arrow {
	font-size: 28rpx;
	color: var(--color-primary-dark);
	margin-left: 4rpx;
	line-height: 1;
}
.order-card {
	background: #fff;
	margin: -24rpx 24rpx 24rpx;
	border-radius: 24rpx;
	padding: 28rpx 24rpx;
	box-shadow: 0 8rpx 28rpx rgba(15, 23, 42, 0.06);
}
.user-header--guest + .order-card {
	margin-top: 0;
}
.merchant-card {
	margin-top: 0;
}
.merchant-row {
	display: flex;
	align-items: center;
}
.merchant-text {
	flex: 1;
	min-width: 0;
}
.merchant-sub {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: var(--color-icon-base);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.card-header { display: flex; justify-content: space-between; margin-bottom: 24rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: var(--color-text); }
.card-more { font-size: 24rpx; color: var(--color-icon-base); }
.order-status { display: flex; justify-content: space-around; }
.status-item { display: flex; flex-direction: column; align-items: center; position: relative; padding: 8rpx 16rpx; }
.status-icon-img {
	width: 64rpx;
	height: 64rpx;
	margin-bottom: 8rpx;
}
.status-label { font-size: 24rpx; color: var(--color-icon-base); }
.status-badge {
	position: absolute; top: 0; right: 0; background: var(--color-icon-accent); color: #fff;
	font-size: 20rpx; min-width: 32rpx; height: 32rpx; border-radius: 9999px;
	display: flex; align-items: center; justify-content: center; padding: 0 8rpx;
}
.logout-section {
	margin-top: auto;
	padding: 32rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
	width: 100%;
	background: var(--color-bg);
}
.logout-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	margin: 0;
	padding: 0;
	border: 2rpx solid var(--color-primary);
	border-radius: 9999px;
	background: var(--color-primary-soft);
	color: var(--color-primary-dark);
	font-size: 28rpx;
	font-weight: 500;
}
.logout-btn::after {
	border: none;
}
.logout-btn[disabled] {
	opacity: 0.6;
}
</style>
