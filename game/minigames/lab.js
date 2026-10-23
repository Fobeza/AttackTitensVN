/* lab — «Лаборатория»: по записям Ханджи вывести порядок реагентов и перетащить их в колбу.
 * params: { tries: 3 (попыток смешать), puzzle: номер задачи (по умолчанию случайная) }
 * Управление: перетащи пузырёк в ячейку или просто тапни по нему (займёт первую свободную);
 * тап по ячейке возвращает реагент. После «Смешать» подсказка: сколько реагентов на своих местах.
 * score = оставшиеся попытки; win = порядок угадан. */
(function () {
  const CSS = `
  .lab { display: flex; flex-direction: column; gap: 12px; user-select: none; }
  .lab-diary { background: rgba(216,201,163,.08); border: 1px solid rgba(216,201,163,.3); border-radius: 10px; padding: .7em .9em; color: #d9d1bd; font-size: calc(var(--sw,400px)*.038); line-height: 1.4; }
  .lab-diary h4 { font: 600 1em Georgia, serif; color: var(--paper); margin-bottom: .3em; letter-spacing: .05em; }
  .lab-diary li { margin-left: 1.1em; margin-bottom: .2em; }
  .lab-slots, .lab-shelf { display: flex; gap: 8px; justify-content: center; }
  .lab-slot { flex: 1; max-width: 22%; aspect-ratio: 1; border: 2px dashed rgba(216,201,163,.4); border-radius: 12px; display: flex; align-items: center; justify-content: center;
    font-size: calc(var(--sw,400px)*.027); color: var(--paper-dim); text-align: center; line-height: 1.1; padding: 2px; overflow: hidden; }
  .lab-slot.over { border-color: var(--paper); background: rgba(216,201,163,.12); }
  .lab-slot.full { border-style: solid; color: #111; font-weight: 600; cursor: pointer; }
  .lab-bottle { flex: 1; max-width: 22%; aspect-ratio: 1; border-radius: 28%; border: 2px solid rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center;
    color: #111; font-weight: 600; font-size: calc(var(--sw,400px)*.027); text-align: center; line-height: 1.1; cursor: grab; touch-action: none; padding: 2px; overflow: hidden; }
  .lab-bottle.used { opacity: .25; pointer-events: none; }
  .lab-ghost { position: fixed; z-index: 100; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%; opacity: .9; pointer-events: none; display: flex; align-items: center; justify-content: center; color: #111; font-weight: 700; font-size: 11px; }
  .lab-row { display: flex; gap: 8px; }
  .lab-row .mg-btn { margin-top: 0; }
  .lab-msg { min-height: 2.6em; text-align: center; color: var(--paper); font-size: calc(var(--sw,400px)*.04); }
  .lab-tries { text-align: center; color: var(--paper-dim); font-size: calc(var(--sw,400px)*.036); }
  `;
  const REAGENTS = {
    A: { name: "Алый", color: "#d9534f" }, B: { name: "Лазурный", color: "#5dade2" },
    C: { name: "Янтарный", color: "#e8b923" }, D: { name: "Изумрудный", color: "#58d68d" }
  };
  // порядок решения — единственный, выводится из подсказок
  const PUZZLES = [
    { clues: ["Изумрудный нельзя лить первым.", "Лазурный всегда идёт сразу после Алого.", "Янтарный добавляют последним."], solution: ["A", "B", "D", "C"] },
    { clues: ["Алый добавляют не раньше третьего шага.", "Изумрудный идёт сразу перед Янтарным.", "Лазурный первый или последний, но только не последний."], solution: ["B", "D", "C", "A"] }
  ];
  function ensureStyle() {
    if (document.getElementById("mg-lab-css")) return;
    const st = document.createElement("style"); st.id = "mg-lab-css"; st.textContent = CSS; document.head.appendChild(st);
  }

  VN.minigames.register("lab", {
    title: "Лаборатория",
    help: "Ханджи оставила записи о порядке реагентов. Выведи верную последовательность и перетащи пузырьки в ячейки (или тапай по ним). Ошибёшься три раза, и будет осадок.",
    start(ctx) {
      ensureStyle();
      const p = Object.assign({ tries: 3 }, ctx.params);
      const pz = PUZZLES[Number.isInteger(p.puzzle) ? p.puzzle % PUZZLES.length : Math.floor(Math.random() * PUZZLES.length)];
      const N = pz.solution.length;
      ctx.root.dataset.solution = pz.solution.join("");     // для автотестов и отладки
      ctx.root.innerHTML = `<div class="lab">
        <div class="lab-diary"><h4>Дневник Ханджи</h4><ul>${pz.clues.map(c => `<li>${c}</li>`).join("")}</ul></div>
        <div class="lab-tries"></div>
        <div class="lab-slots">${pz.solution.map((_, i) => `<div class="lab-slot" data-i="${i}">${i + 1}</div>`).join("")}</div>
        <div class="lab-shelf">${Object.keys(REAGENTS).map(k => `<div class="lab-bottle" data-k="${k}" style="background:${REAGENTS[k].color}">${REAGENTS[k].name}</div>`).join("")}</div>
        <div class="lab-msg"></div>
        <div class="lab-row"><button class="mg-btn lab-reset">Сбросить</button><button class="mg-btn lab-mix" disabled>Смешать</button></div></div>`;
      const slotsEl = [...ctx.root.querySelectorAll(".lab-slot")], bottleEl = {};
      ctx.root.querySelectorAll(".lab-bottle").forEach(el => { bottleEl[el.dataset.k] = el; });
      const msg = ctx.root.querySelector(".lab-msg"), triesEl = ctx.root.querySelector(".lab-tries"),
            mix = ctx.root.querySelector(".lab-mix"), reset = ctx.root.querySelector(".lab-reset");
      const slots = new Array(N).fill(null);
      let tries = p.tries, ended = false;
      const paint = () => {
        slots.forEach((k, i) => {
          const el = slotsEl[i];
          el.classList.toggle("full", !!k);
          el.style.background = k ? REAGENTS[k].color : "";
          el.textContent = k ? REAGENTS[k].name : String(i + 1);
        });
        Object.keys(bottleEl).forEach(k => bottleEl[k].classList.toggle("used", slots.includes(k)));
        mix.disabled = ended || slots.some(x => !x);
        triesEl.textContent = "Попыток: " + tries;
      };
      const place = (k, i) => {                     // положить реагент в ячейку (замена возвращает прежний на полку)
        if (ended) return;
        const from = slots.indexOf(k); if (from >= 0) slots[from] = null;
        slots[i] = k; paint();
      };
      const firstEmpty = () => slots.findIndex(x => !x);
      slotsEl.forEach((el, i) => el.addEventListener("click", () => { if (!ended && slots[i]) { slots[i] = null; paint(); } }));
      reset.onclick = () => { if (ended) return; slots.fill(null); msg.textContent = ""; paint(); };

      // перетаскивание/тап по пузырьку
      Object.entries(bottleEl).forEach(([k, el]) => {
        el.addEventListener("pointerdown", e => {
          if (ended || el.classList.contains("used")) return;
          const sx = e.clientX, sy = e.clientY; let ghost = null, moved = false;
          const slotAt = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.closest ? t.closest(".lab-slot") : null; };
          const mv = ev => {
            if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
              moved = true; ghost = document.createElement("div"); ghost.className = "lab-ghost";
              ghost.style.background = REAGENTS[k].color; ghost.textContent = REAGENTS[k].name; document.body.appendChild(ghost);
            }
            if (ghost) { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; }
            slotsEl.forEach(s => s.classList.remove("over"));
            const s = moved && slotAt(ev.clientX, ev.clientY); if (s) s.classList.add("over");
          };
          const upf = ev => {
            document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", upf); document.removeEventListener("pointercancel", upf);
            slotsEl.forEach(s => s.classList.remove("over"));
            if (ghost) ghost.remove();
            if (moved) { const s = slotAt(ev.clientX, ev.clientY); if (s) place(k, +s.dataset.i); }
            else { const i = firstEmpty(); if (i >= 0) place(k, i); }
          };
          document.addEventListener("pointermove", mv); document.addEventListener("pointerup", upf); document.addEventListener("pointercancel", upf);
          e.preventDefault();
        });
      });
      ctx.onCleanup(() => document.querySelectorAll(".lab-ghost").forEach(g => g.remove()));

      mix.onclick = () => {
        if (ended || slots.some(x => !x)) return;
        const right = slots.reduce((n, k, i) => n + (k === pz.solution[i] ? 1 : 0), 0);
        if (right === N) {
          ended = true; msg.textContent = "Прозрачная жидкость, без осадка. Получилось!"; paint(); ctx.sfx("tick");
          setTimeout(() => ctx.finish({ win: true, score: tries }), 900);
          return;
        }
        tries--; paint(); ctx.sfx("click");
        if (tries <= 0) {
          ended = true; msg.textContent = "Осадок. Колба испорчена."; paint();
          setTimeout(() => ctx.finish({ win: false, score: 0 }), 1000);
        } else msg.textContent = `Осадок. На своих местах: ${right} из ${N}. Подумай ещё.`;
      };
      paint();
    }
  });
})();
