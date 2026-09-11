/**
 * 分角色 + 权限 + 压力
 * node scripts/role-perm-stress.js
 */
const BASE = process.env.API_BASE || 'http://localhost:3000'
const ADMIN = { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' }
const MERCHANT = {
  username: process.env.MERCHANT_USERNAME || '13800001001',
  passwords: [
    process.env.MERCHANT_PASSWORD,
    process.env.MERCHANT_SEED_PASSWORD || 'ChangeMe_jsf',
    '13800001001'
  ].filter(Boolean)
}

const results = []
function rec(cat, name, ok, detail = '') {
  results.push({ cat, name, ok, detail })
  console.log(`  ${ok ? '✓' : '✗'} [${cat}] ${name}${detail ? ` — ${detail}` : ''}`)
}

async function raw(method, path, { token, body, timeout = 15000 } = {}) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeout)
  const started = Date.now()
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
      signal: ac.signal
    })
    const data = await res.json().catch(() => null)
    return { status: res.status, data, ms: Date.now() - started }
  } catch (e) {
    return { status: 0, error: e.message, ms: Date.now() - started }
  } finally {
    clearTimeout(t)
  }
}

function bizOk(r) {
  return r.status < 400 && r.data?.code === 0
}

async function loginWith(username, passwords) {
  const list = Array.isArray(passwords) ? passwords : [passwords]
  for (const password of list) {
    const r = await raw('POST', '/api/admin/login', { body: { username, password } })
    if (bizOk(r) && r.data.data?.accessToken) return { ...r.data.data, _password: password }
  }
  return null
}

async function main() {
  console.log('=== 分角色 / 权限 / 压力 ===\n')
  const health = await raw('GET', '/health')
  if (health.status !== 200 || !health.data?.ok) {
    console.log('后端不可达', health.error || health.data)
    process.exit(1)
  }

  const admin = await loginWith(ADMIN.username, ADMIN.password)
  rec('角色', '平台超管登录', !!admin, admin ? `org=${admin.orgType} perms=${admin.permissions?.length}` : '失败')
  if (!admin) process.exit(1)
  const aTok = admin.accessToken

  const merchant = await loginWith(MERCHANT.username, MERCHANT.passwords)
  rec('角色', '门店账号登录', !!merchant, merchant ? `shop=${merchant.restaurantName} id=${merchant.restaurantId}` : '失败')
  if (!merchant) process.exit(1)
  const mTok = merchant.accessToken

  rec('角色', '超管是 platform', admin.orgType === 'platform' && admin.isSuper)
  rec('角色', '门店是 restaurant', merchant.orgType === 'restaurant' && !merchant.isSuper && !!merchant.restaurantId)

  const treeA = await raw('GET', '/api/admin/permissions/tree', { token: aTok })
  const treeM = await raw('GET', '/api/admin/permissions/tree', { token: mTok })
  const codes = (nodes = [], out = []) => {
    for (const n of nodes) {
      out.push(n.code)
      if (n.children) codes(n.children, out)
    }
    return out
  }
  const aCodes = codes(treeA.data?.data)
  const mCodes = codes(treeM.data?.data)
  rec('角色', '超管权限树含入驻/系统', aCodes.includes('menu:onboarding') && aCodes.includes('menu:system'))
  rec('角色', '门店权限树不含入驻/轮播/用户/系统', !mCodes.includes('menu:onboarding') && !mCodes.includes('menu:banners') && !mCodes.includes('menu:users') && !mCodes.includes('menu:system'))
  rec('角色', '门店权限树含店/菜单/预约', mCodes.includes('menu:restaurants') && mCodes.includes('menu:dishes') && mCodes.includes('menu:reservations'))

  const shops = await raw('GET', '/api/admin/restaurants?page=1&pageSize=50', { token: aTok })
  rec('角色', '超管能看全部门店', bizOk(shops) && (shops.data.data?.total || 0) >= 2, `total=${shops.data?.data?.total}`)
  const shopList = shops.data?.data?.list || []
  const mineId = merchant.restaurantId
  const other = shopList.find((s) => Number(s.id) !== Number(mineId))

  const mShops = await raw('GET', '/api/admin/restaurants?page=1&pageSize=50', { token: mTok })
  const mList = mShops.data?.data?.list || []
  rec('角色', '门店列表只有自己', bizOk(mShops) && mList.length === 1 && Number(mList[0]?.id) === Number(mineId), `n=${mList.length}`)

  console.log('\n[权限]')
  const allowM = [
    ['GET', '/api/admin/me'],
    ['GET', '/api/admin/dashboard'],
    ['GET', `/api/admin/restaurants/${mineId}`],
    ['GET', `/api/admin/restaurants/${mineId}/categories`],
    ['GET', `/api/admin/restaurants/${mineId}/dishes`],
    ['GET', '/api/admin/reservations?page=1&pageSize=10'],
    ['GET', '/api/admin/cuisine-types']
  ]
  for (const [method, path] of allowM) {
    const r = await raw(method, path, { token: mTok })
    rec('权限', `门店允许 ${method} ${path.split('?')[0]}`, bizOk(r), `status=${r.status}`)
  }

  const denyM = [
    ['GET', '/api/admin/onboarding'],
    ['GET', '/api/admin/banners'],
    ['GET', '/api/admin/users'],
    ['GET', '/api/admin/admins'],
    ['GET', '/api/admin/shop-config'],
    ['POST', '/api/admin/cuisine-types', { name: '__should_fail' }],
    ['POST', '/api/admin/restaurants', { name: '__hack' }],
    ['POST', '/api/admin/admins', { username: 'x', password: '123456', isSuper: true }]
  ]
  for (const [method, path, body] of denyM) {
    const r = await raw(method, path, { token: mTok, body })
    rec('权限', `门店拒绝 ${method} ${path}`, r.status === 403, `status=${r.status} ${r.data?.message || ''}`)
  }

  if (other) {
    const r1 = await raw('GET', `/api/admin/restaurants/${other.id}`, { token: mTok })
    rec('权限', '门店不能读其他店', r1.status === 403, `status=${r1.status}`)
    const r2 = await raw('PUT', `/api/admin/restaurants/${other.id}/open`, { token: mTok, body: { open: false } })
    rec('权限', '门店不能改其他店营业', r2.status === 403, `status=${r2.status}`)
    const r3 = await raw('PUT', `/api/admin/restaurants/${other.id}/status`, { token: mTok, body: { status: 'disabled' } })
    rec('权限', '门店不能改其他店审核', r3.status === 403, `status=${r3.status}`)
    const r4 = await raw('PUT', `/api/admin/restaurants/${mineId}`, { token: mTok, body: { status: 'disabled' } })
    const still = await raw('GET', `/api/admin/restaurants/${mineId}`, { token: aTok })
    rec('权限', '门店 PUT 不能改自己审核状态', still.data?.data?.status !== 'disabled', `status=${still.data?.data?.status} put=${r4.status}`)
  }

  const createSuper = await raw('POST', '/api/admin/admins', {
    token: aTok,
    body: { username: `__no_${Date.now()}`, password: '123456', isSuper: true }
  })
  rec('权限', '超管可以创建超管（本应用 admin 是超管）', bizOk(createSuper) || createSuper.status === 400, `status=${createSuper.status}`)
  if (createSuper.data?.data?.id) {
    await raw('DELETE', `/api/admin/admins/${createSuper.data.data.id}`, { token: aTok })
  }

  const allowA = [
    ['GET', '/api/admin/onboarding'],
    ['GET', '/api/admin/banners'],
    ['GET', '/api/admin/users'],
    ['GET', '/api/admin/admins'],
    ['GET', '/api/admin/shop-config']
  ]
  for (const [method, path] of allowA) {
    const r = await raw(method, path, { token: aTok })
    rec('权限', `超管允许 ${method} ${path}`, bizOk(r), `status=${r.status}`)
  }

  const noTok = await raw('GET', '/api/admin/dashboard')
  rec('权限', '未登录拒绝 dashboard', noTok.status === 401)

  console.log('\n[压力]')
  const conc = 40
  const t0 = Date.now()
  const dash = await Promise.all(Array.from({ length: conc }, () => raw('GET', '/api/admin/dashboard', { token: aTok })))
  const dashOk = dash.filter(bizOk).length
  rec('压力', `超管 dashboard 并发 ${conc}`, dashOk === conc, `ok=${dashOk} wall=${Date.now() - t0}ms p50=${dash.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(conc / 2)]}ms`)

  const t1 = Date.now()
  const mix = await Promise.all([
    ...Array.from({ length: 20 }, () => raw('GET', '/api/admin/restaurants?page=1&pageSize=20', { token: aTok })),
    ...Array.from({ length: 20 }, () => raw('GET', '/api/admin/reservations?page=1&pageSize=20', { token: aTok })),
    ...Array.from({ length: 20 }, () => raw('GET', '/api/admin/restaurants?page=1&pageSize=20', { token: mTok })),
    ...Array.from({ length: 20 }, () => raw('GET', '/api/admin/reservations?page=1&pageSize=20', { token: mTok }))
  ])
  const mixOk = mix.filter(bizOk).length
  rec('压力', '双角色列表并发 80', mixOk === 80, `ok=${mixOk}/80 wall=${Date.now() - t1}ms`)

  const t2 = Date.now()
  const logins = await Promise.all(Array.from({ length: 15 }, () => raw('POST', '/api/admin/login', { body: { username: ADMIN.username, password: ADMIN.password } })))
  const loginOk = logins.filter(bizOk).length
  rec('压力', '正确密码登录并发 15', loginOk === 15, `ok=${loginOk} wall=${Date.now() - t2}ms`)

  const t3 = Date.now()
  const pub = await Promise.all([
    ...Array.from({ length: 25 }, () => raw('GET', '/api/home/recommend')),
    ...Array.from({ length: 25 }, () => raw('GET', '/api/restaurants'))
  ])
  const pubOk = pub.filter((r) => r.status === 200 && r.data?.code === 0).length
  rec('压力', '公开接口并发 50', pubOk === 50, `ok=${pubOk}/50 wall=${Date.now() - t3}ms`)

  const cap = await raw('GET', '/api/admin/users?page=1&pageSize=999999', { token: aTok })
  rec('压力', 'pageSize=999999 被截断', (cap.data?.data?.list?.length || 0) <= 100, `n=${cap.data?.data?.list?.length}`)

  const failUser = `__stress_fail_${Date.now()}`
  let locked = false
  for (let i = 0; i < 6; i++) {
    const r = await raw('POST', '/api/admin/login', { body: { username: failUser, password: 'wrong' } })
    if (r.status === 429) locked = true
  }
  rec('压力', '错密 6 次触发 429', locked)

  const cats = ['角色', '权限', '压力']
  console.log('\n=== 汇总 ===')
  let bad = 0
  for (const c of cats) {
    const items = results.filter((r) => r.cat === c)
    const ok = items.filter((r) => r.ok).length
    const fails = items.filter((r) => !r.ok)
    bad += fails.length
    console.log(`${c}: ${ok}/${items.length}`)
    fails.forEach((r) => console.log(`  ✗ ${r.name}: ${r.detail}`))
  }
  console.log(`合计 ${results.filter((r) => r.ok).length}/${results.length}`)
  process.exit(bad ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
