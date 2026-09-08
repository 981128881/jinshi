/**
 * 多数据源商品主图 enrichment（无需淘宝 AppKey）
 *
 * 按顺序尝试:
 *   1. POS 本地图片 (AiBaoPOS/Img/ItemImage)
 *   2. 极数本源条码 API (apizero.cn, 免费额度)
 *   3. UPC Item DB (国际条码, 免费 100/天)
 *   4. 极速数据条码 API (需 JISU_API_KEY, 注册送 100 次)
 *   5. 京东 Playwright 按名称搜索 (--with-jd, 需 playwright)
 *
 * 用法:
 *   node prisma/enrich-product-images.js --limit=500
 *   node prisma/enrich-product-images.js --limit=50 --dry-run
 *   node prisma/enrich-product-images.js --limit=100 --with-jd --headed
 *   node prisma/enrich-product-images.js --provider=pos,apizero
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { compressProductImage } = require('../src/utils/imageCompress')
const { mapMarketCategoryToId } = require('./lib/market-category-map')

require('dotenv').config()

const prisma = new PrismaClient()
const PRODUCTS_DIR = path.join(__dirname, '../public/products')
const POS_IMG_DIR = process.env.POS_IMAGE_DIR || 'G:/supermarket/AiBaoPOS/ABPOSYun/Img/ItemImage'
const EXPORT_JSON = process.env.POS_EXPORT_JSON || 'G:/supermarket/AiBaoPOS/export/POS_Item.json'

const DELAY_MS = 400

function parseArgs(argv) {
  const limitArg = argv.find((a) => a.startsWith('--limit='))
  const providerArg = argv.find((a) => a.startsWith('--provider='))
  return {
    limit: limitArg ? Number(limitArg.split('=')[1]) : 300,
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    withJd: argv.includes('--with-jd'),
    headed: argv.includes('--headed'),
    providers: providerArg
      ? providerArg.split('=')[1].split(',').map((s) => s.trim())
      : ['pos', 'apizero', 'upcitemdb', 'jisu']
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function isValidBarcode(barcode) {
  const b = String(barcode || '').replace(/\D/g, '')
  return b.length >= 8 && b.length <= 14 && !/^0+$/.test(b) && b !== '999999999'
}

function loadPosImageIndex() {
  const map = new Map()
  if (!fs.existsSync(EXPORT_JSON)) return map
  try {
    const items = JSON.parse(fs.readFileSync(EXPORT_JSON, 'utf8'))
    for (const it of items) {
      if (!it.Id) continue
      map.set(it.Id, {
        imageName: it.ImageName || '',
        imagePath: it.ImagePath || ''
      })
    }
  } catch (e) {
    console.warn('POS export JSON 读取失败:', e.message)
  }
  return map
}

function resolvePosLocalFile(imageName, imagePath) {
  const candidates = []
  if (imageName) {
    candidates.push(path.join(POS_IMG_DIR, imageName))
    candidates.push(path.join(POS_IMG_DIR, path.basename(imageName)))
  }
  if (imagePath) {
    const base = path.basename(imagePath)
    candidates.push(path.join(POS_IMG_DIR, base))
    if (imagePath.includes('ItemImage')) {
      candidates.push(path.join(POS_IMG_DIR, base))
    }
  }
  for (const p of candidates) {
    if (p && fs.existsSync(p) && fs.statSync(p).size > 500) return p
  }
  return null
}

async function providerPosLocal(row, posIndex) {
  const extId = row.externalId
  if (!extId || !posIndex.has(extId)) return null
  const meta = posIndex.get(extId)
  const localFile = resolvePosLocalFile(meta.imageName, meta.imagePath)
  if (!localFile) return null
  return { source: 'pos-local', localFile, categoryHint: row.name }
}

async function providerApizero(barcode) {
  const key = process.env.APIZERO_API_KEY || ''
  const url = `https://v1.apizero.cn/api/barcode-lookup?barcode=${encodeURIComponent(barcode)}${key ? `&key=${encodeURIComponent(key)}` : ''}`
  const res = await fetch(url, { headers: { 'User-Agent': 'WxappShop/1.0' } })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.found || !data.data) return null
  const d = data.data
  return {
    source: 'apizero',
    picUrl: d.image || null,
    title: d.name,
    brand: d.brand,
    categoryHint: [d.category, d.name, d.brand].filter(Boolean).join(' ')
  }
}

async function providerUpcItemDb(barcode) {
  const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'WxappShop/1.0' } })
  if (!res.ok) return null
  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null
  return {
    source: 'upcitemdb',
    picUrl: item.images?.[0] || null,
    title: item.title,
    brand: item.brand,
    categoryHint: [item.category, item.title, item.description].filter(Boolean).join(' ')
  }
}

async function providerJisu(barcode) {
  const key = process.env.JISU_API_KEY
  if (!key) return null
  const url = `https://api.jisuapi.com/barcode2/query?appkey=${encodeURIComponent(key)}&barcode=${encodeURIComponent(barcode)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 0 || !data.result) return null
  const r = data.result
  return {
    source: 'jisu',
    picUrl: r.pic || null,
    title: r.name,
    brand: r.brand,
    categoryHint: [r.unspsc, r.type, r.name, r.keyword].filter(Boolean).join(' ')
  }
}

async function downloadOrCopy(source, destPath) {
  if (source.localFile) {
    fs.copyFileSync(source.localFile, destPath)
    return true
  }
  if (!source.picUrl) return false
  let url = source.picUrl
  if (url.startsWith('//')) url = `https:${url}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 WxappShop/1.0' }
  })
  if (!res.ok) return false
  const type = res.headers.get('content-type') || ''
  if (!type.includes('image') && !url.includes('mode=image')) return false
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500) return false
  fs.writeFileSync(destPath, buf)
  return true
}

async function enrichWithJd(rows, { dryRun, headed, stats }) {
  let playwright
  try {
    playwright = require('playwright')
  } catch {
    console.warn('Playwright 未安装，跳过京东搜索。npm install playwright')
    return
  }
  const browser = await playwright.chromium.launch({ headless: !headed })
  const page = await browser.newPage()
  for (const row of rows) {
    if (row._done) continue
    const keyword = row.name.slice(0, 40)
    try {
      const url = `https://search.jd.com/Search?enc=utf-8&keyword=${encodeURIComponent(keyword)}`
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await sleep(2000)
      const result = await page.evaluate(() => {
        const breadcrumb = document.querySelector('#crumb-wrap, .breadcrumb')?.innerText || ''
        const el = document.querySelector('#J_goodsList li img, .gl-item img')
        const src = el?.getAttribute('src') || el?.getAttribute('data-lazy-img')
        return { src, breadcrumb }
      })
      if (!result?.src) continue
      let picUrl = result.src
      if (picUrl.startsWith('//')) picUrl = `https:${picUrl}`
      stats.jdTry++
      if (dryRun) { console.log(`[jd] ${keyword} -> ${picUrl.slice(0, 60)}`); continue }
      row._hit = { source: 'jd', picUrl, categoryHint: result.breadcrumb || keyword }
      row._done = true
    } catch (e) {
      stats.jdFail++
    }
    await sleep(1500)
  }
  await browser.close()
}

async function saveHit(row, hit, dryRun, stats) {
  const ext = hit.localFile
    ? path.extname(hit.localFile).slice(1) || 'jpg'
    : 'jpg'
  const filename = `${hit.source}_${row.id}.${ext === 'jpeg' ? 'jpg' : ext}`
  const destPath = path.join(PRODUCTS_DIR, filename)

  if (dryRun) {
    console.log(`[dry-run] ${row.name} <= ${hit.source} ${hit.picUrl || hit.localFile}`)
    stats.saved++
    return
  }

  if (!fs.existsSync(destPath)) {
    const ok = await downloadOrCopy(hit, destPath)
    if (!ok) { stats.fail++; return }
  }
  const compressed = await compressProductImage(destPath)
  const categoryId = await mapMarketCategoryToId(hit.categoryHint || row.name)
  await prisma.product.update({
    where: { id: row.id },
    data: {
      image: `/static/products/${compressed.filename}`,
      ...(categoryId ? { categoryId } : {})
    }
  })
  stats.saved++
  stats.bySource[hit.source] = (stats.bySource[hit.source] || 0) + 1
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true })

  const where = opts.force ? {} : { image: '' }
  const rows = await prisma.product.findMany({
    where,
    select: { id: true, name: true, barcode: true, externalId: true, categoryId: true, image: true },
    orderBy: { id: 'asc' },
    take: opts.limit
  })

  console.log(`多源 enrichment: ${rows.length} 条`)
  console.log(`数据源顺序: ${opts.providers.join(' -> ')}${opts.withJd ? ' -> jd' : ''}`)

  const posIndex = loadPosImageIndex()
  const stats = { processed: 0, saved: 0, fail: 0, skip: 0, jdTry: 0, jdFail: 0, bySource: {} }

  const providerFns = {
    pos: (row) => providerPosLocal(row, posIndex),
    apizero: (row) => isValidBarcode(row.barcode) ? providerApizero(row.barcode) : null,
    upcitemdb: (row) => isValidBarcode(row.barcode) ? providerUpcItemDb(row.barcode) : null,
    jisu: (row) => isValidBarcode(row.barcode) ? providerJisu(row.barcode) : null
  }

  for (const row of rows) {
    stats.processed++
    let hit = null
    for (const name of opts.providers) {
      const fn = providerFns[name]
      if (!fn) continue
      try {
        hit = await fn(row)
        if (hit?.picUrl || hit?.localFile) break
      } catch (e) {
        console.warn(`${name} 失败 ${row.barcode}:`, e.message)
      }
      if (name !== 'pos') await sleep(DELAY_MS)
    }
    if (hit?.picUrl || hit?.localFile) {
      hit.categoryHint = hit.categoryHint || row.name
      await saveHit(row, hit, opts.dryRun, stats)
    } else {
      row._done = false
      stats.skip++
    }
  }

  if (opts.withJd) {
    const pending = rows.filter((r) => !opts.dryRun && !r._done)
    const stillEmpty = opts.dryRun
      ? rows.filter((r) => stats.bySource && !stats.bySource[r.id])
      : await prisma.product.findMany({
          where: { id: { in: pending.map((r) => r.id) }, image: '' },
          select: { id: true, name: true, barcode: true, externalId: true, categoryId: true }
        })
    if (stillEmpty.length) {
      console.log(`\n京东补图: ${stillEmpty.length} 条`)
      for (const r of stillEmpty) r._done = false
      await enrichWithJd(stillEmpty, opts, stats)
      for (const row of stillEmpty) {
        if (row._hit) await saveHit(row, row._hit, opts.dryRun, stats)
      }
    }
  }

  console.log('\n--- 完成 ---')
  console.log(JSON.stringify(stats, null, 2))
  console.log('\n提示:')
  console.log('  - apizero 注册 key 提升额度: https://apizero.cn (APIZERO_API_KEY)')
  console.log('  - 极速数据 100次免费: https://www.jisuapi.com (JISU_API_KEY)')
  console.log('  - 仍缺图可加 --with-jd --headed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
