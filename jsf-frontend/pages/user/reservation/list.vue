<template>
	<view class="page">
		<view class="tabs">
			<view
				v-for="t in tabs"
				:key="t.key"
				class="tab"
				:class="{ active: filterStatus === t.status }"
				@tap="selectTab(t.status)"
			>
				<text class="tab-text">{{ t.label }}</text>
			</view>
		</view>

		<view v-if="needLogin" class="empty-box">
			<text class="empty-text">登录后查看预约单</text>
			<button class="btn" @click="goLogin">去登录</button>
		</view>
		<template v-else>
			<view v-for="o in list" :key="o.id" class="card" @tap="goDetail(o.id)">
				<view class="head">
					<text class="name">{{ o.restaurantName || '餐厅' }}</text>
					<text class="status" :class="'st-' + o.status">{{ statusText(o.status) }}</text>
				</view>
				<view class="items">{{ itemSummary(o) }}</view>
				<view class="meta" v-if="o.reserveAt">
					<text class="meta-label">预约时间</text>
					<text class="meta-val">{{ formatTime(o.reserveAt) }}</text>
				</view>
				<view class="meta" v-if="o.contactName || o.contactPhone">
					<text class="meta-label">联系人</text>
					<text class="meta-val">{{ o.contactName || '—' }} {{ o.contactPhone || '' }}</text>
				</view>
				<view class="foot">
					<text class="amount">¥{{ formatAmount(o.totalAmount) }}</text>
					<text class="time">下单 {{ formatTime(o.createdAt) }}</text>
				</view>
			</view>
			<view v-if="!list.length && !loading" class="empty-box">
				<text class="empty-text">{{ emptyText }}</text>
				<button class="btn" @click="goHome">去选餐厅</button>
			</view>
		</template>
	</view>
</template>

<script>
	import { fetchMyReservations } from '../api/reservations.js'
	import { useUserStore } from '../../../stores/user.js'
	import {
		RESERVATION_TABS,
		reservationStatusText,
		formatReserveTime,
		reservationItemSummary
	} from '../constants/reservation.js'

	const FILTER_KEY = 'reservation_list_status'

	export default {
		data() {
			return {
				tabs: RESERVATION_TABS.map((t) => ({
					...t,
					key: t.status || 'all'
				})),
				list: [],
				filterStatus: '',
				loading: false,
				needLogin: false
			}
		},
		computed: {
			emptyText() {
				if (!this.filterStatus) return '暂无预约单'
				return `暂无「${reservationStatusText(this.filterStatus)}」预约`
			}
		},
		onLoad(q) {
			if (q?.status) {
				this.filterStatus = q.status === 'all' || q.status === '0' ? '' : String(q.status)
			}
		},
		onShow() {
			this.applyIncomingFilter()
			this.load()
		},
		methods: {
			applyIncomingFilter() {
				const cached = uni.getStorageSync(FILTER_KEY)
				if (cached === undefined || cached === null || cached === false) return
				if (cached === 'all' || cached === '' || cached === '0' || cached === 0) {
					this.filterStatus = ''
				} else {
					this.filterStatus = String(cached)
				}
				uni.removeStorageSync(FILTER_KEY)
			},
			selectTab(status) {
				const next = status || ''
				if (this.filterStatus === next) return
				this.filterStatus = next
				this.load()
			},
			async load() {
				const user = useUserStore()
				if (!user.isLogin) {
					this.needLogin = true
					this.list = []
					return
				}
				this.needLogin = false
				this.loading = true
				try {
					const params = {}
					if (this.filterStatus) params.status = this.filterStatus
					const data = await fetchMyReservations(params, {
						loading: true,
						showError: false,
						cancelKey: 'reservation-mine'
					})
					const rows = Array.isArray(data) ? data : (data?.list || data?.rows || [])
					this.list = rows.map((o) => ({
						...o,
						status: String(o.status || '').trim(),
						restaurantName: o.restaurantName || o.restaurant?.name || '',
						items: Array.isArray(o.items) ? o.items : []
					}))
				} catch (e) {
					this.list = []
				} finally {
					this.loading = false
				}
			},
			statusText: reservationStatusText,
			itemSummary: reservationItemSummary,
			formatTime: formatReserveTime,
			formatAmount(n) {
				const v = Number(n)
				return Number.isFinite(v) ? v.toFixed(2) : '0.00'
			},
			goDetail(id) {
				uni.navigateTo({ url: `/pages/user/reservation/detail?id=${id}` })
			},
			goHome() {
				uni.switchTab({ url: '/pages/index/index' })
			},
			goLogin() {
				uni.navigateTo({ url: '/pages/user/login/index' })
			}
		}
	}
</script>

<style scoped>
	.page {
		padding: 0 24rpx 40rpx;
		background: var(--color-bg);
		min-height: 100vh;
		box-sizing: border-box;
	}
	.tabs {
		display: flex;
		background: #fff;
		margin: 0 -24rpx 20rpx;
		padding: 0 8rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}
	.tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24rpx 0 20rpx;
		position: relative;
	}
	.tab-text {
		font-size: 26rpx;
		color: #909399;
	}
	.tab.active .tab-text {
		color: var(--color-primary);
		font-weight: 600;
	}
	.tab.active::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 8rpx;
		transform: translateX(-50%);
		width: 36rpx;
		height: 6rpx;
		border-radius: 6rpx;
		background: var(--color-primary);
	}
	.card {
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 16rpx;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16rpx;
	}
	.name {
		flex: 1;
		font-size: 30rpx;
		font-weight: 600;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.status {
		font-size: 26rpx;
		flex-shrink: 0;
		color: var(--color-primary);
	}
	.st-cancelled { color: #909399; }
	.st-completed { color: var(--color-success); }
	.items {
		margin-top: 14rpx;
		color: #606266;
		font-size: 26rpx;
		line-height: 1.5;
	}
	.meta {
		display: flex;
		align-items: center;
		margin-top: 10rpx;
		font-size: 24rpx;
		gap: 12rpx;
	}
	.meta-label {
		color: #909399;
		flex-shrink: 0;
	}
	.meta-val {
		color: var(--color-text);
	}
	.foot {
		margin-top: 16rpx;
		padding-top: 16rpx;
		border-top: 1rpx solid var(--color-bg);
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 26rpx;
	}
	.amount {
		font-weight: 700;
		color: var(--color-danger);
		font-size: 30rpx;
	}
	.time {
		color: #909399;
		font-size: 22rpx;
	}
	.empty-box {
		padding: 120rpx 40rpx;
		text-align: center;
	}
	.empty-text {
		display: block;
		color: #999;
		font-size: 28rpx;
		margin-bottom: 32rpx;
	}
	.btn {
		margin: 0 auto;
		width: 280rpx;
		height: 72rpx;
		line-height: 72rpx;
		background: var(--color-primary);
		color: #fff;
		border-radius: 999rpx;
		font-size: 28rpx;
		border: none;
	}
	.btn::after {
		border: none;
	}
</style>
