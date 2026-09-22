<template>
	<view class="page">
		<view class="tips">只需姓名和手机号，提交后 1–3 个工作日内审核。</view>

		<view class="card">
			<input class="input" v-model="form.contactName" placeholder="联系人姓名" maxlength="20" />
			<input
				class="input"
				v-model="form.contactPhone"
				placeholder="联系电话"
				type="number"
				maxlength="11"
			/>
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
					contactPhone: ''
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
						this.form.contactName = data.contactName || ''
						this.form.contactPhone = data.contactPhone || ''
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
				const name = (this.form.contactName || '').trim()
				const phone = (this.form.contactPhone || '').trim()
				if (!name) {
					uni.showToast({ title: '请填写联系人姓名', icon: 'none' })
					return
				}
				if (!/^1\d{10}$/.test(phone)) {
					uni.showToast({ title: '请填写正确手机号', icon: 'none' })
					return
				}
				this.submitting = true
				try {
					await submitOnboarding({ contactName: name, contactPhone: phone })
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
	.input {
		background: #f7f7f7; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; font-size: 28rpx;
	}
	.actions { display: flex; gap: 20rpx; }
	.btn { flex: 1; border-radius: 12rpx; font-size: 28rpx; }
	.btn.primary { background: var(--color-primary); color: #fff; }
	.btn.ghost { background: #fff; color: #333; }
	.link { margin-top: 24rpx; background: transparent; color: var(--color-primary); font-size: 26rpx; }
</style>
