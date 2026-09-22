const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const backendRoot = path.join(__dirname, '../..')
const envProduction = path.join(backendRoot, '.env.production')
const envDefault = path.join(backendRoot, '.env')

const useProductionEnv =
  process.env.NODE_ENV === 'production' || process.env.USE_PRODUCTION_ENV === 'true'

if (useProductionEnv && fs.existsSync(envProduction)) {
  dotenv.config({ path: envProduction })
  process.env.NODE_ENV = process.env.NODE_ENV || 'production'
} else {
  dotenv.config({ path: envDefault })
}
// ponytail: gitignored .env wins so git pull won't reset server secrets; drop when .env.production is untracked
if (useProductionEnv && fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault, override: true })
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    accessExpiresIn: process.env.ADMIN_ACCESS_EXPIRES_IN || '2h',
    refreshExpiresIn: process.env.ADMIN_REFRESH_EXPIRES_IN || '7d'
  },
  wx: {
    appId: process.env.WX_APPID || '',
    secret: process.env.WX_SECRET || '',
    mock: process.env.WX_MOCK !== 'false',
    wxaEnv: process.env.WX_WXA_ENV || 'release',
    subscribeOrderTmplId:
      process.env.WX_SUBSCRIBE_TMPL_ORDER || 'HKCRZh-jslxB-ODzrZd-L2AKrZakzhlCEqcgg5I-lP400',
    subscribeCancelTmplId:
      process.env.WX_SUBSCRIBE_TMPL_CANCEL || 'Q4GuBW3YcoZne4ovHT4b4NIn-u2XHqh-oDp_CHcSPSS'
  },
  pay: {
    mchId: process.env.WX_MCH_ID || '',
    apiV3Key: process.env.WX_API_V3_KEY || '',
    privateKeyPath: process.env.WX_PRIVATE_KEY_PATH || '',
    privateKey: process.env.WX_PRIVATE_KEY || '',
    merchantCertPath: process.env.WX_MERCHANT_CERT_PATH || '',
    merchantCert: process.env.WX_MERCHANT_CERT || '',
    certSerialNo: process.env.WX_CERT_SERIAL_NO || '',
    notifyUrl: process.env.WX_PAY_NOTIFY_URL || '',
    refundNotifyUrl: process.env.WX_REFUND_NOTIFY_URL || process.env.WX_PAY_NOTIFY_URL?.replace(/\/notify\/?$/, '/refund/notify') || '',
    mock: process.env.WX_PAY_MOCK === 'true' || !process.env.WX_MCH_ID,
    timeoutMinutes: Number(process.env.ORDER_PAY_TIMEOUT_MINUTES) || 15
  },
  map: {
    tencentKey: process.env.TENCENT_MAP_KEY || ''
  },
  posSync: {
    token: process.env.POS_SYNC_TOKEN || ''
  }
}
