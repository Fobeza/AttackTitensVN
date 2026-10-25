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
// Verify staging on actual paths, including returning from optional meetings.
const expectedBackgrounds = new Map();
const visualChecks = [
  ["d1_evening", "ev1_hub", "hq_corridor"],
  ["d2_evening", "ev2_hub", "hq_corridor_night"],
  ["d2_evening", "d2e_erw", "hq_command_night"],
  ["d2_morning", "d2m_dusk", "hq_courtyard_dusk"],
  ["d3_evening", "ev3_hub", "hq_corridor"],
  ["d3_evening", "d3e_roof_view", "hq_rooftop"],
  ["d3_evening", "d3e_storage_view", "hq_storage"],
  ["d3_evening", "d3e_done", "hq_corridor_night"],
  ["exposure", null, "hq_command_night"],
  ["accept", "ac_start", "hq_command_night"],
  ["accept", "ac_levi", "masha_room"],
  ["accept", "ac_erwin", "hq_command_night"],
  ["accept", "ac_night", "masha_room"],
  ["end_lock", "el_escape_corridor", "hq_corridor_night"],
  ["end_lock", "el_stay", "cell_light"],
  ["ac_hook", null, "hq_courtyard"],
  ["ac_hook", "ah_spared", "hq_command"]
];
for (const [id, label, bg] of visualChecks) {
  const steps = scenes[id].steps;
  const start = label === null ? 0 : steps.findIndex(s => s.label === label);
  assert(start >= 0, `missing visual checkpoint ${id}:${label}`);
  const index = steps.findIndex((s, i) => i >= start && (s.say || s.narr || s.choice));
  assert(index >= 0);
  expectedBackgrounds.set(`${id}:${index}`, bg);
}
const checkedBackgrounds = new Set();
const endings = new Set();
for (let seed = 1; seed <= 400; seed++) {
  let rng = seed, turns = 0, ended = false;
  const random = n => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return Math.floor(rng / 4294967296 * n); };
  const tick = () => {
    assert(++turns < 2000, `loop, seed ${seed}`);
    const key = `${VN.game.scene}:${VN.game.step}`;
    if (expectedBackgrounds.has(key)) {
      assert.equal(VN.game.visual.bg, expectedBackgrounds.get(key), `background ${key}, seed ${seed}`);
      checkedBackgrounds.add(key);
    }
    return true;
  };
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
    endCard() { ended = true; }
  };
  VN.minigames = { abort() {}, play() { return { win: !!random(2), score: 1 }; } };
  // Chapter 2 is covered by story_test_ch2.mjs: here we only check that Chapter 1 hands over to it
  VN.parser.loadScene = async id => /^ch2_/.test(id) ? { steps: [{ end: true }] } : (assert(scenes[id], id), scenes[id]);
  await VN.parser.run(cfg.startScene);
  assert(ended, `no ending, seed ${seed}`);
  const v = VN.game.vars;
  for (const day of [1, 2, 3]) assert.equal(v[`ev${day}`], 2, `day ${day}, seed ${seed}`);
  if (VN.game.scene === "ch2_c1") {
    assert(v.proof >= 4);
    assert.notEqual(v.f_sam_spared, v.f_sam_arrested);
    endings.add(`${v.route}:${v.f_sam_spared ? "spared" : "arrested"}`);
  } else {
    assert.equal(VN.game.scene, "ch2_c0");
    endings.add(`lock:${v.f_escape}`);
  }
}
for (const route of ["levi", "erwin", "hange"])
  for (const fate of ["spared", "arrested"]) assert(endings.has(`${route}:${fate}`), `${route}:${fate} not reached`);
for (const escape of [true, false]) assert(endings.has(`lock:${escape}`));
console.log("✓ 400 seeded playthroughs: no dead choices/loops, all 8 ending combinations reached");

assert.equal(checkedBackgrounds.size, expectedBackgrounds.size, "not all visual checkpoints reached");
console.log(`✓ ${checkedBackgrounds.size} background checkpoints: locations, time of day and ending branches`);
