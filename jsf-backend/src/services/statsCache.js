/** 大表统计缓存，避免百万级 COUNT(*) 拖死连接池 */
const PRODUCT_COUNT_TTL_MS = 5 * 60 * 1000
const DASHBOARD_TTL_MS = 5 * 60 * 1000
const LOW_STOCK_TTL_MS = 5 * 60 * 1000

/** @type {{ value: number | null, at: number, key: string, approximate?: boolean }} */
let productCountCache = { value: null, at: 0, key: '' }

/** @type {{ data: object | null, at: number }} */
let dashboardCache = { data: null, at: 0 }

/** @type {{ count: number, list: object[], at: number }} */
let lowStockCache = { count: 0, list: [], at: 0 }

function whereKey(where) {
  return JSON.stringify(where || {})
}

/** 菜品表近似行数（兼容旧字段名 productCount） */
async function getApproxProductCount(prisma) {
  const now = Date.now()
  if (productCountCache.value != null && now - productCountCache.at < PRODUCT_COUNT_TTL_MS) {
    return productCountCache.value
  }

  try {
    const rows = await prisma.$queryRaw`
      SELECT TABLE_ROWS AS cnt
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Dish'
    `
    const value = Number(rows[0]?.cnt) || 0
    if (value > 0) {
      productCountCache = { value, at: now, key: '{}', approximate: true }
      return value
    }
  } catch {
    /* fallback */
  }

  return getProductCount(prisma)
}

/** 统计菜品数量（兼容旧 getProductCount 调用方） */
async function getProductCount(prisma, where = {}) {
  const key = whereKey(where)
  const isGlobal = key === '{}'
  const now = Date.now()

  if (isGlobal && productCountCache.value != null && productCountCache.key === key && now - productCountCache.at < PRODUCT_COUNT_TTL_MS) {
    return productCountCache.value
  }

  const value = await prisma.dish.count({ where })
  if (isGlobal) {
    productCountCache = { value, at: now, key, approximate: false }
  }
  return value
}

/** 预约到店模式无库存概念，保留接口避免 dashboard 崩溃 */
async function getLowStockStats() {
  const now = Date.now()
  if (lowStockCache.at && now - lowStockCache.at < LOW_STOCK_TTL_MS) {
    return { count: lowStockCache.count, list: lowStockCache.list }
  }
  lowStockCache = { count: 0, list: [], at: now }
  return { count: 0, list: [] }
}

function invalidateProductCount() {
  productCountCache.at = 0
  dashboardCache.at = 0
  lowStockCache.at = 0
}

function getDashboardCache() {
  if (!dashboardCache.data || Date.now() - dashboardCache.at > DASHBOARD_TTL_MS) {
    return null
  }
  return dashboardCache.data
}

function setDashboardCache(data) {
  dashboardCache = { data, at: Date.now() }
}

function invalidateDashboardCache() {
  dashboardCache.at = 0
}

module.exports = {
  getProductCount,
  getApproxProductCount,
  getLowStockStats,
  invalidateProductCount,
  getDashboardCache,
  setDashboardCache,
  invalidateDashboardCache
}
