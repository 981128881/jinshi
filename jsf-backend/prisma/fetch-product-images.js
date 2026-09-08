/**
 * 通过 Open Food Facts 条码 API 拉取商品图片并保存到本地
 *
 * 用法:
 *   node prisma/fetch-product-images.js --limit=5000
 *   node prisma/fetch-product-images.js --food --limit=5000   # 优先食品类
 *   node prisma/fetch-product-images.js --categories=7,6,8 --limit=3000
 *   node prisma/fetch-product-images.js --all
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { resolvePublicUrl } = require('../src/utils/publicUrl')
const { compressProductImage } = require('../src/utils/imageCompress')

const prisma = new PrismaClient()
const PRODUCTS_DIR = path.join(__dirname, '../public/products')
const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const DELAY_MS = 650
const BATCH = 100

/** 食品类优先：零食 > 饮料 > 粮油 > 酒水 > 乳品 > 水果 > 海鲜 > 肉禽蛋 > 蔬菜 */
const FOOD_CATEGORY_IDS = [7, 6, 8, 10, 5, 1, 4, 3, 2]

function parseArgs(argv) {
  const limitArg = argv.find((a) => a.startsWith('--limit='))
  const categoriesArg = argv.find((a) => a.startsWith('--categories='))
  const all = argv.includes('--all')
  const food = argv.includes('--food')
  const limit = all ? Infinity : limitArg ? Number(limitArg.split('=')[1]) : 5000

  let categoryIds = null
  if (categoriesArg) {
    categoryIds = categoriesArg
      .split('=')[1]
      .split(',')
      .map((n) => Number(n.trim()))
      .filter(Boolean)
  } else if (food) {
    categoryIds = FOOD_CATEGORY_IDS
  }

  return { limit, categoryIds }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function offFolder(barcode) {
  const code = String(barcode).padStart(13, '0')
  return code.replace(/^(\d{3})(\d{3})(\d{3})(\d+)$/, '$1/$2/$3/$4')
}

async function fetchOffImageUrl(barcode) {
  const url = `${OFF_BASE}/${barcode}?fields=code,status,image_front_url,image_url,selected_images`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WxappShop/1.0 (contact@local.dev)' }
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 1 || !data.product) return null

  const direct = data.product.image_front_url || data.product.image_url
  if (direct) return direct

  const front = data.product.selected_images?.front
  if (front?.display?.zh || front?.display?.en) {
    return front.display.zh || front.display.en
  }
  if (front?.thumb?.zh || front?.thumb?.en) {
    return front.thumb.zh || front.thumb.en
  }

  return null
}

async function downloadImage(imageUrl, destPath) {
  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': 'WxappShop/1.0 (contact@local.dev)' }
  })
  if (!res.ok) return false
  const type = res.headers.get('content-type') || ''
  if (!type.includes('image')) return false
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500) return false
  fs.writeFileSync(destPath, buf)
  return true
}

async function processRow(row, stats) {
  stats.processed++

  const imageUrl = await fetchOffImageUrl(row.barcode)
  await sleep(DELAY_MS)
  if (!imageUrl) return

  stats.found++

  const ext = imageUrl.includes('.png') ? 'png' : 'jpg'
  const filename = `${row.barcode}.${ext}`
  const destPath = path.join(PRODUCTS_DIR, filename)

  let ok = false
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
    ok = true
  } else {
    ok = await downloadImage(imageUrl, destPath)
  }
  if (!ok) return

  const compressed = await compressProductImage(destPath)
  const storedPath = `/static/products/${compressed.filename}`

  stats.saved++
  await prisma.product.update({
    where: { id: row.id },
    data: { image: storedPath }
  })
  console.log(`已保存 ${stats.saved} 张（处理 ${stats.processed}，命中 ${stats.found}）`)
}

async function fetchByCategories(categoryIds, limit) {
  const stats = { processed: 0, found: 0, saved: 0 }

  for (const categoryId of categoryIds) {
    if (stats.processed >= limit) break

    let cursor = 0
    const names = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } })
    console.log(`\n>> 分类 ${categoryId} ${names?.name || ''}`)

    while (stats.processed < limit) {
      const take = Math.min(BATCH, limit - stats.processed)
      const rows = await prisma.product.findMany({
        where: {
          id: { gt: cursor },
          categoryId,
          image: '',
          barcode: { not: '' }
        },
        select: { id: true, barcode: true, name: true },
        orderBy: { id: 'asc' },
        take
      })
      if (!rows.length) break

      for (const row of rows) {
        cursor = row.id
        if (stats.processed >= limit) break
        await processRow(row, stats)
      }
    }
  }

  return stats
}

async function fetchDefault(limit) {
  const stats = { processed: 0, found: 0, saved: 0 }
  let cursor = 0

  while (stats.processed < limit) {
    const take = Math.min(BATCH, limit - stats.processed)
    const rows = await prisma.product.findMany({
      where: {
        id: { gt: cursor },
        image: '',
        barcode: { not: '' }
      },
      select: { id: true, barcode: true, name: true },
      orderBy: { id: 'asc' },
      take
    })
    if (!rows.length) break

    for (const row of rows) {
      cursor = row.id
      if (stats.processed >= limit) break
      await processRow(row, stats)
    }
  }

  return stats
}

async function main() {
  const { limit, categoryIds } = parseArgs(process.argv.slice(2))
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true })

  console.log('开始拉取商品图片，上限:', Number.isFinite(limit) ? limit : '全部')
  console.log('数据源: Open Food Facts (https://world.openfoodfacts.org)')
  if (categoryIds) {
    console.log('优先分类:', categoryIds.join(', '))
  }

  const stats = categoryIds
    ? await fetchByCategories(categoryIds, limit)
    : await fetchDefault(limit)

  console.log('\n--- 完成 ---')
  console.log(`处理: ${stats.processed}`)
  console.log(`API 命中: ${stats.found}`)
  console.log(`保存图片: ${stats.saved}`)
  console.log(`命中率: ${stats.processed ? ((stats.found / stats.processed) * 100).toFixed(1) : 0}%`)
  if (stats.saved > 0) {
    console.log('示例 URL:', resolvePublicUrl('/static/products/xxx.jpg'))
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
