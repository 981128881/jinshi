/**
 * 处理 tabBar 图标：去白边/浅灰底 → 40×40 内容区居中于 60×60（四周 10px 边距）→ ≤40KB
 * 运行: node scripts/optimize-tab-icons.mjs
 */
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '.deps/package.json'))
const sharp = require('sharp')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tabDir = path.resolve(__dirname, '../static/tab')
const MAX_KB = 40
const CANVAS = 60
const PADDING = 10
const INNER = CANVAS - PADDING * 2

/** 将浅色/浅灰背景像素变为透明，保留图标主体 */
async function removeLightBackground(input) {
	const { data, info } = await sharp(input)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	const { width, height, channels } = info

	for (let i = 0; i < data.length; i += channels) {
		const r = data[i]
		const g = data[i + 1]
		const b = data[i + 2]
		const lum = 0.299 * r + 0.587 * g + 0.114 * b
		const chroma = Math.max(r, g, b) - Math.min(r, g, b)

		// 浅色中性色（白、浅灰）→ 透明
		if (lum >= 155 && chroma < 45) {
			data[i + 3] = 0
		}
	}

	return sharp(data, { raw: { width, height, channels } }).png().toBuffer()
}

async function processIcon(filePath) {
	const name = path.basename(filePath)
	let quality = 90
	let buffer
	let source = filePath

	try {
		source = await sharp(filePath).trim({ threshold: 24 }).png().toBuffer()
	} catch {
		source = fs.readFileSync(filePath)
	}

	source = await removeLightBackground(source)

	const icon = await sharp(source)
		.resize(INNER, INNER, {
			fit: 'contain',
			position: 'centre',
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		})
		.png()
		.toBuffer()

	for (;;) {
		buffer = await sharp({
			create: {
				width: CANVAS,
				height: CANVAS,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0 }
			}
		})
			.composite([{ input: icon, gravity: 'centre' }])
			.png({
				compressionLevel: 9,
				palette: true,
				quality,
				effort: 10
			})
			.toBuffer()

		if (buffer.length <= MAX_KB * 1024 || quality <= 40) break
		quality -= 10
	}

	const tmp = `${filePath}.tmp`
	fs.writeFileSync(tmp, buffer)
	fs.renameSync(tmp, filePath)

	const kb = (buffer.length / 1024).toFixed(1)
	const ok = buffer.length <= MAX_KB * 1024 ? 'ok' : 'WARN'
	console.log(`${name.padEnd(22)} ${CANVAS}×${CANVAS}  ${kb.padStart(5)} KB  ${ok}`)
}

const files = fs
	.readdirSync(tabDir)
	.filter((f) => f.endsWith('.png'))
	.map((f) => path.join(tabDir, f))

for (const file of files) {
	await processIcon(file)
}

console.log(`Done (${CANVAS}×${CANVAS}px, ${PADDING}px padding, limit ${MAX_KB}KB)`)
