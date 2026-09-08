/**
 * 锦食坊初始化种子：平台配置 + 示例品类
 * 用法：
 *   node prisma/seed-jinshifang.js
 *   node prisma/seed-merchants.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
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

  const cuisines = ['中餐', '火锅', '烧烤', '小吃快餐', '西餐', '甜品饮品']
  for (let i = 0; i < cuisines.length; i++) {
    const name = cuisines[i]
    const exists = await prisma.cuisineType.findFirst({ where: { name } })
    if (!exists) {
      await prisma.cuisineType.create({
        data: { name, sort: i, visible: true }
      })
    }
  }

  console.log('seed ok: platform + cuisine types')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
