<template>
	<button
		class="app-btn"
		:class="[type, size, { block, plain, disabled: isDisabled, loading: isDisabled }]"
		:disabled="isDisabled"
		:loading="loading || actionLoading"
		:open-type="openType"
		@click="handleClick"
		@getphonenumber="onGetPhoneNumber"
	>
		<slot />
	</button>
</template>

<script>
	export default {
		props: {
			type: { type: String, default: 'primary' },
			size: { type: String, default: 'md' },
			block: { type: Boolean, default: false },
			plain: { type: Boolean, default: false },
			disabled: { type: Boolean, default: false },
			loading: { type: Boolean, default: false },
			openType: { type: String, default: '' }
		},
		emits: ['click', 'getphonenumber'],
		data() {
			return {
				actionLoading: false,
				_locked: false
			}
		},
		computed: {
			isDisabled() {
				return this.disabled || this.loading || this.actionLoading || this._locked
			}
		},
		methods: {
			onGetPhoneNumber(e) {
				this.$emit('getphonenumber', e)
			},
			handleClick(e) {
			if (this.openType) return
			if (this.isDisabled) return
			if (!this.loading) {
				this._locked = true
				this.actionLoading = true
				setTimeout(() => {
					this._locked = false
					this.actionLoading = false
				}, 500)
			}
			this.$emit('click', e)
		}
		}
	}
</script>

<style scoped>
.app-btn {
	margin: 0;
	padding: 0 32rpx;
	border: none;
	border-radius: 9999px;
	font-size: 28rpx;
	font-weight: 500;
	line-height: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}
.app-btn::after { border: none; }
.app-btn.block {
	width: 100% !important;
	display: flex;
}
.app-btn.md { height: 80rpx; }
.app-btn.sm { height: 64rpx; font-size: 26rpx; }
.app-btn.primary {
	background: var(--color-primary);
	color: #ffffff;
}
.app-btn.primary.plain {
	background: var(--color-primary-bg);
	color: var(--color-primary);
	border: 2rpx solid var(--color-primary);
}
.app-btn.default {
	background: var(--color-surface);
	color: #666666;
}
.app-btn.danger {
	background: var(--color-danger-bg);
	color: var(--color-danger);
}
.app-btn.disabled {
	opacity: 0.55;
}
</style>
