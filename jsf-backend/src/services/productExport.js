const ExcelJS = require('exceljs')
const prisma = require('../db/prisma')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { createLogger } = require('../utils/logger')

const log = createLogger('productExport')

const BATCH_SIZE = Number(process.env.PRODUCT_EXPORT_BATCH_SIZE) || 2000

const COLUMNS = [
  { header: 'ID', key: 'id', width: 10 },
  { header: '外部ID', key: 'externalId', width: 18 },
  { header: '条码', key: 'barcode', width: 18 },
  { header: '分类ID', key: 'categoryId', width: 10 },
  { header: '分类名称', key: 'categoryName', width: 16 },
  { header: '商品名称', key: 'name', width: 36 },
  { header: '售价', key: 'price', width: 10 },
  { header: '原价', key: 'originalPrice', width: 10 },
  { header: '库存', key: 'stock', width: 10 },
  { header: '销量', key: 'sales', width: 10 },
  { header: '标签', key: 'tags', width: 20 },
  { header: '小程序展示', key: 'visible', width: 12 },
  { header: '精品推荐', key: 'featured', width: 12 },
  { header: '图片URL', key: 'image', width: 40 },
  { header: '详情', key: 'desc', width: 40 }
]

function buildWhere(query = {}) {
  const { keyword, categoryId, ids } = query
  const where = {}

  if (ids) {
    const idList = String(ids)
      .split(',')
      .map((v) => Number(v.trim()))
      .filter(Boolean)
    if (idList.length) where.id = { in: idList }
    return where
  }

  if (keyword) where.name = { contains: String(keyword).trim() }
  if (categoryId) where.categoryId = Number(categoryId)
  return where
}

function formatTags(tags) {
  if (!tags) return ''
  if (Array.isArray(tags)) return tags.join(',')
  return String(tags)
}

function formatRow(row) {
  return {
    id: row.id,
    externalId: row.externalId || '',
    barcode: row.barcode || '',
    categoryId: row.categoryId,
    categoryName: row.category?.name || '',
    name: row.name,
    price: row.price,
    originalPrice: row.originalPrice,
    stock: row.stock,
    sales: row.sales,
    tags: formatTags(row.tags),
    visible: row.visible !== false ? '是' : '否',
    featured: row.featured ? '是' : '否',
    image: resolvePublicUrl(row.image || ''),
    desc: row.desc || ''
  }
}

function buildFilename(query = {}) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  if (query.ids) return `products-selected-${date}.xlsx`
  if (query.keyword || query.categoryId) return `products-filtered-${date}.xlsx`
  return `products-all-${date}.xlsx`
}

async function exportProductsExcel(res, query = {}) {
  const where = buildWhere(query)
  const filename = buildFilename(query)
  const startedAt = Date.now()
  let exported = 0

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
  )

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: false,
    useSharedStrings: false
  })
  const sheet = workbook.addWorksheet('商品')
  sheet.columns = COLUMNS
  sheet.getRow(1).commit()

  let lastId = null
  const useCursor = !where.id?.in

  while (true) {
    const batchWhere = { ...where }
    if (useCursor && lastId != null) {
      batchWhere.id = where.id ? { ...where.id, lt: lastId } : { lt: lastId }
    }

    const batch = await prisma.product.findMany({
      where: batchWhere,
      orderBy: { id: 'desc' },
      take: BATCH_SIZE,
      include: { category: { select: { name: true } } }
    })

    if (!batch.length) break

    for (const row of batch) {
      sheet.addRow(formatRow(row)).commit()
      exported += 1
    }

    lastId = batch[batch.length - 1].id
    if (batch.length < BATCH_SIZE) break
  }

  await workbook.commit()

  log.info('商品 Excel 导出完成', {
    exported,
    durationMs: Date.now() - startedAt,
    filtered: !!(query.keyword || query.categoryId || query.ids)
  })
}

module.exports = {
  exportProductsExcel,
  buildWhere,
  buildFilename
}
