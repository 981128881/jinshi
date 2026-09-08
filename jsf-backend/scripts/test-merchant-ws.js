/**
 * 商家 App WebSocket 推送自检（预约单）
 * 用法:
 *   MERCHANT_USER=xxx MERCHANT_PASS=xxx node scripts/test-merchant-ws.js
 * 或先创建账号后使用默认探测；也可用 publishMerchantNotify 直推（需 restaurantId）
 */
const http = require('http')
const WebSocket = require('ws')

const BASE = process.env.API_BASE || 'http://localhost:3000'
const USERNAME = process.env.MERCHANT_USER || process.env.ADMIN_USERNAME || ''
const PASSWORD = process.env.MERCHANT_PASS || process.env.ADMIN_PASSWORD || ''
const RESTAURANT_ID = Number(process.env.RESTAURANT_ID || 0)

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE)
    const data = body ? JSON.stringify(body) : null
    const headers = {}
    if (data) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(data)
    }
    if (token) headers.Authorization = `Bearer ${token}`
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers
      },
      (res) => {
        let raw = ''
        res.on('data', (c) => { raw += c })
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw))
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function main() {
  let token = ''
  let restaurantId = RESTAURANT_ID

  if (USERNAME && PASSWORD) {
    const login = await request('POST', '/api/merchant-app/login', {
      username: USERNAME,
      password: PASSWORD
    })
    if (login.code !== 0 || !login.data?.accessToken) {
      console.error('商家 App 登录失败', login)
      process.exit(1)
    }
    token = login.data.accessToken
    restaurantId = login.data.restaurantId
    console.log('[login] ok', { restaurantId, username: login.data.username })
  } else {
    console.log('[skip] 未提供 MERCHANT_USER/MERCHANT_PASS，仅测试 publish 本地广播')
  }

  if (token) {
    const wsUrl =
      BASE.replace('http://', 'ws://').replace('https://', 'wss://') +
      `/api/merchant-app/ws?token=${encodeURIComponent(token)}`

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl)
      const timer = setTimeout(() => {
        ws.close()
        reject(new Error('timeout waiting for reservation'))
      }, 8000)

      ws.on('open', () => console.log('[ws] connected'))
      ws.on('message', (msg) => {
        const payload = JSON.parse(msg.toString())
        console.log('[ws] message', payload)
        if (payload.type === 'connected') {
          ;(async () => {
            const { connectRedis, isRedisReady, getRedis } = require('../src/db/redis')
            await connectRedis()
            const body = JSON.stringify({
              type: 'reservation',
              orderId: 'TEST_RES_' + Date.now(),
              restaurantId,
              totalAmount: 88,
              createTime: new Date().toISOString()
            })
            if (isRedisReady()) {
              await getRedis().publish('merchant:order:paid', body)
              console.log('[ws] published test reservation via redis')
            } else {
              console.warn('[ws] redis unavailable; cannot cross-process publish')
            }
          })().catch((e) => console.error(e))
        }
        if (payload.type === 'reservation') {
          console.log('[ok] received reservation')
          clearTimeout(timer)
          ws.close()
          resolve()
        }
      })
      ws.on('error', reject)
    })
  } else {
    const { publishMerchantNotify } = require('../src/services/merchantNotify')
    await publishMerchantNotify({
      type: 'reservation',
      orderId: 'TEST_RES_' + Date.now(),
      restaurantId: restaurantId || 1,
      totalAmount: 88,
      createdAt: new Date()
    })
    console.log('[ok] published reservation (no ws client)')
  }

  console.log('done')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
