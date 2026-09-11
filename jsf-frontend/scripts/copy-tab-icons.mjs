import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = 'C:/Users/Administrator/.cursor/projects/g-wxapp-frontend/assets'
const destDir = path.resolve(__dirname, '../static/tab')

const mapping = [
	['images_home-active-', 'home-active.png'],
	['images_home-', 'home.png', 'images_home-active-'],
	['images_category-active-', 'category-active.png'],
	['images_category-', 'category.png', 'images_category-active-'],
	['images_cart-active-', 'cart-active.png'],
	['images_cart-', 'cart.png', 'images_cart-active-'],
	['images_my-active-', 'my-active.png'],
	['images_my-', 'my.png', 'images_my-active-']
]

fs.mkdirSync(destDir, { recursive: true })

function findAsset(suffix, exclude = '') {
	const files = fs.readdirSync(assetsDir)
	const matches = files.filter(
		(f) => f.includes(suffix) && (!exclude || !f.includes(exclude))
	)
	if (!matches.length) return null
	matches.sort(
		(a, b) =>
			fs.statSync(path.join(assetsDir, b)).mtimeMs -
			fs.statSync(path.join(assetsDir, a)).mtimeMs
	)
	return path.join(assetsDir, matches[0])
}

for (const [suffix, destName, exclude] of mapping) {
	const src = findAsset(suffix, exclude)
	if (!src) {
		console.warn(`skip ${destName}: asset not found (${suffix})`)
		continue
	}
	fs.copyFileSync(src, path.join(destDir, destName))
	console.log(`${destName} <= ${path.basename(src)}`)
}

execSync('node scripts/optimize-tab-icons.mjs', {
	stdio: 'inherit',
	cwd: path.resolve(__dirname, '..')
})

;['order.png', 'order-active.png', 'mine.png', 'mine-active.png'].forEach((name) => {
	const p = path.join(destDir, name)
	if (fs.existsSync(p)) fs.unlinkSync(p)
})

console.log('Done')
