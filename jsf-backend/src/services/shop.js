const prisma = require('../db/prisma')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { getOrSet, cacheDel, CACHE_KEYS } = require('../db/redis')

function formatPlatformConfig(row) {
  if (!row) {
    return {
      name: '锦食坊',
      servicePhone: '400-888-8888',
      showBannerSection: true,
      showCategorySection: true,
      showRecommendSection: true
    }
  }
  return {
    name: row.name,
    servicePhone: row.servicePhone,
    showBannerSection: row.showBannerSection !== false,
    showCategorySection: row.showCategorySection !== false,
    showRecommendSection: row.showRecommendSection !== false
  }
}

async function loadPlatformConfigFromDb() {
  const row = await prisma.platformConfig.findUnique({ where: { id: 1 } })
  return formatPlatformConfig(row)
}

async function getShopConfig() {
  return getOrSet(CACHE_KEYS.SHOP_CONFIG, 600, loadPlatformConfigFromDb)
}

async function updateShopConfig(data = {}) {
  const payload = {
    name: data.name,
    servicePhone: data.servicePhone,
    showBannerSection: data.showBannerSection,
    showCategorySection: data.showCategorySection,
    showRecommendSection: data.showRecommendSection
  }
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

  const row = await prisma.platformConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: payload.name || '锦食坊',
      servicePhone: payload.servicePhone || '400-888-8888',
      showBannerSection: payload.showBannerSection !== false,
      showCategorySection: payload.showCategorySection !== false,
      showRecommendSection: payload.showRecommendSection !== false
    },
    update: payload
  })
  await cacheDel(CACHE_KEYS.SHOP_CONFIG)
  return formatPlatformConfig(row)
}

async function getHotKeywords() {
  return []
}

async function updateHotKeywords() {
  return []
}

async function getBanners() {
  return getOrSet(CACHE_KEYS.BANNERS, 300, async () => {
    const rows = await prisma.banner.findMany({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }]
    })
    return rows.map((b) => ({
      id: b.id,
      imageUrl: resolvePublicUrl(b.imageUrl || ''),
      title: b.title,
      link: b.link
    }))
  })
}

async function invalidateBanners() {
  await cacheDel(CACHE_KEYS.BANNERS)
}

async function getCategories() {
  const rows = await prisma.cuisineType.findMany({
    where: { visible: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }]
  })
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    iconImage: resolvePublicUrl(c.iconImage || '')
  }))
}

async function invalidateCategories() {
  await cacheDel(CACHE_KEYS.CATEGORIES)
  await cacheDel(CACHE_KEYS.CUISINE_TYPES)
}

module.exports = {
  getShopConfig,
  updateShopConfig,
  getHotKeywords,
  updateHotKeywords,
  getBanners,
  invalidateBanners,
  getCategories,
  invalidateCategories
}
