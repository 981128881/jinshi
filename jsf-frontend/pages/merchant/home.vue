<template>
	<view class="page">
		<view v-if="!list.length" class="empty">
			<text>你还没有门店，请先入驻</text>
			<button class="btn" @click="goApply">去入驻</button>
		</view>
		<view v-for="item in list" :key="item.restaurant.id" class="card">
			<view class="name">{{ item.restaurant.name }}</view>
			<view class="meta">角色 {{ item.role }} · {{ item.restaurant.open ? '营业中' : '已打烊' }}</view>
			<view class="addr">地址：{{ item.restaurant.address || '—' }}</view>
			<view class="phone-row">
				<text class="phone">电话：{{ item.restaurant.phone || '—' }}</text>
				<text
					v-if="item.restaurant.phone"
					class="call"
					@click="callShop(item.restaurant.phone)"
				>拨打</text>
			</view>
			<view class="actions">
				<button class="mini" @click="toggleOpen(item)">{{ item.restaurant.open ? '打烊' : '开业' }}</button>
				<button class="mini primary" @click="goOrders(item.restaurant.id)">预约单</button>
				<button class="mini primary" @click="goMenu(item.restaurant.id)">菜单</button>
			</view>
			<view class="actions">
				<button
					class="mini"
					open-type="share"
					:data-id="item.restaurant.id"
					:data-name="item.restaurant.name"
					:data-logo="item.restaurant.logo || ''"
				>分享店铺</button>
				<button class="mini primary" @click="showQr(item)">店铺码</button>
			</view>
		</view>
		<view v-if="qr" class="mask" @click="closeQr">
			<view class="qr-card" @click.stop>
				<text class="qr-name">{{ qr.name }}</text>
				<image class="qr-img" :src="qr.url" mode="aspectFit" show-menu-by-longpress />
				<text class="qr-tip">顾客微信扫码即可打开本店</text>
				<button class="btn" @click="saveQr">保存到相册</button>
			</view>
		</view>
	</view>
</template>

<script>
	import { fetchMyMerchantRestaurants, fetchRestaurantWxaCode, setRestaurantOpen } from './api/merchant.js'

	export default {
		data() {
			return { list: [], qr: null }
		},
		onShow() {
			this.load()
		},
		onShareAppMessage(e) {
			const ds = e?.from === 'button' ? (e.target?.dataset || {}) : {}
			const first = this.list[0]?.restaurant
			const id = Number(ds.id || first?.id || 0)
			const name = ds.name || first?.name || '金石菜牌齐市店'
			if (!id) return { title: '金石菜牌齐市店', path: '/pages/index/index' }
			return {
				title: name,
				path: `/pages/restaurant/detail?id=${id}`,
				imageUrl: ds.logo || first?.logo || ''
			}
		},
		methods: {
			async load() {
				this.list = (await fetchMyMerchantRestaurants({ loading: true, showError: false })) || []
			},
			goApply() {
				uni.navigateTo({ url: '/pages/onboarding/apply' })
			},
			callShop(phone) {
				const p = String(phone || '').replace(/-/g, '')
				if (!p) return
				uni.makePhoneCall({ phoneNumber: p })
			},
			async toggleOpen(item) {
				await setRestaurantOpen(item.restaurant.id, !item.restaurant.open)
				this.load()
			},
			goOrders(id) {
				uni.navigateTo({ url: `/pages/merchant/orders?restaurantId=${id}` })
			},
			goMenu(id) {
				uni.navigateTo({ url: `/pages/merchant/menu?restaurantId=${id}` })
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
	.page { padding: 24rpx; background: var(--color-bg); min-height: 100vh; }
	.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
	.name { font-size: 32rpx; font-weight: 700; }
	.meta, .addr, .phone { font-size: 24rpx; color: #666; margin-top: 8rpx; }
	.phone-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8rpx;
		gap: 16rpx;
	}
	.call { color: var(--color-primary); font-size: 24rpx; flex-shrink: 0; }
	.actions { display: flex; gap: 12rpx; margin-top: 20rpx; }
	.mini { flex: 1; font-size: 24rpx; margin: 0; background: #f3f4f6; border-radius: 10rpx; }
	.mini.primary { background: var(--color-primary); color: #fff; }
	button.mini { border: none; line-height: 2; }
	button.mini::after { border: none; }
	.empty { text-align: center; padding: 80rpx 24rpx; color: #999; }
	.btn { margin-top: 24rpx; background: var(--color-primary); color: #fff; border-radius: 12rpx; }
	.mask {
		position: fixed; inset: 0; background: rgba(0,0,0,0.45);
		display: flex; align-items: center; justify-content: center; z-index: 20;
	}
	.qr-card {
		width: 560rpx; background: #fff; border-radius: 20rpx;
		padding: 40rpx 32rpx; text-align: center;
	}
	.qr-name { display: block; font-size: 32rpx; font-weight: 700; color: var(--color-text); }
	.qr-img { width: 400rpx; height: 400rpx; margin: 28rpx 0 16rpx; }
	.qr-tip { display: block; font-size: 24rpx; color: var(--color-text-secondary); }
	.qr-card .btn { margin-top: 28rpx; }
</style>
