/* tea — «Чаепитие»: налить чай в чашку, не доливая и не переливая.
 * params: { cups: 3, need: 2, zones: [0.26, 0.2, 0.15] (ширина зелёной зоны по чашкам), speed: 0.5 (доля шкалы в секунду) }
 * Зажми кнопку — уровень растёт, отпусти — чашка налита. Если уровень вышел за край, чашка пролита.
 * score = число удачных чашек; win = score >= need. */
(function () {
  const CSS = `
  .tea { display: flex; flex-direction: column; align-items: center; gap: 12px; user-select: none; touch-action: none; }
  .tea-cups { display: flex; gap: 10px; font-size: calc(var(--sw,400px)*.07); }
  .tea-cups span { opacity: .35; } .tea-cups .ok { opacity: 1; filter: none; } .tea-cups .bad { opacity: 1; filter: grayscale(1) brightness(.6); }
  .tea-cup { position: relative; width: calc(var(--sw,400px)*.34); height: calc(var(--sw,400px)*.42); border: 2px solid var(--paper-dim); border-top: none; border-radius: 0 0 40% 40%; background: #1a1714; overflow: hidden; }
  .tea-fill { position: absolute; left: 0; right: 0; bottom: 0; height: 0; background: linear-gradient(#a7662d, #7b4519); }
  .tea-zone { position: absolute; left: 0; right: 0; background: rgba(127,163,107,.35); border-top: 2px dashed var(--good); border-bottom: 2px dashed var(--good); }
  .tea-msg { min-height: 1.4em; color: var(--paper); font-family: Georgia, serif; font-size: calc(var(--sw,400px)*.05); }
  `;
  function ensureStyle() {
    if (document.getElementById("mg-tea-css")) return;
    const st = document.createElement("style"); st.id = "mg-tea-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  VN.minigames.register("tea", {
    title: "Чаепитие",
    help: "Зажми кнопку, и чашка начнёт наполняться. Отпусти, когда чай дойдёт до зелёной зоны. Не долей и не перелей.",
    start(ctx) {
      ensureStyle();
      const p = Object.assign({ cups: 3, need: 2, zones: [0.26, 0.2, 0.15], speed: 0.5 }, ctx.params);
      ctx.root.innerHTML = `<div class="tea"><div class="tea-cups"></div>
        <div class="tea-cup"><div class="tea-zone"></div><div class="tea-fill"></div></div>
        <button class="mg-btn tea-btn">Лить</button><div class="tea-msg"></div></div>`;
      const cups = ctx.root.querySelector(".tea-cups"), zone = ctx.root.querySelector(".tea-zone"),
            fill = ctx.root.querySelector(".tea-fill"), btn = ctx.root.querySelector(".tea-btn"),
            msg = ctx.root.querySelector(".tea-msg");
      const marks = Array.from({ length: p.cups }, () => { const s = document.createElement("span"); s.textContent = "☕"; cups.appendChild(s); return s; });
      let n = 0, ok = 0, level = 0, pouring = false, lock = false, lo = 0, hi = 0, raf = 0, last = 0;
      const setZone = () => {
        const w = p.zones[Math.min(n, p.zones.length - 1)];
        const start = 0.45 + Math.random() * (0.9 - 0.45 - w);
        lo = start; hi = start + w;
        zone.style.bottom = (lo * 100) + "%"; zone.style.height = (w * 100) + "%";
        ctx.root.dataset.zone = lo.toFixed(3) + "-" + hi.toFixed(3);
      };
      const next = () => { level = 0; ctx.root.dataset.level = "0"; fill.style.height = "0"; lock = false; msg.textContent = ""; if (n >= p.cups) return done(); setZone(); };
      const done = () => { ctx.sfx("tick"); setTimeout(() => ctx.finish({ win: ok >= p.need, score: ok }), 500); };
      const settle = good => {
        lock = true; pouring = false;
        marks[n].className = good ? "ok" : "bad"; if (good) ok++;
        msg.textContent = good ? "Ровно." : (level > hi ? "Перелито." : "Маловато.");
        ctx.sfx(good ? "tick" : "click"); n++;
        setTimeout(next, 700);
      };
      const frame = t => {
        raf = requestAnimationFrame(frame);
        const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
        if (!pouring || lock) return;
        level += p.speed * dt; fill.style.height = Math.min(level, 1) * 100 + "%";
        ctx.root.dataset.level = level.toFixed(3);
        if (level >= 1) settle(false);
      };
      raf = requestAnimationFrame(frame);
      ctx.onCleanup(() => cancelAnimationFrame(raf));
      const down = e => { if (lock) return; pouring = true; e.preventDefault(); };
      const up = () => { if (!pouring || lock) return; settle(level >= lo && level <= hi); };
      btn.addEventListener("pointerdown", down); btn.addEventListener("pointerup", up);
      btn.addEventListener("pointerleave", up); btn.addEventListener("pointercancel", up);
      setZone();
    }
  });
})();
