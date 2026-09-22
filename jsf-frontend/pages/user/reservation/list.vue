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
				tabs: [
					{ status: '', label: '全部', key: 'all' },
					...RESERVATION_TABS.map((t) => ({
						...t,
						key: t.status || 'all'
					}))
				],
				list: [],
				filterStatus: '',
				loading: false,
				needLogin: false
			}
		},
		computed: {
			emptyText() {
				if (!this.filterStatus) return '暂无预约单'
				const tab = this.tabs.find((t) => t.status === this.filterStatus)
				const label = tab?.label || reservationStatusText(this.filterStatus)
				return `暂无「${label}」预约`
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
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		background: var(--color-card);
		margin: 0 -24rpx 24rpx;
		padding: 0 8rpx;
		border-bottom: 1rpx solid var(--color-border);
		box-shadow: 0 4rpx 16rpx rgba(61, 74, 56, 0.04);
	}
	.tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 28rpx 0 22rpx;
		position: relative;
	}
	.tab-text {
		font-size: 26rpx;
		color: var(--color-text-secondary);
	}
	.tab.active .tab-text {
		color: var(--color-primary);
		font-weight: 700;
	}
	.tab.active::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 6rpx;
		transform: translateX(-50%);
		width: 48rpx;
		height: 6rpx;
		border-radius: 6rpx;
		background: var(--color-primary);
	}
	.card {
		background: var(--color-card);
		border-radius: var(--radius-card);
		padding: 28rpx;
		margin-bottom: 20rpx;
		box-shadow: var(--shadow-card);
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16rpx;
	}
	.name {
		flex: 1;
		font-size: 32rpx;
		font-weight: 700;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.status {
		font-size: 24rpx;
		flex-shrink: 0;
		font-weight: 600;
		padding: 4rpx 14rpx;
		border-radius: 999rpx;
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}
	.st-cancelled {
		color: #909399;
		background: #f0f0f0;
	}
	.st-completed {
		color: #6F8F63;
		background: var(--color-primary-soft);
	}
	.st-submitted {
		color: #d68910;
		background: rgba(243, 156, 18, 0.14);
	}
	.st-accepted,
	.st-ready {
		color: var(--color-primary-dark);
		background: var(--color-primary-soft);
	}
	.items {
		margin-top: 16rpx;
		color: var(--color-text-secondary);
		font-size: 26rpx;
		line-height: 1.5;
	}
	.meta {
		display: flex;
		align-items: center;
		margin-top: 12rpx;
		font-size: 24rpx;
		gap: 12rpx;
	}
	.meta-label {
		color: var(--color-text-secondary);
		flex-shrink: 0;
	}
	.meta-val {
		color: var(--color-text);
	}
	.foot {
		margin-top: 18rpx;
		padding-top: 18rpx;
		border-top: 1rpx solid var(--color-border);
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 26rpx;
	}
	.amount {
		font-weight: 700;
		color: var(--color-price);
		font-size: 34rpx;
	}
	.time {
		color: var(--color-text-muted);
		font-size: 22rpx;
	}
	.empty-box {
		padding: 140rpx 40rpx;
		text-align: center;
	}
	.empty-text {
		display: block;
		color: var(--color-text-secondary);
		font-size: 30rpx;
		font-weight: 500;
		margin-bottom: 40rpx;
	}
	.btn {
		margin: 0 auto;
		width: 300rpx;
		height: 80rpx;
		line-height: 80rpx;
		background: var(--color-primary);
		color: #fff;
		border-radius: 999rpx;
		font-size: 28rpx;
		font-weight: 600;
		border: none;
	}
	.btn::after {
		border: none;
	}
</style>
