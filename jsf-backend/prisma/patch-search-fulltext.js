/**
 * 为商品名创建 MySQL ngram 全文索引（中文搜索必需）
 * 运行: node prisma/patch-search-fulltext.js
 */
require('dotenv').config()
const prisma = require('../src/db/prisma')

async function indexExists(name) {
  const rows = await prisma.$queryRaw`
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Product'
      AND INDEX_NAME = ${name}
    LIMIT 1
  `
  return Array.isArray(rows) && rows.length > 0
}

async function main() {
  const ftName = 'product_name_fulltext'
  const prefixIdx = 'Product_name_prefix_idx'

  if (!(await indexExists(prefixIdx))) {
    console.log('创建 name 前缀索引...')
    await prisma.$executeRawUnsafe(
      'CREATE INDEX `Product_name_prefix_idx` ON `Product` (`name`(32))'
    )
    console.log('  ✓ Product_name_prefix_idx')
  } else {
    console.log('  · Product_name_prefix_idx 已存在')
  }

  if (!(await indexExists(ftName))) {
    console.log('创建 name 全文索引 (ngram)...')
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`Product\` ADD FULLTEXT INDEX \`${ftName}\` (\`name\`) WITH PARSER ngram`
    )
    console.log('  ✓ product_name_fulltext')
  } else {
    console.log('  · product_name_fulltext 已存在')
  }

  console.log('\n完成。请重启后端服务后重试搜索。')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
