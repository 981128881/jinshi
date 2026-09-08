/**
 * 模拟已入驻商户（含分类、菜品、店铺/菜品图标）
 * 用法：cd wxapp-backend && node prisma/seed-merchants.js
 *
 * 可重复执行：已存在的餐厅会更新封面/Logo，并同步分类与菜品（按名称 upsert）
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const img = {
  shop: (n) => `/static/shop/shop-${n}.svg`,
  dish: (n) => `/static/dish/d${String(n).padStart(2, '0')}.svg`
}

const MERCHANTS = [
  {
    name: '蜀香火锅',
    cuisine: '火锅',
    phone: '13800001001',
    address: '深圳市南山区科技园南路88号',
    latitude: 22.5405,
    longitude: 113.9532,
    description: '正宗川味火锅，麻辣鲜香，可预约到店用餐。',
    openid: 'demo_owner_huoguo',
    monthlySales: 3260,
    logo: img.shop(1),
    coverImage: img.shop(1),
    categories: [
      {
        name: '老板推荐',
        dishes: [
          { name: '双人欢喜锅套餐', price: 128, desc: '鸳鸯锅底+四荤三素', image: img.dish(1) },
          { name: '招牌肥牛拼盘', price: 88, desc: '雪花肥牛+吊龙', image: img.dish(2) }
        ]
      },
      {
        name: '锅底',
        dishes: [
          { name: '红油鸳鸯锅', price: 68, desc: '经典红油+清汤', image: img.dish(1) },
          { name: '番茄锅', price: 58, desc: '酸甜开胃', image: img.dish(1) },
          { name: '菌汤锅', price: 62, desc: '山珍菌菇慢炖', image: img.dish(5) }
        ]
      },
      {
        name: '肉类',
        dishes: [
          { name: '鲜切牛肉', price: 48, desc: '当日鲜切', image: img.dish(2) },
          { name: '手打牛肉丸', price: 36, desc: 'Q弹多汁', image: img.dish(2) },
          { name: '毛肚', price: 42, desc: '七上八下', image: img.dish(2) },
          { name: '脆皮肠', price: 28, desc: '火锅必点', image: img.dish(2) }
        ]
      },
      {
        name: '素菜',
        dishes: [
          { name: '土豆片', price: 12, desc: '软糯入味', image: img.dish(3) },
          { name: '娃娃菜', price: 14, desc: '清甜爽口', image: img.dish(3) },
          { name: '金针菇', price: 12, desc: '', image: img.dish(3) },
          { name: '藕片', price: 14, desc: '清脆', image: img.dish(3) }
        ]
      },
      {
        name: '小吃饮品',
        dishes: [
          { name: '冰粉', price: 10, desc: '解辣清凉', image: img.dish(8) },
          { name: '酸梅汤', price: 12, desc: '自熬', image: img.dish(12) }
        ]
      }
    ]
  },
  {
    name: '老香小馆',
    cuisine: '中餐',
    phone: '13800001002',
    address: '深圳市福田区华强北路168号',
    latitude: 22.5458,
    longitude: 114.0856,
    description: '家常粤菜，清淡鲜美，适合家庭聚餐预约。',
    openid: 'demo_owner_yuecai',
    monthlySales: 2180,
    logo: img.shop(2),
    coverImage: img.shop(2),
    categories: [
      {
        name: '进店福利',
        dishes: [
          { name: '例牌白粥', price: 6, desc: '到店即享', image: img.dish(6) },
          { name: '花生米小碟', price: 8, desc: '', image: img.dish(9) }
        ]
      },
      {
        name: '热菜',
        dishes: [
          { name: '白切鸡', price: 48, desc: '皮爽肉嫩', image: img.dish(4) },
          { name: '清蒸鲈鱼', price: 68, desc: '时令鲜鱼', image: img.dish(4) },
          { name: '蒜蓉西兰花', price: 28, desc: '清淡健康', image: img.dish(3) },
          { name: '蚝油生菜', price: 18, desc: '', image: img.dish(3) }
        ]
      },
      {
        name: '汤羹',
        dishes: [
          { name: '老式老火汤', price: 38, desc: '每日例汤', image: img.dish(5) },
          { name: '玉米排骨汤', price: 32, desc: '家常暖胃', image: img.dish(5) },
          { name: '西湖牛肉羹', price: 26, desc: '', image: img.dish(5) }
        ]
      },
      {
        name: '主食',
        dishes: [
          { name: '扬州炒饭', price: 22, desc: '粒粒分明', image: img.dish(6) },
          { name: '虾饺皇（4只）', price: 26, desc: '晶莹剔透', image: img.dish(6) },
          { name: '肠粉', price: 16, desc: '酱香', image: img.dish(6) }
        ]
      }
    ]
  },
  {
    name: '炭火烧烤铺',
    cuisine: '烧烤',
    phone: '13800001003',
    address: '深圳市宝安区新安大道99号',
    latitude: 22.5551,
    longitude: 113.8834,
    description: '炭火烧烤，夜宵首选，到店现烤。',
    openid: 'demo_owner_shaokao',
    monthlySales: 4520,
    logo: img.shop(3),
    coverImage: img.shop(3),
    categories: [
      {
        name: '招牌烧烤',
        dishes: [
          { name: '羊肉串（5串）', price: 25, desc: '外焦里嫩', image: img.dish(7) },
          { name: '烤翅中（4个）', price: 28, desc: '蜜汁微辣', image: img.dish(7) },
          { name: '烤茄子', price: 18, desc: '蒜香', image: img.dish(7) },
          { name: '烤生蚝（3只）', price: 36, desc: '蒜蓉粉丝', image: img.dish(7) }
        ]
      },
      {
        name: '经典小份',
        dishes: [
          { name: '烤韭菜', price: 10, desc: '', image: img.dish(3) },
          { name: '烤玉米', price: 12, desc: '', image: img.dish(9) },
          { name: '烤馒头片', price: 8, desc: '', image: img.dish(6) }
        ]
      },
      {
        name: '小食',
        dishes: [
          { name: '花生米', price: 8, desc: '', image: img.dish(9) },
          { name: '凉拌黄瓜', price: 12, desc: '蒜泥', image: img.dish(3) },
          { name: '拍蒜茄子', price: 14, desc: '', image: img.dish(3) }
        ]
      },
      {
        name: '饮品',
        dishes: [
          { name: '冰镇酸梅汤', price: 12, desc: '', image: img.dish(12) },
          { name: '鲜榨柠檬水', price: 15, desc: '', image: img.dish(12) },
          { name: '罐装啤酒', price: 8, desc: '到店自取', image: img.dish(12) }
        ]
      }
    ]
  },
  {
    name: '街角小吃王',
    cuisine: '小吃快餐',
    phone: '13800001004',
    address: '深圳市龙岗区中心城步行街12号',
    latitude: 22.7202,
    longitude: 114.2476,
    description: '快手小吃，出餐快，适合匆忙预约取餐。',
    openid: 'demo_owner_xiaochi',
    monthlySales: 5890,
    logo: img.shop(4),
    coverImage: img.shop(4),
    categories: [
      {
        name: '超值套餐',
        dishes: [
          { name: '黄焖鸡+可乐套餐', price: 26, desc: '含米饭', image: img.dish(4) },
          { name: '拉面+炸鸡套餐', price: 28, desc: '', image: img.dish(10) }
        ]
      },
      {
        name: '主食',
        dishes: [
          { name: '黄焖鸡米饭', price: 22, desc: '大份', image: img.dish(4) },
          { name: '牛肉拉面', price: 18, desc: '劲道', image: img.dish(10) },
          { name: '煎饼果子', price: 12, desc: '香脆', image: img.dish(9) },
          { name: '肉夹馍', price: 14, desc: '', image: img.dish(6) }
        ]
      },
      {
        name: '炸物',
        dishes: [
          { name: '炸鸡腿', price: 10, desc: '外酥里嫩', image: img.dish(9) },
          { name: '薯条', price: 8, desc: '', image: img.dish(9) },
          { name: '鸡米花', price: 12, desc: '', image: img.dish(9) }
        ]
      },
      {
        name: '饮品',
        dishes: [
          { name: '冰可乐', price: 5, desc: '', image: img.dish(12) },
          { name: '豆浆', price: 4, desc: '热/冰', image: img.dish(12) }
        ]
      }
    ]
  },
  {
    name: '意式轻食屋',
    cuisine: '西餐',
    phone: '13800001005',
    address: '深圳市南山区海岸城B座2楼',
    latitude: 22.5176,
    longitude: 113.9352,
    description: '意面披萨轻食，环境安静，可预约座位。',
    openid: 'demo_owner_xican',
    monthlySales: 1640,
    logo: img.shop(5),
    coverImage: img.shop(5),
    categories: [
      {
        name: '厨师推荐',
        dishes: [
          { name: '黑松露意面', price: 58, desc: '季节限定', image: img.dish(10) },
          { name: '海鲜披萨', price: 68, desc: '9寸', image: img.dish(11) }
        ]
      },
      {
        name: '意面',
        dishes: [
          { name: '番茄肉酱意面', price: 38, desc: '经典', image: img.dish(10) },
          { name: '奶油培根意面', price: 42, desc: '浓郁', image: img.dish(10) },
          { name: '青酱虾仁意面', price: 46, desc: '', image: img.dish(10) }
        ]
      },
      {
        name: '披萨',
        dishes: [
          { name: '玛格丽特披萨', price: 48, desc: '9寸', image: img.dish(11) },
          { name: '超级至尊披萨', price: 58, desc: '9寸', image: img.dish(11) },
          { name: '夏威夷披萨', price: 52, desc: '9寸', image: img.dish(11) }
        ]
      },
      {
        name: '沙拉',
        dishes: [
          { name: '凯撒沙拉', price: 32, desc: '', image: img.dish(3) },
          { name: '牛油果沙拉', price: 36, desc: '', image: img.dish(3) }
        ]
      },
      {
        name: '饮品',
        dishes: [
          { name: '美式咖啡', price: 18, desc: '', image: img.dish(12) },
          { name: '气泡水', price: 12, desc: '', image: img.dish(12) }
        ]
      }
    ]
  },
  {
    name: '蜜语甜品站',
    cuisine: '甜品饮品',
    phone: '13800001006',
    address: '深圳市罗湖区东门步行街56号',
    latitude: 22.5463,
    longitude: 114.1185,
    description: '手工甜品与现制饮品，下午茶预约到店。',
    openid: 'demo_owner_tianpin',
    monthlySales: 2730,
    logo: img.shop(6),
    coverImage: img.shop(6),
    categories: [
      {
        name: '人气甜品',
        dishes: [
          { name: '提拉米苏', price: 28, desc: '意式经典', image: img.dish(8) },
          { name: '芒果班戟', price: 22, desc: '新鲜芒果', image: img.dish(8) },
          { name: '杨枝甘露', price: 18, desc: '清爽', image: img.dish(8) },
          { name: '芋圆烧仙草', price: 16, desc: '', image: img.dish(8) }
        ]
      },
      {
        name: '蛋糕小食',
        dishes: [
          { name: '芝士蛋糕', price: 26, desc: '切片', image: img.dish(8) },
          { name: '布朗尼', price: 18, desc: '巧克力', image: img.dish(8) },
          { name: '马卡龙（3枚）', price: 24, desc: '', image: img.dish(8) }
        ]
      },
      {
        name: '饮品',
        dishes: [
          { name: '美式咖啡', price: 16, desc: '', image: img.dish(12) },
          { name: '芋泥奶茶', price: 18, desc: '少糖', image: img.dish(12) },
          { name: '柠檬气泡水', price: 14, desc: '', image: img.dish(12) },
          { name: '草莓牛奶', price: 16, desc: '', image: img.dish(12) }
        ]
      }
    ]
  }
]

async function ensurePlatformAndCuisines() {
  await prisma.platformConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: '锦食坊',
      servicePhone: '400-888-8888',
      showBannerSection: true,
      showCategorySection: true,
      showRecommendSection: true
    },
    update: { name: '锦食坊' }
  })

  const names = ['中餐', '火锅', '烧烤', '小吃快餐', '西餐', '甜品饮品']
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const exists = await prisma.cuisineType.findFirst({ where: { name } })
    if (!exists) {
      await prisma.cuisineType.create({ data: { name, sort: i, visible: true } })
    }
  }
}

async function syncMenu(restaurantId, categories) {
  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci]
    let category = await prisma.menuCategory.findFirst({
      where: { restaurantId, name: cat.name }
    })
    if (category) {
      category = await prisma.menuCategory.update({
        where: { id: category.id },
        data: { sort: ci, visible: true }
      })
    } else {
      category = await prisma.menuCategory.create({
        data: {
          restaurantId,
          name: cat.name,
          sort: ci,
          visible: true
        }
      })
    }

    for (let di = 0; di < cat.dishes.length; di++) {
      const d = cat.dishes[di]
      const existed = await prisma.dish.findFirst({
        where: { restaurantId, name: d.name }
      })
      if (existed) {
        await prisma.dish.update({
          where: { id: existed.id },
          data: {
            categoryId: category.id,
            price: d.price,
            desc: d.desc || '',
            image: d.image || '',
            visible: true,
            sort: di
          }
        })
      } else {
        await prisma.dish.create({
          data: {
            restaurantId,
            categoryId: category.id,
            name: d.name,
            price: d.price,
            desc: d.desc || '',
            image: d.image || '',
            visible: true,
            sort: di
          }
        })
      }
    }
  }
}

async function seedOne(m) {
  const cuisine = await prisma.cuisineType.findFirst({ where: { name: m.cuisine } })
  if (!cuisine) throw new Error(`缺少品类: ${m.cuisine}`)

  let restaurant = await prisma.restaurant.findFirst({ where: { name: m.name } })

  if (restaurant) {
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        monthlySales: m.monthlySales || 0,
        coverImage: m.coverImage || '',
        logo: m.logo || m.coverImage || '',
        description: m.description,
        address: m.address,
        latitude: m.latitude,
        longitude: m.longitude,
        phone: m.phone,
        open: true,
        status: 'approved'
      }
    })
    await syncMenu(restaurant.id, m.categories)
    const dishCount = await prisma.dish.count({ where: { restaurantId: restaurant.id } })
    const catCount = await prisma.menuCategory.count({ where: { restaurantId: restaurant.id } })
    console.log(`update: ${m.name} (id=${restaurant.id}, cats=${catCount}, dishes=${dishCount})`)
    return restaurant
  }

  const user = await prisma.user.upsert({
    where: { openid: m.openid },
    create: {
      openid: m.openid,
      nickname: `${m.name}店主`,
      phone: m.phone
    },
    update: {
      nickname: `${m.name}店主`,
      phone: m.phone
    }
  })

  restaurant = await prisma.restaurant.create({
    data: {
      name: m.name,
      cuisineTypeId: cuisine.id,
      phone: m.phone,
      address: m.address,
      latitude: m.latitude,
      longitude: m.longitude,
      description: m.description,
      monthlySales: m.monthlySales || 0,
      status: 'approved',
      open: true,
      logo: m.logo || m.coverImage || '',
      coverImage: m.coverImage || ''
    }
  })

  await prisma.restaurantMember.create({
    data: {
      restaurantId: restaurant.id,
      userId: user.id,
      role: 'owner'
    }
  })

  await prisma.onboardingApplication.create({
    data: {
      userId: user.id,
      restaurantId: restaurant.id,
      status: 'approved',
      contactName: `${m.name}店主`,
      contactPhone: m.phone,
      legalPerson: `${m.name}店主`,
      licenseNo: `DEMO${String(restaurant.id).padStart(6, '0')}`,
      restaurantName: m.name,
      cuisineTypeId: cuisine.id,
      address: m.address,
      latitude: m.latitude,
      longitude: m.longitude,
      submittedAt: new Date(),
      auditedAt: new Date()
    }
  })

  await syncMenu(restaurant.id, m.categories)
  console.log(`ok: ${m.name} (id=${restaurant.id}, menu seeded)`)
  return restaurant
}

async function main() {
  await ensurePlatformAndCuisines()
  for (const m of MERCHANTS) {
    await seedOne(m)
  }
  const count = await prisma.restaurant.count({ where: { status: 'approved' } })
  const dishes = await prisma.dish.count()
  const cats = await prisma.menuCategory.count()
  console.log(`done. restaurants=${count}, categories=${cats}, dishes=${dishes}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
