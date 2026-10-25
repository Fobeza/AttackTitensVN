#!/usr/bin/env node
// Simulated playthroughs of Chapter 2 from random Chapter 1 outcomes (real parser, real conditions).
// Ends when the last written Chapter 2 scene reaches its "end" card.
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const cfg = JSON.parse(fs.readFileSync(new URL("../game/game.json", import.meta.url)));
const scenes = Object.fromEntries(cfg.scenes.map(({ id }) => [id,
  JSON.parse(fs.readFileSync(new URL(`../game/scenes/${id}.json`, import.meta.url)))]));
const FLAGS = ["f_defiant", "f_coop", "f_clean", "f_lab", "f_told_tune", "f_report", "f_alibi_petra",
  "f_pressed_sam", "f_tone_soft", "f_levi_hurt", "f_side_none", "f_escape", "f_tune"];
const routes = ["levi", "erwin", "hange", ""];
const sam = ["spared", "arrested", "none"];
const seen = { route: new Set(), sam: new Set(), mentor: new Set(), oath: new Set(), swap: new Set() };
const N = 600;
for (let seed = 1; seed <= N; seed++) {
  let rng = seed, turns = 0, ended = null;
  const random = n => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return Math.floor(rng / 4294967296 * n); };
  const tick = () => { assert(++turns < 3000, `loop, seed ${seed}`); return true; };
  const context = vm.createContext({ console });
  context.window = context;
  context.VN = { cfg, schema: require("../engine/js/schema.js") };
  for (const file of ["state", "parser"]) vm.runInContext(
    fs.readFileSync(new URL(`../engine/js/${file}.js`, import.meta.url), "utf8"), context);
  const VN = context.VN;
  VN.error = msg => { throw new Error(`${msg} (seed ${seed})`); };
  VN.debug = { update() {} };
  VN.audio = { bgm() {}, sfx() {} };
  VN.renderer = { loadManifest: async () => {}, preload() {}, charOf() {}, focus() {},
    bg(name) { VN.game.visual.bg = name; }, cg() {}, show() {}, hide() {}, shake() {}, flash() {} };
  VN.save = { auto() {} };
  VN.menu = { show() { throw new Error("unexpected menu"); } };
  VN.ui = { cancelWaits() {}, toast() {}, say: tick, narr: tick, card: tick, sleep: tick,
    choice(options) {
      tick();
      const available = options.filter(o => VN.test(o.if));
      assert(available.length, `dead choice, seed ${seed}`);
      return available[random(available.length)];
    },
    endCard(e) { ended = e; }
  };
  VN.minigames = { abort() {}, play() { return { win: !!random(2), score: 1 }; } };
  VN.parser.loadScene = async id => { assert(scenes[id], id); return scenes[id]; };
  // Chapter 1 outcome: the state a save from the end of Chapter 1 would carry
  VN.game = VN.state.fresh();
  const v = VN.game.vars;
  v.route = routes[random(routes.length)];
  const s = sam[random(sam.length)];
  v.f_sam_spared = s === "spared";
  v.f_sam_arrested = s === "arrested";
  if (v.route === "") v.f_sam_spared = v.f_sam_arrested = false; // lock path: Sam unresolved
  for (const f of FLAGS) v[f] = !!random(2);
  v.lei = random(9); v.erw = random(9); v.han = random(9); v.trust = random(7); v.truth = random(5);
  await VN.parser.run("ch2_c1");
  assert(ended, `no end card, seed ${seed}`);
  assert.equal(VN.game.scene, "ch2_c6", `ended in ${VN.game.scene}, seed ${seed}`);
  assert.equal(v.w1, 2, `week 1 meetings, seed ${seed}`);
  assert.equal(v.w2, 2, `week 2 meetings, seed ${seed}`);
  assert(["levi", "erwin", "hange"].includes(v.mentor), `mentor, seed ${seed}`);
  assert(["corps", "person", "truth"].includes(v.oath), `oath, seed ${seed}`);
  seen.route.add(v.route); seen.mentor.add(v.mentor); seen.oath.add(v.oath); seen.swap.add(!!v.f_ch2_swap);
  seen.sam.add(`${v.f_sam_spared}/${v.f_sam_arrested}`);
}
for (const m of ["levi", "erwin", "hange"]) assert(seen.mentor.has(m), `mentor ${m} not reached`);
for (const o of ["corps", "person", "truth"]) assert(seen.oath.has(o), `oath ${o} not reached`);
assert(seen.swap.has(true) && seen.swap.has(false), "mentor swap not exercised both ways");
console.log(`✓ ${N} Chapter 2 playthroughs from random Chapter 1 saves: no dead choices/loops, all mentors, oaths and the mentor swap reached`);
