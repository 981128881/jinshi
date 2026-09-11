<template>
	<view v-if="modal.visible" class="modal-mask" @click="onMaskClick" @touchmove.stop.prevent>
		<view class="modal-panel" @click.stop>
			<view class="modal-glow" />
			<view class="modal-head">
				<view class="modal-icon" :class="iconClass">
					<text class="modal-icon-text">{{ iconText }}</text>
				</view>
				<text v-if="modal.title" class="modal-title">{{ modal.title }}</text>
			</view>
			<text v-if="modal.content" class="modal-content">{{ modal.content }}</text>
			<view class="modal-footer" :class="{ single: !modal.showCancel }">
				<view
					v-if="modal.showCancel"
					class="modal-btn ghost"
					hover-class="modal-btn--hover"
					:hover-stay-time="80"
					@click="onCancel"
				>
					{{ modal.cancelText }}
				</view>
				<view
					class="modal-btn solid"
					:class="confirmClass"
					hover-class="modal-btn--press"
					:hover-stay-time="80"
					@click="onConfirm"
				>
					{{ modal.confirmText }}
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { useModalStore } from '../stores/modal.js'

	export default {
		computed: {
			modal() {
				return useModalStore()
			},
			iconClass() {
				const t = this.modal.type
				if (t === 'danger') return 'is-danger'
				if (t === 'success') return 'is-success'
				return 'is-default'
			},
			iconText() {
				const t = this.modal.type
				if (t === 'danger') return '!'
				if (t === 'success') return '✓'
				return 'i'
			},
			confirmClass() {
				return this.modal.type === 'danger' ? 'is-danger' : 'is-primary'
			}
		},
		methods: {
			onConfirm() {
				this.modal.confirm()
			},
			onCancel() {
				this.modal.cancel()
			},
			onMaskClick() {
				if (this.modal.showCancel) this.onCancel()
			}
		}
	}
</script>

<style scoped>
.modal-mask {
	position: fixed;
	inset: 0;
	z-index: 10000;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 48rpx;
	box-sizing: border-box;
	background: rgba(61, 74, 56, 0.42);
}
.modal-panel {
	position: relative;
	width: 100%;
	max-width: 580rpx;
	padding: 44rpx 36rpx 32rpx;
	border-radius: 28rpx;
	background: linear-gradient(180deg, #ffffff 0%, #fbfaf7 100%);
	border: 1rpx solid var(--color-border);
	box-shadow: 0 24rpx 64rpx rgba(61, 74, 56, 0.16);
	overflow: hidden;
	animation: modal-in 0.24s cubic-bezier(0.22, 1, 0.36, 1);
	box-sizing: border-box;
}
.modal-glow {
	position: absolute;
	left: -20%;
	top: -80rpx;
	width: 140%;
	height: 180rpx;
	background: radial-gradient(ellipse at center, rgba(136, 168, 123, 0.22) 0%, rgba(136, 168, 123, 0) 70%);
	pointer-events: none;
}
@keyframes modal-in {
	from {
		opacity: 0;
		transform: translateY(24rpx) scale(0.96);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}
.modal-head {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 16rpx;
}
.modal-icon {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 20rpx;
}
.modal-icon.is-default {
	background: var(--color-primary-soft);
}
.modal-icon.is-success {
	background: var(--color-primary-soft);
}
.modal-icon.is-danger {
	background: var(--color-danger-bg);
}
.modal-icon-text {
	font-size: 34rpx;
	font-weight: 700;
	line-height: 1;
}
.modal-icon.is-default .modal-icon-text,
.modal-icon.is-success .modal-icon-text {
	color: var(--color-primary-dark);
}
.modal-icon.is-danger .modal-icon-text {
	color: var(--color-danger);
}
.modal-title {
	display: block;
	font-size: 34rpx;
	font-weight: 600;
	color: var(--color-text);
	text-align: center;
	line-height: 1.35;
	letter-spacing: 0.5rpx;
}
.modal-content {
	position: relative;
	display: block;
	margin: 8rpx 8rpx 36rpx;
	font-size: 28rpx;
	color: var(--color-text-secondary);
	line-height: 1.7;
	text-align: center;
	white-space: pre-line;
}
.modal-footer {
	position: relative;
	display: flex;
	gap: 20rpx;
}
.modal-footer.single .modal-btn {
	flex: 1;
}
.modal-btn {
	flex: 1;
	height: 84rpx;
	border-radius: 9999px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: 600;
	box-sizing: border-box;
}
.modal-btn.ghost {
	background: var(--color-surface);
	color: var(--color-text-secondary);
	border: 1rpx solid var(--color-border);
}
.modal-btn.solid.is-primary {
	background: var(--color-primary);
	color: #ffffff;
	box-shadow: 0 10rpx 24rpx rgba(136, 168, 123, 0.35);
}
.modal-btn.solid.is-danger {
	background: var(--color-danger);
	color: #ffffff;
	box-shadow: 0 10rpx 24rpx rgba(225, 29, 72, 0.25);
}
.modal-btn--hover {
	opacity: 0.88;
}
.modal-btn--press {
	opacity: 0.9;
	transform: scale(0.98);
}
</style>
