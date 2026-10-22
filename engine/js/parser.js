/* parser.js — исполнитель сцен.
 * Один активный запуск: каждый run() получает номер поколения (_gen). Старый цикл,
 * проснувшись после await, видит чужое поколение и тихо завершается. */
window.VN = window.VN || {};

VN.parser = {
  _cache: {},
  _labels: {},
  _scene: null,
  _gen: 0,

  async loadScene(id) {
    if (id === "__preview") {                       // сцена из Конструктора — всегда свежая
      const raw = localStorage.getItem("__vn_preview");
      if (!raw) throw new Error("нет сцены предпросмотра (запусти «▶ Тест» из Конструктора)");
      return JSON.parse(raw);
    }
    if (!this._cache[id]) {
      const res = await fetch(`${VN.cfg.paths.scenes}/${id}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`нет сцены ${VN.cfg.paths.scenes}/${id}.json`);
      try { this._cache[id] = await res.json(); }
      catch (e) { throw new Error(`битый JSON в сцене ${id}: ${e.message}`); }
    }
    return this._cache[id];
  },

  sceneData() { return this._scene; },
  current() { return this._scene && this._scene.steps[VN.game.step]; },

  /** Остановить исполнение (выход в меню) */
  stop() {
    this._gen++;
    VN.ui.cancelWaits();
    VN.minigames.abort();
  },

  _index(scene) {
    this._labels = {};
    scene.steps.forEach((s, i) => { if (typeof s.label === "string") this._labels[s.label] = i; });
  },

  _at(label, where) {
    if (label in this._labels) return this._labels[label];
    VN.error(`${where}: нет метки "${label}" в сцене ${VN.game.scene}`);
    return null;
  },

  /**
   * Запуск сцены.
   * start: номер шага или имя метки. opts.restore — снапшот сейва (не применять bg/bgm сцены).
   */
  async run(id, start = 0, opts = {}) {
    const gen = ++this._gen;
    VN.ui.cancelWaits();
    VN.minigames.abort();
    const alive = () => gen === this._gen;

    let scene, i;
    const enter = async (sid, at, restore) => {
      try { scene = await this.loadScene(sid); }
      catch (e) { if (alive()) { VN.error(e.message); VN.menu.show(); } return false; }
      if (!alive()) return false;
      await VN.renderer.loadManifest();
      if (!alive()) return false;
      this._scene = scene;
      this._index(scene);
      VN.game.scene = sid;
      i = 0;
      if (typeof at === "string") { i = this._at(at, "старт"); if (i === null) i = 0; }
      else if (typeof at === "number") i = Math.max(0, Math.min(at, scene.steps.length - 1));
      if (restore) {
        // сцену правили после сейва → ищем место по метке-якорю
        if (restore.len && restore.len !== scene.steps.length && restore.anchor && restore.anchor.label in this._labels)
          i = Math.min(this._labels[restore.anchor.label] + restore.anchor.offset, scene.steps.length - 1);
      }
      VN.game.step = i;
      if (!restore) {
        if ("bg" in scene) VN.renderer.bg(scene.bg);
        if ("bgm" in scene) VN.audio.bgm(scene.bgm);
        if (sid !== "__preview" && i === 0) VN.save.auto();      // автосейв в начале сцены
      }
      VN.renderer.preload(scene);
      return true;
    };

    if (!await enter(id, start, opts.restore)) return;

    while (alive()) {
      if (i >= scene.steps.length) {
        VN.error(`сцена ${VN.game.scene} закончилась без end/scene`);
        VN.ui.endCard({ title: "Конец сцены" });
        return;
      }
      const s = scene.steps[i];
      const t = VN.schema.typeOf(s);
      VN.game.step = i;
      VN.debug.update();
      let next = i + 1;

      switch (t) {
        case "label": break;
        case "say": {
          const ch = VN.renderer.charOf(s.say.who);
          if (s.say.expr && ch) VN.renderer.setExpr(ch, s.say.expr);
          VN.renderer.focus(s.say.who);
          if (!await VN.ui.say(s.say.who, s.say.text)) return;
          break;
        }
        case "narr":
          VN.renderer.focus(null);
          if (!await VN.ui.narr(s.narr)) return;
          break;
        case "card": if (!await VN.ui.card(s.card)) return; break;
        case "show": VN.renderer.show(s.show); break;
        case "hide": VN.renderer.hide(s.hide); break;
        case "bg": VN.renderer.bg(s.bg); break;
        case "cg": VN.renderer.cg(s.cg); break;
        case "bgm": VN.audio.bgm(s.bgm); break;
        case "sfx": VN.audio.sfx(s.sfx); break;
        case "set": VN.applySet(s.set); break;
        case "memo": VN.memo(VN.fmt(s.memo)); break;
        case "wait": if (!await VN.ui.sleep(s.wait)) return; break;
        case "shake": VN.renderer.shake(s.shake); break;
        case "flash": VN.renderer.flash(s.flash); break;
        case "choice": {
          VN.save.auto();                                 // автосейв перед каждым выбором
          const opt = await VN.ui.choice(s.choice);
          if (!opt || !alive()) return;
          if (opt.set) VN.applySet(opt.set);
          if (opt.memo) VN.memo(VN.fmt(opt.memo));
          if (opt.narr) { VN.renderer.focus(null); if (!await VN.ui.narr(opt.narr)) return; }
          if (opt.goto) { const j = this._at(opt.goto, "choice"); if (j !== null) next = j; }
          break;
        }
        case "goto": { const j = this._at(s.goto, "goto"); if (j !== null) next = j; break; }
        case "if": {
          const target = VN.test(s.if) ? s.if.goto : s.if.else;
          if (target) { const j = this._at(target, "if"); if (j !== null) next = j; }
          break;
        }
        case "minigame": {
          const r = await VN.minigames.play(s);
          if (!r || !alive()) return;
          if (s.var) VN.applySet({ [s.var]: { "=": r.score } });
          VN.applySet(r.win ? s.onWin : s.onLose);
          const target = r.win ? s.win : s.lose;
          if (target) { const j = this._at(target, "minigame"); if (j !== null) next = j; }
          break;
        }
        case "scene":
          if (!await enter(s.scene, s.at ?? 0)) return;
          continue;
        case "end":
          VN.ui.endCard(s.end);
          return;
        default:
          VN.error(`шаг ${i} в ${VN.game.scene}: неизвестный тип ${JSON.stringify(s).slice(0, 50)}`);
      }
      if (!alive()) return;
      i = next;
    }
  },

  /** Загрузка сейва: восстановить картинку/музыку/переменные и продолжить с сохранённого шага */
  async loadSnapshot(snap) {
    this.stop();
    VN.game = VN.state.fresh();
    Object.assign(VN.game.vars, snap.vars || {});
    VN.game.memos = (snap.memos || []).slice();
    VN.game.history = (snap.history || []).slice();
    VN.ui.setMode(null);
    VN.ui.showStage();
    await VN.renderer.loadManifest();
    const visual = snap.visual || {};
    VN.renderer.restoreVisual(visual);
    VN.audio.bgm(visual.bgm || null);
    await this.run(snap.scene, snap.step, { restore: snap });
  }
};
