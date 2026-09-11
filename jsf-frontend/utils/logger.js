import config from '../config/index.js'

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }

/** @type {Array<{ level: string, message: string, meta?: object, ts: string, page?: string, scope?: string }>} */
let buffer = []
let flushing = false
let requestSeq = 0

function levelValue(name) {
	return LEVELS[name] ?? LEVELS.info
}

function shouldLog(level) {
	return levelValue(level) >= levelValue(config.logger.level)
}

function currentPage() {
	try {
		const pages = getCurrentPages()
		const page = pages[pages.length - 1]
		return page?.route || ''
	} catch {
		return ''
	}
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

function flush() {
	if (!config.logger.reportEnabled || buffer.length === 0 || flushing) return
	const batch = buffer.splice(0, 50)
	flushing = true

	uni.request({
		url: `${config.baseUrl}/logs/client`,
		method: 'POST',
		data: {
			source: 'mp',
			logs: batch.map(({ level, message, meta, ts, page, scope }) => ({
				level,
				message: scope ? `[${scope}] ${message}` : message,
				meta,
				ts,
				page
			}))
		},
		header: { 'Content-Type': 'application/json' },
		timeout: 8000,
		complete: () => {
			flushing = false
		},
		fail: () => {
			buffer.unshift(...batch)
			if (buffer.length > config.logger.bufferMax) {
				buffer = buffer.slice(-config.logger.bufferMax)
			}
		}
	})
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

export function nextRequestId() {
	requestSeq += 1
	return `req-${Date.now()}-${requestSeq}`
}
