/**
 * 处理订单状态图标：去白底/水印 → 56×56 内容居中于 72×72
 * 运行: node scripts/optimize-order-icons.mjs
 */
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '.deps/package.json'))
const sharp = require('sharp')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconDir = path.resolve(__dirname, '../static/icons/order')
const MAX_KB = 80
const CANVAS = 72
const PADDING = 8
const INNER = CANVAS - PADDING * 2

const RAW_MAP = {
	'unpaid-raw.png': 'unpaid.png',
	'unshipped-raw.png': 'unshipped.png',
	'unreceived-raw.png': 'unreceived.png',
	'completed-raw.png': 'completed.png'
}

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

		if (lum >= 155 && chroma < 45) {
			data[i + 3] = 0
		}
	}

	return sharp(data, { raw: { width, height, channels } }).png().toBuffer()
}

async function processIcon(rawName, outName) {
	const filePath = path.join(iconDir, rawName)
	const outPath = path.join(iconDir, outName)
	let quality = 90
	let buffer
	let source = fs.readFileSync(filePath)

	const meta = await sharp(source).metadata()
	const cropH = Math.floor(meta.height * 0.92)
	source = await sharp(source)
		.extract({ left: 0, top: 0, width: meta.width, height: cropH })
		.png()
		.toBuffer()

	try {
		source = await sharp(source).trim({ threshold: 24 }).png().toBuffer()
	} catch {
		// keep trimmed source
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

	fs.writeFileSync(outPath, buffer)

	const kb = (buffer.length / 1024).toFixed(1)
	const ok = buffer.length <= MAX_KB * 1024 ? 'ok' : 'WARN'
	console.log(`${outName.padEnd(16)} ${CANVAS}×${CANVAS}  ${kb.padStart(6)} KB  ${ok}`)
}

for (const [raw, out] of Object.entries(RAW_MAP)) {
	await processIcon(raw, out)
}

console.log(`Done (${CANVAS}×${CANVAS}px, limit ${MAX_KB}KB)`)
