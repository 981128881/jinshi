const { WebSocketServer } = require('ws')
const { verifyMerchantAppToken } = require('../middleware/merchantAppAuth')
const { startMerchantNotifySubscriber } = require('../services/merchantNotify')
const { createLogger } = require('../utils/logger')

const log = createLogger('merchant-app-ws')

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set()

function broadcastToRestaurant(payload) {
  const data = JSON.stringify(payload)
  const restaurantId = Number(payload.restaurantId)
  for (const ws of clients) {
    if (ws.readyState !== ws.OPEN) continue
    if (restaurantId && ws.restaurantId !== restaurantId) continue
    ws.send(data)
  }
}

function attachMerchantAppWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname !== '/api/merchant-app/ws') {
      return
    }

    const token = url.searchParams.get('token') || ''
    try {
      verifyMerchantAppToken(token)
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
      const auth = verifyMerchantAppToken(token)
      ws.restaurantId = auth.restaurantId
      ws.accountId = auth.accountId
    } catch {
      ws.close(4401, 'Unauthorized')
      return
    }

    clients.add(ws)
    ws.send(JSON.stringify({ type: 'connected', restaurantId: ws.restaurantId }))

    ws.on('close', () => clients.delete(ws))
    ws.on('error', () => clients.delete(ws))
  })

  startMerchantNotifySubscriber((payload) => {
    if (payload?.type && payload.type !== 'reservation') return
    broadcastToRestaurant(payload)
  }).catch((e) => {
    log.error('merchant-app notify subscriber 启动失败', e)
  })

  log.info('商家 App WebSocket 已挂载', { path: '/api/merchant-app/ws' })
  return wss
}

module.exports = { attachMerchantAppWebSocket }
