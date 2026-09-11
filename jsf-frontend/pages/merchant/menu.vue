<template>
	<view class="page">
		<view class="card">
			<view class="title">新增分类</view>
			<input class="input" v-model="catName" placeholder="分类名" />
			<button class="btn" @click="addCat">添加分类</button>
		</view>
		<view class="card">
			<view class="title">新增菜品</view>
			<input class="input" v-model="dish.name" placeholder="菜品名" />
			<input class="input" v-model="dish.price" placeholder="价格" type="digit" />
			<input class="input" v-model="dish.categoryId" placeholder="分类 ID" type="number" />
			<button class="btn" @click="addDish">添加菜品</button>
		</view>
		<view class="card">
			<view class="title">分类列表</view>
			<view v-for="c in categories" :key="c.id" class="row">#{{ c.id }} {{ c.name }}</view>
		</view>
		<view class="card">
			<view class="title">菜品列表</view>
			<view v-for="d in dishes" :key="d.id" class="row">
				<text>{{ d.name }} ¥{{ d.price }}</text>
				<switch :checked="d.visible" @change="(e) => toggleDish(d, e.detail.value)" />
			</view>
		</view>
	</view>
</template>

<script>
	import {
		fetchMerchantCategories,
		createMerchantCategory,
		fetchMerchantDishes,
		createMerchantDish,
		updateMerchantDish
	} from './api/merchant.js'

	export default {
		data() {
			return {
				restaurantId: 0,
				catName: '',
				categories: [],
				dishes: [],
				dish: { name: '', price: '', categoryId: '' }
			}
		},
		onLoad(q) {
			this.restaurantId = Number(q.restaurantId)
			this.load()
		},
		methods: {
			async load() {
				this.categories = (await fetchMerchantCategories(this.restaurantId)) || []
				this.dishes = (await fetchMerchantDishes(this.restaurantId)) || []
			},
			async addCat() {
				await createMerchantCategory(this.restaurantId, { name: this.catName })
				this.catName = ''
				this.load()
			},
			async addDish() {
				await createMerchantDish(this.restaurantId, {
					name: this.dish.name,
					price: Number(this.dish.price),
					categoryId: Number(this.dish.categoryId)
				})
				this.dish = { name: '', price: '', categoryId: '' }
				this.load()
			},
			async toggleDish(d, visible) {
				await updateMerchantDish(this.restaurantId, d.id, { visible })
				this.load()
			}
		}
	}
</script>

<style scoped>
	.page { padding: 24rpx; background: var(--color-bg); min-height: 100vh; }
	.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
	.title { font-weight: 600; margin-bottom: 12rpx; }
	.input { background: #f7f7f7; border-radius: 10rpx; padding: 16rpx; margin-bottom: 12rpx; }
	.btn { background: var(--color-primary); color: #fff; border-radius: 10rpx; font-size: 26rpx; }
	.row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-top: 1px solid #f3f3f3; font-size: 26rpx; }
</style>
