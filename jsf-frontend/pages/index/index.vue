<template>
	<view class="page">
		<view class="loc-pill" @click="refreshLocation">
			<image class="loc-icon" src="/static/icons/location-pin.png" mode="aspectFit" />
			<text class="loc-text">{{ locating ? '定位中…' : locationText }}</text>
			<text class="loc-refresh">刷新</text>
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
				placeholder="搜索餐厅名称"
				placeholder-class="search-ph"
				@confirm="loadList"
			/>
			<view class="search-btn" @click="loadList">搜索</view>
		</view>

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
				<view class="badge-row">
					<text v-if="r.open" class="badge open">营业中</text>
					<text v-else class="badge closed-badge">休息中</text>
					<text v-if="r.visited" class="badge visited">去过</text>
				</view>
			</view>
			<view class="body">
				<text class="name">{{ r.name }}</text>
				<view class="meta-row">
					<text class="type">{{ r.cuisineName || '餐饮' }}</text>
					<text class="dot">·</text>
					<text class="sales">月售{{ formatSales(r.monthlySales) }}</text>
					<text class="dot">·</text>
					<text class="dist">{{ formatDistance(r.distanceKm) }}</text>
				</view>
			</view>
		</view>

		<view v-if="!list.length && !loading" class="empty">
			<text class="empty-title">附近暂无餐厅</text>
			<text class="empty-desc">下拉刷新，或欢迎商家入驻</text>
		</view>
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
		padding: 0 24rpx 48rpx;
		background: var(--color-bg);
		min-height: 100vh;
		box-sizing: border-box;
	}

	.loc-pill {
		display: flex;
		align-items: center;
		gap: 10rpx;
		margin: 20rpx 0 16rpx;
		padding: 16rpx 24rpx;
		border-radius: 999rpx;
		background: var(--color-primary-soft);
	}
	.loc-icon {
		width: 28rpx;
		height: 28rpx;
		flex-shrink: 0;
	}
	.loc-text {
		flex: 1;
		font-size: 24rpx;
		font-weight: 500;
		color: var(--color-primary-dark);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.loc-refresh {
		flex-shrink: 0;
		font-size: 22rpx;
		color: var(--color-primary);
		font-weight: 600;
	}

	.hero {
		margin-bottom: 20rpx;
		height: 280rpx;
		border-radius: var(--radius-card);
		overflow: hidden;
		background: var(--color-surface);
		box-shadow: var(--shadow-card);
	}
	.hero-swiper,
	.hero-img {
		display: block;
		width: 100%;
		height: 280rpx;
	}

	.search {
		display: flex;
		align-items: center;
		background: var(--color-card);
		border-radius: 999rpx;
		padding: 10rpx 10rpx 10rpx 28rpx;
		margin-bottom: 24rpx;
		box-shadow: var(--shadow-card);
		box-sizing: border-box;
	}
	.search-input {
		flex: 1;
		font-size: 28rpx;
		color: var(--color-text);
		min-width: 0;
		height: 60rpx;
		line-height: 60rpx;
	}
	.search-ph {
		color: var(--color-text-muted);
	}
	.search-btn {
		flex-shrink: 0;
		margin-left: 12rpx;
		padding: 0 32rpx;
		height: 60rpx;
		line-height: 60rpx;
		border-radius: 999rpx;
		background: var(--color-primary);
		color: #fff;
		font-size: 26rpx;
		font-weight: 600;
		text-align: center;
	}

	.card {
		background: var(--color-card);
		border-radius: var(--radius-card);
		overflow: hidden;
		margin-bottom: 24rpx;
		box-shadow: var(--shadow-card);
	}
	.card.closed {
		opacity: 0.78;
	}
	.cover-wrap {
		position: relative;
		width: 100%;
		height: 280rpx;
		background: var(--color-surface);
	}
	.cover {
		width: 100%;
		height: 100%;
		display: block;
	}
	.badge-row {
		position: absolute;
		left: 16rpx;
		top: 16rpx;
		display: flex;
		gap: 10rpx;
	}
	.badge {
		font-size: 20rpx;
		padding: 6rpx 14rpx;
		border-radius: 999rpx;
		color: #fff;
		font-weight: 600;
	}
	.badge.open {
		background: var(--color-primary);
	}
	.badge.closed-badge {
		background: rgba(74, 74, 74, 0.72);
	}
	.badge.visited {
		background: rgba(243, 156, 18, 0.92);
	}
	.body {
		padding: 24rpx 28rpx 28rpx;
	}
	.name {
		display: block;
		font-size: 34rpx;
		font-weight: 700;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.meta-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8rpx;
		margin-top: 12rpx;
	}
	.type,
	.sales,
	.dist,
	.dot {
		font-size: 24rpx;
		color: var(--color-text-secondary);
	}
	.dot {
		color: var(--color-text-muted);
	}

	.empty {
		padding: 100rpx 40rpx;
		text-align: center;
	}
	.empty-title {
		display: block;
		font-size: 30rpx;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 12rpx;
	}
	.empty-desc {
		display: block;
		font-size: 24rpx;
		color: var(--color-text-muted);
	}
</style>
