const { WebSocketServer } = require('ws')
const { verifyToken } = require('../utils/jwt')
const { startMerchantNotifySubscriber } = require('../services/merchantNotify')
const { createLogger } = require('../utils/logger')

const log = createLogger('ws')

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set()

function verifyAdminToken(token) {
  const payload = verifyToken(token)
  if (payload.role !== 'admin' && payload.role !== 'merchant_admin') {
    throw new Error('forbidden')
  }
  if (payload.type && payload.type !== 'access') throw new Error('invalid token type')
  return payload
}

function broadcast(payload) {
  const data = JSON.stringify(payload)
  const targetRestaurantId = payload?.restaurantId != null ? Number(payload.restaurantId) : null
  for (const ws of clients) {
    if (ws.readyState !== ws.OPEN) continue
    // 门店组织账号只收本店通知；平台管理员收全部
    if (ws.admin?.role === 'merchant_admin') {
      if (targetRestaurantId == null) continue
      if (Number(ws.admin.restaurantId) !== targetRestaurantId) continue
    }
    ws.send(data)
  }
}

function attachAdminWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname !== '/api/admin/ws') {
      return
    }

    const token = url.searchParams.get('token') || ''
    try {
      verifyAdminToken(token)
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost')
    const token = url.searchParams.get('token') || ''
    try {
      ws.admin = verifyAdminToken(token)
    } catch {
      ws.close(4401, 'Unauthorized')
      return
    }

    clients.add(ws)
    ws.send(JSON.stringify({ type: 'connected' }))

    ws.on('close', () => clients.delete(ws))
    ws.on('error', () => clients.delete(ws))
  })

  startMerchantNotifySubscriber(broadcast).catch((e) => {
    log.error('merchant notify subscriber 启动失败', e)
  })

  log.info('商家端 WebSocket 已挂载', { path: '/api/admin/ws' })
  return wss
}

module.exports = { attachAdminWebSocket, broadcast }
