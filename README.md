# Под крыльями свободы — фанатская визуальная новелла

**Версия 1.0** — Глава 2 полностью одета: 37 фонов, 173 кадра спрайтов, 9 CG.
Что изменилось: [`CHANGELOG.md`](CHANGELOG.md).

Вертикальная (9:16, mobile-first) фан-игра по мотивам «Атаки титанов».
**Согласованное AU:** Петра пережила 57-ю экспедицию. Маша и Сэм — авторские персонажи;
история разворачивается между 2-м и 3-м сезонами.

Движок — универсальный **Sova VN**: чистый HTML/CSS/JS, без зависимостей и сборки,
публикуется на GitHub Pages как есть.

> ⚑ Некоммерческий фан-проект для личного пользования. Права на вселенную и
> персонажей — Хадзимэ Исаяма / Kodansha / WIT Studio / MAPPA.

В игре реализованы Глава 1 (пролог, три дня расследования, развилки финала) и Глава 2
«Крылья и клятва» (испытательный срок, присяга, выезд, секреты и улики). Глава 3 ещё не написана.
Техническая сцена `demo` сохранена для демонстрации движка и автоматических проверок.

## Запуск

```bash
node tools/serve.mjs          # или: npm run serve
```
- `http://localhost:8000/` — игра
- `http://localhost:8000/editor.html` — Конструктор сцен
- `http://localhost:8000/?scene=demo&at=pick&debug=1` — сразу в сцену/метку, со строкой отладки

Открывать `index.html` двойным кликом нельзя: браузер не даст прочитать JSON с диска.

## Проверки

```bash
node tools/lint_scenes.mjs    # строгая проверка сцен, конфига и файлов — после любой правки game/
node tools/story_test.mjs     # 400 воспроизводимых прогонов сюжетных развилок Главы 1
node tools/story_test_ch2.mjs # 600 прогонов Главы 2 из случайных исходов Главы 1
node tools/cg_test.mjs        # CG закрывается на всех ветках, недостижимых шагов нет
node tools/smoke_test.mjs     # прогон движка в headless-браузере — после правки engine/
```
Смоук-тесту нужен Playwright (один раз): `npm install && npx playwright install chromium`.
Те же проверки запускает GitHub Actions на каждый push (`.github/workflows/check.yml`).

## Структура

| Путь | Назначение |
|---|---|
| `engine/` | движок: ничего не знает про конкретную игру |
| `engine/js/schema.js` | **формат шагов** — общий для движка, Конструктора и линтера |
| `game/game.json` | конфиг игры: название, меню, тема, переменные, сцены, звуки, галерея |
| `game/scenes/*.json` | сцены |
| `game/assets/` | спрайты (+`manifest.json`), фоны (+`index.json`), CG (+`game.json → gallery`), аудио |
| `editor.html`, `editor/` | Конструктор сцен |
| `tools/` | линтер, смоук-тест, сервер, обработка арта и звука |
| `docs/` | документация (см. ниже) |
| `AGENTS.md` | правила для ИИ-агентов (`CLAUDE.md` ссылается на него) |
| `plan.md` | план контента: руты, каст, главы |

## Документация

- [`docs/SCENE_FORMAT.md`](docs/SCENE_FORMAT.md) — все типы шагов, условия, переменные, `game.json`, рецепты
- [`docs/ENGINE.md`](docs/ENGINE.md) — архитектура движка, инварианты, как расширять
- [`docs/MINIGAMES.md`](docs/MINIGAMES.md) — API мини-игр и встроенные `timing`, `quiz`
- [`docs/ASSETS.md`](docs/ASSETS.md) — размеры и подключение спрайтов, фонов, CG, звука
- [`docs/EDITOR.md`](docs/EDITOR.md) — как пользоваться Конструктором
- [`docs/CH2_ASSETS_TODO.md`](docs/CH2_ASSETS_TODO.md) — бэклог арта Главы 2 и его статус
- [`docs/CH2_PROMPTS.md`](docs/CH2_PROMPTS.md) — готовые промпты: спрайты, фоны, CG, музыка, звуки
- [`CHANGELOG.md`](CHANGELOG.md) — что менялось между версиями

## Как дать задание другому ИИ

1. «Прочитай `AGENTS.md` и `docs/SCENE_FORMAT.md`».
2. Сюжетные правки — только в `game/` (сцены, `game.json`, `manifest.json`).
3. Обязательный прогон: `node tools/lint_scenes.mjs` → «✓ ошибок нет».
4. Проверка глазами: `?scene=<id>&at=<метка>&debug=1`.

## Публикация на GitHub Pages

Settings → Pages → Deploy from branch → `main` / `(root)`. Все пути относительные,
работает из подпапки `https://<user>.github.io/<repo>/`.

Если Chromium уже установлен отдельно, можно указать `CHROMIUM_PATH=/путь/к/chromium`.
Результаты технического аудита и оставшиеся сюжетные вопросы: [`docs/AUDIT.md`](docs/AUDIT.md).

Литературная редакция и границы AU: [`docs/STORY_EDITING.md`](docs/STORY_EDITING.md).
