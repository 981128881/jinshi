const express = require('express')
const { createLogger } = require('../utils/logger')

const router = express.Router()
const enabled = process.env.CLIENT_LOG_ENABLED !== 'false'
const MAX_BATCH = 50

const adminLog = createLogger('client:admin')
const mpLog = createLogger('client:mp')

const LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal'])

router.post('/client', (req, res) => {
  if (!enabled) {
    return res.status(404).json({ code: 404, message: 'not found' })
  }

  const { logs, source } = req.body || {}
  if (!Array.isArray(logs) || logs.length === 0) {
    return res.json({ code: 0, data: { received: 0 } })
  }

  const log = source === 'admin' ? adminLog : mpLog
  const batch = logs.slice(0, MAX_BATCH)

  for (const entry of batch) {
    const level = LEVELS.has(entry?.level) ? entry.level : 'info'
    const message = entry?.message != null ? String(entry.message) : ''
    const meta = {
      ...(entry?.meta && typeof entry.meta === 'object' ? entry.meta : {}),
      clientTs: entry?.ts,
      page: entry?.page,
      userAgent: req.get('user-agent') || ''
    }
    if (typeof log[level] === 'function') {
      log[level](message, meta)
    } else {
      log.info(message, meta)
    }
  }

  res.json({ code: 0, data: { received: batch.length } })
})

module.exports = router
