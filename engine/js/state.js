/* state.js — состояние партии, переменные, постоянные данные, ошибки */
window.VN = window.VN || {};

VN.state = {
  fresh() {
    const vars = {};
    for (const [k, d] of Object.entries((VN.cfg && VN.cfg.vars) || {}))
      vars[k] = d && typeof d === "object" ? d.default ?? 0 : d;
    return {
      scene: null,
      step: 0,
      vars,
      memos: [],                                   // памятные метки 🕊
      history: [],                                 // бэклог (последние 80 реплик)
      visual: { bg: null, cg: null, bgm: null, sprites: {} }   // что сейчас на экране и в ушах
    };
  }
};
VN.game = VN.state.fresh();

/** Человеческое имя переменной (game.json → vars.<k>.title) */
VN.varName = k => ((VN.cfg && VN.cfg.vars && VN.cfg.vars[k]) || {}).title || k;

/** set-блок: число = прибавить; строка/boolean = присвоить; {"=": x} = присвоить что угодно */
VN.applySet = function (set) {
  for (const [k, v] of Object.entries(set || {})) {
    if (v && typeof v === "object" && "=" in v) VN.game.vars[k] = v["="];
    else if (typeof v === "number") VN.game.vars[k] = (Number(VN.game.vars[k]) || 0) + v;
    else VN.game.vars[k] = v;
  }
  VN.debug && VN.debug.update();
};

/** Условие (см. SCENE_FORMAT.md → «Условия») */
VN.test = cond => VN.schema.test(cond, VN.game.vars);

/** Подстановка {{var}} в текст */
VN.fmt = text => String(text ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => VN.game.vars[k] ?? "");

/** Памятная метка 🕊: кладётся в «Память»; тост — если cfg.memoToast */
VN.memo = function (text) {
  if (!text || VN.game.memos.includes(text)) return;
  VN.game.memos.push(text);
  if (VN.cfg && VN.cfg.memoToast) VN.ui.toast(text, "memo");
  VN.audio.sfx("tick");
};

/** Ошибка сценария/движка: всегда видна (красный тост) + console.error */
VN.error = function (msg) {
  console.error("[VN]", msg);
  if (VN.ui && VN.ui.toast) VN.ui.toast("⚠ " + msg, "bad", 6000);
};

/** Постоянные данные (не зависят от сейва): прочитанные реплики, открытые CG, пройденные мини-игры */
VN.persist = {
  data: { read: {}, cg: [], mg: [] },
  _t: null,
  get KEY() { return (VN.cfg?.storage || "vn") + "_persist"; },
  load() {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem(this.KEY)) || {}); } catch { /* пусто */ }
  },
  save() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch { /* квота */ }
    }, 300);
  },
  isRead(scene, step) { return !!(this.data.read[scene] && this.data.read[scene][step]); },
  markRead(scene, step) {
    const r = this.data.read[scene] = this.data.read[scene] || {};
    if (!r[step]) { r[step] = 1; this.save(); }
  },
  unlockCg(id) { if (id && !this.data.cg.includes(id)) { this.data.cg.push(id); this.save(); } },
  markMinigame(id) { if (!this.data.mg.includes(id)) { this.data.mg.push(id); this.save(); } }
};

/** Отладочная строка (?debug=1 или game.json → debug: true) */
VN.debug = {
  on: false,
  el: null,
  init() {
    this.on = true;
    this.el = document.getElementById("debug");
    this.el.classList.remove("hidden");
    this.update();
  },
  update() {
    if (!this.on) return;
    const g = VN.game, s = VN.parser && VN.parser.current();
    const t = s ? VN.schema.typeOf(s) : "—";
    this.el.textContent = `${g.scene}:${g.step} ${t} · ` +
      Object.entries(g.vars).map(([k, v]) => `${k}=${v}`).join(" ");
  }
};
