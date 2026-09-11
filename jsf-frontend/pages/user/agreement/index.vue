<template>
	<view class="agreement-page">
		<scroll-view class="agreement-scroll" scroll-y>
			<view class="agreement-card">
				<text class="agreement-title">{{ content.title }}</text>
				<text class="agreement-date">更新日期：{{ content.updatedAt }}</text>
				<view
					v-for="(section, index) in content.sections"
					:key="index"
					class="agreement-section"
				>
					<text class="section-title">{{ section.title }}</text>
					<text
						v-for="(paragraph, pIndex) in section.paragraphs"
						:key="pIndex"
						class="section-paragraph"
					>{{ paragraph }}</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	import { getAgreementContent } from '../common/agreement.js'
	import { fetchShopConfig } from '../api/home.js'
	import config from '../../../config/index.js'

	export default {
		data() {
			return {
				type: 'service',
				shopName: '金石菜牌齐市店',
				servicePhone: config.servicePhone
			}
		},
		computed: {
			content() {
				return getAgreementContent(this.type, {
					shopName: this.shopName,
					servicePhone: this.servicePhone
				})
			}
		},
		onLoad(options) {
			this.type = options.type === 'privacy' ? 'privacy' : 'service'
			uni.setNavigationBarTitle({ title: this.content.title })
			this.loadShopInfo()
		},
		methods: {
			async loadShopInfo() {
				try {
					const shop = await fetchShopConfig({ showError: false })
					if (shop?.name) this.shopName = shop.name
					if (shop?.servicePhone) this.servicePhone = shop.servicePhone
				} catch (e) {}
			}
		}
	}
</script>

<style scoped>
.agreement-page {
	min-height: 100vh;
	background: var(--color-bg);
}
.agreement-scroll {
	height: 100vh;
}
.agreement-card {
	margin: 24rpx;
	padding: 32rpx;
	background: #ffffff;
	border-radius: var(--radius-lg);
}
.agreement-title {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: var(--color-text);
	line-height: 1.4;
	margin-bottom: 12rpx;
}
.agreement-date {
	display: block;
	font-size: 24rpx;
	color: var(--color-text-secondary);
	margin-bottom: 32rpx;
}
.agreement-section + .agreement-section {
	margin-top: 32rpx;
}
.section-title {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: var(--color-text);
	line-height: 1.5;
	margin-bottom: 16rpx;
}
.section-paragraph {
	display: block;
	font-size: 28rpx;
	color: #666666;
	line-height: 1.8;
	margin-bottom: 12rpx;
}
.section-paragraph:last-child {
	margin-bottom: 0;
}
</style>
