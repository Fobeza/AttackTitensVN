/* minigames.js — реестр и запуск мини-игр.
 *
 * Мини-игра = объект, зарегистрированный через VN.minigames.register(id, def):
 *   def.title   — заголовок (строка)
 *   def.help    — правила на экране перед стартом (строка, можно переопределить params.help)
 *   def.start(ctx) — нарисовать игру в ctx.root и когда-нибудь вызвать ctx.finish({ win, score })
 * ctx: { root, params, finish(result), onCleanup(fn), sfx(name), toast(text), vars }
 * Встроенные лежат в engine/js/minigames/, игровые — в game/minigames/ и
 * подключаются через game.json → "minigames": { "id": "game/minigames/id.js" }.
 * Подробно: docs/MINIGAMES.md */
window.VN = window.VN || {};

VN.minigames = {
  _reg: {},
  _active: null,
  _scripts: {},
  _gen: 0,

  register(id, def) { this._reg[id] = def; },

  /** Догрузить скрипт игровой мини-игры из game.json → minigames */
  async ensure(id) {
    if (this._reg[id]) return true;
    const path = VN.cfg.minigames && VN.cfg.minigames[id];
    if (!path) return false;
    if (!this._scripts[path]) {
      this._scripts[path] = new Promise(res => {
        const s = document.createElement("script");
        s.src = path;
        s.onload = () => res(true);
        s.onerror = () => res(false);
        document.head.appendChild(s);
      });
    }
    await this._scripts[path];
    return !!this._reg[id];
  },

  abort() {
    this._gen++;
    if (this._active) this._active(null);
  },

  /** Запуск по шагу сцены. Promise<{win, score, skipped} | null(прервано)> */
  async play(step) {
    this.abort();
    const gen = this._gen;
    const id = step.minigame;
    const params = step.params || {};
    VN.ui.setMode(null);
    const skipResult = () => ({ win: step.skipAs === "win", score: 0, skipped: true });
    const ready = await this.ensure(id);
    if (gen !== this._gen) return null;
    if (!ready) {
      VN.error(`мини-игра "${id}" не найдена — засчитано как пропуск`);
      return skipResult();
    }
    const def = this._reg[id];
    const layer = VN.ui.el("minigame");
    const dialog = VN.ui.el("dialog");

    return new Promise(resolve => {
      const cleanups = [];
      let done = false;
      const finish = result => {
        if (done) return;
        done = true;
        this._active = null;
        if (VN.ui._wait === wait) VN.ui._wait = null;
        cleanups.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
        layer.classList.add("hidden");
        layer.innerHTML = "";
        dialog.classList.remove("hidden");
        if (result) {
          VN.persist.markMinigame(id);
          result = { win: !!result.win, score: Number(result.score) || 0, skipped: !!result.skipped };
        }
        resolve(result);
      };
      this._active = finish;
      const wait = { advance: () => {}, cancel: () => finish(null) };
      VN.ui._wait = wait;

      dialog.classList.add("hidden");
      layer.classList.remove("hidden");
      layer.innerHTML = `
        <div class="mg-head"><span class="mg-title"></span>
          ${step.skippable === false ? "" : `<button class="mg-skip">Пропустить</button>`}</div>
        <div class="mg-body"></div>`;
      layer.querySelector(".mg-title").textContent = params.title || def.title || id;
      const skip = layer.querySelector(".mg-skip");
      if (skip) skip.onclick = () => { VN.audio.sfx("click"); finish(skipResult()); };
      const body = layer.querySelector(".mg-body");

      const begin = () => {
        body.innerHTML = "";
        try {
          def.start({
            root: body,
            params,
            finish: r => finish(r || { win: false, score: 0 }),
            onCleanup: fn => cleanups.push(fn),
            sfx: n => VN.audio.sfx(n),
            toast: t => VN.ui.toast(t),
            vars: { ...VN.game.vars }
          });
        } catch (e) {
          VN.error(`мини-игра "${id}" упала: ${e.message}`);
          finish(skipResult());
        }
      };

      const help = params.help ?? def.help;
      if (help) {
        const intro = document.createElement("div");
        intro.className = "mg-intro";
        const p = document.createElement("p");
        p.textContent = help;
        const go = document.createElement("button");
        go.className = "mg-btn";
        go.textContent = "Начать";
        go.onclick = () => { VN.audio.sfx("click"); begin(); };
        intro.append(p, go);
        body.appendChild(intro);
      } else begin();
    });
  }
};
