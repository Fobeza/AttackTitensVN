/* evidence — «Доска улик»: связать найденные улики с выводами.
 * params: { goals: [ { text, ok: ["id улики", …] } ], clues: [ { id, text, var } ], need: 2 }
 * Показываются только улики, у которых переменная `var` в сцене истинна (число > 0 или true).
 * Выбери вывод, затем улику, которая его подтверждает. Вывод без единой подходящей улики в руках «не доказан» и пропускается.
 * score = число доказанных выводов; win = score >= need. */
(function () {
  const CSS = `
  .evd { display: flex; flex-direction: column; gap: 10px; }
  .evd h4 { margin: 0 0 4px; color: var(--paper-dim); font-size: calc(var(--sw,400px)*.034); letter-spacing: .05em; text-transform: uppercase; }
  .evd-box { background: rgba(14,14,17,.7); border: 1px solid rgba(216,201,163,.3); border-radius: 10px; padding: 8px; }
  .evd button { display: block; width: 100%; text-align: left; margin: 4px 0; padding: 7px 9px; background: transparent; color: #e8e2d4; border: 1px solid rgba(216,201,163,.25); border-radius: 8px; font: inherit; font-size: calc(var(--sw,400px)*.039); }
  .evd button.sel { border-color: var(--paper); background: rgba(216,201,163,.12); }
  .evd button.done { border-color: var(--good); background: rgba(127,163,107,.2); }
  .evd button.bad { border-color: var(--bad); background: rgba(180,90,90,.2); }
  .evd button.unproven { opacity: .5; }
  .evd-st { color: var(--paper-dim); font-size: calc(var(--sw,400px)*.036); text-align: center; }
  `;
  function ensureStyle() {
    if (document.getElementById("mg-evidence-css")) return;
    const st = document.createElement("style"); st.id = "mg-evidence-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  VN.minigames.register("evidence", {
    title: "Доска улик",
    help: "Выбери вывод, затем улику, которая его подтверждает. Что найдено, то и на доске: чего не нашла, того не докажешь.",
    start(ctx) {
      ensureStyle();
      const p = Object.assign({ goals: [], clues: [], need: 2 }, ctx.params);
      const has = c => { const v = ctx.vars[c.var]; return c.var ? (typeof v === "number" ? v > 0 : !!v) : true; };
      const clues = p.clues.filter(has);
      const provable = p.goals.map(g => g.ok.some(id => clues.some(c => c.id === id)));
      ctx.root.innerHTML = `<div class="evd"><div class="evd-box"><h4>Выводы</h4></div><div class="evd-box"><h4>Улики</h4></div><div class="evd-st"></div></div>`;
      const [gBox, cBox] = ctx.root.querySelectorAll(".evd-box"), st = ctx.root.querySelector(".evd-st");
      ctx.root.dataset.provable = provable.filter(Boolean).length;
      let sel = -1, proved = 0, wrong = 0, left = provable.filter(Boolean).length, over = false;
      const status = () => { st.textContent = `Доказано: ${proved} · Осталось: ${left} · Промахов: ${wrong}`; };
      const finish = () => { over = true; ctx.sfx("tick"); setTimeout(() => ctx.finish({ win: proved >= p.need, score: proved }), 700); };
      const gBtns = p.goals.map((g, i) => {
        const b = document.createElement("button"); b.textContent = g.text + (provable[i] ? "" : " (нет улик)");
        if (!provable[i]) { b.classList.add("unproven"); b.disabled = true; }
        b.onclick = () => { if (over || b.classList.contains("done")) return; sel = i; gBtns.forEach((x, k) => x.classList.toggle("sel", k === i)); };
        gBox.appendChild(b); return b;
      });
      clues.forEach(c => {
        const b = document.createElement("button"); b.textContent = c.text; b.dataset.id = c.id;
        b.onclick = () => {
          if (over || sel < 0 || b.classList.contains("done")) return;
          if (p.goals[sel].ok.includes(c.id)) {
            b.classList.add("done"); gBtns[sel].classList.remove("sel"); gBtns[sel].classList.add("done"); gBtns[sel].disabled = true;
            proved++; left--; sel = -1; ctx.sfx("tick"); status(); if (left <= 0) finish();
          } else {
            b.classList.add("bad"); wrong++; ctx.sfx("click"); setTimeout(() => b.classList.remove("bad"), 500); status();
          }
        };
        cBox.appendChild(b);
      });
      status();
      if (left <= 0) finish();
    }
  });
})();
