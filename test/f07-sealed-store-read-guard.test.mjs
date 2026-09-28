/**
 * 🔴 F07 AMENDMENT 4 · THE OPERATOR-TOOLING GUARD (tools/sealed-store-read-guard.mjs) — a direct read of a governed sealed store
 * is refused by location, by environment-reference dereference, and by the resolver called outside reviewed engine code; a
 * governed reader and an unrelated call are allowed; no refusal names a location.
 *
 * Every store here is SYNTHETIC: a temporary directory, located through the declared descriptor mechanism. The production entry
 * is driven as a child process whose environment points the REAL declared reference at the synthetic directory, so the real
 * store is never located, listed or read.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { judgeToolUse, protectedStores, refusalMessage, ENGINE_ROOT, GUARD_ENTRY, REFUSED_EXIT } from "../tools/sealed-store-read-guard.mjs";
import { SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";

const DIR = mkdtempSync(join(tmpdir(), "guard-synthetic-store-"));
mkdirSync(join(DIR, "set"));
writeFileSync(join(DIR, "set", "items.txt"), "synthetic stand-in\n");
after(() => rmSync(DIR, { recursive: true, force: true }));

const ENV = "GUARD_SYNTHETIC_STORE_DIR";
const DECLARED = { "guard-synthetic-store": { mechanism: "ENV_REFERENCE", name: ENV } };
const stores = protectedStores({ declared: DECLARED, env: { [ENV]: DIR } });
const judge = (toolName, toolInput) => judgeToolUse({ toolName, toolInput, stores });
const $ = (s) => `$${s}`;

test("the synthetic store is LOCATED through the declared descriptor mechanism (the population is not empty)", () => {
  assert.equal(stores.length, 1);
  assert.equal(stores[0].dir, DIR);
  assert.equal(protectedStores({ declared: DECLARED, env: {} })[0].dir, null, "CONTROL: an unset reference locates nothing");
});

test("LOCATION · a planted read naming the store directory is refused, in every slash style and case", () => {
  const fwd = DIR.replace(/\\/g, "/");
  const gitBash = fwd.replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
  for (const [tool, input] of [
    ["Bash", { command: `cat "${join(DIR, "set", "items.txt")}"` }],
    ["Bash", { command: `ls ${fwd}` }],
    ["Bash", { command: `ls ${gitBash}/set` }],
    ["PowerShell", { command: `Get-ChildItem '${DIR.toUpperCase()}'` }],
    ["Read", { file_path: join(DIR, "set", "items.txt") }],
    ["Grep", { pattern: "x", path: DIR }],
    ["Glob", { pattern: "**/*", path: DIR }],
  ]) {
    const j = judge(tool, input);
    assert.deepEqual([j.allowed, j.rule], [false, "LOCATION"], `${tool} was allowed`);
  }
});

test("ENV_REFERENCE_DEREFERENCE · a planted read through the environment reference is refused, in every shell's syntax", () => {
  for (const command of [`ls "${$(ENV)}"`, `cat ${$("{" + ENV + "}")}/set/items.txt`, `dir %${ENV}%`, `Get-ChildItem ${$("env:" + ENV)}`,
    `node -e "console.log(require('fs').readdirSync(process.env.${ENV}))"`, `node -e "process.env['${ENV}']"`, `python -c "import os; os.environ['${ENV}']"`]) {
    const j = judge("Bash", { command });
    assert.deepEqual([j.allowed, j.rule], [false, "ENV_REFERENCE_DEREFERENCE"], `allowed: ${command.slice(0, 40)}`);
  }
  assert.equal(judge("Bash", { command: `echo the reference is named ${ENV}` }).allowed, true, "CONTROL: naming the reference without dereferencing it is allowed");
});

test("RESOLVER_OUTSIDE_ENGINE · the sealed-store resolver reached from a command or a scratch script is refused; reviewed engine code is not", () => {
  const cmd = judge("Bash", { command: `node -e "import('./src/governance/sealed-store-roots.mjs').then(m => m.resolveSealedStoreRoots())"` });
  assert.deepEqual([cmd.allowed, cmd.rule], [false, "RESOLVER_OUTSIDE_ENGINE"]);
  const scratch = judge("Write", { file_path: join(tmpdir(), "seal-check.mjs"), content: "import { storeFiles } from 'x'; storeFiles(dir);" });
  assert.deepEqual([scratch.allowed, scratch.rule], [false, "RESOLVER_OUTSIDE_ENGINE"]);
  assert.equal(judge("Edit", { file_path: join(ENGINE_ROOT, "src", "governance", "x.mjs"), new_string: "resolveSealedStoreRoots()" }).allowed, true, "CONTROL: reviewed engine code may name the resolver");
  assert.equal(judge("Read", { file_path: join(ENGINE_ROOT, "src", "governance", "sealed-store-roots.mjs") }).allowed, true, "CONTROL: reading the resolver's source is not reading the store");
});

test("a governed reader and unrelated calls are ALLOWED", () => {
  for (const [tool, input] of [["Bash", { command: "node bin/f10-label.mjs c6" }], ["Bash", { command: "git status --short" }], ["Read", { file_path: join(ENGINE_ROOT, "README.md") }], ["Bash", { command: "npm test" }]]) {
    assert.equal(judge(tool, input).allowed, true, `${tool} ${JSON.stringify(input)} was refused`);
  }
});

test("a refusal names the rule and the store name, never the location", () => {
  const msg = refusalMessage(judge("Read", { file_path: join(DIR, "set", "items.txt") }));
  assert.match(msg, /SEALED_STORE_DIRECT_READ_REFUSED \(LOCATION, store guard-synthetic-store\)/);
  for (const form of [DIR, DIR.replace(/\\/g, "/"), DIR.toLowerCase()]) assert.equal(msg.toLowerCase().includes(form.toLowerCase()), false, "the refusal leaks the location");
});

test("THE PRODUCTION ENTRY · as a hook it exits 2 on a planted read and 0 on a governed reader, with the REAL declared reference aimed at the synthetic store", () => {
  const [realName, realRef] = Object.entries(SEALED_STORE_ROOTS)[0];
  assert.ok(realRef?.name, "the real declaration names an environment reference");
  const env = { ...process.env, [realRef.name]: DIR };
  const run = (tool_name, tool_input) => spawnSync(process.execPath, [join(ENGINE_ROOT, GUARD_ENTRY)], { input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name, tool_input }), env, encoding: "utf8", timeout: 60000 });
  const refused = run("Bash", { command: `cat "${join(DIR, "set", "items.txt")}"` });
  assert.equal(refused.status, REFUSED_EXIT, "the planted read was not refused");
  assert.match(refused.stderr, new RegExp(`LOCATION, store ${realName}`));
  assert.equal(refused.stderr.toLowerCase().includes(DIR.toLowerCase()) || refused.stderr.toLowerCase().includes(DIR.replace(/\\/g, "/").toLowerCase()), false, "the hook leaks the location");
  assert.equal(run("Bash", { command: `ls "${$(realRef.name)}"` }).status, REFUSED_EXIT, "a dereference was not refused");
  assert.equal(run("Bash", { command: "node bin/f10-label.mjs c6" }).status, 0, "CONTROL: a governed reader is allowed");
});
