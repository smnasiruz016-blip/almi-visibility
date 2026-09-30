/**
 * F75 · TASK TICKETS (acceptance _handoffs 01275a9, RR-103).
 *
 * Every expected result below is written by hand from its fixture. Fixture stores live in a temp git repo; the real stores are read, never
 * written; nothing is fetched, re-run, filed or sent; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { draftTickets, SATISFACTION } from "../src/report/tickets.mjs";
import { readClientTickets, actionableFindings } from "../src/report/tickets-reader.mjs";
import { CONTENT_SUPPLY_CHECK_IDS } from "../src/audit/content-checks.mjs";
import { registeredChecks } from "../src/audit/check.mjs";
import { clientPageIds } from "../src/audit/issue-priority-reader.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const chk = (id, over = {}) => ({ id, version: "1", boundary: "boundary" in over ? over.boundary : { observes: [`what ${id} observes`], fires: [{ id: `${id}-c`, when: `${id} condition` }] }, run: () => { throw new Error("a check was re-run"); } });
const f = (id, detector, page, evidence = ["o1"]) => ({ id, detector, detector_version: "1", target_page_id: page, evidence });
const CHECKS = [chk("tech-a"), chk("content-b"), chk("tech-nob", { boundary: undefined })];
const draft = (findings, pages = ["p1", "p2"]) => draftTickets({ findings, clientPages: new Set(pages), checks: CHECKS, contentSupplyIds: ["content-b"] });

/* a temp git repo holding tracked finding stores, so the reader's own path (tracked stores, lifecycle) is driven */
function repoWith(lines) {
  const dir = mkdtempSync(join(tmpdir(), "f75-"));
  mkdirSync(join(dir, "runs", "audit"), { recursive: true });
  writeFileSync(join(dir, "runs", "audit", "a.jsonl"), lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n");
  execFileSync("git", ["-C", dir, "init", "-q"]);
  execFileSync("git", ["-C", dir, "add", "runs/audit/a.jsonl"]);
  return dir;
}
const issue = (id, page, over = {}) => ({ record_type: "issue", issue_id: id, issue_class: "c", verdict: "FAIL", state: "OPEN", detector: "tech-a", detector_version: "1", target_page_id: page, evidence: ["o1"], ...over });
const move = (id, to, over = {}) => ({ record_type: "issue_state_change", issue_id: id, from: "OPEN", to, changed_at: "2026-09-20T00:00:00Z", reason: "r", evidence: ["o9"], action: "bin/x.mjs", actor: "a", superseded_by: null, ...over });

/* ================= C1 — one client's actionable findings only ================= */

test("C1 · only the client's ACTIONABLE findings are ticketed — another client's, UNKNOWN, closed and superseded never enter", () => {
  const dir = repoWith([
    issue("mine", "p1"),
    issue("unknown", "p1", { verdict: "UNKNOWN" }),
    issue("closed", "p1"), move("closed", "CLOSED"),
    issue("old", "p1"), issue("new", "p2", { supersedes: "old" }), move("old", "SUPERSEDED", { superseded_by: "new" }),
    issue("theirs", "p9"),
  ]);
  try {
    const r = readClientTickets({ tenantId: "t", resolve: null, root: dir, pages: new Set(["p1", "p2"]), checks: CHECKS });
    assert.deepEqual(r.tickets.flatMap((t) => t.findings).sort(), ["mine", "new"]);
    assert.equal(r.findingsTicketed, 2);
    assert.equal(r.notThisClient, 1, "another client's finding was not counted apart");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("C1 · FIRING CONTROL: an unreadable findings population drafts NO ticket — COULD-NOT-PROVE, named", () => {
  const dir = repoWith([issue("mine", "p1"), "{ not json"]);
  try {
    const r = readClientTickets({ tenantId: "t", resolve: null, root: dir, pages: new Set(["p1"]), checks: CHECKS });
    assert.equal(r.verdict, "COULD-NOT-PROVE");
    assert.match(r.why, /UNPARSEABLE_LINES/);
    assert.deepEqual(r.tickets, []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= C2 — developer or content ================= */

test("C2 · CONTENT for a declared content-supply check, DEVELOPER for any other registered check; an unregistered detector is NOT MEASURED, named", () => {
  const d = draft([f("a", "tech-a", "p1"), f("b", "content-b", "p1"), f("c", "gone", "p2")]);
  const kind = Object.fromEntries(d.tickets.map((t) => [t.check, t.kind]));
  assert.deepEqual(kind, { "tech-a": "DEVELOPER", "content-b": "CONTENT", gone: null });
  assert.match(d.tickets.find((t) => t.check === "gone").missing.find((m) => m.part === "KIND").fact, /no registered check is named "gone"/);
  assert.deepEqual(d.byKind, { DEVELOPER: 1, CONTENT: 1, "NOT MEASURED": 1 });
});

test("C2 · the declared content-supply list is exactly item 12's four checks, each registered — the orphan (item 26) is not content", () => {
  assert.deepEqual([...CONTENT_SUPPLY_CHECK_IDS].sort(), ["exact-duplicate", "near-duplicate", "template-dominance", "thin-content"]);
  const live = new Set(registeredChecks().map((c) => c.id));
  for (const id of CONTENT_SUPPLY_CHECK_IDS) assert.ok(live.has(id), `${id} is not registered`);
  assert.equal(CONTENT_SUPPLY_CHECK_IDS.includes("orphan-within-crawled-set"), false);
});

/* ================= C3 — evidence and affected population ================= */

test("C3 · every recorded evidence id is kept; affected pages are counted distinct with the findings behind them; a finding without evidence is named", () => {
  const d = draft([f("a", "tech-a", "p1", ["o1", "o2"]), f("b", "tech-a", "p1", ["o2", "o3"]), f("c", "tech-a", "p2", [])]);
  const t = d.tickets[0];
  assert.deepEqual(t.evidence, ["o1", "o2", "o3"]);
  assert.equal(t.affectedPages, 2);
  assert.deepEqual(t.pages, [{ page: "p1", findings: ["a", "b"] }, { page: "p2", findings: ["c"] }]);
  assert.deepEqual(t.withoutEvidence, ["c"], "a finding without evidence was not named");
  assert.equal(t.complete, false);
});

/* ================= C4 — acceptance checks from the held check ================= */

test("C4 · the acceptance check IS the raising check's declared boundary, and satisfaction is never claimed", () => {
  const d = draft([f("a", "tech-a", "p1")]);
  const a = d.tickets[0].acceptance;
  const held = CHECKS[0].boundary;
  assert.equal(a.observes, held.observes, "the acceptance check is not the held check's own declaration");
  assert.equal(a.fires, held.fires);
  assert.equal(a.satisfied, SATISFACTION);
  assert.match(a.satisfied, /^NOT CLAIMED/);
  assert.equal(d.tickets[0].complete, true);
});

test("C4 · FIRING CONTROL: a check with no declared boundary leaves the acceptance check NOT MEASURED, naming the missing fact", () => {
  const d = draft([f("a", "tech-nob", "p1")]);
  assert.equal(d.tickets[0].acceptance, null);
  assert.match(d.tickets[0].missing.find((m) => m.part === "ACCEPTANCE").fact, /tech-nob declares no boundary/);
  assert.equal(d.tickets[0].complete, false);
  assert.equal(d.incomplete, 1);
});

/* ================= REAL — every declared client ================= */

test("REAL · every ACTIVE declared client's tickets: each attributable finding ticketed exactly once, the unattributed named apart — matched by an independent count", () => {
  const resolve = createTenantResolver();
  const decl = readDeclarations();
  assert.equal(decl.readable, true, decl.detail);
  const tenants = decl.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId);
  const { findings } = actionableFindings();
  assert.ok(tenants.length > 0 && findings.length > 0, "an empty population proves nothing");
  const seen = new Map();
  let tickets = 0; const kinds = { DEVELOPER: 0, CONTENT: 0 };
  for (const t of tenants) {
    const r = readClientTickets({ tenantId: t, resolve });
    assert.equal(r.verdict, null, r.why);
    for (const k of r.tickets) {
      assert.equal(k.complete, true, `a real ticket is incomplete: ${k.missing.map((m) => m.fact).join("; ")}`);
      assert.ok(k.kind, "a real ticket has no kind");
      kinds[k.kind] += 1; tickets += 1;
      for (const id of k.findings) { assert.equal(seen.has(id), false, `${id} ticketed for two clients`); seen.set(id, t); }
    }
  }
  /* independent: attribution recomputed straight from each client's partition, without the ticket code */
  const pagesOf = new Map(tenants.map((t) => [t, clientPageIds({ tenantId: t, resolve })]));
  const owned = findings.filter((x) => [...pagesOf.values()].some((s) => s.has(x.target_page_id)));
  assert.equal(seen.size, owned.length, "ticketed and independently attributed findings disagree");
  const unattributed = findings.length - owned.length;
  console.log(`  REAL (count-only): declared clients ${tenants.length} · actionable ${findings.length} · ticketed ${seen.size} · unattributed ${unattributed} · tickets ${tickets} (DEVELOPER ${kinds.DEVELOPER}, CONTENT ${kinds.CONTENT})`);
  assert.ok(kinds.DEVELOPER > 0 && kinds.CONTENT > 0, "one kind never occurs on real data — the kind rule is not exercised");
});

/* ================= C5 — drafts only, bounded, count-only ================= */

test("C5 · the drafter imports nothing; the reader imports nothing that can fetch, write, file or send; a ticket holds page ids, never URLs", () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const drafter = strip(readFileSync(join(REPO, "src/report/tickets.mjs"), "utf8"));
  assert.doesNotMatch(drafter, /^import /m, "the drafter imports a module");
  const reader = strip(readFileSync(join(REPO, "src/report/tickets-reader.mjs"), "utf8"));
  assert.match(reader, /^import /m, "control: the reader's imports are where this test looks");
  assert.doesNotMatch(reader, /writeFile|appendFile|mkdir|rmSync|createWriteStream|fetch\(|node:https?|node:net|connector|\.run\(/);
  const d = draft([f("a", "tech-a", "p1")]);
  assert.doesNotMatch(JSON.stringify(d), /:\/\//, "a ticket carries a URL");
});

test("C5 · THE ENTRY POINT: it prints its bound, its tickets by kind and the not-this-client count, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/task-tickets.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ store\(s\) holding findings · \d+ actionable finding\(s\) · \d+ page\(s\) in this client's own partition · \d+ ticketed · nothing fetched, re-run, written, filed or sent/);
    assert.match(ok.stdout, /tickets\s+\d+ · by kind DEVELOPER \d+ · CONTENT \d+ · NOT MEASURED \d+ · incomplete \d+/);
    assert.match(ok.stdout, /not this client\s+\d+ actionable finding\(s\)/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
