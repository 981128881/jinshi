/**
 * 大牌本地通用图（public/products/stock/{品牌}.jpg）
 */
const fs = require('fs')
const path = require('path')

const STOCK_DIR = path.join(__dirname, '../../public/products/stock')

function safeName(keyword) {
  return String(keyword || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_')
}

function resolveStockFile(keyword) {
  if (!keyword) return null
  const p = path.join(STOCK_DIR, `${safeName(keyword)}.jpg`)
  if (fs.existsSync(p) && fs.statSync(p).size > 500) return p
  return null
}

function matchStockBrand(row) {
  const keyword = row.brandHit?.keyword
  const file = resolveStockFile(keyword)
  if (file) return { keyword, file }
  return null
}

module.exports = { STOCK_DIR, resolveStockFile, matchStockBrand, safeName }
