const currentEnv = import.meta.env.PROD ? 'production' : 'development'

// 对接管理后台时请保持 false；仅无后端离线演示时改为 true
const USE_MOCK = false

export default {
	baseUrl: import.meta.env.VITE_API_BASE || 'https://api.cr20.help/api',
	timeout: 15000,
	successCode: [0, 200],
	useMock: USE_MOCK,
	// 客服电话兜底（后台 /config/shop 也会返回）
	servicePhone: '400-888-8888',
	// 公众平台 → 订阅消息 模板ID；未填则不弹授权、不发来单提醒
	subscribeOrderTmplId:
		import.meta.env.VITE_WX_SUBSCRIBE_TMPL_ORDER ||
		'HKCRZh-jslxB-ODzrZd-L2AKrZakzhlCEqcgg5I-lP400',
	subscribeCancelTmplId:
		import.meta.env.VITE_WX_SUBSCRIBE_TMPL_CANCEL ||
		'Q4GuBW3YcoZne4ovHT4b4NIn-u2XHqh-oDp_CHcSPSS',
	logger: {
		level: currentEnv === 'development' ? 'debug' : 'warn',
		toConsole: currentEnv === 'development',
		reportEnabled: !USE_MOCK,
		reportInterval: 30000,
		bufferMax: 80
	}
}
