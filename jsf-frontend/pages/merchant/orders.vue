<template>
	<view class="page">
		<view v-for="o in list" :key="o.id" class="card">
			<view class="head">
				<text>#{{ o.id }}</text>
				<text>{{ statusText(o.status) }}</text>
			</view>
			<view class="items">{{ (o.items || []).map(i => i.name + 'x' + i.quantity).join('、') }}</view>
			<view class="contact">{{ o.contactName }} {{ o.contactPhone }} · ¥{{ o.totalAmount }}</view>
			<view v-if="o.reserveAt" class="contact">预约 {{ formatTime(o.reserveAt) }}</view>
			<view class="actions">
				<button v-if="o.status === 'submitted'" class="mini" @click="setStatus(o, 'accepted')">接单</button>
				<button v-if="o.status === 'accepted'" class="mini" @click="setStatus(o, 'ready')">制作完成</button>
				<button v-if="o.status === 'ready'" class="mini" @click="setStatus(o, 'completed')">完成取餐</button>
				<button v-if="['submitted','accepted'].includes(o.status)" class="mini danger" @click="setStatus(o, 'cancelled')">取消</button>
			</view>
		</view>
		<view v-if="!list.length" class="empty">暂无预约单</view>
	</view>
</template>

<script>
	import { fetchMerchantOrders, updateMerchantOrderStatus } from './api/merchant.js'
	import { reservationStatusText, formatReserveTime } from './constants/reservation.js'

	export default {
		data() {
			return { restaurantId: 0, list: [] }
		},
		onLoad(q) {
			this.restaurantId = Number(q.restaurantId)
			this.load()
		},
		methods: {
			statusText: reservationStatusText,
			formatTime: formatReserveTime,
			async load() {
				this.list = (await fetchMerchantOrders(this.restaurantId, {}, { loading: true })) || []
			},
			async setStatus(o, status) {
				await updateMerchantOrderStatus(this.restaurantId, o.id, status)
				this.load()
			}
		}
	}
</script>

<style scoped>
	.page { padding: 24rpx; background: var(--color-bg); min-height: 100vh; }
	.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
	.head { display: flex; justify-content: space-between; font-size: 26rpx; font-weight: 600; }
	.items, .contact { margin-top: 10rpx; font-size: 24rpx; color: #666; }
	.actions { display: flex; gap: 12rpx; margin-top: 16rpx; flex-wrap: wrap; }
	.mini { margin: 0; font-size: 24rpx; background: var(--color-primary); color: #fff; border-radius: 10rpx; padding: 0 20rpx; }
	.mini.danger { background: #fff; color: var(--color-danger); border: 1px solid var(--color-danger); }
	.empty { text-align: center; color: #999; padding: 80rpx; }
</style>
