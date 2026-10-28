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

---

# Дополнение (проверка арта 28.10.2026)

Находки при проверке всех 173 спрайтов, 38 фонов и 9 CG. Общая шапка камеры и блок `FRAMING` — те же, что выше.
Для всех кадров ниже: зелёный фон `#00FF00` без градиента, 900x1600, полный рост, ноги у нижнего края,
**ширина фигуры не больше 75% кадра** (раньше `npc_beggar`, `npc_old_woman`, `npc_cook_stern` упирались в боковые края).

## P0 · Два спрайта-силуэта: `npc_guard`, `npc_soldier_m`

Сейчас лицо и одежда чёрные, без деталей (средняя яркость 38 из 255, у нормальных спрайтов 60–130).
Стиль и пропорции — `npc_baker.webp` и `npc_confectioner.webp`. Импорт: `--tol 110`.

```text
STYLE: Attack on Titan anime style, mid-2010s TV-anime cel shading, thick slightly uneven ink outline,
two-tone cel shadow, muted dusty palette, weathered fabric, no gloss. LIGHT: soft cold daylight key from
the upper left, FRONT-LIT. The face, hands and uniform must be fully readable: midtones, not silhouette,
no black fill, shadows no darker than 30% of local colour.
CAMERA: frontal three-quarter view turned to the viewer's left, full body, standing, feet at the bottom edge.

1. npc_guard — a gate guard of the garrison: man about 40, stern square face, short brown beard, dark-navy
   guard uniform with brass buttons, peaked cap, rifle slung on the right shoulder held by one hand, black
   leather boots. Expression: neutral, watchful.
2. npc_soldier_m — a young Survey Corps patrol soldier: short dark hair, tired but alert face, light-brown
   jacket with the Wings emblem, white trousers with 3DMG straps, high brown boots, short dark-green cloak
   over one shoulder. Hands relaxed at the sides. Expression: neutral.

AVOID: black or navy flat fill, silhouette lighting, backlight, rim-only light, extra hands or fingers,
text, watermark, ground shadow.
```

**Временно убраны из сцен** до замены спрайтов: `{"show": {"char": "npc_soldier", ...}}` в `ch2_c6` (плац, перед выходом Эрвина) и
`{"show": {"char": "npc_guard", ...}}` с парным `hide` в `exposure` (ветка «под стражу», реплика «Дозорный: Приказ командира?» осталась без спрайта).
После перегенерации вернуть: `ch2_c6` — `show npc_soldier, slot center, enter fade` перед `show mikasa`; `exposure` — `show npc_guard, slot left`
перед репликой Дозорного и `hide slot left, exit fade` перед `show levi`.

## P1 · Персонажи, похожие на Эрена: `npc_tea_seller`, `npc_kid`, `npc_beggar`

Лица и причёски у этих трёх близки к Эрену (тёмные волосы, тот же овал и разрез глаз). В `ch2_i3` они стоят в одном кадре
с Эреном-подобными героями. Нужно развести их. Сохранить: костюм, позу и реквизит из текущих спрайтов, поменять лицо и причёску.

```text
Keep the pose, costume and prop of the attached sprite; change ONLY the face and hair so the person looks
clearly different from Eren Yeager (no dark-brown hair with a pony-tail or bangs parted like Eren, no
green-teal eyes).

1. npc_tea_seller — young man about 25, sly squint. Short curly RED-BROWN hair, freckles, hazel eyes, a small
   mouth with a crooked smile, round face. Brown knitted vest, grey scarf, holds a small tea tin in one hand.
2. npc_kid — boy about 10, thin. Messy LIGHT-BROWN hair falling over the forehead, grey eyes (the text calls
   them "grey as a puddle"), freckles, round soft face, loose off-white shirt two sizes too big, bare feet.
3. npc_beggar — gaunt man about 50, hollow cheeks, grey stubble and thin grey hair, deep-set pale eyes,
   crouching with a wooden bowl, patched grey blanket over the shoulders. Keep the crouching pose.
```

Файлы: `npc_tea_seller.webp`, `npc_kid.webp`, `npc_beggar.webp` (имена в манифесте не меняются).
`npc_beggar` кроме того шире кадра: после правки уложить в 75% ширины (`--scale-from` не нужен: это одиночный спрайт).

## P2 · Повар: единый цвет по 10 кадрам

У `npc_cook_stern` оранжевое свечение на фартуке и лице, у `npc_cook_neutral` серые руки и тёмный фартук, у остальных цвет плавает.
Перегенерировать **ЗАПРОС 4** из `CH2_PROMPTS.md` одним запросом с блоком:

```text
COLOUR LOCK: identical colour of skin, apron (dull brown with dark stains), shirt (grey-blue) and trousers in
ALL 10 images. Same soft cold daylight from the upper left in all 10. NO coloured rim light, NO orange glow,
NO warm hearth light, NO colour grading between frames. Skin tone must be the same in the face and in the hands.
```

Плюс `FRAMING` (макушка), как выше. Импорт: `--scale-from npc_cook_neutral`.

## P2 · Петра с подносом: `petra_tray`

Единственный кадр Петры в зелёном плаще Разведкорпуса; в остальных 11 она без плаща. Блок:

```text
Costume identical to the reference petra_neutral.webp: brown jacket, no cloak, white trousers with 3DMG
straps. Do NOT add a cloak or any extra clothing layer.
```

Остальное — позы с предметами (запрос 7, кадр 6).

## CG: цвет волос и сюжет

### `ch2_lullaby` — Маша с рыжими волосами

Волосы Маши везде пепельно-русые (`masha_*`), на CG рыжие. Нужна правка от существующего CG (img2img, сила 0.4):

```text
Same composition, pose, lighting and painting style as the attached image. Change ONLY the hair colour of
the woman: light ash-blond, long, with the same wave; keep green eyes. Everything else unchanged.
```

### `ch2_haircut` — волосы почти серебристые

Привести к пепельно-русому, как у спрайтов:

```text
Same image. Change ONLY the hair colour of the seated girl: warm light ASH-BLOND (not silver, not white),
long, same length. Everything else unchanged.
```

### `ch2_haircut` для Эрвина и Ханджи (необязательно)

Пока сцена показывает CG только при наставнике Леви (`mentor = levi`). Для двух других можно нарисовать парные CG:

```text
Same composition as the attached ch2_haircut, same girl and room, same candle and basin. Replace ONLY the
person with the scissors:
A) ch2_haircut_erwin — Erwin Smith, tall, short light-blond hair, brown Survey Corps jacket, the RIGHT
   sleeve pinned empty, the scissors in his LEFT hand, concentrated expression.
B) ch2_haircut_hange — Hange Zoe, brown hair in a high ponytail, round glasses, green cloak, a comb in one
   hand and scissors in the other, cheerful sloppy expression.
```

Подключение: файлы `game/assets/cg/ch2_haircut_erwin.webp`, `ch2_haircut_hange.webp` + две строки в `game.json → gallery`
(`{"id": "ch2_haircut_erwin", "title": "Стрижка"}` и т. д.), затем в `ch2_c6.json` на метках `c6_h_a` и `c6_h_b` заменить условие
`mentor ne levi` на выбор CG по наставнику. Проверка: `node tools/lint_scenes.mjs`, `node tools/cg_test.mjs`.

### `ch2_storm_roof` — блондинка с короткой стрижкой на крыше

На CG наверху лежит короткостриженая блондинка, но в день бури (`ch2_i6`, 10-й день) у Маши ещё длинные волосы
(стрижка на 16-й день, `ch2_c6`), а Армина в сцене нет. Правка от существующего CG:

```text
Same composition, rain, roof, ladder, hands passing slate tiles, Mikasa with the red scarf, the man on the
ladder. Change ONLY the girl lying at the top beside the hole: she is Masha, her LONG wet ash-blond hair
is tied back with a strip of cloth and hangs over her shoulder, brown Survey Corps jacket, determined face.
No short hair.
```

### Остальные CG

`ch2_cover`, `ch2_grey_cloak`, `ch2_oath`, `ch2_names_list`, `ch2_tag`, `ch2_wall_end` — без замечаний (формат 1080×1920, композиция читается,
Маша после стрижки с короткими волосами там, где должна).

## Чек-лист после замены

1. Скрипт проверки верхней строки кадра (в начале файла) не должен выводить позы с предметами и `npc_*`.
2. Яркость: у `npc_guard` и `npc_soldier_m` средняя яркость фигуры не меньше 60 из 255.
3. `node tools/lint_scenes.mjs` и `node tools/cg_test.mjs` — без ошибок.
4. Глазами: `?scene=ch2_c6&debug=1` (солдат в центре плаца), `?scene=ch2_i3&debug=1` (продавец чая, мальчик, нищий),
   `?scene=exposure` ветка «под стражу» (дозорный).
