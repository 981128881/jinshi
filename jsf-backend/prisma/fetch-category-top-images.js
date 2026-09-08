/**
 * 每个分类销量 Top N 商品搜白底主图
 *
 * 用法:
 *   npm run fetch:images:top40
 *   node prisma/fetch-category-top-images.js --per-category=40
 *   node prisma/fetch-category-top-images.js --category-id=6 --dry-run
 *   node prisma/fetch-category-top-images.js --force
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { PRODUCT_LIST_ORDER } = require('../src/db/formatters')
const {
  findWhiteBgImageUrl,
  downloadImage,
  applyWhiteBackground
} = require('./lib/brand-stock-search')

require('dotenv').config()

const prisma = new PrismaClient()
const PRODUCTS_DIR = path.join(__dirname, '../public/products')
const REPORT = path.join(__dirname, 'fetch-category-top-images-report.txt')

function parseArgs(argv) {
  const num = (prefix, fallback) => {
    const arg = argv.find((a) => a.startsWith(`${prefix}=`))
    return arg ? Number(arg.split('=')[1]) : fallback
  }
  const str = (prefix) => {
    const arg = argv.find((a) => a.startsWith(`${prefix}=`))
    return arg ? arg.split('=').slice(1).join('=') : null
  }
  return {
    perCategory: num('--per-category', 40),
    categoryId: num('--category-id', null),
    categoryName: str('--category'),
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force')
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function isValidBarcode(barcode) {
  const b = String(barcode || '').replace(/\D/g, '')
  return b.length >= 8 && b.length <= 14 && !/^0+$/.test(b) && b !== '999999999'
}

async function fetchBarcodeImage(barcode) {
  const key = process.env.APIZERO_API_KEY || ''
  const url = `https://v1.apizero.cn/api/barcode-lookup?barcode=${encodeURIComponent(barcode)}${key ? `&key=${encodeURIComponent(key)}` : ''}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'WxappShop/1.0' } })
    if (!res.ok) return null
    const data = await res.json()
    if (data.found && data.data?.image) {
      return { url: data.image, source: 'apizero', query: barcode }
    }
  } catch {
    // ignore
  }
  return null
}

async function resolveImageUrl(row) {
  if (isValidBarcode(row.barcode)) {
    const hit = await fetchBarcodeImage(row.barcode)
    if (hit?.url) return hit
    await sleep(350)
  }
  return findWhiteBgImageUrl(row.name)
}

async function saveWhiteBgImage(row, hit, dryRun) {
  const rawPath = path.join(PRODUCTS_DIR, `top40_raw_${row.id}.jpg`)
  const finalPath = path.join(PRODUCTS_DIR, `top40_${row.id}.jpg`)

  if (dryRun) {
    return { ok: true, image: `/static/products/top40_${row.id}.jpg`, dryRun: true }
  }

  let ok = false
  try {
    ok = await downloadImage(hit.url, rawPath)
    if (!ok) return { ok: false }

    await applyWhiteBackground(rawPath, finalPath)
  } catch {
    return { ok: false }
  } finally {
    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath)
  }

  if (!fs.existsSync(finalPath) || fs.statSync(finalPath).size < 800) {
    return { ok: false }
  }

  return { ok: true, image: `/static/products/top40_${row.id}.jpg` }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true })

  const lines = []
  const log = (msg) => {
    lines.push(msg)
    console.log(msg)
  }

  log('=== 分类 Top 商品白底主图 ===')
  log(new Date().toISOString())
  log(`每分类: ${opts.perCategory} | force: ${opts.force} | dryRun: ${opts.dryRun}`)

  const catWhere = { visible: true }
  if (opts.categoryId) catWhere.id = opts.categoryId
  if (opts.categoryName) catWhere.name = { contains: opts.categoryName }

  const categories = await prisma.category.findMany({
    where: catWhere,
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true }
  })

  if (!categories.length) {
    log('未找到分类')
    return
  }

  const stats = {
    categories: categories.length,
    planned: 0,
    skipped: 0,
    saved: 0,
    fail: 0,
    bySource: {}
  }

  for (const cat of categories) {
    const products = await prisma.product.findMany({
      where: { categoryId: cat.id, visible: true },
      orderBy: PRODUCT_LIST_ORDER,
      take: opts.perCategory,
      select: { id: true, name: true, barcode: true, image: true }
    })

    log(`\n【${cat.name}】Top ${products.length}`)
    stats.planned += products.length

    for (let i = 0; i < products.length; i++) {
      const row = products[i]
      const prefix = `[${cat.name} ${i + 1}/${products.length}]`

      if (row.image && !opts.force) {
        stats.skipped++
        log(`${prefix} 跳过(已有图): ${row.name}`)
        continue
      }

      const hit = await resolveImageUrl(row)
      if (!hit?.url) {
        stats.fail++
        log(`${prefix} 未找到: ${row.name}`)
        continue
      }

      log(`${prefix} ${row.name}`)
      log(`  <= ${hit.source} | ${hit.query}`)
      log(`  ${hit.url.slice(0, 90)}...`)

      if (opts.dryRun) {
        stats.saved++
        stats.bySource[hit.source] = (stats.bySource[hit.source] || 0) + 1
        continue
      }

      const saved = await saveWhiteBgImage(row, hit, false)
      if (!saved.ok) {
        stats.fail++
        log(`  保存失败`)
        continue
      }

      await prisma.product.update({
        where: { id: row.id },
        data: { image: saved.image }
      })
      stats.saved++
      stats.bySource[hit.source] = (stats.bySource[hit.source] || 0) + 1
      await sleep(400)
    }
  }

  log('\n--- 完成 ---')
  log(JSON.stringify(stats, null, 2))
  fs.writeFileSync(REPORT, lines.join('\n'), 'utf8')
  log(`\n报告: ${REPORT}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
