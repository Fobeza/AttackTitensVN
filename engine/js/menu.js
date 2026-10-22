/* menu.js — главное меню (тексты/фон — из game/game.json) */
window.VN = window.VN || {};

VN.menu = {
  show() {
    VN.parser.stop();
    VN.ui.setMode(null);
    VN.audio.bgm(VN.cfg.menuBgm || null);
    VN.ui.showMenuScreen();
    const m = document.getElementById("menu-screen");
    const cfg = VN.cfg;
    m.style.backgroundImage = cfg.menuBg ? `url("${cfg.paths.assets}/bg/${cfg.menuBg}.webp")` : "";
    m.innerHTML = `
      <div class="menu-inner">
        <div id="menu-title">${cfg.titleHtml || esc(cfg.title || "Visual Novel")}</div>
        <div id="menu-sub">${esc(cfg.subtitle || "")}</div>
        <button class="menu-btn" id="m-new">Начать</button>
        <button class="menu-btn" id="m-cont" ${VN.save.latest() ? "" : "disabled"}>Продолжить</button>
        <button class="menu-btn" id="m-load">Загрузить</button>
        <button class="menu-btn" id="m-gallery">Галерея</button>
        <button class="menu-btn" id="m-set">Настройки</button>
        <button class="menu-btn" id="m-about">Об игре</button>
      </div>
      <div id="menu-foot">${esc(cfg.footer || "")}</div>`;

    const on = (id, fn) => { m.querySelector(id).onclick = () => { VN.audio.sfx("click"); fn(); }; };
    on("#m-new", () => this.newGame());
    on("#m-cont", () => { const snap = VN.save.latest(); if (snap) VN.parser.loadSnapshot(snap); });
    on("#m-load", () => VN.ui.savesUI("load"));
    on("#m-gallery", () => VN.ui.galleryUI());
    on("#m-set", () => VN.ui.settingsUI());
    on("#m-about", () => VN.ui.panel("Об игре", cfg.about || "<p>Описание не задано (game.json → about).</p>"));
  },

  /** Новая игра. sceneId/start — для отладки (?scene=&at=), vars — стартовые переопределения */
  newGame(sceneId, start = 0, vars = null) {
    VN.parser.stop();
    VN.game = VN.state.fresh();
    if (vars) Object.assign(VN.game.vars, vars);
    VN.renderer.reset();
    VN.audio.bgm(null);
    VN.ui.setMode(null);
    VN.ui.showStage();
    document.getElementById("text").textContent = "";
    document.getElementById("speaker").classList.add("hidden");
    VN.parser.run(sceneId || VN.cfg.startScene, start);
  }
};
