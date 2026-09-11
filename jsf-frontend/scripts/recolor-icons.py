from PIL import Image
from pathlib import Path

TAB = Path(r"g:\jinshifang\wxapp-frontend\static\tab")
ORDER = Path(r"g:\jinshifang\wxapp-frontend\static\icons\order")

ICON_MAIN = (0x7E, 0x8C, 0x7B)      # 未选中
ICON_ACTIVE = (0x88, 0xA8, 0x7B)    # 选中


def recolor(src: Path, dst: Path, rgb):
	im = Image.open(src).convert("RGBA")
	px = im.load()
	w, h = im.size
	tr, tg, tb = rgb
	for y in range(h):
		for x in range(w):
			r, g, b, a = px[x, y]
			if a <= 8:
				continue
			# keep alpha, replace rgb with target (soft blend by luminance for anti-alias)
			px[x, y] = (tr, tg, tb, a)
	im.save(dst, format="PNG", optimize=True)
	print(f"{dst.name}: {dst.stat().st_size}B -> #{tr:02X}{tg:02X}{tb:02X}")


# Tab
recolor(TAB / "home.png", TAB / "home.png", ICON_MAIN)
recolor(TAB / "my.png", TAB / "my.png", ICON_MAIN)
recolor(TAB / "home-active.png", TAB / "home-active.png", ICON_ACTIVE)
recolor(TAB / "my-active.png", TAB / "my-active.png", ICON_ACTIVE)

# 我的页预约状态（主图标选中色）
for name in ("pay.png", "ship.png", "receive.png", "done.png"):
	p = ORDER / name
	if p.exists():
		recolor(p, p, ICON_ACTIVE)

print("ok")
