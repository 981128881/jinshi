const http = require('http')
const app = require('./app')
const config = require('./config')
const prisma = require('./db/prisma')
const { connectRedis, isRedisReady } = require('./db/redis')
const { attachAdminWebSocket } = require('./ws/adminWs')
const { logger, installProcessHandlers, getLogDir } = require('./utils/logger')

installProcessHandlers(async () => {
  await prisma.$disconnect().catch(() => {})
})

async function bootstrap() {
  logger.info('服务启动中…', { logDir: getLogDir() })

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret') {
      logger.fatal('生产环境必须设置 JWT_SECRET')
      process.exit(1)
    }
  }

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
    if (process.env.NODE_ENV === 'production') {
      logger.fatal('初始化管理员账号失败', e)
      process.exit(1)
    }
    logger.warn('初始化管理员账号失败', e)
  }

  try {
    const { backfillRestaurantCodes } = require('./utils/restaurantCode')
    const n = await backfillRestaurantCodes()
    if (n) logger.info('已补全门店编号', { count: n })
  } catch (e) {
    logger.warn('补全门店编号失败', e)
  }

  await connectRedis()

  const server = http.createServer(app)
  server.requestTimeout = Number(process.env.SERVER_REQUEST_TIMEOUT_MS) || 60000
  server.headersTimeout = Number(process.env.SERVER_HEADERS_TIMEOUT_MS) || 65000
  attachAdminWebSocket(server)

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
    logger.info('金石菜牌 API 已启动', {
      api: `http://localhost:${config.port}/api`,
      health: `http://localhost:${config.port}/health`,
      ws: `ws://localhost:${config.port}/api/admin/ws`,
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
