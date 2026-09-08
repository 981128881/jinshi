const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, barcode: true, categoryId: true, image: true }
  })
  const withBarcode = products.filter(p => p.barcode && p.barcode.length >= 8)
  const withImage = products.filter(p => p.image && p.image.length > 5)
  const lines = [
    'total=' + products.length,
    'withBarcode=' + withBarcode.length,
    'withImage=' + withImage.length,
    'noImage=' + (products.length - withImage.length),
    'sampleNoImage=' + products.filter(p => !p.image).slice(0, 10).map(p => p.name).join(' | ')
  ]
  fs.writeFileSync('G:/supermarket/AiBaoPOS/sync/barcode_stats.txt', lines.join('\n'), 'utf8')
  console.log(lines.join('\n'))
}

main().finally(() => prisma.$disconnect())
