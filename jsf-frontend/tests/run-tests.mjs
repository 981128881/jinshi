/**
 * 商超小程序 - 自动化自测脚本
 * 运行: node tests/run-tests.mjs
 */
import assert from 'assert'

// ─── 纯函数单元测试（从源码复制逻辑，避免 uni 依赖）───

function calcDistanceKm(lat1, lng1, lat2, lng2) {
	const toRad = (deg) => (deg * Math.PI) / 180
	const R = 6371
	const dLat = toRad(lat2 - lat1)
	const dLng = toRad(lng2 - lng1)
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function resolveImageUrl(url, fileBaseUrl = 'http://localhost:3000') {
	if (!url) return ''
	if (/^https?:\/\//i.test(url)) return url
	const base = fileBaseUrl.replace(/\/$/, '')
	return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`
}

function formatAddress(item) {
	if (!item) return ''
	return `${item.province || ''}${item.city || ''}${item.district || ''}${item.detail || ''}`
}

function formatAddressShort(item) {
	if (!item) return ''
	const region = `${item.district || item.city || ''}`
	const detail = item.detail || ''
	const text = region + detail
	return text.length > 18 ? text.slice(0, 18) + '…' : text
}

function cartTotalPrice(items) {
	return items.filter(i => i.selected).reduce((s, i) => s + i.price * i.quantity, 0)
}

function cartTotalCount(items) {
	return items.reduce((s, i) => s + i.quantity, 0)
}

function buildUrl(url, baseUrl = 'http://localhost:3000/api') {
	if (/^https?:\/\//.test(url)) return url
	const base = baseUrl.replace(/\/$/, '')
	const path = url.startsWith('/') ? url : '/' + url
	return base + path
}

function parseApiResponse(body, successCode = [0, 200]) {
	if (!body || typeof body !== 'object' || !('code' in body)) return body
	const { code, data } = body
	if (successCode.includes(code)) return data !== undefined ? data : body
	throw body
}

let passed = 0
let failed = 0

function test(name, fn) {
	try {
		fn()
		passed++
		console.log(`  ✓ ${name}`)
	} catch (e) {
		failed++
		console.log(`  ✗ ${name}`)
		console.log(`    → ${e.message}`)
	}
}

console.log('\n═══ 第一层：单元测试 ═══\n')

console.log('[calcDistanceKm]')
test('同一点距离为 0', () => assert.strictEqual(calcDistanceKm(30, 120, 30, 120), 0))
test('北京到上海约 1000+ km', () => {
	const d = calcDistanceKm(39.9, 116.4, 31.2, 121.5)
	assert.ok(d > 1000 && d < 1200, `实际 ${d}`)
})

console.log('\n[resolveImageUrl]')
test('空值返回空串', () => assert.strictEqual(resolveImageUrl(''), ''))
test('完整 URL 原样返回', () => {
	const u = 'https://cdn.example.com/a.jpg'
	assert.strictEqual(resolveImageUrl(u), u)
})
test('相对路径拼接 base', () => {
	assert.strictEqual(resolveImageUrl('/img/a.jpg'), 'http://localhost:3000/img/a.jpg')
})

function showOriginalPrice(product) {
	const original = Number(product?.originalPrice)
	const price = Number(product?.price)
	if (!Number.isFinite(original) || original <= 0) return false
	if (!Number.isFinite(price)) return true
	return original > price
}

console.log('\n[showOriginalPrice]')
test('未设置原价不展示', () => {
	assert.strictEqual(showOriginalPrice({ price: 10, originalPrice: 0 }), false)
	assert.strictEqual(showOriginalPrice({ price: 10 }), false)
})
test('原价不大于现价不展示', () => {
	assert.strictEqual(showOriginalPrice({ price: 10, originalPrice: 10 }), false)
	assert.strictEqual(showOriginalPrice({ price: 10, originalPrice: 8 }), false)
})
test('有效原价展示', () => {
	assert.strictEqual(showOriginalPrice({ price: 10, originalPrice: 15 }), true)
})

console.log('\n[formatAddress]')
test('null 返回空', () => assert.strictEqual(formatAddress(null), ''))
test('完整地址拼接', () => {
	assert.strictEqual(
		formatAddress({ province: '广东省', city: '深圳市', district: '南山区', detail: '科技园' }),
		'广东省深圳市南山区科技园'
	)
})

console.log('\n[formatAddressShort]')
test('超长截断', () => {
	const r = formatAddressShort({ district: '南山区', detail: '科技园南路123号某某大厦A座1001室' })
	assert.ok(r.endsWith('…'))
	assert.ok(r.length <= 19)
})

console.log('\n[cart getters]')
test('总价只计选中项', () => {
	const items = [
		{ id: 1, price: 10, quantity: 2, selected: true },
		{ id: 2, price: 5, quantity: 1, selected: false }
	]
	assert.strictEqual(cartTotalPrice(items), 20)
})
test('总数量含未选中', () => {
	const items = [
		{ id: 1, price: 10, quantity: 2, selected: true },
		{ id: 2, price: 5, quantity: 3, selected: false }
	]
	assert.strictEqual(cartTotalCount(items), 5)
})

console.log('\n[buildUrl]')
test('拼接 API 路径', () => assert.strictEqual(buildUrl('/orders'), 'http://localhost:3000/api/orders'))
test('绝对 URL 不拼接', () => assert.strictEqual(buildUrl('https://x.com/a'), 'https://x.com/a'))

console.log('\n[parseApiResponse]')
test('code=0 返回 data', () => assert.deepStrictEqual(parseApiResponse({ code: 0, data: [1] }), [1]))
test('code=200 返回 data', () => assert.deepStrictEqual(parseApiResponse({ code: 200, data: 'ok' }), 'ok'))
test('code=401 抛错', () => {
	assert.throws(() => parseApiResponse({ code: 401, message: '未登录' }))
})

// ─── 集成 / 静态检查 ───

console.log('\n═══ 第一层：集成测试（静态） ═══\n')

import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readJson(p) {
	return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
}

const pagesJson = readJson('pages.json')
const routes = (await import(pathToFileURL(path.join(root, 'constants/routes.js')).href)).default
const config = (await import(pathToFileURL(path.join(root, 'config/index.js')).href)).default

const tabPaths = pagesJson.tabBar.list.map(t => t.pagePath)
const allPagePaths = [
	...pagesJson.pages.map(p => p.path),
	...pagesJson.subPackages.flatMap(sp => sp.pages.map(p => `${sp.root}/${p.path}`))
]

console.log('[路由一致性]')
	for (const [key, route] of Object.entries(routes)) {
	const pagePath = route.replace(/^\//, '')
	const inPages = allPagePaths.includes(pagePath)
	const isTab = tabPaths.includes(pagePath)
	test(`ROUTES.${key} → ${route} 页面存在`, () => assert.ok(inPages, '页面未在 pages.json 注册'))
	if (['/pages/index/index', '/pages/category/index', '/pages/cart/index', '/pages/mine/index'].includes(route)) {
		test(`ROUTES.${key} 为 tabBar 页`, () => assert.ok(isTab))
	}
}

console.log('\n[TabBar 图标]')
for (const tab of pagesJson.tabBar.list) {
	for (const field of ['iconPath', 'selectedIconPath']) {
		const iconFile = path.join(root, tab[field])
		test(`${tab.text} ${field} 文件存在`, () => assert.ok(fs.existsSync(iconFile)))
		if (fs.existsSync(iconFile)) {
			const size = fs.statSync(iconFile).size
			test(`${tab.text} ${field} ≤40KB`, () => assert.ok(size <= 40 * 1024, `${size} bytes`))
		}
	}
}

console.log('\n[API Mock 配置]')
test('useMock 配置可读', () => assert.ok(typeof config.useMock === 'boolean'))
	if (!config.useMock) {
		test('useMock 已关闭，走后台接口', () => assert.strictEqual(config.useMock, false))
	} else {
		console.log('  ⚠ useMock=true，小程序使用本地 Mock，后台修改不会生效')
	}

// ─── 冒烟 / 功能路径（代码走查）───

console.log('\n═══ 第二层：冒烟测试（代码走查） ═══\n')

const smokeFlows = [
	{
		name: '启动 → 静默登录',
		file: 'App.vue',
		checks: ['trySilentLoginOnLaunch', 'initBadge']
	},
	{
		name: '首页加载',
		file: 'pages/index/index.vue',
		checks: ['fetchBanners', 'fetchCategories', 'fetchRecommendProducts']
	},
	{
		name: '商品详情 → 加购 → 购物车',
		file: 'pages/shop/product/detail.vue',
		checks: ['addItem', 'switchTab', 'ROUTES.CART']
	},
	{
		name: '购物车结算',
		file: 'pages/cart/index.vue',
		checks: ['createOrder', 'ensureDeliveryAvailable', 'payOrder', 'isLogin']
	},
	{
		name: '订单支付',
		file: 'pages/user/order/list.vue',
		checks: ['payOrder']
	},
	{
		name: '我的 → 登录',
		file: 'pages/mine/index.vue',
		checks: ['goLogin', 'ROUTES.LOGIN']
	},
	{
		name: '登录页',
		file: 'pages/user/login/index.vue',
		checks: ['phoneNumberLogin', 'getPhoneNumber', '同意协议并手机号快捷登录']
	}
]

for (const flow of smokeFlows) {
	const content = fs.readFileSync(path.join(root, flow.file), 'utf8')
	for (const check of flow.checks) {
		test(`${flow.name}: 含 ${check}`, () => assert.ok(content.includes(check)))
	}
}

// ─── 已知问题检测 ───

console.log('\n═══ 缺陷扫描 ═══\n')

const issues = []

if (!config.useMock) {
	issues.push({ level: 'P0', msg: 'config.useMock=false 且无可用后端，全站 API 请求将失败' })
}

const cartContent = fs.readFileSync(path.join(root, 'pages/cart/index.vue'), 'utf8')
if (!cartContent.includes('payOrder')) {
	issues.push({ level: 'P1', msg: '购物车结算未接入支付流程' })
}

if (fs.existsSync(path.join(root, 'pages/order/index.vue'))) {
	issues.push({ level: 'P2', msg: 'pages/order/index.vue 冗余订单页未清理' })
}

if (!cartContent.includes('isLogin')) {
	issues.push({ level: 'P2', msg: '购物车结算未校验登录态' })
}

for (const issue of issues) {
	console.log(`  [${issue.level}] ${issue.msg}`)
}

// ─── 汇总 ───

console.log('\n═══ 测试汇总 ═══')
console.log(`  通过: ${passed}`)
console.log(`  失败: ${failed}`)
console.log(`  缺陷: ${issues.length}`)
console.log(failed === 0 ? '\n  单元/静态测试全部通过' : '\n  存在失败用例，请修复')
process.exit(failed > 0 ? 1 : 0)
