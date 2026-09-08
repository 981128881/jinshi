/**
 * 将小程序 static/category 图标同步到服务器并写入数据库
 * 用法: node prisma/sync-category-icons.js
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE_DIR = path.resolve(__dirname, '../../wxapp-frontend/static/category')
const TARGET_DIR = path.resolve(__dirname, '../public/category')

const CATEGORY_ICONS = [
  { id: 1, file: 'fruit.jpg', iconBg: '#D8EEF8' },
  { id: 2, file: 'vegetable.jpg', iconBg: '#E8F5EC' },
  { id: 3, file: 'meat.jpg', iconBg: '#F5EDE4' },
  { id: 4, file: 'seafood.jpg', iconBg: '#E4F0F8' },
  { id: 5, file: 'dairy.jpg', iconBg: '#FFF8E8' },
  { id: 6, file: 'drink.jpg', iconBg: '#D8EEF8' },
  { id: 7, file: 'snack.jpg', iconBg: '#FFF5D8' },
  { id: 8, file: 'grain.jpg', iconBg: '#F5EDE4' },
  { id: 9, file: 'daily.jpg', iconBg: '#EDE8F5' },
  { id: 10, file: 'wine.jpg', iconBg: '#F5EDE4' }
]

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.warn('未找到小程序图标目录:', SOURCE_DIR)
  } else {
    fs.mkdirSync(TARGET_DIR, { recursive: true })
    for (const file of fs.readdirSync(SOURCE_DIR)) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(file)) continue
      fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(TARGET_DIR, file))
      console.log('copied', file)
    }
  }

  for (const item of CATEGORY_ICONS) {
    const iconImage = `/static/category/${item.file}`
    try {
      await prisma.category.update({
        where: { id: item.id },
        data: { iconImage, iconBg: item.iconBg }
      })
      console.log('updated category', item.id, iconImage)
    } catch (e) {
      if (e.code !== 'P2025') throw e
    }
  }

  console.log('sync-category-icons 完成')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
