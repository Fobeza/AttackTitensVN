/* ui.js — ввод, диалог (печатная машинка), карточки, выборы, авто/пропуск,
 * оверлей-панели (пауза, сейвы, бэклог, настройки, галерея), тосты.
 *
 * ВВОД: один обработчик клика на #stage + клавиатура. Всё, что «ждёт игрока»
 * (реплика, карточка, выбор, пауза, мини-игра), регистрирует себя в this._wait:
 *   { advance(), cancel(), kick?() }. Парсер при перезапуске зовёт cancelWaits(). */
window.VN = window.VN || {};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

VN.ui = {
  settings: {},
  mode: null,          // null | "auto" | "skip"
  _wait: null,
  _onClose: null,

  DEFAULTS: { speed: 22, autoDelay: 1, bgm: 0.55, sfx: 0.85, textSize: 1, skipUnread: false },

  el(id) { return document.getElementById(id); },

  /* ── настройки ── */
  get SKEY() { return (VN.cfg?.storage || "vn") + "_settings"; },
  loadSettings() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(this.SKEY)) || {}; } catch { /* пусто */ }
    this.settings = Object.assign({}, this.DEFAULTS, saved);
    this.applySettings();
  },
  saveSettings() {
    try { localStorage.setItem(this.SKEY, JSON.stringify(this.settings)); } catch { /* квота */ }
  },
  applySettings() {
    document.documentElement.style.setProperty("--ts", this.settings.textSize);
  },

  /* ── экраны ── */
  showStage() {
    this.el("menu-screen").classList.add("hidden");
    this.el("stage").classList.remove("hidden");
    this.el("hud").classList.remove("hidden");
  },
  showMenuScreen() {
    this.el("stage").classList.add("hidden");
    this.el("menu-screen").classList.remove("hidden");
  },
  stageVisible() { return !this.el("stage").classList.contains("hidden"); },
  overlayOpen() { return !this.el("overlay").classList.contains("hidden"); },

  /* ── ввод ── */
  initInput() {
    this.el("stage").addEventListener("click", e => {
      if (e.target.closest("#hud, #choices, #minigame")) return;
      if (this.mode === "skip") { this.setMode(null); return; }
      this.advance();
    });
    document.addEventListener("keydown", e => {
      if (e.target.closest && e.target.closest("input, textarea, select")) return;
      if (this.overlayOpen()) {
        if (e.key === "Escape") { e.preventDefault(); this.closePanel(); }
        return;
      }
      if (!this.stageVisible()) return;
      const k = e.key;
      if (k === " " || k === "Enter" || k === "ArrowRight") {
        if (e.target.closest("button, [role=button], a, #minigame")) return;
        e.preventDefault();
        if (this.mode === "skip") this.setMode(null); else this.advance();
      }
      else if (k === "Escape") { e.preventDefault(); this.pauseUI(); }
      else if (k === "ArrowUp" || k === "b") this.backlog();
      else if (k === "a") this.setMode(this.mode === "auto" ? null : "auto");
      else if (k === "s") this.setMode(this.mode === "skip" ? null : "skip");
      else if (k === "F5") { e.preventDefault(); this.quickSave(); }
      else if (k === "F9") { e.preventDefault(); this.quickLoad(); }
      else if (/^[1-9]$/.test(k)) {
        const btn = this.el("choices").querySelectorAll(".choice-btn:not([disabled])")[+k - 1];
        if (btn && !this.el("choices").classList.contains("hidden")) btn.click();
      }
    });
    this.el("btn-pause").onclick = () => this.pauseUI();
    this.el("btn-backlog").onclick = () => this.backlog();
    this.el("btn-auto").onclick = () => this.setMode(this.mode === "auto" ? null : "auto");
    this.el("btn-skip").onclick = () => this.setMode(this.mode === "skip" ? null : "skip");
  },

  advance() { if (this._wait && !this.overlayOpen()) this._wait.advance(); },

  /** Прервать всё, что ждёт игрока (смена сцены, загрузка, выход в меню) */
  cancelWaits() {
    const w = this._wait;
    this._wait = null;
    if (w) w.cancel();
    this.el("choices").classList.add("hidden");
    this.el("choices").innerHTML = "";
    this.el("card").classList.add("hidden");
  },

  setMode(m) {
    this.mode = m;
    this.el("btn-auto").classList.toggle("on", m === "auto");
    this.el("btn-skip").classList.toggle("on", m === "skip");
    if (this._wait && this._wait.kick) this._wait.kick();
  },
  skipping() { return this.mode === "skip"; },

  /* ── реплики ── */
  /** Ждёт тапа. Возвращает Promise<boolean>: false — ожидание отменено. */
  _line({ who, text, kind }) {
    return new Promise(resolve => {
      const g = VN.game;
      const full = VN.fmt(text);
      const wasRead = VN.persist.isRead(g.scene, g.step);
      VN.persist.markRead(g.scene, g.step);

      const dlg = this.el("dialog"), txt = this.el("text"), sp = this.el("speaker"), hint = this.el("next-hint");
      this.el("choices").classList.add("hidden");
      dlg.classList.remove("hidden");
      const name = who ? VN.renderer.displayName(who) : "";
      if (name) {
        sp.textContent = name;
        const ch = VN.renderer.charOf(who);
        sp.style.color = (ch && VN.renderer.manifest[ch].color) || "";
        sp.classList.remove("hidden");
      } else sp.classList.add("hidden");
      txt.className = kind === "narr" ? "narr" : "";
      txt.textContent = "";
      hint.style.visibility = "hidden";

      const last = g.history[g.history.length - 1];
      if (!last || last.text !== full || last.who !== (name || null)) {
        g.history.push({ who: name || null, text: full });
        if (g.history.length > 80) g.history.shift();
      }

      // длинная реплика режется на страницы по предложениям: каждая помещается в окно без прокрутки
      const pages = this._paginate(full);
      let pi = 0, done = false, raf = 0, timer = 0;
      const lastPage = () => pi >= pages.length - 1;
      const end = ok => {
        if (this._wait === w) this._wait = null;
        cancelAnimationFrame(raf); clearTimeout(timer);
        resolve(ok);
      };
      const nextOrEnd = () => { if (lastPage()) end(true); else { pi++; startPage(); } };
      const schedule = () => {
        clearTimeout(timer);
        if (this.overlayOpen()) return;
        if (this.mode === "skip") timer = setTimeout(nextOrEnd, 50);
        else if (this.mode === "auto") timer = setTimeout(nextOrEnd, (900 + pages[pi].length * 45) * this.settings.autoDelay);
      };
      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        txt.textContent = pages[pi];
        hint.style.visibility = "visible";
        schedule();
      };
      const w = {
        advance: () => { if (!done) finish(); else nextOrEnd(); },
        cancel: () => end(false),
        kick: () => {
          if (this.mode === "skip" && !wasRead && !this.settings.skipUnread) {
            this.setMode(null); this.toast("Дальше непрочитанное — пропуск остановлен"); return;
          }
          if (this.mode === "skip") finish();
          if (done) schedule();
        }
      };
      this._wait = w;

      const cps = 1000 / this.settings.speed;     // speed = мс на символ
      const startPage = () => {
        done = false;
        txt.textContent = "";
        hint.style.visibility = "hidden";
        if (this.mode === "skip") { w.kick(); if (this.mode === "skip") return; }
        const page = pages[pi];
        let start = -1, shown = -1;
        const step = ts => {
          if (done) return;
          if (start < 0) start = ts;
          const n = Math.floor((ts - start) / 1000 * cps);
          if (n !== shown) { shown = n; txt.textContent = page.slice(0, n); }
          if (n >= page.length) { finish(); return; }
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      };
      startPage();
    });
  },

  /** Разбить текст на страницы так, чтобы каждая влезала в окно диалога (по предложениям, затем по словам) */
  _paginate(text) {
    const txt = this.el("text");
    const fits = t => { txt.textContent = t; return txt.scrollHeight <= txt.clientHeight + 1; };
    let pages = [text];
    if (!fits(text)) {
      const parts = text.match(/[^.!?…]+(?:[.!?…]+["»)]*|$)\s*/g) || [text];
      pages = [];
      let cur = "";
      const push = () => { if (cur.trim()) pages.push(cur.trim()); cur = ""; };
      for (const sent of parts) {
        if (fits(cur + sent)) { cur += sent; continue; }
        push();
        if (fits(sent)) { cur = sent; continue; }
        for (const wd of sent.split(/(\s+)/)) {      // одно предложение длиннее окна: режем по словам
          if (fits(cur + wd)) cur += wd; else { push(); cur = wd.trimStart(); }
        }
      }
      push();
      if (!pages.length) pages = [text];
    }
    txt.textContent = "";
    return pages;
  },

  say(who, text) { return this._line({ who, text, kind: "say" }); },
  narr(text) { return this._line({ who: null, text, kind: "narr" }); },

  /** Полноэкранная карточка (главы, «Прошло три дня…») */
  card(v) {
    return new Promise(resolve => {
      const c = this.el("card");
      const title = typeof v === "string" ? v : v.title, sub = typeof v === "string" ? "" : v.sub || "";
      c.innerHTML = `<div class="card-title">${esc(VN.fmt(title))}</div>${sub ? `<div class="card-sub">${esc(VN.fmt(sub))}</div>` : ""}`;
      c.classList.remove("hidden");
      this.el("dialog").classList.add("hidden");
      const wasRead = VN.persist.isRead(VN.game.scene, VN.game.step);
      VN.persist.markRead(VN.game.scene, VN.game.step);
      let timer = 0;
      const end = ok => {
        if (this._wait === w) this._wait = null;
        clearTimeout(timer);
        c.classList.add("hidden");
        resolve(ok);
      };
      const w = {
        advance: () => end(true),
        cancel: () => end(false),
        kick: () => {
          clearTimeout(timer);
          if (this.mode === "skip" && !wasRead && !this.settings.skipUnread) this.setMode(null);
          if (this.mode && !this.overlayOpen()) timer = setTimeout(() => end(true), this.mode === "skip" ? 80 : 2200 * this.settings.autoDelay);
        }
      };
      this._wait = w;
      w.kick();
    });
  },

  /** Пауза в мс. Пропуск сокращает её. */
  sleep(ms) {
    return new Promise(resolve => {
      const t = setTimeout(() => end(true), this.mode === "skip" ? 0 : ms);
      const end = ok => { clearTimeout(t); if (this._wait === w) this._wait = null; resolve(ok); };
      const w = { advance: () => {}, cancel: () => end(false) };
      this._wait = w;
    });
  },

  /** Выбор. Promise<опция | null(отменено)> */
  choice(options, prompt) {
    if (this.mode === "skip") this.setMode(null);
    return new Promise(resolve => {
      const wrap = this.el("choices");
      wrap.innerHTML = "";
      this.el("dialog").classList.add("hidden");
      wrap.classList.remove("hidden");
      const close = () => { wrap.classList.add("hidden"); wrap.innerHTML = ""; this.el("dialog").classList.remove("hidden"); };
      const w = {
        advance: () => {},
        cancel: () => { close(); resolve(null); }
      };
      this._wait = w;
      if (prompt) {          // реплика, на которую отвечает игрок, остаётся видна над кнопками
        const q = document.createElement("div");
        q.className = "choice-prompt";
        const nm = prompt.who ? VN.renderer.displayName(prompt.who) : "";
        if (nm) { const bb = document.createElement("b"); bb.textContent = nm + ": "; q.appendChild(bb); }
        q.appendChild(document.createTextNode(VN.fmt(prompt.text)));
        wrap.appendChild(q);
      }
      let n = 0, available = 0;
      options.forEach(opt => {
        const ok = VN.test(opt.if);
        if (!ok && opt.locked === "hide") return;
        if (ok) available++;
        const b = document.createElement("button");
        b.className = "choice-btn";
        b.style.animationDelay = (n++ * 70) + "ms";
        b.textContent = (ok ? "" : "🔒 ") + VN.fmt(opt.text);
        if (!ok) b.disabled = true;
        else b.onclick = () => {
          if (this._wait !== w) return;
          this._wait = null;
          VN.audio.sfx("click");
          close();
          resolve(opt);
        };
        wrap.appendChild(b);
      });
      if (!available) {
        VN.error("в выборе не осталось доступных опций");
        VN.menu.show();
      }
    });
  },

  /* ── тосты ── */
  toast(text, style = "", ms) {
    const t = document.createElement("div");
    t.className = "toast" + (style ? " " + style : "");
    t.textContent = style === "memo" ? "🕊 " + text : text;
    this.el("toast-wrap").appendChild(t);
    const life = ms || (style === "memo" ? 2800 : 2300);
    t.style.setProperty("--life", life + "ms");
    setTimeout(() => t.remove(), life);
  },

  /* ── панели ── */
  /** body: HTML-строка (доверенная: из движка/конфига). actions: [{label, fn(panel)}] */
  panel(title, body, actions = [], opts = {}) {
    const ov = this.el("overlay");
    ov.innerHTML = "";
    ov.classList.remove("hidden");
    this.setMode(null);
    this._onClose = opts.onClose || null;
    const p = document.createElement("div");
    p.className = "panel" + (opts.wide ? " wide" : "");
    p.innerHTML = `<h2>${esc(title)}</h2>`;
    const body1 = document.createElement("div");
    if (typeof body === "string") body1.innerHTML = body; else if (body) body1.appendChild(body);
    p.appendChild(body1);
    const mk = (label, fn) => {
      const b = document.createElement("button");
      b.className = "action";
      b.textContent = label;
      b.onclick = () => { VN.audio.sfx("click"); fn(p); };
      p.appendChild(b);
    };
    actions.forEach(a => mk(a.label, a.fn));
    if (opts.close !== false) mk("Закрыть", () => this.closePanel());
    ov.appendChild(p);
    return p;
  },

  closePanel() {
    this.el("overlay").classList.add("hidden");
    this.el("overlay").innerHTML = "";
    const cb = this._onClose;
    this._onClose = null;
    if (cb) cb();
  },

  _lines(list, cls = "backlog-line") {
    const box = document.createElement("div");
    list.forEach(h => {
      const d = document.createElement("div");
      d.className = cls + (h.who ? "" : " narr");
      if (h.who) { const b = document.createElement("b"); b.textContent = h.who + ": "; d.appendChild(b); }
      d.appendChild(document.createTextNode(h.text));
      box.appendChild(d);
    });
    return box;
  },

  backlog() {
    const h = VN.game.history;
    const p = this.panel("Бэклог", h.length ? this._lines(h) : "<p>Пока пусто.</p>");
    p.scrollTop = p.scrollHeight;
  },

  memosUI() {
    const m = VN.game.memos;
    this.panel("Память", m.length ? this._lines(m.map(x => ({ who: null, text: "🕊 " + x })), "backlog-line memo-line")
      : "<p>Пока ничего не запомнили.</p>");
  },

  sceneTitle(id) {
    const s = (VN.cfg.scenes || []).find(x => x.id === id);
    return s ? s.title || id : id;
  },

  savesUI(mode, opts = {}) {
    const slots = [...Array(VN.save.SLOTS).keys()].map(i => String(i + 1));
    if (mode === "load") slots.unshift(VN.save.AUTO, VN.save.QUICK);
    const box = document.createElement("div");
    for (const s of slots) {
      const snap = VN.save.get(s);
      const name = s === "auto" ? "Автосейв" : s === "quick" ? "Быстрый" : `Слот ${s}`;
      const row = document.createElement("div");
      row.className = "slot-row" + (snap ? "" : " empty");
      const d = snap && new Date(snap.ts);
      row.innerHTML = `<div class="slot-main"><b>${esc(name)}</b>
          <span class="meta">${snap ? esc(this.sceneTitle(snap.scene)) + " · " + d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "пусто"}</span>
          ${snap && snap.line ? `<span class="line">${esc(snap.line.slice(0, 70))}</span>` : ""}</div>
        ${snap ? `<button class="slot-del" title="Удалить">✕</button>` : ""}`;
      row.onclick = e => {
        if (e.target.closest(".slot-del")) {
          if (confirm(`Удалить «${name}»?`)) { VN.save.remove(s); this.savesUI(mode, opts); }
          return;
        }
        VN.audio.sfx("click");
        if (mode === "save") {
          if (VN.save.put(s)) { this.toast("Сохранено: " + name); this.closePanel(); }
        } else {
          if (!snap) { this.toast("Слот пуст", "bad"); return; }
          this._onClose = null;
          this.closePanel();
          VN.parser.loadSnapshot(snap);
        }
      };
      box.appendChild(row);
    }
    const actions = mode === "save"
      ? [{ label: "⇩ Экспорт строкой", fn: () => this.exportUI() }]
      : [{ label: "⇪ Импорт строки", fn: () => this.importUI(opts) }];
    this.panel(mode === "save" ? "Сохранить" : "Загрузить", box, actions, opts);
  },

  exportUI() {
    const str = VN.save.export64();
    this.panel("Экспорт сейва", `<p>Скопируй строку и вставь на другом устройстве: Загрузить → Импорт.</p>
      <textarea class="io" readonly>${esc(str)}</textarea>`, [
      { label: "Копировать", fn: p => {
        const ta = p.querySelector("textarea"); ta.select();
        (navigator.clipboard ? navigator.clipboard.writeText(str) : Promise.reject()).then(
          () => this.toast("Скопировано"), () => { document.execCommand("copy"); this.toast("Скопировано"); });
      } }
    ]);
  },

  importUI(opts = {}) {
    this.panel("Импорт сейва", `<p>Вставь строку сейва:</p><textarea class="io"></textarea>`, [
      { label: "Загрузить", fn: p => {
        const snap = VN.save.import64(p.querySelector("textarea").value);
        if (!snap) { this.toast("Это не строка сейва", "bad"); return; }
        this._onClose = null;
        this.closePanel();
        VN.parser.loadSnapshot(snap);
      } }
    ], opts);
  },

  quickSave() {
    if (VN.save.put(VN.save.QUICK)) this.toast("Быстрое сохранение");
  },
  quickLoad() {
    const snap = VN.save.get(VN.save.QUICK);
    if (!snap) { this.toast("Быстрого сохранения нет", "bad"); return; }
    VN.parser.loadSnapshot(snap);
  },

  settingsUI(opts = {}) {
    const s = this.settings;
    const p = this.panel("Настройки", `
      <label>Скорость текста<input type="range" id="st-speed" min="1" max="58" value="${60 - s.speed}"></label>
      <label>Пауза в авто-режиме<input type="range" id="st-auto" min="40" max="250" value="${Math.round(s.autoDelay * 100)}"></label>
      <label>Размер текста<input type="range" id="st-ts" min="80" max="130" value="${Math.round(s.textSize * 100)}"></label>
      <label>Музыка: <b id="st-bgm-v">${Math.round(s.bgm * 100)}%</b><input type="range" id="st-bgm" min="0" max="100" value="${Math.round(s.bgm * 100)}"></label>
      <label>Звуки: <b id="st-sfx-v">${Math.round(s.sfx * 100)}%</b><input type="range" id="st-sfx" min="0" max="100" value="${Math.round(s.sfx * 100)}"></label>
      <label class="check"><input type="checkbox" id="st-skipu" ${s.skipUnread ? "checked" : ""}> Пропуск и непрочитанного текста</label>
    `, [], opts);
    const on = (id, fn) => p.querySelector(id).addEventListener("input", e => { fn(e.target); this.applySettings(); this.saveSettings(); });
    on("#st-speed", t => s.speed = 60 - +t.value);
    on("#st-auto", t => s.autoDelay = +t.value / 100);
    on("#st-ts", t => s.textSize = +t.value / 100);
    on("#st-bgm", t => { s.bgm = +t.value / 100; p.querySelector("#st-bgm-v").textContent = t.value + "%"; VN.audio.setBgmVolume(s.bgm); });
    on("#st-sfx", t => { s.sfx = +t.value / 100; p.querySelector("#st-sfx-v").textContent = t.value + "%"; });
    on("#st-skipu", t => s.skipUnread = t.checked);
  },

  galleryUI(opts = {}) {
    const list = VN.cfg.gallery || [];
    if (!list.length) { this.panel("Галерея", `<p>${esc(VN.cfg.galleryText || "Здесь появятся CG.")}</p>`, [], opts); return; }
    const grid = document.createElement("div");
    grid.className = "gallery";
    list.forEach(item => {
      const open = VN.persist.data.cg.includes(item.id);
      const cell = document.createElement("button");
      cell.className = "g-cell" + (open ? "" : " locked");
      if (open) {
        cell.style.backgroundImage = `url("${VN.cfg.paths.assets}/cg/${item.id}.webp")`;
        cell.title = item.title || item.id;
        cell.onclick = () => {
          const view = this.el("cg-view");
          view.style.backgroundImage = cell.style.backgroundImage;
          view.classList.remove("hidden");
          view.onclick = () => view.classList.add("hidden");
        };
      } else { cell.textContent = "🔒"; cell.disabled = true; }
      grid.appendChild(cell);
    });
    this.panel("Галерея", grid, [], opts);
  },

  pauseUI() {
    if (this.mode) this.setMode(null);
    this.panel("Пауза", "", [
      { label: "💾 Сохранить", fn: () => this.savesUI("save") },
      { label: "📂 Загрузить", fn: () => this.savesUI("load") },
      { label: "⚡ Быстрое сохранение", fn: () => { this.closePanel(); this.quickSave(); } },
      { label: "🕊 Память", fn: () => this.memosUI() },
      { label: "⚙ Настройки", fn: () => this.settingsUI() },
      { label: "🏠 В главное меню", fn: () => { this.closePanel(); VN.menu.show(); } }
    ]);
  },

  endCard(end) {
    const e = end && typeof end === "object" ? end : {};
    this.panel(e.title || "Конец", e.sub ? `<p class="center">${esc(VN.fmt(e.sub))}</p>` : "", [
      { label: "🏠 В главное меню", fn: () => this.closePanel() }
    ], { close: false, onClose: () => VN.menu.show() });
  }
};
