/* save.js — 9 слотов + auto + quick в localStorage, экспорт/импорт строкой */
window.VN = window.VN || {};

VN.save = {
  AUTO: "auto",
  QUICK: "quick",
  SLOTS: 9,
  get KEY() { return (VN.cfg?.storage || "vn") + "_saves_v1"; },

  _db() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; }
    catch { return {}; }
  },
  _write(db) {
    try { localStorage.setItem(this.KEY, JSON.stringify(db)); return true; }
    catch { VN.error("не удалось сохранить (localStorage переполнен или запрещён)"); return false; }
  },

  /** Снимок «сейчас». anchor = ближайшая метка выше + смещение: сейв переживает правку сцены. */
  snapshot() {
    const g = VN.game;
    const scene = VN.parser.sceneData();
    let anchor = null;
    if (scene) {
      for (let i = g.step; i >= 0; i--) {
        const l = scene.steps[i] && scene.steps[i].label;
        if (typeof l === "string") { anchor = { label: l, offset: g.step - i }; break; }
      }
    }
    const last = g.history[g.history.length - 1];
    return {
      v: 2,
      ts: Date.now(),
      scene: g.scene,
      step: g.step,
      len: scene ? scene.steps.length : 0,
      anchor,
      line: last ? (last.who ? last.who + ": " : "") + last.text : "",
      vars: { ...g.vars },
      memos: g.memos.slice(),
      visual: JSON.parse(JSON.stringify(g.visual)),
      history: g.history.slice(-80)
    };
  },

  put(slot) {
    if (!VN.game.scene || VN.game.scene === "__preview") return false;
    const db = this._db();
    db[slot] = this.snapshot();
    return this._write(db);
  },
  get(slot) { return this._db()[slot] || null; },
  remove(slot) { const db = this._db(); delete db[slot]; this._write(db); },

  /** Самый свежий сейв любого слота — для «Продолжить» */
  latest() {
    let best = null;
    for (const s of Object.values(this._db())) if (s && (!best || s.ts > best.ts)) best = s;
    return best;
  },

  auto() { this.put(this.AUTO); },

  export64(snap) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(snap || this.snapshot()))));
  },
  import64(str) {
    try {
      const s = JSON.parse(decodeURIComponent(escape(atob(String(str).trim()))));
      if (s && (s.v === 1 || s.v === 2) && s.scene) return s;
    } catch { /* не строка сейва */ }
    return null;
  }
};
