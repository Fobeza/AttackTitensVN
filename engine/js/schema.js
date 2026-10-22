/* schema.js — ЕДИНЫЙ источник правды о формате сцен.
 * Используют: движок (typeOf), Конструктор (типы шагов + проверка),
 * tools/lint_scenes.mjs (та же проверка из Node).
 * Добавляешь тип шага → опиши его в STEPS и в lintStep(), затем реализуй в parser.js. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.VN = root.VN || {}; root.VN.schema = api; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SLOTS = ["left", "center", "right"];
  const ENTER = ["fade", "left", "right", "rise"];
  const EXIT = ["fade", "left", "right"];
  const SHAKE = [true, "small", "big"];
  /** Мини-игры, встроенные в движок (engine/js/minigames/<id>.js) */
  const BUILTIN_MINIGAMES = ["timing", "quiz"];

  /** Типы шагов: ключ шага → { title, extra: допустимые соседние ключи } */
  const STEPS = {
    label:    { title: "Метка" },
    say:      { title: "Реплика" },
    narr:     { title: "Нарратив" },
    card:     { title: "Карточка" },
    show:     { title: "Показать спрайт" },
    hide:     { title: "Убрать спрайт" },
    bg:       { title: "Фон" },
    cg:       { title: "CG-картинка" },
    bgm:      { title: "Музыка" },
    sfx:      { title: "Звук" },
    set:      { title: "Переменные" },
    memo:     { title: "🕊 Памятка" },
    choice:   { title: "Выбор" },
    goto:     { title: "Переход" },
    if:       { title: "Условие" },
    wait:     { title: "Пауза" },
    shake:    { title: "Тряска" },
    flash:    { title: "Вспышка" },
    minigame: { title: "Мини-игра", extra: ["params", "onWin", "onLose", "win", "lose", "var", "skippable", "skipAs"] },
    scene:    { title: "Другая сцена", extra: ["at"] },
    end:      { title: "Конец" }
  };
  const STEP_KEYS = Object.keys(STEPS);
  const OPTION_KEYS = ["text", "goto", "set", "memo", "narr", "if", "locked"];
  const SCENE_KEYS = ["id", "title", "bg", "bgm", "steps"];
  const COND_KEYS = ["var", "min", "max", "eq", "ne", "all", "any"];

  /** Тип шага = первый известный ключ. null — неизвестный шаг. */
  function typeOf(step) {
    if (!step || typeof step !== "object" || Array.isArray(step)) return null;
    for (const k of Object.keys(step)) if (k in STEPS) return k;
    return null;
  }

  /** Проверка условия. vars — объект переменных. Отсутствующая переменная = 0/false. */
  function test(cond, vars) {
    if (!cond) return true;
    if (Array.isArray(cond)) return cond.every(c => test(c, vars));
    if (cond.all) return cond.all.every(c => test(c, vars));
    if (cond.any) return cond.any.some(c => test(c, vars));
    const raw = vars[cond.var];
    const v = raw === undefined || raw === null ? 0 : raw;
    const same = (a, b) => typeof b === "boolean" ? Boolean(a) === b : a === b;
    if (cond.min !== undefined && !(v >= cond.min)) return false;
    if (cond.max !== undefined && !(v <= cond.max)) return false;
    if (cond.eq !== undefined && !same(v, cond.eq)) return false;
    if (cond.ne !== undefined && same(v, cond.ne)) return false;
    return true;
  }

  /** Переменные, упомянутые в {{var}} внутри текста */
  function textVars(text) {
    return [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]);
  }

  /** Имена говорящих, которые знает манифест (и ключи, и name) */
  function speakerOf(who, manifest) {
    if (!manifest) return null;
    if (manifest[who]) return who;
    for (const [k, c] of Object.entries(manifest)) if (c && c.name === who) return k;
    return null;
  }

  /**
   * Проверка сцены.
   * ctx: { id, manifest, bgs[], cgs[], audio:{bgm[],sfx[]}, vars[], speakers[],
   *        scenes[], sceneLabels:{id:[labels]}, minigames[] }
   * Любое поле ctx можно не передавать — тогда соответствующая проверка пропускается.
   * Возвращает [{ level: "error"|"warn"|"info", step: index|null, msg }]
   */
  function lintScene(scene, ctx = {}) {
    const out = [];
    const E = (step, msg) => out.push({ level: "error", step, msg });
    const W = (step, msg) => out.push({ level: "warn", step, msg });
    const I = (step, msg) => out.push({ level: "info", step, msg });

    if (!scene || typeof scene !== "object" || !Array.isArray(scene.steps)) {
      E(null, "сцена должна быть объектом с массивом steps");
      return out;
    }
    for (const k of Object.keys(scene)) if (!SCENE_KEYS.includes(k)) E(null, `неизвестное поле сцены "${k}" (можно: ${SCENE_KEYS.join(", ")})`);
    if (ctx.id && scene.id && scene.id !== ctx.id) E(null, `id сцены "${scene.id}" не совпадает с именем файла "${ctx.id}"`);
    if (!scene.steps.length) E(null, "в сцене нет шагов");

    const steps = scene.steps;
    const labels = {};
    steps.forEach((s, i) => {
      if (s && typeof s.label === "string") {
        if (s.label in labels) E(i, `метка "${s.label}" уже есть на шаге ${labels[s.label]}`);
        else labels[s.label] = i;
      }
    });
    const has = (list, v) => !list || list.includes(v);
    const varOk = (i, name, where) => {
      if (ctx.vars && !ctx.vars.includes(name))
        E(i, `${where}: переменная "${name}" не объявлена в game.json → vars`);
    };
    const labelOk = (i, l, where) => {
      if (typeof l !== "string" || !l) E(i, `${where}: нужна метка (строка)`);
      else if (!(l in labels)) E(i, `${where}: нет метки "${l}" в этой сцене`);
    };
    const textOk = (i, t, where) => {
      if (typeof t !== "string" || !t.trim()) { E(i, `${where}: пустой текст`); return; }
      textVars(t).forEach(v => varOk(i, v, `${where} {{${v}}}`));
    };
    const condOk = (i, c, where) => {
      if (Array.isArray(c)) { c.forEach(x => condOk(i, x, where)); return; }
      if (!c || typeof c !== "object") { E(i, `${where}: условие должно быть объектом`); return; }
      for (const k of Object.keys(c)) if (!COND_KEYS.includes(k) && k !== "goto" && k !== "else")
        E(i, `${where}: неизвестное поле условия "${k}"`);
      if (c.all || c.any) {
        const list = c.all || c.any;
        if (!Array.isArray(list) || !list.length) E(i, `${where}: all/any — непустой массив условий`);
        else list.forEach(x => condOk(i, x, where));
        return;
      }
      if (typeof c.var !== "string") { E(i, `${where}: нет "var"`); return; }
      varOk(i, c.var, where);
      if (c.min === undefined && c.max === undefined && c.eq === undefined && c.ne === undefined)
        E(i, `${where}: укажи min / max / eq / ne`);
      ["min", "max"].forEach(k => { if (c[k] !== undefined && typeof c[k] !== "number") E(i, `${where}: ${k} — число`); });
    };
    const setOk = (i, set, where) => {
      if (!set || typeof set !== "object" || Array.isArray(set)) { E(i, `${where}: set — объект {перем: значение}`); return; }
      for (const [k, v] of Object.entries(set)) {
        varOk(i, k, where);
        const okVal = ["number", "string", "boolean"].includes(typeof v) ||
          (v && typeof v === "object" && "=" in v && Object.keys(v).length === 1);
        if (!okVal) E(i, `${where}: "${k}" — число (прибавка), строка/boolean или {"=": значение}`);
      }
    };
    const charOk = (i, char, expr, where) => {
      if (!ctx.manifest) return;
      const c = ctx.manifest[char];
      if (!c) { E(i, `${where}: персонажа "${char}" нет в manifest.json`); return; }
      if (expr !== undefined && (expr === "name" || expr === "color" || !c[expr]))
        E(i, `${where}: у "${char}" нет эмоции "${expr}" (есть: ${Object.keys(c).filter(k => c[k] && c[k].file).join(", ")})`);
    };

    steps.forEach((s, i) => {
      const t = typeOf(s);
      if (!t) { E(i, `неизвестный шаг ${JSON.stringify(s).slice(0, 60)} (типы: ${STEP_KEYS.join(", ")})`); return; }
      const allowed = [t, ...(STEPS[t].extra || [])];
      for (const k of Object.keys(s)) if (!allowed.includes(k))
        E(i, `лишний ключ "${k}" в шаге ${t} — один шаг = одно действие`);
      const v = s[t];

      switch (t) {
        case "label":
          if (typeof v !== "string" || !/^[\w.-]+$/.test(v)) E(i, `метка — строка из латиницы/цифр/_ (сейчас "${v}")`);
          break;
        case "say": {
          if (!v || typeof v !== "object") { E(i, "say: { who, text }"); break; }
          for (const k of Object.keys(v)) if (!["who", "text", "expr"].includes(k)) E(i, `say: неизвестное поле "${k}"`);
          if (typeof v.who !== "string" || !v.who) E(i, "say: нет who");
          textOk(i, v.text, "say");
          const ch = speakerOf(v.who, ctx.manifest);
          if (ctx.manifest && !ch && !(ctx.speakers || []).includes(v.who))
            W(i, `say: говорящего "${v.who}" нет в manifest — если это NPC без спрайта, добавь в game.json → speakers`);
          if (v.expr !== undefined) {
            if (!ch) E(i, `say.expr: "${v.who}" не персонаж из manifest`);
            else charOk(i, ch, v.expr, "say.expr");
          }
          break;
        }
        case "narr": textOk(i, v, "narr"); break;
        case "card":
          if (typeof v === "string") textOk(i, v, "card");
          else if (v && typeof v === "object") { textOk(i, v.title, "card.title"); }
          else E(i, "card: строка или { title, sub }");
          break;
        case "show": {
          if (!v || typeof v !== "object") { E(i, "show: { char, expr, slot }"); break; }
          for (const k of Object.keys(v)) if (!["char", "expr", "slot", "enter", "height"].includes(k)) E(i, `show: неизвестное поле "${k}"`);
          charOk(i, v.char, v.expr === undefined ? "neutral" : v.expr, "show");
          if (v.slot !== undefined && !SLOTS.includes(v.slot)) E(i, `show.slot: ${SLOTS.join("|")}`);
          if (v.enter !== undefined && !ENTER.includes(v.enter)) E(i, `show.enter: ${ENTER.join("|")}`);
          if (v.height !== undefined && !(typeof v.height === "number" && v.height > 0 && v.height <= 1.2)) E(i, "show.height: доля высоты сцены, напр. 0.55");
          break;
        }
        case "hide": {
          if (v === "all") break;
          if (!v || typeof v !== "object") { E(i, `hide: { slot } | { char } | "all"`); break; }
          for (const k of Object.keys(v)) if (!["slot", "char", "exit"].includes(k)) E(i, `hide: неизвестное поле "${k}"`);
          if (v.slot === undefined && v.char === undefined) E(i, "hide: укажи slot или char");
          if (v.slot !== undefined && !SLOTS.includes(v.slot)) E(i, `hide.slot: ${SLOTS.join("|")}`);
          if (v.char !== undefined) charOk(i, v.char, undefined, "hide");
          if (v.exit !== undefined && !EXIT.includes(v.exit)) E(i, `hide.exit: ${EXIT.join("|")}`);
          break;
        }
        case "bg":  if (v !== null && (typeof v !== "string" || !has(ctx.bgs, v))) E(i, `bg: нет фона "${v}" (bg/index.json)`); break;
        case "cg":  if (v !== null && (typeof v !== "string" || !has(ctx.cgs, v))) E(i, `cg: нет CG "${v}" (game.json → gallery)`); break;
        case "bgm": if (v !== null && (typeof v !== "string" || !has(ctx.audio && ctx.audio.bgm, v))) E(i, `bgm: нет музыки "${v}" (game.json → audio.bgm)`); break;
        case "sfx": if (typeof v !== "string" || !has(ctx.audio && ctx.audio.sfx, v)) E(i, `sfx: нет звука "${v}" (game.json → audio.sfx)`); break;
        case "set": setOk(i, v, "set"); break;
        case "memo": textOk(i, v, "memo"); break;
        case "choice": {
          if (!Array.isArray(v) || !v.length) { E(i, "choice: непустой массив опций"); break; }
          if (v.length === 1) W(i, "choice: всего одна опция");
          let inert = 0;
          v.forEach((o, j) => {
            const w = `choice[${j}]`;
            if (!o || typeof o !== "object") { E(i, `${w}: опция — объект`); return; }
            for (const k of Object.keys(o)) if (!OPTION_KEYS.includes(k)) E(i, `${w}: неизвестное поле "${k}"`);
            textOk(i, o.text, w);
            if (o.goto !== undefined) labelOk(i, o.goto, w);
            if (o.set !== undefined) setOk(i, o.set, w);
            if (o.if !== undefined) condOk(i, o.if, w + ".if");
            if (o.narr !== undefined) textOk(i, o.narr, w + ".narr");
            if (o.memo !== undefined) textOk(i, o.memo, w + ".memo");
            if (o.locked !== undefined && !["lock", "hide"].includes(o.locked)) E(i, `${w}.locked: "lock" | "hide"`);
            if (o.goto === undefined && o.set === undefined && o.narr === undefined && o.memo === undefined) inert++;
          });
          if (inert === v.length && v.length > 1) W(i, "choice: ни одна опция ни на что не влияет (нет goto/set/narr/memo)");
          break;
        }
        case "goto": labelOk(i, v, "goto"); break;
        case "if":
          condOk(i, v, "if");
          if (v && typeof v === "object") {
            labelOk(i, v.goto, "if.goto");
            if (v.else !== undefined) labelOk(i, v.else, "if.else");
          }
          break;
        case "wait": if (typeof v !== "number" || v <= 0 || v > 20000) E(i, "wait: миллисекунды 1…20000"); break;
        case "shake": if (!SHAKE.includes(v)) E(i, `shake: true | "small" | "big"`); break;
        case "flash": if (v !== true && typeof v !== "string") E(i, `flash: true или цвет ("#fff")`); break;
        case "minigame":
          if (typeof v !== "string" || !v) { E(i, "minigame: id мини-игры"); break; }
          if (ctx.minigames && !ctx.minigames.includes(v)) E(i, `minigame: неизвестная мини-игра "${v}" (есть: ${ctx.minigames.join(", ")})`);
          if (s.onWin !== undefined) setOk(i, s.onWin, "onWin");
          if (s.onLose !== undefined) setOk(i, s.onLose, "onLose");
          if (s.win !== undefined) labelOk(i, s.win, "minigame.win");
          if (s.lose !== undefined) labelOk(i, s.lose, "minigame.lose");
          if (s.var !== undefined) varOk(i, s.var, "minigame.var");
          if (s.params !== undefined && (typeof s.params !== "object" || Array.isArray(s.params))) E(i, "params — объект");
          if (s.skipAs !== undefined && !["win", "lose"].includes(s.skipAs)) E(i, `skipAs: "win" | "lose"`);
          break;
        case "scene":
          if (typeof v !== "string" || !has(ctx.scenes, v)) E(i, `scene: нет сцены "${v}" (game.json → scenes)`);
          else if (s.at !== undefined && ctx.sceneLabels && ctx.sceneLabels[v] && !ctx.sceneLabels[v].includes(s.at))
            E(i, `scene.at: в сцене "${v}" нет метки "${s.at}"`);
          break;
        case "end":
          if (v !== true && (!v || typeof v !== "object")) E(i, "end: true или { title, sub }");
          break;
      }
    });

    // ── поток: достижимость и обрыв сцены ──
    const reach = new Array(steps.length).fill(false);
    const queue = [0];
    const push = l => { if (typeof l === "string" && l in labels) queue.push(labels[l]); };
    let fallsOff = false;
    while (queue.length) {
      const i = queue.pop();
      if (i >= steps.length) { fallsOff = true; continue; }
      if (reach[i]) continue;
      reach[i] = true;
      const s = steps[i], t = typeOf(s);
      if (t === "goto") { push(s.goto); continue; }
      if (t === "end" || t === "scene") continue;
      if (t === "if") { push(s.if && s.if.goto); if (s.if && s.if.else) { push(s.if.else); continue; } }
      if (t === "choice" && Array.isArray(s.choice)) {
        let allJump = s.choice.length > 0;
        s.choice.forEach(o => { if (o && o.goto) push(o.goto); else allJump = false; });
        if (allJump) continue;
      }
      if (t === "minigame") { push(s.win); push(s.lose); if (s.win && s.lose) continue; }
      queue.push(i + 1);
    }
    if (fallsOff) E(steps.length - 1, "сцена обрывается: последний достижимый шаг не end / scene / goto");
    let deadFrom = -1;
    steps.forEach((s, i) => {
      if (!reach[i] && deadFrom < 0) deadFrom = i;
      if ((reach[i] || i === steps.length - 1) && deadFrom >= 0) {
        const to = reach[i] ? i - 1 : i;
        W(deadFrom, `недостижимые шаги ${deadFrom}…${to} (до них не доходит ни один переход)`);
        deadFrom = -1;
      }
    });
    const targeted = new Set();
    steps.forEach(s => {
      const t = typeOf(s);
      if (t === "goto") targeted.add(s.goto);
      if (t === "if" && s.if) { targeted.add(s.if.goto); targeted.add(s.if.else); }
      if (t === "choice" && Array.isArray(s.choice)) s.choice.forEach(o => o && targeted.add(o.goto));
      if (t === "minigame") { targeted.add(s.win); targeted.add(s.lose); }
    });
    (ctx.externalLabels || []).forEach(l => targeted.add(l));
    Object.entries(labels).forEach(([l, i]) => { if (!targeted.has(l)) I(i, `метка "${l}" никуда не ведёт (на неё нет перехода)`); });

    return out;
  }

  /** Проверка game.json */
  function lintConfig(cfg) {
    const out = [];
    const E = msg => out.push({ level: "error", step: null, msg });
    if (!cfg || typeof cfg !== "object") { E("game.json — не объект"); return out; }
    if (!cfg.title) E("нет title");
    if (!cfg.storage || !/^\w+$/.test(cfg.storage)) E("storage — короткий латинский префикс для localStorage");
    if (!Array.isArray(cfg.scenes) || !cfg.scenes.length) E("scenes — непустой массив { id, title }");
    else if (!cfg.scenes.some(s => s.id === cfg.startScene)) E(`startScene "${cfg.startScene}" нет в scenes`);
    if (!cfg.paths || !cfg.paths.scenes || !cfg.paths.assets) E("paths.scenes и paths.assets обязательны");
    if (cfg.vars && typeof cfg.vars !== "object") E("vars — объект { имя: { default, title } }");
    return out;
  }

  /** Список объявленных переменных из game.json */
  function varList(cfg) { return Object.keys((cfg && cfg.vars) || {}); }

  return { BUILTIN_MINIGAMES, STEPS, STEP_KEYS, OPTION_KEYS, SLOTS, ENTER, EXIT, typeOf, test, textVars, speakerOf, lintScene, lintConfig, varList };
});
