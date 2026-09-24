/**
 * §15 · THE COUNTING CONTROL. A suite count is only evidence if the counter can be shown to notice a failure and
 * NAME it. Plant exactly one failing test, measure, remove it, prove the tree is byte-clean.
 */
import { writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PROBE = join(REPO, "test", "zz-counting-control.test.mjs");
/* `--name=` plants a failure under the name a command requires (24 Sep 2026: "AUDIT STORE PRIMITIVES COUNTING CONTROL"). */
const NAME = (process.argv.find((a) => a.startsWith("--name=")) ?? "").slice(7) || "ZZ_COUNTING_CONTROL_PLANTED_FAILURE";

const cleanup = () => { if (existsSync(PROBE)) rmSync(PROBE, { force: true }); };
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("uncaughtException", (e) => { cleanup(); console.error(e); process.exit(1); });

const run = () => {
  let out = "";
  const files = readdirSync(join(REPO, "test")).filter((f) => f.endsWith(".test.mjs")).map((f) => `test/${f}`);
  try { out = execFileSync(process.execPath, ["--test", ...files], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 }); }
  catch (err) { out = `${err.stdout ?? ""}${err.stderr ?? ""}`; }
  const n = (k) => Number((out.match(new RegExp(`^ℹ ${k} (\\d+)$`, "m")) ?? [0, 0])[1]);
  return { tests: n("tests"), pass: n("pass"), fail: n("fail"), skipped: n("skipped"), out };
};

const before = run();
console.log(`BEFORE  tests ${before.tests} · pass ${before.pass} · fail ${before.fail} · skipped ${before.skipped}`);

writeFileSync(PROBE, [
  "/** CONTROL ONLY — never committed. It exists to prove the counter can see a failure and name it. */",
  'import { test } from "node:test";',
  'import assert from "node:assert/strict";',
  `test(${JSON.stringify(NAME)}, () => { assert.equal(1, 2, "planted"); });`,
  "",
].join("\n"), "utf8");

const during = run();
console.log(`PLANTED tests ${during.tests} · pass ${during.pass} · fail ${during.fail} · skipped ${during.skipped}`);
console.log(`  counter DETECTED the failure: ${during.fail === before.fail + 1}`);
console.log(`  counter NAMED it:             ${during.out.includes(NAME)}`);
console.log(`  total rose by exactly one:    ${during.tests === before.tests + 1}`);

cleanup();
const after = run();
console.log(`AFTER   tests ${after.tests} · pass ${after.pass} · fail ${after.fail} · skipped ${after.skipped}`);

const status = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
console.log(`  probe removed:                ${!existsSync(PROBE)}`);
console.log(`  probe absent from git status: ${!status.includes("zz-counting-control")}`);
console.log(`  counts returned to baseline:  ${after.tests === before.tests && after.fail === before.fail}`);

const proved = during.fail === before.fail + 1 && during.out.includes(NAME) && after.tests === before.tests && after.fail === 0;
console.log(`\nCOUNTING CONTROL: ${proved ? "PROVED" : "🔴 NOT PROVED"}`);
process.exit(proved ? 0 : 1);
