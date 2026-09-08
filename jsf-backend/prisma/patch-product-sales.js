/**
 * 按商品名称/分类模拟现实销量（商超常见爆款优先）
 * 用法: npm run db:patch-sales
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { invalidateProductCount } = require('../src/services/statsCache')

const prisma = new PrismaClient()
const REPORT = path.join(__dirname, 'patch-product-sales-report.txt')

const STD_NAME_ALIASES = {
  水果: ['水果'],
  蔬菜: ['蔬菜'],
  肉禽蛋: ['肉禽蛋', '蛋类', '肉蛋'],
  海鲜: ['海鲜', '水产'],
  乳品: ['乳品', '乳制品', '奶品'],
  饮料: ['饮料', '饮品'],
  零食: ['零食', '休闲食品'],
  粮油: ['粮油', '米面油'],
  日用: ['日用', '百货', '生活用品'],
  酒水: ['酒水', '酒', '酒类']
}

/** 先匹配靠前、更具体的规则；数值区间模拟现实销量差异 */
const SALES_RULES = [
  // --- 饮料爆款 ---
  { words: ['可口可乐', 'Coca'], min: 12000, max: 15000, cat: '饮料' },
  { words: ['百事可乐'], min: 11000, max: 14000, cat: '饮料' },
  { words: ['百事'], min: 9500, max: 12500, cat: '饮料' },
  { words: ['雪碧'], min: 10000, max: 13000, cat: '饮料' },
  { words: ['芬达'], min: 7500, max: 10500, cat: '饮料' },
  { words: ['美年达'], min: 7000, max: 10000, cat: '饮料' },
  { words: ['大窑'], min: 8200, max: 11200, cat: '饮料' },
  { words: ['北冰洋'], min: 6500, max: 9000, cat: '饮料' },
  { words: ['七喜'], min: 5500, max: 8000, cat: '饮料' },
  { words: ['农夫山泉'], min: 9000, max: 12000, cat: '饮料' },
  { words: ['怡宝'], min: 8500, max: 11500, cat: '饮料' },
  { words: ['百岁山'], min: 6000, max: 8500, cat: '饮料' },
  { words: ['康师傅冰红茶', '冰红茶'], min: 8000, max: 11000, cat: '饮料' },
  { words: ['统一绿茶', '绿茶'], min: 6500, max: 9000, cat: '饮料' },
  { words: ['东方树叶'], min: 7200, max: 9800, cat: '饮料' },
  { words: ['红牛'], min: 8800, max: 11800, cat: '饮料' },
  { words: ['东鹏'], min: 7500, max: 10200, cat: '饮料' },
  { words: ['脉动'], min: 6200, max: 8800, cat: '饮料' },
  { words: ['王老吉', '加多宝'], min: 6800, max: 9200, cat: '饮料' },
  { words: ['元气森林'], min: 7000, max: 9500, cat: '饮料' },
  { words: ['可乐'], min: 4500, max: 7500, cat: '饮料' },
  { words: ['汽水', '苏打水', '气泡水'], min: 1800, max: 4200, cat: '饮料' },
  { words: ['果汁', '果粒橙'], min: 2200, max: 4800, cat: '饮料' },

  // --- 乳品 ---
  { words: ['特仑苏'], min: 8500, max: 11000, cat: '乳品' },
  { words: ['金典'], min: 7800, max: 10500, cat: '乳品' },
  { words: ['安慕希', '纯甄'], min: 7200, max: 9800, cat: '乳品' },
  { words: ['旺仔牛奶', '旺仔'], min: 8000, max: 10800, cat: '乳品' },
  { words: ['伊利纯牛奶', '蒙牛纯牛奶'], min: 7500, max: 10200, cat: '乳品' },
  { words: ['纯牛奶', '鲜牛奶'], min: 5500, max: 8200, cat: '乳品' },
  { words: ['酸奶'], min: 4200, max: 6800, cat: '乳品' },

  // --- 零食 ---
  { words: ['乐事'], min: 7800, max: 10500, cat: '零食' },
  { words: ['奥利奥', '奥力奥'], min: 6800, max: 9200, cat: '零食' },
  { words: ['卫龙'], min: 7200, max: 9600, cat: '零食' },
  { words: ['三只松鼠'], min: 5500, max: 7800, cat: '零食' },
  { words: ['良品铺子'], min: 4800, max: 7000, cat: '零食' },
  { words: ['薯片', '饼干', '巧克力'], min: 2800, max: 5200, cat: '零食' },

  // --- 粮油 ---
  { words: ['五常大米', '大米10', '大米5'], min: 8200, max: 11000, cat: '粮油' },
  { words: ['金龙鱼'], min: 6500, max: 9000, cat: '粮油' },
  { words: ['福临门'], min: 5800, max: 8200, cat: '粮油' },
  { words: ['挂面', '面条'], min: 4500, max: 7200, cat: '粮油' },
  { words: ['食用油', '调和油', '花生油'], min: 3800, max: 6500, cat: '粮油' },
  { words: ['酱油', '生抽', '老抽'], min: 4200, max: 6800, cat: '粮油' },
  { words: ['盐'], min: 5000, max: 7500, cat: '粮油' },

  // --- 日用 ---
  { words: ['维达'], min: 7500, max: 10200, cat: '日用' },
  { words: ['心相印'], min: 6800, max: 9200, cat: '日用' },
  { words: ['清风'], min: 6200, max: 8600, cat: '日用' },
  { words: ['抽纸', '卷纸'], min: 5200, max: 7800, cat: '日用' },
  { words: ['洗衣液'], min: 4500, max: 7000, cat: '日用' },
  { words: ['洗洁精'], min: 4200, max: 6500, cat: '日用' },
  { words: ['牙膏'], min: 3800, max: 5800, cat: '日用' },

  // --- 肉禽蛋 ---
  { words: ['鸡蛋', '土鸡蛋', '鲜鸡蛋'], min: 8500, max: 11500, cat: '肉禽蛋' },
  { words: ['五花肉', '里脊', '排骨'], min: 4200, max: 6800, cat: '肉禽蛋' },
  { words: ['鸡翅', '鸡腿'], min: 4800, max: 7200, cat: '肉禽蛋' },

  // --- 水果 ---
  { words: ['苹果', '红富士'], min: 5200, max: 7800, cat: '水果' },
  { words: ['香蕉'], min: 5800, max: 8200, cat: '水果' },
  { words: ['车厘子', '樱桃'], min: 3500, max: 5800, cat: '水果' },
  { words: ['橙', '脐橙'], min: 4200, max: 6500, cat: '水果' },

  // --- 蔬菜 ---
  { words: ['土豆', '西红柿', '番茄', '白菜'], min: 3200, max: 5500, cat: '蔬菜' },
  { words: ['西兰花', '菠菜', '黄瓜'], min: 2400, max: 4200, cat: '蔬菜' },

  // --- 海鲜 ---
  { words: ['基围虾', '虾仁'], min: 2800, max: 4800, cat: '海鲜' },
  { words: ['三文鱼'], min: 2200, max: 3800, cat: '海鲜' },

  // --- 酒水（整体偏低频）---
  { words: ['茅台', '五粮液'], min: 180, max: 450, cat: '酒水' },
  { words: ['啤酒'], min: 1200, max: 3200, cat: '酒水' },
  { words: ['红酒', '葡萄酒'], min: 450, max: 1200, cat: '酒水' }
]

const CATEGORY_BASE = {
  饮料: [1400, 3600],
  零食: [1100, 3200],
  粮油: [900, 2800],
  乳品: [1000, 2900],
  日用: [800, 2600],
  水果: [700, 2200],
  蔬菜: [650, 2000],
  肉禽蛋: [900, 2800],
  海鲜: [500, 1800],
  酒水: [120, 680]
}

function hashJitter(id, name, min, max) {
  const span = max - min
  if (span <= 0) return min
  let h = id >>> 0
  const s = String(name || '')
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  }
  return min + (h % (span + 1))
}

async function buildCategoryKeyMap() {
  const rows = await prisma.category.findMany({ select: { id: true, name: true } })
  const idToKey = {}
  for (const row of rows) {
    for (const [key, aliases] of Object.entries(STD_NAME_ALIASES)) {
      if (aliases.some((a) => row.name.includes(a) || a.includes(row.name))) {
        idToKey[row.id] = key
        break
      }
    }
    if (!idToKey[row.id]) idToKey[row.id] = '日用'
  }
  return idToKey
}

function matchRule(name, categoryKey) {
  for (const rule of SALES_RULES) {
    if (rule.cat && rule.cat !== categoryKey) continue
    if (rule.words.some((w) => name.includes(w))) return rule
  }
  return null
}

function computeSales(product, categoryKey) {
  const name = String(product.name || '')
  const rule = matchRule(name, categoryKey)
  if (rule) {
    return hashJitter(product.id, name, rule.min, rule.max)
  }

  const [lo, hi] = CATEGORY_BASE[categoryKey] || CATEGORY_BASE.日用

  // 进口/礼盒/大包装微调
  let min = lo
  let max = hi
  if (/进口|礼盒|豪华|高端/.test(name)) {
    min = Math.max(80, Math.floor(lo * 0.55))
    max = Math.max(min + 50, Math.floor(hi * 0.7))
  } else if (/整箱|家庭装|大包装|10斤|5斤|24罐|24盒/.test(name)) {
    min = Math.floor(lo * 1.15)
    max = Math.floor(hi * 1.25)
  } else if (/迷你|小包装|试用|单支/.test(name)) {
    min = Math.max(60, Math.floor(lo * 0.75))
    max = Math.floor(hi * 0.85)
  }

  return hashJitter(product.id, name, min, max)
}

async function main() {
  const lines = []
  const log = (msg) => {
    lines.push(msg)
    console.log(msg)
  }

  log('=== 自动填充商品销量 ===')
  log(new Date().toISOString())

  const idToKey = await buildCategoryKeyMap()
  const products = await prisma.product.findMany({
    select: { id: true, name: true, categoryId: true, sales: true }
  })
  log(`待处理商品: ${products.length}`)

  const tierStats = { rule: 0, category: 0 }
  const topSamples = []

  const BATCH = 200
  let updated = 0
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH)
    const ops = []
    for (const p of batch) {
      const categoryKey = idToKey[p.categoryId] || '日用'
      const rule = matchRule(p.name, categoryKey)
      const sales = computeSales(p, categoryKey)
      if (rule) tierStats.rule += 1
      else tierStats.category += 1
      if (topSamples.length < 30 && sales >= 8000) {
        topSamples.push({ name: p.name, sales, categoryKey })
      }
      if (p.sales !== sales) {
        updated += 1
        ops.push(prisma.product.update({ where: { id: p.id }, data: { sales } }))
      }
    }
    if (ops.length) await prisma.$transaction(ops)
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= products.length) {
      log(`进度: ${Math.min(i + BATCH, products.length)}/${products.length}`)
    }
  }

  invalidateProductCount()

  log('\n--- 统计 ---')
  log(`规则命中: ${tierStats.rule}`)
  log(`分类基准: ${tierStats.category}`)
  log(`已更新: ${updated}`)

  log('\n--- 饮料分类 Top 10 ---')
  const drinkCatIds = Object.entries(idToKey)
    .filter(([, k]) => k === '饮料')
    .map(([id]) => Number(id))
  if (drinkCatIds.length) {
    const drinkTop = await prisma.product.findMany({
      where: { categoryId: { in: drinkCatIds } },
      orderBy: [{ sales: 'desc' }, { id: 'asc' }],
      take: 10,
      select: { name: true, sales: true }
    })
    drinkTop.forEach((r, idx) => log(`${idx + 1}. ${r.name} — 销量 ${r.sales}`))
  }

  log('\n--- 全站销量 Top 10 ---')
  const globalTop = await prisma.product.findMany({
    orderBy: [{ sales: 'desc' }, { id: 'asc' }],
    take: 10,
    select: { name: true, sales: true }
  })
  globalTop.forEach((r, idx) => log(`${idx + 1}. ${r.name} — 销量 ${r.sales}`))

  fs.writeFileSync(REPORT, lines.join('\n'), 'utf8')
  log(`\n报告: ${REPORT}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
