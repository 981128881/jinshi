/**
 * Set all products on-shelf: visible=true, stock=999
 * Usage: npm run db:patch-on-shelf
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.product.updateMany({
    data: {
      visible: true,
      stock: 999,
    },
  })
  console.log(`Updated products: ${result.count}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())