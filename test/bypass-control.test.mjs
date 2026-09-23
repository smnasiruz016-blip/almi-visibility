/**
 * 🔴 §7 · THE BYPASS CENSUS CAN REFUSE — SEEN, NOT ASSUMED.
 *
 * A zero bypass count is worth nothing on its own: a census that had stopped looking would report the same zero.
 * This plants ONE synthetic governed write outside the boundary, requires the census to NAME it, removes the
 * plant, and requires the count to return to what the clean tree measures.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { census, bypasses } from "../tools/governed-caller-census.mjs";
import { populationWithPlant, PLANTED_FILE, PLANTED_SOURCE } from "./helpers/plant-bypass.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("🔴 CONTROL: a planted governed write outside the boundary is NAMED by the bypass census", () => {
  const { clean, planted } = populationWithPlant();

  const before = bypasses(census({ sources: clean }));
  const during = bypasses(census({ sources: planted }));
  const after = bypasses(census({ sources: clean }));

  assert.equal(during.length, before.length + 1, "planting a bypass did not change the count — the census is not looking");
  const named = during.filter((r) => r.file === PLANTED_FILE);
  assert.equal(named.length, 1, `the census did not NAME the planted site; it named ${during.map((r) => r.file).join(", ")}`);
  assert.equal(named[0].cls, "GOVERNED_STATE_CHANGE");
  assert.equal(named[0].routed, false);

  // the plant is gone, and the count returns to exactly what the clean tree measures
  assert.equal(after.length, before.length, "the count did not return after the plant was removed");
  assert.deepEqual(after.map((r) => r.file).sort(), before.map((r) => r.file).sort());
});

test("🔴 the plant is a REAL bypass — it takes a write decision and then mutates without the boundary", () => {
  assert.match(PLANTED_SOURCE, /writePermission\(\{ target: LOCAL/, "the plant does not ask the write law, so it is not a governed decision at all");
  assert.match(PLANTED_SOURCE, /writeFileSync\(/, "the plant does not mutate durable state, so there is nothing to bypass");
  assert.ok(!/executeGovernedWrite\(/.test(PLANTED_SOURCE), "the plant reaches the boundary, so it is not a bypass");
});

test("🔴 the plant never touches the repository — it is a FIXED INPUT, not a file", () => {
  /* An earlier version of this control wrote into bin/ and ran `git add -N`. A control that must mutate the
   * repository to run is one bad exit away from leaving a synthetic governed writer behind. */
  const tracked = execFileSync("git", ["-C", REPO, "ls-files", "bin"], { encoding: "utf8" });
  assert.ok(!tracked.includes("zz-planted-bypass-control"), "the planted control exists as a tracked file");
  const status = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  assert.ok(!status.includes("zz-planted-bypass-control"), "the planted control touched the working tree");
});

test("🔴 the control is product-neutral — it cannot become the first offender against the rule it polices", () => {
  const forbidden = /profession|nursing|nurse|\boet\b|hcpc|ahpra|nmc|podiatr|pharmac|midwif/i;
  assert.ok(!forbidden.test(PLANTED_SOURCE), "the planted source names product subject matter");
  assert.ok(!forbidden.test(readFileSync(new URL("./helpers/plant-bypass.mjs", import.meta.url), "utf8")),
    "the control's own file names product subject matter");
  // and the pattern really does fire, so this is not a check that cannot fail
  assert.ok(forbidden.test("a nursing page"));
});
