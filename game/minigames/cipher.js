/* cipher — «Знаки жетона»: продолжить ряд знаков и восстановить выскобленный.
 * params: { rounds: [ { seq: ["◐","◓",…], options: [...], answer: индекс правильного } ], mistakes: 2 }
 * Без params берутся три встроенных ряда. score = верные ответы; win = все раунды пройдены в пределах ошибок. */
(function () {
  const ROUNDS = [
    { seq: ["◐", "◓", "◑", "◒", "◐"], options: ["◑", "◓", "◒", "◐"], answer: 1 },
    { seq: ["▲", "▲", "▽", "▲", "▲", "▽", "▲", "▲"], options: ["▲", "◆", "▽", "◇"], answer: 2 },
    { seq: ["●", "○", "●●", "○○", "●●●"], options: ["●●●●", "○○○", "○○", "●○"], answer: 1 }
  ];
  const CSS = `
  .cph { display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .cph-ring { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 14px; border: 2px solid var(--paper-dim); border-radius: 18px; background: #1a1714; }
  .cph-ring span { min-width: 1.8em; text-align: center; color: var(--paper); font-size: calc(var(--sw,400px)*.08); }
  .cph-ring .gap { color: var(--accent); border-bottom: 2px dashed var(--accent); }
  .cph-opts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
  .cph-opts .mg-btn { min-width: 3em; font-size: calc(var(--sw,400px)*.07); }
  .cph-st { color: var(--paper-dim); font-size: calc(var(--sw,400px)*.036); }
  `;
  function ensureStyle() {
    if (document.getElementById("mg-cipher-css")) return;
    const st = document.createElement("style"); st.id = "mg-cipher-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  VN.minigames.register("cipher", {
    title: "Знаки жетона",
    help: "Знаки по краю жетона идут по порядку, но один выскоблен. Продолжи ряд: выбери знак, который встанет на пустое место.",
    start(ctx) {
      ensureStyle();
      const p = Object.assign({ rounds: ROUNDS, mistakes: 2 }, ctx.params);
      ctx.root.innerHTML = `<div class="cph"><div class="cph-ring"></div><div class="cph-opts"></div><div class="cph-st"></div></div>`;
      const ring = ctx.root.querySelector(".cph-ring"), opts = ctx.root.querySelector(".cph-opts"), st = ctx.root.querySelector(".cph-st");
      let r = 0, ok = 0, wrong = 0, over = false;
      const end = win => { over = true; setTimeout(() => ctx.finish({ win, score: ok }), 500); };
      const show = () => {
        const R = p.rounds[r];
        ring.innerHTML = ""; opts.innerHTML = "";
        R.seq.forEach(g => { const s = document.createElement("span"); s.textContent = g; ring.appendChild(s); });
        const gap = document.createElement("span"); gap.className = "gap"; gap.textContent = "?"; ring.appendChild(gap);
        ctx.root.dataset.answer = R.options[R.answer];
        R.options.forEach((g, i) => {
          const b = document.createElement("button"); b.className = "mg-btn"; b.textContent = g; b.dataset.i = i;
          b.onclick = () => {
            if (over) return;
            if (i === R.answer) { ok++; ctx.sfx("tick"); r++; if (r >= p.rounds.length) end(true); else show(); }
            else { wrong++; ctx.sfx("click"); b.classList.add("wrong"); b.disabled = true; if (wrong > p.mistakes) end(false); }
            st.textContent = `Ряд ${Math.min(r + 1, p.rounds.length)} из ${p.rounds.length} · Ошибок: ${wrong} из ${p.mistakes}`;
          };
          opts.appendChild(b);
        });
        st.textContent = `Ряд ${r + 1} из ${p.rounds.length} · Ошибок: ${wrong} из ${p.mistakes}`;
      };
      show();
    }
  });
})();
