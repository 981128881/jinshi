/** Quick stats: products with/without image, ImagePath in export */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const POS_IMG = 'G:/supermarket/AiBaoPOS/ABPOSYun/Img/ItemImage'
const EXPORT = 'G:/supermarket/AiBaoPOS/export/POS_Item.json'

async function main() {
  const lines = []
  const total = await prisma.product.count()
  const noImg = await prisma.product.count({ where: { image: '' } })
  const withImg = total - noImg
  lines.push(`backend total=${total} withImage=${withImg} noImage=${noImg}`)

  let posImgFiles = 0
  if (fs.existsSync(POS_IMG)) {
    posImgFiles = fs.readdirSync(POS_IMG).filter(f => !f.startsWith('NoPicture')).length
    lines.push(`POS ItemImage files (excl placeholder)=${posImgFiles}`)
  }

  if (fs.existsSync(EXPORT)) {
    const items = JSON.parse(fs.readFileSync(EXPORT, 'utf8'))
    const withPath = items.filter(i => i.ImagePath && i.ImagePath.trim()).length
    const withName = items.filter(i => i.ImageName && i.ImageName.trim()).length
    lines.push(`export POS_Item: total=${items.length} ImagePath=${withPath} ImageName=${withName}`)
  }

  const out = 'G:/supermarket/AiBaoPOS/sync/image_coverage.txt'
  fs.writeFileSync(out, lines.join('\n'), 'utf8')
  console.log(lines.join('\n'))
}

main().finally(() => prisma.$disconnect())
