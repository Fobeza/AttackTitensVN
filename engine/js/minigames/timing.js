/* timing — «поймай момент»: маркер бегает по шкале, тапни, когда он в зелёной зоне.
 * params: { rounds: 3, need: 2, speed: 1, zone: 0.22, button: "Сейчас!" }
 * score = число попаданий; win = попаданий >= need */
VN.minigames.register("timing", {
  title: "Поймай момент",
  help: "Маркер бегает по шкале. Жми, когда он в зелёной зоне.",
  start(ctx) {
    const p = Object.assign({ rounds: 3, need: 2, speed: 1, zone: 0.22, button: "Сейчас!" }, ctx.params);
    ctx.root.innerHTML = `
      <div class="mg-timing">
        <div class="mg-status"></div>
        <div class="mg-bar"><div class="mg-zone"></div><div class="mg-marker"></div></div>
        <button class="mg-btn mg-hit"></button>
      </div>`;
    const status = ctx.root.querySelector(".mg-status");
    const zoneEl = ctx.root.querySelector(".mg-zone");
    const marker = ctx.root.querySelector(".mg-marker");
    const btn = ctx.root.querySelector(".mg-hit");
    btn.textContent = p.button;

    let round = 0, hits = 0, pos = 0, dir = 1, zoneStart = 0, raf = 0, last = 0, locked = false;
    const newRound = () => {
      zoneStart = Math.random() * (1 - p.zone);
      zoneEl.style.left = zoneStart * 100 + "%";
      zoneEl.style.width = p.zone * 100 + "%";
      status.textContent = `Раунд ${round + 1} из ${p.rounds} · попаданий: ${hits}`;
      locked = false;
    };
    const tick = ts => {
      const dt = last ? (ts - last) / 1000 : 0;
      last = ts;
      if (!locked) {
        pos += dir * dt * 0.9 * p.speed * (1 + round * 0.15);
        if (pos > 1) { pos = 1; dir = -1; }
        if (pos < 0) { pos = 0; dir = 1; }
        marker.style.left = pos * 100 + "%";
      }
      raf = requestAnimationFrame(tick);
    };
    btn.onclick = () => {
      if (locked) return;
      locked = true;
      const ok = pos >= zoneStart && pos <= zoneStart + p.zone;
      if (ok) hits++;
      ctx.sfx(ok ? "tick" : "click");
      marker.classList.add(ok ? "hit" : "miss");
      setTimeout(() => {
        marker.classList.remove("hit", "miss");
        round++;
        if (round >= p.rounds) ctx.finish({ win: hits >= p.need, score: hits });
        else newRound();
      }, 550);
    };
    ctx.onCleanup(() => cancelAnimationFrame(raf));
    newRound();
    raf = requestAnimationFrame(tick);
  }
});
