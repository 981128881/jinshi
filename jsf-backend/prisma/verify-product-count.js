const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const prisma = new PrismaClient()
const out = 'G:/supermarket/AiBaoPOS/sync/verify_count.txt'

async function main() {
  const lines = []
  const productCount = await prisma.product.count()
  const categoryCount = await prisma.category.count()
  const posCategoryCount = await prisma.category.count({ where: { externalId: { not: null } } })
  const posProductCount = await prisma.product.count({ where: { externalId: { not: null } } })
  const sample = await prisma.product.findMany({ take: 5, orderBy: { id: 'desc' }, select: { id: true, name: true, price: true, barcode: true, externalId: true } })
  lines.push('productCount=' + productCount)
  lines.push('categoryCount=' + categoryCount)
  lines.push('posCategoryCount=' + posCategoryCount)
  lines.push('posProductCount=' + posProductCount)
  lines.push('sample=' + JSON.stringify(sample, null, 2))
  fs.writeFileSync(out, lines.join('\n'), 'utf8')
  console.log(lines.join('\n'))
}

main().finally(() => prisma.$disconnect())
