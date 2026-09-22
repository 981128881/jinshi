const {
  getApproxProductCount,
  getDashboardCache,
  setDashboardCache,
  getLowStockStats,
  invalidateDashboardCache
} = require('./statsCache')
const { createLogger } = require('../utils/logger')

const log = createLogger('dashboard')
// 统计口径变更后清一次旧缓存
invalidateDashboardCache()

/** 预约单状态（与 schema Order.status 一致） */
const RESERVATION_STATUS = {
  SUBMITTED: 'submitted',
  ACCEPTED: 'accepted',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function sumAmount(list) {
  return list.reduce((s, o) => s + (o.totalAmount || 0), 0)
}

/** 统计口径：已取消不参与预约额/单量 */
function activeOrderWhere(scope = {}) {
  return { ...scope, status: { not: RESERVATION_STATUS.CANCELLED } }
}

function buildSalesTrend(trendOrders, todayStart) {
  const salesTrendDay = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart)
    dayStart.setDate(dayStart.getDate() - i)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    const dayOrders = trendOrders.filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd)
    salesTrendDay.push({
      date: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
      sales: round2(sumAmount(dayOrders)),
      orders: dayOrders.length
    })
  }

  const salesTrendWeek = []
  for (let i = 3; i >= 0; i--) {
    const bucketEnd = new Date(todayStart)
    bucketEnd.setDate(bucketEnd.getDate() - i * 7 + 1)
    const bucketStart = new Date(bucketEnd)
    bucketStart.setDate(bucketStart.getDate() - 7)
    const bucketOrders = trendOrders.filter((o) => o.createdAt >= bucketStart && o.createdAt < bucketEnd)
    const labelStart = new Date(bucketStart)
    salesTrendWeek.push({
      date: `${labelStart.getMonth() + 1}/${labelStart.getDate()}-${new Date(bucketEnd.getTime() - 1).getDate()}`,
      sales: round2(sumAmount(bucketOrders)),
      orders: bucketOrders.length
    })
  }

  const salesTrendMonth = []
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - i, 1)
    const mEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() - i + 1, 1)
    const monthBucket = trendOrders.filter((o) => o.createdAt >= mStart && o.createdAt < mEnd)
    salesTrendMonth.push({
      date: `${mStart.getFullYear()}/${mStart.getMonth() + 1}`,
      sales: round2(sumAmount(monthBucket)),
      orders: monthBucket.length
    })
  }

  return { day: salesTrendDay, week: salesTrendWeek, month: salesTrendMonth }
}

async function buildTopDishes(prisma, restaurantId = null) {
  const itemWhere = {
    dishId: { not: null },
    order: activeOrderWhere(restaurantId ? { restaurantId: Number(restaurantId) } : {})
  }

  const grouped = await prisma.orderItem.groupBy({
    by: ['dishId'],
    where: itemWhere,
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5
  })

  const dishWhere = { visible: true }
  if (restaurantId) dishWhere.restaurantId = Number(restaurantId)

  if (!grouped.length) {
    const fallback = await prisma.dish.findMany({
      where: dishWhere,
      orderBy: { id: 'desc' },
      take: 5,
      select: { id: true, name: true, price: true }
    })
    return fallback.map((d) => ({ id: d.id, name: d.name, sales: 0, price: d.price, stock: 0 }))
  }

  const ids = grouped.map((g) => g.dishId).filter(Boolean)
  const dishes = await prisma.dish.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, price: true }
  })
  const dishMap = new Map(dishes.map((d) => [d.id, d]))

  return grouped.map((g) => {
    const dish = dishMap.get(g.dishId) || {}
    return {
      id: g.dishId,
      name: dish.name || `菜品#${g.dishId}`,
      sales: g._sum.quantity || 0,
      price: dish.price || 0,
      stock: 0
    }
  })
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ restaurantId?: number|null }} [options]
 */
async function buildDashboardData(prisma, options = {}) {
  const restaurantId = options.restaurantId ? Number(options.restaurantId) : null
  const scoped = !!restaurantId

  // 平台级 dashboard 才走全局缓存；门店级每次现算
  if (!scoped) {
    const cached = getDashboardCache()
    if (cached) {
      log.debug('使用 dashboard 缓存')
      return cached
    }
  }

  log.info('开始构建 dashboard 统计数据', { restaurantId: restaurantId || 'all' })
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
  const trendFrom = new Date(todayStart.getFullYear(), todayStart.getMonth() - 5, 1)

  const orderScope = scoped ? { restaurantId } : {}
  const dishScope = scoped ? { restaurantId } : {}
  const activeScope = activeOrderWhere(orderScope)

  const [
    restaurantCount,
    userCount,
    orderCount,
    todayOrders,
    yesterdayOrders,
    weekOrders,
    monthOrders,
    trendOrders,
    pendingPay,
    pendingShip,
    pendingReceive,
    pendingOnboarding,
    cuisineTypeCount,
    dishCount
  ] = await Promise.all([
    scoped
      ? prisma.restaurant.count({ where: { id: restaurantId } })
      : prisma.restaurant.count({ where: { status: 'approved' } }),
    scoped ? Promise.resolve(0) : prisma.user.count(),
    prisma.order.count({ where: activeScope }),
    prisma.order.findMany({
      where: { ...activeScope, createdAt: { gte: todayStart } },
      select: { totalAmount: true }
    }),
    prisma.order.findMany({
      where: { ...activeScope, createdAt: { gte: yesterdayStart, lt: todayStart } },
      select: { totalAmount: true }
    }),
    prisma.order.findMany({
      where: { ...activeScope, createdAt: { gte: weekStart } },
      select: { createdAt: true, totalAmount: true }
    }),
    prisma.order.findMany({
      where: { ...activeScope, createdAt: { gte: monthStart } },
      select: { createdAt: true, totalAmount: true }
    }),
    prisma.order.findMany({
      where: { ...activeScope, createdAt: { gte: trendFrom } },
      select: { createdAt: true, totalAmount: true }
    }),
    prisma.order.count({ where: { ...orderScope, status: RESERVATION_STATUS.SUBMITTED } }),
    prisma.order.count({ where: { ...orderScope, status: RESERVATION_STATUS.ACCEPTED } }),
    prisma.order.count({ where: { ...orderScope, status: RESERVATION_STATUS.READY } }),
    scoped
      ? Promise.resolve(0)
      : prisma.onboardingApplication.count({
          where: { status: { in: ['submitted', 'reviewing'] } }
        }),
    scoped ? Promise.resolve(0) : prisma.cuisineType.count(),
    prisma.dish.count({ where: dishScope })
  ])

  const productCount = scoped ? dishCount : await getApproxProductCount(prisma)
  const categoryCount = restaurantCount

  const [topProducts, lowStock] = await Promise.all([
    buildTopDishes(prisma, restaurantId),
    scoped ? Promise.resolve({ count: 0, list: [] }) : getLowStockStats()
  ])

  const todaySales = round2(sumAmount(todayOrders))
  const yesterdaySales = round2(sumAmount(yesterdayOrders))

  const payload = {
    productCount,
    dishCount: productCount,
    categoryCount,
    restaurantCount,
    cuisineTypeCount,
    userCount,
    orderCount,
    pendingOnboarding,
    todayOrderCount: todayOrders.length,
    todaySales,
    yesterdaySales,
    yesterdayOrderCount: yesterdayOrders.length,
    pendingPay,
    pendingShip,
    pendingReceive,
    pendingSubmitted: pendingPay,
    pendingAccepted: pendingShip,
    pendingReady: pendingReceive,
    lowStockCount: lowStock?.count ?? 0,
    periodStats: {
      day: { label: '今日', sales: todaySales, orders: todayOrders.length },
      week: { label: '近7日', sales: round2(sumAmount(weekOrders)), orders: weekOrders.length },
      month: { label: '本月', sales: round2(sumAmount(monthOrders)), orders: monthOrders.length }
    },
    salesTrend: buildSalesTrend(trendOrders, todayStart),
    topProducts,
    lowStockProducts: lowStock?.list ?? [],
    scope: scoped ? 'restaurant' : 'platform',
    restaurantId: restaurantId || null
  }

  if (!scoped) setDashboardCache(payload)
  log.info('dashboard 统计完成', { productCount, orderCount, restaurantCount, scoped })
  return payload
}

module.exports = { buildDashboardData }
