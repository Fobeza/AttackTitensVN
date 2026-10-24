#!/usr/bin/env node
// Deterministic simulated playthroughs using the real parser and conditions.
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const cfg = JSON.parse(fs.readFileSync(new URL("../game/game.json", import.meta.url)));
const scenes = Object.fromEntries(cfg.scenes.map(({ id }) => [id,
  JSON.parse(fs.readFileSync(new URL(`../game/scenes/${id}.json`, import.meta.url)))]));
const endings = new Set();
for (let seed = 1; seed <= 400; seed++) {
  let rng = seed, turns = 0, ended = false;
  const random = n => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return Math.floor(rng / 4294967296 * n); };
  const tick = () => { assert(++turns < 2000, `loop, seed ${seed}`); return true; };
  const context = vm.createContext({ console });
  context.window = context;
  context.VN = { cfg, schema: require("../engine/js/schema.js") };
  for (const file of ["state", "parser"]) vm.runInContext(
    fs.readFileSync(new URL(`../engine/js/${file}.js`, import.meta.url), "utf8"), context);
  const VN = context.VN;
  VN.error = msg => { throw new Error(msg); };
  VN.debug = { update() {} };
  VN.audio = { bgm() {}, sfx() {} };
  VN.renderer = { loadManifest: async () => {}, preload() {}, charOf() {}, focus() {},
    bg() {}, cg() {}, show() {}, hide() {}, shake() {}, flash() {} };
  VN.save = { auto() {} };
  VN.menu = { show() { throw new Error("unexpected menu"); } };
  VN.ui = { cancelWaits() {}, toast() {}, say: tick, narr: tick, card: tick, sleep: tick,
    choice(options) {
      tick();
      const available = options.filter(o => VN.test(o.if));
      assert(available.length, `dead choice, seed ${seed}`);
      return available[random(available.length)];
    },
    endCard() { ended = true; }
  };
  VN.minigames = { abort() {}, play() { return { win: !!random(2), score: 1 }; } };
  VN.parser.loadScene = async id => { assert(scenes[id], id); return scenes[id]; };
  await VN.parser.run(cfg.startScene);
  assert(ended, `no ending, seed ${seed}`);
  const v = VN.game.vars;
  for (const day of [1, 2, 3]) assert.equal(v[`ev${day}`], 2, `day ${day}, seed ${seed}`);
  if (VN.game.scene === "ac_hook") {
    assert(v.proof >= 4);
    assert.notEqual(v.f_sam_spared, v.f_sam_arrested);
    endings.add(`${v.route}:${v.f_sam_spared ? "spared" : "arrested"}`);
  } else {
    assert.equal(VN.game.scene, "end_lock");
    endings.add(`lock:${v.f_escape}`);
  }
}
for (const route of ["levi", "erwin", "hange"])
  for (const fate of ["spared", "arrested"]) assert(endings.has(`${route}:${fate}`), `${route}:${fate} not reached`);
for (const escape of [true, false]) assert(endings.has(`lock:${escape}`));
console.log("✓ 400 seeded playthroughs: no dead choices/loops, all 8 ending combinations reached");
