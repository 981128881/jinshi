<template>
	<view class="page">
		<view v-if="order" class="card">
			<view class="status">{{ statusText(order.status) }}</view>
			<view class="row">门店：{{ order.restaurantName }}</view>
			<view class="row">地址：{{ order.restaurantAddress || '—' }}</view>
			<view class="row phone-row">
				<text>电话：{{ order.restaurantPhone || '—' }}</text>
				<text
					v-if="order.restaurantPhone"
					class="call"
					@click="callShop"
				>拨打</text>
			</view>
			<view class="row">单号：{{ order.id }}</view>
			<view class="row">下单人：{{ order.contactName || '—' }}</view>
			<view class="row">手机号：{{ order.contactPhone || '—' }}</view>
			<view class="row">预约时间：{{ formatReserve(order.reserveAt) || '—' }}</view>
			<view class="row">备注：{{ order.remark || '无' }}</view>
			<view v-for="it in order.items" :key="it.id" class="item">
				<text>{{ it.name }} x{{ it.quantity }}</text>
				<text>¥{{ (it.price * it.quantity).toFixed(2) }}</text>
			</view>
			<view class="total">合计参考 ¥{{ order.totalAmount }}（到店结算，小程序内不收款）</view>
			<button v-if="order.status === 'submitted'" class="btn" @click="cancel">取消预约</button>
		</view>
	</view>
</template>

<script>
	import { fetchReservationDetail, cancelReservation } from '../api/reservations.js'
	import { reservationStatusText, formatReserveTime } from '../constants/reservation.js'

	export default {
		data() {
			return { id: '', order: null }
		},
		onLoad(q) {
			this.id = q.id
			this.load()
		},
		methods: {
			statusText: reservationStatusText,
			formatReserve: formatReserveTime,
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
	.page { padding: 24rpx; background: var(--color-bg); min-height: 100vh; }
	.card { background: #fff; border-radius: 16rpx; padding: 28rpx; }
	.status { font-size: 34rpx; font-weight: 700; color: var(--color-primary); margin-bottom: 16rpx; }
	.row { font-size: 26rpx; color: #555; margin-bottom: 10rpx; }
	.phone-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
	}
	.call {
		color: var(--color-primary);
		font-size: 26rpx;
		flex-shrink: 0;
	}
	.item { display: flex; justify-content: space-between; padding: 12rpx 0; border-top: 1px solid #f0f0f0; font-size: 28rpx; }
	.total { margin-top: 20rpx; color: #666; font-size: 24rpx; }
	.btn { margin-top: 28rpx; background: #fff; color: var(--color-danger); border: 1px solid var(--color-danger); border-radius: 12rpx; }
</style>
