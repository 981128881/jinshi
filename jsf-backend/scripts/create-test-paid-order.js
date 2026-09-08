/**
 * 创建一笔已付款测试订单（mock 支付），并触发商家 WebSocket 推送
 * 用法: node scripts/create-test-paid-order.js
 */
const http = require('http')

const BASE = process.env.API_BASE || 'http://localhost:3000'
const PRODUCT_ID = Number(process.env.PRODUCT_ID || 1)
const QUANTITY = Number(process.env.QUANTITY || 1)

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE)
    const data = body ? JSON.stringify(body) : ''
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (data) headers['Content-Length'] = Buffer.byteLength(data)

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
            reject(new Error(`invalid json: ${raw}`))
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
  const productsRes = await request('GET', '/api/products?page=1&pageSize=1')
  let productId = PRODUCT_ID
  if (productsRes.code === 0 && productsRes.data?.list?.length) {
    productId = productsRes.data.list[0].id
  } else if (productsRes.code === 0 && Array.isArray(productsRes.data) && productsRes.data.length) {
    productId = productsRes.data[0].id
  } else {
    console.error('没有可用商品，请先执行: npm run db:seed')
    process.exit(1)
  }

  const login = await request('POST', '/api/auth/phone-login', {
    loginCode: 'test_login',
    phoneCode: 'test_phone'
  })
  if (login.code !== 0 || !login.data?.token) {
    console.error('用户登录失败', login)
    process.exit(1)
  }

  const token = login.data.token
  const orderRes = await request('POST', '/api/orders', {
    items: [{ productId, quantity: QUANTITY }]
  }, token)
  if (orderRes.code !== 0 || !orderRes.data?.orderId) {
    console.error('创建订单失败', orderRes)
    process.exit(1)
  }

  const orderId = orderRes.data.orderId
  const payRes = await request('POST', `/api/orders/${orderId}/prepay`, {}, token)
  if (payRes.code !== 0) {
    console.error('支付失败', payRes)
    process.exit(1)
  }

  console.log('已创建并支付测试订单:')
  console.log('  productId:', productId)
  console.log('  orderId:', orderId)
  console.log('  mockPay:', payRes.data?.mockPay ?? true)
  console.log('  管理后台查看: http://localhost:5173/orders （筛选「待发货」）')
  console.log('  若商家端已登录并连接 WebSocket，应收到 order.paid 并语音播报')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
