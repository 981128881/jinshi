const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const categories = [
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

const products = [
  { id: 1, categoryId: 1, name: '新鲜红富士苹果 5斤装', price: 29.9, originalPrice: 49.9, image: 'https://via.placeholder.com/300x300/ffcccc/ff6b00?text=苹果', sales: 1200, tags: ['新鲜', '包邮'], desc: '精选山东红富士，脆甜多汁，5斤大果装，产地直发。' },
  { id: 2, categoryId: 2, name: '有机蔬菜礼盒 6种时蔬', price: 59.9, originalPrice: 89.9, image: 'https://via.placeholder.com/300x300/ccffcc/52c41a?text=蔬菜', sales: 800, tags: ['有机', '当日达'], desc: '当日采摘六种时令蔬菜，有机认证，适合家庭日常烹饪。' },
  { id: 3, categoryId: 3, name: '散养土鸡蛋 30枚', price: 35.0, originalPrice: 45.0, image: 'https://via.placeholder.com/300x300/ffffcc/faad14?text=鸡蛋', sales: 2100, tags: ['散养', '新鲜'], desc: '农家散养土鸡蛋，蛋黄饱满，30枚礼盒装。' },
  { id: 4, categoryId: 1, name: '进口车厘子 JJ级 2斤', price: 79.9, originalPrice: 129.9, image: 'https://via.placeholder.com/300x300/ffcccc/e65c00?text=车厘子', sales: 650, tags: ['进口', '特级'], desc: '智利进口车厘子，JJ级大果，2斤精装，冷链配送。' },
  { id: 5, categoryId: 5, name: '纯牛奶 整箱24盒', price: 69.9, originalPrice: 89.9, image: 'https://via.placeholder.com/300x300/ccccff/1890ff?text=牛奶', sales: 1500, tags: ['整箱', '优惠'], desc: '100%纯牛奶，250ml×24盒，营养早餐首选。' },
  { id: 6, categoryId: 8, name: '五常大米 10斤装', price: 49.9, originalPrice: 69.9, image: 'https://via.placeholder.com/300x300/ffffcc/ff9500?text=大米', sales: 3200, tags: ['五常', '新米'], desc: '黑龙江五常稻花香大米，10斤装，米粒饱满清香。' },
  { id: 7, categoryId: 1, name: '海南金煌芒果 3斤', price: 39.9, originalPrice: 59.9, image: 'https://via.placeholder.com/300x300/ffe0b2/ff9800?text=芒果', sales: 980, tags: ['热带', '香甜'], desc: '海南金煌芒，果肉细腻无丝，3斤精选装。' },
  { id: 8, categoryId: 2, name: '新鲜西兰花 500g', price: 8.9, originalPrice: 12.9, image: 'https://via.placeholder.com/300x300/c8e6c9/4caf50?text=西兰花', sales: 560, tags: ['新鲜', '低卡'], desc: '当日采摘西兰花，翠绿紧实，500g/份。' },
  { id: 9, categoryId: 3, name: '精选猪里脊 500g', price: 28.8, originalPrice: 36.8, image: 'https://via.placeholder.com/300x300/ffccbc/ff5722?text=猪肉', sales: 720, tags: ['冷鲜', '精选'], desc: '冷鲜猪里脊肉，500g装，适合炒、炸、炖。' },
  { id: 10, categoryId: 4, name: '鲜活基围虾 500g', price: 45.9, originalPrice: 59.9, image: 'https://via.placeholder.com/300x300/b3e5fc/0288d1?text=基围虾', sales: 430, tags: ['鲜活', '冷链'], desc: '新鲜基围虾，500g装，活虾速冻锁鲜。' },
  { id: 11, categoryId: 6, name: '可口可乐 330ml×24罐', price: 52.9, originalPrice: 65.9, image: 'https://via.placeholder.com/300x300/ffcdd2/e53935?text=可乐', sales: 3200, tags: ['整箱', '经典'], desc: '经典可口可乐，330ml×24罐整箱装。' },
  { id: 12, categoryId: 7, name: '乐事薯片 混合装6袋', price: 29.9, originalPrice: 39.9, image: 'https://via.placeholder.com/300x300/fff9c4/fbc02d?text=薯片', sales: 2500, tags: ['混合', '休闲'], desc: '乐事薯片混合口味6袋装，聚会休闲必备。' },
  { id: 13, categoryId: 9, name: '维达抽纸 3层120抽×20包', price: 39.9, originalPrice: 49.9, image: 'https://via.placeholder.com/300x300/e3f2fd/1976d2?text=抽纸', sales: 3100, tags: ['家庭装', '柔软'], desc: '维达3层抽纸，120抽×20包，柔软亲肤。' },
  { id: 14, categoryId: 10, name: '长城干红葡萄酒 750ml', price: 89.0, originalPrice: 128.0, image: 'https://via.placeholder.com/300x300/f8bbd0/c2185b?text=红酒', sales: 320, tags: ['进口', '礼盒'], desc: '长城经典干红葡萄酒，750ml单瓶，聚餐佳选。' },
  { id: 15, categoryId: 1, name: '赣南脐橙 5斤装', price: 32.9, originalPrice: 45.9, image: 'https://via.placeholder.com/300x300/ffe0b2/ff6f00?text=脐橙', sales: 1100, tags: ['赣南', '甜橙'], desc: '赣南脐橙，5斤大果装，皮薄多汁，自然甜。' },
  { id: 16, categoryId: 5, name: '希腊酸奶 12杯装', price: 45.9, originalPrice: 55.9, image: 'https://via.placeholder.com/300x300/e8eaf6/3f51b5?text=酸奶', sales: 890, tags: ['浓稠', '低糖'], desc: '希腊风味酸奶，12杯家庭装，口感浓稠。' },
  { id: 17, categoryId: 7, name: '三只松鼠坚果大礼包', price: 99.9, originalPrice: 149.9, image: 'https://via.placeholder.com/300x300/d7ccc8/795548?text=坚果', sales: 670, tags: ['礼盒', '混合'], desc: '三只松鼠坚果大礼包，8种坚果混合，节日送礼。' },
  { id: 18, categoryId: 4, name: '冷冻三文鱼 300g', price: 58.0, originalPrice: 78.0, image: 'https://via.placeholder.com/300x300/b2ebf2/00838f?text=三文鱼', sales: 410, tags: ['进口', '刺身'], desc: '挪威进口三文鱼，300g切片装，适合刺身或香煎。' },
  { id: 19, categoryId: 6, name: '百事可乐 330ml×24罐', price: 49.9, originalPrice: 62.9, image: 'https://via.placeholder.com/300x300/1565c0/ffffff?text=百事', sales: 2800, tags: ['整箱', '畅销'], desc: '百事可乐经典口味，330ml×24罐整箱装。' },
  { id: 20, categoryId: 6, name: '雪碧 330ml×24罐', price: 49.9, originalPrice: 62.9, image: 'https://via.placeholder.com/300x300/76ff03/ffffff?text=雪碧', sales: 2600, tags: ['整箱', '清爽'], desc: '雪碧柠檬味汽水，330ml×24罐整箱装。' },
  { id: 21, categoryId: 6, name: '大窑嘉宾 520ml×6瓶', price: 28.8, originalPrice: 36.8, image: 'https://via.placeholder.com/300x300/ff9800/ffffff?text=大窑', sales: 2100, tags: ['国产', '怀旧'], desc: '大窑嘉宾汽水，520ml×6瓶，经典北派汽水。' }
]

const banners = [
  { id: 1, imageUrl: 'https://via.placeholder.com/750x300/ff6b00/ffffff?text=限时特价', title: '限时特价活动', link: '' },
  { id: 2, imageUrl: 'https://via.placeholder.com/750x300/52c41a/ffffff?text=新品上市', title: '新鲜水果上市', link: '' },
  { id: 3, imageUrl: 'https://via.placeholder.com/750x300/1890ff/ffffff?text=满减优惠', title: '满199减50', link: '' }
]

const hotKeywords = ['苹果', '牛奶', '鸡蛋', '大米', '车厘子', '蔬菜', '零食', '抽纸']

async function main() {
  const count = await prisma.category.count()
  if (count > 0) {
    console.log('数据库已有数据，跳过 seed')
    return
  }

  for (const c of categories) {
    await prisma.category.create({ data: c })
  }

  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.id,
        categoryId: p.categoryId,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        image: p.image,
        sales: p.sales,
        tags: p.tags,
        desc: p.desc
      }
    })
  }

  for (const b of banners) {
    await prisma.banner.create({ data: b })
  }

  for (let i = 0; i < hotKeywords.length; i++) {
    await prisma.hotKeyword.create({ data: { keyword: hotKeywords[i], sort: i } })
  }

  await prisma.shopConfig.create({
    data: {
      id: 1,
      name: '商超旗舰店',
      latitude: 22.5431,
      longitude: 114.0579,
      deliveryRadiusKm: 5,
      servicePhone: '400-888-8888',
      showBannerSection: true,
      showCategorySection: true,
      showFlashSaleSection: true,
      showRecommendSection: true
    }
  })

  await prisma.promotion.create({
    data: {
      id: 1,
      title: '限时特价活动',
      imageUrl: 'https://via.placeholder.com/600x800/ff6b00/ffffff?text=618大促',
      content: '<p>618大促来袭！全场满199减50，新鲜水果低至5折。</p><p>活动时间：6月18日-6月30日</p>',
      startTime: '2025-06-01',
      endTime: '2025-12-31',
      enabled: true
    }
  })

  console.log('Seed 完成')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
