const fs = require('fs')

function looksLikeImage(buf) {
  if (!buf || buf.length < 12) return false
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true
  return false
}

function assertImageFile(filePath) {
  const fd = fs.openSync(filePath, 'r')
  const buf = Buffer.alloc(16)
  fs.readSync(fd, buf, 0, 16, 0)
  fs.closeSync(fd)
  if (!looksLikeImage(buf)) {
    try {
      fs.unlinkSync(filePath)
    } catch {
      /* ignore */
    }
    const err = new Error('仅支持 jpg/png/webp/gif 图片')
    err.statusCode = 400
    throw err
  }
}

module.exports = { looksLikeImage, assertImageFile }

if (require.main === module) {
  const assert = require('assert')
  assert.equal(looksLikeImage(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0])), true)
  assert.equal(looksLikeImage(Buffer.from('hello world!!')), false)
  console.log('ok')
}
