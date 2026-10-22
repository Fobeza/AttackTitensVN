#!/usr/bin/env node
/**
 * lint_scenes.mjs — строгая проверка игры: game.json, manifest, ассеты, все сцены.
 * Правила сцен — общие с движком и Конструктором (engine/js/schema.js).
 *
 *   node tools/lint_scenes.mjs            # всё
 *   node tools/lint_scenes.mjs demo ch2   # только эти сцены (+ проверка конфига)
 *   node tools/lint_scenes.mjs --quiet    # без info-сообщений
 *
 * Код выхода 1, если есть ошибки (✗). Предупреждения (~) не валят проверку.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = createRequire(import.meta.url)("../engine/js/schema.js");
const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const only = args.filter(a => !a.startsWith("--"));

let errors = 0, warns = 0;
const ICON = { error: "✗", warn: "~", info: "·" };
const report = (list, prefix = "") => {
  for (const p of list) {
    if (p.level === "error") errors++;
    if (p.level === "warn") warns++;
    if (p.level === "info" && quiet) continue;
    console.log(`  ${ICON[p.level]} ${prefix}${p.step !== null && p.step !== undefined ? `шаг ${p.step}: ` : ""}${p.msg}`);
  }
};
const rel = p => path.join(root, p);
const exists = p => fs.existsSync(rel(p));
const readJson = (p, what) => {
  try { return JSON.parse(fs.readFileSync(rel(p), "utf8")); }
  catch (e) { report([{ level: "error", step: null, msg: `${what}: ${p} — ${e.code === "ENOENT" ? "файла нет" : "битый JSON: " + e.message}` }]); return null; }
};

/* ── конфиг ── */
console.log("■ game/game.json");
const cfg = readJson("game/game.json", "конфиг");
if (!cfg) { console.log("\n✗ без game.json проверять нечего"); process.exit(1); }
report(schema.lintConfig(cfg));
const A = (cfg.paths && cfg.paths.assets) || "game/assets";
const S = (cfg.paths && cfg.paths.scenes) || "game/scenes";

if (cfg.varNames || cfg.varDefaults)
  report([{ level: "error", step: null, msg: "varNames/varDefaults устарели → перенеси в vars: { имя: { default, title } }" }]);

const audioFile = n => ["ogg", "mp3", "wav"].some(e => exists(`${A}/audio/${n}.${e}`));
const audio = cfg.audio || { bgm: [], sfx: [] };
for (const kind of ["bgm", "sfx"])
  for (const n of audio[kind] || []) if (!audioFile(n)) report([{ level: "error", step: null, msg: `audio.${kind}: нет файла ${A}/audio/${n}.ogg|mp3|wav` }]);
if (cfg.menuBg && !exists(`${A}/bg/${cfg.menuBg}.webp`)) report([{ level: "error", step: null, msg: `menuBg: нет ${A}/bg/${cfg.menuBg}.webp` }]);
if (cfg.menuBgm && !(audio.bgm || []).includes(cfg.menuBgm)) report([{ level: "error", step: null, msg: `menuBgm "${cfg.menuBgm}" нет в audio.bgm` }]);

const cgs = (cfg.gallery || []).map(g => g.id);
for (const id of cgs) if (!exists(`${A}/cg/${id}.webp`)) report([{ level: "error", step: null, msg: `gallery: нет ${A}/cg/${id}.webp` }]);

const minigames = [...schema.BUILTIN_MINIGAMES];
for (const id of schema.BUILTIN_MINIGAMES)
  if (!exists(`engine/js/minigames/${id}.js`)) report([{ level: "error", step: null, msg: `встроенная мини-игра ${id}: нет engine/js/minigames/${id}.js` }]);
for (const [id, file] of Object.entries(cfg.minigames || {})) {
  minigames.push(id);
  if (!exists(file)) report([{ level: "error", step: null, msg: `minigames.${id}: нет файла ${file}` }]);
  else if (!new RegExp(`register\\(\\s*["']${id}["']`).test(fs.readFileSync(rel(file), "utf8")))
    report([{ level: "error", step: null, msg: `minigames.${id}: в ${file} нет VN.minigames.register("${id}", …)` }]);
}

/* ── спрайты ── */
console.log("\n■ sprites/manifest.json");
const manifest = readJson(`${A}/sprites/manifest.json`, "манифест") || {};
const usedFiles = new Set();
for (const [char, c] of Object.entries(manifest)) {
  if (!/^[a-z0-9_]+$/.test(char)) report([{ level: "error", step: null, msg: `ключ персонажа "${char}" — только a-z, 0-9, _` }]);
  if (!c.name) report([{ level: "error", step: null, msg: `${char}: нет name` }]);
  if (!c.neutral) report([{ level: "error", step: null, msg: `${char}: нет эмоции neutral (запасная по умолчанию)` }]);
  for (const [expr, e] of Object.entries(c)) {
    if (expr === "name" || expr === "color") continue;
    if (!e || !e.file) { report([{ level: "error", step: null, msg: `${char}.${expr}: нет file` }]); continue; }
    usedFiles.add(e.file);
    if (!exists(`${A}/sprites/${e.file}`)) report([{ level: "error", step: null, msg: `${char}.${expr}: нет файла ${A}/sprites/${e.file}` }]);
    if (typeof e.height !== "number") report([{ level: "warn", step: null, msg: `${char}.${expr}: нет height — будет 0.6` }]);
  }
}
if (fs.existsSync(rel(`${A}/sprites`)))
  for (const f of fs.readdirSync(rel(`${A}/sprites`)))
    if (f.endsWith(".webp") && !usedFiles.has(f)) report([{ level: "warn", step: null, msg: `${f} лежит в sprites/, но не подключён в manifest.json` }]);
console.log(`  персонажей: ${Object.keys(manifest).length}, файлов: ${usedFiles.size}`);

/* ── фоны ── */
console.log("\n■ bg/index.json");
const bgs = readJson(`${A}/bg/index.json`, "список фонов") || [];
for (const b of bgs) if (!exists(`${A}/bg/${b}.webp`)) report([{ level: "error", step: null, msg: `нет файла ${A}/bg/${b}.webp` }]);
if (fs.existsSync(rel(`${A}/bg`)))
  for (const f of fs.readdirSync(rel(`${A}/bg`)))
    if (f.endsWith(".webp") && !bgs.includes(f.slice(0, -5))) report([{ level: "warn", step: null, msg: `${f} не внесён в bg/index.json (Конструктор его не увидит)` }]);
console.log(`  фонов: ${bgs.length}`);

/* ── сцены ── */
console.log("\n■ сцены: game.json ↔ файлы");
const sceneIds = (cfg.scenes || []).map(s => s.id);
const files = fs.existsSync(rel(S)) ? fs.readdirSync(rel(S)).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)) : [];
for (const id of sceneIds) if (!files.includes(id)) report([{ level: "error", step: null, msg: `scenes: "${id}" есть в game.json, но нет файла ${S}/${id}.json` }]);
for (const id of files) if (!sceneIds.includes(id)) report([{ level: "warn", step: null, msg: `${S}/${id}.json не внесён в game.json → scenes (в игре недоступен)` }]);

const scenes = {};
for (const id of files) {
  const sc = readJson(`${S}/${id}.json`, "сцена");
  if (sc) scenes[id] = sc;
}
const labelsOf = sc => (sc.steps || []).filter(s => s && typeof s.label === "string").map(s => s.label);
const sceneLabels = Object.fromEntries(Object.entries(scenes).map(([id, sc]) => [id, labelsOf(sc)]));
// метки, в которые прыгают из других сцен ({ scene, at })
const external = {};
for (const sc of Object.values(scenes))
  for (const s of sc.steps || []) if (s && typeof s.scene === "string" && s.at) (external[s.scene] = external[s.scene] || []).push(s.at);

const ctx = {
  manifest, bgs, cgs, audio, minigames,
  vars: schema.varList(cfg),
  speakers: cfg.speakers || [],
  scenes: sceneIds.filter(id => scenes[id]),
  sceneLabels
};
for (const [id, sc] of Object.entries(scenes)) {
  if (only.length && !only.includes(id)) continue;
  console.log(`\n■ ${S}/${id}.json`);
  report(schema.lintScene(sc, { ...ctx, id, externalLabels: external[id] || [] }));
  console.log(`  шагов: ${sc.steps ? sc.steps.length : 0}, меток: ${sceneLabels[id].length}`);
}

console.log(`\n${errors ? "✗ ошибок: " + errors : "✓ ошибок нет"}${warns ? `, предупреждений: ${warns}` : ""}`);
process.exit(errors ? 1 : 0);
