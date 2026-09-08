/**
 * 为 POS 同步添加 Category.externalId/sort、Product.externalId 字段
 * 用法: node prisma/patch-pos-sync.js
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column
  )
  return Number(rows[0]?.c || 0) > 0
}

async function indexExists(table, indexName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    table,
    indexName
  )
  return Number(rows[0]?.c || 0) > 0
}

async function main() {
  if (!(await columnExists('Category', 'externalId'))) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `Category` ADD COLUMN `externalId` VARCHAR(64) NULL'
    )
    console.log('Added Category.externalId')
  }
  if (!(await columnExists('Category', 'sort'))) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `Category` ADD COLUMN `sort` INT NOT NULL DEFAULT 0'
    )
    console.log('Added Category.sort')
  }
  if (!(await indexExists('Category', 'Category_externalId_key'))) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `Category` ADD UNIQUE INDEX `Category_externalId_key` (`externalId`)'
    )
    console.log('Added Category.externalId unique index')
  }
  if (!(await indexExists('Category', 'Category_sort_idx'))) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `Category` ADD INDEX `Category_sort_idx` (`sort`)'
    )
    console.log('Added Category.sort index')
  }

  if (!(await columnExists('Product', 'externalId'))) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `Product` ADD COLUMN `externalId` VARCHAR(64) NULL'
    )
    console.log('Added Product.externalId')
  }
  if (!(await indexExists('Product', 'Product_externalId_key'))) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `Product` ADD UNIQUE INDEX `Product_externalId_key` (`externalId`)'
    )
    console.log('Added Product.externalId unique index')
  }

  console.log('POS sync schema patch done')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
