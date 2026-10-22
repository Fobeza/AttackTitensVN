/* Конструктор Sova VN — редактор сцен без сборки.
   Типы шагов и проверка — общие с движком: engine/js/schema.js.
   Сохранение: «📁 Папка проекта» (Chrome/Edge) пишет прямо в game/scenes/,
   иначе «⇩ Экспорт» скачивает файл → положи его в game/scenes/. */
"use strict";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SC = VN.schema;

const E = {
  cfg: null, manifest: null, bgs: [], audio: { bgm: [], sfx: [] },
  scenes: [],            // [{id, title}]
  scene: null, sceneId: null, sel: -1, dirty: false,
  dir: null,             // FileSystemDirectoryHandle корня проекта (если подключена папка)
  problems: []
};

/* ── Типы шагов (из схемы) ── */
const TYPES = SC.STEP_KEYS.map(k => [k, SC.STEPS[k].title]);
const stepType = s => SC.typeOf(s) || "?";

function makeStep(type) {
  switch (type) {
    case "say":   return { say: { who: firstName(), text: "" } };
    case "narr":  return { narr: "" };
    case "card":  return { card: { title: "Глава", sub: "" } };
    case "memo":  return { memo: "Это запомнят" };
    case "show":  return { show: { char: firstChar(), expr: "neutral", slot: "center", enter: "fade" } };
    case "hide":  return { hide: { slot: "center", exit: "fade" } };
    case "bg":    return { bg: E.bgs[0] || null };
    case "cg":    return { cg: (E.cfg.gallery || [])[0]?.id || null };
    case "bgm":   return { bgm: E.audio.bgm[0] || null };
    case "sfx":   return { sfx: E.audio.sfx[0] || "click" };
    case "set":   return { set: { [varList()[0] || "trust"]: 1 } };
    case "choice":return { choice: [{ text: "Вариант 1" }, { text: "Вариант 2" }] };
    case "label": return { label: nextLabel() };
    case "goto":  return { goto: firstLabel() };
    case "if":    return { if: { var: varList()[0] || "trust", min: 1, goto: firstLabel() } };
    case "wait":  return { wait: 800 };
    case "shake": return { shake: "small" };
    case "flash": return { flash: "#fff" };
    case "minigame": return { minigame: "timing", params: {} };
    case "scene": return { scene: E.scenes[0]?.id || "scene_id" };
    case "end":   return { end: { title: "Конец", sub: "" } };
    default:      return {};
  }
}
const varList = () => SC.varList(E.cfg);
const minigameList = () => [...SC.BUILTIN_MINIGAMES, ...Object.keys(E.cfg.minigames || {})];
function firstName() { const k = Object.keys(E.manifest || {})[0]; return k ? E.manifest[k].name : "???"; }
function firstChar() { return Object.keys(E.manifest || {})[0] || ""; }
function labels() { return (E.scene?.steps || []).filter(s => typeof s.label === "string").map(s => s.label); }
function firstLabel() { return labels()[0] || "label_1"; }
function nextLabel() { let n = labels().length + 1; while (labels().includes(`${E.sceneId}_l${n}`)) n++; return `${E.sceneId || "s"}_l${n}`; }

/* ── Загрузка ── */
async function boot() {
  const [cfg, manifest, bgs] = await Promise.all([
    fetch("game/game.json", { cache: "no-cache" }).then(r => r.json()),
    fetch("game/assets/sprites/manifest.json", { cache: "no-cache" }).then(r => r.json()),
    fetch("game/assets/bg/index.json", { cache: "no-cache" }).then(r => r.json()).catch(() => []),
  ]);
  E.cfg = cfg; E.manifest = manifest; E.bgs = bgs;
  E.audio = Object.assign({ bgm: [], sfx: [] }, cfg.audio);
  E.scenes = (cfg.scenes || []).slice();
  buildStaticControls();
  renderSceneList();
  if (E.scenes.length) await loadScene(E.scenes[0].id);
  toast("Конструктор готов");
}

function buildStaticControls() {
  $("#add-type").innerHTML = TYPES.map(([v, t]) => `<option value="${v}">${esc(t)} (${v})</option>`).join("");
  $("#meta-bg").innerHTML = `<option value="">— не задан —</option>` + E.bgs.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join("");
  $("#meta-bgm").innerHTML = `<option value="">— не задана —</option>` + E.audio.bgm.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join("");

  $("#add-below").onclick = () => { if (E.scene) insertStep(makeStep($("#add-type").value)); };
  $("#mv-up").onclick = () => moveStep(-1);
  $("#mv-down").onclick = () => moveStep(1);
  $("#dup-step").onclick = dupStep;
  $("#del-step").onclick = delStep;
  $("#tb-new").onclick = newScene;
  $("#tb-import").onclick = () => $("#import-file").click();
  $("#import-file").onchange = importScene;
  $("#tb-export").onclick = exportScene;
  $("#tb-folder").onclick = connectFolder;
  if (!window.showDirectoryPicker) { $("#tb-folder").disabled = true; $("#tb-folder").title = "Нужен Chrome/Edge на компьютере"; }
  $("#tb-test").onclick = () => testScene(false);
  $("#tb-test-here").onclick = () => testScene(true);
  $("#tb-lint").onclick = () => { lintNow(); renderProblems(true); };
  $("#tb-game").onclick = () => window.open("index.html", "_blank");
  $("#tb-help").onclick = showHelp;
  $("#meta-bg").onchange = () => { if (!E.scene) return; const v = $("#meta-bg").value; if (v) E.scene.bg = v; else delete E.scene.bg; markDirty(); };
  $("#meta-bgm").onchange = () => { if (!E.scene) return; const v = $("#meta-bgm").value; if (v) E.scene.bgm = v; else delete E.scene.bgm; markDirty(); };
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); exportScene(); }
  });
}

async function loadScene(id) {
  let scene = null, fromWip = false;
  const wip = localStorage.getItem("vn_editor_wip::" + id);
  if (wip) { try { scene = JSON.parse(wip); fromWip = true; } catch { /* битый черновик */ } }
  if (!scene) {
    try { scene = await fetch(`game/scenes/${id}.json`, { cache: "no-cache" }).then(r => r.json()); }
    catch { toast(`✗ Не прочитать game/scenes/${id}.json`, true); return; }
  }
  E.scene = scene; E.sceneId = id; E.sel = -1; E.dirty = fromWip;
  $("#dirty-dot").classList.toggle("hidden", !E.dirty);
  $("#meta-bg").value = scene.bg || "";
  $("#meta-bgm").value = scene.bgm || "";
  renderSceneList(); refresh(); renderFormEmpty();
  if (fromWip) toast(`✎ Загружен черновик «${id}» (не сохранён в файл)`);
}

/* ── Список сцен ── */
function renderSceneList() {
  $("#scene-list").innerHTML = E.scenes.map(sc =>
    `<button class="scene-row ${sc.id === E.sceneId ? "active" : ""}" data-id="${esc(sc.id)}">
      ${esc(sc.title || sc.id)}<span class="id">${esc(sc.id)}</span>
    </button>`).join("");
  document.querySelectorAll(".scene-row").forEach(b => b.onclick = () => loadScene(b.dataset.id));
}

/* ── Список шагов ── */
function summarize(s) {
  const t = stepType(s);
  const cut = x => { x = String(x ?? "").replace(/\s+/g, " ").trim(); return x.length > 52 ? x.slice(0, 51) + "…" : x; };
  const cond = c => !c ? "" : Array.isArray(c) || c.all || c.any ? "(составное)" :
    `${c.var}${c.min !== undefined ? "≥" + c.min : ""}${c.max !== undefined ? " ≤" + c.max : ""}${c.eq !== undefined ? "=" + c.eq : ""}${c.ne !== undefined ? "≠" + c.ne : ""}`;
  switch (t) {
    case "say": return `${s.say.who || "?"}${s.say.expr ? " [" + s.say.expr + "]" : ""}: ${cut(s.say.text)}`;
    case "narr": return cut(s.narr);
    case "card": return "▌ " + cut(typeof s.card === "string" ? s.card : s.card?.title);
    case "memo": return "🕊 " + cut(s.memo);
    case "show": return `${s.show.char}.${s.show.expr || "neutral"} → ${s.show.slot || "center"}${s.show.enter ? " (" + s.show.enter + ")" : ""}`;
    case "hide": return s.hide === "all" ? "всех" : `${s.hide.char || s.hide.slot}${s.hide.exit ? " (" + s.hide.exit + ")" : ""}`;
    case "bg": return "🖼 " + (s.bg || "— убрать —");
    case "cg": return "🎴 " + (s.cg || "— убрать —");
    case "bgm": return s.bgm === null ? "музыка: стоп" : "♪ " + s.bgm;
    case "sfx": return "🔊 " + s.sfx;
    case "set": return Object.entries(s.set || {}).map(([k, v]) => `${k}${typeof v === "number" ? (v >= 0 ? "+" + v : v) : "=" + (v && typeof v === "object" ? v["="] : v)}`).join(" ");
    case "label": return "⚑ " + s.label;
    case "goto": return "→ " + s.goto;
    case "if": return `если ${cond(s.if)} → ${s.if.goto}${s.if.else ? " иначе → " + s.if.else : ""}`;
    case "choice": return `[${(s.choice || []).length}] ${cut((s.choice || []).map(o => o.text).join(" / "))}`;
    case "wait": return `⏱ ${s.wait} мс`;
    case "shake": return "〰 " + s.shake;
    case "flash": return "✦ " + s.flash;
    case "minigame": return `🎮 ${s.minigame}${s.win ? " ✓→" + s.win : ""}${s.lose ? " ✗→" + s.lose : ""}`;
    case "scene": return "⏩ " + s.scene + (s.at ? " @" + s.at : "");
    case "end": return "🏁 " + (s.end?.title || "Конец");
    default: return cut(JSON.stringify(s));
  }
}

function renderSteps() {
  const steps = E.scene?.steps || [];
  const flags = {};
  E.problems.forEach(p => { if (p.step !== null && p.level !== "info") flags[p.step] = flags[p.step] === "error" ? "error" : p.level; });
  $("#step-count").textContent = `шагов: ${steps.length}`;
  $("#steps").innerHTML = steps.map((s, i) => {
    const t = stepType(s);
    return `<div class="step ${i === E.sel ? "sel" : ""} ${t === "label" ? "is-label" : ""}" data-i="${i}">
      <span class="n">${i}</span>
      <span class="type t-${t}">${t}</span>
      <span class="sum">${esc(summarize(s))}</span>
      <span class="warn-flag ${flags[i] || ""}">${flags[i] === "error" ? "✗" : flags[i] ? "~" : ""}</span>
    </div>`;
  }).join("");
  document.querySelectorAll(".step").forEach(el => el.onclick = () => { E.sel = +el.dataset.i; renderSteps(); renderForm(); });
  const canMove = E.sel >= 0;
  $("#mv-up").disabled = !canMove || E.sel === 0;
  $("#mv-down").disabled = !canMove || E.sel >= steps.length - 1;
  $("#dup-step").disabled = !canMove;
  $("#del-step").disabled = !canMove;
}

/** Перепроверить и перерисовать список + полоску проблем + проблемы в форме */
function refresh() {
  lintNow(); renderSteps(); renderProblems(false);
  const fp = $("#f-problems");
  if (fp) fp.innerHTML = formProblems();
}
function formProblems() {
  return E.problems.filter(p => p.step === E.sel).map(p =>
    `<div class="f-problem ${p.level}">${p.level === "error" ? "✗" : p.level === "warn" ? "~" : "·"} ${esc(p.msg)}</div>`).join("");
}

/* ── Операции над шагами ── */
function insertStep(st) {
  const at = E.sel >= 0 ? E.sel : E.scene.steps.length - 1;
  E.scene.steps.splice(at + 1, 0, st);
  E.sel = at + 1;
  markDirty(); refresh(); renderForm();
}
function moveStep(dir) {
  const i = E.sel, j = i + dir, steps = E.scene.steps;
  if (i < 0 || j < 0 || j >= steps.length) return;
  [steps[i], steps[j]] = [steps[j], steps[i]];
  E.sel = j; markDirty(); refresh();
}
function dupStep() {
  if (E.sel < 0) return;
  const copy = JSON.parse(JSON.stringify(E.scene.steps[E.sel]));
  if (typeof copy.label === "string") copy.label = nextLabel();
  E.scene.steps.splice(E.sel + 1, 0, copy);
  E.sel++; markDirty(); refresh(); renderForm();
}
function delStep() {
  if (E.sel < 0) return;
  E.scene.steps.splice(E.sel, 1);
  if (E.sel >= E.scene.steps.length) E.sel = E.scene.steps.length - 1;
  markDirty(); refresh(); renderForm();
}

/* ── Формы ── */
const R = () => $("#right");
const opts = (list, cur, blank) => (blank !== undefined ? `<option value="">${esc(blank)}</option>` : "") +
  list.map(v => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(v)}</option>`).join("");
const labelOpts = cur => labels().length ? opts(labels(), cur) + (cur && !labels().includes(cur) ? `<option value="${esc(cur)}" selected>${esc(cur)} (нет такой!)</option>` : "") : `<option value="">— нет меток —</option>`;
const gotoOrBlank = (cur, blank = "— (продолжить дальше) —") => `<option value="">${blank}</option>` + labelOpts(cur);

function charSelect(cur, blank = "— герой —") {
  return `<option value="">${blank}</option>` + Object.entries(E.manifest).map(([k, v]) =>
    `<option value="${esc(k)}" ${k === cur ? "selected" : ""}>${esc(v.name)} (${esc(k)})</option>`).join("");
}
const exprsOf = char => Object.keys(E.manifest[char] || {}).filter(k => E.manifest[char][k]?.file);
function exprSelect(char, cur, blank) { return opts(exprsOf(char), cur, blank); }
function whoSelect(cur) {
  const names = [...new Set(Object.values(E.manifest).map(v => v.name)), ...(E.cfg.speakers || [])];
  const known = names.includes(cur) || E.manifest[cur];
  return names.map(n => `<option value="${esc(n)}" ${n === cur ? "selected" : ""}>${esc(n)}</option>`).join("") +
    `<option value="__custom" ${!known && cur ? "selected" : ""}>✏️ своё имя…</option>`;
}
function varDatalist() {
  return `<datalist id="varlist">${varList().map(k => `<option value="${esc(k)}">`).join("")}</datalist>`;
}
const jsonVal = v => v === undefined ? "" : esc(JSON.stringify(v));
/** Парсер JSON-поля формы: пусто → undefined; ошибка → подсветка */
function bindJson(el, fn) {
  el.oninput = () => {
    const v = el.value.trim();
    if (!v) { el.classList.remove("bad"); fn(undefined); return; }
    try { const j = JSON.parse(v); el.classList.remove("bad"); fn(j); }
    catch { el.classList.add("bad"); }
  };
}

function renderFormEmpty() {
  R().innerHTML = `<div class="empty-hint">Выбери шаг — форма появится здесь.<br><br>
    Типовая связка: <b>show → say → say → hide</b>.<br>
    Эмоцию можно менять прямо в реплике (поле «Эмоция»).<br>
    Герой, показанный в другом слоте, переедет туда сам.</div>`;
}

function renderForm() {
  if (E.sel < 0 || !E.scene || !E.scene.steps[E.sel]) return renderFormEmpty();
  const s = E.scene.steps[E.sel];
  const t = stepType(s);
  let html = `<h2>Шаг ${E.sel} · ${esc(SC.STEPS[t]?.title || t)}</h2><div id="f-problems">${formProblems()}</div>`;
  const upd = () => { markDirty(); refresh(); syncRaw(); };

  switch (t) {
    case "say": {
      const ch = SC.speakerOf(s.say.who, E.manifest);
      html += `
      <div class="f-row"><label>Кто говорит</label><select id="f-who">${whoSelect(s.say.who)}</select></div>
      <div class="f-row" id="f-who-custom-row" style="display:none"><label>Своё имя</label><input id="f-who-custom" type="text" value="${esc(s.say.who)}"></div>
      <div class="f-row"><label>Эмоция (сменится, если герой на экране)</label><select id="f-expr" ${ch ? "" : "disabled"}>${ch ? exprSelect(ch, s.say.expr, "— не менять —") : `<option>— не персонаж —</option>`}</select></div>
      <div class="f-row"><label>Текст</label><textarea id="f-text">${esc(s.say.text)}</textarea>
        <div class="f-hint">Мысли героини — в скобках. Переменная в тексте: {{trust}}</div></div>`;
      break;
    }
    case "narr": html += `<div class="f-row"><label>Текст нарратива</label><textarea id="f-text">${esc(s.narr)}</textarea></div>`; break;
    case "card": {
      const c = typeof s.card === "string" ? { title: s.card } : s.card || {};
      html += `<div class="f-row"><label>Заголовок</label><input id="f-title" type="text" value="${esc(c.title)}"></div>
        <div class="f-row"><label>Подзаголовок (опц.)</label><input id="f-sub" type="text" value="${esc(c.sub)}"></div>`;
      break;
    }
    case "memo": html += `<div class="f-row"><label>Памятная метка</label><input id="f-text" type="text" value="${esc(s.memo)}"></div>
      <div class="f-hint">Попадает в Пауза → «Память»; тост — если game.json → memoToast: true.</div>`; break;

    case "show": {
      const d = s.show;
      html += `
      <div class="f-row"><label>Персонаж</label><select id="f-char">${charSelect(d.char)}</select></div>
      <div class="f-row"><label>Эмоция</label><select id="f-expr">${exprSelect(d.char, d.expr || "neutral")}</select></div>
      <div class="row-flex">
        <div class="f-row"><label>Слот</label><select id="f-slot">${opts(SC.SLOTS, d.slot || "center")}</select></div>
        <div class="f-row"><label>Вход</label><select id="f-enter">${opts(SC.ENTER, d.enter || "fade")}</select></div>
      </div>
      <div class="f-row"><label>Высота (опц., доля сцены)</label>
        <input id="f-height" type="number" step="0.01" min="0.3" max="1.2" value="${d.height ?? ""}" placeholder="из manifest"></div>
      <div class="sprite-preview" id="sp-prev"></div>
      <div class="f-hint">Если герой уже стоит в другом слоте — он сам переедет сюда.</div>`;
      break;
    }
    case "hide": {
      const d = s.hide === "all" ? { all: true } : s.hide;
      const mode = d.all ? "all" : d.char ? "char" : "slot";
      html += `
      <div class="f-row"><label>Кого убрать</label><select id="f-hmode">
        <option value="slot" ${mode === "slot" ? "selected" : ""}>по слоту</option>
        <option value="char" ${mode === "char" ? "selected" : ""}>по персонажу</option>
        <option value="all" ${mode === "all" ? "selected" : ""}>всех</option></select></div>
      ${mode === "slot" ? `<div class="f-row"><label>Слот</label><select id="f-slot">${opts(SC.SLOTS, d.slot)}</select></div>` : ""}
      ${mode === "char" ? `<div class="f-row"><label>Персонаж</label><select id="f-char">${charSelect(d.char)}</select></div>` : ""}
      ${mode !== "all" ? `<div class="f-row"><label>Уход</label><select id="f-exit">${opts(SC.EXIT, d.exit || "fade")}</select></div>` : ""}`;
      break;
    }
    case "bg": html += `
      <div class="f-row"><label>Фон</label><select id="f-bg">${opts(E.bgs, s.bg, "— убрать фон —")}</select></div>
      <div id="bg-prev"></div>`; break;
    case "cg": html += `
      <div class="f-row"><label>CG</label><select id="f-cg">${opts((E.cfg.gallery || []).map(g => g.id), s.cg, "— убрать CG —")}</select></div>
      <div class="f-hint">Список CG — game.json → gallery; файлы — game/assets/cg/&lt;id&gt;.webp</div>`; break;
    case "bgm": html += `
      <div class="f-row"><label>Музыка</label><select id="f-bgm">
        <option value="__stop" ${s.bgm === null ? "selected" : ""}>⏹ стоп</option>${opts(E.audio.bgm, s.bgm)}</select></div>`; break;
    case "sfx": html += `<div class="f-row"><label>Звук</label><select id="f-sfx">${opts(E.audio.sfx, s.sfx)}</select></div>`; break;
    case "set": html += `<div id="set-rows"></div><button class="mini-btn" id="set-add">＋ строка</button>
      <div class="f-hint">+1 / -2 = прибавка; текст, true/false = присвоение; =5 = присвоить число</div>`; break;
    case "choice": html += `<div id="opt-list"></div><button class="mini-btn" id="opt-add">＋ опция</button>`; break;
    case "label": html += `<div class="f-row"><label>Имя метки</label><input id="f-text" type="text" value="${esc(s.label)}">
      <div class="f-hint">Уникально в сцене, латиницей: c2_tea, c2_tea_r1…</div></div>`; break;
    case "goto": html += `<div class="f-row"><label>К метке</label><select id="f-goto">${labelOpts(s.goto)}</select></div>`; break;
    case "if": {
      const c = s.if;
      const simple = !(Array.isArray(c) || c.all || c.any);
      html += simple ? `
      <div class="f-row"><label>Переменная</label><input id="f-var" type="text" list="varlist" value="${esc(c.var || "")}"></div>
      <div class="row-flex">
        <div class="f-row"><label>мин. ≥</label><input id="f-min" type="number" value="${c.min ?? ""}"></div>
        <div class="f-row"><label>макс. ≤</label><input id="f-max" type="number" value="${c.max ?? ""}"></div>
        <div class="f-row"><label>равно</label><input id="f-eq" type="text" value="${c.eq === undefined ? "" : esc(JSON.stringify(c.eq))}" placeholder="true / 3 / &quot;x&quot;"></div>
      </div>` : `<div class="f-hint">Составное условие (all/any) — правь в «JSON шага» ниже.</div>`;
      html += `
      <div class="f-row"><label>Если выполнено →</label><select id="f-goto">${labelOpts(c.goto)}</select></div>
      <div class="f-row"><label>Иначе →</label><select id="f-else">${gotoOrBlank(c.else)}</select></div>`;
      break;
    }
    case "wait": html += `<div class="f-row"><label>Пауза, мс</label><input id="f-num" type="number" min="1" max="20000" value="${s.wait}"></div>`; break;
    case "shake": html += `<div class="f-row"><label>Сила</label><select id="f-shake">${opts(["small", "big"], s.shake === true ? "small" : s.shake)}</select></div>`; break;
    case "flash": html += `<div class="f-row"><label>Цвет</label><input id="f-color" type="color" value="${typeof s.flash === "string" && /^#[0-9a-f]{6}$/i.test(s.flash) ? s.flash : "#ffffff"}"></div>`; break;
    case "minigame": html += `
      <div class="f-row"><label>Мини-игра</label><select id="f-mg">${opts(minigameList(), s.minigame)}</select></div>
      <div class="f-row"><label>params (JSON)</label><textarea id="f-params" class="code">${s.params ? esc(JSON.stringify(s.params, null, 1)) : ""}</textarea>
        <div class="f-hint">timing: {"rounds":3,"need":2} · quiz: {"questions":[{"q":"…","options":["а","б"],"answer":0}]}</div></div>
      <div class="row-flex">
        <div class="f-row"><label>Победа →</label><select id="f-win">${gotoOrBlank(s.win)}</select></div>
        <div class="f-row"><label>Проигрыш →</label><select id="f-lose">${gotoOrBlank(s.lose)}</select></div>
      </div>
      <div class="row-flex">
        <div class="f-row"><label>onWin (set JSON)</label><input id="f-onwin" type="text" value="${jsonVal(s.onWin)}" placeholder='{"trust":1}'></div>
        <div class="f-row"><label>onLose (set JSON)</label><input id="f-onlose" type="text" value="${jsonVal(s.onLose)}"></div>
      </div>
      <div class="row-flex">
        <div class="f-row"><label>Очки в переменную</label><input id="f-mvar" type="text" list="varlist" value="${esc(s.var || "")}"></div>
        <div class="f-row"><label>Пропуск</label><select id="f-skip">
          <option value="lose" ${s.skippable !== false && s.skipAs !== "win" ? "selected" : ""}>можно, = проигрыш</option>
          <option value="win" ${s.skippable !== false && s.skipAs === "win" ? "selected" : ""}>можно, = победа</option>
          <option value="no" ${s.skippable === false ? "selected" : ""}>нельзя</option></select></div>
      </div>`; break;
    case "scene": html += `<div class="f-row"><label>Сцена</label><select id="f-scene">${opts(E.scenes.map(x => x.id), s.scene)}
        ${!E.scenes.find(x => x.id === s.scene) ? `<option value="${esc(s.scene)}" selected>${esc(s.scene)} (нет в конфиге)</option>` : ""}</select></div>
      <div class="f-row"><label>С метки (опц.)</label><input id="f-at" type="text" value="${esc(s.at || "")}" placeholder="с начала"></div>
      <div class="f-hint">Текущая сцена на этом заканчивается.</div>`; break;
    case "end": html += `
      <div class="f-row"><label>Заголовок</label><input id="f-title" type="text" value="${esc(s.end?.title || "")}"></div>
      <div class="f-row"><label>Подпись</label><textarea id="f-sub" style="min-height:60px">${esc(s.end?.sub || "")}</textarea></div>`;
      break;
    default: html += `<div class="empty-hint">Неизвестный тип шага — исправь в JSON ниже.</div>`;
  }
  html += `<details class="raw" ${t === "?" ? "open" : ""}><summary>{ } JSON шага</summary>
    <textarea id="f-raw" class="code"></textarea><div class="f-hint">Правка применяется, когда JSON корректен.</div></details>`;
  R().innerHTML = html + varDatalist();
  syncRaw();
  $("#f-raw").oninput = e => {
    try {
      const j = JSON.parse(e.target.value);
      if (!j || typeof j !== "object" || Array.isArray(j)) throw 0;
      e.target.classList.remove("bad");
      E.scene.steps[E.sel] = j;
      markDirty(); refresh();
    } catch { e.target.classList.add("bad"); }
  };
  $("#f-raw").onchange = () => renderForm();

  /* ── бинды ── */
  const on = (id, ev, fn) => { const el = $(id); if (el) el[ev] = fn; };
  if (t === "say") {
    const sel = $("#f-who"), row = $("#f-who-custom-row"), inp = $("#f-who-custom");
    if (sel.value === "__custom") row.style.display = "block";
    sel.onchange = () => {
      if (sel.value === "__custom") { row.style.display = "block"; inp.focus(); return; }
      s.say.who = sel.value; delete s.say.expr; upd(); renderForm();
    };
    inp.oninput = () => { s.say.who = inp.value; upd(); };
    on("#f-expr", "onchange", e => { if (e.target.value) s.say.expr = e.target.value; else delete s.say.expr; upd(); });
    $("#f-text").oninput = e => { s.say.text = e.target.value; upd(); };
  }
  if (t === "narr") $("#f-text").oninput = e => { s.narr = e.target.value; upd(); };
  if (t === "card") {
    const set = () => { const sub = $("#f-sub").value; s.card = sub ? { title: $("#f-title").value, sub } : { title: $("#f-title").value }; upd(); };
    $("#f-title").oninput = set; $("#f-sub").oninput = set;
  }
  if (t === "memo") $("#f-text").oninput = e => { s.memo = e.target.value; upd(); };
  if (t === "show") {
    const d = s.show, cs = $("#f-char"), es = $("#f-expr"), h = $("#f-height");
    const refPrev = () => {
      const file = E.manifest[cs.value]?.[es.value]?.file;
      $("#sp-prev").innerHTML = file ? `<img src="game/assets/sprites/${esc(file)}">` : "<i style='color:#6f674f'>нет картинки</i>";
    };
    cs.onchange = () => { d.char = cs.value; es.innerHTML = exprSelect(cs.value, "neutral"); d.expr = es.value; refPrev(); upd(); };
    es.onchange = () => { d.expr = es.value; refPrev(); upd(); };
    $("#f-slot").onchange = e => { d.slot = e.target.value; upd(); };
    $("#f-enter").onchange = e => { d.enter = e.target.value; upd(); };
    h.oninput = () => { const v = parseFloat(h.value); if (isNaN(v)) delete d.height; else d.height = v; upd(); };
    refPrev();
  }
  if (t === "hide") {
    $("#f-hmode").onchange = e => {
      const m = e.target.value;
      s.hide = m === "all" ? "all" : m === "char" ? { char: firstChar(), exit: "fade" } : { slot: "center", exit: "fade" };
      upd(); renderForm();
    };
    on("#f-slot", "onchange", e => { s.hide.slot = e.target.value; upd(); });
    on("#f-char", "onchange", e => { s.hide.char = e.target.value; upd(); });
    on("#f-exit", "onchange", e => { s.hide.exit = e.target.value; upd(); });
  }
  if (t === "bg") {
    const b = $("#f-bg");
    const refPrev = () => { $("#bg-prev").innerHTML = b.value ? `<img class="bg-preview" src="game/assets/bg/${esc(b.value)}.webp">` : ""; };
    b.onchange = () => { s.bg = b.value || null; refPrev(); upd(); };
    refPrev();
  }
  if (t === "cg") $("#f-cg").onchange = e => { s.cg = e.target.value || null; upd(); };
  if (t === "bgm") $("#f-bgm").onchange = e => { s.bgm = e.target.value === "__stop" ? null : e.target.value; upd(); };
  if (t === "sfx") $("#f-sfx").onchange = e => { s.sfx = e.target.value; upd(); };
  if (t === "set") renderSetRows(s.set, upd);
  if (t === "choice") renderChoiceEditor(s.choice, upd);
  if (t === "label") $("#f-text").oninput = e => { s.label = e.target.value.trim(); upd(); };
  if (t === "goto") $("#f-goto").onchange = e => { s.goto = e.target.value; upd(); };
  if (t === "if") {
    const c = s.if;
    on("#f-var", "oninput", e => { c.var = e.target.value.trim(); upd(); });
    on("#f-min", "oninput", e => { const v = e.target.value; if (v === "") delete c.min; else c.min = +v; upd(); });
    on("#f-max", "oninput", e => { const v = e.target.value; if (v === "") delete c.max; else c.max = +v; upd(); });
    on("#f-eq", "oninput", e => { const v = e.target.value.trim(); if (!v) delete c.eq; else { try { c.eq = JSON.parse(v); } catch { c.eq = v; } } upd(); });
    $("#f-goto").onchange = e => { c.goto = e.target.value; upd(); };
    $("#f-else").onchange = e => { if (e.target.value) c.else = e.target.value; else delete c.else; upd(); };
  }
  if (t === "wait") $("#f-num").oninput = e => { s.wait = +e.target.value; upd(); };
  if (t === "shake") $("#f-shake").onchange = e => { s.shake = e.target.value; upd(); };
  if (t === "flash") $("#f-color").oninput = e => { s.flash = e.target.value; upd(); };
  if (t === "minigame") {
    const opt = (k, v) => { if (v === undefined || v === "") delete s[k]; else s[k] = v; upd(); };
    $("#f-mg").onchange = e => { s.minigame = e.target.value; upd(); };
    bindJson($("#f-params"), v => opt("params", v));
    bindJson($("#f-onwin"), v => opt("onWin", v));
    bindJson($("#f-onlose"), v => opt("onLose", v));
    $("#f-win").onchange = e => opt("win", e.target.value);
    $("#f-lose").onchange = e => opt("lose", e.target.value);
    $("#f-mvar").oninput = e => opt("var", e.target.value.trim());
    $("#f-skip").onchange = e => {
      const v = e.target.value;
      if (v === "no") { s.skippable = false; delete s.skipAs; }
      else { delete s.skippable; if (v === "win") s.skipAs = "win"; else delete s.skipAs; }
      upd();
    };
  }
  if (t === "scene") {
    $("#f-scene").onchange = e => { s.scene = e.target.value; upd(); };
    $("#f-at").oninput = e => { const v = e.target.value.trim(); if (v) s.at = v; else delete s.at; upd(); };
  }
  if (t === "end") {
    if (!s.end || typeof s.end !== "object") s.end = {};
    $("#f-title").oninput = e => { s.end.title = e.target.value; upd(); };
    $("#f-sub").oninput = e => { s.end.sub = e.target.value; upd(); };
  }
}
/** Обновить «JSON шага» после правки формы (если пользователь сейчас не печатает в нём) */
function syncRaw() {
  const raw = $("#f-raw");
  if (raw && document.activeElement !== raw && E.scene.steps[E.sel]) {
    raw.value = JSON.stringify(E.scene.steps[E.sel], null, 2);
    raw.classList.remove("bad");
  }
}

/* set-редактор */
function parseSetValue(v) {
  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return parseFloat(v);
  if (/^=\s*-?\d+(\.\d+)?$/.test(v)) return { "=": parseFloat(v.replace("=", "")) };
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}
const showSetValue = v => v && typeof v === "object" ? "=" + v["="] : typeof v === "number" && v >= 0 ? "+" + v : String(v);
function renderSetRows(set, upd) {
  const wrap = $("#set-rows");
  const rows = Object.entries(set || {});
  wrap.innerHTML = rows.map(([k, v], i) => `
    <div class="set-row" data-i="${i}">
      <input type="text" list="varlist" data-f="k" value="${esc(k)}" placeholder="переменная">
      <input type="text" data-f="v" value="${esc(showSetValue(v))}" placeholder="+1 / =0 / текст / true">
      <button class="mini-btn danger" data-f="del">✕</button>
    </div>`).join("");
  $("#set-add").onclick = () => { let k = "new_var", n = 1; while (k in set) k = "new_var" + ++n; set[k] = 1; renderSetRows(set, upd); upd(); };
  wrap.querySelectorAll(".set-row").forEach(row => {
    const i = +row.dataset.i, keyInput = row.querySelector("[data-f=k]"), valInput = row.querySelector("[data-f=v]");
    keyInput.onchange = () => {
      const entries = Object.entries(set);
      const nk = keyInput.value.trim();
      if (!nk || (nk in set && entries[i][0] !== nk)) { keyInput.value = entries[i][0]; return; }
      entries[i][0] = nk;
      Object.keys(set).forEach(k => delete set[k]);
      entries.forEach(([k, v]) => set[k] = v);
      upd();
    };
    valInput.oninput = () => { set[Object.keys(set)[i]] = parseSetValue(valInput.value.trim()); upd(); };
    row.querySelector("[data-f=del]").onclick = () => { delete set[Object.keys(set)[i]]; renderSetRows(set, upd); upd(); };
  });
}

/* choice-редактор */
function condToText(c) {
  if (!c) return "";
  if (Array.isArray(c) || c.all || c.any) return JSON.stringify(c);
  let s = c.var;
  if (c.min !== undefined) s += ">=" + c.min;
  if (c.max !== undefined) s += "<=" + c.max;
  if (c.eq !== undefined) s += "==" + JSON.stringify(c.eq);
  if (c.ne !== undefined) s += "!=" + JSON.stringify(c.ne);
  return s;
}
/** "trust>=2", "lei>=1<=3", "f_met==true", "x!=0" или JSON-объект */
function textToCond(v) {
  if (v.startsWith("{") || v.startsWith("[")) return JSON.parse(v);
  const m = v.match(/^(\w+)\s*(.*)$/);
  if (!m) throw 0;
  const c = { var: m[1] };
  const re = /(>=|<=|==|!=)\s*("[^"]*"|[^<>=!\s]+)/g;
  let part, any = false;
  while ((part = re.exec(m[2]))) {
    any = true;
    const val = JSON.parse(/^[-\d.]+$|^true$|^false$|^"/.test(part[2]) ? part[2] : JSON.stringify(part[2]));
    c[{ ">=": "min", "<=": "max", "==": "eq", "!=": "ne" }[part[1]]] = val;
  }
  if (!any) throw 0;
  return c;
}
function renderChoiceEditor(choice, upd) {
  const wrap = $("#opt-list");
  wrap.innerHTML = choice.map((o, i) => `
    <div class="opt-card" data-i="${i}">
      <div class="f-row"><label>Текст кнопки ${i + 1}</label><input type="text" data-f="text" value="${esc(o.text)}"></div>
      <div class="row-flex">
        <div class="f-row"><label>Переход</label><select data-f="goto">${gotoOrBlank(o.goto)}</select></div>
        <div class="f-row"><label>Условие 🔒</label>
          <input type="text" data-f="cond" placeholder="trust>=2" value="${esc(condToText(o.if))}"></div>
      </div>
      <div class="row-flex">
        <div class="f-row"><label>set (JSON)</label><input type="text" data-f="set" value="${jsonVal(o.set)}" placeholder='{"trust":1}'></div>
        <div class="f-row"><label>Если заперта</label><select data-f="locked">
          <option value="" ${o.locked !== "hide" ? "selected" : ""}>показать 🔒</option>
          <option value="hide" ${o.locked === "hide" ? "selected" : ""}>скрыть</option></select></div>
      </div>
      <div class="f-row"><label>Ответ-нарратив (опц.)</label><input type="text" data-f="narr" value="${esc(o.narr || "")}"></div>
      <div class="f-row"><label>🕊 Памятка (опц.)</label><input type="text" data-f="memo" value="${esc(o.memo || "")}"></div>
      <button class="mini-btn danger" data-f="del">Удалить опцию</button>
    </div>`).join("");

  $("#opt-add").onclick = () => { choice.push({ text: "Новая опция" }); renderChoiceEditor(choice, upd); upd(); };
  wrap.querySelectorAll(".opt-card").forEach(card => {
    const i = +card.dataset.i, o = choice[i];
    const el = f => card.querySelector(`[data-f=${f}]`);
    const optional = (k, v) => { if (v) o[k] = v; else delete o[k]; upd(); };
    el("text").oninput = e => { o.text = e.target.value; upd(); };
    el("goto").onchange = e => optional("goto", e.target.value);
    el("locked").onchange = e => optional("locked", e.target.value);
    el("narr").oninput = e => optional("narr", e.target.value);
    el("memo").oninput = e => optional("memo", e.target.value);
    el("cond").oninput = e => {
      const v = e.target.value.trim();
      if (!v) { delete o.if; e.target.classList.remove("bad"); upd(); return; }
      try { o.if = textToCond(v); e.target.classList.remove("bad"); upd(); } catch { e.target.classList.add("bad"); }
    };
    bindJson(el("set"), v => optional("set", v));
    el("del").onclick = () => { choice.splice(i, 1); renderChoiceEditor(choice, upd); upd(); };
  });
}

/* ── Проверка (та же схема, что у движка и tools/lint_scenes.mjs; без проверки файлов на диске) ── */
function lintNow() {
  if (!E.scene) { E.problems = []; return; }
  E.problems = SC.lintScene(E.scene, {
    id: E.sceneId, manifest: E.manifest, bgs: E.bgs, audio: E.audio,
    cgs: (E.cfg.gallery || []).map(g => g.id), vars: varList(), speakers: E.cfg.speakers || [],
    scenes: E.scenes.map(s => s.id), minigames: minigameList()
  });
}
function renderProblems(force) {
  const box = $("#problems");
  const list = E.problems.filter(p => p.level !== "info");
  const nErr = list.filter(p => p.level === "error").length;
  $("#tb-lint").textContent = list.length ? `${nErr ? "✗ " + nErr : "✓"}${list.length - nErr ? " ~" + (list.length - nErr) : ""} Проверка` : "✓ Проверка";
  $("#tb-lint").classList.toggle("has-errors", nErr > 0);
  if (!force) { if (!list.length) box.classList.remove("open"); else if (box.classList.contains("open")) fill(); return; }
  if (!list.length) { box.classList.remove("open"); toast("✓ Проблем не найдено"); return; }
  fill();
  box.classList.add("open");
  function fill() {
    box.innerHTML = `<h3>Проблем: ${list.length} <button class="mini-btn" id="pr-close">скрыть</button></h3>` + list.map(x =>
      `<div class="p-row ${x.level}" data-i="${x.step ?? ""}">${x.level === "error" ? "✗" : "~"} ${x.step !== null ? "шаг " + x.step + ": " : ""}${esc(x.msg)}</div>`).join("");
    $("#pr-close").onclick = () => box.classList.remove("open");
    box.querySelectorAll(".p-row").forEach(el => el.onclick = () => {
      if (el.dataset.i === "") return;
      E.sel = +el.dataset.i; renderSteps(); renderForm();
      document.querySelector(`.step[data-i="${E.sel}"]`)?.scrollIntoView({ block: "center" });
    });
  }
}

/* ── Папка проекта (File System Access API: Chrome/Edge на компьютере) ── */
async function connectFolder() {
  try {
    const dir = await showDirectoryPicker({ mode: "readwrite" });
    const game = await dir.getDirectoryHandle("game").catch(() => null);
    if (!game || !(await game.getFileHandle("game.json").catch(() => null))) {
      toast("✗ Это не корень проекта (нет game/game.json)", true); return;
    }
    E.dir = dir;
    $("#tb-folder").textContent = "📁 " + dir.name;
    $("#tb-export").textContent = "💾 Сохранить";
    toast("Папка подключена: «Сохранить» пишет прямо в game/scenes/");
  } catch { /* пользователь отменил */ }
}
async function writeFile(pathParts, text) {
  let d = E.dir;
  for (const p of pathParts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
  const f = await d.getFileHandle(pathParts[pathParts.length - 1], { create: true });
  const w = await f.createWritable();
  await w.write(text);
  await w.close();
}

/* ── Экспорт / импорт / тест ── */
const sceneJson = () => JSON.stringify(E.scene, null, 2) + "\n";
async function exportScene() {
  if (!E.scene) return;
  const errs = E.problems.filter(p => p.level === "error").length;
  if (E.dir) {
    try {
      await writeFile(["game", "scenes", E.sceneId + ".json"], sceneJson());
      // новая сцена → вписать в game.json
      const cfgText = await (await (await (await E.dir.getDirectoryHandle("game")).getFileHandle("game.json")).getFile()).text();
      const cfg = JSON.parse(cfgText);
      if (!(cfg.scenes || []).some(s => s.id === E.sceneId)) {
        cfg.scenes = cfg.scenes || [];
        cfg.scenes.push({ id: E.sceneId, title: E.scenes.find(s => s.id === E.sceneId)?.title || E.sceneId });
        await writeFile(["game", "game.json"], JSON.stringify(cfg, null, 2) + "\n");
        E.cfg.scenes = cfg.scenes;
      }
    } catch (e) { toast("✗ Не удалось записать: " + e.message, true); return; }
    toast(`💾 game/scenes/${E.sceneId}.json сохранён${errs ? ` (ошибок проверки: ${errs})` : ""}`, errs > 0);
  } else {
    const blob = new Blob([sceneJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${E.sceneId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`⇩ Скачан ${E.sceneId}.json — положи его в game/scenes/${errs ? ` (ошибок проверки: ${errs})` : ""}`, errs > 0);
  }
  localStorage.removeItem("vn_editor_wip::" + E.sceneId);
  E.dirty = false; $("#dirty-dot").classList.add("hidden");
}

function importScene(e) {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(rd.result);
      if (!Array.isArray(j.steps)) throw 0;
      E.scene = j;
      E.sceneId = j.id || f.name.replace(/\.json$/, "");
      if (!E.scenes.find(x => x.id === E.sceneId)) E.scenes.push({ id: E.sceneId, title: j.title || E.sceneId });
      E.sel = -1; markDirty();
      renderSceneList(); refresh(); renderFormEmpty();
      $("#meta-bg").value = j.bg || ""; $("#meta-bgm").value = j.bgm || "";
      toast("⇪ Сцена импортирована");
    } catch { toast("✗ Это не сцена Sova VN (нет steps)", true); }
  };
  rd.readAsText(f);
  e.target.value = "";
}

function newScene() {
  const id = prompt("ID новой сцены (латиницей, напр. ch2):");
  if (!id) return;
  if (!/^[\w-]+$/.test(id)) return toast("✗ Только латиница, цифры, _ и -", true);
  if (E.scenes.find(x => x.id === id)) return toast("✗ Такая сцена уже есть", true);
  const title = prompt("Название (для меню сейвов):", id) || id;
  E.scene = { id, title, steps: [{ narr: "…" }, { end: { title: "Конец" } }] };
  E.sceneId = id; E.sel = 0;
  E.scenes.push({ id, title });
  markDirty();
  renderSceneList(); refresh(); renderForm();
  toast(E.dir ? `＋ «${id}»: «Сохранить» создаст файл и впишет сцену в game.json` : `＋ «${id}»: экспортируй и добавь { "id": "${id}" } в game.json → scenes`);
}

/** Тест сцены в движке. fromHere — начать с выбранного шага */
function testScene(fromHere) {
  if (!E.scene) return;
  localStorage.setItem("__vn_preview", JSON.stringify(E.scene));
  const at = fromHere && E.sel >= 0 ? `&at=${E.sel}` : "";
  window.open(`index.html?preview=1&debug=1${at}`, "_blank");
}

function showHelp() {
  alert(`Конструктор Sova VN — коротко:

1) Слева — сцены из game.json. Центр — шаги. Справа — форма выбранного шага.
2) «＋ Шаг ниже» добавляет шаг выбранного типа. ↑↓ — двигать, ⧉ — копия, 🗑 — удалить.
3) Проверка идёт сама: ✗/~ возле шага = ошибка/предупреждение. Кнопка «Проверка» — список.
4) «▶ Тест» — сцена в движке с начала; «▶ С шага» — с выбранного шага.
5) «📁 Папка проекта» (Chrome/Edge) — тогда «💾 Сохранить» (Ctrl+S) пишет прямо в game/scenes/.
   Без папки — «⇩ Экспорт» скачивает файл: положи его в game/scenes/.
6) Правки автосохраняются как черновик в браузере до сохранения в файл.
7) Любой шаг можно править как JSON (внизу формы).

Подробно: docs/EDITOR.md · формат шагов: docs/SCENE_FORMAT.md`);
}

/* ── черновики ── */
let _wipT = null;
function markDirty() {
  E.dirty = true;
  $("#dirty-dot").classList.remove("hidden");
  clearTimeout(_wipT);
  _wipT = setTimeout(() => {
    if (E.sceneId) localStorage.setItem("vn_editor_wip::" + E.sceneId, JSON.stringify(E.scene));
  }, 400);
}

function toast(msg, bad = false) {
  const t = document.createElement("div");
  t.className = "toast-e" + (bad ? " bad" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
document.addEventListener("DOMContentLoaded", () => boot().catch(e => toast("✗ " + e.message, true)));
window.addEventListener("beforeunload", e => { if (E.dirty) { e.preventDefault(); e.returnValue = ""; } });
