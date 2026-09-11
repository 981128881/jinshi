<template>
	<view class="login-page">
		<view class="login-body">
			<image
				class="login-mascot"
				src="../static/brand-logo.png"
				mode="aspectFit"
				style="width: 200rpx; height: 200rpx;"
			/>
			<view class="login-slogan">
				<text class="slogan-text">登录</text>
				<text class="slogan-brand">{{ shopName }}</text>
				<text class="slogan-text">，方便快捷</text>
			</view>

			<view class="agreement-row" @click="agreed = !agreed">
				<view class="agreement-check" :class="{ checked: agreed }">
					<text v-if="agreed" class="check-icon">✓</text>
				</view>
				<text class="agreement-text">
					我已阅读并同意
					<text class="agreement-link" @click.stop="openAgreement('service')">《用户服务协议》</text>
					<text class="agreement-link" @click.stop="openAgreement('privacy')">《隐私政策》</text>
				</text>
			</view>

			<AppButton
				class="login-btn"
				type="primary"
				block
				size="md"
				:open-type="agreed ? 'getPhoneNumber' : ''"
				:loading="isLoading('login')"
				@click="handleLoginClick"
				@getphonenumber="onPhoneLogin"
			>手机号快捷登录</AppButton>

			<AppButton
				v-if="enableDevLogin"
				class="dev-login-btn"
				type="default"
				block
				size="md"
				:loading="isLoading('devLogin')"
				@click="onDevLogin"
			>模拟登录（开发测试）</AppButton>
		</view>
		<AppHost />
	</view>
</template>

<script>
	import pageBase from '../../../mixins/page-base.js'
	import AppButton from '../../../components/AppButton.vue'
	import { phoneNumberLogin, devMockLogin } from '../../../utils/auth.js'
	import { fetchShopConfig } from '../api/home.js'
	import ROUTES from '../../../constants/routes.js'
	import config from '../../../config/index.js'

	export default {
		components: { AppButton },
		mixins: [pageBase],
		data() {
			return {
				shopName: '金石菜牌齐市店',
				agreed: false,
				enableDevLogin: config.enableDevLogin
			}
		},
		onLoad() {
			this.loadShopName()
		},
		methods: {
			async loadShopName() {
				try {
					const shop = await fetchShopConfig({ pageId: this._pageRequestId, showError: false })
					if (shop?.name) this.shopName = shop.name
				} catch (e) {}
			},
			handleLoginClick() {
				if (!this.agreed) {
					uni.showToast({ title: '请先阅读并同意相关协议', icon: 'none' })
				}
			},
			async onPhoneLogin(e) {
				if (!this.agreed) {
					uni.showToast({ title: '请先阅读并同意相关协议', icon: 'none' })
					return
				}
				const data = await this.runAction('login', () => phoneNumberLogin(e))
				if (data) {
					setTimeout(() => uni.navigateBack(), 500)
				}
			},
			async onDevLogin() {
				if (!this.agreed) {
					uni.showToast({ title: '请先阅读并同意相关协议', icon: 'none' })
					return
				}
				const data = await this.runAction('devLogin', () => devMockLogin())
				if (data) {
					setTimeout(() => uni.navigateBack(), 500)
				}
			},
			openAgreement(type) {
				uni.navigateTo({ url: `${ROUTES.AGREEMENT}?type=${type}` })
			}
		}
	}
</script>

<style scoped>
.login-page {
	min-height: 100vh;
	background: #ffffff;
}
.login-body {
	padding: 80rpx 48rpx 48rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.login-mascot {
	width: 200rpx;
	height: 200rpx;
	margin-bottom: 48rpx;
}
.login-slogan {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	margin-bottom: 48rpx;
	line-height: 1.5;
}
.slogan-text {
	font-size: 34rpx;
	color: #333333;
	font-weight: 500;
}
.slogan-brand {
	font-size: 34rpx;
	color: var(--color-price);
	font-weight: 600;
}
.login-btn {
	width: 100%;
	height: 88rpx !important;
	font-size: 30rpx !important;
	border-radius: 44rpx !important;
	margin-top: 32rpx;
}
.dev-login-btn {
	width: 100%;
	height: 88rpx !important;
	font-size: 28rpx !important;
	border-radius: 44rpx !important;
	margin-top: 24rpx;
}
.agreement-row {
	display: flex;
	align-items: flex-start;
	padding: 0 8rpx;
	width: 100%;
	box-sizing: border-box;
}
.agreement-check {
	width: 32rpx;
	height: 32rpx;
	border: 2rpx solid #cccccc;
	border-radius: 50%;
	margin-right: 12rpx;
	margin-top: 4rpx;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}
.agreement-check.checked {
	background: var(--color-primary);
	border-color: var(--color-primary);
}
.check-icon {
	font-size: 20rpx;
	color: #ffffff;
	line-height: 1;
}
.agreement-text {
	flex: 1;
	font-size: 22rpx;
	color: #999999;
	line-height: 1.6;
}
.agreement-link {
	color: var(--color-price);
}
</style>
