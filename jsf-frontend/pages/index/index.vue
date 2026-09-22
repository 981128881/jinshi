<template>
	<view class="page">
		<!-- 我的位置：搜索上方 -->
		<view class="loc-bar" @click="refreshLocation">
			<image class="loc-icon" src="/static/icons/location-pin.png" mode="aspectFit" />
			<text class="loc-text">{{ locating ? '定位中…' : locationText }}</text>
		</view>

		<view v-if="banners.length" class="hero">
			<swiper v-if="banners.length > 1" class="hero-swiper" circular autoplay :interval="5000">
				<swiper-item v-for="b in banners" :key="b.id">
					<image class="hero-img" :src="b.imageUrl" mode="aspectFill" @click="openBanner(b)" />
				</swiper-item>
			</swiper>
			<image
				v-else
				class="hero-img"
				:src="banners[0].imageUrl"
				mode="aspectFill"
				@click="openBanner(banners[0])"
			/>
		</view>

		<view class="search">
			<input
				class="search-input"
				v-model="keyword"
				confirm-type="search"
				placeholder="搜索餐厅"
				@confirm="loadList"
			/>
			<view class="search-btn" @click="loadList">搜索</view>
		</view>

		<!-- 店铺卡片 -->
		<view
			v-for="r in list"
			:key="r.id"
			class="card"
			:class="{ closed: !r.open }"
			@click="goDetail(r.id)"
		>
			<view class="cover-wrap">
				<image
					class="cover"
					:src="r.coverImage || r.logo || '/static/shop/demo-1.png'"
					mode="aspectFill"
				/>
				<text v-if="r.visited" class="badge visited">去过</text>
				<text v-if="!r.open" class="badge closed-badge">休息中</text>
			</view>
			<view class="body">
				<text class="name">{{ r.name }}</text>
				<view class="row">
					<text class="type">{{ r.cuisineName || '餐饮' }}</text>
					<text class="sales">月售{{ formatSales(r.monthlySales) }}</text>
				</view>
				<view class="row bottom">
					<text class="dist">{{ formatDistance(r.distanceKm) }}</text>
				</view>
			</view>
		</view>

		<view v-if="!list.length && !loading" class="empty">暂无餐厅，欢迎商家入驻</view>
	</view>
</template>

<script>
	import { fetchRestaurants, fetchRestaurantDetail, reverseGeocode, fetchHomeBanners } from '../../api/restaurants.js'
	import { restaurantIdFromQuery, launchedRestaurantId } from '../../utils/restaurantScene.js'

	const LOC_CACHE_KEY = 'home_location_cache'
	const LIST_TTL_MS = 60 * 1000

	export default {
		data() {
			return {
				keyword: '',
				banners: [],
				list: [],
				lat: null,
				lng: null,
				locationText: '定位中…',
				locating: false,
				loading: false,
				_metaLoaded: false,
				_lastListAt: 0,
				_lastListKey: ''
			}
		},
		onLoad(query) {
			this.restoreLocationCache()
			const id = restaurantIdFromQuery(query)
			if (id) uni.navigateTo({ url: `/pages/restaurant/detail?id=${id}` })
		},
		onShow() {
			this.loadMeta()
			if (this.lat == null) {
				this.refreshLocation()
			} else {
				this.loadList({ soft: true })
			}
		},
		onPullDownRefresh() {
			Promise.all([this.refreshLocation(true), this.loadMeta(true)])
				.finally(() => uni.stopPullDownRefresh())
		},
		methods: {
			restoreLocationCache() {
				try {
					const raw = uni.getStorageSync(LOC_CACHE_KEY)
					const cache = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
					if (!cache || cache.lat == null || cache.lng == null) return
					this.lat = Number(cache.lat)
					this.lng = Number(cache.lng)
					this.locationText = cache.locationText || '已定位'
				} catch (e) {}
			},
			persistLocationCache() {
				if (this.lat == null || this.lng == null) return
				uni.setStorageSync(LOC_CACHE_KEY, JSON.stringify({
					lat: this.lat,
					lng: this.lng,
					locationText: this.locationText
				}))
			},
			formatSales(n) {
				const v = Number(n) || 0
				if (v >= 10000) return `${(v / 10000).toFixed(1)}万+`
				if (v >= 1000) return `${Math.floor(v / 100) * 100}+`
				return String(v)
			},
			formatDistance(km) {
				if (km == null || Number.isNaN(Number(km))) return '距离 —'
				const v = Number(km)
				if (v < 1) return `${Math.round(v * 1000)}m`
				return `${v.toFixed(1)}km`
			},
			async loadMeta(force = false) {
				if (this._metaLoaded && !force && this.banners.length) return
				try {
					const rows = await fetchHomeBanners({ showError: false })
					this.banners = Array.isArray(rows) ? rows.filter((b) => b && b.imageUrl) : []
					if (this.banners.length) this._metaLoaded = true
				} catch (e) {}
			},
			openBanner(b) {
				const link = (b?.link || '').trim()
				if (link.startsWith('/pages/')) uni.navigateTo({ url: link })
			},
			async refreshLocation(force = false) {
				if (this.locating) return
				this.locating = true
				if (!this.locationText || this.locationText === '定位中…') {
					this.locationText = '定位中…'
				}
				try {
					const pos = await new Promise((resolve, reject) => {
						uni.getLocation({
							type: 'gcj02',
							isHighAccuracy: false,
							success: resolve,
							fail: reject
						})
					})
					this.lat = pos.latitude
					this.lng = pos.longitude
					// 列表与逆地理并行：不阻塞餐厅接口
					const listPromise = this.loadList(force ? {} : { soft: false })
					this.updateLocationText().finally(() => this.persistLocationCache())
					await listPromise
				} catch (e) {
					if (this.lat == null) {
						this.locationText = '点击开启定位'
						await this.loadList()
					}
				} finally {
					this.locating = false
				}
			},
			async updateLocationText() {
				if (this.lat == null || this.lng == null) return
				try {
					const region = await reverseGeocode(this.lat, this.lng, {
						dedup: 'reverse-geocode',
						cancelKey: 'reverse-geocode'
					})
					const parts = [region?.city, region?.district].filter(Boolean)
					this.locationText = parts.length ? parts.join('') : '已定位'
				} catch (e) {
					if (!this.locationText || this.locationText === '定位中…') {
						this.locationText = '已定位'
					}
				}
			},
			listQueryKey() {
				return [
					launchedRestaurantId() || 0,
					this.keyword || '',
					this.lat == null ? '' : Number(this.lat).toFixed(3),
					this.lng == null ? '' : Number(this.lng).toFixed(3)
				].join('|')
			},
			async loadList(options = {}) {
				const soft = !!options.soft
				const key = this.listQueryKey()
				if (
					soft &&
					this._lastListKey === key &&
					Date.now() - this._lastListAt < LIST_TTL_MS &&
					this.list.length
				) {
					return
				}
				this.loading = true
				try {
					const shareId = launchedRestaurantId()
					const params = {}
					if (!shareId && this.keyword) params.keyword = this.keyword
					if (this.lat != null && this.lng != null) {
						params.lat = this.lat
						params.lng = this.lng
					}
					let rows = (await fetchRestaurants(params, {
						dedup: 'restaurants-list',
						cancelKey: 'restaurants-list'
					})) || []
					if (shareId) {
						rows = rows.filter((r) => Number(r.id) === shareId)
						if (!rows.length) {
							try {
								const data = await fetchRestaurantDetail(shareId, {
									showError: false,
									auth: false
								})
								if (data?.restaurant) rows = [data.restaurant]
							} catch (e) {}
						}
					}
					this.list = rows
					this._lastListAt = Date.now()
					this._lastListKey = key
				} catch (e) {
					this.list = []
				} finally {
					this.loading = false
				}
			},
			goDetail(id) {
				uni.navigateTo({ url: `/pages/restaurant/detail?id=${id}` })
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

	.loc-bar {
		display: flex;
		align-items: center;
		padding: 20rpx 8rpx 8rpx;
		gap: 8rpx;
	}
	.loc-icon {
		width: 28rpx;
		height: 28rpx;
		flex-shrink: 0;
	}
	.loc-text {
		flex: 1;
		font-size: 24rpx;
		font-weight: 400;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hero {
		margin: 8rpx 0 12rpx;
		height: 200rpx;
		border-radius: 16rpx;
		overflow: hidden;
		background: #eee;
	}
	.hero-swiper,
	.hero-img {
		display: block;
		width: 100%;
		height: 200rpx;
	}

	.search {
		display: flex;
		align-items: center;
		background: #fff;
		border-radius: 999rpx;
		padding: 8rpx 10rpx 8rpx 28rpx;
		margin: 8rpx 0 12rpx;
		border: 2rpx solid var(--color-primary);
		box-sizing: border-box;
	}
	.search-input {
		flex: 1;
		font-size: 28rpx;
		color: var(--color-text);
		min-width: 0;
		height: 56rpx;
		line-height: 56rpx;
	}
	.search-btn {
		flex-shrink: 0;
		margin-left: 12rpx;
		padding: 0 28rpx;
		height: 56rpx;
		line-height: 56rpx;
		border-radius: 999rpx;
		background: var(--color-primary);
		color: #fff;
		font-size: 26rpx;
		text-align: center;
	}

	.card {
		display: flex;
		background: #fff;
		border-radius: 20rpx;
		overflow: hidden;
		margin-bottom: 20rpx;
		padding: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	}
	.card.closed {
		opacity: 0.72;
	}
	.cover-wrap {
		position: relative;
		width: 180rpx;
		height: 180rpx;
		flex-shrink: 0;
		border-radius: 16rpx;
		overflow: hidden;
		background: #eee;
	}
	.cover {
		width: 100%;
		height: 100%;
	}
	.badge {
		position: absolute;
		left: 8rpx;
		top: 8rpx;
		font-size: 20rpx;
		padding: 4rpx 10rpx;
		border-radius: 8rpx;
		color: #fff;
	}
	.badge.visited {
		background: rgba(0, 0, 0, 0.55);
	}
	.badge.closed-badge {
		top: auto;
		bottom: 8rpx;
		background: rgba(0, 0, 0, 0.55);
	}
	.body {
		flex: 1;
		padding-left: 20rpx;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-width: 0;
	}
	.name {
		font-size: 32rpx;
		font-weight: 700;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-top: 10rpx;
	}
	.type, .sales, .dist {
		font-size: 24rpx;
		color: var(--color-icon-base);
	}
	.sales {
		color: var(--color-icon-base);
	}
	.bottom {
		margin-top: auto;
		padding-top: 12rpx;
	}
	.dist {
		color: var(--color-icon-muted);
	}
	.empty {
		text-align: center;
		color: var(--color-icon-muted);
		padding: 80rpx 0;
		font-size: 28rpx;
	}
</style>
