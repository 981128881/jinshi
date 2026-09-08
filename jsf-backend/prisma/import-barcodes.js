/**
 * 从 barcodes.sql 导入商品到 Product 表
 *
 * 用法:
 *   node prisma/import-barcodes.js "h:/Download/.../barcodes.sql"
 *   node prisma/import-barcodes.js "path/to/barcodes.sql" --limit=5000
 *   node prisma/import-barcodes.js "path/to/barcodes.sql" --replace --limit=10000
 *   node prisma/import-barcodes.js "path/to/barcodes.sql" --all
 */
const fs = require('fs')
const readline = require('readline')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_SQL = path.resolve(
  'h:/Download/barcode-master/barcode-master/barcodes.sql/barcodes.sql'
)

const CATEGORY_RULES = [
  { id: 10, words: ['酒', '红酒', '白酒', '啤酒', '干红', '干白', '沱牌', '葡萄酒', '威士忌', '伏特加', '朗姆', '梅酒', '补酒'] },
  { id: 6, words: ['可乐', '汽水', '果汁', '茶饮', '咖啡', '饮料', '矿泉', '百事', '雪碧', '美年达', '脉动', '芬达', '冰茶', '奶茶', '豆奶'] },
  { id: 7, words: ['饼干', '薯片', '糖果', '巧克力', '零食', '奥利奥', '奥力奥', '坚果', '方便面', '小当家', '脆脆面', '蛋苕', '果卷', '软糖', '锅巴', '膨化'] },
  { id: 8, words: ['大米', '小米', '面粉', '挂面', '面条', '酱油', '醋', '味精', '鸡精', '盐', '芝麻', '调和油', '食用油', '火锅底料', '调味', '香醋', '老抽', '生抽', '橄榄油', '糯米'] },
  { id: 5, words: ['牛奶', '酸奶', '奶酪', '乳酪', '纯奶', '鲜乳', '伊利', '蒙牛', '光明', '特仑苏', '安慕希'] },
  { id: 4, words: ['虾', '鱼', '蟹', '海鲜', '三文鱼', '基围虾', '带鱼', '鱿鱼', '海参', '鲍鱼', '扇贝', '虾仁', '罐头'] },
  { id: 3, words: ['猪肉', '牛肉', '羊肉', '鸡肉', '鸡翅', '鸡腿', '排骨', '里脊', '火腿', '香肠', '培根', '鸡蛋', '鸭蛋', '肉丸', '肉肠', '双汇'] },
  { id: 2, words: ['蔬菜', '西兰花', '白菜', '土豆', '番茄', '黄瓜', '青菜', '菠菜', '芹菜', '萝卜', '洋葱', '大蒜', '生姜', '辣椒', '蘑菇', '木耳'] },
  { id: 1, words: ['水果', '苹果', '橙', '桃', '梨', '葡萄', '芒果', '草莓', '香蕉', '猕猴桃', '车厘子', '柠檬', '杨梅', '黄桃', '脐橙', '哈密瓜', '西瓜', '樱桃', '果'] },
  { id: 9, words: ['洗发', '沐浴', '肥皂', '香皂', '牙膏', '纸巾', '抽纸', '洗衣', '厕精', '衣架', '脸盆', '筷', '针线', '杀虫', '蚊香', '花露水', '舒蕾', '拉芳', '六神', '洗洁精', '洗衣液', '护发', '啫喱', '纸', '杯', '碗', '盆', '梳', '扫把', '拖把', '手套', '口罩', '日用'] }
]

const DEFAULT_CATEGORY_ID = 9

const SEED_CATEGORIES = [
  { id: 1, name: '水果', icon: '🍎', iconImage: '/static/category/fruit.jpg', iconBg: '#D8EEF8' },
  { id: 2, name: '蔬菜', icon: '🥬', iconImage: '/static/category/vegetable.jpg', iconBg: '#E8F5EC' },
  { id: 3, name: '肉禽蛋', icon: '🥩', iconImage: '/static/category/meat.jpg', iconBg: '#F5EDE4' },
  { id: 4, name: '海鲜', icon: '🦐', iconImage: '/static/category/seafood.jpg', iconBg: '#E4F0F8' },
  { id: 5, name: '乳品', icon: '🥛', iconImage: '/static/category/dairy.jpg', iconBg: '#FFF8E8' },
  { id: 6, name: '饮料', icon: '🥤', iconImage: '/static/category/drink.jpg', iconBg: '#D8EEF8' },
  { id: 7, name: '零食', icon: '🍿', iconImage: '/static/category/snack.jpg', iconBg: '#FFF5D8' },
  { id: 8, name: '粮油', icon: '🌾', iconImage: '/static/category/grain.jpg', iconBg: '#F5EDE4' },
  { id: 9, name: '日用', icon: '🧴', iconImage: '/static/category/daily.jpg', iconBg: '#EDE8F5' },
  { id: 10, name: '酒水', icon: '🍷', iconImage: '/static/category/wine.jpg', iconBg: '#F5EDE4' }
]

function parseArgs(argv) {
  const sqlPath = argv.find((a) => !a.startsWith('--')) || DEFAULT_SQL
  const limitArg = argv.find((a) => a.startsWith('--limit='))
  const all = argv.includes('--all')
  const replace = argv.includes('--replace')
  const limit = all ? Infinity : limitArg ? Number(limitArg.split('=')[1]) : 5000
  return { sqlPath, limit, replace }
}

function parseSqlValues(inner) {
  const values = []
  let i = 0
  while (i < inner.length) {
    while (i < inner.length && (inner[i] === ' ' || inner[i] === ',')) i++
    if (i >= inner.length) break

    if (inner[i] === "'") {
      i++
      let s = ''
      while (i < inner.length) {
        if (inner[i] === "'" && inner[i + 1] === "'") {
          s += "'"
          i += 2
        } else if (inner[i] === "'") {
          i++
          break
        } else {
          s += inner[i]
          i++
        }
      }
      values.push(s)
      continue
    }

    if (inner.slice(i, i + 4).toUpperCase() === 'NULL') {
      values.push(null)
      i += 4
      continue
    }

    let s = ''
    while (i < inner.length && inner[i] !== ',') {
      s += inner[i]
      i++
    }
    values.push(s.trim())
  }
  return values
}

function parsePrice(raw) {
  if (raw == null || raw === '' || raw === 'NULL') return 9.9
  const n = parseFloat(String(raw).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 9.9
}

function guessCategoryId(name, brand) {
  const text = `${name || ''}${brand || ''}`
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((w) => text.includes(w))) return rule.id
  }
  return DEFAULT_CATEGORY_ID
}

function buildDesc(row) {
  const lines = [`条码：${row.barcode}`]
  if (row.spec) lines.push(`规格：${row.spec}`)
  if (row.unit) lines.push(`单位：${row.unit}`)
  if (row.brand) lines.push(`品牌：${row.brand}`)
  if (row.supplier) lines.push(`厂商：${row.supplier}`)
  if (row.made_in) lines.push(`产地：${row.made_in}`)
  return lines.join('\n')
}

function toProduct(values, validCategoryIds) {
  if (values.length < 12) return null
  const [, barcode, name, spec, unit, price, brand, supplier, made_in, , , deletedAt] = values
  if (deletedAt && deletedAt !== 'NULL') return null
  if (!name || !String(name).trim()) return null

  const cleanName = String(name).trim().slice(0, 256)
  const parsedPrice = parsePrice(price)
  let categoryId = guessCategoryId(cleanName, brand)
  if (!validCategoryIds.has(categoryId)) categoryId = DEFAULT_CATEGORY_ID
  const tags = []
  if (brand && String(brand).trim()) tags.push(String(brand).trim().slice(0, 16))
  if (spec && String(spec).trim()) tags.push(String(spec).trim().slice(0, 16))

  return {
    categoryId,
    name: cleanName,
    price: parsedPrice,
    originalPrice: Math.round(parsedPrice * 1.15 * 100) / 100,
    barcode: String(barcode || ''),
    image: '',
    sales: Math.floor(Math.random() * 500),
    stock: 999,
    tags: tags.slice(0, 3),
    desc: buildDesc({ barcode, spec, unit, brand, supplier, made_in }),
    visible: true
  }
}

function parseInsertLine(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('(')) return null
  const inner = trimmed.replace(/^\(/, '').replace(/\),?\s*$/, '')
  return parseSqlValues(inner)
}

async function ensureCategories() {
  const count = await prisma.category.count()
  if (count >= 10) return
  console.log('分类不足，正在写入默认分类...')
  for (const c of SEED_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: c.id },
      create: { ...c, visible: true },
      update: { name: c.name, icon: c.icon, iconImage: c.iconImage, iconBg: c.iconBg, visible: true }
    })
  }
}

async function clearProducts() {
  await prisma.cartItem.deleteMany()
  await prisma.orderItem.updateMany({ data: { productId: null } })
  const result = await prisma.product.deleteMany()
  console.log(`已清空 ${result.count} 个旧商品`)
}

async function importFile(sqlPath, limit, validCategoryIds) {
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`找不到 SQL 文件: ${sqlPath}`)
  }

  const stream = fs.createReadStream(sqlPath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  let batch = []
  let imported = 0
  let skipped = 0
  let parsed = 0
  const BATCH_SIZE = 500

  async function flush() {
    if (!batch.length) return
    await prisma.product.createMany({ data: batch })
    imported += batch.length
    batch = []
    if (imported % 2000 === 0) {
      console.log(`已导入 ${imported} 条...`)
    }
  }

  for await (const line of rl) {
    if (imported >= limit) break
    if (!line.includes('(') || line.startsWith('CREATE') || line.startsWith('INSERT INTO')) continue

    const values = parseInsertLine(line)
    if (!values) continue
    parsed++

    const product = toProduct(values, validCategoryIds)
    if (!product) {
      skipped++
      continue
    }

    batch.push(product)
    if (batch.length >= BATCH_SIZE) {
      await flush()
    }
    if (imported + batch.length >= limit) {
      await flush()
      break
    }
  }

  await flush()
  return { imported, skipped, parsed }
}

async function main() {
  const { sqlPath, limit, replace } = parseArgs(process.argv.slice(2))
  console.log('SQL 文件:', sqlPath)
  console.log('导入上限:', Number.isFinite(limit) ? limit : '全部')

  if (replace) {
    await clearProducts()
  }

  const categoryCount = await prisma.category.count()
  if (categoryCount === 0) {
    await ensureCategories()
  } else if (categoryCount < 10) {
    await ensureCategories()
  }

  const validCategoryIds = new Set(
    (await prisma.category.findMany({ select: { id: true } })).map((c) => c.id)
  )
  if (!validCategoryIds.has(DEFAULT_CATEGORY_ID)) {
    throw new Error('缺少默认分类，请先执行 npm run db:seed')
  }

  const started = Date.now()
  const { imported, skipped, parsed } = await importFile(sqlPath, limit, validCategoryIds)
  const seconds = ((Date.now() - started) / 1000).toFixed(1)

  console.log('--- 导入完成 ---')
  console.log(`解析行数: ${parsed}`)
  console.log(`成功导入: ${imported}`)
  console.log(`跳过: ${skipped}`)
  console.log(`耗时: ${seconds}s`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
