/* dispatch — «Сверка донесений»: найти строки второго донесения, противоречащие первому.
 * params: { a: { title, lines: [строка…] }, b: { title, lines: [{ t, x: true|false }…] }, mistakes: 2 }
 * x: true — строка противоречит первому донесению. Нужно найти все такие строки, ошибившись не более `mistakes` раз.
 * score = найдено противоречий; win = найдены все. */
(function () {
  const CSS = `
  .dsp { display: flex; flex-direction: column; gap: 10px; }
  .dsp h4 { margin: 0; color: var(--paper-dim); font-size: calc(var(--sw,400px)*.036); letter-spacing: .05em; text-transform: uppercase; }
  .dsp-a, .dsp-b { background: rgba(14,14,17,.7); border: 1px solid rgba(216,201,163,.3); border-radius: 10px; padding: 8px 10px; }
  .dsp-a p { margin: 3px 0; color: #cfc8b6; font-size: calc(var(--sw,400px)*.038); }
  .dsp-b button { display: block; width: 100%; text-align: left; margin: 3px 0; padding: 6px 8px; background: transparent; color: #e8e2d4; border: 1px solid transparent; border-radius: 6px; font: inherit; font-size: calc(var(--sw,400px)*.04); }
  .dsp-b button.hit { border-color: var(--good); background: rgba(127,163,107,.22); }
  .dsp-b button.miss { border-color: var(--bad); background: rgba(180,90,90,.2); }
  .dsp-st { color: var(--paper-dim); font-size: calc(var(--sw,400px)*.036); text-align: center; }
  `;
  function ensureStyle() {
    if (document.getElementById("mg-dispatch-css")) return;
    const st = document.createElement("style"); st.id = "mg-dispatch-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  VN.minigames.register("dispatch", {
    title: "Сверка донесений",
    help: "Два донесения об одном событии. Коснись тех строк второго, которые противоречат первому. Ошибаться можно ограниченное число раз.",
    start(ctx) {
      ensureStyle();
      const p = Object.assign({ mistakes: 2 }, ctx.params);
      const A = p.a || { title: "Донесение 1", lines: [] }, B = p.b || { title: "Донесение 2", lines: [] };
      const need = B.lines.filter(l => l.x).length;
      ctx.root.innerHTML = `<div class="dsp"><div class="dsp-a"><h4></h4></div><div class="dsp-b"><h4></h4></div><div class="dsp-st"></div></div>`;
      ctx.root.querySelector(".dsp-a h4").textContent = A.title;
      ctx.root.querySelector(".dsp-b h4").textContent = B.title;
      const aBox = ctx.root.querySelector(".dsp-a"), bBox = ctx.root.querySelector(".dsp-b"), st = ctx.root.querySelector(".dsp-st");
      A.lines.forEach(t => { const e = document.createElement("p"); e.textContent = t; aBox.appendChild(e); });
      ctx.root.dataset.need = need;
      let found = 0, wrong = 0, over = false;
      const status = () => { st.textContent = `Найдено: ${found} из ${need} · Ошибок: ${wrong} из ${p.mistakes}`; };
      const end = win => { over = true; ctx.sfx(win ? "tick" : "click"); setTimeout(() => ctx.finish({ win, score: found }), 600); };
      B.lines.forEach(l => {
        const b = document.createElement("button"); b.textContent = l.t; if (l.x) b.dataset.x = "1";
        b.onclick = () => {
          if (over || b.classList.contains("hit") || b.classList.contains("miss")) return;
          if (l.x) { b.classList.add("hit"); found++; ctx.sfx("tick"); } else { b.classList.add("miss"); wrong++; ctx.sfx("click"); }
          status();
          if (found >= need) end(true); else if (wrong > p.mistakes) end(false);
        };
        bBox.appendChild(b);
      });
      status();
    }
  });
})();
