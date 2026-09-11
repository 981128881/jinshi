from PIL import Image
from pathlib import Path

src_dir = Path(r"C:\Users\Administrator\.cursor\projects\C-Users-ADMINI-1-AppData-Local-Temp-752ab195-419d-41f4-8ee9-c34fdf56b3e7\assets")
out_dir = Path(r"g:\jinshifang\wxapp-frontend\static\tab")
out_dir.mkdir(parents=True, exist_ok=True)
SIZE = 81

mapping = {
    "tab-home-outline.png": "home.png",
    "tab-home-fill.png": "home-active.png",
    "tab-my-outline.png": "my.png",
    "tab-my-fill.png": "my-active.png",
}


def remove_bg(im):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            brightness = (r + g + b) / 3.0
            chroma = abs(r - g) + abs(g - b) + abs(b - r)
            # white / light gray page
            if brightness >= 235 and chroma < 24:
                px[x, y] = (r, g, b, 0)
            elif brightness >= 220 and chroma < 14:
                px[x, y] = (r, g, b, 0)
            # black preview canvas
            elif r <= 28 and g <= 28 and b <= 28:
                px[x, y] = (0, 0, 0, 0)
            elif r <= 45 and g <= 45 and b <= 45 and chroma < 12:
                px[x, y] = (0, 0, 0, 0)
    return im


def to_square(im, pad=18):
    bbox = im.getbbox()
    if not bbox:
        return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    im = im.crop((l, t, r, b))
    w, h = im.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)
    return canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


for src_name, dst_name in mapping.items():
    out = to_square(remove_bg(Image.open(src_dir / src_name)))
    dst = out_dir / dst_name
    out.save(dst, format="PNG", optimize=True)
    a = out.split()[-1]
    print(f"{dst_name}: {dst.stat().st_size}B alpha={a.getextrema()}")

print("ok")
