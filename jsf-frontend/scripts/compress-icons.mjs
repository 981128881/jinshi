import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const staticDir = path.join(root, 'static')

function walk(dir, files = []) {
	if (!fs.existsSync(dir)) return files
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name)
		const st = fs.statSync(p)
		if (st.isDirectory()) walk(p, files)
		else if (/\.(png|jpe?g|webp)$/i.test(name)) files.push(p)
	}
	return files
}

/** UI 展示尺寸上限（逻辑像素，再 *2 给 retina） */
function maxDimFor(rel) {
	const r = rel.replace(/\\/g, '/')
	if (r.startsWith('tab/')) return 162 // tabBar iconWidth 约 60rpx≈81px，2x
	if (r.includes('icons/order/') || r.includes('icons/mine/')) return 128
	if (r.includes('order-empty')) return 480
	if (r.includes('/category/')) return 208
	return 256
}

async function compressOne(file) {
	const rel = path.relative(staticDir, file)
	const before = fs.statSync(file).size
	const maxDim = maxDimFor(rel)
	const ext = path.extname(file).toLowerCase()
	const img = sharp(file)
	const meta = await img.metadata()
	const w = meta.width || 0
	const h = meta.height || 0
	let pipeline = sharp(file).rotate()

	if (w > maxDim || h > maxDim) {
		pipeline = pipeline.resize({
			width: maxDim,
			height: maxDim,
			fit: 'inside',
			withoutEnlargement: true
		})
	}

	const tmp = file + '.tmp-opt'
	if (ext === '.jpg' || ext === '.jpeg') {
		await pipeline.jpeg({ quality: 82, mozjpeg: true }).toFile(tmp)
	} else if (ext === '.webp') {
		await pipeline.webp({ quality: 82 }).toFile(tmp)
	} else {
		// PNG：小图标用 palette，空态图等稍大图用 denser compression
		const afterResize = maxDim <= 162
		await pipeline
			.png({
				compressionLevel: 9,
				palette: afterResize || Math.max(w, h) <= 256,
				quality: 85,
				effort: 10
			})
			.toFile(tmp)
	}

	const after = fs.statSync(tmp).size
	if (after < before) {
		fs.renameSync(tmp, file)
		return { rel, before, after, w, h, maxDim, saved: before - after }
	}
	fs.unlinkSync(tmp)
	return { rel, before, after: before, w, h, maxDim, saved: 0, skipped: true }
}

async function main() {
	try {
		await import('sharp')
	} catch {
		console.error('sharp 未安装，请先: npm i -D sharp')
		process.exit(1)
	}

	const files = walk(staticDir)
	console.log(`找到 ${files.length} 张图片\n`)
	let savedTotal = 0
	let beforeTotal = 0
	let afterTotal = 0
	for (const f of files) {
		const r = await compressOne(f)
		beforeTotal += r.before
		afterTotal += r.after
		savedTotal += r.saved
		const flag = r.skipped ? 'skip' : 'ok'
		console.log(
			`[${flag}] ${(r.before / 1024).toFixed(1)}KB -> ${(r.after / 1024).toFixed(1)}KB  ${r.rel}  (${r.w}x${r.h}, max=${r.maxDim})`
		)
	}
	console.log(
		`\n合计: ${(beforeTotal / 1024).toFixed(1)}KB -> ${(afterTotal / 1024).toFixed(1)}KB，节省 ${(savedTotal / 1024).toFixed(1)}KB`
	)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
