#!/usr/bin/env node
/**
 * cg_test.mjs — проверка CG-вставок в сценах главы.
 *   1) утечка: CG открыт и не закрыт к концу сцены (по любой ветке);
 *   2) недостижимые шаги (та же логика потока, что в engine/js/schema.js).
 * Запуск: node tools/cg_test.mjs
 */
import { readdirSync, readFileSync } from "node:fs";

const DIR = "game/scenes";
const STEP_KEYS = new Set(["say","narr","show","hide","bg","cg","goto","if","choice","set","wait",
  "sfx","bgm","flash","shake","memo","card","scene","end","minigame","random","label","call"]);

const typeOf = s => {
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  for (const k of Object.keys(s)) if (STEP_KEYS.has(k) && k !== "label") return k;
  return null;
};

/** Обход потока: для каждого шага множество «открытых CG», с которыми его можно достичь. */
function flow(steps) {
  const labels = new Map();
  steps.forEach((s, i) => { if (typeof s.label === "string") labels.set(s.label, i); });
  const reach = new Array(steps.length).fill(false);
  const seen = new Set();
  const leaks = [];
  const queue = [[0, null]];
  const push = (l, cg) => { if (typeof l === "string" && labels.has(l)) queue.push([labels.get(l), cg]); };
  while (queue.length) {
    let [i, cg] = queue.shift();
    while (i < steps.length) {
      const key = i + "|" + cg;
      if (seen.has(key)) break;
      seen.add(key);
      reach[i] = true;
      const s = steps[i], t = typeOf(s);
      if ("cg" in s) cg = s.cg;
      // renderer.bg() снимает CG при смене фона — держим модель в согласии с движком
      if (t === "bg" && s.bg) cg = null;
      if (t === "end" || t === "scene") { if (cg) leaks.push({ step: i, cg, to: s.scene || "end" }); break; }
      if (t === "goto") { i = labels.has(s.goto) ? labels.get(s.goto) : steps.length; continue; }
      if (t === "if") {
        if (s.if && s.if.goto) push(s.if.goto, cg);
        if (s.if && s.if.else) { push(s.if.else, cg); break; }
        i++; continue;
      }
      if (t === "choice" && Array.isArray(s.choice)) {
        const all = s.choice.length > 0 && s.choice.every(o => o && o.goto);
        for (const o of s.choice) if (o && o.goto) push(o.goto, cg);
        if (all) break;
        i++; continue;
      }
      if (t === "minigame") { push(s.win, cg); push(s.lose, cg); if (s.win && s.lose) break; i++; continue; }
      i++;
    }
  }
  const dead = [...Array(steps.length).keys()].filter(i => !reach[i]);
  return { leaks, dead };
}

let bad = 0;
for (const f of readdirSync(DIR).filter(f => f.endsWith(".json")).sort()) {
  const d = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
  const { leaks, dead } = flow(d.steps || []);
  if (!leaks.length && !dead.length) continue;
  console.log(`\n■ ${f}`);
  for (const l of leaks) { bad++; console.log(`  ✗ шаг ${l.step}: CG «${l.cg}» не закрыт перед ${l.to}`); }
  if (dead.length) { bad++; console.log(`  ~ недостижимые шаги: ${dead.join(", ")}`); }
}
console.log(bad ? `\n✗ проблем: ${bad}` : "\n✓ CG закрываются на всех ветках, недостижимых шагов нет");
process.exit(bad ? 1 : 0);
