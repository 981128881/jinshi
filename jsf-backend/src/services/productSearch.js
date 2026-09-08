const prisma = require('../db/prisma')
const { parseProductListItem } = require('../db/formatters')

let fulltextReady = null

async function checkFulltextIndex() {
  if (fulltextReady !== null) return fulltextReady
  try {
    const rows = await prisma.$queryRaw`
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Product'
        AND INDEX_TYPE = 'FULLTEXT'
      LIMIT 1
    `
    fulltextReady = Array.isArray(rows) && rows.length > 0
    if (!fulltextReady) {
      console.warn('[search] 未检测到 Product.name 全文索引，请运行: npm run db:patch-search')
    }
  } catch (e) {
    fulltextReady = false
    console.warn('[search] 全文索引检测失败', e.message)
  }
  return fulltextReady
}

function normalizeRow(row) {
  if (!row) return null
  return parseProductListItem({
    ...row,
    tags: typeof row.tags === 'string' ? row.tags : row.tags,
    visible: row.visible === 1 || row.visible === true,
    featured: row.featured === 1 || row.featured === true
  })
}

async function searchByFulltext(keyword, skip, take) {
  const rows = await prisma.$queryRaw`
    SELECT
      p.id, p.categoryId, p.name, p.price, p.originalPrice,
      p.image, p.sales, p.stock, p.tags, p.visible, p.featured
    FROM Product p
    INNER JOIN Category c ON c.id = p.categoryId AND c.visible = true
    WHERE p.visible = true
      AND MATCH(p.name) AGAINST(${keyword} IN NATURAL LANGUAGE MODE)
    ORDER BY p.sales DESC, p.id ASC
    LIMIT ${take} OFFSET ${skip}
  `
  return rows.map(normalizeRow).filter(Boolean)
}

async function searchByBarcode(keyword, skip, take) {
  const rows = await prisma.$queryRaw`
    SELECT
      p.id, p.categoryId, p.name, p.price, p.originalPrice,
      p.image, p.sales, p.stock, p.tags, p.visible, p.featured
    FROM Product p
    INNER JOIN Category c ON c.id = p.categoryId AND c.visible = true
    WHERE p.visible = true AND p.barcode = ${keyword}
    ORDER BY p.sales DESC, p.id ASC
    LIMIT ${take} OFFSET ${skip}
  `
  return rows.map(normalizeRow).filter(Boolean)
}

/** 前缀匹配，可走 name 普通 BTree 索引，比 contains 快 */
async function searchByPrefix(keyword, skip, take) {
  const prefix = `${keyword}%`
  const rows = await prisma.$queryRaw`
    SELECT
      p.id, p.categoryId, p.name, p.price, p.originalPrice,
      p.image, p.sales, p.stock, p.tags, p.visible, p.featured
    FROM Product p
    INNER JOIN Category c ON c.id = p.categoryId AND c.visible = true
    WHERE p.visible = true AND p.name LIKE ${prefix}
    ORDER BY p.sales DESC, p.id ASC
    LIMIT ${take} OFFSET ${skip}
  `
  return rows.map(normalizeRow).filter(Boolean)
}

async function searchProducts(keyword, page, pageSize) {
  const skip = (page - 1) * pageSize
  const take = pageSize + 1
  let list = []

  if (/^\d+$/.test(keyword)) {
    list = await searchByBarcode(keyword, skip, take)
  }

  if (!list.length && (await checkFulltextIndex())) {
    list = await searchByFulltext(keyword, skip, take)
  }

  if (!list.length) {
    list = await searchByPrefix(keyword, skip, take)
  }

  const hasMore = list.length > pageSize
  return {
    list: list.slice(0, pageSize),
    total: hasMore ? null : skip + Math.min(list.length, pageSize),
    page,
    pageSize,
    hasMore
  }
}

module.exports = {
  searchProducts,
  checkFulltextIndex
}
