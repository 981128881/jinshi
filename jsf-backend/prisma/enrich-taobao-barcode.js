/**
 * 淘宝开放平台：条码查商品信息 + 主图
 * API: taobao.ma.barcode.productinfo.get
 *
 * 用法:
 *   配置 .env: TAOBAO_APP_KEY, TAOBAO_APP_SECRET, [TAOBAO_SESSION]
 *   node prisma/enrich-taobao-barcode.js --limit=500
 *   node prisma/enrich-taobao-barcode.js --dry-run --limit=10
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { compressProductImage } = require('../src/utils/imageCompress')
const { mapMarketCategoryToId } = require('./lib/market-category-map')

require('dotenv').config()

const prisma = new PrismaClient()
const PRODUCTS_DIR = path.join(__dirname, '../public/products')
const GATEWAY = 'https://gw.api.taobao.com/router/rest'
const DELAY_MS = 350

function parseArgs(argv) {
  const limitArg = argv.find((a) => a.startsWith('--limit='))
  return {
    limit: limitArg ? Number(limitArg.split('=')[1]) : 200,
    dryRun: argv.includes('--dry-run'),
    skipHasImage: !argv.includes('--force')
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function signTop(params, secret) {
  const sorted = Object.keys(params).sort()
  let str = secret
  for (const k of sorted) str += k + params[k]
  str += secret
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase()
}

async function taobaoBarcodeLookup(barcode) {
  const appKey = process.env.TAOBAO_APP_KEY
  const secret = process.env.TAOBAO_APP_SECRET
  if (!appKey || !secret) {
    throw new Error('请配置 TAOBAO_APP_KEY 和 TAOBAO_APP_SECRET（见 docs/PRODUCT_ENRICHMENT.md）')
  }

  const params = {
    method: 'taobao.ma.barcode.productinfo.get',
    app_key: appKey,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    format: 'json',
    v: '2.0',
    sign_method: 'md5',
    barcode: String(barcode)
  }
  if (process.env.TAOBAO_SESSION) params.session = process.env.TAOBAO_SESSION
  params.sign = signTop(params, secret)

  const body = new URLSearchParams(params)
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body
  })
  const data = await res.json()
  const err = data.error_response
  if (err) {
    const code = err.sub_code || err.code
    if (code === 'isp.find-no-product') return null
    throw new Error(`${code}: ${err.sub_msg || err.msg}`)
  }

  const resp = data.taobao_ma_barcode_productinfo_get_response
  const info = resp?.productinfo || resp?.product_info
  if (!info) return null

  const pic = info.pic_url || info.picUrl
  const title = info.title || info.product_name
  const props = info.props || info.property || ''
  const categoryHint = typeof props === 'string' ? props : JSON.stringify(props)

  return {
    picUrl: pic ? (pic.startsWith('http') ? pic : `https:${pic}`) : null,
    title,
    categoryHint
  }
}

async function downloadImage(imageUrl, destPath) {
  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 WxappShop/1.0' }
  })
  if (!res.ok) return false
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500) return false
  fs.writeFileSync(destPath, buf)
  return true
}

async function main() {
  const { limit, dryRun, skipHasImage } = parseArgs(process.argv.slice(2))
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true })

  const where = {
    barcode: { not: '' },
    ...(skipHasImage ? { image: '' } : {})
  }

  const rows = await prisma.product.findMany({
    where,
    select: { id: true, name: true, barcode: true, categoryId: true, image: true },
    orderBy: { id: 'asc' },
    take: limit
  })

  console.log(`淘宝条码 enrichment: ${rows.length} 条 (dryRun=${dryRun})`)

  const stats = { processed: 0, hit: 0, saved: 0, catUpdated: 0, fail: 0 }

  for (const row of rows) {
    stats.processed++
    try {
      const info = await taobaoBarcodeLookup(row.barcode)
      await sleep(DELAY_MS)
      if (!info?.picUrl) continue
      stats.hit++

      const categoryId = await mapMarketCategoryToId(`${info.categoryHint} ${info.title || row.name}`)
      const ext = info.picUrl.includes('.png') ? 'png' : 'jpg'
      const filename = `tb_${row.barcode}.${ext}`
      const destPath = path.join(PRODUCTS_DIR, filename)
      const storedPath = `/static/products/${filename}`

      console.log(`[${stats.processed}] ${row.name} -> ${info.picUrl.slice(0, 60)}...`)

      if (dryRun) continue

      if (!fs.existsSync(destPath)) {
        const ok = await downloadImage(info.picUrl, destPath)
        if (!ok) { stats.fail++; continue }
      }
      const compressed = await compressProductImage(destPath)

      const data = { image: `/static/products/${compressed.filename}` }
      if (categoryId && categoryId !== row.categoryId) {
        data.categoryId = categoryId
        stats.catUpdated++
      }
      await prisma.product.update({ where: { id: row.id }, data })
      stats.saved++
    } catch (e) {
      stats.fail++
      console.warn(`失败 ${row.barcode} ${row.name}:`, e.message)
      if (e.message.includes('请配置 TAOBAO')) throw e
    }
  }

  console.log('\n--- 完成 ---')
  console.log(JSON.stringify(stats, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
