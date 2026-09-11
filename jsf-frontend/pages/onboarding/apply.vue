<template>
	<view class="page">
		<view class="tips">提交门店资料后，平台将在 1–3 个工作日内审核。一期无需结算银行卡，也无需在线支付配置。</view>

		<view class="card">
			<view class="title">联系人</view>
			<input class="input" v-model="form.contactName" placeholder="联系人姓名" />
			<input class="input" v-model="form.contactPhone" placeholder="联系电话" type="number" />
			<input class="input" v-model="form.legalPerson" placeholder="法人姓名（选填）" />
			<input class="input" v-model="form.licenseNo" placeholder="营业执照号（选填）" />
		</view>

		<view class="card">
			<view class="title">门店信息</view>
			<input class="input" v-model="form.restaurantName" placeholder="门店名称" />
			<input class="input" v-model="form.address" placeholder="门店地址" />
			<textarea class="textarea" v-model="form.licenseImage" placeholder="执照图片 URL（暂用链接，后续接上传）" />
			<textarea class="textarea" v-model="form.doorImage" placeholder="门头照 URL（暂用链接）" />
			<textarea class="textarea" v-model="form.insideImage" placeholder="店内照 URL（暂用链接）" />
		</view>

		<view class="actions">
			<button class="btn ghost" :loading="saving" @click="saveDraft">保存草稿</button>
			<button class="btn primary" :loading="submitting" @click="submit">提交审核</button>
		</view>
		<button class="link" @click="goStatus">查看审核进度</button>
	</view>
</template>

<script>
	import { fetchMyApplication, saveOnboardingDraft, submitOnboarding } from './api/onboarding.js'

	export default {
		data() {
			return {
				saving: false,
				submitting: false,
				form: {
					contactName: '',
					contactPhone: '',
					legalPerson: '',
					licenseNo: '',
					licenseImage: '',
					restaurantName: '',
					address: '',
					latitude: 0,
					longitude: 0,
					doorImage: '',
					insideImage: ''
				}
			}
		},
		onShow() {
			this.loadMine()
		},
		methods: {
			async loadMine() {
				try {
					const data = await fetchMyApplication({ showError: false })
					if (data) {
						Object.keys(this.form).forEach((k) => {
							if (data[k] != null) this.form[k] = data[k]
						})
					}
				} catch (e) {}
			},
			async saveDraft() {
				this.saving = true
				try {
					await saveOnboardingDraft(this.form)
					uni.showToast({ title: '已保存', icon: 'success' })
				} finally {
					this.saving = false
				}
			},
			async submit() {
				this.submitting = true
				try {
					await submitOnboarding(this.form)
					uni.showToast({ title: '已提交', icon: 'success' })
					setTimeout(() => {
						uni.redirectTo({ url: '/pages/onboarding/status' })
					}, 500)
				} finally {
					this.submitting = false
				}
			},
			goStatus() {
				uni.navigateTo({ url: '/pages/onboarding/status' })
			}
		}
	}
</script>

<style scoped>
	.page { padding: 24rpx; background: var(--color-bg); min-height: 100vh; }
	.tips { font-size: 24rpx; color: #666; line-height: 1.6; margin-bottom: 20rpx; }
	.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
	.title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; }
	.input, .textarea {
		background: #f7f7f7; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; font-size: 28rpx;
	}
	.textarea { min-height: 120rpx; width: 100%; box-sizing: border-box; }
	.actions { display: flex; gap: 20rpx; }
	.btn { flex: 1; border-radius: 12rpx; font-size: 28rpx; }
	.btn.primary { background: var(--color-primary); color: #fff; }
	.btn.ghost { background: #fff; color: #333; }
	.link { margin-top: 24rpx; background: transparent; color: var(--color-primary); font-size: 26rpx; }
</style>
