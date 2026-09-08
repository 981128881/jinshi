const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const multer = require('multer')

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function getUploadDir(type) {
  let folder = 'category'
  if (type === 'product') folder = 'products'
  else if (type === 'avatar') folder = path.join('uploads', 'avatars')
  else if (type === 'banner') folder = path.join('uploads', 'banners')
  const dir = path.join(__dirname, '../../public', folder)
  ensureDir(dir)
  return dir
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const t = req.body?.type
    const type = t === 'product' ? 'product' : t === 'avatar' ? 'avatar' : t === 'banner' ? 'banner' : 'category'
    cb(null, getUploadDir(type))
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg'
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (/^image\//i.test(file.mimetype)) cb(null, true)
    else cb(new Error('仅支持图片文件'))
  }
})

module.exports = upload
