# Промпты Главы 2 — готовые к копированию

Собрано по тому же конвейеру, что уже работает в проекте (`plan.md` §«Пайплайн»,
`docs/ASSETS.md`): золотая база на зелёном `#00FF00` → правки от базы → `tools/make_sprite.py`
→ `manifest.json` / `bg/index.json` → `node tools/lint_scenes.mjs`.
Список «что именно нужно» — [`CH2_ASSETS_TODO.md`](CH2_ASSETS_TODO.md).

## Правила этого файла

1. **1 запрос = 10 спрайтов.** Каждый блок «ЗАПРОС» — это один запрос генератору:
   шапка (стиль + фиксация камеры + техника) и 10 нумерованных кадров.
2. **Ракурс не меняется.** Камера, дистанция, масштаб, кроп, свет, одежда и причёска
   зафиксированы в шапке и не меняются ни в одном кадре. Меняются **только лицо и руки**.
3. **Промпты — на английском** (модели держат его точнее), подписи и пояснения — по-русски.
   Блоки в ``` копировать целиком, ничего не переводя.
4. **К каждому запросу спрайтов прикладывать референс** — файл из `game/assets/sprites/`
   (указан в шапке). Для кадров 2–10 режим «редактирование / img2img» с силой 0.45–0.6,
   чтобы модель меняла лицо и руки, но не тело.
5. Если модель отдаёт меньше 10 кадров — повторять по номерам, **шапку не менять**.
6. Кадр №1 в каждом запросе — это новая **золотая база**. Остальные девять — правки от неё.
7. После импорта: `python3 tools/make_sprite.py raw/x.png -o game/assets/sprites/x.webp`
   (спрайт → 675×1200 WebP q85), для фонов и CG — с флагом `--bg`.

## Высота в манифесте

Берётся из текущих значений `manifest.json`, чтобы головы были одного размера:

| Персонаж | height |
|---|---|
| Маша (`masha_*`) | 0.532 |
| Леви | 0.547 |
| Ханчжи | 0.593 |
| Петра / Жан / Микаса / Эрен / Армин | 0.57–0.593 |
| Повар | 0.577 |
| Сэм | 0.607 |
| Серый плащ | **0.620** (выше всех, кроме Эрвина) |
| Горожанe | 0.55–0.58 |

---

# 1. Спрайты — 7 запросов по 10

## ЗАПРОС 1 · Серый плащ / Йорген Вальк — 10 кадров

**Референс:** нет (новый персонаж). Генерировать кадр 1 с нуля, остальные — от него.
**Файлы:** `grey_cloak_hooded.webp`, `grey_cloak_hooded_lantern.webp`, `grey_cloak_hooded_gloves.webp`,
`grey_cloak_reveal.webp`, `grey_cloak_cold.webp`, `grey_cloak_smirk.webp`, `grey_cloak_talk.webp`,
`grey_cloak_bow.webp`, `grey_cloak_cornered.webp`, `grey_cloak_notebook.webp`.

```text
CHARACTER: a man in his late forties, narrow cold grey eyes, thin pale scar above the LEFT
eyebrow, dark grey hair combed back neatly, clean-shaven, lean upright posture, high-collared
charcoal coat with plain brass buttons, good travelling cloak of grey wool, worn but clean
boots, thin leather gloves. A quiet, polite official — listens more than speaks.

STYLE: Attack on Titan anime style, mid-2010s TV-anime cel shading, thick slightly uneven ink
outline, two-tone cel shadow, muted dusty palette (desaturated olive, brown leather, cold grey),
weathered fabric, no gloss, no sparkles, no neon. Light: soft cold daylight key from upper left.

CAMERA LOCK — identical in all 10 images: same frontal three-quarter view turned to the
viewer's left, same distance, same focal length, same scale, same vertical framing from the top
of the head to the boots, figure centred horizontally, feet at the bottom edge, figure ≈85% of
the frame height. The character never turns, never steps closer or further, never changes his
hairstyle, outfit, proportions or the light. ONLY the face and the arms/hands change.

TECH: vertical 9:16 frame, 900x1600, flat uniform chroma-key green background #00FF00, no
gradient, no ground shadow, no props, no frame, no text. Full body, standing.

1. grey_cloak_hooded — face: hood up, features lost in the hood's shadow, only the chin and
   jawline readable | hands: both hands clasped loosely in front, gloves on.
2. grey_cloak_hooded_lantern — face: hood up, shadow over the eyes | hands: right hand holds
   a shuttered lantern low at hip height, left hand rests on the cloak clasp.
3. grey_cloak_hooded_gloves — face: hood up, tilted slightly down | hands: both hands pulling
   the leather glove tighter onto the other wrist.
4. grey_cloak_reveal — face: hood thrown back, face fully lit, thin scar above the left eyebrow,
   eyes fixed forward | hands: right hand covering his mouth, fingers together (his habit).
5. grey_cloak_cold — face: same face, hand lowered, flat unreadable stare, no blink |
   hands: arms relaxed at his sides, gloves folded in the left hand.
6. grey_cloak_smirk — face: faint courteous clerk's smile that does not reach the eyes |
   hands: hands folded in front at the waist.
7. grey_cloak_talk — face: mid-speech, calm, one eyebrow slightly raised | hands: right palm
   half-raised to the chest, index finger slightly extended.
8. grey_cloak_bow — face: head bowed a shallow, courteous angle, eyes down | hands: right hand
   over the heart, left hand at his side.
9. grey_cloak_cornered — face: chin level, eyes hard, no fear | hands: both arms open away
   from the body, empty gloved palms turned outward.
10. grey_cloak_notebook — face: looking up from a page, attentive | hands: left hand holds a
   small worn notebook bound with twine, right hand holds a short pencil.

AVOID: different camera angle, side view, back view, walking, action pose, cropped feet,
cropped head, extra limbs, extra or fused fingers, different outfit or hairstyle, green fringe
on the silhouette, glossy skin, chibi, cute eyes, background objects, floor shadow, text,
watermark, signature. Do not make him a villain: no black cape, no moustache-twirling, no
armour, no weapon.
```

---

## ЗАПРОС 2 · Маша в форме, длинные волосы — 10 кадров

**Референс:** `game/assets/sprites/masha_neutral.webp` (лицо и фигура уже утверждены).
**Файлы:** `masha_uniform_{neutral,smirk,scared,determined,tired,soft,sad,surprised,thinking,defiant}.webp`.

```text
CHARACTER: Masha, 18 years old, 157 cm, slim, light ash-blond hair falling below the shoulder
blades, green eyes, pale skin, a thin faded scar on the left palm. Scout Regiment uniform:
light-brown short jacket over a white shirt, dark breeches with white vertical 3DMG straps,
tall brown leather boots, leather belt. NO collar insignia yet — she has not taken the oath,
the collar is plain. Hands dusty, a small bandage on one finger.

STYLE: Attack on Titan anime style, mid-2010s TV-anime cel shading, thick slightly uneven ink
outline, two-tone cel shadow, muted dusty palette, weathered fabric, no gloss, no sparkles,
no neon. Light: soft cold daylight key from upper left.

CAMERA LOCK — identical in all 10 images: same frontal three-quarter view turned to the
viewer's left, same distance, same focal length, same scale, same vertical framing from the
top of the head to the boots, figure centred horizontally, feet at the bottom edge, figure
≈85% of the frame height. She never turns, never steps closer or further, never changes her
hairstyle, uniform, proportions or the light. ONLY the face and the arms/hands change.

TECH: vertical 9:16 frame, 900x1600, flat uniform chroma-key green background #00FF00, no
gradient, no ground shadow, no props, no frame, no text. Full body, standing.

1. masha_uniform_neutral — face: calm, mouth closed, eyes level | hands: relaxed at her sides,
   fingers slightly curled.
2. masha_uniform_smirk — face: one corner of the mouth up, one eyebrow raised, eyes amused |
   hands: thumbs hooked into the belt, elbows out.
3. masha_uniform_scared — face: eyes wide, lips parted, brows raised in the middle |
   hands: right hand gripping her own left forearm.
4. masha_uniform_determined — face: jaw set, brows down, eyes hard | hands: loose fists at
   her sides.
5. masha_uniform_tired — face: half-lidded eyes, faint shadows under them, mouth flat |
   hands: right hand rubbing the back of her neck, left arm hanging.
6. masha_uniform_soft — face: quiet warmth, eyes softened, small closed-mouth smile |
   hands: both hands wrapped around a dented tin cup, holding it against her chest.
7. masha_uniform_sad — face: eyes lowered to the side, mouth flat, brows tilted up |
   hands: fingers laced in front, wrists loose.
8. masha_uniform_surprised — face: brows up, lips apart, eyes wide | hands: left hand lifted
   to chest height, palm out, fingers spread.
9. masha_uniform_thinking — face: eyes at three-quarter, she is biting the inside of her cheek |
   hands: right hand raised, knuckles under the chin, elbow supported by the left hand.
10. masha_uniform_defiant — face: chin lifted, flat challenging stare | hands: arms crossed
    over the chest, hands hidden under the opposite elbows.

AVOID: different camera angle, side or back view, walking, action pose, cropped feet or head,
extra limbs, extra or fused fingers, different hairstyle, different uniform, collar insignia
or wings patch (she has none yet), glossy skin, chibi, cute round eyes, background props,
floor shadow, text, watermark. Keep her visibly shorter and younger-looking than the veterans.
```

---

## ЗАПРОС 3 · Маша после стрижки — 10 кадров

**Референс:** результат ЗАПРОСА 2 (кадр 1) + `masha_neutral.webp` для лица.
**Файлы:** `masha_short_{neutral,smirk,smile,determined,tired,soft,sad,surprised,scared,thinking}.webp`.

Отличия от ЗАПРОСА 2: волосы до подбородка, подрезаны чуть неровно (свежая стрижка),
на воротнике — знаки Разведкорпуса (крылья), на плече — нашивка.

```text
CHARACTER: the same young woman as the attached reference — Masha, 18, 157 cm, green eyes,
pale skin. CHANGE: her hair is now cut to the jawline, slightly uneven at the ends as if cut
this morning, one strand falling over the brow. Same Scout Regiment uniform: light-brown short
jacket, white shirt, dark breeches with white 3DMG straps, tall brown boots. NOW with the
Scout Regiment wings insignia on the collar and a stitched wings patch on the left shoulder.
Her neck looks bare and newly exposed.

STYLE: Attack on Titan anime style, mid-2010s TV-anime cel shading, thick slightly uneven ink
outline, two-tone cel shadow, muted dusty palette, weathered fabric, no gloss, no sparkles,
no neon. Light: soft cold daylight key from upper left.

CAMERA LOCK — identical in all 10 images: same frontal three-quarter view turned to the
viewer's left, same distance, same focal length, same scale, same vertical framing from the
top of the head to the boots, figure centred horizontally, feet at the bottom edge, figure
≈85% of the frame height. She never turns, never steps closer or further, never changes her
hairstyle, uniform, proportions or the light. ONLY the face and the arms/hands change.

TECH: vertical 9:16 frame, 900x1600, flat uniform chroma-key green background #00FF00, no
gradient, no ground shadow, no props, no frame, no text. Full body, standing.

1. masha_short_neutral — face: calm, mouth closed, eyes level | hands: relaxed at her sides.
2. masha_short_smirk — face: half-smile, eyes narrowed in dry humour | hands: one thumb
   hooked in the belt, the other hand loose.
3. masha_short_smile — face: open, tired but real smile, eyes warm | hands: both hands closing
   the collar of her jacket at the throat.
4. masha_short_determined — face: jaw set, brows down, eyes forward | hands: fists at her sides.
5. masha_short_tired — face: half-lidded, faint shadows under the eyes | hands: one hand
   raised to the shorn nape of her neck, as if still surprised by it.
6. masha_short_soft — face: quiet warmth, eyes softened | hands: both hands around a tin cup.
7. masha_short_sad — face: eyes lowered, mouth flat | hands: fingers laced in front.
8. masha_short_surprised — face: brows up, lips parted | hands: one hand lifted, palm out.
9. masha_short_scared — face: eyes wide, breathing shallow | hands: one hand pressed to her
   own chest, the other slightly behind her.
10. masha_short_thinking — face: eyes at three-quarter, brows drawn | hands: fingers of one
    hand touching the new collar insignia, as if checking it is really there.

AVOID: long hair (hair must be at the jawline in every frame), different camera angle, side or
back view, walking, cropped feet or head, extra fingers, different uniform, glossy skin, chibi,
background props, floor shadow, text, watermark. The haircut must look fresh and slightly
awkward, not a salon style.
```

---

## ЗАПРОС 4 · Повар — 10 кадров

**Референс:** `game/assets/sprites/npc_cook.webp` (сейчас у него только `neutral`).
**Файлы:** `npc_cook_{neutral,smile,smirk,stern,annoyed,tired,surprised,laugh,proud,sigh}.webp`.

```text
CHARACTER: the camp cook, a stocky silent man of about fifty, broad shoulders, thick arms and
hands the size of shovels, short grey stubble, a dark work cap, a grey shirt with sleeves
rolled to the elbow, a stained brown leather apron, wooden clogs. Soot on the forearms, flour
on the apron. Face weathered and closed, but not unkind.

STYLE: Attack on Titan anime style, mid-2010s TV-anime cel shading, thick slightly uneven ink
outline, two-tone cel shadow, muted dusty palette, weathered fabric, no gloss, no sparkles,
no neon. Light: warm firelight key from the lower right plus cool daylight fill from the left.

CAMERA LOCK — identical in all 10 images: same frontal three-quarter view turned to the
viewer's left, same distance, same focal length, same scale, same vertical framing from the
top of the head to the clogs, figure centred horizontally, feet at the bottom edge, figure
≈85% of the frame height. He never turns, never steps closer or further, never changes cap,
apron, proportions or the light. ONLY the face and the arms/hands change.

TECH: vertical 9:16 frame, 900x1600, flat uniform chroma-key green background #00FF00, no
gradient, no ground shadow, no props, no frame, no text. Full body, standing.

1. npc_cook_neutral — face: closed, watchful, mouth a straight line | hands: wiping both hands
   on the apron.
2. npc_cook_smile — face: small tired smile, eyes crinkled once | hands: one hand holding a
   wooden spoon, the other loose at his side.
3. npc_cook_smirk — face: one corner of the mouth up, a glance sideways, dry amusement |
   hands: one hand resting on the edge of the apron pocket.
4. npc_cook_stern — face: brows pulled down, mouth set, chin lowered | hands: fists on his hips,
   elbows wide.
5. npc_cook_annoyed — face: eyes half-closed, exhaling through the nose | hands: arms crossed
   over the chest.
6. npc_cook_tired — face: heavy eyelids, mouth slack | hands: one hand pressed to the small
   of his back.
7. npc_cook_surprised — face: brows up, eyes wide, mouth open | hands: both hands raised to
   chest height, palms forward.
8. npc_cook_laugh — face: head tipped back, mouth open, eyes shut | hands: one hand flat on
   his belly, the other slapping his thigh.
9. npc_cook_proud — face: chin up, faint satisfied look | hands: a long ladle resting over
   his shoulder, holding the handle with one hand.
10. npc_cook_sigh — face: eyes closed, the long-suffering expression of a man explaining how
    to breathe | hands: fingers pinching the bridge of his nose.

AVOID: different camera angle, side or back view, walking, action pose, cropped feet or head,
extra or fused fingers, different apron or cap, glossy skin, chibi, kitchen background, floor
shadow, text, watermark.
```

---

## ЗАПРОС 5 · Сэм — 10 новых кадров

**Референс:** `game/assets/sprites/sam_neutral.webp` (у него уже есть 11 эмоций; это добор тех,
которых не хватает по тексту). **Файлы:** `sam_{hollow,caught,ashamed,exhausted,honest,pleading,cornered,whisper,blank,broken_smile}.webp`.

```text
CHARACTER: Sam, 24, tall and loose-limbed, dark wavy hair falling in strands over his
forehead, brown eyes, straight nose, light stubble, a crooked half-smile as his default.
Scout Regiment uniform: light-brown jacket, white shirt, dark breeches with white 3DMG straps,
tall boots. No cloak.

STYLE: Attack on Titan anime style, mid-2010s TV-anime cel shading, thick slightly uneven ink
outline, two-tone cel shadow, muted dusty palette, weathered fabric, no gloss, no sparkles,
no neon. Light: soft cold daylight key from upper left with a weak warm bounce from below.

CAMERA LOCK — identical in all 10 images: same frontal three-quarter view turned to the
viewer's left, same distance, same focal length, same scale, same vertical framing from the
top of the head to the boots, figure centred horizontally, feet at the bottom edge, figure
≈85% of the frame height. He never turns, never steps closer or further, never changes hair,
uniform, proportions or the light. ONLY the face and the arms/hands change.

TECH: vertical 9:16 frame, 900x1600, flat uniform chroma-key green background #00FF00, no
gradient, no ground shadow, no props, no frame, no text. Full body, standing.

1. sam_hollow — face: completely emptied, no joke, no grin, eyes flat and dry, mouth closed |
   hands: hanging loose at his sides, fingers slack.
2. sam_caught — face: eyes flicked to the side, mouth slightly open, caught mid-lie |
   hands: one hand half-lifted at waist height, palm turning outward.
3. sam_ashamed — face: head down, eyes lifted from under the brow, mouth pressed thin |
   hands: fingers of one hand gripping the other wrist.
4. sam_exhausted — face: drawn, eyes closing for a moment, cheeks hollow | hands: both hands
   hanging, shoulders dropped.
5. sam_honest — face: no mask at all, direct look, mouth firm, brows level | hands: open,
   palms turned up, slightly away from the body.
6. sam_pleading — face: brows raised in the middle, lips parted, eyes wet but not crying |
   hands: one hand reaching forward, half-closed.
7. sam_cornered — face: chin up, jaw tight, eyes hard | hands: fists at his sides.
8. sam_whisper — face: head tilted closer, lips barely apart, eyes on someone out of frame |
   hands: one hand cupped near the corner of his mouth.
9. sam_blank — face: no expression at all, staring past the viewer | hands: both hands
   still, one folded over the other in front.
10. sam_broken_smile — face: a smile that stops below the eyes, the corners trembling slightly |
    hands: one hand covering his mouth and chin.

AVOID: different camera angle, side or back view, walking, action pose, cropped feet or head,
extra or fused fingers, different hairstyle, apron or kitchen clothes, glasses, glossy skin,
chibi, background objects, floor shadow, text, watermark. Not crying in any frame — the point
is a man who stopped joking, not a man in tears.
```

---

## ЗАПРОС 6 · Горожане и второстепенные NPC — 10 кадров

**Особый запрос:** здесь 10 кадров = **10 разных людей**, по одному спрайту на каждого.
Референса нет. Камера, свет и зелёный фон — общие, как в остальных запросах.
**Файлы:** `npc_baker.webp`, `npc_old_woman.webp`, `npc_kid.webp`, `npc_confectioner.webp`,
`npc_thread_seller.webp`, `npc_tea_seller.webp`, `npc_paper_seller.webp`, `npc_recruit_holz.webp`,
`npc_beggar.webp`, `npc_offended_customer.webp`.

```text
SCENE CONTEXT: a market town under the 50-metre Wall, early autumn, dusty streets, people who
have seen too many soldiers. Each of the 10 frames is a DIFFERENT person — ordinary townsfolk,
no two alike.

STYLE: Attack on Titan anime style, mid-2010s TV-anime cel shading, thick slightly uneven ink
outline, two-tone cel shadow, muted dusty palette (faded linen, brown wool, flour white),
weathered fabric, no gloss, no sparkles, no neon. Light: pale overcast daylight, key from
upper left, warm bounce from the sunlit stone street.

CAMERA LOCK — identical in all 10 images: same distance, same focal length, same scale, same
vertical framing from the top of the head to the shoes, figure centred horizontally, feet at
the bottom edge, figure ≈85% of the frame height, standing, facing the viewer's left in
three-quarter. No one turns, walks, gestures widely, or comes closer. Each person is alone
and appears once.

TECH: vertical 9:16 frame, 900x1600, flat uniform chroma-key green background #00FF00, no
gradient, no ground shadow, no props beyond what is described, no frame, no text. Full body.

1. npc_baker — a woman in her forties, strong arms, flour to the elbows, headscarf, coarse
   apron over a grey dress, tired kind face | hands: holding a warm cloth bundle of bread
   against her chest.
2. npc_old_woman — a very old woman, bent, grey shawl over her head, deep lines, toothless
   mouth | hands: one hand on an empty wooden bucket, the other leaning on a short stick.
3. npc_kid — a thin boy of about ten, a shirt two sizes too large, barefoot, bare knees,
   grey eyes like a rain puddle, wary and still | hands: both hands pushed into his pockets.
4. npc_confectioner — a fat cheerful man of forty, short beard, white apron dusted with sugar,
   a stained cloth over his shoulder | hands: holding out a small tray of honeyed flatbread.
5. npc_thread_seller — a dry old woman, silver wire woven into her grey hair, narrow sharp
   eyes, dark dress, thimble on one finger | hands: a wooden plate of thread spools balanced
   on her forearm.
6. npc_tea_seller — a young man of twenty-five with a sly narrow-eyed squint, a knitted vest,
   a scarf, ink stains on his fingers | hands: a paper twist of tea held up in one hand.
7. npc_paper_seller — an elderly stooped man in spectacles, a grey shop coat, ink on the cuff,
   an air of utter boredom | hands: an open catalogue in both hands, finger marking a page.
8. npc_recruit_holz — a very tall, thin, awkward recruit of eighteen, uniform a size too
   short, ears bright red, collar twisted | hands: a sheet of paper clutched in both hands.
9. npc_beggar — a gaunt man of thirty-five sitting back on his heels, patched cloak, hollow
   cheeks, no aggression | hands: a wooden bowl held in both hands.
10. npc_offended_customer — a broad woman of fifty, lips pressed shut in disapproval, woollen
    coat, basket on her arm | hands: both hands folded over the basket handle.

AVOID: soldiers in green cloaks in frames 1–7, 9–10, the same face repeated, identical
clothing between frames, different camera angles, side or back view, walking, cropped feet or
head, extra or fused fingers, exaggerated cartoon faces, glossy skin, chibi, market background,
floor shadow, text, watermark.
```

---

## ЗАПРОС 7 · Позы с предметами в руках — 10 кадров

**Особый запрос:** 10 кадров = 10 поз, каждая правится **от золотой базы своего персонажа**
(файл-референс указан в кадре). Камера, масштаб и свет — те же, что в базе.
Руки — главное, что меняется; лицо берётся с базы.

```text
TASK: 10 separate prop poses, one per numbered frame, each made from the attached golden-base
sprite of that character. Keep the exact same camera, distance, scale, framing, hairstyle,
uniform and light as the attached base. Change ONLY the arms and hands, and the small prop.
The face keeps the base expression unless stated. Full body, standing, feet at the bottom edge,
flat chroma-key green background #00FF00, vertical 9:16, 900x1600, no ground shadow, no
background objects, no text.

1. levi_scissors  (ref: levi_neutral.webp) — Levi holds a pair of closed steel scissors up at
   chest height in his right hand, blades slightly open; left hand hangs at his side.
2. hange_scissors (ref: hange_neutral.webp) — Hange holds scissors in the right hand and a
   coarse comb in the left, arms raised to shoulder height as if about to start.
3. erwin_scissors (ref: erwin_neutral.webp) — Erwin holds the scissors low and precisely in his
   LEFT hand, right arm still, as if he is not sure he should be doing this.
4. hange_ladle (ref: hange_neutral.webp) — Hange brandishes a long wooden ladle in her raised
   right hand, the left hand thrown back, caught mid-lunge.
5. levi_teapot (ref: levi_neutral.webp) — Levi pours from a simple round iron teapot held in
   his right hand, left hand steadying the lid, eyes down on the spout.
6. petra_tray (ref: petra_neutral.webp) — Petra carries a small wooden tray with two tin cups
   in both hands at waist height, elbows close to the body.
7. jean_sweets (ref: jean_neutral.webp) — Jean holds a paper twist of candied nuts in one hand
   at chest height and looks at it with suspicion.
8. mikasa_cup (ref: mikasa_neutral.webp) — Mikasa holds a single tin cup in both hands against
   her chest, steam rising.
9. erwin_map (ref: erwin_neutral.webp) — Erwin holds a rolled map in his left hand and a pen in
   the other, the empty right sleeve hanging still.
10. sam_key (ref: sam_neutral.webp) — Sam turns a small iron key between the fingers of one
    hand, the other hand half-open near his pocket, as if he might hide it.

AVOID: rotating the body or changing the camera, changing the uniform or hairstyle, extra
hands, extra or fused fingers, props touching the ground, background objects, floor shadow,
text, watermark. Hands must be anatomically correct — check the finger count before importing.
```

---

# 2. Фоны — 23 промпта

Общая шапка (уже включена в каждый блок): 1080×1920, вертикаль, «тихая» нижняя треть под
окно диалога, важное — в центральных 80% ширины. Людей не рисовать (кроме оговорённых
дальних силуэтов): их заменяют спрайты.

## P0 — место действия не то

### `town_market` · Город, рынок · `ch2_i3` `c_i3_a`–`c_i3_shop`, `c_i3_hub` · 142 шага

```text
Attack on Titan anime background art, dark painterly digital painting, Wit Studio palette,
weathered stone and old dark wood, muted desaturated colours, warm practical light against cold
shadows, dust in the air, no characters in the foreground.

Subject: a crowded market street in a town pressed against the foot of a 50-metre stone Wall.
Wooden stalls with patched canvas awnings, loaves hanging on strings, sacks of grain and
turnips, wooden carts with iron-rimmed wheels, crates, a stone well with a rope and bucket,
cobblestones still dark from morning washing, trampled straw. Above the tiled roofs the immense
grey Wall fills the top of the frame with its vertical seams. A few out-of-focus townsfolk
silhouettes deep in the background, small, faceless, far away.

Light: pale sun filtered through street dust, a warm orange glow spilling out of one open
bakery oven on the left, long soft shadows.

Composition: vertical 9:16, 1080x1920, deep perspective up the street, the stalls framing the
central 80% of the width, the lower third comparatively empty and quiet for a dialogue box and
character sprites, the top 10% safe for UI.

Mood: noisy daylight life that has learned to live under a wall. No soldiers, no text, no
watermarks, no UI, no cartoon faces.
```

### `town_alley` · Город, проулок · `ch2_i3` `c_i3_inc`–`c_i3_k_e`

```text
Attack on Titan anime background art, dark painterly digital painting, weathered stone and old
dark wood, muted desaturated colours, cold shadow with one warm light, dust in the air, no
characters.

Subject: a narrow alley between two-storey town houses, walls so close that they nearly meet
overhead. Plaster falling away in patches to show brick, a sagging laundry line with two grey
shirts, a shuttered window, a barrel and a crate of cabbage heads at the far end, mud and
puddles underfoot, a strip of pale sky above.

Light: cold grey daylight falling from above, one warm window glowing faintly on the right.

Composition: vertical 9:16, 1080x1920, narrow corridor perspective, the walls framing the
central 80% of the width, an empty patch of ground in the lower third for a dialogue box and
sprites.

Mood: somewhere you are followed. No people, no text, no watermarks, no UI.
```

### `hq_kitchen` · Кухня · `ch2_i2` (вся сцена) · 114 шагов

```text
Attack on Titan anime background art, dark painterly digital painting, weathered stone, soot
and old wood, muted desaturated colours, warm firelight against cold daylight, steam in the
air, no characters.

Subject: a working field kitchen inside a stone barracks. A wide hearth of rough stone with an
iron cauldron hanging on a crane and a long-handled ladle resting against it; copper pots on
iron hooks above; a shelf of clay spice jars and paper twists; three sacks of potatoes spilling
open; a chopping table with onions, a scarred board and a knife; a wooden bench; a bucket of
water; sooty beams and a low ceiling.

Light: strong warm orange light from the hearth fire on the right, cold grey daylight from a
small high window on the left, steam catching the light.

Composition: vertical 9:16, 1080x1920, hearth and cauldron at the centre of the middle third,
the working floor in the lower third left quiet for a dialogue box and sprites, top 10% safe.

Mood: warm, crowded, honest work. No people, no text, no watermarks, no UI.
```

### `hq_stables` · Конюшня · `ch2_i1` (вся сцена) · 91 шаг

```text
Attack on Titan anime background art, dark painterly digital painting, old timber and stone,
muted desaturated colours, warm dusty light against deep shadow, dust in the air, no characters.

Subject: the interior of a stone-and-timber stable. A row of stalls along the left wall with
half-doors and horse heads looking out — the nearest is a dappled bay mare with a white star on
her forehead, calm and unimpressed; hay on the floor, bales stacked at the far end, saddles and
bridles hanging on pegs, a wooden bucket, a pitchfork, cobwebs in the roof beams, a shaft of
dusty light from the open door.

Light: warm late-morning sun through the door in the right foreground, deep brown shadow in the
stalls, floating dust.

Composition: vertical 9:16, 1080x1920, the stall row receding along the left, the aisle open in
the centre and lower third for a dialogue box and sprites, top 10% safe.

Mood: warm, animal, patient. No people, no text, no watermarks, no UI.
```

### `warehouse_loft` · Чердак почтового склада · `ch2_c7` `c7_w_*`–`c7_after` · 167 шагов ★

```text
Attack on Titan anime background art, dark painterly digital painting, old dust-covered timber,
muted desaturated colours, one warm lantern light below against cold darkness, dust in the air,
no characters.

Subject: viewed FROM INSIDE a warehouse loft, lying at floor level: wide uneven floorboards with
narrow gaps between them in the foreground, low dark roof beams, bundles of old hay, dust and
mouse droppings, a square trapdoor with a wooden ladder going down. Through the gaps in the
boards, far below, the warehouse hall is visible: crates and boxes under coarse matting, an old
scarred table, and a single shuttered lantern on a hook throwing a narrow warm pool of light.

Light: one warm lantern from below shining up through the board gaps and drawing bright thin
lines across the loft floor, everything else in cold blue-black shadow.

Composition: vertical 9:16, 1080x1920, the board gaps and the lit hall below filling the middle
third, the loft floor in the lower third usable for a dialogue box and sprites lying down, the
top 10% safe.

Mood: you are hiding above someone. Claustrophobic, breath held. No people, no text, no
watermarks, no UI.
```

### `hq_courtyard_night` · Двор ночью · `ch2_c0` `c0_go`

```text
Attack on Titan anime background art, dark painterly digital painting, weathered stone, muted
desaturated colours, one warm lantern against cold night, no characters.

Subject: a barracks courtyard at night, seen from a low side door of a storehouse. Wet
cobblestones with a thin sheen of water, a narrow side door standing open in the south wall, a
wooden crate and a barrel beside it, iron gate, the high stone wall with a narrow walkway on
top, a lantern with a metal shutter held low, its beam cut into a narrow wedge.

Light: a single warm lantern beam sweeping low across wet stone, deep blue-black night beyond,
cold moonlight on the wall top.

Composition: vertical 9:16, 1080x1920, the door and the lit patch of stones in the middle
third, open dark ground in the lower third for a dialogue box and sprites, top 10% safe.

Mood: two people waiting in the dark for you. No people, no text, no watermarks, no UI.
```

### `hq_courtyard_storm` · Двор в бурю · `ch2_i6` `c_i6_up`–`c_i6_pe`

```text
Attack on Titan anime background art, dark painterly digital painting, weathered stone and
slate, muted desaturated blue-grey palette, one failing warm lantern, no characters.

Subject: the barracks courtyard during a night downpour. Sheets of rain driven sideways, water
streaming from the eaves, a wooden bucket rolling across the flooded cobbles, a shutter torn
loose and banging, a rope line whipping in the wind, a ladder fallen against the wall, dark
barracks windows, the roof edge out of frame above.

Light: one lantern swinging and half-shielded by a hand, its warm light breaking into streaks
through the rain, the rest cold blue-black storm light.

Composition: vertical 9:16, 1080x1920, the flooded yard in the lower half, the lit doorway and
the swinging lantern in the middle third, top 10% safe.

Mood: chaos, water, urgency. No people, no text, no watermarks, no UI.
```

### `wall_view_night` · Стена ночью · `ch2_c6` `c6_w_*`, финал `ch2_c8`

```text
Attack on Titan anime background art, dark painterly digital painting, ancient stone, muted
desaturated palette, cold moonlight and one warm lantern, no characters.

Subject: the top of the great Wall at night. The wide stone walkway, a crenellated parapet, an
iron lantern on a bracket casting a small circle of light, wind-blown grit sliding along the
stones, the plain far below dissolving into black, a thin crescent moon and hard cold stars.

Light: cold blue moonlight on the stone, a small warm lantern pool, deep black void beyond the
parapet.

Composition: vertical 9:16, 1080x1920, the parapet and lantern in the middle third, the walkway
in the lower third left open for a dialogue box and sprites, the sky in the upper third.

Mood: wind, height, loneliness, one honest conversation. No people, no text, no watermarks,
no UI.
```

### `hq_parade_dawn` · Плац на рассвете · `ch2_c6` `c6_s_si`–`c6_after` · 83 шага ★

```text
Attack on Titan anime background art, dark painterly digital painting, weathered stone and
trampled earth, muted desaturated palette, cold dawn light with one warm edge, ground mist, no
characters.

Subject: the parade ground of the Survey Corps at first light. A wide square of trodden earth
bounded by the barracks wall and a stone gallery, banners hanging limp on poles, a wooden
platform at the far end, the Wall rising huge and grey in the background, low mist lying in
patches, the ground swept in long parallel lines.

Light: flat cold blue-grey dawn, the first warm copper light just touching the top of the Wall
and the banner poles, faint shadow of the buildings across the square.

Composition: vertical 9:16, 1080x1920, the empty square and platform in the middle third, the
swept ground in the lower third left deliberately empty — an oath is taken here and sprites
will stand on it — top 10% safe.

Mood: solemn, cold, breath held. No people, no rows of soldiers, no text, no watermarks, no UI.
```

### `hq_infirmary` · Лазарет · `ch2_i8` `c_i8_a`–`c_i8_after` · 51 шаг

```text
Attack on Titan anime background art, dark painterly digital painting, worn wood and white
plaster, muted desaturated palette, warm candlelight against cold window light, no characters.

Subject: a small infirmary room inside the barracks. Two iron beds with grey blankets, a wooden
side table with a chipped basin of warm water, a folded stack of linen bandages, brown glass
bottles, a candle, a folding screen, a narrow window with small panes, a stool, a rag rug on
the board floor.

Light: warm candle glow from the table on the right, cold grey morning light through the window
on the left, soft dust in the beam.

Composition: vertical 9:16, 1080x1920, the basin and bandages in the middle third, free floor in
the lower third for a dialogue box and sprites, top 10% safe.

Mood: quiet, warm, a room where someone just stopped being afraid. No people, no blood, no
text, no watermarks, no UI.
```

## P1 — время суток и подлокации

### `han_lab_night` · Лаборатория ночью · `ch2_c5p`, `ch2_c8` `c8_dos_hook`

```text
Attack on Titan anime background art, dark painterly digital painting, glass, old paper and
iron, muted desaturated palette, a single warm lamp against deep shadow, no characters.

Subject: the same cluttered laboratory at night — shelves of glass alembics and bottles, stacks
of paper and folders, pinned anatomical drawings, a blackboard with chalk marks, a heavy work
table. Now only one oil lamp is burning; the glass throws broken highlights; every object casts
two long shadows on the wall; the windows are black mirrors.

Light: one warm oil lamp at the centre of the table, hard shadow doubling, cold darkness at the
edges.

Composition: vertical 9:16, 1080x1920, the lit table in the middle third, the dark floor in the
lower third for a dialogue box and sprites, top 10% safe.

Mood: after hours, secrets and lamp oil. No people, no text, no watermarks, no UI.
```

### `hq_rooftop_dusk` · Крыша на закате · `ch2_c4` `c4_dbt_a_0`–`c4_no_end` · 48 шагов

```text
Attack on Titan anime background art, dark painterly digital painting, slate tiles and brick,
muted desaturated palette, warm sunset low light against cool shadow, no characters.

Subject: the roof of the barracks at dusk. Slate tiles, a brick chimney with an iron cap, a low
parapet, the town and the great Wall far below and away, chimney smoke, a bucket and a coil of
rope on the tiles, the drop on the right steep and visible.

Light: low warm orange sun on the horizon lighting the tiles edge-on, long purple shadows
stretching toward the viewer, cool blue in the shade.

Composition: vertical 9:16, 1080x1920, the chimney and the roof edge in the middle third, the
tiles in the lower third flat and open for a dialogue box and sprites sitting on them, top 10%
safe.

Mood: the end of a long day, one difficult conversation. No people, no text, no watermarks,
no UI.
```

### `hq_rooftop_dawn` · Крыша на рассвете · `ch2_i7` `c_i7_s0`, `c_i7_s1`

```text
Attack on Titan anime background art, dark painterly digital painting, slate and brick, muted
desaturated palette, pale cold pre-sunrise light, mist, no characters.

Subject: the same roof just before sunrise. Grey-blue slate, the chimney silhouette, thin
morning mist filling the valley below, a thin thread of smoke from a far house, the Wall a
dark line on the horizon, dew on the tiles.

Light: flat cold blue-grey, the east barely lightening, no direct sun, soft haze.

Composition: vertical 9:16, 1080x1920, the chimney and ridge line in the middle third, the tiles
in the lower third open for a dialogue box and sprites, the pale sky in the upper third.

Mood: the end of a night watch, quiet and clean. No people, no text, no watermarks, no UI.
```

### `warehouse_dusk` · Склад снаружи, сумерки · `ch2_c7` (подход)

```text
Attack on Titan anime background art, dark painterly digital painting, old stone and rotting
wood, muted desaturated palette, cold dusk with one warm lamp, no characters.

Subject: an old postal storehouse at the edge of town, where the houses end and the fields
begin. A squat stone building with a mossy roof, one boarded-up window, a heavy door with an
iron ring, a lantern over the door, tall grass and wheel ruts around it, the great Wall hanging
behind, open fields to the left, a wagon rut filled with water.

Light: deep blue dusk, one warm lantern above the door, the last dull band of sunset on the
Wall.

Composition: vertical 9:16, 1080x1920, the door and lantern in the middle third, open ground in
the lower third for a dialogue box and sprites, top 10% safe.

Mood: somewhere you do not want to be after dark. No people, no text, no watermarks, no UI.
```

### `hq_training_yard` · Двор с подвесной рамой · `ch2_c3` (128 шагов)

```text
Attack on Titan anime background art, dark painterly digital painting, weathered stone and
rope, muted desaturated palette, flat cold daylight, dust, no characters.

Subject: the training corner of the barracks courtyard. A suspended training frame: two thick
ropes hanging from a heavy timber crossbar, a worn leather harness with buckles hanging empty
between them, sand and trodden earth underneath, a wooden sparring post, coiled ropes, the
stone gallery of the barracks behind with an arched balcony, banners, a wooden bucket.

Light: flat cold overcast daylight, soft shadows, dust raised by feet.

Composition: vertical 9:16, 1080x1920, the frame and hanging harness in the middle third, open
sand in the lower third for a dialogue box and sprites, top 10% safe.

Mood: an ordinary morning and an impossible body. No people, no text, no watermarks, no UI.
```

### `road_dusk` · Дорога под стеной · `ch2_c7` `c7_ride_*`

```text
Attack on Titan anime background art, dark painterly digital painting, dust and stone, muted
desaturated palette, cold dusk with a warm west edge, no characters.

Subject: a wide dirt road running along the foot of the great Wall at dusk. Deep wheel ruts,
dry grass along the edges, a stone milestone, a leaning wooden signpost, dung and hoof prints,
a low fence, open grey fields to the left, the Wall rising on the right and vanishing into haze
ahead.

Light: last low warm light from the west raking across the ruts, cold blue in the shadows of
the Wall.

Composition: vertical 9:16, 1080x1920, the road receding toward the centre of the middle third,
empty road surface in the lower third for a dialogue box and sprites, top 10% safe.

Mood: leaving, in silence. No people, no horses, no riders, no text, no watermarks, no UI.
```

### `hq_roof_storm` · Крыша казармы в бурю · `ch2_i6` `c_i6_game`, `c_i6_ladder`

```text
Attack on Titan anime background art, dark painterly digital painting, wet slate and timber,
muted desaturated blue-grey palette, one warm lantern from below, no characters.

Subject: the barracks roof during a night storm. Slick wet slate tiles, a gap where broken
tiles have been torn away, a wooden ladder hooked over the edge, rain driving in sheets, a
coil of rope, a sack of spare tiles wedged against a chimney, the dark courtyard far below with
a single lantern beam cutting up through the rain.

Light: one warm lantern from below lighting the rain streaks, cold blue-black storm sky, wet
highlights on every tile.

Composition: vertical 9:16, 1080x1920, the hole and the ladder in the middle third, wet tiles in
the lower third for a dialogue box and sprites lying or crouching, top 10% safe.

Mood: wind, height, cold water, hands working blind. No people, no text, no watermarks, no UI.
```

### `dream_memory` · Сон / память · `ch2_c3` (ночь), `ch2_c4` `c4_ocean`

```text
Attack on Titan anime background art, painterly and softly abstract, muted desaturated palette,
a single warm lamp of light in deep darkness, no characters, no faces.

Subject: a memory rather than a place. Soft darkness on all sides, a warm pool of lantern light
in the middle, the blurred suggestion of a room — a chair, a folded blanket, a low beam — that
never resolves into details, faint film grain and dust drifting in the light. Edges of the frame
dissolve into warm brown-black.

Light: one warm amber source in the centre, everything else fading to darkness, gentle bloom.

Composition: vertical 9:16, 1080x1920, the lit area in the middle third, the dark lower third
usable for a dialogue box and sprites, top 10% safe.

Mood: a lullaby heard from another life. Nothing sharp, nothing frightening. No people, no
faces, no text, no watermarks, no UI.
```

## P2 — полировка

### `hq_mess_hearth` · Угол у печи · `ch2_i4` (86 шагов)

```text
Attack on Titan anime background art, dark painterly digital painting, old wood and cast iron,
muted desaturated palette, warm firelight against cold shadow, no characters.

Subject: the far corner of the mess hall around a cast-iron stove. Fire glowing through the
open door of the stove, a blackened kettle on top, tin cups and a chipped pot on a low table,
benches pulled close, a rope strung along the beams with two wet shirts drying, buckets
underneath catching drips, sacks in the shadow.

Light: warm orange fire from the stove door low in the frame, cold grey light from the far
windows, floating embers.

Composition: vertical 9:16, 1080x1920, the stove and kettle in the middle-lower third, bench
space in the lower third for a dialogue box and sprites sitting, top 10% safe.

Mood: the one warm place in the building. No people, no text, no watermarks, no UI.
```

### `road_rain` · Дорога под дождём · `ch2_c7` (возвращение)

```text
Attack on Titan anime background art, dark painterly digital painting, wet earth and stone,
muted desaturated palette, flat grey rainy light, no characters.

Subject: the same road along the Wall, now in steady rain. Ruts filled with grey water
reflecting the sky, drenched grass bent flat, the milestone dark and slick, mist hanging against
the Wall, a single distant lantern smeared by rain.

Light: flat cold grey, wet reflective highlights on every surface, no direct sun.

Composition: vertical 9:16, 1080x1920, the road and puddles in the middle third, wet empty road
in the lower third for a dialogue box and sprites, top 10% safe.

Mood: tired silence under rain. No people, no horses, no text, no watermarks, no UI.
```

### `hq_gate_dawn` · Ворота на рассвете · `ch2_c0` (финал)

```text
Attack on Titan anime background art, dark painterly digital painting, weathered stone and
iron-bound timber, muted desaturated palette, cold dawn light, no characters.

Subject: the main gate of the barracks at dawn. Heavy timber gates standing open, iron bands
and studs, a guard post with a stool and a lantern going out, a stone arch, a bell rope,
cobblestones wet with dew, the empty road visible through the gateway, the Wall beyond.

Light: cold blue-grey dawn, one dying warm lantern, pale sky through the arch.

Composition: vertical 9:16, 1080x1920, the gateway in the middle third with clear view through
it, open cobbles in the lower third for a dialogue box and sprites, top 10% safe.

Mood: someone is out there, waiting to be seen. No people, no horse, no rider, no text, no
watermarks, no UI.
```

### `hq_corridor_dawn` · Коридор на рассвете · `ch2_c0` `c0_s_end`, `ch2_c2` `w1_night`

```text
Attack on Titan anime background art, dark painterly digital painting, weathered stone and old
dark timber, muted desaturated palette, cold grey dawn light, no characters.

Subject: the barracks corridor at first light — the same corridor as the day version, but the
narrow windows on the right now spill grey morning light, the sconces are out, doors stand
closed, a bucket and a folded cloth by one door, cold blue shadows along the floor.

Light: cold grey-blue from the right-hand windows, no warm light at all, long soft shadows.

Composition: vertical 9:16, 1080x1920, the corridor receding into the centre of the middle
third, the stone floor in the lower third for a dialogue box and sprites, top 10% safe.

Mood: the hour when nobody speaks. No people, no text, no watermarks, no UI.
```

### `cell_night` · Камера ночью · `ch2_c4` `c4_arrested`

```text
Attack on Titan anime background art, dark painterly digital painting, rough stone, muted
desaturated palette, cold moonlight with no warm light, no characters.

Subject: a cell at night. Rough stone walls, a heavy door with a small barred slot, a narrow
barred window high in the wall casting a thin bar of moonlight onto the floor, a straw pallet,
a wooden bucket, a scratched tally on the wall, damp stains.

Light: cold blue moonlight through the bars, a hard thin light bar on the floor, everything
else in deep shadow.

Composition: vertical 9:16, 1080x1920, the window and the bar of light in the middle third, the
floor and pallet in the lower third for a dialogue box and sprites, top 10% safe.

Mood: waiting, without cruelty. No people, no blood, no text, no watermarks, no UI.
```

---

# 3. CG — 9 промптов

CG рисуются тем же конвейером, что фоны (1080×1920, WebP q80), но с персонажами:
к промпту прикладывать золотую базу героя как референс внешности.
После импорта — запись в `game.json → gallery` и шаг `{ "cg": "<id>" }`.

### `ch2_tag` · Жетон на ладони · `ch2_c5p` `c5p_t_a`

```text
Cinematic close-up key art, Attack on Titan anime style, dark painterly rendering, muted
desaturated palette, warm lamplight, shallow depth of field.

Subject: a small flat bone tag, the size of a thumbnail, lying on an open young woman's palm.
Along its edge runs a row of tiny carved signs that look like writing without letters; one sign
has been scraped away with a knife, deliberately, leaving a pale rough notch. A strip of dirty
boot-lace ribbon lies beside it. The fingers are dusty, one with a small scab. In the blurred
background: a barracks cot, a folded grey blanket, a candle flame.

Light: one warm candle from the left, deep brown shadow around, the bone tag catching the light.

Composition: vertical 9:16, 1080x1920, the hand and tag in the centre, space above and below.

Mood: recognition through fingers, not eyes. No text, no watermark, no UI.
```

### `ch2_haircut` · Стрижка · `ch2_c6` `c6_h_a` / `c6_h_b`

```text
Cinematic key art, Attack on Titan anime style, dark painterly rendering, muted desaturated
palette, cold morning window light.

Attach as appearance reference: the golden sprite of Masha and the golden sprite of her mentor.

Subject: a small barracks room in the morning. Masha sits on a plain wooden stool, seen from the
side and slightly behind, a rough cloth around her shoulders, her long ash-blond hair loose down
her back. Behind her stands her mentor holding open steel scissors at her nape; the first thick
lock has just been cut and is falling, caught mid-air, onto her knees. On the table: a comb, a
basin, a folded towel. Her face in profile is calm and very still, eyes open, looking at
nothing.

Light: cold grey morning light through a narrow window from the left, one warm candle on the
table, long soft shadows.

Composition: vertical 9:16, 1080x1920, the two figures in the middle third, the falling lock of
hair as the focal point.

Mood: a quiet, irreversible moment. No blood, no drama, no text, no watermark, no UI.
```

### `ch2_oath` · Присяга · `ch2_c6` `c6_o_corps`

```text
Cinematic key art, Attack on Titan anime style, dark painterly rendering, muted desaturated
palette, cold dawn light with one warm copper edge.

Attach as appearance reference: golden sprites of Masha and Erwin.

Subject: the parade ground at first light. Masha stands alone in the centre in full Survey Corps
uniform with the wings insignia on her collar, short hair moving slightly in the wind, chin up,
hands at her sides. Facing her, three paces away, stands Erwin in his green cloak, his empty
right sleeve hanging still. Behind them, two long rows of soldiers stand at attention in
silhouette, faces indistinct. Low mist on the trodden ground, banners hanging limp, the great
Wall behind everything.

Light: flat cold blue-grey dawn, the first warm light touching the top of the Wall and the
edges of the cloaks.

Composition: vertical 9:16, 1080x1920, the two figures in the centre of the middle third, the
rows receding into the depth, open ground in the lower third.

Mood: solemn, cold, a promise that cannot be taken back. No text, no watermark, no UI.
```

### `ch2_grey_cloak` · Серый плащ под фонарём · `ch2_c7` `c7_cloak`

```text
Cinematic key art, Attack on Titan anime style, dark painterly rendering, muted desaturated
palette, one warm lantern in a dark warehouse.

Subject: the interior of an old storehouse at night, seen from a high corner as if through a gap
in the ceiling boards. Below, among crates under coarse matting and an old scarred table, stands
a man in a grey travelling cloak, the hood pushed back. A thin pale scar crosses above his left
eyebrow; his grey eyes are lifted straight up toward the viewer, into the dark. His right hand
is just lowering from his mouth. In the foreground, blurred, the edges of the floorboards and a
few strands of hay.

Light: one shuttered lantern on a hook throwing a narrow warm cone on the floor and up his face,
deep cold darkness everywhere else.

Composition: vertical 9:16, 1080x1920, the man in the lower-middle third seen from above, the
board edges framing the top of the frame.

Mood: he knows exactly where you are. No weapon, no monster, just a polite man in the wrong
place. No text, no watermark, no UI.
```

### `ch2_storm_roof` · Крыша в бурю · `ch2_i6` `c_i6_up`

```text
Cinematic key art, Attack on Titan anime style, dark painterly rendering, muted desaturated
blue-grey palette, one warm lantern from below.

Attach as appearance reference: golden sprites of Masha, Jean and Mikasa.

Subject: the barracks roof at night in a downpour. A chain of people passes roof tiles hand to
hand along the wet ridge: Masha lies flat against the tiles, soaked hair plastered to her face,
reaching for a heavy tile; Jean braces a wooden ladder at the edge, water running down his arms;
Mikasa hauls a sack of tiles up. Rain drives in visible sheets, a gap of torn tiles opens black
behind them, a lantern beam from below cuts up through the water.

Light: one warm lantern beam from below, cold blue-black storm above, hard wet highlights on
every surface.

Composition: vertical 9:16, 1080x1920, the chain of hands and the tile as the focal point in the
middle third, the drop and the dark courtyard in the lower third.

Mood: cold, blind, stubborn work, and something close to joy. No text, no watermark, no UI.
```

### `ch2_lullaby` · Колыбельная · `ch2_c3` (ночь), `ch2_i4` `c_i4_m1`

```text
Cinematic key art, Attack on Titan anime style, soft painterly rendering, muted warm palette,
a single pool of firelight in deep darkness.

Subject: a memory, not a scene. A young woman sits in the dark with a child she cannot see
clearly — only a small hand gripping the sleeve of her shirt, a fold of a blanket, the curve of
a sleeping shoulder. Her mouth is slightly open, singing without words. Her own face is lit from
below and half-turned away; the child's face is turned into her arm and never visible.
Everything outside the small warm circle is soft warm brown-black.

Light: a low warm fire or lamp light from below, gentle bloom, grain in the shadows.

Composition: vertical 9:16, 1080x1920, the two figures in the middle third, darkness around.

Mood: tenderness and fear at the same time. No visible faces of the child, no text, no
watermark, no UI.
```

### `ch2_names_list` · Лист с именами · `ch2_c8` `c8_news`

```text
Cinematic close-up key art, Attack on Titan anime style, painterly rendering, muted aged-paper
palette, warm lamplight.

Subject: a long official sheet of paper lying on a dark wooden table, lit by a lamp from the
left. A dense column of names written in cramped clerk's cursive, with small marks beside many
of them. Several names are struck through with a single thin line — not scratched out, only
crossed once, as if the hand hesitated. Near the middle one entry reads "Vidar … family …" with
a small annotation beside it. A man's left hand rests at the edge of the sheet, fingers still;
his right sleeve is empty and pinned.

Light: one warm lamp from the upper left, the paper glowing, the edges of the table falling into
darkness.

Composition: vertical 9:16, 1080x1920, the sheet on the diagonal across the middle third, the
hand at the lower edge.

Mood: a list of the missing, read by one of them. No readable modern text, no watermark, no UI.
Keep the writing stylised and partly illegible.
```

### `ch2_wall_end` · Финал на стене · `ch2_c8` (последний блок)

```text
Cinematic key art, Attack on Titan anime style, dark painterly rendering, muted desaturated
palette, night sky and one lantern.

Attach as appearance reference: golden sprite of Masha after the haircut (masha_short).

Subject: the top of the great Wall at night. Masha stands at the parapet with her back half to
the viewer, short hair blown sideways by the wind, the wings insignia on her collar, both hands
resting on the cold stone. Beyond the parapet, the land stretches away into darkness — fields,
a road, and far off the faint suggestion of water with no far shore. Behind her, one iron
lantern burns low.

Light: cold starlight and a thin moon on the stone, one warm lantern behind her rimming her
shoulder and hair.

Composition: vertical 9:16, 1080x1920, the figure in the lower-middle third, the empty dark land
and sky filling the upper half — deliberately empty for the chapter title card.

Mood: an ending that is also a question. No text, no watermark, no UI.
```

### `menu_ch2` · Обложка меню после Главы 2

```text
Vertical key art / cover illustration, Attack on Titan anime style, dark painterly rendering,
muted desaturated palette, cold blue night with one warm accent.

Attach as appearance reference: golden sprite of Masha (short hair, uniform).

Subject: Masha in Survey Corps uniform standing on the rampart of the Wall at night, three-
quarter view, looking away over the dark land, wind in her short hair, the cloak lifting. Behind
her, ghosted into the sky like a memory, the outline of the wings of freedom emblem and a faint
row of carved signs, half-dissolved. The lower two-thirds hold the figure; the upper third is
deliberately empty dark sky for a large title.

Light: cold moonlight from the left, one warm lantern glow low on the right.

Composition: vertical 9:16, 1080x1920, generous empty space at the top, figure in the lower
middle, no text, no logo, no watermark, no UI.
```

---

# 4. Музыка и звук

## Музыка — 8 петель (45–60 с, бесшовные, `.ogg` + `.mp3`)

| id | Промпт |
|---|---|
| `hq_life` | `Instrumental loop, 55 s, seamless, 92 BPM, warm acoustic guitar and soft muted strings over a light wooden pulse, calm daily routine in an old barracks, minor key, no vocals, no drums kit, loopable ending into the first bar.` |
| `hq_warm` | `Instrumental loop, 60 s, seamless, 64 BPM, solo piano with a faint cello underneath, intimate, slightly sad but safe, like a kitchen at midnight, sparse left hand, no vocals, no percussion.` |
| `hq_tension` | `Instrumental loop, 45 s, seamless, 70 BPM, low sustained strings, a slow rising dissonant pad, distant muffled heartbeat, subtle, no melody lead, no vocals, no hits.` |
| `lab_pizz` | `Instrumental loop, 50 s, seamless, 104 BPM, pizzicato strings, bassoon and a small bell, curious and slightly comic, no vocals, no drums beyond a light woodblock.` |
| `night_watch` | `Instrumental loop, 60 s, seamless, 56 BPM, solo cello with a low drone and a single distant flute phrase, cold night wind between phrases, quiet, no vocals.` |
| `market` | `Instrumental loop, 50 s, seamless, 110 BPM, hurdy-gurdy and fiddle, light hand drum, bustling market in a medieval town, warm and slightly rough, no vocals.` |
| `storm` | `Instrumental loop, 45 s, seamless, 128 BPM, driving low strings, irregular toms, metal percussion, rising pressure, no melodic lead, no vocals.` |
| `oath` | `Instrumental cue, 60 s, slow build from 50 to 72 BPM, solo horn melody over low strings, then full ensemble with a single snare roll, solemn and cold, ends on an unresolved chord, no vocals.` |

## Звуки — 20 (короткие, кроме петель)

| id | Промпт |
|---|---|
| `scissors` | `Two clean metal scissor snips close to the microphone, dry, with a short ringing tail, quiet room ambience.` |
| `rain` | `Seamless loop, 30 s, steady rain on a stone courtyard, distant drips, no thunder, no music.` |
| `rain_heavy` | `Seamless loop, 30 s, heavy downpour on roof tiles and puddles, wind gusts, dense water texture.` |
| `thunder` | `One distant rolling thunder, 4 s, low and long, no crack, tail fading into rain.` |
| `wind` | `Seamless loop, 25 s, high wind around stone walls, thin whistle in the gaps, no music.` |
| `tiles` | `Ceramic roof tiles sliding and clattering onto wet stone, several impacts, a dull break at the end.` |
| `bell` | `A single iron watchtower bell, medium size, 3 s, struck once, long decay, outdoor distance.` |
| `horse_sniff` | `A horse snorts close up, soft breath, leather bridle creak, stable background.` |
| `hooves` | `Seamless loop, 20 s, slow walking hooves on packed dirt, bridle jingle, distant horse breath.` |
| `teapot` | `A metal teapot set down on wood, lid clink, small ceramic scrape.` |
| `pour` | `Hot liquid pouring into a tin cup, 4 s, thin stream fading to drips.` |
| `paper` | `A folded letter opened, crisp paper and a wax-free envelope, short.` |
| `keys` | `A ring of iron keys lifted and turned in a lock, two heavy metallic clicks.` |
| `knock` | `Two short knocks on a wooden door, firm and quiet, no echo.` |
| `crowd` | `Seamless loop, 25 s, distant market crowd, indistinct voices, a cart wheel, no words audible.` |
| `coin` | `Two small coins dropped and rolled on stone, 2 s.` |
| `rope_creak` | `Taut hemp rope creaking under weight, slow creak and a small snap of fibres.` |
| `fire` | `Seamless loop, 25 s, cast-iron stove burning, soft crackle, occasional settling log.` |
| `door_wood` | `An old ungreased wooden door with an iron latch opening slowly, hinge groan and a latch clack.` |
| `steps_stone` | `Boots on stone corridor, four steps, unhurried, medium close perspective.` |

---

# 5. Импорт

## Манифест спрайтов

Добавить в `game/assets/sprites/manifest.json` (фрагмент — остальные по образцу):

```json
{
  "grey_cloak": {
    "name": "Серый плащ",
    "color": "#8d94a0",
    "neutral":      { "file": "grey_cloak_hooded.webp",          "height": 0.62 },
    "hooded":       { "file": "grey_cloak_hooded.webp",          "height": 0.62 },
    "hooded_lantern": { "file": "grey_cloak_hooded_lantern.webp","height": 0.62 },
    "hooded_gloves":{ "file": "grey_cloak_hooded_gloves.webp",   "height": 0.62 },
    "reveal":       { "file": "grey_cloak_reveal.webp",          "height": 0.62 },
    "cold":         { "file": "grey_cloak_cold.webp",            "height": 0.62 },
    "smirk":        { "file": "grey_cloak_smirk.webp",           "height": 0.62 },
    "talk":         { "file": "grey_cloak_talk.webp",            "height": 0.62 },
    "bow":          { "file": "grey_cloak_bow.webp",             "height": 0.62 },
    "cornered":     { "file": "grey_cloak_cornered.webp",        "height": 0.62 },
    "notebook":     { "file": "grey_cloak_notebook.webp",        "height": 0.62 }
  },
  "masha_short": {
    "name": "Маша",
    "neutral": { "file": "masha_short_neutral.webp", "height": 0.532 },
    "smirk":   { "file": "masha_short_smirk.webp",   "height": 0.532 }
  }
}
```

`masha_uniform` и `masha_short` — **разные ключи**: в сценах до присяги `char: "masha_uniform"`,
после — `char: "masha_short"`. Тот же приём, что с двумя базами в `plan.md`.

## Фоны

`game/assets/bg/index.json` — дописать 23 id из раздела 2 (по одному в строку, без `.webp`).

## CG

```json
"gallery": [
  { "id": "ch2_tag",        "title": "Жетон на ладони" },
  { "id": "ch2_haircut",    "title": "Стрижка" },
  { "id": "ch2_oath",       "title": "Присяга" },
  { "id": "ch2_grey_cloak", "title": "Серый плащ" },
  { "id": "ch2_storm_roof", "title": "Крыша в бурю" },
  { "id": "ch2_lullaby",    "title": "Колыбельная" },
  { "id": "ch2_names_list", "title": "Список имён" },
  { "id": "ch2_wall_end",   "title": "На стене" }
]
```

Файлы — `game/assets/cg/<id>.webp` (папку создать). `menu_ch2` идёт не в галерею,
а в `game.json → menuBg`.

## Команды

```bash
python3 tools/make_sprite.py raw/grey_cloak_reveal.png -o game/assets/sprites/grey_cloak_reveal.webp
python3 tools/make_sprite.py raw/town_market.png --bg --size 1080x1920 -o game/assets/bg/town_market.webp
python3 tools/make_sprite.py raw/ch2_oath.png   --bg --size 1080x1920 -o game/assets/cg/ch2_oath.webp
node tools/lint_scenes.mjs        # ✓ ошибок нет
```

## Если модель «крутит» ракурс

1. Всегда работайте от золотой базы в режиме редактирования, сила 0.45–0.6.
2. В промпт кадра добавьте: `same body, same camera, no rotation, no change of pose below the shoulders`.
3. Приём: генерировать шире (1024×1792), потом обрезать по силуэту — `make_sprite.py` и так
   центрует и прижимает ноги к нижнему краю.
4. Если дрейфует прядь или пуговица — лечить не промптом, а правкой от той же базы по одному
   кадру; так и записано в `plan.md` (пункт «план Б»).

---

# 6. Порядок заказов

| № | Запрос | Кадров | Приоритет | Закрывает |
|---|---|---|---|---|
| 1 | Серый плащ | 10 | P0 | антагонист C7, у которого сейчас нет ни одного пикселя |
| 2 | Маша в форме | 10 | P0 | «форма выдана» в C1, все диалоги главы |
| 3 | Маша после стрижки | 10 | P1 | C6–C8, CG, меню |
| 4 | Повар | 10 | P1 | `ch2_i2`, 114 шагов с одним `neutral` |
| 5 | Сэм (добор) | 10 | P1 | `sam_hollow` и сцены допроса |
| 6 | Горожане | 10 | P1 | `ch2_i3` целиком (142 шага без людей) |
| 7 | Позы с предметами | 10 | P2 | стрижка у трёх наставников, кухня, чай |
| — | Фоны P0 | 10 | P0 | место действия в 22% шагов главы |
| — | CG | 9 | P1 | галерея с нуля |
| — | Музыка | 8 | P1 | в главе нет ни одной темы |
| — | Звуки | 20 | P1 | стрижка, дождь, лошади, колокол |
| — | Фоны P1/P2 | 13 | P2 | время суток, полировка |

**Не рисовать заново, а просто поставить в сцену:** `erwin.salute`, `erwin.inspiring`,
`mikasa.killer`, `mikasa.melancholy`, `eren.rage`, `eren.awe`, `eren.embarrassed`,
`eren.crying`, `armin.crying`, `sam.plotting`, `levi.eyes_closed` — они уже в манифесте
и ни разу не использованы.
