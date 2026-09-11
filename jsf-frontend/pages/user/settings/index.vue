<template>
	<view class="page">
		<view class="card">
			<view class="row avatar-row">
				<text class="label">头像</text>
				<view class="avatar-side">
					<button
						class="avatar-btn"
						open-type="chooseAvatar"
						@chooseavatar="onChooseAvatar"
					>
						<image
							class="avatar-img"
							:src="avatarDisplay"
							mode="aspectFill"
						/>
					</button>
					<text class="hint">点击更换</text>
				</view>
			</view>

			<view class="row">
				<text class="label">昵称</text>
				<input
					class="input"
					type="text"
					maxlength="32"
					placeholder="请输入昵称"
					:value="form.nickname"
					@input="onNicknameInput"
					@blur="onNicknameBlur"
				/>
			</view>
		</view>

		<view
			class="save-btn"
			:class="{ disabled: saving }"
			@click="save"
		>
			{{ saving ? '保存中...' : '保存' }}
		</view>
		<AppHost />
	</view>
</template>

<script>
	import { updateUserProfile, uploadUserAvatar, fetchUserInfo } from '../api/user.js'
	import { useUserStore } from '../../../stores/user.js'
	import { showConfirm } from '../../../utils/modal.js'
	import { showToast } from '../../../utils/toast.js'
	import AppHost from '../../../components/AppHost.vue'

	// 微信文档默认头像（HTTPS），不要用本地 SVG
	const DEFAULT_AVATAR =
		'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

	function asAvatarUrl(value) {
		if (typeof value !== 'string') return ''
		const s = value.trim()
		if (!s || s.endsWith('.svg')) return ''
		return s
	}

	export default {
		components: { AppHost },
		data() {
			return {
				form: {
					nickname: '',
					avatar: ''
				},
				saving: false,
				dirty: false
			}
		},
		computed: {
			userStore() {
				return useUserStore()
			},
			avatarDisplay() {
				return asAvatarUrl(this.form.avatar) || DEFAULT_AVATAR
			}
		},
		onShow() {
			this.syncFromStore()
			this.refreshFromServer()
		},
		methods: {
			syncFromStore() {
				const u = this.userStore.userInfo || {}
				this.form.nickname = typeof u.nickname === 'string' ? u.nickname : ''
				this.form.avatar = asAvatarUrl(u.avatar)
			},
			async refreshFromServer() {
				try {
					const info = await fetchUserInfo({ showError: false })
					if (info) {
						this.userStore.patchProfile(info)
						this.syncFromStore()
					}
				} catch (e) {}
			},
			onNicknameInput(e) {
				this.form.nickname = String(e.detail?.value || '')
				this.dirty = true
			},
			onNicknameBlur(e) {
				this.form.nickname = String(e.detail?.value || '').trim()
			},
			async onChooseAvatar(e) {
				const url = asAvatarUrl(e.detail?.avatarUrl)
				if (!url) {
					uni.showToast({ title: '未获取到头像', icon: 'none' })
					return
				}
				this.form.avatar = url
				this.dirty = true
				try {
					uni.showLoading({ title: '上传中', mask: true })
					const data = await uploadUserAvatar(url)
					const next = asAvatarUrl(data?.avatar) || asAvatarUrl(data?.url) || url
					this.form.avatar = next
					this.userStore.patchProfile({
						...(data && typeof data === 'object' ? data : {}),
						avatar: next
					})
					uni.showToast({ title: '头像已更新', icon: 'success' })
				} catch (err) {
					uni.showToast({ title: err?.message || '上传失败，可稍后保存', icon: 'none' })
				} finally {
					uni.hideLoading()
				}
			},
			async save() {
				if (this.saving) return
				const nickname = String(this.form.nickname || '').trim()
				if (!nickname) {
					uni.showToast({ title: '请填写昵称', icon: 'none' })
					return
				}
				if (nickname.length > 32) {
					uni.showToast({ title: '昵称最多32字', icon: 'none' })
					return
				}
				this.saving = true
				try {
					const payload = { nickname }
					const avatar = asAvatarUrl(this.form.avatar)
					if (avatar && avatar !== DEFAULT_AVATAR) {
						if (/^wxfile:|^http:\/\/tmp/i.test(avatar)) {
							const data = await uploadUserAvatar(avatar)
							payload.avatar = asAvatarUrl(data?.avatar) || asAvatarUrl(data?.url)
							if (payload.avatar) this.form.avatar = payload.avatar
						} else {
							payload.avatar = avatar
						}
					}
					const info = await updateUserProfile(payload)
					this.userStore.patchProfile(info)
					this.syncFromStore()
					this.dirty = false
					uni.showToast({ title: '已保存', icon: 'success' })
					setTimeout(() => uni.navigateBack(), 500)
				} catch (err) {
					uni.showToast({ title: err?.message || '保存失败', icon: 'none' })
				} finally {
					this.saving = false
				}
			}
		},
		onBackPress() {
			if (!this.dirty) return false
			showConfirm('内容未保存，确定离开？').then((res) => {
				if (res.confirm) uni.navigateBack()
			})
			return true
		}
	}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background: var(--color-bg);
	padding: 24rpx;
	box-sizing: border-box;
}
.card {
	background: #fff;
	border-radius: 24rpx;
	padding: 8rpx 28rpx;
	box-shadow: 0 8rpx 24rpx rgba(61, 74, 56, 0.05);
}
.row {
	display: flex;
	align-items: center;
	min-height: 104rpx;
	border-bottom: 1rpx solid var(--color-border);
}
.row:last-child {
	border-bottom: none;
}
.label {
	width: 140rpx;
	font-size: 28rpx;
	color: var(--color-text);
	flex-shrink: 0;
}
.input {
	flex: 1;
	font-size: 28rpx;
	color: var(--color-text);
	text-align: right;
}
.avatar-row {
	padding: 20rpx 0;
}
.avatar-side {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
}
.avatar-btn {
	margin: 0;
	padding: 0;
	width: 96rpx;
	height: 96rpx;
	border: none;
	border-radius: 50%;
	overflow: hidden;
	background: var(--color-primary-soft);
	line-height: 1;
}
.avatar-btn::after {
	border: none;
}
.avatar-img {
	width: 96rpx;
	height: 96rpx;
	display: block;
}
.hint {
	margin-left: 16rpx;
	font-size: 24rpx;
	color: var(--color-icon-base);
}
.save-btn {
	margin-top: 48rpx;
	height: 88rpx;
	line-height: 88rpx;
	text-align: center;
	border-radius: 9999px;
	background: var(--color-primary);
	color: #fff;
	font-size: 30rpx;
	font-weight: 600;
}
.save-btn.disabled {
	opacity: 0.6;
}
</style>
