/**
 * 电商/条码返回的类目文本 -> 小程序标准分类 id
 */
const { PrismaClient } = require('@prisma/client')

const RULES = [
  { keys: ['酒', '白酒', '啤酒', '葡萄酒', '威士忌'], names: ['酒水', '酒'] },
  { keys: ['饮料', '饮品', '咖啡', '茶', '果汁', '汽水'], names: ['饮料'] },
  { keys: ['零食', '休闲', '糖果', '巧克力', '坚果', '膨化'], names: ['零食'] },
  { keys: ['粮油', '米面', '调味', '油', '酱'], names: ['粮油'] },
  { keys: ['乳', '奶', '酸奶', '奶酪'], names: ['乳品'] },
  { keys: ['海鲜', '水产', '鱼', '虾', '蟹'], names: ['海鲜'] },
  { keys: ['肉', '禽', '蛋', '火腿', '香肠'], names: ['肉禽蛋', '蛋类'] },
  { keys: ['蔬菜', '菌菇'], names: ['蔬菜'] },
  { keys: ['水果', '果'], names: ['水果'] }
]

let cache = null

async function loadCategoryByName() {
  if (cache) return cache
  const prisma = new PrismaClient()
  const rows = await prisma.category.findMany({
    where: { externalId: null },
    select: { id: true, name: true }
  })
  await prisma.$disconnect()
  cache = new Map(rows.map((r) => [r.name, r.id]))
  return cache
}

function matchRuleText(text) {
  const s = String(text || '')
  for (const rule of RULES) {
    if (rule.keys.some((k) => s.includes(k))) return rule.names
  }
  return ['日用']
}

async function mapMarketCategoryToId(categoryText) {
  const byName = await loadCategoryByName()
  const candidates = matchRuleText(categoryText)
  for (const name of candidates) {
    if (byName.has(name)) return byName.get(name)
    for (const [n, id] of byName.entries()) {
      if (n.includes(name) || name.includes(n)) return id
    }
  }
  return byName.get('日用') || 9
}

module.exports = { mapMarketCategoryToId, matchRuleText }
