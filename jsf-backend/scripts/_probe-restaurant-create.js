const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

;(async () => {
  try {
    const r = await p.restaurant.create({
      data: {
        name: 'probe',
        phone: '1',
        address: '',
        latitude: 0,
        longitude: 0,
        coverImage: '',
        logo: '',
        status: 'approved',
        open: true,
        code: 'MTEST00X'
      }
    })
    console.log('ok without description', r.id)
  } catch (e) {
    console.error('without description:', e.message)
  }

  try {
    const r = await p.restaurant.create({
      data: {
        name: 'probe2',
        phone: '1',
        address: '',
        latitude: 0,
        longitude: 0,
        coverImage: '',
        logo: '',
        status: 'approved',
        open: true,
        code: 'MTEST00Y',
        description: ''
      }
    })
    console.log('ok with description', r.id)
    await p.restaurant.delete({ where: { id: r.id } })
  } catch (e) {
    console.error('with description:', e.message)
  }

  await p.$disconnect()
})()
