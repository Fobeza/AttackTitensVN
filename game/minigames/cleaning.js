/* cleaning — «Уборка»: оттереть пятна с камня пальцем (мышью) до конца таймера.
 * params: { time: 20 (сек), need: 0.85 (доля чистоты для победы), brush: 20 (радиус щётки, px) }
 * score = процент чистоты (0…100); win = чистота >= need.
 * Рисуется на canvas: «грязь» — отдельный слой, который стирается (destination-out). */
(function () {
  const CSS = `
  .clean { display: flex; flex-direction: column; gap: 10px; align-items: center; user-select: none; }
  .clean-bar { width: 100%; display: flex; justify-content: space-between; color: var(--paper-dim); font-size: calc(var(--sw,400px)*.04); }
  .clean-bar b { color: var(--paper); font-weight: 600; }
  .clean-cv { border: 1px solid rgba(216,201,163,.35); border-radius: 10px; touch-action: none; cursor: crosshair; background: #1b1a1e; max-width: 100%; }
  .clean-prog { position: relative; width: 100%; height: 10px; background: #1a1714; border: 1px solid rgba(216,201,163,.3); border-radius: 999px; overflow: hidden; }
  .clean-prog i { display: block; height: 100%; width: 0; background: var(--good); transition: width .15s; }
  .clean-prog u { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--paper); opacity: .8; }
  .clean-msg { min-height: 1.4em; color: var(--paper); font-family: Georgia, serif; font-size: calc(var(--sw,400px)*.05); }
  `;
  function ensureStyle() {
    if (document.getElementById("mg-cleaning-css")) return;
    const st = document.createElement("style"); st.id = "mg-cleaning-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  VN.minigames.register("cleaning", {
    title: "Уборка",
    help: "Пятна на камне. Води пальцем, чтобы оттереть их, пока не вышло время. Леви смотрит, и ему не нравится ни одно пятно.",
    start(ctx) {
      ensureStyle();
      const p = Object.assign({ time: 20, need: 0.85, brush: 20 }, ctx.params);
      ctx.root.innerHTML = `<div class="clean">
        <div class="clean-bar"><span>Время: <b class="clean-time"></b></span><span>Чисто: <b class="clean-pct">0%</b></span></div>
        <canvas class="clean-cv"></canvas>
        <div class="clean-prog"><i></i><u></u></div>
        <div class="clean-msg"></div></div>`;
      const cv = ctx.root.querySelector(".clean-cv");
      const W = Math.round(Math.min(ctx.root.clientWidth || 340, 380)), H = Math.round(W * 0.95);
      cv.width = W; cv.height = H; cv.style.width = W + "px"; cv.style.height = H + "px";
      const g = cv.getContext("2d");
      const dirt = document.createElement("canvas"); dirt.width = W; dirt.height = H;
      const d = dirt.getContext("2d");
      const R = rng(Math.floor(Math.random() * 1e9));

      // базовый камень: кладка из блоков
      const base = document.createElement("canvas"); base.width = W; base.height = H;
      const b = base.getContext("2d");
      b.fillStyle = "#2a2a2f"; b.fillRect(0, 0, W, H);
      const rows = 5, bh = H / rows;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * (W / 8);
        for (let x = -off; x < W; x += W / 4) {
          const tone = 38 + Math.floor(R() * 22);
          b.fillStyle = `rgb(${tone},${tone},${tone + 5})`;
          b.fillRect(x + 2, r * bh + 2, W / 4 - 4, bh - 4);
        }
      }
      // пятна: кучки радиальных градиентов
      const blot = (x, y, rad, a) => {
        const gr = d.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, `rgba(78,66,56,${a})`); gr.addColorStop(0.6, `rgba(64,54,46,${a * 0.85})`); gr.addColorStop(1, "rgba(64,54,46,0)");
        d.fillStyle = gr; d.beginPath(); d.arc(x, y, rad, 0, 7); d.fill();
      };
      for (let i = 0; i < 9; i++) {
        const cx = 40 + R() * (W - 80), cy = 40 + R() * (H - 80);
        for (let k = 0; k < 4; k++) blot(cx + (R() - .5) * 60, cy + (R() - .5) * 50, 24 + R() * 26, 0.95);
      }
      d.strokeStyle = "rgba(58,48,40,.9)"; d.lineWidth = 7; d.lineCap = "round";
      for (let i = 0; i < 4; i++) { d.beginPath(); const x = R() * W; d.moveTo(x, R() * H * .5); d.quadraticCurveTo(x + (R() - .5) * 60, H * .6, x + (R() - .5) * 40, H * (.7 + R() * .3)); d.stroke(); }

      const STEP = 5;
      const measure = () => {
        const data = d.getImageData(0, 0, W, H).data; let n = 0;
        for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) if (data[(y * W + x) * 4 + 3] > 60) n++;
        return n;
      };
      const baseline = Math.max(1, measure());
      const timeEl = ctx.root.querySelector(".clean-time"), pctEl = ctx.root.querySelector(".clean-pct"),
            fill = ctx.root.querySelector(".clean-prog i"), mark = ctx.root.querySelector(".clean-prog u"),
            msg = ctx.root.querySelector(".clean-msg");
      mark.style.left = (p.need * 100) + "%";

      let progress = 0, left = p.time, ended = false, drawing = false, last = null, dirty = true, raf = 0;
      const render = () => {
        if (dirty) { g.drawImage(base, 0, 0); g.drawImage(dirt, 0, 0); dirty = false; }
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
      const update = () => {
        progress = Math.max(0, Math.min(1, 1 - measure() / baseline));
        pctEl.textContent = Math.round(progress * 100) + "%";
        fill.style.width = (progress * 100) + "%";
        if (progress >= 0.97) end();
      };
      const end = () => {
        if (ended) return; ended = true;
        const win = progress >= p.need;
        msg.textContent = win ? "Чисто." : "Грязновато…";
        ctx.sfx(win ? "tick" : "click");
        setTimeout(() => ctx.finish({ win, score: Math.round(progress * 100) }), 700);
      };
      const tick = setInterval(() => {
        if (ended) return;
        left -= 0.15; timeEl.textContent = Math.max(0, Math.ceil(left)) + " с";
        update();
        if (left <= 0) end();
      }, 150);
      timeEl.textContent = p.time + " с";
      ctx.onCleanup(() => { clearInterval(tick); cancelAnimationFrame(raf); });

      const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
      const scrub = (a, bb) => {
        d.globalCompositeOperation = "destination-out";
        d.lineCap = d.lineJoin = "round"; d.lineWidth = p.brush * 2; d.strokeStyle = "#000";
        d.beginPath(); d.moveTo(a.x, a.y); d.lineTo(bb.x, bb.y); d.stroke();
        d.globalCompositeOperation = "source-over";
        dirty = true;
      };
      cv.addEventListener("pointerdown", e => { if (ended) return; drawing = true; last = pos(e); scrub(last, last); try { cv.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
      cv.addEventListener("pointermove", e => { if (!drawing || ended) return; const c = pos(e); scrub(last, c); last = c; e.preventDefault(); });
      const up = () => { drawing = false; };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("pointerleave", up);
    }
  });
})();
