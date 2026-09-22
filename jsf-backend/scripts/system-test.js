/**
 * 全链路冒烟测试：数据库 + API（管理端 + 小程序端）
 * 用法: node scripts/system-test.js
 */
const BASE = process.env.API_BASE || 'http://localhost:3000'
const REQUEST_TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS) || 120000

const results = []

function pass(name, detail = '') {
  results.push({ name, ok: true, detail })
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail })
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function request(method, path, { token, body, label } = {}) {
  const name = label || `${method} ${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })
    let data = null
    const text = await res.text()
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text?.slice(0, 200) }
    }
    return { ok: true, status: res.status, data, name }
  } catch (e) {
    const msg = e.name === 'AbortError' ? `超时 ${REQUEST_TIMEOUT_MS}ms` : (e.cause?.code || e.code || e.message)
    return { ok: false, error: msg, name }
  } finally {
    clearTimeout(timer)
  }
}

async function call(name, runner) {
  try {
    await runner()
  } catch (e) {
    fail(name, e.message)
  }
}

async function testDatabase() {
  console.log('\n[1] 数据库')
  await call('数据库', async () => {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    await prisma.$connect()

    const [products, categories, users, orders, admins] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.adminUser.count()
    ])

    pass('MySQL 连接', `商品 ${products} / 分类 ${categories} / 用户 ${users} / 订单 ${orders} / 管理员 ${admins}`)
    if (products < 1) fail('种子数据-商品', '商品数为 0，请执行 npm run db:seed')
    else pass('种子数据-商品')
    if (categories < 1) fail('种子数据-分类', '分类数为 0')
    else pass('种子数据-分类')
    if (admins < 1) fail('管理员账号', '请执行 npm run db:patch-admin-users')
    else pass('管理员账号')

    await prisma.$disconnect()
  })
}

async function checkServerUp() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok || res.status === 503
  } catch (e) {
    return false
  }
}

async function testBackendHealth() {
  console.log('\n[2] 后端服务')
  const up = await checkServerUp()
  if (!up) {
    fail('后端 HTTP 服务', '未启动或不可达。请先另开终端执行: cd G:\\supermarket\\wxapp-backend && npm run dev')
    return false
  }
  await call('GET /health', async () => {
    const res = await request('GET', '/health', { label: 'GET /health' })
    if (!res.ok) return fail('GET /health', res.error)
    if (res.data?.ok) pass('GET /health')
    else fail('GET /health', JSON.stringify(res.data))
  })
  return true
}

async function testAdminApi() {
  console.log('\n[3] 管理后台 API')
  let token = ''

  const login = await request('POST', '/api/admin/login', {
    label: 'POST /admin/login',
    body: { username: 'admin', password: 'admin123' }
  })
  if (!login.ok) {
    fail('POST /admin/login', login.error)
    return
  }
  if (login.data?.code === 0 && login.data?.data?.accessToken) {
    token = login.data.data.accessToken
    pass('POST /admin/login', `权限 ${login.data.data.permissions?.length || 0} 项`)
  } else {
    fail('POST /admin/login', JSON.stringify(login.data))
    return
  }

  const adminTests = [
    {
      name: 'GET /admin/me',
      run: async () => {
        const res = await request('GET', '/api/admin/me', { token, label: 'GET /admin/me' })
        if (!res.ok) return fail('GET /admin/me', res.error)
        if (res.data?.code === 0) pass('GET /admin/me', res.data.data?.username)
        else fail('GET /admin/me', JSON.stringify(res.data))
      }
    },
    {
      name: 'GET /admin/dashboard',
      run: async () => {
        const res = await request('GET', '/api/admin/dashboard', { token, label: 'GET /admin/dashboard' })
        if (!res.ok) return fail('GET /admin/dashboard', res.error)
        if (res.data?.code === 0) {
          pass('GET /admin/dashboard', `商品 ${res.data.data?.productCount}, 订单 ${res.data.data?.orderCount}`)
        } else fail('GET /admin/dashboard', JSON.stringify(res.data))
      }
    },
    {
      name: 'GET /admin/permissions/tree',
      run: async () => {
        const res = await request('GET', '/api/admin/permissions/tree', { token, label: 'GET /admin/permissions/tree' })
        if (!res.ok) return fail('GET /admin/permissions/tree', res.error)
        if (res.data?.code === 0) pass('GET /admin/permissions/tree', `${res.data.data?.length || 0} 模块`)
        else fail('GET /admin/permissions/tree', JSON.stringify(res.data))
      }
    },
    {
      name: 'GET /admin/admins',
      run: async () => {
        const res = await request('GET', '/api/admin/admins', { token, label: 'GET /admin/admins' })
        if (!res.ok) return fail('GET /admin/admins', res.error)
        if (res.data?.code === 0) pass('GET /admin/admins', `${res.data.data?.list?.length || 0} 账号`)
        else fail('GET /admin/admins', JSON.stringify(res.data))
      }
    },
    {
      name: 'GET /admin/products',
      run: async () => {
        const res = await request('GET', '/api/admin/products?page=1&pageSize=5', { token, label: 'GET /admin/products' })
        if (!res.ok) return fail('GET /admin/products', res.error)
        if (res.data?.code === 0) pass('GET /admin/products', `total=${res.data.data?.total}`)
        else fail('GET /admin/products', JSON.stringify(res.data))
      }
    },
    {
      name: 'GET /admin/orders',
      run: async () => {
        const res = await request('GET', '/api/admin/orders?page=1&pageSize=5', { token, label: 'GET /admin/orders' })
        if (!res.ok) return fail('GET /admin/orders', res.error)
        if (res.data?.code === 0) pass('GET /admin/orders', `total=${res.data.data?.total}`)
        else fail('GET /admin/orders', JSON.stringify(res.data))
      }
    }
  ]

  for (const item of adminTests) {
    await item.run()
  }
}

async function testMiniProgramApi() {
  console.log('\n[4] 小程序公开 API')

  const mpTests = [
    ['GET /home/banners', 'GET', '/api/home/banners'],
    ['GET /home/recommend', 'GET', '/api/home/recommend'],
    ['GET /restaurants', 'GET', '/api/restaurants'],
    ['GET /config/shop', 'GET', '/api/config/shop'],
    ['GET /auth/wx-status', 'GET', '/api/auth/wx-status']
  ]

  for (const [name, method, path] of mpTests) {
    const res = await request(method, path, { label: name })
    if (!res.ok) {
      fail(name, res.error)
      continue
    }
    if (res.data?.code === 0 || res.status === 200) {
      const d = res.data?.data
      const detail = Array.isArray(d)
        ? `${d.length} 条`
        : d?.total != null
          ? `total=${d.total}`
          : d?.name || d?.configured != null
            ? `configured=${d.configured}`
            : 'ok'
      pass(name, detail)
    } else {
      fail(name, JSON.stringify(res.data))
    }
  }
}

async function main() {
  console.log('=== 商超系统冒烟测试 ===')
  console.log(`API: ${BASE}`)
  console.log(`超时: ${REQUEST_TIMEOUT_MS}ms`)

  await testDatabase()
  const serverUp = await testBackendHealth()
  if (serverUp !== false) {
    await testAdminApi()
    await testMiniProgramApi()
  } else {
    console.log('\n[3] 管理后台 API — 跳过（后端未启动）')
    console.log('[4] 小程序 API — 跳过（后端未启动）')
  }

  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)
  console.log('\n=== 汇总 ===')
  console.log(`通过: ${passed} / ${results.length}`)
  if (failed.length) {
    console.log('失败项:')
    failed.forEach((r) => console.log(`  - ${r.name}: ${r.detail}`))
    process.exit(1)
  }
  console.log('全部通过 ✓')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
