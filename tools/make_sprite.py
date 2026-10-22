#!/usr/bin/env python3
"""
make_sprite.py — постобработка арта для движка.

Спрайты:  кеинг зелёного фона (#00FF00) -> альфа -> кадрирование -> 675x1200 WebP q85
Фоны/CG:  без кеинга -> cover-кроп до 720x1280 -> WebP q78

Размеры совпадают с текущими ассетами игры (docs/ASSETS.md); --size меняет их.

Примеры:
  python3 tools/make_sprite.py raw/levi_neutral.png -o game/assets/sprites/levi_neutral.webp
  python3 tools/make_sprite.py raw/cell.png --bg -o game/assets/bg/cell_light.webp
  python3 tools/make_sprite.py raw/cg1.png --bg --size 1080x1920 -o game/assets/cg/cg1.webp

После: внести файл в manifest.json / bg/index.json / game.json → gallery
и прогнать node tools/lint_scenes.mjs.
"""
import argparse
from PIL import Image

GREEN = (0, 255, 0)


def chroma_key(img: Image.Image, tol: int = 96) -> Image.Image:
    """Зелёный -> прозрачность; лёгкий despill по кромке."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    gr, gg, gb = GREEN
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # расстояние до чистого зелёного
            if abs(r - gr) < tol and g > 140 and g > r + 60 and g > b + 60:
                px[x, y] = (0, 0, 0, 0)
            elif g > r and g > b:  # despill: зелёный отлив на краях силуэта
                excess = g - max(r, b)
                px[x, y] = (r, g - excess // 2, b, a)
    return img


def crop_to_alpha(img: Image.Image, pad: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    l = max(0, l - pad); t = max(0, t - pad)
    r = min(img.width, r + pad); b = min(img.height, b + pad)
    return img.crop((l, t, r, b))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--bg", action="store_true", help="режим фона (без кеинга)")
    ap.add_argument("--tol", type=int, default=96)
    ap.add_argument("--size", help="ШxВ итогового кадра (по умолчанию 675x1200 спрайт, 720x1280 фон)")
    args = ap.parse_args()
    if args.size:
        W, H = (int(v) for v in args.size.lower().split("x"))
    else:
        W, H = (720, 1280) if args.bg else (675, 1200)

    img = Image.open(args.src)

    if args.bg:
        img = img.convert("RGB")
        # приводим к WxH (cover-crop по центру при необходимости)
        target = (W, H)
        ratio = max(target[0] / img.width, target[1] / img.height)
        img = img.resize((round(img.width * ratio), round(img.height * ratio)), Image.LANCZOS)
        l = (img.width - target[0]) // 2
        t = (img.height - target[1]) // 2
        img = img.crop((l, t, l + target[0], t + target[1]))
        img.save(args.out, "WEBP", quality=78, method=6)
        print(f"bg ok: {args.out} {img.size}")
        return

    img = chroma_key(img, tol=args.tol)
    img = crop_to_alpha(img)
    # вписываем в канвас WxH, фигура по центру, ноги у нижнего края
    scale = (H - H // 80) / img.height
    new_w = round(img.width * scale)
    if new_w > W:
        scale = W / img.width
        new_w = W
    img = img.resize((new_w, round(img.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(img, ((W - img.width) // 2, H - img.height), img)
    canvas.save(args.out, "WEBP", quality=85, method=6)
    print(f"sprite ok: {args.out} src={Image.open(args.src).size} -> {W}x{H}")


if __name__ == "__main__":
    main()
