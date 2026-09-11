<template>
	<view class="page">
		<!-- 已选菜品（含门店） -->
		<view class="card">
			<view class="shop-bar">
				<image class="shop-pin" src="/static/icons/location-pin.png" mode="aspectFit" />
				<text class="shop-name">{{ restaurantName }}</text>
			</view>
			<view class="sec-head">
				<text class="sec-title">已选菜品</text>
				<text class="sec-desc">确认菜品后填写预约信息</text>
			</view>
			<view class="dish-list">
				<view v-for="it in items" :key="it.dishId" class="dish-row">
					<text class="dish-name">{{ it.name }}</text>
					<text class="dish-qty">x{{ it.quantity }}</text>
					<text class="dish-price">¥{{ (it.price * it.quantity).toFixed(2) }}</text>
				</view>
			</view>
			<view class="sum-row">
				<text class="sum-label">参考合计</text>
				<text class="sum-val">¥{{ totalAmount }}</text>
			</view>
		</view>

		<!-- 预约信息表单 -->
		<view class="card form-card">
			<view class="sec-head">
				<text class="sec-title">预约信息</text>
				<text class="sec-desc">请填写到店联系人与预约时间</text>
			</view>

			<view class="form-rows">
				<view class="form-row">
					<text class="form-label">下单人</text>
					<input
						class="form-input"
						v-model="contactName"
						placeholder="请输入姓名"
						placeholder-class="ph"
						maxlength="20"
					/>
				</view>

				<view class="form-row">
					<text class="form-label">手机号</text>
					<input
						class="form-input"
						v-model="contactPhone"
						type="number"
						placeholder="请输入或一键获取"
						placeholder-class="ph"
						maxlength="11"
					/>
					<button
						v-if="!hasValidPhone"
						class="phone-btn"
						open-type="getPhoneNumber"
						@getphonenumber="onGetPhone"
					>微信手机号</button>
				</view>

				<view class="form-row tap" @click="openDatetime">
					<text class="form-label">预约时间</text>
					<text class="form-value" :class="{ ph: !reserveDisplay }">
						{{ reserveDisplay || '请选择日期和时间' }}
					</text>
					<text class="chevron">›</text>
				</view>

				<view class="form-row last">
					<text class="form-label">备注</text>
					<input
						class="form-input"
						v-model="remark"
						placeholder="选填，如人数、忌口"
						placeholder-class="ph"
						maxlength="100"
					/>
				</view>
			</view>
		</view>

		<u-datetime-picker
			ref="datetimePicker"
			:show="showDatetime"
			v-model="reserveTs"
			mode="datetime"
			:minDate="minTs"
			:maxDate="maxTs"
			:filter="minuteFilter"
			title="选择预约时间"
			confirmColor="var(--color-primary)"
			:closeOnClickOverlay="true"
			@confirm="onDatetimeConfirm"
			@cancel="closeDatetime"
			@close="closeDatetime"
		/>

		<view class="bar-safe">
			<view class="bar">
				<view class="bar-info">
					<text class="bar-hint">参考合计</text>
					<text class="bar-price">¥{{ totalAmount }}</text>
				</view>
				<button class="bar-btn" :loading="submitting" @click="submit">提交预约</button>
			</view>
		</view>
	</view>
</template>

<script>
	import { createReservation } from '../api/reservations.js'
	import { useUserStore } from '../../../stores/user.js'
	import { phoneNumberLogin } from '../../../utils/auth.js'
	import UDatetimePicker from '../../../uni_modules/uview-plus/components/u-datetime-picker/u-datetime-picker.vue'

	const DRAFT_KEY = 'reservation_draft'

	function pad(n) {
		return String(n).padStart(2, '0')
	}

	function defaultReserveDate() {
		const d = new Date(Date.now() + 60 * 60 * 1000)
		const m = d.getMinutes()
		const up = Math.ceil(m / 10) * 10
		if (up >= 60) {
			d.setHours(d.getHours() + 1, 0, 0, 0)
		} else {
			d.setMinutes(up, 0, 0)
		}
		return d
	}

	function splitTs(ts) {
		const d = new Date(ts)
		return {
			date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
			time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
		}
	}

	export default {
		components: {
			'u-datetime-picker': UDatetimePicker
		},
		data() {
			const init = defaultReserveDate()
			return {
				restaurantId: 0,
				restaurantName: '',
				items: [],
				contactName: '',
				contactPhone: '',
				reserveTs: init.getTime(),
				reserveDate: splitTs(init).date,
				reserveTime: splitTs(init).time,
				remark: '',
				submitting: false,
				showDatetime: false,
				minTs: Date.now(),
				maxTs: (() => {
					const d = new Date()
					d.setMonth(d.getMonth() + 2)
					return d.getTime()
				})()
			}
		},
		computed: {
			totalAmount() {
				const t = this.items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0)
				return Math.round(t * 100) / 100
			},
			hasValidPhone() {
				return /^1\d{10}$/.test((this.contactPhone || '').trim())
			},
			reserveDisplay() {
				if (!this.reserveDate || !this.reserveTime) return ''
				return `${this.reserveDate} ${this.reserveTime}`
			}
		},
		onLoad() {
			const draft = uni.getStorageSync(DRAFT_KEY)
			if (!draft || !draft.restaurantId || !Array.isArray(draft.items) || !draft.items.length) {
				uni.showToast({ title: '请先选择菜品', icon: 'none' })
				setTimeout(() => uni.navigateBack(), 400)
				return
			}
			this.restaurantId = draft.restaurantId
			this.restaurantName = draft.restaurantName || '餐厅'
			this.items = draft.items
			this.minTs = Date.now()
			this.fillFromUser()
		},
		onShow() {
			this.fillFromUser()
		},
		methods: {
			/** 分钟列只保留 00/10/20/30/40/50 */
			minuteFilter(type, values) {
				if (type === 'minute') {
					return values.filter((v) => Number(v) % 10 === 0)
				}
				return values
			},
			fillFromUser() {
				const info = useUserStore().userInfo || {}
				const nick = (info.nickname || '').trim()
				const phone = (info.phone || '').trim()
				if (!this.contactName && nick) this.contactName = nick
				if (!this.contactPhone && phone) this.contactPhone = phone
			},
			async onGetPhone(e) {
				const data = await phoneNumberLogin(e)
				if (!data) return
				const user = useUserStore().userInfo || {}
				const phone = data.userInfo?.phone || user.phone || ''
				if (phone) this.contactPhone = phone
				const nick = data.userInfo?.nickname || user.nickname || ''
				if (nick && !this.contactName) this.contactName = nick
			},
			openDatetime() {
				this.minTs = Date.now()
				this.showDatetime = true
			},
			closeDatetime() {
				this.showDatetime = false
			},
			onDatetimeConfirm(e) {
				let ts = Number(e?.value ?? this.reserveTs)
				if (Number.isNaN(ts)) ts = Date.now()
				const d = new Date(ts)
				// 兜底对齐到 10 分钟
				const m = d.getMinutes()
				const aligned = Math.round(m / 10) * 10
				if (aligned >= 60) {
					d.setHours(d.getHours() + 1, 0, 0, 0)
				} else {
					d.setMinutes(aligned, 0, 0)
				}
				this.reserveTs = d.getTime()
				const parts = splitTs(this.reserveTs)
				this.reserveDate = parts.date
				this.reserveTime = parts.time
				this.showDatetime = false
			},
			async submit() {
				const name = (this.contactName || '').trim()
				const phone = (this.contactPhone || '').trim()
				if (!name) {
					uni.showToast({ title: '请填写下单人姓名', icon: 'none' })
					return
				}
				if (!/^1\d{10}$/.test(phone)) {
					uni.showToast({ title: '请填写正确手机号', icon: 'none' })
					return
				}
				if (!this.reserveDate || !this.reserveTime) {
					uni.showToast({ title: '请选择预约时间', icon: 'none' })
					return
				}
				const reserveAt = new Date(`${this.reserveDate}T${this.reserveTime}:00`)
				if (Number.isNaN(reserveAt.getTime()) || reserveAt.getTime() < Date.now() - 60 * 1000) {
					uni.showToast({ title: '预约时间不能早于现在', icon: 'none' })
					return
				}
				if (this.submitting) return
				this.submitting = true
				try {
					const user = useUserStore()
					if (phone && phone !== user.userInfo.phone) {
						user.updatePhone(phone)
					}
					await createReservation({
						restaurantId: this.restaurantId,
						items: this.items.map((it) => ({
							dishId: it.dishId,
							quantity: it.quantity
						})),
						contactName: name,
						contactPhone: phone,
						reserveDate: this.reserveDate,
						reserveTime: this.reserveTime,
						remark: (this.remark || '').trim()
					})
					uni.removeStorageSync(DRAFT_KEY)
					uni.showToast({ title: '预约成功', icon: 'success' })
					setTimeout(() => {
						uni.redirectTo({ url: '/pages/user/reservation/list' })
					}, 500)
				} finally {
					this.submitting = false
				}
			}
		}
	}
</script>

<style scoped>
	.page {
		padding: 24rpx 24rpx 180rpx;
		background: var(--color-bg);
		min-height: 100vh;
		box-sizing: border-box;
	}

	.card {
		background: #fff;
		border-radius: 20rpx;
		padding: 28rpx 28rpx 8rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
	}

	.shop-bar {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin: -8rpx -8rpx 20rpx;
		padding: 20rpx 20rpx;
		border-radius: 16rpx;
		background: linear-gradient(135deg, var(--color-primary-soft) 0%, #ffffff 72%);
	}
	.shop-pin {
		width: 32rpx;
		height: 32rpx;
		flex-shrink: 0;
	}
	.shop-name {
		flex: 1;
		min-width: 0;
		font-size: 30rpx;
		font-weight: 600;
		color: var(--color-primary-dark);
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sec-head {
		padding-bottom: 8rpx;
	}
	.sec-title {
		display: block;
		font-size: 34rpx;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.3;
	}
	.sec-desc {
		display: block;
		margin-top: 8rpx;
		font-size: 24rpx;
		color: #909399;
		line-height: 1.4;
	}

	.dish-list {
		margin-top: 12rpx;
	}
	.dish-row {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
	}
	.dish-name {
		flex: 1;
		font-size: 28rpx;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding-right: 16rpx;
	}
	.dish-qty {
		font-size: 26rpx;
		color: #909399;
		margin-right: 20rpx;
	}
	.dish-price {
		font-size: 28rpx;
		color: #606266;
		min-width: 120rpx;
		text-align: right;
	}
	.sum-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 22rpx 0 24rpx;
	}
	.sum-label {
		font-size: 26rpx;
		color: #909399;
	}
	.sum-val {
		font-size: 32rpx;
		font-weight: 700;
		color: var(--color-danger);
	}

	.form-card {
		padding-bottom: 12rpx;
	}
	.form-rows {
		margin-top: 8rpx;
	}
	.form-row {
		display: flex;
		align-items: center;
		min-height: 100rpx;
		border-bottom: 1rpx solid #f0f0f0;
		box-sizing: border-box;
	}
	.form-row.last {
		border-bottom: none;
	}
	.form-row.tap:active {
		opacity: 0.72;
	}
	.form-label {
		width: 160rpx;
		flex-shrink: 0;
		font-size: 28rpx;
		color: var(--color-text);
		font-weight: 500;
	}
	.form-input {
		flex: 1;
		height: 100rpx;
		line-height: 100rpx;
		font-size: 28rpx;
		color: var(--color-text);
		text-align: left;
	}
	.form-value {
		flex: 1;
		font-size: 28rpx;
		color: var(--color-text);
		text-align: left;
		line-height: 100rpx;
	}
	.ph {
		color: #c0c4cc !important;
	}
	.chevron {
		margin-left: 8rpx;
		font-size: 36rpx;
		color: #c0c4cc;
		line-height: 1;
		font-weight: 300;
		flex-shrink: 0;
	}
	.phone-btn {
		margin: 0 0 0 12rpx;
		padding: 0 18rpx;
		height: 56rpx;
		line-height: 56rpx;
		font-size: 22rpx;
		color: var(--color-primary);
		background: var(--color-primary-bg);
		border-radius: 999rpx;
		flex-shrink: 0;
		border: none;
	}
	.phone-btn::after {
		border: none;
	}

	.bar-safe {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding-bottom: env(safe-area-inset-bottom);
		background: #fff;
		box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
		z-index: 20;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16rpx 28rpx;
		gap: 24rpx;
	}
	.bar-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.bar-hint {
		font-size: 22rpx;
		color: #909399;
	}
	.bar-price {
		font-size: 40rpx;
		font-weight: 700;
		color: var(--color-danger);
		line-height: 1.2;
	}
	.bar-btn {
		margin: 0;
		flex-shrink: 0;
		min-width: 260rpx;
		height: 80rpx;
		line-height: 80rpx;
		padding: 0 40rpx;
		border-radius: 999rpx;
		background: var(--color-primary);
		color: #fff;
		font-size: 30rpx;
		font-weight: 600;
		border: none;
	}
	.bar-btn::after {
		border: none;
	}
</style>
