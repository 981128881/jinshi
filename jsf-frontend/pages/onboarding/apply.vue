<template>
	<view class="page">
		<view class="tips">只需姓名和手机号，提交后 1–3 个工作日内审核。</view>

		<view class="card">
			<view class="field">
				<text class="label"><text class="req">*</text>联系人姓名</text>
				<input
					class="input"
					v-model="form.contactName"
					placeholder="最多10个字"
					maxlength="10"
				/>
			</view>
			<view class="field last">
				<text class="label"><text class="req">*</text>联系电话</text>
				<input
					class="input"
					v-model="form.contactPhone"
					placeholder="11位手机号"
					type="number"
					maxlength="11"
				/>
			</view>
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
					if (!data) return
					if (['submitted', 'reviewing', 'approved'].includes(data.status)) {
						uni.redirectTo({ url: '/pages/onboarding/status' })
						return
					}
					this.form.contactName = (data.contactName || '').slice(0, 10)
					this.form.contactPhone = (data.contactPhone || '').slice(0, 11)
				} catch (e) {}
			},
			async saveDraft() {
				this.saving = true
				try {
					await saveOnboardingDraft({
						contactName: (this.form.contactName || '').trim().slice(0, 10),
						contactPhone: (this.form.contactPhone || '').trim().slice(0, 11)
					})
					uni.showToast({ title: '已保存', icon: 'success' })
				} finally {
					this.saving = false
				}
			},
			async submit() {
				const name = (this.form.contactName || '').trim().slice(0, 10)
				const phone = (this.form.contactPhone || '').trim().slice(0, 11)
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
					this.form.contactName = ''
					this.form.contactPhone = ''
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
	.card { background: #fff; border-radius: 16rpx; padding: 8rpx 24rpx 8rpx; margin-bottom: 20rpx; }
	.field { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
	.field.last { border-bottom: none; }
	.label {
		display: block;
		font-size: 26rpx;
		color: #4a4a4a;
		font-weight: 500;
		margin-bottom: 12rpx;
	}
	.req { color: #e74c3c; margin-right: 4rpx; }
	.input {
		width: 100%;
		background: #f7f7f7;
		border-radius: 12rpx;
		padding: 20rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}
	.actions { display: flex; gap: 20rpx; }
	.btn { flex: 1; border-radius: 12rpx; font-size: 28rpx; }
	.btn.primary { background: var(--color-primary); color: #fff; }
	.btn.ghost { background: #fff; color: #333; }
	.link { margin-top: 24rpx; background: transparent; color: var(--color-primary); font-size: 26rpx; }
</style>
