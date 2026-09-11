<template>
	<view class="app-host">
		<AppModal />
		<AppToast />
	</view>
</template>

<script>
	import AppModal from './AppModal.vue'
	import AppToast from './AppToast.vue'

	export default {
		components: { AppModal, AppToast }
	}
</script>

<style scoped>
.app-host {
	position: relative;
	z-index: 9999;
}
</style>
