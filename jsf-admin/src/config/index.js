const ENV = {
  development: {
    baseUrl: '/api'
  },
  production: {
    baseUrl: import.meta.env.VITE_API_BASE || '/api'
  }
}

const currentEnv = import.meta.env.PROD ? 'production' : 'development'

/** @type {import('@/api/request/types.js').AppConfig} */
const config = {
  baseUrl: import.meta.env.VITE_API_BASE || ENV[currentEnv].baseUrl,
  fileBaseUrl: import.meta.env.VITE_FILE_BASE || (import.meta.env.PROD ? '' : 'http://localhost:3000'),
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
  successCode: [0, 200],
  useMock: import.meta.env.VITE_USE_MOCK === 'true',
  retry: {
    count: 2,
    delay: 800,
    retryOn: ['network', 'timeout', '5xx']
  },
  cache: {
    defaultTtl: 60 * 1000
  },
  observe: {
    enabled: import.meta.env.DEV,
    slowThreshold: 3000
  },
  logger: {
    level: import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? 'debug' : 'warn'),
    toConsole: import.meta.env.VITE_LOG_CONSOLE !== 'false',
    reportEnabled: import.meta.env.VITE_LOG_REPORT !== 'false',
    reportInterval: Number(import.meta.env.VITE_LOG_REPORT_INTERVAL) || 30000,
    bufferMax: 100
  },
  tokenKey: 'admin_token',
  refreshTokenKey: 'admin_refresh_token',
  userKey: 'admin_user',
  permissionsKey: 'admin_permissions',
  isSuperKey: 'admin_is_super',
  nicknameKey: 'admin_nickname',
  orgTypeKey: 'admin_org_type',
  restaurantIdKey: 'admin_restaurant_id',
  restaurantNameKey: 'admin_restaurant_name'
}

export default config
