/**
 * 下载大牌通用主图到 public/products/stock/
 * 多源搜图；搜不到则生成本地占位图（保证不 fail）
 *
 * 用法: node prisma/download-brand-stock.js
 *       node prisma/download-brand-stock.js --placeholder-only
 */
const fs = require('fs')
const path = require('path')
const { FLAT_BRANDS } = require('./lib/brand-keywords')
const { findBrandImageUrl, downloadImage, generatePlaceholder } = require('./lib/brand-stock-search')
const { safeName } = require('./lib/brand-stock-images')

const STOCK_DIR = path.join(__dirname, '../public/products/stock')

function parseArgs(argv) {
  return {
    placeholderOnly: argv.includes('--placeholder-only'),
    force: argv.includes('--force')
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  fs.mkdirSync(STOCK_DIR, { recursive: true })

  const seen = new Set()
  const brands = FLAT_BRANDS.filter((b) => b.tier <= 2 && b.keyword.length >= 2)
  const stats = { ok: 0, skip: 0, placeholder: 0, fail: 0 }

  console.log(`品牌通用图: ${brands.length} 个关键词, placeholderOnly=${opts.placeholderOnly}`)

  for (const b of brands) {
    if (seen.has(b.keyword)) continue
    seen.add(b.keyword)

    const dest = path.join(STOCK_DIR, `${safeName(b.keyword)}.jpg`)
    if (!opts.force && fs.existsSync(dest) && fs.statSync(dest).size > 800) {
      stats.skip++
      console.log(`skip ${b.keyword}`)
      continue
    }

    if (opts.placeholderOnly) {
      await generatePlaceholder(b.keyword, dest)
      stats.placeholder++
      console.log(`placeholder ${b.keyword}`)
      continue
    }

    const hit = await findBrandImageUrl(b.keyword)
    await sleep(400)

    if (hit?.url) {
      const ok = await downloadImage(hit.url, dest, hit.source.includes('sogou') ? 'https://pic.sogou.com/' : hit.source.includes('baidu') ? 'https://image.baidu.com/' : 'https://www.jd.com/')
      if (ok) {
        stats.ok++
        console.log(`ok ${b.keyword} <= ${hit.source} (${hit.query})`)
        continue
      }
    }

    await generatePlaceholder(b.keyword, dest)
    stats.placeholder++
    console.log(`placeholder ${b.keyword}${hit ? ' (download failed)' : ' (no url)'}`)
  }

  console.log('\n--- 完成 ---')
  console.log(JSON.stringify(stats))
  console.log(`输出目录: ${STOCK_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
