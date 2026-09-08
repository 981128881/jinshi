/**
 * 商超常见大牌关键词（名称或 tags 命中即视为大牌 SKU）
 * tier 越小越优先补图
 */
const BRAND_GROUPS = [
  {
    tier: 1,
    label: '碳酸饮料',
    keywords: ['可口可乐', '百事可乐', '百事', '雪碧', '芬达', '美年达', '七喜', '健怡', '零度', 'Coca', 'Pepsi', 'Sprite', 'Fanta']
  },
  {
    tier: 1,
    label: '包装饮用水',
    keywords: ['农夫山泉', '怡宝', '娃哈哈', '景田', '百岁山', '昆仑山', '依云']
  },
  {
    tier: 1,
    label: '茶饮料/功能饮',
    keywords: ['康师傅', '统一', '今麦郎', '冰红茶', '阿萨姆', '东方树叶', '茶π', '茶派', '红牛', '东鹏', '脉动', '尖叫', '佳得乐', '王老吉', '加多宝', '元气森林', '魔爪', 'Monster']
  },
  {
    tier: 1,
    label: '乳品',
    keywords: ['蒙牛', '伊利', '光明', '特仑苏', '安慕希', '金典', '纯甄', '旺仔', '养乐多', '益力多', '认养一头牛']
  },
  {
    tier: 2,
    label: '休闲零食',
    keywords: ['奥利奥', '好丽友', '乐事', '品客', '旺旺', '徐福记', '德芙', '费列罗', '士力架', '三只松鼠', '良品铺子', '卫龙', '洽洽', '甘源', '可比克', '上好佳']
  },
  {
    tier: 2,
    label: '粮油调味',
    keywords: ['金龙鱼', '福临门', '鲁花', '海天', '李锦记', '太太乐', '厨邦', '千禾', '六月鲜']
  },
  {
    tier: 2,
    label: '啤酒',
    keywords: ['青岛啤酒', '雪花', '燕京', '哈尔滨', '百威', '喜力', '乌苏', '1664']
  },
  {
    tier: 3,
    label: '个护家清',
    keywords: ['海飞丝', '潘婷', '飘柔', '舒肤佳', '汰渍', '碧浪', '奥妙', '力士', '多芬', '高露洁', '佳洁士', '黑人', '云南白药牙膏', '维达', '清风', '心相印', '洁柔', '蓝月亮', '立白', '超能']
  },
  {
    tier: 3,
    label: '咖啡/冲调',
    keywords: ['雀巢', 'Nescafe', '立顿', '麦斯威尔', '星巴克', '三合一']
  }
]

/** 扁平列表，按 tier 排序 */
const FLAT_BRANDS = BRAND_GROUPS.flatMap((g) =>
  g.keywords.map((keyword) => ({ keyword, tier: g.tier, label: g.label }))
).sort((a, b) => a.tier - b.tier || a.keyword.length - b.keyword.length)

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

function productTagsText(tags) {
  if (Array.isArray(tags)) return tags.join(' ')
  if (typeof tags === 'string') return tags
  return ''
}

function matchBrand(row, onlyTier = null) {
  const hay = normalizeText(`${row.name} ${productTagsText(row.tags)}`)
  for (const item of FLAT_BRANDS) {
    if (onlyTier != null && item.tier !== onlyTier) continue
    if (hay.includes(normalizeText(item.keyword))) {
      return item
    }
  }
  return null
}

function filterBrandProducts(rows, { tier = null, brand = null, skipHasImage = true } = {}) {
  const brandLower = brand ? normalizeText(brand) : null
  const seen = new Set()
  const matched = []

  for (const row of rows) {
    if (skipHasImage && row.image) continue
    const hit = matchBrand(row, tier)
    if (!hit) continue
    if (brandLower && !normalizeText(hit.keyword).includes(brandLower) && !normalizeText(row.name).includes(brandLower)) {
      continue
    }
    if (seen.has(row.id)) continue
    seen.add(row.id)
    matched.push({ ...row, brandHit: hit })
  }

  matched.sort((a, b) => {
    if (a.brandHit.tier !== b.brandHit.tier) return a.brandHit.tier - b.brandHit.tier
    return a.id - b.id
  })
  return matched
}

function buildSearchKeyword(row) {
  const name = String(row.name || '').trim()
  const brand = row.brandHit?.keyword || ''
  if (!brand) return name.slice(0, 48)
  if (normalizeText(name).includes(normalizeText(brand))) return name.slice(0, 48)
  return `${brand} ${name}`.slice(0, 48)
}

module.exports = {
  BRAND_GROUPS,
  FLAT_BRANDS,
  matchBrand,
  filterBrandProducts,
  buildSearchKeyword
}
