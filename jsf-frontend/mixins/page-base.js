import { cancelPageRequests } from '../utils/request.js'
import AppHost from '../components/AppHost.vue'

let pageSeq = 0

export default {
	components: { AppHost, AppModal: AppHost },
	data() {
		return {
			actionLoading: {}
		}
	},
	created() {
		this._pageRequestId = `p${++pageSeq}_${Date.now()}`
	},
	onUnload() {
		cancelPageRequests(this._pageRequestId)
	},
	methods: {
		isLoading(key) {
			return !!this.actionLoading[key]
		},
		/** 防重复点击 + loading 锁 */
		async runAction(key, fn) {
			if (this.actionLoading[key]) return
			this.actionLoading[key] = true
			try {
				return await fn()
			} finally {
				this.actionLoading[key] = false
			}
		}
	}
}
