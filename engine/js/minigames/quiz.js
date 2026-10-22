/* quiz — вопросы с вариантами ответа (загадки, допрос, экзамен).
 * params: { questions: [ { q: "Вопрос?", options: ["а", "б", "в"], answer: 1, hint?: "…" } ], need?: число }
 * answer — индекс верного варианта с 0. need по умолчанию = все вопросы.
 * score = число верных ответов; win = верных >= need */
VN.minigames.register("quiz", {
  title: "Вопрос",
  start(ctx) {
    const qs = ctx.params.questions || [];
    if (!qs.length) throw new Error("quiz: нет params.questions");
    const need = ctx.params.need ?? qs.length;
    let k = 0, right = 0;

    const render = () => {
      const q = qs[k];
      ctx.root.innerHTML = "";
      const box = document.createElement("div");
      box.className = "mg-quiz";
      const status = document.createElement("div");
      status.className = "mg-status";
      status.textContent = qs.length > 1 ? `Вопрос ${k + 1} из ${qs.length}` : "";
      const text = document.createElement("div");
      text.className = "mg-q";
      text.textContent = q.q;
      box.append(status, text);
      q.options.forEach((o, j) => {
        const b = document.createElement("button");
        b.className = "mg-btn mg-opt";
        b.textContent = o;
        b.onclick = () => {
          const ok = j === q.answer;
          if (ok) right++;
          ctx.sfx(ok ? "tick" : "click");
          box.querySelectorAll(".mg-opt").forEach((x, xi) => {
            x.disabled = true;
            if (xi === q.answer) x.classList.add("right");
            else if (xi === j) x.classList.add("wrong");
          });
          if (!ok && q.hint) { const h = document.createElement("div"); h.className = "mg-hint"; h.textContent = q.hint; box.appendChild(h); }
          setTimeout(() => {
            k++;
            if (k >= qs.length) ctx.finish({ win: right >= need, score: right });
            else render();
          }, ok ? 700 : 1400);
        };
        box.appendChild(b);
      });
      ctx.root.appendChild(box);
    };
    render();
  }
});
