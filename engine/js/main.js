/* main.js — запуск: game.json → тема → меню.
 * Отладочные параметры адреса:
 *   ?scene=<id>[&at=<метка|номер шага>]  — сразу в сцену, минуя меню
 *   &vars=trust:3,f_met:true             — стартовые значения переменных
 *   &debug=1                             — строка состояния (сцена:шаг, переменные)
 *   ?preview=1                           — сцена из Конструктора («▶ Тест») */
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("game/game.json", { cache: "no-cache" });
    VN.cfg = await res.json();
  } catch (e) {
    document.body.innerHTML = `<div style="color:#d8c9a3;font:16px monospace;padding:2em">
      Не удалось прочитать game/game.json: ${e.message}<br><br>
      Запускай через локальный сервер (node tools/serve.mjs), а не двойным кликом по файлу.</div>`;
    return;
  }
  VN.cfg.paths = Object.assign({ scenes: "game/scenes", assets: "game/assets" }, VN.cfg.paths);
  if (VN.cfg.title) document.title = VN.cfg.title;
  for (const [k, v] of Object.entries(VN.cfg.theme || {}))
    document.documentElement.style.setProperty(k, v);

  VN.persist.load();
  VN.ui.loadSettings();
  VN.ui.initInput();
  VN.game = VN.state.fresh();

  // --sw: ширина кадра 9:16 в px — от неё масштабируются шрифты и элементы
  const setSW = () => document.documentElement.style.setProperty("--sw", Math.min(innerWidth, innerHeight * 0.5625) + "px");
  setSW();
  addEventListener("resize", setSW);

  // политика автоплея: звук разблокируется первым касанием/клавишей
  const unlock = () => VN.audio.unlock();
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });

  // ошибки в коде тоже должны быть видны, а не тонуть в консоли
  addEventListener("error", e => VN.error(`JS: ${e.message}`));
  addEventListener("unhandledrejection", e => VN.error(`JS: ${e.reason && e.reason.message || e.reason}`));

  const q = new URLSearchParams(location.search);
  if (q.get("debug") || VN.cfg.debug) VN.debug.init();

  const vars = {};
  (q.get("vars") || "").split(",").filter(Boolean).forEach(pair => {
    const [k, raw = ""] = pair.split(":");
    vars[k] = raw === "true" ? true : raw === "false" ? false : isNaN(+raw) || raw === "" ? raw : +raw;
  });
  const at = q.get("at");
  const start = at === null ? 0 : /^\d+$/.test(at) ? +at : at;

  if (q.get("preview")) return VN.menu.newGame("__preview", start, vars);
  if (q.get("scene")) return VN.menu.newGame(q.get("scene"), start, vars);
  VN.menu.show();
});
