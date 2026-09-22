<template>
	<view class="page">
		<view v-if="!restaurant" class="empty-page">加载中...</view>
		<template v-else>
			<view class="hero">
				<image
					class="cover-blur"
					:src="restaurant.coverImage || restaurant.logo || '/static/shop/demo-1.png'"
					mode="aspectFill"
				/>
				<view class="hero-mask" />
				<view class="hero-main">
					<image
						class="logo"
						:src="restaurant.logo || restaurant.coverImage || '/static/shop/demo-1.png'"
						mode="aspectFill"
					/>
					<view class="hero-text">
						<text class="name">{{ restaurant.name }}</text>
						<text class="addr">{{ restaurant.address }}</text>
						<view class="meta-row">
							<text class="status" :class="restaurant.open ? 'open' : 'closed'">
								{{ restaurant.open ? '营业中' : '休息中' }}
							</text>
						</view>
					</view>
				</view>
				<button class="share-btn" open-type="share">分享</button>
			</view>

			<!-- 左分类 / 右菜品 -->
			<view class="menu">
				<scroll-view scroll-y class="cats" :show-scrollbar="false">
					<view
						v-for="c in categories"
						:key="c.id"
						class="cat"
						:class="{ active: c.id === activeCatId }"
						@click="selectCat(c.id)"
					>
						<text class="cat-name">{{ c.name }}</text>
						<text v-if="catCount(c) > 0" class="cat-badge">{{ catCount(c) }}</text>
					</view>
					<view v-if="!categories.length" class="cat-empty">暂无分类</view>
				</scroll-view>

				<scroll-view scroll-y class="dishes" :show-scrollbar="false">
					<view class="section-title">{{ activeCatName }}</view>
					<view v-for="d in currentDishes" :key="d.id" class="dish">
						<view class="dish-img-wrap" @click="previewDish(d.id)">
							<image class="dish-img" :src="dishImg(d)" mode="aspectFill" />
						</view>
						<view class="dish-body">
							<text class="dish-name">{{ d.name }}</text>
							<view v-if="tagList(d).length" class="dish-tags">
								<view
									v-for="t in tagList(d)"
									:key="t"
									class="dish-tag"
									:style="tagStyle(t)"
								>{{ t }}</view>
							</view>
							<text v-if="d.desc" class="dish-desc">{{ d.desc }}</text>
							<view class="dish-foot">
								<view class="price-col">
									<text class="price">¥{{ formatPrice(d.price) }}</text>
									<text class="sold">已售{{ soldCount(d) }}</text>
								</view>
								<view class="qty">
									<view
										v-if="qtyOf(d.id) > 0"
										class="qty-btn minus"
										@click="decDish(d.id)"
									>−</view>
									<text v-if="qtyOf(d.id) > 0" class="qty-num">{{ qtyOf(d.id) }}</text>
									<view class="qty-btn plus" @click="addDish(d.id)">+</view>
								</view>
							</view>
						</view>
					</view>
					<view v-if="!currentDishes.length" class="empty">暂无菜品</view>
				</scroll-view>
			</view>

			<!-- 底栏预约 -->
			<view class="bar">
				<view class="bar-left">
					<text class="bar-count">已选 {{ basketCount }}</text>
					<text class="bar-total">¥{{ basketTotal }}</text>
				</view>
				<button
					class="bar-btn"
					:disabled="!basketCount || !restaurant.open"
					@click="submit"
				>提交预约</button>
			</view>
		</template>
	</view>
</template>

<script>
	import { fetchRestaurantDetail } from '../../api/restaurants.js'
	import { useUserStore } from '../../stores/user.js'
	import { restaurantIdFromQuery } from '../../utils/restaurantScene.js'
	import { tagColorStyle } from '../../utils/tagColor.js'

	export default {
		data() {
			return {
				id: 0,
				restaurant: null,
				categories: [],
				activeCatId: 0,
				basket: {}
			}
		},
		computed: {
			currentDishes() {
				const cat = this.categories.find((c) => c.id === this.activeCatId)
				return cat?.dishes || []
			},
			activeCatName() {
				const cat = this.categories.find((c) => c.id === this.activeCatId)
				return cat?.name || '菜单'
			},
			basketCount() {
				return Object.values(this.basket).reduce((s, n) => s + n, 0)
			},
			basketTotal() {
				let t = 0
				for (const c of this.categories) {
					for (const d of c.dishes || []) {
						const q = this.basket[d.id] || 0
						if (q) t += Number(d.price) * q
					}
				}
				return Math.round(t * 100) / 100
			}
		},
		onLoad(query) {
			this.id = restaurantIdFromQuery(query)
			this.load()
		},
		onShareAppMessage() {
			return {
				title: this.restaurant?.name || '金石菜牌齐市店',
				path: `/pages/restaurant/detail?id=${this.id}`,
				imageUrl: this.restaurant?.coverImage || this.restaurant?.logo || ''
			}
		},
		methods: {
			async load() {
				const data = await fetchRestaurantDetail(this.id, { loading: true })
				this.restaurant = data.restaurant
				this.categories = data.categories || []
				this.activeCatId = this.categories[0]?.id || 0
				uni.setNavigationBarTitle({
					title: data.restaurant?.name || '店铺详情'
				})
			},
			selectCat(id) {
				this.activeCatId = id
			},
			dishImg(d) {
				const u = (d && d.image) || ''
				if (u && !/\.svg(\?|$)/i.test(u)) return u
				const n = (Math.abs(Number(d && d.id) || 0) % 12) + 1
				return `/static/dish/d${String(n).padStart(2, '0')}.png`
			},
			previewDish(id) {
				let current = ''
				for (const c of this.categories) {
					for (const x of c.dishes || []) {
						if (Number(x.id) === Number(id)) {
							current = this.dishImg(x)
							break
						}
					}
					if (current) break
				}
				if (!current) return
				uni.previewImage({ current, urls: [current] })
			},
			qtyOf(dishId) {
				return this.basket[dishId] || 0
			},
			catCount(cat) {
				let n = 0
				for (const d of cat.dishes || []) {
					n += this.basket[d.id] || 0
				}
				return n
			},
			tagStyle: tagColorStyle,
			tagList(d) {
				const tags = d && d.tags
				if (Array.isArray(tags)) return tags.filter(Boolean)
				if (typeof tags === 'string' && tags.trim()) {
					try {
						const parsed = JSON.parse(tags)
						return Array.isArray(parsed) ? parsed.filter(Boolean) : []
					} catch (e) {
						return []
					}
				}
				return []
			},
			formatPrice(p) {
				const n = Number(p)
				return Number.isInteger(n) ? String(n) : n.toFixed(2)
			},
			soldCount(d) {
				const n = Math.floor(Number(d && d.sales))
				return n >= 0 ? n : 0
			},
			addDish(id) {
				if (!this.restaurant?.open) {
					uni.showToast({ title: '店铺休息中', icon: 'none' })
					return
				}
				this.basket = {
					...this.basket,
					[id]: (this.basket[id] || 0) + 1
				}
			},
			decDish(id) {
				const cur = this.basket[id] || 0
				if (cur <= 1) {
					const next = { ...this.basket }
					delete next[id]
					this.basket = next
					return
				}
				this.basket = {
					...this.basket,
					[id]: cur - 1
				}
			},
			async submit() {
				const user = useUserStore()
				if (!user.isLogin) {
					uni.navigateTo({ url: '/pages/user/login/index' })
					return
				}
				const items = []
				for (const c of this.categories) {
					for (const d of c.dishes || []) {
						const q = this.basket[d.id] || 0
						if (q > 0) {
							items.push({
								dishId: d.id,
								name: d.name,
								price: d.price,
								quantity: q
							})
						}
					}
				}
				if (!items.length) {
					uni.showToast({ title: '请先选择菜品', icon: 'none' })
					return
				}
				uni.setStorageSync('reservation_draft', {
					restaurantId: this.id,
					restaurantName: this.restaurant?.name || '',
					items
				})
				uni.navigateTo({ url: '/pages/user/reservation/checkout' })
			}
		}
	}
</script>

<style scoped>
	.page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--color-bg);
		box-sizing: border-box;
		overflow: hidden;
	}

	.hero {
		position: relative;
		height: 176rpx;
		flex-shrink: 0;
		overflow: hidden;
		background: var(--color-primary-soft);
	}
	.cover-blur {
		position: absolute;
		left: -24rpx;
		top: -24rpx;
		width: calc(100% + 48rpx);
		height: calc(100% + 48rpx);
		display: block;
		filter: blur(18px);
		transform: scale(1.08);
	}
	.hero-mask {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			rgba(61, 74, 56, 0.55) 0%,
			rgba(61, 74, 56, 0.35) 55%,
			rgba(61, 74, 56, 0.28) 100%
		);
	}
	.hero-main {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 20rpx;
		height: 100%;
		padding: 24rpx 140rpx 24rpx 24rpx;
		box-sizing: border-box;
	}
	.logo {
		width: 112rpx;
		height: 112rpx;
		border-radius: 20rpx;
		flex-shrink: 0;
		background: rgba(255, 255, 255, 0.35);
		border: 3rpx solid rgba(255, 255, 255, 0.7);
		box-sizing: border-box;
	}
	.hero-text {
		flex: 1;
		min-width: 0;
	}
	.share-btn {
		position: absolute;
		top: 50%;
		right: 24rpx;
		transform: translateY(-50%);
		z-index: 3;
		margin: 0;
		padding: 0 24rpx;
		height: 52rpx;
		line-height: 52rpx;
		font-size: 22rpx;
		color: var(--color-text);
		background: rgba(255, 255, 255, 0.9);
		border-radius: 999rpx;
		border: none;
	}
	.share-btn::after { border: none; }
	.name {
		font-size: 32rpx;
		font-weight: 700;
		color: #fff;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.addr {
		font-size: 22rpx;
		color: rgba(255, 255, 255, 0.88);
		display: block;
		margin-top: 6rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.meta-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-top: 10rpx;
	}
	.status {
		font-size: 18rpx;
		padding: 2rpx 12rpx;
		border-radius: 999rpx;
		font-weight: 600;
		color: #fff;
	}
	.status.open {
		background: var(--color-primary);
	}
	.status.closed {
		background: rgba(74, 74, 74, 0.75);
	}

	.menu {
		flex: 1;
		display: flex;
		min-height: 0;
		padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
	}

	.cats {
		width: 176rpx;
		flex-shrink: 0;
		height: 100%;
		background: var(--color-surface);
	}
	.cat {
		position: relative;
		padding: 28rpx 16rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.cat-name {
		font-size: 24rpx;
		color: var(--color-text-secondary);
		text-align: center;
		line-height: 1.3;
	}
	.cat.active {
		background: var(--color-primary-soft);
	}
	.cat.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 6rpx;
		height: 40rpx;
		border-radius: 0 6rpx 6rpx 0;
		background: var(--color-primary);
	}
	.cat.active .cat-name {
		color: var(--color-primary-dark);
		font-weight: 600;
	}
	.cat-badge {
		position: absolute;
		top: 10rpx;
		right: 8rpx;
		min-width: 28rpx;
		height: 28rpx;
		line-height: 28rpx;
		padding: 0 6rpx;
		border-radius: 999rpx;
		background: var(--color-accent);
		color: #fff;
		font-size: 18rpx;
		text-align: center;
		font-weight: 600;
	}
	.cat-empty {
		padding: 40rpx 12rpx;
		font-size: 22rpx;
		color: var(--color-text-muted);
		text-align: center;
	}

	.dishes {
		flex: 1;
		height: 100%;
		background: var(--color-card);
		padding: 8rpx 24rpx 24rpx;
		box-sizing: border-box;
	}
	.section-title {
		font-size: 28rpx;
		font-weight: 700;
		color: var(--color-text);
		padding: 20rpx 0 12rpx;
	}
	.dish {
		display: flex;
		padding: 24rpx 0;
		border-bottom: 1rpx solid var(--color-border);
	}
	.dish:last-child {
		border-bottom: none;
	}
	.dish-img-wrap {
		width: 176rpx;
		height: 176rpx;
		border-radius: var(--radius-md);
		overflow: hidden;
		flex-shrink: 0;
		background: var(--color-surface);
	}
	.dish-img {
		width: 100%;
		height: 100%;
		display: block;
	}
	.dish-body {
		flex: 1;
		padding-left: 20rpx;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.dish-name {
		font-size: 30rpx;
		font-weight: 600;
		color: var(--color-text);
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.dish-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8rpx;
		margin-top: 8rpx;
	}
	.dish-tag {
		font-size: 20rpx;
		line-height: 1.4;
		padding: 2rpx 10rpx;
		border-radius: 6rpx;
		flex-shrink: 0;
	}
	.dish-desc {
		font-size: 22rpx;
		color: var(--color-text-muted);
		margin-top: 8rpx;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}
	.dish-foot {
		margin-top: auto;
		padding-top: 12rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.price-col {
		display: flex;
		align-items: baseline;
		gap: 12rpx;
		min-width: 0;
	}
	.price {
		color: var(--color-price);
		font-weight: 700;
		font-size: 32rpx;
	}
	.sold {
		font-size: 22rpx;
		color: var(--color-text-muted);
	}
	.qty {
		display: flex;
		align-items: center;
		gap: 12rpx;
		flex-shrink: 0;
		position: relative;
		z-index: 2;
	}
	.qty-btn {
		width: 48rpx;
		height: 48rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32rpx;
		line-height: 1;
		font-weight: 500;
	}
	.qty-btn.plus {
		background: var(--color-primary);
		color: #fff;
	}
	.qty-btn.minus {
		background: #fff;
		color: var(--color-primary);
		border: 2rpx solid var(--color-primary);
		box-sizing: border-box;
	}
	.qty-num {
		min-width: 28rpx;
		text-align: center;
		font-size: 26rpx;
		color: var(--color-text);
	}

	.bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		min-height: 110rpx;
		padding: 16rpx 28rpx calc(16rpx + env(safe-area-inset-bottom));
		background: rgba(255, 255, 255, 0.96);
		box-shadow: var(--shadow-bar);
		display: flex;
		align-items: center;
		justify-content: space-between;
		z-index: 20;
		box-sizing: border-box;
	}
	.bar-left {
		display: flex;
		align-items: baseline;
		gap: 16rpx;
	}
	.bar-count {
		font-size: 26rpx;
		color: var(--color-text-secondary);
	}
	.bar-total {
		font-size: 36rpx;
		font-weight: 700;
		color: var(--color-price);
	}
	.bar-btn {
		background: var(--color-primary);
		color: #fff;
		border-radius: 999rpx;
		font-size: 30rpx;
		font-weight: 600;
		margin: 0;
		padding: 0 56rpx;
		height: 80rpx;
		line-height: 80rpx;
		border: none;
	}
	.bar-btn::after { border: none; }
	.bar-btn[disabled] {
		opacity: 0.45;
	}

	.empty-page,
	.empty {
		text-align: center;
		color: var(--color-text-muted);
		padding: 60rpx 24rpx;
		font-size: 26rpx;
	}
</style>
