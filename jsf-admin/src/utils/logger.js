import config from '@/config'

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }

/** @type {Array<{ level: string, message: string, meta?: object, ts: string, page?: string }>} */
let buffer = []
let flushing = false
let flushTimer = null

function levelValue(name) {
  return LEVELS[name] ?? LEVELS.info
}

function shouldLog(level) {
  return levelValue(level) >= levelValue(config.logger.level)
}

function currentPage() {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}`
}

function normalizeInput(message, meta = {}) {
  if (message instanceof Error) {
    return {
      message: message.message,
      meta: { ...meta, name: message.name, stack: message.stack }
    }
  }
  return { message: String(message), meta }
}

function writeConsole(level, message, meta, scope) {
  if (!config.logger.toConsole) return
  const prefix = scope ? `[${scope}] ` : ''
  const payload = Object.keys(meta).length ? meta : undefined
  if (levelValue(level) >= levelValue('error')) {
    console.error(prefix + message, payload)
  } else if (level === 'warn') {
    console.warn(prefix + message, payload)
  } else if (level === 'debug') {
    console.debug(prefix + message, payload)
  } else {
    console.log(prefix + message, payload)
  }
}

function enqueue(level, message, meta, scope) {
  if (!config.logger.reportEnabled) return
  buffer.push({
    level,
    message,
    meta,
    ts: new Date().toISOString(),
    page: currentPage(),
    scope
  })
  if (buffer.length > config.logger.bufferMax) {
    buffer = buffer.slice(-config.logger.bufferMax)
  }
  if (levelValue(level) >= levelValue('error') || buffer.length >= 20) {
    flush()
  }
}

function buildPayload(batch) {
  return JSON.stringify({
    source: 'admin',
    logs: batch.map(({ level, message, meta, ts, page, scope }) => ({
      level,
      message: scope ? `[${scope}] ${message}` : message,
      meta,
      ts,
      page
    }))
  })
}

export async function flush(sync = false) {
  if (!config.logger.reportEnabled || buffer.length === 0 || flushing) return
  const batch = buffer.splice(0, 50)
  flushing = true

  const url = `${config.baseUrl}/logs/client`
  const body = buildPayload(batch)

  try {
    if (sync && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    } else {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      })
    }
  } catch {
    buffer.unshift(...batch)
    if (buffer.length > config.logger.bufferMax) {
      buffer = buffer.slice(-config.logger.bufferMax)
    }
  } finally {
    flushing = false
  }
}

function startFlushTimer() {
  if (!config.logger.reportEnabled || flushTimer) return
  flushTimer = setInterval(() => flush(), config.logger.reportInterval)
}

export function createLogger(scope = '') {
  function log(level, message, meta = {}) {
    if (!shouldLog(level)) return
    const normalized = normalizeInput(message, meta)
    writeConsole(level, normalized.message, normalized.meta, scope)
    enqueue(level, normalized.message, normalized.meta, scope)
  }

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    child: (childScope) => createLogger(scope ? `${scope}:${childScope}` : childScope)
  }
}

export const logger = createLogger('admin')

export function installGlobalHandlers(app) {
  app.config.errorHandler = (err, _instance, info) => {
    logger.error('Vue 运行时错误', { message: err?.message, info, stack: err?.stack })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      logger.error(
        '未处理的 Promise 拒绝',
        reason instanceof Error
          ? reason
          : { reason: typeof reason === 'string' ? reason : JSON.stringify(reason) }
      )
    })

    window.addEventListener('error', (event) => {
      logger.error('全局脚本错误', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    window.addEventListener('beforeunload', () => flush(true))
  }

  startFlushTimer()
  logger.info('管理后台日志已初始化', { level: config.logger.level })
}

export default logger
