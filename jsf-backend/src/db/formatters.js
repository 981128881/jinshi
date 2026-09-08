const crypto = require('crypto')
const { resolvePublicUrl } = require('../utils/publicUrl')

function formatDateTime(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function parseProduct(row) {
  if (!row) return null
  return parseProductListItem(row, { includeDesc: true })
}

/** 列表/搜索用，默认不含 desc，减少传输与 IO */
function parseProductListItem(row, options = {}) {
  if (!row) return null
  const { includeDesc = false } = options
  const tags = Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : [])
  const price = row.price
  const originalPrice = row.originalPrice
  const showOriginal = originalPrice != null && Number(originalPrice) > 0 && Number(originalPrice) > Number(price)
  const item = {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    price,
    originalPrice: showOriginal ? originalPrice : null,
    image: resolvePublicUrl(row.image || ''),
    sales: row.sales,
    stock: row.stock ?? 0,
    tags,
    visible: row.visible !== false,
    featured: !!row.featured
  }
  if (includeDesc) item.desc = row.desc
  return item
}

const PRODUCT_LIST_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  price: true,
  originalPrice: true,
  image: true,
  sales: true,
  stock: true,
  tags: true,
  visible: true,
  featured: true
}

/** 分类页/列表：同分类内销量高的在前，销量相同按 id */
const PRODUCT_LIST_ORDER = [{ sales: 'desc' }, { id: 'asc' }]

function formatUser(row) {
  if (!row) return null
  return {
    id: row.id,
    nickname: row.nickname,
    avatar: resolvePublicUrl(row.avatar || ''),
    phone: row.phone,
    isLogin: true
  }
}

function formatAddress(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    province: row.province,
    city: row.city,
    district: row.district,
    detail: row.detail,
    isDefault: !!row.isDefault
  }
}

function formatOrder(row, items, addressRow) {
  const address = formatAddress(addressRow)
  return {
    id: row.id,
    status: row.status,
    refundStatus: row.refundStatus ?? 0,
    remark: row.remark || '',
    address,
    createTime: formatDateTime(row.createdAt),
    completedAt: row.completedAt ? formatDateTime(row.completedAt) : null,
    refundedAt: row.refundedAt ? formatDateTime(row.refundedAt) : null,
    totalAmount: row.totalAmount,
    dailyNo: row.dailyNo ?? null,
    items: items.map((it) => ({
      id: it.productId || it.id,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      image: it.image
    }))
  }
}

function formatPromotion(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.imageUrl,
    content: row.content,
    startTime: row.startTime,
    endTime: row.endTime,
    enabled: !!row.enabled
  }
}

function formatShopConfig(row) {
  if (!row) return null
  return {
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    deliveryRadiusKm: row.deliveryRadiusKm,
    servicePhone: row.servicePhone,
    showBannerSection: row.showBannerSection !== false,
    showCategorySection: row.showCategorySection !== false,
    showFlashSaleSection: row.showFlashSaleSection !== false,
    showRecommendSection: row.showRecommendSection !== false
  }
}

function formatCategory(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || '',
    iconImage: resolvePublicUrl(row.iconImage || ''),
    iconBg: row.iconBg || '',
    visible: row.visible !== false
  }
}

function generateOrderId() {
  return `${Date.now()}${crypto.randomBytes(4).toString('hex')}`
}

function yuanToFen(yuan) {
  return Math.round(Number(yuan) * 100)
}

module.exports = {
  formatDateTime,
  parseProduct,
  parseProductListItem,
  PRODUCT_LIST_SELECT,
  PRODUCT_LIST_ORDER,
  formatUser,
  formatAddress,
  formatOrder,
  formatPromotion,
  formatShopConfig,
  formatCategory,
  generateOrderId,
  yuanToFen
}
