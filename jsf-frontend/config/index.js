const ENV = {
	development: {
		baseUrl: import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'
	},
	production: {
		baseUrl: import.meta.env.VITE_API_BASE || 'https://api.cr20.help/api'
	}
}

const currentEnv = import.meta.env.PROD ? 'production' : 'development'

// 对接管理后台时请保持 false；仅无后端离线演示时改为 true
const USE_MOCK = false

// 开发环境模拟登录（需后端 /auth/dev-login）
const ENABLE_DEV_LOGIN = currentEnv === 'development'

export default {
	baseUrl: ENV[currentEnv].baseUrl,
	timeout: 15000,
	successCode: [0, 200],
	useMock: USE_MOCK,
	enableDevLogin: ENABLE_DEV_LOGIN,
	// 客服电话兜底（后台 /config/shop 也会返回）
	servicePhone: '400-888-8888',
	logger: {
		level: currentEnv === 'development' ? 'debug' : 'warn',
		toConsole: currentEnv === 'development',
		reportEnabled: !USE_MOCK,
		reportInterval: 30000,
		bufferMax: 80
	}
}
