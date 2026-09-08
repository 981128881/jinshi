/**
 * 实验性：用 Playwright 在京东搜索商品名，抓取首个结果主图 + 面包屑分类
 *
 * ⚠️ 仅供本地小批量补图，可能触发验证码/封 IP，勿用于生产大规模爬取
 *
 * 用法:
 *   npm install playwright
 *   npx playwright install chromium
 *   node prisma/enrich-jd-playwright.js --limit=30
 *   node prisma/enrich-jd-playwright.js --limit=30 --headed   # 显示浏览器便于过验证码
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { compressProductImage } = require('../src/utils/imageCompress')
const { mapMarketCategoryToId } = require('./lib/market-category-map')

const prisma = new PrismaClient()
const PRODUCTS_DIR = path.join(__dirname, '../public/products')

function parseArgs(argv) {
  const limitArg = argv.find((a) => a.startsWith('--limit='))
  return {
    limit: limitArg ? Number(limitArg.split('=')[1]) : 20,
    headed: argv.includes('--headed'),
    dryRun: argv.includes('--dry-run'),
    skipHasImage: !argv.includes('--force')
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function downloadImage(imageUrl, destPath) {
  const res = await fetch(imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://www.jd.com/'
    }
  })
  if (!res.ok) return false
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500) return false
  fs.writeFileSync(destPath, buf)
  return true
}

async function searchJd(page, keyword) {
  const url = `https://search.jd.com/Search?enc=utf-8&keyword=${encodeURIComponent(keyword)}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(2000)

  // 面包屑
  const breadcrumb = await page.evaluate(() => {
    const sel = document.querySelector('#crumb-wrap, .breadcrumb, .crumb')
    return sel ? sel.innerText.replace(/\s+/g, ' ').trim() : ''
  })

  // 首个商品主图
  const img = await page.evaluate(() => {
    const el = document.querySelector('#J_goodsList li img, .gl-item img, .plugin_goodsCard img')
    if (!el) return null
    return el.getAttribute('src') || el.getAttribute('data-lazy-img') || el.getAttribute('data-src')
  })

  if (!img) return null
  let picUrl = img
  if (picUrl.startsWith('//')) picUrl = `https:${picUrl}`
  if (picUrl.startsWith('/')) picUrl = `https:${picUrl}`

  return { picUrl, breadcrumb }
}

async function main() {
  let playwright
  try {
    playwright = require('playwright')
  } catch {
    console.error('请先安装: npm install playwright && npx playwright install chromium')
    process.exit(1)
  }

  const { limit, headed, dryRun, skipHasImage } = parseArgs(process.argv.slice(2))
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true })

  const where = skipHasImage ? { image: '' } : {}
  const rows = await prisma.product.findMany({
    where,
    select: { id: true, name: true, barcode: true, categoryId: true },
    orderBy: { id: 'asc' },
    take: limit
  })

  console.log(`京东 Playwright enrichment: ${rows.length} 条 (headed=${headed}, dryRun=${dryRun})`)

  const browser = await playwright.chromium.launch({ headless: !headed })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN'
  })
  const page = await context.newPage()

  const stats = { processed: 0, hit: 0, saved: 0, fail: 0 }

  for (const row of rows) {
    stats.processed++
    const keyword = row.name.slice(0, 40)
    try {
      const result = await searchJd(page, keyword)
      await sleep(1500 + Math.random() * 1000)
      if (!result?.picUrl) {
        console.log(`[${stats.processed}] 未找到: ${keyword}`)
        continue
      }
      stats.hit++
      console.log(`[${stats.processed}] ${keyword}`)
      console.log(`  图: ${result.picUrl.slice(0, 70)}...`)
      console.log(`  类: ${result.breadcrumb || '(无)'}`)

      if (dryRun) continue

      const safeName = String(row.id)
      const destPath = path.join(PRODUCTS_DIR, `jd_${safeName}.jpg`)
      const ok = await downloadImage(result.picUrl, destPath)
      if (!ok) { stats.fail++; continue }

      const compressed = await compressProductImage(destPath)
      const categoryId = await mapMarketCategoryToId(result.breadcrumb || row.name)
      await prisma.product.update({
        where: { id: row.id },
        data: {
          image: `/static/products/${compressed.filename}`,
          ...(categoryId ? { categoryId } : {})
        }
      })
      stats.saved++
    } catch (e) {
      stats.fail++
      console.warn(`失败 ${keyword}:`, e.message)
    }
  }

  await browser.close()
  console.log('\n--- 完成 ---')
  console.log(JSON.stringify(stats, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
