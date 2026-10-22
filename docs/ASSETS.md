# Ассеты: спрайты, фоны, CG, звук

После добавления любого файла — `node tools/lint_scenes.mjs`: он проверяет, что всё
подключено и всё подключённое существует.

| Тип | Папка | Размер | Формат | Подключение |
|---|---|---|---|---|
| Спрайт | `game/assets/sprites/` | 675×1200, альфа | WebP q85 | `sprites/manifest.json` |
| Фон | `game/assets/bg/` | 720×1280 | WebP q75–80 | `bg/index.json` |
| CG | `game/assets/cg/` | 720×1280 (можно 1080×1920) | WebP q80 | `game.json → gallery` |
| Музыка | `game/assets/audio/` | петля | `.ogg` + `.mp3` | `game.json → audio.bgm` |
| Звук | `game/assets/audio/` | короткий | `.ogg` + `.mp3` | `game.json → audio.sfx` |

## Спрайты

- Полный рост, фигура по центру, **ноги у нижнего края**, взгляд/разворот **влево**
  (в слоте `left` движок зеркалит сам).
- Имя файла: `<персонаж>_<эмоция>.webp`.
- `manifest.json`:
```json
{
  "levi": {
    "name": "Леви",
    "color": "#cfd8e0",
    "neutral": { "file": "levi_neutral.webp", "height": 0.547 },
    "serious": { "file": "levi_serious.webp", "height": 0.547 }
  }
}
```
  - ключ — латиница (`levi`, `npc_guard`); `name` — как на плашке; `color` (необяз.) — цвет имени;
  - `neutral` обязателен — он подставляется, если эмоции нет;
  - `height` — доля высоты сцены; у всех эмоций персонажа одинаковая. Подбирается так, чтобы
    головы разных героев были одного размера, а окно диалога резало фигуру по пояс.
- Подготовка из генерации на зелёном фоне `#00FF00`:
  `python3 tools/make_sprite.py raw/levi_smirk.png -o game/assets/sprites/levi_smirk.webp`
  (кеинг, кадрирование, 675×1200). Нужен Pillow.

## Фоны

`python3 tools/make_sprite.py raw/mess.png --bg -o game/assets/bg/hq_mess.webp`, затем
внести `"hq_mess"` в `game/assets/bg/index.json` (по нему Конструктор строит список).
Важное держи в центральных 80% ширины — на узких/широких экранах края обрезаются.

## CG

Положить `game/assets/cg/<id>.webp`, внести в `game.json → gallery`:
```json
"gallery": [ { "id": "tea_party", "title": "Первое чаепитие" } ]
```
Шаг `{ "cg": "tea_party" }` показывает картинку и открывает её в галерее.

## Звук

Имя без расширения в `game.json → audio`. Движок пробует `.ogg` → `.mp3` → `.wav`.
Синтез простых SFX без внешних источников: `python3 tools/make_sfx.py` (нужен ffmpeg для ogg/mp3).
Музыка с лицензией CC0/CC-BY — с указанием авторов в `game/assets/audio/README.md`.
