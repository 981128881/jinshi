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

		<view v-for="o in list" :key="o.id" class="card" @tap="goDetail(o.id)">
			<view class="head">
				<text class="oid">{{ formatDaily(o.dailyNo) }}</text>
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
		</view>
	</view>
</template>

<script>
	import { fetchMerchantOrders } from './api/merchant.js'
	import {
		RESERVATION_TABS,
		reservationStatusText,
		formatReserveTime,
		reservationItemSummary,
		formatDailyNo
	} from './constants/reservation.js'

	export default {
		data() {
			return {
				restaurantId: 0,
				tabs: [
					{ status: '', label: '全部', key: 'all' },
					...RESERVATION_TABS.map((t) => ({ ...t, key: t.status || 'all' }))
				],
				list: [],
				filterStatus: '',
				loading: false
			}
		},
		computed: {
			emptyText() {
				if (!this.filterStatus) return '暂无预约单'
				const tab = this.tabs.find((t) => t.status === this.filterStatus)
				return `暂无「${tab?.label || ''}」预约`
			}
		},
		onLoad(q) {
			this.restaurantId = Number(q.restaurantId)
			if (q?.status) {
				this.filterStatus = q.status === 'all' || q.status === '0' ? '' : String(q.status)
			}
		},
		onShow() {
			if (this.restaurantId) this.load()
		},
		methods: {
			statusText: reservationStatusText,
			formatTime: formatReserveTime,
			formatDaily: formatDailyNo,
			itemSummary: reservationItemSummary,
			formatAmount(n) {
				return Number(n || 0).toFixed(2)
			},
			selectTab(status) {
				const next = status || ''
				if (this.filterStatus === next) return
				this.filterStatus = next
				this.load()
			},
			async load() {
				this.loading = true
				try {
					const params = {}
					if (this.filterStatus) params.status = this.filterStatus
					this.list = (await fetchMerchantOrders(this.restaurantId, params, { loading: true })) || []
				} catch (e) {
					this.list = []
				} finally {
					this.loading = false
				}
			},
			goDetail(id) {
				uni.navigateTo({
					url: `/pages/merchant/order-detail?restaurantId=${this.restaurantId}&id=${id}`
				})
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
	.oid {
		flex: 1;
		font-size: 30rpx;
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
		color: #6f8f63;
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
	}
</style>
