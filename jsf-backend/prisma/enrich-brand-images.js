/**
 * 大牌商品优先补主图（可口可乐、百事、农夫山泉等）
 *
 * 用法:
 *   node prisma/enrich-brand-images.js --list
 *   node prisma/enrich-brand-images.js --limit=50 --dry-run
 *   node prisma/enrich-brand-images.js --limit=100 --with-jd --headed
 *   node prisma/enrich-brand-images.js --brand=可口可乐 --limit=30
 *   node prisma/enrich-brand-images.js --tier=1 --limit=200
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { compressProductImage } = require('../src/utils/imageCompress')
const { mapMarketCategoryToId } = require('./lib/market-category-map')
const { filterBrandProducts, buildSearchKeyword, BRAND_GROUPS } = require('./lib/brand-keywords')
const { matchStockBrand } = require('./lib/brand-stock-images')
const { findBrandImageUrl, downloadImage: downloadRemoteImage } = require('./lib/brand-stock-search')

require('dotenv').config()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const prisma = new PrismaClient()
const PRODUCTS_DIR = path.join(__dirname, '../public/products')
const POS_IMG_DIR = process.env.POS_IMAGE_DIR || 'G:/supermarket/AiBaoPOS/ABPOSYun/Img/ItemImage'
const EXPORT_JSON = process.env.POS_EXPORT_JSON || 'G:/supermarket/AiBaoPOS/export/POS_Item.json'
const REPORT = 'G:/supermarket/AiBaoPOS/sync/brand_image_report.txt'

function parseArgs(argv) {
  const num = (prefix) => {
    const arg = argv.find((a) => a.startsWith(`${prefix}=`))
    return arg ? Number(arg.split('=')[1]) : null
  }
  const str = (prefix) => {
    const arg = argv.find((a) => a.startsWith(`${prefix}=`))
    return arg ? arg.split('=').slice(1).join('=') : null
  }
  return {
    limit: num('--limit') ?? 100,
    tier: num('--tier'),
    brand: str('--brand'),
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    list: argv.includes('--list'),
    withJd: argv.includes('--with-jd'),
    withSearch: argv.includes('--with-search'),
    withStock: !argv.includes('--no-stock'),
    headed: argv.includes('--headed')
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function loadPosImageIndex() {
  const map = new Map()
  if (!fs.existsSync(EXPORT_JSON)) return map
  try {
    const items = JSON.parse(fs.readFileSync(EXPORT_JSON, 'utf8'))
    for (const it of items) {
      if (!it.Id) continue
      map.set(it.Id, { imageName: it.ImageName || '', imagePath: it.ImagePath || '' })
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
    categoryHint: [r.unspsc, r.type, r.name, r.keyword].filter(Boolean).join(' ')
  }
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
    categoryHint: [d.category, d.name, d.brand].filter(Boolean).join(' ')
  }
}

async function providerJdHtml(keyword) {
  const url = `https://search.jd.com/Search?enc=utf-8&keyword=${encodeURIComponent(keyword)}&wq=${encodeURIComponent(keyword)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      Referer: 'https://www.jd.com/'
    }
  })
  if (!res.ok) return null
  const html = await res.text()
  const patterns = [
    /data-lazy-img="(\/\/img\d+\.360buyimg\.com[^"]+)"/,
    /data-lazy-img="(https:\/\/img\d+\.360buyimg\.com[^"]+)"/,
    /"(https:\/\/img\d+\.360buyimg\.com\/n7\/jfs\/[^"]+\.(?:jpg|png|webp))"/i
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) {
      let picUrl = m[1]
      if (picUrl.startsWith('//')) picUrl = `https:${picUrl}`
      return { source: 'jd-html', picUrl, categoryHint: keyword }
    }
  }
  return null
}

async function providerBrandStock(row) {
  const stock = matchStockBrand(row)
  if (!stock) return null
  return { source: 'brand-stock', localFile: stock.file, categoryHint: row.name }
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
    headers: {
      'User-Agent': UA,
      Referer: source.source === 'jd' || source.source === 'jd-html'
        ? 'https://www.jd.com/'
        : source.source === 'baidu'
          ? 'https://image.baidu.com/'
          : undefined
    }
  })
  if (!res.ok) return false
  const type = res.headers.get('content-type') || ''
  if (!type.includes('image') && !url.includes('mode=image')) return false
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500) return false
  fs.writeFileSync(destPath, buf)
  return true
}

async function searchJd(page, keyword) {
  const url = `https://search.jd.com/Search?enc=utf-8&keyword=${encodeURIComponent(keyword)}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(2000)
  return page.evaluate(() => {
    const breadcrumb = document.querySelector('#crumb-wrap, .breadcrumb, .crumb')?.innerText.replace(/\s+/g, ' ').trim() || ''
    const el = document.querySelector('#J_goodsList li img, .gl-item img, .plugin_goodsCard img')
    const src = el?.getAttribute('src') || el?.getAttribute('data-lazy-img') || el?.getAttribute('data-src')
    return { src, breadcrumb }
  })
}

async function saveHit(row, hit, dryRun, stats) {
  if (hit.source === 'brand-stock' && hit.localFile) {
    const publicRoot = path.join(__dirname, '../public')
    const rel = path.relative(publicRoot, hit.localFile).replace(/\\/g, '/')
    const imageUrl = `/static/${rel}`
    if (dryRun) {
      console.log(`[dry-run] ${row.name} <= brand-stock ${imageUrl}`)
      stats.saved++
      stats.bySource[hit.source] = (stats.bySource[hit.source] || 0) + 1
      return
    }
    const categoryId = await mapMarketCategoryToId(hit.categoryHint || row.name)
    await prisma.product.update({
      where: { id: row.id },
      data: {
        image: imageUrl,
        ...(categoryId ? { categoryId } : {})
      }
    })
    stats.saved++
    stats.bySource[hit.source] = (stats.bySource[hit.source] || 0) + 1
    return
  }

  const ext = hit.localFile ? path.extname(hit.localFile).slice(1) || 'jpg' : 'jpg'
  const filename = `brand_${hit.source}_${row.id}.${ext === 'jpeg' ? 'jpg' : ext}`
  const destPath = path.join(PRODUCTS_DIR, filename)

  if (dryRun) {
    console.log(`[dry-run] ${row.name} <= ${hit.source} ${hit.picUrl || hit.localFile}`)
    stats.saved++
    stats.bySource[hit.source] = (stats.bySource[hit.source] || 0) + 1
    return
  }

  if (!fs.existsSync(destPath)) {
    const ok = await downloadOrCopy(hit, destPath)
    if (!ok) {
      stats.fail++
      return
    }
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

async function printBrandList(rows) {
  const all = filterBrandProducts(rows, { skipHasImage: false })
  const noImg = all.filter((r) => !r.image)
  const byKeyword = new Map()

  for (const row of all) {
    const key = row.brandHit.keyword
    if (!byKeyword.has(key)) byKeyword.set(key, { total: 0, noImage: 0, tier: row.brandHit.tier, label: row.brandHit.label })
    const item = byKeyword.get(key)
    item.total++
    if (!row.image) item.noImage++
  }

  const lines = [
    `大牌商品统计 ${new Date().toISOString()}`,
    `匹配 SKU: ${all.length}, 无图: ${noImg.length}`,
    '',
    'keyword\ttier\tlabel\ttotal\tnoImage'
  ]

  const sorted = [...byKeyword.entries()].sort((a, b) => a[1].tier - b[1].tier || b[1].noImage - a[1].noImage)
  for (const [keyword, info] of sorted) {
    lines.push(`${keyword}\t${info.tier}\t${info.label}\t${info.total}\t${info.noImage}`)
    console.log(`${keyword.padEnd(12)} tier=${info.tier} total=${String(info.total).padStart(4)} noImage=${info.noImage}`)
  }

  fs.mkdirSync(path.dirname(REPORT), { recursive: true })
  fs.writeFileSync(REPORT, lines.join('\n'), 'utf8')
  console.log(`\n报告已写入 ${REPORT}`)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true })

  const rows = await prisma.product.findMany({
    select: { id: true, name: true, barcode: true, externalId: true, categoryId: true, image: true, tags: true },
    orderBy: { id: 'asc' }
  })

  if (opts.list) {
    await printBrandList(rows)
    return
  }

  const targets = filterBrandProducts(rows, {
    tier: opts.tier,
    brand: opts.brand,
    skipHasImage: !opts.force
  }).slice(0, opts.limit)

  console.log(`大牌优先补图: ${targets.length} 条 (tier=${opts.tier ?? 'all'}, brand=${opts.brand ?? 'all'})`)
  console.log(`模式: search=${opts.withSearch} stock=${opts.withStock} jd=${opts.withJd}`)

  const posIndex = loadPosImageIndex()
  const stats = { processed: 0, saved: 0, fail: 0, skip: 0, bySource: {} }
  const pendingJd = []

  for (const row of targets) {
    stats.processed++
    let hit = null

    try {
      hit = await providerPosLocal(row, posIndex)
    } catch (e) {
      console.warn('pos-local 失败:', e.message)
    }

    if (!hit && row.barcode) {
      try {
        hit = await providerApizero(row.barcode)
        if (hit) await sleep(400)
      } catch (e) {
        console.warn(`apizero 失败 ${row.barcode}:`, e.message)
      }
    }

    if (!hit && row.barcode && process.env.JISU_API_KEY) {
      try {
        hit = await providerJisu(row.barcode)
        await sleep(400)
      } catch (e) {
        console.warn(`jisu 失败 ${row.barcode}:`, e.message)
      }
    }

    if (hit?.picUrl || hit?.localFile) {
      hit.categoryHint = hit.categoryHint || row.name
      await saveHit(row, hit, opts.dryRun, stats)
      console.log(`[${stats.processed}] OK ${row.name} <= ${hit.source}`)
      continue
    }

    if (opts.withSearch) {
      const keyword = buildSearchKeyword(row)
      try {
        hit = await providerJdHtml(keyword)
        await sleep(900)
      } catch (e) {
        console.warn(`jd-html 失败 ${keyword}:`, e.message)
      }
      if (hit?.picUrl) {
        hit.categoryHint = hit.categoryHint || row.name
        await saveHit(row, hit, opts.dryRun, stats)
        console.log(`[${stats.processed}] OK ${row.name} <= ${hit.source}`)
        continue
      }
    }

    if (opts.withStock) {
      try {
        hit = await providerBrandStock(row)
      } catch (e) {
        console.warn('brand-stock 失败:', e.message)
      }
      if (hit?.localFile) {
        hit.categoryHint = hit.categoryHint || row.name
        await saveHit(row, hit, opts.dryRun, stats)
        console.log(`[${stats.processed}] OK ${row.name} <= ${hit.source}`)
        continue
      }
    }

    if (opts.withJd) {
      pendingJd.push(row)
    } else {
      stats.skip++
      console.log(`[${stats.processed}] skip ${row.name} (${row.brandHit.keyword})`)
    }
  }

  if (opts.withJd && pendingJd.length) {
    let playwright
    try {
      playwright = require('playwright')
    } catch {
      console.warn('Playwright 未安装，跳过京东。npm install playwright')
    }

    if (playwright) {
      console.log(`\n京东补图: ${pendingJd.length} 条`)
      const browser = await playwright.chromium.launch({ headless: !opts.headed })
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        locale: 'zh-CN'
      })
      const page = await context.newPage()

      for (const row of pendingJd) {
        const keyword = buildSearchKeyword(row)
        try {
          const result = await searchJd(page, keyword)
          await sleep(1500 + Math.random() * 800)
          if (!result?.src) {
            stats.skip++
            console.log(`[jd] 未找到: ${keyword}`)
            continue
          }
          let picUrl = result.src
          if (picUrl.startsWith('//')) picUrl = `https:${picUrl}`
          const hit = { source: 'jd', picUrl, categoryHint: result.breadcrumb || row.name }
          await saveHit(row, hit, opts.dryRun, stats)
          console.log(`[jd] OK ${row.name}`)
        } catch (e) {
          stats.fail++
          console.warn(`[jd] 失败 ${keyword}:`, e.message)
        }
      }
      await browser.close()
    }
  }

  console.log('\n--- 完成 ---')
  console.log(JSON.stringify(stats, null, 2))
  console.log('\n下一步:')
  console.log('  node prisma/enrich-brand-images.js --list')
  console.log('  node prisma/enrich-brand-images.js --tier=1 --limit=200 --with-jd --headed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
