/* renderer.js — фоны, CG, спрайты (слоты, входы/уходы, переносы, эмоции), фокус, эффекты */
window.VN = window.VN || {};

VN.renderer = {
  manifest: null,
  _els: {},                    // slot -> <img>
  SLOT_X: { left: 22, center: 50, right: 78 },  // % ширины сцены
  SLIDE: 26,                   // сдвиг при входе/уходе сбоку, %
  _bgToken: 0,
  _zc: 0,

  async loadManifest() {
    if (!this.manifest) {
      const res = await fetch(VN.cfg.paths.assets + "/sprites/manifest.json");
      this.manifest = res.ok ? await res.json() : {};
    }
    return this.manifest;
  },

  spriteUrl(file) { return `${VN.cfg.paths.assets}/sprites/${file}`; },

  /** Ключ персонажа по who: ключ манифеста или его name. null — не персонаж. */
  charOf(who) { return VN.schema.speakerOf(who, this.manifest); },
  /** Отображаемое имя: name из манифеста, иначе как есть */
  displayName(who) {
    const k = this.charOf(who);
    return k ? this.manifest[k].name || k : who;
  },

  /* ── Фон ── */
  bg(name, instant = false) {
    const el = document.getElementById("bg");
    VN.game.visual.bg = name || null;
    const token = ++this._bgToken;          // последняя смена побеждает, даже если картинки грузятся вразнобой
    if (!name) {
      el.style.opacity = 0;
      setTimeout(() => { if (token === this._bgToken) { el.style.backgroundImage = "none"; el.style.opacity = 1; } }, instant ? 0 : 450);
      return;
    }
    const url = `${VN.cfg.paths.assets}/bg/${name}.webp`;
    const img = new Image();
    img.onload = () => {
      if (token !== this._bgToken) return;
      if (instant) { el.style.backgroundImage = `url("${url}")`; el.style.opacity = 1; return; }
      el.style.opacity = 0;
      setTimeout(() => {
        if (token !== this._bgToken) return;
        el.style.backgroundImage = `url("${url}")`;
        el.style.opacity = 1;
      }, 220);
    };
    img.onerror = () => { if (token === this._bgToken) VN.error(`нет фона ${url}`); };
    img.src = url;
  },

  /* ── CG (полноэкранная картинка поверх спрайтов, под диалогом) ── */
  cg(name) {
    const el = document.getElementById("cg");
    VN.game.visual.cg = name || null;
    if (!name) { el.classList.remove("visible"); return; }
    const url = `${VN.cfg.paths.assets}/cg/${name}.webp`;
    el.style.backgroundImage = `url("${url}")`;
    el.classList.add("visible");
    VN.persist.unlockCg(name);
  },

  resolve(char, expr) {
    const c = this.manifest && this.manifest[char];
    if (!c) return null;
    const e = c[expr];
    return e && e.file ? e : c.neutral || null;
  },

  /** В каком слоте сейчас стоит персонаж (null — не на экране) */
  slotOf(char) {
    for (const [slot, el] of Object.entries(this._els))
      if (el.classList.contains("visible") && el.dataset.char === char) return slot;
    return null;
  },

  _place(el, slot) {
    el.className = el.className.replace(/\bslot-\w+/g, "").trim() + ` slot-${slot}`;
    el.classList.toggle("mirror", slot === "left");   // все спрайты смотрят влево; слева — зеркалим в сцену
    el.dataset.slot = slot;
  },

  _fadeClone(el) {
    const clone = el.cloneNode();
    clone.style.pointerEvents = "none";
    el.parentNode.appendChild(clone);
    requestAnimationFrame(() => {
      clone.classList.remove("visible");
      setTimeout(() => clone.remove(), 520);
    });
  },

  /**
   * Показать спрайт. Если персонаж уже стоит в другом слоте — он ПЕРЕЕЗЖАЕТ (без дубля).
   * enter: "fade" | "left" | "right" | "rise"
   */
  show({ char, expr = "neutral", slot = "center", height, enter = "fade" }, instant = false) {
    const data = this.resolve(char, expr);
    if (!data) { VN.error(`нет спрайта ${char}.${expr}`); return; }

    const from = this.slotOf(char);
    if (from && from !== slot) this._move(from, slot);

    VN.game.visual.sprites[slot] = { char, expr, ...(height ? { height } : {}) };

    let el = this._els[slot];
    if (!el) {
      el = document.createElement("img");
      el.className = "sprite";
      el.alt = "";
      this._els[slot] = el;
      document.getElementById("sprites").appendChild(el);
    }
    this._place(el, slot);
    el.style.height = ((height || data.height || 0.6) * 100) + "%";
    el.style.zIndex = 3 + (++this._zc % 200);     // последний показанный — поверх соседей

    const src = this.spriteUrl(data.file);
    const visible = el.classList.contains("visible");

    if (visible && el.dataset.char === char) {
      // смена эмоции: спрайт не двигается, старое лицо тает поверх нового
      el.dataset.expr = expr;
      if (el.getAttribute("src") === src) return;
      if (!instant) this._fadeClone(el);
      el.src = src;
      return;
    }

    const isSwap = visible;          // в слоте стоял другой — мягкая замена без слайда
    if (isSwap && !instant) this._fadeClone(el);
    el.dataset.char = char;
    el.dataset.expr = expr;

    const finalX = this.SLOT_X[slot];
    let startX = finalX, startBottom = 0;
    if (!isSwap && !instant) {
      if (enter === "left") startX = finalX - this.SLIDE;
      else if (enter === "right") startX = finalX + this.SLIDE;
      else if (enter === "rise") startBottom = -6;
    }
    el.classList.remove("visible", "dim");
    el.style.transition = "none";
    el.style.left = startX + "%";
    el.style.bottom = startBottom + "%";
    el.src = src;
    void el.offsetWidth;                // применить стартовую позицию без анимации
    el.style.transition = instant ? "none" : "";
    el.style.left = finalX + "%";
    el.style.bottom = "0%";
    el.classList.add("visible");
    if (instant) { void el.offsetWidth; el.style.transition = ""; }
  },

  /** Перенос персонажа между слотами (плавно едет по сцене) */
  _move(from, to) {
    const el = this._els[from];
    const occupant = this._els[to];
    if (occupant && occupant !== el) {
      if (occupant.classList.contains("visible")) this._fadeClone(occupant);   // занявший слот растворяется
      occupant.remove();
    }
    delete this._els[from];
    this._els[to] = el;
    VN.game.visual.sprites[to] = VN.game.visual.sprites[from];
    delete VN.game.visual.sprites[from];
    this._place(el, to);
    el.style.left = this.SLOT_X[to] + "%";
  },

  /** Убрать спрайт. arg: { slot } | { char } | "all"; exit: "fade" | "left" | "right" */
  hide(arg) {
    if (arg === "all") return this.hideAll(true);
    const slot = arg.slot || this.slotOf(arg.char);
    if (!slot) return;
    delete VN.game.visual.sprites[slot];
    const el = this._els[slot];
    if (!el) return;
    const curX = parseFloat(el.style.left) || this.SLOT_X[slot];
    if (arg.exit === "left") el.style.left = (curX - this.SLIDE) + "%";
    else if (arg.exit === "right") el.style.left = (curX + this.SLIDE) + "%";
    el.classList.remove("dim", "visible");
  },

  hideAll(animated = false) {
    VN.game.visual.sprites = {};
    this._zc = 0;
    Object.values(this._els).forEach(el => {
      if (!animated) el.style.transition = "none";
      el.classList.remove("visible", "dim");
      if (!animated) { void el.offsetWidth; el.style.transition = ""; }
    });
  },

  /** Сменить эмоцию говорящего, если он на экране (say.expr) */
  setExpr(char, expr) {
    const slot = this.slotOf(char);
    if (slot) this.show({ char, expr, slot });
  },

  /** Фокус: затемняем всех видимых, кроме говорящего. null — снять затемнение. */
  focus(who) {
    const ch = who ? this.charOf(who) : null;
    const els = Object.values(this._els).filter(el => el.classList.contains("visible"));
    const speakerOnStage = ch && els.some(el => el.dataset.char === ch);
    els.forEach(el => el.classList.toggle("dim", !!speakerOnStage && el.dataset.char !== ch));
  },

  /** Тряска сцены */
  shake(power) {
    const v = document.getElementById("view");
    v.classList.remove("shake-small", "shake-big");
    void v.offsetWidth;
    v.classList.add(power === "big" ? "shake-big" : "shake-small");
  },

  /** Вспышка цветом */
  flash(color) {
    const f = document.getElementById("flash");
    f.style.background = typeof color === "string" ? color : "#fff";
    f.classList.remove("go");
    void f.offsetWidth;
    f.classList.add("go");
  },

  /** Восстановление картинки из сейва — мгновенно, без анимаций */
  restoreVisual(visual) {
    this.hideAll();
    this.bg(visual.bg, true);
    this.cg(visual.cg || null);
    Object.entries(visual.sprites || {}).forEach(([slot, sp]) =>
      this.show({ char: sp.char, expr: sp.expr, slot, height: sp.height }, true));
  },

  /** Сброс сцены (новая игра / выход в меню) */
  reset() {
    this.hideAll();
    this.cg(null);
    this.bg(null, true);
  },

  preload(scene) {
    const A = VN.cfg.paths.assets, urls = new Set();
    if (scene.bg) urls.add(`${A}/bg/${scene.bg}.webp`);
    (scene.steps || []).forEach(s => {
      if (typeof s.bg === "string") urls.add(`${A}/bg/${s.bg}.webp`);
      if (typeof s.cg === "string") urls.add(`${A}/cg/${s.cg}.webp`);
      if (s.show) {
        const d = this.resolve(s.show.char, s.show.expr || "neutral");
        if (d) urls.add(this.spriteUrl(d.file));
      }
      if (s.say && s.say.expr) {
        const d = this.resolve(this.charOf(s.say.who), s.say.expr);
        if (d) urls.add(this.spriteUrl(d.file));
      }
    });
    urls.forEach(u => { const i = new Image(); i.src = u; });
  }
};
