# Перегенерация арта для релиза 1.0 — список и промпты

Что нарисовано с дефектами (найдено при просмотре арта в версии 1.0) и как это переделать.
Конвейер тот же, что в [`CH2_PROMPTS.md`](CH2_PROMPTS.md): золотая база на зелёном `#00FF00` →
правки от базы → `tools/make_sprite.py` → `node tools/lint_scenes.mjs`.
Промпты на английском — копировать блоками целиком.

## Что не так

| # | Дефект | Где | Приоритет |
|---|---|---|---|
| 1 | **Макушка срезана верхним краем кадра** — у спрайтов с предметами голова упирается в верх кадра, фигура на них крупнее базы | 10 поз с предметами | P0 |
| 2 | То же: волосы Маши обрезаны у края | `masha_uniform_*` (10), `masha_short_*` (10) | P1 |
| 3 | То же + разный масштаб: позы Сэма с широко разведёнными руками | `sam_*` новые (10) | P2 |
| 4 | То же у горожан и Повара | `npc_*` (20) | P3 |
| 5 | Фоны-варианты нарисованы с другой планировкой, чем базовый | 5 фонов | P1 |

Как проверить, что дефект есть: у «здорового» спрайта в верхней строке кадра почти нет
непрозрачных пикселей (`levi_neutral`: ~0), у дефектного — 100–260.

```bash
python3 - <<'EOF'
from PIL import Image; import glob
for f in sorted(glob.glob('game/assets/sprites/*.webp')):
    a = Image.open(f).getchannel('A').point(lambda v: 255 if v > 128 else 0)
    n = sum(1 for v in a.crop((0, 0, 675, 1)).getdata() if v)
    if n > 25: print(f.split('/')[-1], n)
EOF
```

После перегенерации команда должна выводить только спрайты с волосами, лежащими у самого
верха по замыслу (список не должен содержать позы с предметами).

## Общее исправление камеры (добавить в шапку КАЖДОГО запроса спрайтов)

Причина дефекта — в шапках запросов сказано «figure ≈85% of the frame height», а с предметом
в поднятой руке или с длинными волосами силуэт упирается в рамку, и `make_sprite.py`
вписывает его по самому высокому месту. Заменить строку про размер фигуры на:

```text
FRAMING: the figure, INCLUDING the hair, the hood and any raised hand or prop, occupies at most
80% of the frame height. Leave at least 8% EMPTY green above the top of the head and at least
6% empty green below the boots. Nothing — hair, hat, hand, prop, cloak — touches or crosses the
frame edge. If a prop is raised, keep the head at the SAME size and position as in the
reference image; shrink nothing.
```

Импорт пачки — **всегда** с эталоном, чтобы голова не меняла размер между кадрами:

```bash
for f in raw_gen/<char>/*.png; do
  n=$(basename "$f" .png)
  python3 tools/make_sprite.py "$f" --scale-from raw_gen/<char>/<neutral-кадр>.png --tol 110 \
    -o "game/assets/sprites/${n}.webp"
done
```

Затем проверить скриптом выше, а в игре — `?scene=<id>&debug=1` на реплике с этим спрайтом.

---

# P0 · 10 поз с предметами

Повторить **ЗАПРОС 7** из `CH2_PROMPTS.md` с одним изменением в шапке: блок `FRAMING` выше.
Референс каждого кадра — нейтральный спрайт своего героя (указан в кадре). Поза рук остаётся
прежней, но фигура целиком меньше, голова — размером с базу.

Где поза используется (чтобы проверить глазами после замены):

| Файл | Сцена и шаг |
|---|---|
| `levi_teapot` | `ch2_c2` шаг 76 |
| `levi_scissors` | `ch2_c6` шаг 195 |
| `hange_scissors` | `ch2_c6` шаг 222 |
| `erwin_scissors` | `ch2_c6` шаг 249 |
| `hange_ladle` | `ch2_i2` шаг 460 |
| `erwin_map`, `petra_tray`, `jean_sweets`, `mikasa_cup`, `sam_key` | `ch2_c2`, `ch2_i3`, `ch2_i4`, `ch2_c7` (поиск: `grep -n '_tray\|_sweets\|_cup\|_key\|_map' game/scenes/*.json`) |

Шапка (вставить вместо шапки запроса 7):

```text
TASK: 10 separate prop poses, one per numbered frame, each made from the attached golden-base
sprite of that character. Keep the exact same camera angle, hairstyle, uniform and light as the
attached base, and keep the HEAD the same size and in the same relative position as in the base.
Change ONLY the arms and hands and the small prop. The face keeps the base expression unless
stated. Full body, standing, feet near the bottom edge, flat chroma-key green background
#00FF00, vertical 9:16, 900x1600, no ground shadow, no background objects, no text.

FRAMING: the figure, INCLUDING the hair, the hood and any raised hand or prop, occupies at most
80% of the frame height. Leave at least 8% EMPTY green above the top of the head and at least
6% empty green below the boots. Nothing touches or crosses the frame edge. If a prop is raised,
keep the head at the SAME size as in the reference image; shrink nothing.
```

Кадры 1–10 — те же, что в `CH2_PROMPTS.md` (запрос 7), включая блок `AVOID`.

---

# P1 · Маша — 20 кадров

Два запроса: ЗАПРОС 2 (`masha_uniform_*`, референс `masha_neutral.webp`) и ЗАПРОС 3
(`masha_short_*`, референс `masha_uniform_neutral.webp` после перегенерации). Заменить в шапке
строку про 85% на блок `FRAMING` выше. Дополнительно для длинных волос:

```text
HAIR: the long ash-blond hair falls fully inside the frame — the crown of the head is at least
8% below the top edge, the hair ends are visible, nothing is cropped.
```

Импорт: `--scale-from` на `masha_uniform_neutral` для всех форменных, на `masha_short_neutral`
для всех со стрижкой. Высота в манифесте остаётся 0.532; если голова на экране получится
меньше, чем у `masha_neutral`, поднять `height` у обоих наборов на ту же долю, чтобы видимая
голова совпала.

---

# P1 · 5 фонов — одна планировка с базой

Прикладывать к каждому запросу **базовый фон как референс** (img2img, сила 0.55–0.7: свет и
время суток меняются, композиция и архитектура — нет).

### `hq_courtyard_night` и `hq_courtyard_storm` — база `hq_courtyard.webp`

Сейчас оба нарисованы как другой двор (дом с мансардами, лестница, ворота). Нужен тот же
двор: крепостная башня справа, колодец, тренировочные чучела, оружейная стойка, булыжник.

```text
Attack on Titan anime background art, dark painterly digital painting, weathered stone, muted
desaturated palette, no characters. SAME courtyard as the reference image — same castle tower
on the right, same well, same training dummies and weapon rack, same cobbled ground, same
camera position and perspective. Change ONLY the time of day and the weather.

Variant A (night): deep blue-black night, cold moonlight on the tower and wall top, wet
cobblestones with a faint sheen, ONE warm lantern lit near the weapon rack, windows of the
tower dark except one.
Variant B (storm): heavy rain, low dark thunder clouds, puddles on the cobbles, wet glistening
stone, wind-bent torch flame, a flash of cold light behind the tower.

Composition: vertical 9:16, 1080x1920, tower and well in the middle third, open cobbles in the
lower third for sprites and a dialogue box, top 10% safe. No people, no text, no watermarks,
no UI.
```

Генерировать варианты A и B отдельными запросами. Подпись файла: A → `hq_courtyard_night`,
B → `hq_courtyard_storm`.

### `hq_rooftop_dusk` и `hq_rooftop_dawn` — база `hq_rooftop.webp`

Сейчас крыша «розовая» и с другой трубой; нужна та же крыша: кирпичная труба, фонарь на
кронштейне, зубчатый парапет, башня вдали.

```text
Attack on Titan anime background art, dark painterly digital painting, slate tiles and brick,
muted desaturated palette, no characters. SAME roof as the reference image — same brick
chimney with the lantern on its bracket, same crenellated parapet, same tower in the distance,
same camera and perspective. Change ONLY the light and the sky.

Variant A (dusk): low warm orange sun on the horizon lighting the slate edge-on, long purple
shadows, cool blue in the shade, the lantern LIT.
Variant B (dawn): flat cold blue-grey pre-sunrise light, thin mist in the valley, dew on the
tiles, the lantern burned down and dark, a thread of smoke from a far chimney.

Composition: vertical 9:16, 1080x1920, chimney and ridge line in the middle third, tiles in
the lower third flat and open for sprites and a dialogue box, top 10% safe. Keep the palette
slate-blue, not pink. No people, no text, no watermarks, no UI.
```

### `hq_parade_dawn` — стилистически «плоский»

Нарисован как градиентная заливка. Референс по стилю — `hq_courtyard.webp` (плотная мазковая
живопись, текстура камня).

```text
Attack on Titan anime background art, dark painterly digital painting, in the SAME painterly
style and texture density as the reference image (heavy brushwork, weathered stone texture, no
flat gradients), muted desaturated palette, no characters.

Subject: a military parade ground at dawn inside the Wall. The huge grey Wall fills the back
of the frame, a long low barracks building on the right with a covered gallery, packed earth
and gravel ground with puddles and wheel ruts, low mist across the ground, a signal bell on a
post at the far left.

Light: pale cold dawn, a thin warm line at the horizon behind the Wall, long soft shadows,
mist glowing slightly.

Composition: vertical 9:16, 1080x1920, the Wall and barracks in the upper two thirds, open
ground in the lower third for lines of sprites and a dialogue box, top 10% safe.

Mood: soldiers about to be called into formation. No people, no text, no watermarks, no UI.
```

Импорт фонов: `python3 tools/make_sprite.py raw/<имя>.png --bg -o game/assets/bg/<имя>.webp`;
имена в `game/assets/bg/index.json` уже есть, добавлять не нужно.

---

# P2 · Сэм — 10 кадров

ЗАПРОС 5 из `CH2_PROMPTS.md` (`sam_ashamed`, `blank`, `broken_smile`, `caught`, `cornered`,
`exhausted`, `hollow`, `honest`, `pleading`, `whisper`), референс — `sam_neutral.webp`.
Блок `FRAMING` в шапку. Для поз с широко разведёнными руками дополнительно:

```text
ARMS: arms may open to at most shoulder width on each side of the torso; hands stay inside the
frame with at least 6% green margin on the left and right. Do NOT make the figure wider or
closer to fit the gesture — keep the same distance as the base.
```

Импорт: `--scale-from game/assets/sprites/sam_neutral.webp`.

---

# P3 · Горожане и Повар — 20 кадров

ЗАПРОС 4 (Повар, 10 кадров, референс `npc_cook_neutral.webp`) и ЗАПРОС 6 (горожане, 10
кадров). Блок `FRAMING` в шапку. Эти спрайты видны на экране редко и мелко, поэтому можно
отложить после выпуска.

---

# После замены

1. `node tools/lint_scenes.mjs` — должно быть «✓ ошибок нет».
2. Скрипт проверки верхней строки из начала файла — позы с предметами в списке не остаются.
3. Просмотр глазами: `node tools/serve.mjs` → `?scene=ch2_c6&debug=1` (три наставника с
   ножницами), `?scene=ch2_c2&debug=1` (чайник), `?scene=ch2_i2&debug=1` (ложка), `?scene=ch2_c6`
   (плац на рассвете), `?scene=ch2_c0` (двор ночью), `?scene=ch2_i6` (двор в бурю),
   `?scene=ch2_c4` и `?scene=ch2_i7` (крыша).
4. `node tools/smoke_test.mjs` — после правки любых файлов в `game/assets/sprites/manifest.json`.
