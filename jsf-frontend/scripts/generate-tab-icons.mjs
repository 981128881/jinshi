import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../static/tab')
fs.mkdirSync(outDir, { recursive: true })

const SIZE = 81
const INACTIVE = '#333333'
const ACTIVE = '#22D3EE'

function hexToRgb(hex) {
	const n = parseInt(hex.slice(1), 16)
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function createCanvas() {
	return Array.from({ length: SIZE * SIZE * 4 }, () => 0)
}

function setPixel(data, x, y, r, g, b, a = 255) {
	if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
	const i = (y * SIZE + x) * 4
	data[i] = r
	data[i + 1] = g
	data[i + 2] = b
	data[i + 3] = a
}

function strokeLine(data, x0, y0, x1, y1, color, width = 3) {
	const [r, g, b] = hexToRgb(color)
	const dx = Math.abs(x1 - x0)
	const dy = Math.abs(y1 - y0)
	const steps = Math.max(dx, dy, 1)
	for (let i = 0; i <= steps; i++) {
		const x = Math.round(x0 + ((x1 - x0) * i) / steps)
		const y = Math.round(y0 + ((y1 - y0) * i) / steps)
		for (let ox = -width; ox <= width; ox++) {
			for (let oy = -width; oy <= width; oy++) {
				if (ox * ox + oy * oy <= width * width) {
					setPixel(data, x + ox, y + oy, r, g, b)
				}
			}
		}
	}
}

function drawCircle(data, cx, cy, radius, color, width = 3) {
	const [r, g, b] = hexToRgb(color)
	for (let a = 0; a < 360; a++) {
		const rad = (a * Math.PI) / 180
		const x = Math.round(cx + Math.cos(rad) * radius)
		const y = Math.round(cy + Math.sin(rad) * radius)
		for (let ox = -width; ox <= width; ox++) {
			for (let oy = -width; oy <= width; oy++) {
				if (ox * ox + oy * oy <= width * width) {
					setPixel(data, x + ox, y + oy, r, g, b)
				}
			}
		}
	}
}

function fillCircle(data, cx, cy, radius, color) {
	const [r, g, b] = hexToRgb(color)
	for (let y = cy - radius; y <= cy + radius; y++) {
		for (let x = cx - radius; x <= cx + radius; x++) {
			if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) {
				setPixel(data, x, y, r, g, b)
			}
		}
	}
}

/** 首页：房子线框 + 底部短横线 */
function drawHome(data, color) {
	strokeLine(data, 40, 16, 16, 38, color, 3)
	strokeLine(data, 40, 16, 64, 38, color, 3)
	strokeLine(data, 22, 38, 22, 64, color, 3)
	strokeLine(data, 58, 38, 58, 64, color, 3)
	strokeLine(data, 22, 64, 58, 64, color, 3)
	strokeLine(data, 34, 64, 34, 50, color, 3)
	strokeLine(data, 46, 64, 46, 50, color, 3)
	strokeLine(data, 36, 56, 44, 56, color, 3)
}

/** 分类未选中：四个空心圆 */
function drawCategory(data, color) {
	const pts = [[28, 28], [52, 28], [28, 52], [52, 52]]
	pts.forEach(([x, y]) => drawCircle(data, x, y, 10, color, 3))
}

/** 分类选中：三个实心圆 + 右下空心圆 */
function drawCategoryActive(data, color) {
	fillCircle(data, 28, 28, 10, color)
	fillCircle(data, 52, 28, 10, color)
	fillCircle(data, 28, 52, 10, color)
	drawCircle(data, 52, 52, 10, color, 3)
}

/** 购物车：车体 + 车轮 */
function drawCart(data, color) {
	strokeLine(data, 18, 22, 22, 14, color, 3)
	strokeLine(data, 22, 14, 38, 14, color, 3)
	strokeLine(data, 38, 14, 42, 22, color, 3)
	strokeLine(data, 18, 22, 58, 22, color, 3)
	strokeLine(data, 58, 22, 54, 46, color, 3)
	strokeLine(data, 54, 46, 22, 46, color, 3)
	strokeLine(data, 22, 46, 18, 22, color, 3)
	drawCircle(data, 28, 54, 4, color, 2)
	drawCircle(data, 46, 54, 4, color, 2)
}

/** 购物车选中：实心车体 */
function drawCartActive(data, color) {
	strokeLine(data, 18, 22, 22, 14, color, 3)
	strokeLine(data, 22, 14, 38, 14, color, 3)
	strokeLine(data, 38, 14, 42, 22, color, 3)
	strokeLine(data, 18, 22, 58, 22, color, 3)
	strokeLine(data, 58, 22, 54, 46, color, 3)
	strokeLine(data, 54, 46, 22, 46, color, 3)
	strokeLine(data, 22, 46, 18, 22, color, 3)
	fillCircle(data, 28, 54, 4, color)
	fillCircle(data, 46, 54, 4, color)
}

/** 我的：头像线框 */
function drawMine(data, color) {
	drawCircle(data, 40, 28, 12, color, 3)
	strokeLine(data, 20, 68, 60, 68, color, 3)
	strokeLine(data, 24, 68, 22, 46, color, 3)
	strokeLine(data, 56, 68, 58, 46, color, 3)
	strokeLine(data, 22, 46, 58, 46, color, 3)
}

const icons = [
	['home', drawHome],
	['category', drawCategory, drawCategoryActive],
	['cart', drawCart, drawCartActive],
	['mine', drawMine]
]

function crc32(buf) {
	let crc = 0xffffffff
	for (let i = 0; i < buf.length; i++) {
		crc ^= buf[i]
		for (let j = 0; j < 8; j++) {
			crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
		}
	}
	return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
	const len = Buffer.alloc(4)
	len.writeUInt32BE(data.length, 0)
	const typeBuf = Buffer.from(type)
	const crcBuf = Buffer.alloc(4)
	crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
	return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(rgba) {
	const stride = SIZE * 4
	const raw = Buffer.alloc((stride + 1) * SIZE)
	for (let y = 0; y < SIZE; y++) {
		raw[y * (stride + 1)] = 0
		Buffer.from(rgba.slice(y * stride, (y + 1) * stride)).copy(raw, y * (stride + 1) + 1)
	}
	const compressed = zlib.deflateSync(raw)
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
	const ihdr = Buffer.alloc(13)
	ihdr.writeUInt32BE(SIZE, 0)
	ihdr.writeUInt32BE(SIZE, 4)
	ihdr[8] = 8
	ihdr[9] = 6
	return Buffer.concat([
		signature,
		chunk('IHDR', ihdr),
		chunk('IDAT', compressed),
		chunk('IEND', Buffer.alloc(0))
	])
}

for (const item of icons) {
	const [name, drawInactive, drawActive] = item
	for (const [suffix, color, draw] of [
		['', INACTIVE, drawInactive],
		['-active', ACTIVE, drawActive || drawInactive]
	]) {
		const data = createCanvas()
		draw(data, color)
		fs.writeFileSync(path.join(outDir, `${name}${suffix}.png`), encodePNG(data))
	}
}

console.log('Tab icons generated in static/tab')
