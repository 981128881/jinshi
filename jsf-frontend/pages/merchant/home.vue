<template>
	<view class="page">
		<view v-if="!list.length" class="empty">
			<text class="empty-title">还没有门店</text>
			<text class="empty-desc">提交入驻申请，审核通过后即可接单</text>
			<button class="btn-primary" @click="goApply">去入驻</button>
		</view>

		<view v-for="item in list" :key="item.restaurant.id" class="shop">
			<!-- 店头 -->
			<view class="shop-hero">
				<view class="shop-hero-top">
					<text class="shop-name">{{ item.restaurant.name }}</text>
					<view class="status-pill" :class="item.restaurant.effectivelyOpen ? 'is-open' : 'is-closed'">
						<view class="status-dot" />
						<text>{{ item.restaurant.effectivelyOpen ? '营业中' : '已打烊' }}</text>
					</view>
				</view>
				<view class="phone-line">
					<text class="phone-label">电话</text>
					<text class="phone-num">{{ item.restaurant.phone || '未填写' }}</text>
				</view>
				<view v-if="item.restaurant.openTime && item.restaurant.closeTime" class="hours-line">
					营业 {{ item.restaurant.openTime }} - {{ item.restaurant.closeTime }}
				</view>
			</view>

			<!-- 营业切换 -->
			<view class="open-row">
				<view class="open-text">
					<text class="open-title">营业开关</text>
					<text class="open-sub">
						{{
							item.restaurant.open
								? '关闭后强制打烊；开启后仍受营业时段限制'
								: '已强制打烊'
						}}
					</text>
				</view>
				<switch
					:checked="!!item.restaurant.open"
					color="#88A87B"
					@change="onOpenChange(item, $event)"
				/>
			</view>

			<!-- 预约单主入口 -->
			<view class="order-entry" @click="goOrders(item.restaurant.id)">
				<view class="order-entry-text">
					<text class="order-entry-title">预约单</text>
					<text class="order-entry-sub">接单、备餐、完成</text>
				</view>
				<text class="order-entry-arrow">›</text>
			</view>

			<!-- 次要操作 -->
			<view class="tools">
				<button
					class="tool tool-btn"
					open-type="share"
					:data-id="String(item.restaurant.id)"
					:data-name="item.restaurant.name"
					:data-cover="item.restaurant.coverImage || item.restaurant.logo || ''"
				>分享本店</button>
				<view class="tool" @click="showQr(item)">
					<text class="tool-label">店铺码</text>
				</view>
			</view>
		</view>

		<view v-if="qr" class="mask" @click="closeQr">
			<view class="qr-card" @click.stop>
				<text class="qr-name">{{ qr.name }}</text>
				<image class="qr-img" :src="qr.url" mode="aspectFit" show-menu-by-longpress />
				<text class="qr-tip">顾客微信扫码即可打开本店</text>
				<button class="btn-primary" @click="saveQr">保存到相册</button>
			</view>
		</view>
	</view>
</template>

<script>
	import { fetchMyMerchantRestaurants, fetchRestaurantWxaCode, setRestaurantOpen } from './api/merchant.js'
	import { askReservationSubscribe } from '../../utils/subscribe.js'

	export default {
		data() {
			return { list: [], qr: null, toggling: false }
		},
		onShow() {
			this.load()
		},
		onShareAppMessage(e) {
			// 按钮分享：打开对应餐厅详情页；菜单分享：默认第一家店
			const ds =
				e && e.from === 'button'
					? e.target?.dataset || e.currentTarget?.dataset || {}
					: {}
			const first = this.list[0]?.restaurant
			const id = Number(ds.id || first?.id || 0)
			const name = ds.name || first?.name || '金石菜牌齐市店'
			const imageUrl = ds.cover || first?.coverImage || first?.logo || ''
			if (!id) {
				return { title: '金石菜牌齐市店', path: '/pages/index/index' }
			}
			return {
				title: name,
				path: `/pages/restaurant/detail?id=${id}`,
				imageUrl
			}
		},
		methods: {
			async load() {
				this.list = (await fetchMyMerchantRestaurants({ loading: true, showError: false })) || []
			},
			goApply() {
				uni.navigateTo({ url: '/pages/onboarding/apply' })
			},
			async onOpenChange(item, e) {
				const next = !!(e && e.detail && e.detail.value)
				if (next === !!item.restaurant.open || this.toggling) return
				this.toggling = true
				try {
					await setRestaurantOpen(item.restaurant.id, next)
					item.restaurant.open = next
				} catch (err) {
					await this.load()
				} finally {
					this.toggling = false
				}
			},
			goOrders(id) {
				askReservationSubscribe(() => {
					uni.navigateTo({ url: `/pages/merchant/orders?restaurantId=${id}` })
				})
			},
			async showQr(item) {
				const data = await fetchRestaurantWxaCode(item.restaurant.id)
				this.qr = { name: item.restaurant.name, url: data?.imageUrl || '' }
			},
			closeQr() {
				this.qr = null
			},
			saveQr() {
				if (!this.qr?.url) return
				uni.downloadFile({
					url: this.qr.url,
					success: (res) => {
						if (res.statusCode !== 200) {
							uni.showToast({ title: '图片地址无效，请检查后端 PUBLIC_BASE_URL', icon: 'none' })
							return
						}
						uni.saveImageToPhotosAlbum({
							filePath: res.tempFilePath,
							success: () => uni.showToast({ title: '已保存', icon: 'success' }),
							fail: () => uni.showToast({ title: '保存失败，请授权相册', icon: 'none' })
						})
					},
					fail: () => uni.showToast({ title: '下载失败', icon: 'none' })
				})
			}
		}
	}
</script>

<style scoped>
	.page {
		padding: 24rpx;
		background: var(--color-bg);
		min-height: 100vh;
		box-sizing: border-box;
	}

	.shop {
		margin-bottom: 28rpx;
	}

	.shop-hero {
		background: linear-gradient(145deg, #88A87B 0%, #6F8F63 100%);
		border-radius: 24rpx 24rpx 0 0;
		padding: 36rpx 32rpx 28rpx;
		color: #fff;
	}

	.shop-hero-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20rpx;
	}

	.shop-name {
		flex: 1;
		font-size: 40rpx;
		font-weight: 700;
		line-height: 1.3;
		letter-spacing: 1rpx;
	}

	.status-pill {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 8rpx;
		padding: 8rpx 18rpx;
		border-radius: 999rpx;
		font-size: 22rpx;
		background: rgba(255, 255, 255, 0.22);
	}

	.status-pill.is-closed {
		background: rgba(0, 0, 0, 0.18);
	}

	.status-dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		background: #fff;
	}

	.status-pill.is-open .status-dot {
		background: #F5F4F0;
		box-shadow: 0 0 0 4rpx rgba(255, 255, 255, 0.35);
	}

	.status-pill.is-closed .status-dot {
		background: #B5A89A;
	}

	.phone-line {
		margin-top: 28rpx;
		display: flex;
		align-items: center;
		gap: 12rpx;
		padding: 16rpx 20rpx;
		background: rgba(255, 255, 255, 0.16);
		border-radius: 14rpx;
	}

	.phone-label {
		font-size: 22rpx;
		opacity: 0.85;
	}

	.phone-num {
		flex: 1;
		font-size: 28rpx;
		font-weight: 600;
		letter-spacing: 1rpx;
	}

	.hours-line {
		margin-top: 16rpx;
		font-size: 22rpx;
		opacity: 0.9;
	}

	.open-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		background: #fff;
		padding: 28rpx 32rpx;
		border-bottom: 1rpx solid var(--color-border);
	}

	.open-title {
		display: block;
		font-size: 30rpx;
		font-weight: 600;
		color: var(--color-text);
	}

	.open-sub {
		display: block;
		margin-top: 6rpx;
		font-size: 22rpx;
		color: var(--color-text-secondary);
	}

	.order-entry {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #fff;
		padding: 36rpx 32rpx;
		border-bottom: 1rpx solid var(--color-border);
	}

	.order-entry-title {
		display: block;
		font-size: 34rpx;
		font-weight: 700;
		color: var(--color-text);
	}

	.order-entry-sub {
		display: block;
		margin-top: 8rpx;
		font-size: 24rpx;
		color: var(--color-text-secondary);
	}

	.order-entry-arrow {
		font-size: 44rpx;
		color: var(--color-primary);
		line-height: 1;
		font-weight: 300;
	}

	.tools {
		display: flex;
		background: #fff;
		border-radius: 0 0 24rpx 24rpx;
		overflow: hidden;
	}

	.tool,
	.tool-btn {
		flex: 1;
		margin: 0;
		padding: 28rpx 0;
		text-align: center;
		background: #fff;
		border: none;
		border-radius: 0;
		line-height: 1.2;
		font-size: 26rpx;
		color: var(--color-text);
	}

	.tool + .tool,
	.tool + .tool-btn,
	.tool-btn + .tool {
		border-left: 1rpx solid var(--color-border);
	}

	.tool-btn::after {
		border: none;
	}

	.tool-label {
		font-size: 26rpx;
		color: var(--color-text);
	}

	.empty {
		text-align: center;
		padding: 120rpx 40rpx;
	}

	.empty-title {
		display: block;
		font-size: 32rpx;
		font-weight: 600;
		color: var(--color-text);
	}

	.empty-desc {
		display: block;
		margin: 16rpx 0 40rpx;
		font-size: 26rpx;
		color: var(--color-text-secondary);
	}

	.btn-primary {
		background: var(--color-primary);
		color: #fff;
		border-radius: 14rpx;
		font-size: 28rpx;
		border: none;
	}

	.btn-primary::after {
		border: none;
	}

	.mask {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 20;
	}

	.qr-card {
		width: 560rpx;
		background: #fff;
		border-radius: 20rpx;
		padding: 40rpx 32rpx;
		text-align: center;
	}

	.qr-name {
		display: block;
		font-size: 32rpx;
		font-weight: 700;
		color: var(--color-text);
	}

	.qr-img {
		width: 400rpx;
		height: 400rpx;
		margin: 28rpx 0 16rpx;
	}

	.qr-tip {
		display: block;
		font-size: 24rpx;
		color: var(--color-text-secondary);
	}

	.qr-card .btn-primary {
		margin-top: 28rpx;
	}
</style>
