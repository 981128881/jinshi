<template>
	<view class="page">
		<view v-if="order" class="body">
			<view class="hero" :class="'hero--' + order.status">
				<text class="hero-status">{{ statusText(order.status) }}</text>
				<text class="hero-id">当日 {{ formatDaily(order.dailyNo) }}</text>
				<text class="hero-tip">{{ statusTip }}</text>
			</view>

			<view class="card">
				<view class="card-title">门店信息</view>
				<view class="shop-name">{{ order.restaurantName || '餐厅' }}</view>
				<view class="info-row">
					<text class="info-label">地址</text>
					<text class="info-val">{{ order.restaurantAddress || '—' }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">电话</text>
					<view class="info-val phone-line">
						<text>{{ order.restaurantPhone || '—' }}</text>
						<text v-if="order.restaurantPhone" class="call" @tap="callShop">拨打</text>
					</view>
				</view>
			</view>

			<view class="card">
				<view class="card-title">预约信息</view>
				<view class="info-row">
					<text class="info-label">预约时间</text>
					<text class="info-val strong">{{ formatReserve(order.reserveAt) || '—' }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">联系人</text>
					<text class="info-val">{{ order.contactName || '—' }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">手机号</text>
					<text class="info-val">{{ order.contactPhone || '—' }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">备注</text>
					<text class="info-val">{{ order.remark || '无' }}</text>
				</view>
			</view>

			<view class="card">
				<view class="card-title-row">
					<text class="card-title">菜品明细</text>
					<text class="card-meta">共 {{ itemCount }} 件</text>
				</view>
				<view v-for="it in order.items" :key="it.id" class="dish-row">
					<view class="dish-left">
						<image v-if="it.image" class="dish-img" :src="it.image" mode="aspectFill" />
						<view v-else class="dish-img dish-img--ph">{{ (it.name || '?').slice(0, 1) }}</view>
						<view class="dish-text">
							<text class="dish-name">{{ it.name }}</text>
							<text class="dish-qty">x{{ it.quantity }}</text>
						</view>
					</view>
					<text class="dish-price">¥{{ lineAmount(it) }}</text>
				</view>
				<view class="total-row">
					<text class="total-label">参考合计</text>
					<text class="total-amount">¥{{ Number(order.totalAmount || 0).toFixed(2) }}</text>
				</view>
				<text class="pay-tip">到店结算，小程序内不收款</text>
			</view>

			<view class="bottom-space" />
		</view>

		<view v-if="order && order.status === 'submitted'" class="footer">
			<button class="cancel-btn" @tap="cancel">取消预约</button>
		</view>
	</view>
</template>

<script>
	import { fetchReservationDetail, cancelReservation } from '../api/reservations.js'
	import { reservationStatusText, formatReserveTime, formatDailyNo } from '../constants/reservation.js'

	export default {
		data() {
			return { id: '', order: null }
		},
		computed: {
			itemCount() {
				return (this.order?.items || []).reduce((s, it) => s + Number(it.quantity || 0), 0)
			},
			statusTip() {
				const s = this.order?.status
				if (s === 'submitted') return '餐厅确认后将开始备餐'
				if (s === 'accepted' || s === 'ready') return '餐厅正在为您备餐，请按时到店'
				if (s === 'completed') return '本次预约已完成，欢迎再次光临'
				if (s === 'cancelled') return '预约已取消'
				return ''
			}
		},
		onLoad(q) {
			this.id = q.id
			this.load()
		},
		methods: {
			statusText: reservationStatusText,
			formatReserve: formatReserveTime,
			formatDaily: formatDailyNo,
			lineAmount(it) {
				return (Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)
			},
			async load() {
				this.order = await fetchReservationDetail(this.id, { loading: true })
			},
			callShop() {
				const phone = (this.order?.restaurantPhone || '').replace(/-/g, '')
				if (!phone) return
				uni.makePhoneCall({ phoneNumber: phone })
			},
			cancel() {
				uni.showModal({
					title: '取消预约',
					content: '确定取消该预约吗？',
					success: (res) => {
						if (!res.confirm) return
						this.doCancel()
					}
				})
			},
			async doCancel() {
				await cancelReservation(this.id)
				uni.showToast({ title: '已取消', icon: 'success' })
				this.load()
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background: var(--color-bg);
		box-sizing: border-box;
	}
	.body {
		padding: 24rpx 24rpx 0;
	}
	.hero {
		border-radius: var(--radius-card);
		padding: 36rpx 32rpx;
		margin-bottom: 20rpx;
		background: linear-gradient(135deg, #88a87b 0%, #6f9165 100%);
		color: #fff;
		box-shadow: var(--shadow-card);
	}
	.hero--cancelled {
		background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
	}
	.hero--completed {
		background: linear-gradient(135deg, #88a87b 0%, #5a7d52 100%);
	}
	.hero--submitted {
		background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
	}
	.hero--accepted,
	.hero--ready {
		background: linear-gradient(135deg, #88a87b 0%, #6f8f63 100%);
	}
	.hero-status {
		display: block;
		font-size: 40rpx;
		font-weight: 700;
		letter-spacing: 1rpx;
	}
	.hero-id {
		display: block;
		margin-top: 10rpx;
		font-size: 24rpx;
		opacity: 0.9;
	}
	.hero-tip {
		display: block;
		margin-top: 16rpx;
		font-size: 26rpx;
		opacity: 0.95;
		line-height: 1.4;
	}
	.card {
		background: var(--color-card);
		border-radius: var(--radius-card);
		padding: 28rpx;
		margin-bottom: 20rpx;
		box-shadow: var(--shadow-card);
	}
	.card-title {
		font-size: 28rpx;
		font-weight: 700;
		color: var(--color-text);
	}
	.card-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8rpx;
	}
	.card-meta {
		font-size: 24rpx;
		color: var(--color-text-secondary);
	}
	.shop-name {
		margin-top: 16rpx;
		margin-bottom: 8rpx;
		font-size: 32rpx;
		font-weight: 700;
		color: var(--color-text);
	}
	.info-row {
		display: flex;
		gap: 20rpx;
		padding: 14rpx 0;
		border-top: 1rpx solid var(--color-border);
		font-size: 26rpx;
	}
	.shop-name + .info-row {
		border-top: none;
		padding-top: 8rpx;
	}
	.info-label {
		width: 120rpx;
		flex-shrink: 0;
		color: var(--color-text-secondary);
	}
	.info-val {
		flex: 1;
		color: var(--color-text);
		word-break: break-all;
		line-height: 1.45;
	}
	.info-val.strong {
		font-weight: 600;
		color: var(--color-primary);
	}
	.phone-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
	}
	.call {
		flex-shrink: 0;
		color: var(--color-accent);
		font-weight: 600;
	}
	.dish-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		padding: 18rpx 0;
		border-top: 1rpx solid var(--color-border);
	}
	.dish-left {
		display: flex;
		align-items: center;
		gap: 16rpx;
		min-width: 0;
		flex: 1;
	}
	.dish-img {
		width: 88rpx;
		height: 88rpx;
		border-radius: var(--radius-md);
		flex-shrink: 0;
		background: var(--color-bg);
	}
	.dish-img--ph {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-primary);
		font-size: 32rpx;
		font-weight: 700;
	}
	.dish-text {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6rpx;
	}
	.dish-name {
		font-size: 28rpx;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.dish-qty {
		font-size: 24rpx;
		color: var(--color-text-secondary);
	}
	.dish-price {
		flex-shrink: 0;
		font-size: 28rpx;
		font-weight: 600;
		color: var(--color-text);
	}
	.total-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 12rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid var(--color-border);
	}
	.total-label {
		font-size: 26rpx;
		color: var(--color-text-secondary);
	}
	.total-amount {
		font-size: 36rpx;
		font-weight: 700;
		color: var(--color-price);
	}
	.pay-tip {
		display: block;
		margin-top: 12rpx;
		font-size: 22rpx;
		color: var(--color-text-muted);
	}
	.bottom-space {
		height: 160rpx;
	}
	.footer {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
		background: rgba(245, 244, 240, 0.96);
		border-top: 1rpx solid var(--color-border);
		box-shadow: var(--shadow-bar);
	}
	.cancel-btn {
		margin: 0;
		height: 88rpx;
		line-height: 88rpx;
		border-radius: 999rpx;
		background: #fff;
		color: #c45c4a;
		border: 2rpx solid #e8b4ab;
		font-size: 30rpx;
		font-weight: 600;
	}
	.cancel-btn::after {
		border: none;
	}
</style>
