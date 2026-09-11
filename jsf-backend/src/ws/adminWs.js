const { WebSocketServer } = require('ws')
const prisma = require('../db/prisma')
const { verifyToken } = require('../utils/jwt')
const { startMerchantNotifySubscriber } = require('../services/merchantNotify')
const { createLogger } = require('../utils/logger')

const log = createLogger('ws')

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set()

function verifyAdminToken(token) {
  const payload = verifyToken(token)
  if (payload.role !== 'admin') {
    throw new Error('forbidden')
  }
  if (payload.type && payload.type !== 'access') throw new Error('invalid token type')
  return payload
}

function extractToken(req) {
  const auth = String(req.headers.authorization || '')
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim()
  return ''
}

function pathnameOf(req) {
  return String(req.url || '/').split('?')[0]
}

function clientCanReceive(ws, payload) {
  const mine = ws.admin?.restaurantId
  if (!mine) return true
  const rid = payload?.restaurantId
  if (rid == null) return false
  return Number(mine) === Number(rid)
}

function broadcast(payload) {
  const data = JSON.stringify(payload)
  for (const ws of clients) {
    if (ws.readyState !== ws.OPEN) continue
    if (!clientCanReceive(ws, payload)) continue
    ws.send(data)
  }
}

function attachAdminWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const pathname = pathnameOf(req)
    if (pathname !== '/api/admin/ws') {
      return
    }
    // ponytail: Chrome 把握手 401 显示成 HTTP Authentication failed；先 101 再校验
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', (ws, req) => {
    const accept = async (token) => {
      if (ws.admin) return true
      try {
        const payload = verifyAdminToken(token)
        const row = await prisma.adminUser.findUnique({
          where: { username: payload.username },
          select: { restaurantId: true, enabled: true }
        })
        if (!row || !row.enabled) return false
        ws.admin = { ...payload, restaurantId: row.restaurantId || null }
      } catch {
        return false
      }
      clients.add(ws)
      ws.send(JSON.stringify({ type: 'connected' }))
      log.info('ws connected', { username: ws.admin.username, restaurantId: ws.admin.restaurantId })
      return true
    }

    const fromHeader = extractToken(req)
    const startAuth = fromHeader
      ? accept(fromHeader)
      : Promise.resolve(false)

    startAuth.then((ok) => {
      if (ok) return
      const timer = setTimeout(() => {
        if (!ws.admin) ws.close(4403, 'Unauthorized')
      }, 15000)
      ws.once('message', async (data) => {
        clearTimeout(timer)
        if (ws.admin) return
        try {
          const msg = JSON.parse(String(data))
          if (msg && msg.token && (await accept(String(msg.token)))) return
        } catch {
          /* ignore */
        }
        ws.close(4403, 'Unauthorized')
      })
    })

    ws.on('close', () => {
      clients.delete(ws)
    })
    ws.on('error', () => clients.delete(ws))
  })

  startMerchantNotifySubscriber(broadcast).catch((e) => {
    log.error('merchant notify subscriber 启动失败', e)
  })

  log.info('商家端 WebSocket 已挂载', { path: '/api/admin/ws' })
  return wss
}

module.exports = { attachAdminWebSocket, broadcast, clientCanReceive, extractToken }

if (require.main === module) {
  const assert = require('assert')
  assert.strictEqual(extractToken({ url: '/api/admin/ws?token=abc.def', headers: {} }), '')
  assert.strictEqual(
    extractToken({ url: '/api/admin/ws', headers: { authorization: 'Bearer xyz' } }),
    'xyz'
  )
  assert.strictEqual(pathnameOf({ url: '/api/admin/ws?token=x' }), '/api/admin/ws')
  assert.equal(clientCanReceive({ admin: { restaurantId: 1 } }, { restaurantId: 2 }), false)
  assert.equal(clientCanReceive({ admin: { restaurantId: 1 } }, { restaurantId: 1 }), true)
  assert.equal(clientCanReceive({ admin: {} }, { restaurantId: 9 }), true)
  console.log('ok')
}
