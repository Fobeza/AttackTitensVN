#!/usr/bin/env node
/**
 * smoke_test.mjs — прогон движка в настоящем браузере (headless Chromium).
 *   npm i -D playwright && npx playwright install chromium   # один раз
 *   node tools/smoke_test.mjs
 * Проверяет поведение, которое легко сломать правкой движка: ввод, сейвы, переходы,
 * выход в меню, мини-игры. Работает на сцене game/scenes/demo.json.
 */
import { createRequire } from "module";
import { serve } from "./serve.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch {
  console.log("Нужен playwright: npm i -D playwright && npx playwright install chromium");
  process.exit(2);
}

const PORT = 8799, BASE = `http://localhost:${PORT}/`;
const server = await serve(PORT, { log: false });
const browser = await chromium.launch();
let failed = 0;
const results = [];

async function page(url) {
  const ctx = await browser.newContext({ viewport: { width: 405, height: 720 } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
  await p.goto(BASE + url);
  await p.waitForFunction(() => window.VN && VN.cfg && VN.renderer.manifest !== undefined);
  return p;
}
const st = p => p.evaluate(() => ({ scene: VN.game.scene, step: VN.game.step, text: document.getElementById("text").textContent }));
const tapStage = p => p.mouse.click(200, 120);
/** Тапать, пока не окажемся на шаге n (или метке) */
async function until(p, target, max = 60) {
  for (let k = 0; k < max; k++) {
    const ok = await p.evaluate(t => {
      const sc = VN.parser.sceneData(); if (!sc) return false;
      const idx = typeof t === "number" ? t : sc.steps.findIndex(s => s.label === t);
      return VN.game.step >= idx && VN.game.step <= idx + 1 + (typeof t === "string" ? 1 : 0);
    }, target);
    if (ok) return;
    await tapStage(p);
    await p.waitForTimeout(60);
  }
  throw new Error(`не дошли до ${target}`);
}
async function test(name, fn) {
  try {
    await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error("таймаут 30 с")), 30000))]);
    results.push(`  ✓ ${name}`);
  }
  catch (e) { failed++; results.push(`  ✗ ${name}\n      ${e.message}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

await test("меню открывается без ошибок", async () => {
  const p = await page("");
  await p.waitForSelector("#m-new");
  assert(!p.errors.length, p.errors.join("; "));
  await p.context().close();
});

await test("тап во время печати допечатывает строку, а не пропускает её", async () => {
  const p = await page("?scene=demo");
  await p.waitForSelector("#card:not(.hidden)");
  await tapStage(p);                                   // карточка → нарратив (шаг 1)
  await p.waitForTimeout(80);
  const a = await st(p);
  assert(a.step === 1, `ожидали шаг 1, а ${a.step}`);
  await p.click("#text");                              // тап по самому окну диалога
  await p.waitForTimeout(80);
  const b = await st(p);
  assert(b.step === 1, `один тап перескочил на шаг ${b.step}`);
  assert(b.text.length > 40, "строка не допечаталась");
  await p.click("#dialog");
  await p.waitForTimeout(80);
  assert((await st(p)).step > 1, "второй тап не продвинул");
  await p.context().close();
});

await test("открыть/закрыть паузу и бэклог — диалог не продвигается", async () => {
  const p = await page("?scene=demo&at=2");
  await p.waitForTimeout(150);
  const s0 = (await st(p)).step;
  await p.click("#btn-pause");
  await p.click("#overlay .action:last-child");
  await p.click("#btn-backlog");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(100);
  assert((await st(p)).step === s0, `шаг сменился ${s0} → ${(await st(p)).step}`);
  await p.context().close();
});

await test("меню → новая игра: нет второго (призрачного) исполнителя", async () => {
  const p = await page("?scene=demo&at=pick");
  await p.evaluate(() => {
    window.__pending = 0;
    const orig = VN.ui._line.bind(VN.ui);
    VN.ui._line = a => { __pending++; return orig(a).finally(() => __pending--); };
  });
  await p.evaluate(() => VN.menu.newGame("demo", 3));
  await p.waitForTimeout(100);
  await p.evaluate(() => { VN.menu.show(); VN.menu.newGame("demo", 3); });
  await p.waitForTimeout(150);
  for (let k = 0; k < 4; k++) { await tapStage(p); await p.waitForTimeout(80); }
  const n = await p.evaluate(() => __pending);
  assert(n <= 1, `одновременно ждут ${n} реплик`);
  await p.context().close();
});

await test("сейв перед выбором → загрузка → goto работает", async () => {
  const p = await page("?scene=demo");
  await until(p, "pick");
  await p.waitForSelector("#choices:not(.hidden)");
  await p.goto(BASE);
  await p.waitForSelector("#m-cont:not([disabled])");
  await p.click("#m-cont");
  await p.waitForSelector("#choices:not(.hidden) .choice-btn");
  await p.click("#choices .choice-btn >> text=Закончить демо");
  await p.waitForTimeout(900);
  const s = await st(p);
  const want = await p.evaluate(() => VN.parser.sceneData().steps.findIndex(x => x.label === "finish"));
  assert(s.step > want, `после загрузки goto не сработал: шаг ${s.step}, метка finish = ${want}`);
  assert(!p.errors.length, p.errors.join("; "));
  await p.context().close();
});

await test("сейв переживает правку сцены (восстановление по метке-якорю)", async () => {
  const p = await page("?scene=demo&at=mg_win");
  await p.waitForTimeout(200);
  const r = await p.evaluate(async () => {
    const snap = VN.save.snapshot();                        // шаг сразу после метки mg_win
    VN.parser._cache.demo.steps.unshift({ narr: "вставка 1" }, { narr: "вставка 2" });   // «правка» сцены
    VN.parser.loadSnapshot(snap);                          // не ждём: run() идёт до конца сцены
    await new Promise(r => setTimeout(r, 300));
    const sc = VN.parser.sceneData();
    return { step: VN.game.step, want: sc.steps.findIndex(s => s.label === "mg_win") + snap.anchor.offset };
  });
  assert(r.step === r.want, `шаг ${r.step}, ожидали ${r.want}`);
  await p.context().close();
});

await test("сейв с удалённой сцены: ошибка на экране и возврат в меню", async () => {
  const p = await page("");
  await p.waitForSelector("#m-new");
  await p.evaluate(() => VN.parser.loadSnapshot({ v: 1, scene: "deleted_scene", step: 5, vars: {}, visual: { bg: null, sprites: {} }, history: [] }));
  await p.waitForSelector("#menu-screen:not(.hidden)");
  assert(await p.locator(".toast.bad").count() >= 1, "нет сообщения об ошибке");
  p.errors.length = 0;   // console.error от VN.error здесь ожидаем
  await p.context().close();
});

await test("персонаж переезжает между слотами без дубля", async () => {
  const p = await page("?scene=demo");
  await until(p, 8);
  await p.waitForTimeout(100);
  const n = await p.evaluate(() => document.querySelectorAll('#sprites .sprite.visible[data-char="hange"]').length);
  const slot = await p.evaluate(() => VN.renderer.slotOf("hange"));
  assert(n === 1, `видимых Ханджи: ${n}`);
  assert(slot === "left", `Ханджи в слоте ${slot}`);
  await p.context().close();
});

await test("мини-игра quiz: победа → переход на метку win", async () => {
  const p = await page("?scene=demo&at=mg_quiz");
  await p.waitForSelector("#minigame:not(.hidden) .mg-opt");
  await p.click(".mg-opt >> text=Мария");
  await p.waitForFunction(() => document.getElementById("minigame").classList.contains("hidden"), null, { timeout: 3000 });
  await p.waitForTimeout(100);
  const r = await p.evaluate(() => ({ v: VN.game.vars, label: VN.parser.sceneData().steps[VN.game.step - 1].label }));
  assert(r.label === "mg_win", `ожидали mg_win, а ${r.label}`);
  assert(r.v.demo_score === 1 && r.v.truth === 1, "var/onWin не применились: " + JSON.stringify(r.v));
  await p.context().close();
});

await test("мини-игра: «Пропустить» = проигрыш (skipAs по умолчанию)", async () => {
  const p = await page("?scene=demo&at=mg_timing");
  await p.waitForSelector("#minigame .mg-skip");
  await p.click("#minigame .mg-skip");
  await p.waitForTimeout(150);
  const label = await p.evaluate(() => VN.parser.sceneData().steps[VN.game.step - 1].label);
  assert(label === "mg_lose", `ожидали mg_lose, а ${label}`);
  await p.context().close();
});

await test("условие в опции: заперта без доверия, открыта с ним", async () => {
  const p = await page("?scene=demo&at=pick");
  await p.waitForSelector("#choices .choice-btn");
  assert(await p.locator("#choices .choice-btn[disabled]").count() === 1, "секретная опция не заперта");
  const p2 = await page("?scene=demo&at=pick&vars=trust:2");
  await p2.waitForSelector("#choices .choice-btn");
  assert(await p2.locator("#choices .choice-btn[disabled]").count() === 0, "секретная опция заперта при trust=2");
  await p.context().close(); await p2.context().close();
});

await test("пропуск (skip) останавливается на выборе", async () => {
  const p = await page("?scene=demo");
  await until(p, "pick");                 // всё прочитано
  await p.waitForSelector("#choices:not(.hidden)");
  await p.evaluate(() => VN.menu.newGame("demo"));
  await p.waitForTimeout(100);
  await p.click("#btn-skip");
  await p.waitForSelector("#choices:not(.hidden) .choice-btn", { timeout: 8000 });
  assert(await p.evaluate(() => VN.ui.mode) === null, "режим пропуска не выключился");
  await p.context().close();
});

await test("демо проходится до конца", async () => {
  const p = await page("?scene=demo&at=pick");
  await p.waitForSelector("#choices .choice-btn");
  await p.click("#choices .choice-btn >> text=Закончить демо");
  for (let k = 0; k < 20 && !(await p.locator("#overlay:not(.hidden)").count()); k++) { await tapStage(p); await p.waitForTimeout(150); }
  assert(await p.locator("#overlay h2 >> text=Демо завершено").count() === 1, "нет финальной карточки");
  await p.click("#overlay .action");
  await p.waitForSelector("#menu-screen:not(.hidden)");
  assert(!p.errors.length, p.errors.join("; "));
  await p.context().close();
});

await test("длинная реплика режется на страницы и не требует прокрутки", async () => {
  const p = await page("?scene=demo&at=2");
  await p.waitForTimeout(200);
  const r = await p.evaluate(async () => {
    VN.parser.stop();
    VN.ui.settings.speed = 1;
    const long = Array(14).fill("Это довольно длинное предложение, которое занимает место в окне диалога.").join(" ");
    let resolved = false;
    VN.ui.say("Леви", long).then(() => { resolved = true; });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let pages = 0, maxOver = 0;
    while (!resolved && pages < 30) {
      await sleep(80);
      VN.ui.advance();                                  // допечатать страницу
      const t = document.getElementById("text");
      maxOver = Math.max(maxOver, t.scrollHeight - t.clientHeight);
      pages++;
      await sleep(20);
      VN.ui.advance();                                  // следующая страница или конец
    }
    return { pages, maxOver, resolved };
  });
  assert(r.resolved, "реплика не закончилась");
  assert(r.pages >= 2, `ожидали несколько страниц, а ${r.pages}`);
  assert(r.maxOver <= 1, `текст не влезает в окно: +${r.maxOver}px`);
  await p.context().close();
});

await test("над кнопками выбора остаётся вопрос (последняя реплика)", async () => {
  const p = await page("?scene=demo&at=pick");
  await p.waitForSelector("#choices:not(.hidden) .choice-prompt");
  const t = await p.textContent("#choices .choice-prompt");
  assert(t.includes("выбор"), "вопрос не показан: " + t);
  await p.context().close();
});

/** Запустить мини-игру прямо на странице (парсер остановлен) и вернуть результат через window.__r */
async function startMg(p, step) {
  await p.evaluate(s => { window.__r = null; VN.parser.stop(); VN.minigames.play(s).then(r => { window.__r = r || { aborted: true }; }); }, step);
  await p.waitForSelector("#minigame .mg-intro .mg-btn");
  await p.click("#minigame .mg-intro .mg-btn");
}
const mgResult = (p, ms = 8000) => p.waitForFunction(() => window.__r, null, { timeout: ms }).then(() => p.evaluate(() => window.__r));

await test("мини-игра «Уборка»: оттёр пятна пальцем → победа", async () => {
  const p = await page("?scene=demo&at=2");
  await startMg(p, { minigame: "cleaning", params: { time: 30, need: 0.8 } });
  const box = await p.locator(".clean-cv").boundingBox();
  for (let y = box.y + 8, k = 0; y < box.y + box.height; y += 14, k++) {
    await p.mouse.move(k % 2 ? box.x + box.width - 4 : box.x + 4, y);
    await p.mouse.down();
    await p.mouse.move(k % 2 ? box.x + 4 : box.x + box.width - 4, y, { steps: 12 });
    await p.mouse.up();
  }
  const r = await mgResult(p);
  assert(r.win && r.score >= 80, "ожидали победу, а " + JSON.stringify(r));
  await p.context().close();
});

await test("мини-игра «Уборка»: время вышло → поражение", async () => {
  const p = await page("?scene=demo&at=2");
  await startMg(p, { minigame: "cleaning", params: { time: 1.2, need: 0.8 } });
  const r = await mgResult(p);
  assert(!r.win && r.score < 80, "ожидали поражение, а " + JSON.stringify(r));
  await p.context().close();
});

await test("мини-игра «Лаборатория»: верный порядок (тапами) → победа", async () => {
  const p = await page("?scene=demo&at=2");
  await startMg(p, { minigame: "lab", params: { puzzle: 0 } });
  const sol = await p.evaluate(() => document.querySelector(".lab").parentElement.dataset.solution);
  assert(sol === "ABDC", "неожиданное решение " + sol);
  for (const k of sol) await p.click(`.lab-bottle[data-k="${k}"]`);
  await p.click(".lab-mix");
  const r = await mgResult(p);
  assert(r.win && r.score === 3, "ожидали победу, а " + JSON.stringify(r));
  await p.context().close();
});

await test("мини-игра «Лаборатория»: перетаскивание, неверный порядок × попытки → поражение", async () => {
  const p = await page("?scene=demo&at=2");
  await startMg(p, { minigame: "lab", params: { puzzle: 0, tries: 2 } });
  // перетаскиваем Изумрудный в 3-ю ячейку
  const bb = await p.locator('.lab-bottle[data-k="D"]').boundingBox(), sb = await p.locator('.lab-slot[data-i="2"]').boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
  await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 8 }); await p.mouse.up();
  const filled = await p.evaluate(() => document.querySelectorAll(".lab-slot")[2].textContent);
  assert(filled === "Изумрудный", "перетаскивание не сработало: " + filled);
  await p.click("#minigame .lab-reset");
  for (const k of "CDBA") await p.click(`.lab-bottle[data-k="${k}"]`);   // заведомо неверно
  await p.click(".lab-mix");
  assert((await p.textContent(".lab-msg")).includes("Осадок"), "нет подсказки после ошибки");
  await p.click(".lab-mix");
  const r = await mgResult(p);
  assert(!r.win, "ожидали поражение, а " + JSON.stringify(r));
  await p.context().close();
});

await test("Конструктор на телефоне: экраны переключаются, ничего не вылезает за край", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.goto(BASE + "editor.html");
  await p.waitForSelector(".step");
  await p.click('.step[data-i="3"]');
  assert(await p.evaluate(() => document.body.dataset.view) === "form", "тап по шагу не открыл форму");
  await p.click("#fn-next");
  assert((await p.textContent("#right h2")).startsWith("Шаг 4"), "кнопка › не перешла к следующему шагу");
  const overflow = () => p.evaluate(() => [...document.querySelectorAll("body *")]
    .filter(e => e.offsetParent && e.getBoundingClientRect().right > innerWidth + 1).map(e => e.id || e.className));
  // обходим формы всех шагов сцены: choice, set, if, minigame и т.д. не должны вылезать за край
  const total = await p.evaluate(() => E.scene.steps.length);
  await p.click("#fn-back");
  for (let i = 0; i < total; i++) {
    await p.click(`.step[data-i="${i}"]`);
    const wide = await overflow();
    assert(!wide.length, `шаг ${i}: вылезает за край: ` + wide.slice(0, 3).join(", "));
    await p.click("#fn-back");
  }
  await p.click('.step[data-i="3"]');
  await p.click("#fn-back");
  assert(await p.evaluate(() => document.body.dataset.view) === "steps", "«← Шаги» не вернул к списку");
  assert(!errors.length, errors.join("; "));
  await ctx.close();
});

await browser.close();
server.close();
console.log(results.join("\n"));
console.log(failed ? `\n✗ провалено: ${failed}` : "\n✓ все проверки прошли");
process.exit(failed ? 1 : 0);
