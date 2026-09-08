const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

/** 小程序详情页宽 750rpx，2x 屏约 1500px，留少量余量 */
const PRODUCT_MAX_EDGE = 1200
const JPEG_QUALITY = 85
const WEBP_QUALITY = 85

/**
 * 压缩商品主图：限制尺寸、优化编码，尽量减小体积且保持观感
 * @param {string} filePath 已落盘的图片绝对路径
 * @returns {Promise<{ filePath: string, filename: string, compressed: boolean, beforeSize?: number, afterSize?: number }>}
 */
async function compressProductImage(filePath) {
  const filename = path.basename(filePath)
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.gif') {
    return { filePath, filename, compressed: false }
  }

  let meta
  try {
    meta = await sharp(filePath, { failOn: 'none' }).metadata()
  } catch {
    return { filePath, filename, compressed: false }
  }

  if (!meta.width || !meta.height) {
    return { filePath, filename, compressed: false }
  }

  const beforeSize = fs.statSync(filePath).size
  const tmpPath = `${filePath}.${process.pid}.tmp`

  let pipeline = sharp(filePath, { failOn: 'none' })
    .rotate()
    .resize(PRODUCT_MAX_EDGE, PRODUCT_MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true
    })

  let outPath = filePath

  try {
    if (ext === '.png') {
      if (!meta.hasAlpha) {
        outPath = filePath.replace(/\.png$/i, '.jpg')
        await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmpPath)
      } else {
        await pipeline.png({ compressionLevel: 9, effort: 10 }).toFile(tmpPath)
      }
    } else if (ext === '.webp') {
      await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toFile(tmpPath)
    } else if (ext === '.jpg' || ext === '.jpeg') {
      await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmpPath)
    } else {
      outPath = filePath.replace(/\.[^.]+$/i, '.jpg')
      await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmpPath)
    }

    const afterSize = fs.statSync(tmpPath).size

    if (outPath !== filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    fs.renameSync(tmpPath, outPath)

    return {
      filePath: outPath,
      filename: path.basename(outPath),
      compressed: true,
      beforeSize,
      afterSize
    }
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
    console.warn('[imageCompress] 压缩失败，保留原图:', err.message)
    return { filePath, filename, compressed: false }
  }
}

module.exports = { compressProductImage, PRODUCT_MAX_EDGE, JPEG_QUALITY }
