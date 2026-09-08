const prisma = require('../db/prisma')
const { invalidateCategories } = require('./shop')
const { invalidateProductCount } = require('./statsCache')

const DEFAULT_CATEGORY_ID = 9

function asBool(v, defaultValue = true) {
  if (v == null) return defaultValue
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase()
  return s === '1' || s === 'true' || s === 'yes'
}

function toIntStock(v, fallback = 0) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.floor(n))
}

function toPrice(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

function buildDesc(sku, brandName) {
  const lines = []
  if (brandName) lines.push(`品牌：${brandName}`)
  const barcode = sku.barcode || sku.skuCode
  if (barcode) lines.push(`条码：${barcode}`)
  if (sku.specification) lines.push(`规格：${sku.specification}`)
  if (sku.color) lines.push(`颜色：${sku.color}`)
  if (sku.size) lines.push(`尺码：${sku.size}`)
  if (sku.remark) lines.push(sku.remark)
  return lines.join('\n')
}

function resolveImagePath(imagePath) {
  if (!imagePath) return ''
  const p = String(imagePath).trim()
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/static/')) return p
  return ''
}

async function getDefaultCategoryId() {
  const row = await prisma.category.findFirst({ where: { id: DEFAULT_CATEGORY_ID } })
  if (row) return row.id
  const first = await prisma.category.findFirst({ orderBy: { id: 'asc' } })
  return first?.id || 1
}

async function loadCategoryMap() {
  const rows = await prisma.category.findMany({
    where: { externalId: { not: null } },
    select: { id: true, externalId: true }
  })
  return new Map(rows.map((r) => [r.externalId, r.id]))
}

async function resolveCategoryId(externalId, cache, defaultId) {
  if (externalId && cache.has(externalId)) return cache.get(externalId)
  return defaultId
}

async function syncCategories(items = []) {
  let created = 0
  let updated = 0
  let failed = 0

  for (const item of items) {
    if (!item?.externalId || !item?.name) {
      failed += 1
      continue
    }
    try {
      const data = {
        name: String(item.name).slice(0, 64),
        visible: asBool(item.onlineShow, true) && asBool(item.showFront, true),
        sort: Number(item.sort) || 0,
        externalId: String(item.externalId)
      }
      const existing = await prisma.category.findUnique({
        where: { externalId: data.externalId }
      })
      if (existing) {
        await prisma.category.update({ where: { id: existing.id }, data })
        updated += 1
      } else {
        await prisma.category.create({ data })
        created += 1
      }
    } catch (e) {
      failed += 1
    }
  }

  if (created || updated) await invalidateCategories()
  return { created, updated, failed, total: items.length }
}

async function syncBrands(items = []) {
  // 当前后端无 Brand 表；品牌写入 Product.tags[0]
  return { created: 0, updated: 0, failed: 0, total: items.length, skipped: true }
}

function flattenSkus(productItems = []) {
  const rows = []
  for (const p of productItems) {
    const skus = Array.isArray(p.skus) && p.skus.length ? p.skus : [
      {
        externalId: p.externalId,
        skuCode: p.spuCode,
        barcode: p.spuCode,
        name: p.name,
        price: p.price,
        costPrice: p.costPrice,
        stock: p.stock,
        categoryExternalId: p.categoryExternalId,
        brandExternalId: p.brandExternalId,
        brandName: p.brandName,
        specification: p.specification,
        status: p.status,
        onlineSale: p.onlineSale,
        imagePath: p.imagePath,
        remark: p.remark
      }
    ]
    for (const sku of skus) {
      if (!sku?.externalId) continue
      rows.push({
        parent: p,
        sku
      })
    }
  }
  return rows
}

async function upsertProductRow(row, categoryMap, defaultCategoryId, brandMap) {
  const { parent, sku } = row
  const externalId = String(sku.externalId)
  const categoryExternalId = sku.categoryExternalId || parent.categoryExternalId
  const categoryId = await resolveCategoryId(categoryExternalId, categoryMap, defaultCategoryId)

  const brandExternalId = sku.brandExternalId || parent.brandExternalId
  const brandName = sku.brandName || parent.brandName || (brandExternalId ? brandMap.get(brandExternalId) : '') || ''

  const name = String(sku.name || parent.name || '未命名商品').slice(0, 256)
  const price = toPrice(sku.price ?? parent.price)
  const stock = toIntStock(sku.stock ?? parent.stock, 0)
  const barcode = String(sku.barcode || sku.skuCode || '').slice(0, 20)
  const visible = (sku.status || parent.status || 'on_sale') === 'on_sale'
    && asBool(sku.onlineSale ?? parent.onlineSale, true)
  const tags = brandName ? [brandName.slice(0, 32)] : []
  const desc = buildDesc(sku, brandName)
  const image = resolveImagePath(sku.imagePath || parent.imagePath)

  const data = {
    categoryId,
    name,
    price,
    originalPrice: price > 0 ? Math.round(price * 1.15 * 100) / 100 : price,
    stock,
    tags,
    desc,
    barcode,
    visible,
    image,
    externalId
  }

  const existing = await prisma.product.findUnique({ where: { externalId } })
  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...data,
        sales: existing.sales
      }
    })
    return 'updated'
  }

  if (barcode) {
    const byBarcode = await prisma.product.findFirst({ where: { barcode } })
    if (byBarcode) {
      await prisma.product.update({
        where: { id: byBarcode.id },
        data: {
          ...data,
          sales: byBarcode.sales
        }
      })
      return 'updated'
    }
  }

  await prisma.product.create({ data })
  return 'created'
}

async function syncProducts(items = [], brandItems = []) {
  const brandMap = new Map(
    (brandItems || [])
      .filter((b) => b?.externalId)
      .map((b) => [String(b.externalId), b.name || ''])
  )
  const categoryMap = await loadCategoryMap()
  const defaultCategoryId = await getDefaultCategoryId()
  const flat = flattenSkus(items)

  let created = 0
  let updated = 0
  let failed = 0

  for (const row of flat) {
    try {
      const result = await upsertProductRow(row, categoryMap, defaultCategoryId, brandMap)
      if (result === 'created') created += 1
      else updated += 1
    } catch (e) {
      failed += 1
    }
  }

  if (created || updated) invalidateProductCount()
  return { created, updated, failed, total: flat.length, skuRows: flat.length }
}

async function syncStock(items = []) {
  let updated = 0
  let failed = 0
  for (const item of items) {
    if (!item?.externalId) {
      failed += 1
      continue
    }
    try {
      const existing = await prisma.product.findUnique({
        where: { externalId: String(item.externalId) }
      })
      if (!existing) {
        failed += 1
        continue
      }
      const data = {}
      if (item.stock != null) data.stock = toIntStock(item.stock, existing.stock)
      if (item.price != null) data.price = toPrice(item.price)
      if (Object.keys(data).length) {
        await prisma.product.update({ where: { id: existing.id }, data })
        updated += 1
      }
    } catch (e) {
      failed += 1
    }
  }
  if (updated) invalidateProductCount()
  return { updated, failed, total: items.length }
}

module.exports = {
  syncCategories,
  syncBrands,
  syncProducts,
  syncStock
}
