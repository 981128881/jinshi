<template>
	<view v-if="toast.visible" class="toast-mask" @touchmove.stop.prevent>
		<view class="toast-panel" :class="'icon-' + toast.icon">
			<view v-if="toast.icon !== 'none'" class="toast-icon" :class="'is-' + toast.icon">
				<text class="toast-icon-text">{{ iconGlyph }}</text>
			</view>
			<text class="toast-title">{{ toast.title }}</text>
		</view>
	</view>
</template>

<script>
	import { useToastStore } from '../stores/toast.js'

	export default {
		computed: {
			toast() {
				return useToastStore()
			},
			iconGlyph() {
				if (this.toast.icon === 'success') return '✓'
				if (this.toast.icon === 'error') return '!'
				if (this.toast.icon === 'loading') return '…'
				return ''
			}
		}
	}
</script>

<style scoped>
.toast-mask {
	position: fixed;
	inset: 0;
	z-index: 10010;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
}
.toast-panel {
	max-width: 70%;
	min-width: 200rpx;
	padding: 28rpx 36rpx;
	border-radius: 20rpx;
	background: rgba(61, 74, 56, 0.88);
	box-shadow: 0 16rpx 40rpx rgba(61, 74, 56, 0.22);
	display: flex;
	flex-direction: column;
	align-items: center;
	animation: toast-in 0.2s ease-out;
}
.toast-panel.icon-none {
	padding: 22rpx 36rpx;
}
@keyframes toast-in {
	from {
		opacity: 0;
		transform: translateY(12rpx) scale(0.96);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}
.toast-icon {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	margin-bottom: 14rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.toast-icon.is-success {
	background: rgba(136, 168, 123, 0.35);
}
.toast-icon.is-error {
	background: rgba(225, 29, 72, 0.28);
}
.toast-icon.is-loading {
	background: rgba(255, 255, 255, 0.12);
}
.toast-icon-text {
	color: #ffffff;
	font-size: 28rpx;
	font-weight: 700;
	line-height: 1;
}
.toast-title {
	color: #ffffff;
	font-size: 28rpx;
	line-height: 1.45;
	text-align: center;
	word-break: break-all;
}
</style>
