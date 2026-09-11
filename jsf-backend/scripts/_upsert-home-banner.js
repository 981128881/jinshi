const { PrismaClient } = require('@prisma/client')
const { invalidateBanners } = require('../src/services/shop')

const prisma = new PrismaClient()
const IMAGE = '/static/uploads/banners/jsf-home.jpg'

async function main() {
  const existing = await prisma.banner.findFirst({
    where: { OR: [{ imageUrl: IMAGE }, { title: '金石菜牌' }] }
  })
  const data = {
    imageUrl: IMAGE,
    title: '金石菜牌',
    link: '',
    sort: 0,
    enabled: true
  }
  const row = existing
    ? await prisma.banner.update({ where: { id: existing.id }, data })
    : await prisma.banner.create({ data })
  await prisma.banner.updateMany({
    where: { id: { not: row.id } },
    data: { enabled: false }
  })
  await invalidateBanners()
  console.log(JSON.stringify({ id: row.id, imageUrl: row.imageUrl, enabled: row.enabled }))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
