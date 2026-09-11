const fs = require('fs')
const path = require('path')
const util = require('util')

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 }

const config = {
  dir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  toConsole: process.env.LOG_TO_CONSOLE !== 'false',
  maxFileSizeMb: Number(process.env.LOG_MAX_FILE_MB) || 20
}

function levelValue(name) {
  return LEVELS[name] ?? LEVELS.info
}

function shouldLog(level) {
  return levelValue(level) >= levelValue(config.level)
}

function ensureDir() {
  if (!fs.existsSync(config.dir)) {
    fs.mkdirSync(config.dir, { recursive: true })
  }
}

function todayFile(suffix) {
  const date = new Date().toISOString().slice(0, 10)
  return path.join(config.dir, `${suffix}-${date}.log`)
}

function rotateIfNeeded(filePath) {
  try {
    if (!fs.existsSync(filePath)) return
    const maxBytes = config.maxFileSizeMb * 1024 * 1024
    if (fs.statSync(filePath).size < maxBytes) return
    const rotated = `${filePath}.${Date.now()}.bak`
    fs.renameSync(filePath, rotated)
  } catch {
    /* ignore rotation errors */
  }
}

function errorToMeta(err) {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode
  }
}

function serializeMeta(meta) {
  if (meta instanceof Error) meta = errorToMeta(meta)
  if (!meta || (typeof meta === 'object' && !Object.keys(meta).length)) return ''
  try {
    return ` ${JSON.stringify(meta)}`
  } catch {
    return ` ${util.inspect(meta, { depth: 3 })}`
  }
}

function formatLine(level, message, meta, scope) {
  const ts = new Date().toISOString()
  const prefix = scope ? `[${scope}] ` : ''
  return `[${ts}] [${level.toUpperCase()}] ${prefix}${message}${serializeMeta(meta)}`
}

function writeFiles(level, line, scope = '') {
  try {
    ensureDir()
    const appFile = todayFile('app')
    rotateIfNeeded(appFile)
    fs.appendFileSync(appFile, `${line}\n`, 'utf8')

    if (levelValue(level) >= levelValue('error')) {
      const errFile = todayFile('error')
      rotateIfNeeded(errFile)
      fs.appendFileSync(errFile, `${line}\n`, 'utf8')
    }

    if (line.includes('"type":"http"')) {
      const accessFile = todayFile('access')
      rotateIfNeeded(accessFile)
      fs.appendFileSync(accessFile, `${line}\n`, 'utf8')
    }

    if (scope.startsWith('client:')) {
      const clientFile = todayFile('client')
      rotateIfNeeded(clientFile)
      fs.appendFileSync(clientFile, `${line}\n`, 'utf8')
    }
  } catch (e) {
    if (config.toConsole) {
      console.error('[logger] 写入日志文件失败:', e.message)
    }
  }
}

function writeConsole(level, line) {
  if (!config.toConsole) return
  if (levelValue(level) >= levelValue('error')) {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

function normalizeInput(message, meta) {
  const extra = meta instanceof Error ? errorToMeta(meta) : meta
  if (message instanceof Error) {
    return {
      message: message.message,
      meta: {
        ...extra,
        name: message.name,
        stack: message.stack
      }
    }
  }
  return { message: String(message), meta: extra }
}

function createLogger(scope = '') {
  function log(level, message, meta = {}) {
    if (!shouldLog(level)) return
    const normalized = normalizeInput(message, meta)
    const line = formatLine(level, normalized.message, normalized.meta, scope)
    writeFiles(level, line, scope)
    writeConsole(level, line)
  }

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    fatal: (msg, meta) => log('fatal', msg, meta),
    child: (childScope) => createLogger(scope ? `${scope}:${childScope}` : childScope)
  }
}

const logger = createLogger()

function logHttp(req, res, ms) {
  const status = res.statusCode
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
  logger[level](`${req.method} ${req.originalUrl || req.url} ${status} ${ms}ms`, {
    type: 'http',
    method: req.method,
    url: req.originalUrl || req.url,
    status,
    durationMs: ms,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.get('user-agent') || ''
  })
}

function installProcessHandlers(onShutdown) {
  process.on('uncaughtException', (err) => {
    logger.fatal('uncaughtException', err)
    setTimeout(() => process.exit(1), 100)
  })

  process.on('unhandledRejection', (reason) => {
    logger.fatal('unhandledRejection', reason instanceof Error ? reason : { reason: String(reason) })
  })

  const shutdown = (signal) => {
    logger.info(`收到 ${signal}，正在关闭…`)
    Promise.resolve(typeof onShutdown === 'function' ? onShutdown() : undefined)
      .catch((e) => logger.error('关闭时出错', e))
      .finally(() => process.exit(0))
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

module.exports = {
  logger,
  createLogger,
  logHttp,
  installProcessHandlers,
  getLogDir: () => config.dir,
  errorToMeta
}

if (require.main === module) {
  const assert = require('assert')
  const err = new Error('boom')
  err.code = 'ECONNRESET'
  const line = formatLine('fatal', 'uncaughtException', err, '')
  assert.match(line, /boom/)
  assert.match(line, /ECONNRESET/)
  assert.match(line, /logger\.js/)
  const httpLine = formatLine('error', 'GET /x 500 12ms', { type: 'http', status: 500 }, '')
  assert.match(httpLine, /"type":"http"/)
  console.log('ok')
}
