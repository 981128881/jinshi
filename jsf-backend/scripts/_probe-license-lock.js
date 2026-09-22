/** 资质图锁定规则冒烟：平台可改删，门店仅首次上传 */
const BASE = process.env.API_BASE || 'http://localhost:3000'

async function login(username, password) {
  const r = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const j = await r.json()
  if (j.code !== 0) throw new Error(`login ${username}: ${JSON.stringify(j)}`)
  return j.data
}

async function put(token, id, body) {
  const r = await fetch(`${BASE}/api/admin/restaurants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  return { status: r.status, ...(await r.json()) }
}

async function get(token, id) {
  const r = await fetch(`${BASE}/api/admin/restaurants/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const j = await r.json()
  if (j.code !== 0) throw new Error(`get: ${JSON.stringify(j)}`)
  return j.data
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function main() {
  const platform = await login('admin', 'admin123')
  const merchant = await login('13800001001', '13800001001')
  const id = merchant.restaurantId
  assert(id, 'merchant has no restaurantId')

  let j = await put(platform.accessToken, id, { licenseImage: '', foodSafetyLicenseImage: '' })
  assert(j.code === 0, `platform clear: ${JSON.stringify(j)}`)

  j = await put(merchant.accessToken, id, { licenseImage: '/static/uploads/shop/__test_lic.jpg' })
  assert(j.code === 0, `merchant first license: ${JSON.stringify(j)}`)

  j = await put(merchant.accessToken, id, { licenseImage: '/static/uploads/shop/__test_lic2.jpg' })
  assert(j.code !== 0 && j.status === 403, `merchant overwrite should 403: ${JSON.stringify(j)}`)

  j = await put(merchant.accessToken, id, { foodSafetyLicenseImage: '/static/uploads/shop/__test_food.jpg' })
  assert(j.code === 0, `merchant first food: ${JSON.stringify(j)}`)

  j = await put(merchant.accessToken, id, { foodSafetyLicenseImage: '' })
  assert(j.code !== 0 && j.status === 403, `merchant clear food should 403: ${JSON.stringify(j)}`)

  j = await put(platform.accessToken, id, {
    licenseImage: '/static/uploads/shop/__plat.jpg',
    foodSafetyLicenseImage: ''
  })
  assert(j.code === 0, `platform replace: ${JSON.stringify(j)}`)

  const d = await get(platform.accessToken, id)
  assert('licenseImage' in d && 'foodSafetyLicenseImage' in d, 'GET missing license fields')
  assert(String(d.licenseImage).includes('__plat') || d.licenseImage.endsWith('__plat.jpg'), `license not replaced: ${d.licenseImage}`)
  assert(!d.foodSafetyLicenseImage, `food should be cleared: ${d.foodSafetyLicenseImage}`)

  await put(platform.accessToken, id, { licenseImage: '', foodSafetyLicenseImage: '' })
  console.log('license lock probe ok', { restaurantId: id })
}

main().catch((e) => {
  console.error('FAIL', e.message || e)
  process.exit(1)
})
