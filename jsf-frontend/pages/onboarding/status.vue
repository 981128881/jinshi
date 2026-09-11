<template>
	<view class="page">
		<view v-if="!app" class="empty">暂无入驻申请</view>
		<view v-else class="card">
			<view class="status">状态：{{ statusText }}</view>
			<view class="row">门店：{{ app.restaurantName || '-' }}</view>
			<view class="row">联系人：{{ app.contactName || '-' }} {{ app.contactPhone || '' }}</view>
			<view class="row">地址：{{ app.address || '-' }}</view>
			<view v-if="app.rejectReason" class="reject">驳回原因：{{ app.rejectReason }}</view>
			<button v-if="canEdit" class="btn" @click="goEdit">修改并重新提交</button>
			<button v-if="app.status === 'approved'" class="btn" @click="goMerchant">进入商家中心</button>
		</view>
	</view>
</template>

<script>
	import { fetchMyApplication } from './api/onboarding.js'

	const MAP = {
		draft: '草稿',
		submitted: '已提交待审',
		reviewing: '审核中',
		approved: '已通过',
		rejected: '已驳回'
	}

	export default {
		data() {
			return { app: null }
		},
		computed: {
			statusText() {
				return MAP[this.app?.status] || this.app?.status || '-'
			},
			canEdit() {
				return this.app && ['draft', 'rejected'].includes(this.app.status)
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			async load() {
				this.app = await fetchMyApplication({ loading: true })
			},
			goEdit() {
				uni.navigateTo({ url: '/pages/onboarding/apply' })
			},
			goMerchant() {
				uni.navigateTo({ url: '/pages/merchant/home' })
			}
		}
	}
</script>

<style scoped>
	.page { padding: 24rpx; background: var(--color-bg); min-height: 100vh; }
	.card { background: #fff; border-radius: 16rpx; padding: 28rpx; }
	.status { font-size: 34rpx; font-weight: 600; margin-bottom: 20rpx; color: var(--color-primary); }
	.row { font-size: 28rpx; color: #333; margin-bottom: 12rpx; line-height: 1.5; }
	.reject { margin-top: 16rpx; color: var(--color-danger); font-size: 26rpx; }
	.btn { margin-top: 28rpx; background: var(--color-primary); color: #fff; border-radius: 12rpx; }
	.empty { text-align: center; color: #999; padding: 80rpx 0; }
</style>
