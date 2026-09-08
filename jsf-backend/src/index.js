const http = require('http')
const app = require('./app')
const config = require('./config')
const prisma = require('./db/prisma')
const { connectRedis, isRedisReady } = require('./db/redis')
const { attachAdminWebSocket } = require('./ws/adminWs')
const { attachMerchantAppWebSocket } = require('./ws/merchantAppWs')
const { logger, installProcessHandlers, getLogDir } = require('./utils/logger')

installProcessHandlers(async () => {
  await prisma.$disconnect().catch(() => {})
})

async function bootstrap() {
  logger.info('服务启动中…', { logDir: getLogDir() })

  try {
    await prisma.$connect()
    logger.info('MySQL 已连接')
  } catch (e) {
    logger.fatal('MySQL 连接失败，请确认 MySQL 已启动且 DATABASE_URL 正确', e)
    process.exit(1)
  }

  try {
    const { ensureDefaultAdmin } = require('./services/adminUser')
    await ensureDefaultAdmin()
  } catch (e) {
    logger.warn('初始化管理员账号失败', e)
  }

  await connectRedis()

  const server = http.createServer(app)
  server.requestTimeout = Number(process.env.SERVER_REQUEST_TIMEOUT_MS) || 60000
  server.headersTimeout = Number(process.env.SERVER_HEADERS_TIMEOUT_MS) || 65000
  attachAdminWebSocket(server)
  attachMerchantAppWebSocket(server)

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.fatal(`端口 ${config.port} 已被占用`, {
        hint: `netstat -ano | findstr :${config.port}`,
        kill: 'taskkill /PID <pid> /F'
      })
      process.exit(1)
    }
    logger.fatal('HTTP 服务启动失败', err)
    process.exit(1)
  })

  server.listen(config.port, () => {
    logger.info('锦食坊 API 已启动', {
      api: `http://localhost:${config.port}/api`,
      health: `http://localhost:${config.port}/health`,
      ws: `ws://localhost:${config.port}/api/admin/ws`,
      merchantAppWs: `ws://localhost:${config.port}/api/merchant-app/ws`,
      redis: isRedisReady() ? 'enabled' : 'disabled',
      requestTimeoutMs: process.env.REQUEST_TIMEOUT_MS || 30000
    })
    if (config.wx.mock) logger.info('微信登录: MOCK 模式')
  })
}

bootstrap().catch((e) => {
  logger.fatal('bootstrap 失败', e)
  process.exit(1)
})
