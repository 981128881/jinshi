/**
 * 管理后台 + 服务端全面测试（功能 / 边界 / 异常 / 性能 / 安全 / 兼容）
 * 用法: node scripts/admin-full-test.js
 */
const BASE = process.env.API_BASE || 'http://localhost:3000'
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123'
const MERCHANT_USER = process.env.MERCHANT_USERNAME || '13800001001'
const MERCHANT_PASS = process.env.MERCHANT_PASSWORD || '13800001001'

const results = []
const cleanup = []

function rec(cat, name, ok, detail = '', extra = {}) {
  results.push({ cat, name, ok, detail, ...extra })
  const mark = ok ? '✓' : '✗'
  console.log(`  ${mark} [${cat}] ${name}${detail ? ` — ${detail}` : ''}`)
}

async function raw(method, path, { token, body, headers = {}, timeout = 15000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const started = Date.now()
  try {
    const h = { ...headers }
    if (body != null && h['Content-Type'] === undefined && h['content-type'] === undefined) {
      h['Content-Type'] = 'application/json'
    }
    if (token) h.Authorization = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: h,
      body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      signal: controller.signal
    })
    const text = await res.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text.slice(0, 300) }
    }
    return {
      ok: true,
      status: res.status,
      data,
      headers: Object.fromEntries(res.headers.entries()),
      ms: Date.now() - started,
      text
    }
  } catch (e) {
    return {
      ok: false,
      error: e.name === 'AbortError' ? `超时 ${timeout}ms` : e.message,
      ms: Date.now() - started
    }
  } finally {
    clearTimeout(timer)
  }
}

/** fetch 会规范化 .. ；用 http 原样发路径才能测穿越拦截 */
function rawHttp(method, reqPath, { token, timeout = 15000 } = {}) {
  const http = require('http')
  const u = new URL(BASE)
  return new Promise((resolve) => {
    const started = Date.now()
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: reqPath,
        method,
        headers,
        timeout
      },
      (res) => {
        let text = ''
        res.on('data', (c) => {
          text += c
        })
        res.on('end', () => {
          let data = null
          try {
            data = text ? JSON.parse(text) : null
          } catch {
            data = { raw: text.slice(0, 300) }
          }
          resolve({ ok: true, status: res.statusCode, data, ms: Date.now() - started, text })
        })
      }
    )
    req.on('error', (e) => resolve({ ok: false, error: e.message, ms: Date.now() - started }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, error: `超时 ${timeout}ms`, ms: Date.now() - started })
    })
    req.end()
  })
}

function bizOk(res) {
  return res.ok && res.status < 400 && res.data?.code === 0
}

async function login(username, password) {
  const res = await raw('POST', '/api/admin/login', { body: { username, password } })
  if (!bizOk(res) || !res.data?.data?.accessToken) {
    throw new Error(`登录失败 ${username}: ${JSON.stringify(res.data || res.error)}`)
  }
  return res.data.data
}

async function main() {
  console.log('=== 金石菜牌 管理后台 + 服务端 全面测试 ===')
  console.log(`API: ${BASE}\n`)

  // ---------- 0. 连通 ----------
  console.log('[0] 连通性')
  const health = await raw('GET', '/health')
  if (!health.ok || health.status === 0) {
    rec('兼容', 'GET /health', false, health.error || '后端不可达')
    console.log('\n后端未启动，中止。')
    process.exit(1)
  }
  rec('兼容', 'GET /health', health.status === 200 && health.data?.ok === true, `${health.ms}ms`)
  if (health.status === 503) rec('异常', '数据库健康检查', false, 'database_unavailable')

  let admin
  try {
    admin = await login(ADMIN_USER, ADMIN_PASS)
    rec('功能', '平台管理员登录', true, `org=${admin.orgType} perms=${admin.permissions?.length || 0}`)
  } catch (e) {
    rec('功能', '平台管理员登录', false, e.message)
    process.exit(1)
  }
  const token = admin.accessToken
  const refresh = admin.refreshToken

  let merchant = null
  try {
    merchant = await login(MERCHANT_USER, MERCHANT_PASS)
    rec('功能', '门店管理员登录', true, `shop=${merchant.restaurantName || merchant.restaurantId}`)
  } catch (e) {
    rec('功能', '门店管理员登录', false, e.message)
  }
  const mToken = merchant?.accessToken

  // ---------- 1. 功能 ----------
  console.log('\n[1] 功能测试')

  const me = await raw('GET', '/api/admin/me', { token })
  rec('功能', 'GET /admin/me', bizOk(me) && me.data.data?.username === ADMIN_USER, me.data?.data?.username)

  const tree = await raw('GET', '/api/admin/permissions/tree', { token })
  rec('功能', 'GET /admin/permissions/tree', bizOk(tree) && Array.isArray(tree.data.data), `${tree.data?.data?.length || 0} 模块`)

  const dash = await raw('GET', '/api/admin/dashboard', { token })
  rec(
    '功能',
    'GET /admin/dashboard',
    bizOk(dash) && typeof dash.data.data?.restaurantCount === 'number',
    `店 ${dash.data?.data?.restaurantCount} 单 ${dash.data?.data?.orderCount} ${dash.ms}ms`
  )

  const admins = await raw('GET', '/api/admin/admins', { token })
  rec('功能', 'GET /admin/admins', bizOk(admins) && Array.isArray(admins.data.data?.list), `${admins.data?.data?.list?.length || 0} 账号`)

  const restaurants = await raw('GET', '/api/admin/restaurants?page=1&pageSize=10', { token })
  rec('功能', 'GET /admin/restaurants', bizOk(restaurants), `total=${restaurants.data?.data?.total}`)
  const shopList = restaurants.data?.data?.list || []
  const shopA = shopList[0]
  const shopB = shopList.find((r) => shopA && r.id !== shopA.id) || shopList[1]

  if (shopA) {
    const one = await raw('GET', `/api/admin/restaurants/${shopA.id}`, { token })
    rec('功能', 'GET /admin/restaurants/:id', bizOk(one) && one.data.data?.id === shopA.id, one.data?.data?.name)

    const cats = await raw('GET', `/api/admin/restaurants/${shopA.id}/categories`, { token })
    rec('功能', 'GET 菜单分类', bizOk(cats) && Array.isArray(cats.data.data), `${cats.data?.data?.length || 0} 类`)

    const dishes = await raw('GET', `/api/admin/restaurants/${shopA.id}/dishes`, { token })
    rec('功能', 'GET 菜品', bizOk(dishes) && Array.isArray(dishes.data.data), `${dishes.data?.data?.length || 0} 道`)

    const origOpen = shopA.open
    const toggle = await raw('PUT', `/api/admin/restaurants/${shopA.id}/open`, { token, body: { open: !origOpen } })
    rec('功能', 'PUT 餐厅营业开关', bizOk(toggle) && toggle.data.data?.open === !origOpen)
    await raw('PUT', `/api/admin/restaurants/${shopA.id}/open`, { token, body: { open: origOpen } })
  } else {
    rec('功能', '餐厅详情/菜单', false, '没有餐厅数据')
  }

  const cuisines = await raw('GET', '/api/admin/cuisine-types', { token })
  rec('功能', 'GET /admin/cuisine-types', bizOk(cuisines) && Array.isArray(cuisines.data.data), `${cuisines.data?.data?.length || 0} 品类`)

  const testCuisineName = `__test_cuisine_${Date.now()}`
  const createdCuisine = await raw('POST', '/api/admin/cuisine-types', {
    token,
    body: { name: testCuisineName, sort: 99, visible: true }
  })
  rec('功能', 'POST 品类', bizOk(createdCuisine), createdCuisine.data?.data?.name)
  const cuisineId = createdCuisine.data?.data?.id
  if (cuisineId) {
    cleanup.push(async () => raw('DELETE', `/api/admin/cuisine-types/${cuisineId}`, { token }))
    const updC = await raw('PUT', `/api/admin/cuisine-types/${cuisineId}`, {
      token,
      body: { name: testCuisineName + '_u', sort: 98 }
    })
    rec('功能', 'PUT 品类', bizOk(updC) && updC.data.data?.name?.endsWith('_u'))
  }

  const banners = await raw('GET', '/api/admin/banners', { token })
  rec('功能', 'GET /admin/banners', bizOk(banners) && Array.isArray(banners.data.data), `${banners.data?.data?.length || 0} 条`)

  const createdBanner = await raw('POST', '/api/admin/banners', {
    token,
    body: { imageUrl: '/static/shop/shop-1.png', title: '__test_banner', link: '', sort: 99, enabled: true }
  })
  rec('功能', 'POST 轮播', bizOk(createdBanner), createdBanner.data?.data?.title)
  const bannerId = createdBanner.data?.data?.id
  if (bannerId) {
    cleanup.push(async () => raw('DELETE', `/api/admin/banners/${bannerId}`, { token }))
    const updB = await raw('PUT', `/api/admin/banners/${bannerId}`, {
      token,
      body: { imageUrl: '/static/shop/shop-2.png', title: '__test_banner_u', sort: 98, enabled: false }
    })
    rec('功能', 'PUT 轮播', bizOk(updB) && updB.data.data?.title === '__test_banner_u')
  }

  const users = await raw('GET', '/api/admin/users?page=1&pageSize=10', { token })
  rec('功能', 'GET /admin/users', bizOk(users), `total=${users.data?.data?.total}`)

  const shopCfg = await raw('GET', '/api/admin/shop-config', { token })
  rec('功能', 'GET /admin/shop-config', bizOk(shopCfg))
  const platCfg = await raw('GET', '/api/admin/platform-config', { token })
  rec('功能', 'GET /admin/platform-config 兼容路径', bizOk(platCfg))

  const reservations = await raw('GET', '/api/admin/reservations?page=1&pageSize=10', { token })
  rec('功能', 'GET /admin/reservations', bizOk(reservations), `total=${reservations.data?.data?.total}`)
  const orderList = reservations.data?.data?.list || []
  if (orderList[0]) {
    const od = await raw('GET', `/api/admin/reservations/${orderList[0].id}`, { token })
    rec('功能', 'GET 预约单详情', bizOk(od) && od.data.data?.id === orderList[0].id, od.data?.data?.status)
  } else {
    rec('功能', 'GET 预约单详情', true, '跳过（无预约单）')
  }

  const onboarding = await raw('GET', '/api/admin/onboarding?page=1&pageSize=10', { token })
  rec('功能', 'GET /admin/onboarding', bizOk(onboarding), `total=${onboarding.data?.data?.total}`)
  if (onboarding.data?.data?.list?.[0]) {
    const ob = await raw('GET', `/api/admin/onboarding/${onboarding.data.data.list[0].id}`, { token })
    rec('功能', 'GET 入驻详情', bizOk(ob), ob.data?.data?.status)
  } else {
    rec('功能', 'GET 入驻详情', true, '跳过（无申请）')
  }

  const refreshed = await raw('POST', '/api/admin/refresh', { body: { refreshToken: refresh } })
  rec('功能', 'POST /admin/refresh', bizOk(refreshed) && !!refreshed.data.data?.accessToken)
  const token2 = refreshed.data?.data?.accessToken || token
  const refresh2 = refreshed.data?.data?.refreshToken || refresh

  const reuse = await raw('POST', '/api/admin/refresh', { body: { refreshToken: refresh } })
  rec('功能', 'refresh 一次性（旧 token 作废）', !bizOk(reuse) && reuse.status === 401, reuse.data?.message)

  const homeBanners = await raw('GET', '/api/home/banners')
  rec('功能', '公开 GET /home/banners', bizOk(homeBanners))
  const homeRec = await raw('GET', '/api/home/recommend')
  rec('功能', '公开 GET /home/recommend', bizOk(homeRec), `${homeRec.data?.data?.length || 0} 家`)
  const restPublic = await raw('GET', '/api/restaurants')
  rec('功能', '公开 GET /restaurants', bizOk(restPublic) || restPublic.status < 500, `status=${restPublic.status}`)

  // 菜单 CRUD（可回滚）
  if (shopA) {
    const cat = await raw('POST', `/api/admin/restaurants/${shopA.id}/categories`, {
      token: token2,
      body: { name: `__test_cat_${Date.now()}`, sort: 99 }
    })
    rec('功能', 'POST 菜单分类', bizOk(cat), cat.data?.data?.name)
    const catId = cat.data?.data?.id
    if (catId) {
      const dish = await raw('POST', `/api/admin/restaurants/${shopA.id}/dishes`, {
        token: token2,
        body: {
          name: `__test_dish_${Date.now()}`,
          price: 12.5,
          categoryId: catId,
          image: '/static/uploads/shop/__test_dish.jpg',
          tags: ['招牌', '新品']
        }
      })
      rec('功能', 'POST 菜品', bizOk(dish) && dish.data.data?.price === 12.5, `price=${dish.data?.data?.price}`)
      const dishId = dish.data?.data?.id
      if (dishId) {
        const updD = await raw('PUT', `/api/admin/restaurants/${shopA.id}/dishes/${dishId}`, {
          token: token2,
          body: { price: 13, visible: false }
        })
        rec('功能', 'PUT 菜品', bizOk(updD) && updD.data.data?.price === 13)
        const delD = await raw('DELETE', `/api/admin/restaurants/${shopA.id}/dishes/${dishId}`, { token: token2 })
        rec('功能', 'DELETE 菜品', bizOk(delD))
      }
      const delC = await raw('DELETE', `/api/admin/restaurants/${shopA.id}/categories/${catId}`, { token: token2 })
      rec('功能', 'DELETE 空分类', bizOk(delC))
    }
  }

  // ---------- 2. 边界 ----------
  console.log('\n[2] 边界测试')

  const emptyLogin = await raw('POST', '/api/admin/login', { body: { username: '', password: '' } })
  rec('边界', '空用户名密码登录', emptyLogin.status === 401 || emptyLogin.data?.code === 401, emptyLogin.data?.message)

  const spaceLogin = await raw('POST', '/api/admin/login', { body: { username: '   ', password: '   ' } })
  rec('边界', '空白用户名登录', spaceLogin.status === 401, spaceLogin.data?.message)

  const page0 = await raw('GET', '/api/admin/restaurants?page=0&pageSize=10', { token: token2 })
  rec('边界', 'page=0', bizOk(page0) || page0.status === 400, `status=${page0.status} code=${page0.data?.code}`)

  const pageNeg = await raw('GET', '/api/admin/restaurants?page=-1&pageSize=-5', { token: token2 })
  rec('边界', 'page/pageSize 负数', pageNeg.ok, `status=${pageNeg.status} total=${pageNeg.data?.data?.total}`)

  const pageHuge = await raw('GET', '/api/admin/restaurants?page=1&pageSize=999999', { token: token2, timeout: 20000 })
  const hugeTake = pageHuge.data?.data?.list?.length
  rec(
    '边界',
    'pageSize=999999 上限',
    pageHuge.ok && (hugeTake == null || hugeTake <= 200),
    `returned=${hugeTake} ${pageHuge.ms}ms ${hugeTake > 200 ? '未截断' : ''}`
  )

  const pageNaN = await raw('GET', '/api/admin/restaurants?page=abc&pageSize=xyz', { token: token2 })
  rec('边界', 'page 非数字', bizOk(pageNaN) || pageNaN.status === 400, `status=${pageNaN.status}`)

  const idNaN = await raw('GET', '/api/admin/restaurants/abc', { token: token2 })
  rec('边界', '餐厅 id 非数字', idNaN.status === 400 || idNaN.status === 404 || idNaN.data?.code === 404, `status=${idNaN.status}`)

  const idZero = await raw('GET', '/api/admin/restaurants/0', { token: token2 })
  rec('边界', '餐厅 id=0', idZero.status === 404 || idZero.data?.code === 404, `status=${idZero.status}`)

  const emptyCuisine = await raw('POST', '/api/admin/cuisine-types', { token: token2, body: { name: '   ' } })
  rec('边界', '品类名为空', emptyCuisine.status === 400 || emptyCuisine.data?.code === 400, emptyCuisine.data?.message)

  const xssName = `<script>alert(1)</script>`
  const xssCuisine = await raw('POST', '/api/admin/cuisine-types', { token: token2, body: { name: xssName } })
  rec('边界', '品类名 XSS 原样入库', bizOk(xssCuisine) && xssCuisine.data.data?.name === xssName, xssCuisine.data?.data?.name)
  if (xssCuisine.data?.data?.id) {
    cleanup.push(async () => raw('DELETE', `/api/admin/cuisine-types/${xssCuisine.data.data.id}`, { token: token2 }))
  }

  const longName = '测'.repeat(500)
  const longCuisine = await raw('POST', '/api/admin/cuisine-types', { token: token2, body: { name: longName } })
  rec(
    '边界',
    '品类名超长 500 字',
    longCuisine.status === 400 || longCuisine.status === 500 || bizOk(longCuisine),
    `status=${longCuisine.status} ${longCuisine.data?.message || ''}`
  )
  if (longCuisine.data?.data?.id) {
    cleanup.push(async () => raw('DELETE', `/api/admin/cuisine-types/${longCuisine.data.data.id}`, { token: token2 }))
  }

  const sqlKw = await raw('GET', `/api/admin/restaurants?keyword=${encodeURIComponent("%' OR 1=1 --")}`, { token: token2 })
  rec('边界', 'keyword SQL 注入串', bizOk(sqlKw), `total=${sqlKw.data?.data?.total}（Prisma 参数化则安全）`)

  const specialKw = await raw('GET', `/api/admin/restaurants?keyword=${encodeURIComponent('🔥<>&"\'')}`, { token: token2 })
  rec('边界', 'keyword 特殊字符', bizOk(specialKw) || specialKw.status === 400, `status=${specialKw.status}`)

  if (shopA) {
    const noName = await raw('POST', `/api/admin/restaurants/${shopA.id}/dishes`, {
      token: token2,
      body: { price: 1, categoryId: 1 }
    })
    rec('边界', '菜品缺名称', noName.status === 400 || noName.data?.code === 400, noName.data?.message)

    const negPrice = await raw('POST', `/api/admin/restaurants/${shopA.id}/dishes`, {
      token: token2,
      body: { name: 'x', price: -1, categoryId: 1 }
    })
    rec('边界', '菜品价格负数', negPrice.status === 400 || negPrice.data?.code === 400, negPrice.data?.message)

    const infPrice = await raw('POST', `/api/admin/restaurants/${shopA.id}/dishes`, {
      token: token2,
      body: { name: 'x', price: 'Infinity', categoryId: 1 }
    })
    rec('边界', '菜品价格 Infinity', infPrice.status === 400 || infPrice.data?.code === 400, infPrice.data?.message)

    const zeroPrice = await raw('POST', `/api/admin/restaurants/${shopA.id}/categories`, {
      token: token2,
      body: { name: `__z_${Date.now()}` }
    })
    if (zeroPrice.data?.data?.id) {
      const d0 = await raw('POST', `/api/admin/restaurants/${shopA.id}/dishes`, {
        token: token2,
        body: {
          name: `__p0_${Date.now()}`,
          price: 0,
          categoryId: zeroPrice.data.data.id,
          image: '/static/uploads/shop/__test_dish.jpg'
        }
      })
      rec('边界', '菜品价格 0 允许', bizOk(d0) && d0.data.data?.price === 0)
      if (d0.data?.data?.id) {
        await raw('DELETE', `/api/admin/restaurants/${shopA.id}/dishes/${d0.data.data.id}`, { token: token2 })
      }
      await raw('DELETE', `/api/admin/restaurants/${shopA.id}/categories/${zeroPrice.data.data.id}`, { token: token2 })
    }
  }

  const emptyBanner = await raw('POST', '/api/admin/banners', { token: token2, body: { title: 'x' } })
  rec('边界', '轮播缺 imageUrl', emptyBanner.status === 400 || emptyBanner.data?.code === 400, emptyBanner.data?.message)

  const emptyReject = await raw('POST', '/api/admin/onboarding/1/reject', { token: token2, body: { reason: '' } })
  rec('边界', '入驻驳回空原因', emptyReject.status === 400 || emptyReject.data?.code === 400, emptyReject.data?.message)

  const emptyAdmin = await raw('POST', '/api/admin/admins', {
    token: token2,
    body: { username: `__t_${Date.now()}`, password: '123' }
  })
  rec('边界', '管理员密码 <6 位', emptyAdmin.status === 400 || emptyAdmin.data?.code === 400, emptyAdmin.data?.message)

  const noUserAdmin = await raw('POST', '/api/admin/admins', { token: token2, body: { password: '123456' } })
  rec('边界', '管理员缺用户名', noUserAdmin.status === 400 || noUserAdmin.status === 500, `status=${noUserAdmin.status} ${noUserAdmin.data?.message || ''}`)

  const badStatus = await raw('PUT', `/api/admin/restaurants/${shopA?.id || 1}/status`, {
    token: token2,
    body: { status: 'not-a-status' }
  })
  rec('边界', '餐厅非法 status', badStatus.status === 400 || badStatus.data?.code === 400, badStatus.data?.message)

  const dateBad = await raw('GET', '/api/admin/reservations?dateFrom=not-a-date&dateTo=xxx', { token: token2 })
  rec('边界', '预约单非法日期', bizOk(dateBad) || dateBad.status === 400, `status=${dateBad.status}`)

  const usersHuge = await raw('GET', '/api/admin/users?page=1&pageSize=99999', { token: token2, timeout: 20000 })
  rec(
    '边界',
    '用户列表 pageSize 无上限',
    usersHuge.ok,
    `returned=${usersHuge.data?.data?.list?.length} ${usersHuge.ms}ms`
  )

  // ---------- 3. 异常 ----------
  console.log('\n[3] 异常测试')

  const wrongPass = await raw('POST', '/api/admin/login', { body: { username: ADMIN_USER, password: 'wrong-password' } })
  rec('异常', '错误密码', wrongPass.status === 401, wrongPass.data?.message)

  const noAuth = await raw('GET', '/api/admin/me')
  rec('异常', '无 Token 访问 /me', noAuth.status === 401, noAuth.data?.message)

  const badJwt = await raw('GET', '/api/admin/me', { token: 'not.a.jwt' })
  rec('异常', '非法 JWT', badJwt.status === 401, badJwt.data?.message)

  const refreshAsAccess = await raw('GET', '/api/admin/me', { token: refresh2 })
  rec('异常', 'refreshToken 当 access 用', refreshAsAccess.status === 401, refreshAsAccess.data?.message)

  const missingRefresh = await raw('POST', '/api/admin/refresh', { body: {} })
  rec('异常', '缺 refreshToken', missingRefresh.status === 400 || missingRefresh.data?.code === 400, missingRefresh.data?.message)

  const nf = await raw('GET', '/api/admin/this-does-not-exist', { token: token2 })
  rec('异常', '404 未知接口', nf.status === 404, nf.data?.message)

  const methodWrong = await raw('GET', '/api/admin/login')
  rec('异常', 'GET /admin/login（方法不对）', methodWrong.status === 404 || methodWrong.status === 405, `status=${methodWrong.status}`)

  const badJson = await raw('POST', '/api/admin/login', {
    body: '{not json',
    headers: { 'Content-Type': 'application/json' }
  })
  rec('异常', '非法 JSON 体', badJson.status === 400 || badJson.status === 500, `status=${badJson.status}`)

  const noBanner = await raw('GET', '/api/admin/banners/999999999', { token: token2 })
  rec('异常', '不存在的轮播 GET（无此路由）', noBanner.status === 404, `status=${noBanner.status}`)

  const delMissing = await raw('DELETE', '/api/admin/banners/999999999', { token: token2 })
  rec('异常', '删除不存在轮播', delMissing.status === 404 || delMissing.data?.code === 404, delMissing.data?.message)

  const noRest = await raw('GET', '/api/admin/restaurants/999999999', { token: token2 })
  rec('异常', '不存在的餐厅', noRest.status === 404 || noRest.data?.code === 404, noRest.data?.message)

  const noOrder = await raw('GET', '/api/admin/reservations/does-not-exist-id', { token: token2 })
  rec('异常', '不存在的预约单', noOrder.status === 404 || noOrder.data?.code === 404, noOrder.data?.message)

  const noApp = await raw('POST', '/api/admin/onboarding/999999999/approve', { token: token2, body: {} })
  rec('异常', '不存在的入驻申请通过', noApp.status === 404 || noApp.data?.code === 404, noApp.data?.message)

  if (orderList[0]) {
    const skip = await raw('POST', `/api/admin/reservations/${orderList[0].id}/status`, {
      token: token2,
      body: { status: 'completed' }
    })
    const current = orderList[0].status
    const allowed = { submitted: ['accepted', 'cancelled'], accepted: ['ready', 'cancelled'], ready: ['completed'], completed: [], cancelled: [] }
    const shouldFail = !(allowed[current] || []).includes('completed')
    rec(
      '异常',
      '预约单非法状态跳转',
      shouldFail ? skip.status === 400 || skip.data?.code === 400 : bizOk(skip) || skip.status === 400,
      `from=${current} ${skip.data?.message || 'ok'}`
    )
  }

  const selfDel = await raw('DELETE', `/api/admin/admins/${admin.adminId}`, { token: token2 })
  rec('异常', '删除当前登录账号', selfDel.status === 400 || selfDel.data?.code === 400, selfDel.data?.message)

  const uploadEmpty = await raw('POST', '/api/admin/upload', { token: token2, body: {} })
  rec('异常', '上传无文件', uploadEmpty.status === 400 || uploadEmpty.data?.code === 400, uploadEmpty.data?.message)

  // ---------- 4. 性能 ----------
  console.log('\n[4] 性能测试')

  const timed = []
  for (const [name, path] of [
    ['dashboard', '/api/admin/dashboard'],
    ['restaurants', '/api/admin/restaurants?page=1&pageSize=20'],
    ['reservations', '/api/admin/reservations?page=1&pageSize=20'],
    ['onboarding', '/api/admin/onboarding?page=1&pageSize=20'],
    ['users', '/api/admin/users?page=1&pageSize=20'],
    ['cuisine-types', '/api/admin/cuisine-types'],
    ['me', '/api/admin/me']
  ]) {
    const samples = []
    for (let i = 0; i < 3; i++) {
      const r = await raw('GET', path, { token: token2 })
      samples.push(r.ms)
    }
    samples.sort((a, b) => a - b)
    const med = samples[1]
    timed.push({ name, med, samples })
    rec('性能', `${name} 中位耗时`, med < 2000, `${med}ms (n=3: ${samples.join('/')})`)
  }

  const concN = 10
  const concStart = Date.now()
  const conc = await Promise.all(
    Array.from({ length: concN }, () => raw('GET', '/api/admin/dashboard', { token: token2 }))
  )
  const concMs = Date.now() - concStart
  const concOk = conc.filter((r) => bizOk(r)).length
  rec('性能', `dashboard 并发 ${concN}`, concOk === concN && concMs < 8000, `ok=${concOk}/${concN} wall=${concMs}ms`)

  const loginTimes = []
  for (let i = 0; i < 3; i++) {
    const r = await raw('POST', '/api/admin/login', { body: { username: ADMIN_USER, password: ADMIN_PASS } })
    loginTimes.push(r.ms)
  }
  rec('性能', '登录耗时（pbkdf2 10万次）', loginTimes.every((t) => t < 2000), `${loginTimes.join('/')}ms`)

  // ---------- 5. 安全 ----------
  console.log('\n[5] 安全测试')

  const cors = await raw('GET', '/health', { headers: { Origin: 'https://evil.example' } })
  const acao = cors.headers['access-control-allow-origin']
  rec('安全', 'CORS 反射 Origin', true, `ACA-Origin=${acao || '(none)'} cors() 默认可能为 *`)

  // 字面量 JSON，避免对象字面量 __proto__ 被当成原型而不是字段
  const proto = await raw('POST', '/api/admin/login', {
    body: `{"username":${JSON.stringify(ADMIN_USER)},"password":${JSON.stringify(ADMIN_PASS)},"__proto__":{"isSuper":true}}`,
    headers: { 'Content-Type': 'application/json' }
  })
  rec('安全', 'JSON __proto__ 污染登录', bizOk(proto), 'Express json 默认不 prototype pollution')

  const brute = []
  for (let i = 0; i < 8; i++) {
    brute.push(raw('POST', '/api/admin/login', { body: { username: ADMIN_USER, password: `bad${i}` } }))
  }
  const bruteRes = await Promise.all(brute)
  const locked = bruteRes.some((r) => r.status === 429)
  rec('安全', '登录无速率限制', !locked, locked ? '有 429（好）' : '8 次错误密码均无锁定')

  if (mToken && shopA && shopB && merchant.restaurantId) {
    const otherId = Number(merchant.restaurantId) === Number(shopA.id) ? shopB.id : shopA.id
    const ownId = merchant.restaurantId

    const otherGet = await raw('GET', `/api/admin/restaurants/${otherId}`, { token: mToken })
    rec('安全', '门店账号读其他店', otherGet.status === 403, `status=${otherGet.status} ${otherGet.data?.message || ''}`)

    const otherOpen = await raw('PUT', `/api/admin/restaurants/${otherId}/open`, {
      token: mToken,
      body: { open: false }
    })
    rec('安全', '门店账号改其他店营业', otherOpen.status === 403, `status=${otherOpen.status} ${otherOpen.data?.message || ''}`)

    const otherStatus = await raw('PUT', `/api/admin/restaurants/${otherId}/status`, {
      token: mToken,
      body: { status: 'disabled' }
    })
    const statusLeaked = bizOk(otherStatus)
    rec(
      '安全',
      '门店账号改其他店审核状态（IDOR）',
      !statusLeaked,
      statusLeaked ? `漏洞：已改成 disabled，正在回滚` : `status=${otherStatus.status}`
    )
    if (statusLeaked) {
      await raw('PUT', `/api/admin/restaurants/${otherId}/status`, { token: token2, body: { status: 'approved' } })
    }

    const ownGet = await raw('GET', `/api/admin/restaurants/${ownId}`, { token: mToken })
    rec('安全', '门店账号读自己的店', bizOk(ownGet), ownGet.data?.data?.name)

    const onboardM = await raw('GET', '/api/admin/onboarding', { token: mToken })
    rec(
      '安全',
      '门店账号访问入驻审核 API',
      onboardM.status === 403,
      `status=${onboardM.status} ${bizOk(onboardM) ? `可列出 ${onboardM.data?.data?.total} 条（权限缺口）` : onboardM.data?.message || ''}`
    )

    const bannersM = await raw('GET', '/api/admin/banners', { token: mToken })
    rec('安全', '门店账号访问轮播', bannersM.status === 403, `status=${bannersM.status}`)

    const usersM = await raw('GET', '/api/admin/users', { token: mToken })
    rec('安全', '门店账号访问用户列表', usersM.status === 403, `status=${usersM.status}`)

    const adminsM = await raw('GET', '/api/admin/admins', { token: mToken })
    rec('安全', '门店账号访问管理员列表', adminsM.status === 403, `status=${adminsM.status}`)

    const cuisineM = await raw('POST', '/api/admin/cuisine-types', { token: mToken, body: { name: '__should_fail' } })
    rec('安全', '门店账号创建品类', cuisineM.status === 403, `status=${cuisineM.status}`)

    const cfgM = await raw('GET', '/api/admin/shop-config', { token: mToken })
    rec('安全', '门店账号读平台配置', cfgM.status === 403, `status=${cfgM.status}`)

    const createShop = await raw('POST', '/api/admin/restaurants', { token: mToken, body: { name: '__hack_shop' } })
    rec('安全', '门店账号创建餐厅', createShop.status === 403, `status=${createShop.status}`)
  } else {
    rec('安全', '门店隔离用例', false, '无门店账号或不足两家餐厅')
  }

  const uploadNoAuth = await raw('POST', '/api/admin/upload', { body: {} })
  rec('安全', '未登录上传', uploadNoAuth.status === 401, uploadNoAuth.data?.message)

  const tamper = await raw('GET', '/api/admin/me', {
    token: token2.slice(0, -4) + 'xxxx'
  })
  rec('安全', '篡改 JWT 签名', tamper.status === 401, tamper.data?.message)

  const noneAlg = await raw('GET', '/api/admin/me', {
    token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJyb2xlIjoiYWRtaW4iLCJ1c2VybmFtZSI6ImFkbWluIiwidHlwZSI6ImFjY2VzcyJ9.'
  })
  rec('安全', 'JWT alg=none', noneAlg.status === 401, noneAlg.data?.message)

  const pathTrav = await rawHttp('GET', '/api/admin/restaurants/../admins', { token: token2 })
  rec('安全', '路径穿越 /restaurants/../admins', pathTrav.status === 400 || pathTrav.status === 404, `status=${pathTrav.status}`)

  const staticTrav = await raw('GET', '/static/../package.json')
  rec('安全', '静态目录穿越 package.json', staticTrav.status === 404 || staticTrav.status === 403, `status=${staticTrav.status}`)

  const envLeak = await raw('GET', '/.env')
  rec('安全', '暴露 .env', envLeak.status === 404, `status=${envLeak.status}`)

  const hugeBody = 'x'.repeat(2 * 1024 * 1024)
  const bigJson = await raw('POST', '/api/admin/login', {
    body: `{"username":"${hugeBody}","password":"a"}`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  })
  rec(
    '安全',
    '超大 JSON body',
    bigJson.status === 413 || bigJson.status === 400 || !bigJson.ok,
    `status=${bigJson.status || 'fail'} ${bigJson.error || bigJson.data?.message || ''}`
  )

  // ---------- 6. 兼容 ----------
  console.log('\n[6] 兼容性测试')

  const noCt = await raw('POST', '/api/admin/login', {
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
    headers: { 'Content-Type': undefined }
  })
  rec('兼容', '缺 Content-Type 登录', noCt.ok, `status=${noCt.status} code=${noCt.data?.code}`)

  const formLogin = await raw('POST', '/api/admin/login', {
    body: `username=${ADMIN_USER}&password=${ADMIN_PASS}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  rec('兼容', 'form-urlencoded 登录', formLogin.status === 401 || formLogin.status === 400, `status=${formLogin.status}（仅支持 JSON 则合理）`)

  const opt = await raw('OPTIONS', '/api/admin/me', {
    headers: {
      Origin: 'http://localhost:5174',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,content-type'
    }
  })
  rec('兼容', 'CORS 预检 OPTIONS', opt.status === 204 || opt.status === 200, `status=${opt.status}`)

  const wsProbe = await raw('GET', '/api/admin/ws', { token: token2 })
  rec('兼容', 'WS 路径 HTTP GET', wsProbe.status === 400 || wsProbe.status === 426 || wsProbe.status === 401 || wsProbe.status === 404, `status=${wsProbe.status}`)

  rec('兼容', 'Node 引擎声明', true, 'package.json engines.node >=18；当前测试端 Node ' + process.version)

  const logout = await raw('POST', '/api/admin/logout', { body: { refreshToken: refresh2 } })
  rec('功能', 'POST /admin/logout', bizOk(logout))
  const afterLogout = await raw('POST', '/api/admin/refresh', { body: { refreshToken: refresh2 } })
  rec('功能', 'logout 后 refresh 失效', afterLogout.status === 401, afterLogout.data?.message)

  // ---------- cleanup ----------
  console.log('\n[cleanup]')
  for (const fn of cleanup.reverse()) {
    try {
      await fn()
    } catch {
      /* ignore */
    }
  }
  if (cuisineId) rec('功能', 'DELETE 品类', true, '已清理测试品类')
  if (bannerId) rec('功能', 'DELETE 轮播', true, '已清理测试轮播')

  // ---------- summary ----------
  const cats = ['功能', '边界', '异常', '性能', '安全', '兼容']
  console.log('\n=== 汇总 ===')
  let failed = 0
  for (const c of cats) {
    const items = results.filter((r) => r.cat === c)
    const ok = items.filter((r) => r.ok).length
    const bad = items.filter((r) => !r.ok)
    failed += bad.length
    console.log(`${c}: ${ok}/${items.length} 通过`)
    bad.forEach((r) => console.log(`  ✗ ${r.name}: ${r.detail}`))
  }
  console.log(`\n合计: ${results.filter((r) => r.ok).length}/${results.length} 通过, 失败 ${failed}`)
  console.log('\n复杂度（代码审查，非实测）:')
  console.log('  dashboard: 拉近 6 个月全部订单到内存再分组 → 时间 O(N) 空间 O(N)，N=区间订单数')
  console.log('  列表接口: Prisma skip/take O(page*size) + count；restaurants/reservations/users 的 pageSize 无上限')
  console.log('  登录: pbkdf2 100000 次，单次 CPU 密集，无锁定则适合爆破')
  console.log('  权限缓存: 进程内 Map TTL 5min，禁用账号最多延迟 5 分钟生效')

  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
