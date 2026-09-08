const { PrismaClient } = require('@prisma/client')
const { createLogger } = require('../utils/logger')

const log = createLogger('prisma')

const logQuery = process.env.DB_LOG_QUERY === 'true'
const slowQueryMs = Number(process.env.DB_SLOW_QUERY_MS) || 1000

const prismaLogLevels = [
  { emit: 'event', level: 'warn' },
  { emit: 'event', level: 'error' }
]
if (logQuery) {
  prismaLogLevels.push({ emit: 'event', level: 'query' })
}

const prisma = new PrismaClient({
  log: prismaLogLevels
})

prisma.$on('warn', (e) => {
  log.warn(e.message, { target: e.target })
})

prisma.$on('error', (e) => {
  log.error(e.message, { target: e.target })
})

if (logQuery) {
  prisma.$on('query', (e) => {
    const meta = {
      durationMs: e.duration,
      target: e.target,
      query: e.query?.slice(0, 500)
    }
    if (e.duration >= slowQueryMs) {
      log.warn('慢查询', meta)
    } else {
      log.debug('query', meta)
    }
  })
}

module.exports = prisma
