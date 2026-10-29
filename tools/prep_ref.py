#!/usr/bin/env python3
"""
prep_ref.py — эталон для `make_sprite.py --scale-from` в геометрии генерации.

Зачем: `make_sprite.py --scale-from` считает
    scale = (H - H/80) / ref_h
где `ref_h` — высота силуэта эталона **в его собственном файле**. Игровые спрайты
лежат в кадре 675x1200, а генератор отдаёт сырьё 768x1376. Если подать игровой
спрайт как эталон напрямую, фигура в сырье окажется в 1376/1200 ≈ 1.15 раза выше
кадра генерации, и верхняя строка (голова, шляпа, поднятый предмет) срежется
верхним краем — ровно тот дефект, который описан в REGEN_PROMPTS.md.

Скрипт перерисовывает игровой спрайт на зелёном фоне в кадр генерации так, чтобы
его силуэт занимал ту же долю кадра: после `--scale-from` кадр сядет в 675x1200
пиксель-в-пиксель с базой, и голова не изменит размер.

Пример:
  python3 tools/prep_ref.py game/assets/sprites/levi_neutral.webp raw_gen/_ref/g_levi_neutral.png
  python3 tools/make_sprite.py raw_gen/props/levi_teapot.png \
      --scale-from raw_gen/_ref/g_levi_neutral.png --tol 110 \
      -o game/assets/sprites/levi_teapot.webp
"""
import sys

from PIL import Image

from make_sprite import chroma_key, crop_to_alpha

GAME_W, GAME_H = 675, 1200          # кадр игрового спрайта
RAW_W, RAW_H = 768, 1376            # кадр сырья генератора (9:16)
BOTTOM_GAP = 8                      # как в crop_to_alpha(pad=8)


def prep(src: str, dst: str) -> None:
    sil = crop_to_alpha(chroma_key(Image.open(src), tol=110))
    # силуэт занимает (GAME_H - H/80) из GAME_H по высоте -> столько же в кадре сырья
    target = round((GAME_H - GAME_H // 80) * RAW_H / GAME_H)
    k = target / sil.height
    sil = sil.resize((round(sil.width * k), target), Image.LANCZOS)
    canvas = Image.new("RGBA", (RAW_W, RAW_H), (0, 255, 0, 255))
    canvas.alpha_composite(sil, ((RAW_W - sil.width) // 2, RAW_H - sil.height - BOTTOM_GAP))
    canvas.convert("RGB").save(dst)
    print(f"ref ok: {dst} {canvas.size} sil_h={target}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    prep(sys.argv[1], sys.argv[2])
