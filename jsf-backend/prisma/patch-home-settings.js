/**
 * 为已有数据库补充分类图标与首页展示开关（schema 已 db push 后执行）
 * 用法: node prisma/patch-home-settings.js
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const CATEGORY_ICONS = [
  { id: 1, iconImage: '/static/category/fruit.jpg', iconBg: '#D8EEF8' },
  { id: 2, iconImage: '/static/category/vegetable.jpg', iconBg: '#E8F5EC' },
  { id: 3, iconImage: '/static/category/meat.jpg', iconBg: '#F5EDE4' },
  { id: 4, iconImage: '/static/category/seafood.jpg', iconBg: '#E4F0F8' },
  { id: 5, iconImage: '/static/category/dairy.jpg', iconBg: '#FFF8E8' },
  { id: 6, iconImage: '/static/category/drink.jpg', iconBg: '#D8EEF8' },
  { id: 7, iconImage: '/static/category/snack.jpg', iconBg: '#FFF5D8' },
  { id: 8, iconImage: '/static/category/grain.jpg', iconBg: '#F5EDE4' },
  { id: 9, iconImage: '/static/category/daily.jpg', iconBg: '#EDE8F5' },
  { id: 10, iconImage: '/static/category/wine.jpg', iconBg: '#F5EDE4' }
]

async function main() {
  for (const item of CATEGORY_ICONS) {
    try {
      await prisma.category.update({
        where: { id: item.id },
        data: { iconImage: item.iconImage, iconBg: item.iconBg }
      })
    } catch (e) {
      if (e.code !== 'P2025') throw e
    }
  }

  const config = await prisma.shopConfig.findUnique({ where: { id: 1 } })
  if (config) {
    await prisma.shopConfig.update({
      where: { id: 1 },
      data: {
        showBannerSection: config.showBannerSection ?? true,
        showCategorySection: config.showCategorySection ?? true,
        showFlashSaleSection: config.showFlashSaleSection ?? true,
        showRecommendSection: config.showRecommendSection ?? true
      }
    })
  }

  console.log('patch-home-settings 完成')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
