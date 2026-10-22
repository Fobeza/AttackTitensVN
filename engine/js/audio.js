/* audio.js — BGM-петли с фейдами, SFX, громкость из настроек.
 * Файл ищется как <name>.ogg → .mp3 → .wav (что браузер умеет и что нашлось). */
window.VN = window.VN || {};

VN.audio = {
  unlocked: false,     // true после первого касания (политика автоплея)
  _bgmEl: null,
  _bgmName: null,
  _exts: null,

  exts() {
    if (!this._exts) {
      const a = document.createElement("audio");
      const can = t => a.canPlayType && a.canPlayType(t) !== "";
      this._exts = [
        can('audio/ogg; codecs="vorbis"') && "ogg",
        can("audio/mpeg") && "mp3",
        "wav"
      ].filter(Boolean);
    }
    return this._exts;
  },

  url(name, ext) { return `${VN.cfg.paths.assets}/audio/${name}.${ext}`; },

  /** Audio-элемент с перебором форматов при ошибке загрузки */
  _make(name, onFail) {
    const exts = this.exts();
    let k = 0;
    const el = new Audio(this.url(name, exts[0]));
    el.addEventListener("error", () => {
      if (++k < exts.length) { el.src = this.url(name, exts[k]); el.play().catch(() => {}); }
      else if (onFail) onFail();
    });
    return el;
  },

  vols() {
    const s = (VN.ui && VN.ui.settings) || {};
    return { bgm: s.bgm ?? 0.55, sfx: s.sfx ?? 0.85 };
  },

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this._bgmName) this._applyBgm();
  },

  sfx(name) {
    if (!this.unlocked || !name || VN.ui.skipping()) return;
    const el = this._make(name);
    el.volume = this.vols().sfx;
    el.play().catch(() => {});
  },

  /** name: строка — играть петлю; null — тишина */
  bgm(name) {
    name = name || null;
    VN.game.visual.bgm = name;
    if (this._bgmName === name) return;
    this._bgmName = name;
    if (this.unlocked) this._applyBgm();
  },

  _applyBgm() {
    if (this._bgmEl) {
      const old = this._bgmEl;
      this._bgmEl = null;
      this._fade(old, 0, () => old.pause());
    }
    if (!this._bgmName) return;
    const el = this._make(this._bgmName, () => VN.error(`не найдена музыка ${this._bgmName}`));
    el.loop = true;
    el.volume = 0;
    this._bgmEl = el;
    el.play().catch(() => {});
    this._fade(el, this.vols().bgm);
  },

  setBgmVolume(v) { if (this._bgmEl) this._fade(this._bgmEl, v); },

  _fade(el, target, done) {
    clearTimeout(el._fadeT);
    const step = () => {
      const cur = el.volume;
      if (Math.abs(target - cur) < 0.02) { el.volume = target; if (done) done(); return; }
      el.volume = Math.min(1, Math.max(0, cur + (target - cur) * 0.18));
      el._fadeT = setTimeout(step, 40);
    };
    step();
  }
};
