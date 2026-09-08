/**
 * 从 desc 回填 barcode 字段（批量 SQL，适合百万级数据）
 * 用法: node prisma/backfill-barcodes.js
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE Product
    SET barcode = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(\`desc\`, '条码：', -1), CHAR(10), 1))
    WHERE barcode = '' AND \`desc\` LIKE '条码：%'
  `
  console.log(`回填 barcode 完成，更新 ${result} 条`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
