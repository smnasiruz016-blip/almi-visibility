import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { registerCheck, registeredChecks, fail, unknown, UNKNOWN_REASONS } from "../src/audit/check.mjs";
import { parseGroups, selectGroup, decide, assessUrl, ruleMatches } from "../src/audit/robots-scope.mjs";
import { assessFamilies, FAMILY_STATES, DEFAULT_RESOLVERS } from "../src/audit/dns-family.mjs";
import { ROBOTS_SCOPE, DNS_FAMILY } from "../src/audit/checks.mjs";
import { sealedCorpusCensus, renderCensus, AUDIT_DIR, SEALED_DIR } from "../tools/sealed-corpus-census.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const tmp = () => mkdtempSync(join(tmpdir(), "almivis-audit-"));

/**
 * 🔴 LAW-FIXTURE-1 — WHAT THESE FIXTURES ARE NOT.
 *
 * These robots.txt fixtures are hand-written and shorter than the real files
 * (four groups, ~800 bytes, with Crawl-delay, Host and Sitemap lines this file
 * omits). They therefore do NOT test tolerance of unusual whitespace, BOMs,
 * comments mid-group, or a file served as the wrong content-type.
 *
 * The tests at the foot run the same assertions against the REAL stored
 * robots.txt observations, for exactly that reason.
 */

/* 🔴 THE FIRING FIXTURE — a Googlebot group that REPEATS the Disallow. */
const BLOCKS_GOOGLEBOT = `User-Agent: Googlebot
User-Agent: Bingbot
Allow: /
Disallow: /exam/*/from/

User-Agent: *
Allow: /
Disallow: /exam/*/from/
Crawl-delay: 10
`;

/* 🔴 THE CLEAN CONTROL — the SAME Disallow in `*`, but Googlebot is permitted.
 * This must NOT fire. It is the whole difference between "a real product
 * defect" and "our own inventory is incomplete". */
const BLOCKS_US_ONLY = `User-Agent: Googlebot
Allow: /

User-Agent: *
Allow: /
Disallow: /exam/*/from/
Crawl-delay: 10
`;

const URL_UNDER_TEST = "https://x.example.com/exam/celi-3-b2/from/cuba";

/* ================================================================== *
 * 1C — 🔴 THE CONTROL REQUIREMENT IS ENFORCED BY THE HARNESS.
 * ================================================================== */

test("🔴 a check registered with NO clean control is REFUSED by the harness", () => {
  assert.throws(
    () => registerCheck({ id: "no-control", run: () => null, firingFixture: "f" }),
    /must NAME a clean control that must NOT make it fire/,
  );
});

test("🔴 a check registered with NO firing fixture is REFUSED", () => {
  assert.throws(
    () => registerCheck({ id: "no-firing", run: () => null, cleanControl: "c" }),
    /must NAME a fixture that violates it and makes it fire/,
  );
});

test("🔴 EVERY registered check names both a firing fixture and a clean control", () => {
  const checks = registeredChecks();
  assert.ok(checks.length >= 2, `only ${checks.length} checks registered — this law would be weak`);
  for (const c of checks) {
    assert.ok(c.firingFixture?.length > 5, `${c.id} has no firing fixture`);
    assert.ok(c.cleanControl?.length > 5, `${c.id} has no clean control`);
  }
});

/* ================================================================== *
 * 1B — 🔴 CANNOT-RUN IS UNKNOWN, NEVER null AND NEVER PASS.
 * ================================================================== */

test("🔴 a check with no robots evidence returns UNKNOWN naming the missing input — not null", async () => {
  const r = await ROBOTS_SCOPE.run({
    page: { canonical_url: URL_UNDER_TEST },
    observations: [{ observation_id: "o1" }],
    siteContext: { openedAt: "t", robotsObservation: null },
  });
  assert.ok(r, "a check that cannot run must not return null — null means 'nothing is wrong'");
  assert.equal(r.verdict, "UNKNOWN");
  assert.equal(r.reason_code, "MISSING_INPUT");
});

test("🔴 an UNKNOWN reason code must be declared, never free-texted", () => {
  assert.throws(
    () => unknown({ issueClass: "x", canonicalUrl: "https://e.example.com/", reasonCode: "BECAUSE_REASONS", evidence: ["o"], detector: "d", detectorVersion: "1", openedAt: "t" }),
    /add it to UNKNOWN_REASONS deliberately/,
  );
  assert.ok("NEEDS_RENDERED_HTML" in UNKNOWN_REASONS, "the rendered-HTML reason must exist — renderMode is RAW_HTML in v0.1");
});

test("🔴 a finding cannot be built with no evidence — C1 still holds for checks", () => {
  assert.throws(
    () => fail({ issueClass: "x", canonicalUrl: "https://e.example.com/", severity: "high", evidence: [], detector: "d", detectorVersion: "1", openedAt: "t" }),
    /at least one observation_id/,
  );
});

/* ================================================================== *
 * CHECK 1 — ROBOTS SCOPE. FIRING FIXTURE **AND** CLEAN CONTROL.
 * ================================================================== */

test("🔴 FIRING: a Googlebot group repeating the Disallow blocks Googlebot", () => {
  const a = assessUrl({ body: BLOCKS_GOOGLEBOT, url: URL_UNDER_TEST });
  assert.equal(a.verdict, "BLOCKED_FOR_GOOGLEBOT");
  assert.equal(a.googlebot.group, "SPECIFIC");
  assert.equal(a.us.group, "WILDCARD");
  assert.equal(a.googlebot.allowed, false);
});

test("🔴 CLEAN CONTROL: the same Disallow in `*` alone does NOT fire — Googlebot is permitted", async () => {
  const a = assessUrl({ body: BLOCKS_US_ONLY, url: URL_UNDER_TEST });
  assert.equal(a.verdict, "BLOCKED_FOR_US_ONLY", "a block that applies only to our crawler is NOT a product defect");
  assert.equal(a.googlebot.allowed, true);
  assert.equal(a.us.allowed, false);

  const finding = await ROBOTS_SCOPE.run({
    page: { canonical_url: URL_UNDER_TEST },
    observations: [{ observation_id: "o1" }],
    siteContext: { openedAt: "t", robotsObservation: { observation_id: "r1", value: { body: BLOCKS_US_ONLY } } },
  });
  assert.equal(finding, null, "🔴 FALSE POSITIVE: the check fired on a clean control");
});

test("the firing fixture DOES produce a finding, with both evidence ids in its chain", async () => {
  const finding = await ROBOTS_SCOPE.run({
    page: { canonical_url: URL_UNDER_TEST },
    observations: [{ observation_id: "o1" }],
    siteContext: { openedAt: "t", robotsObservation: { observation_id: "r1", value: { body: BLOCKS_GOOGLEBOT } }, impressions: 4 },
  });
  assert.equal(finding.verdict, "FAIL");
  assert.equal(finding.severity, "critical", "a blocked URL WITH impressions is critical");
  assert.deepEqual([...finding.evidence].sort(), ["o1", "r1"]);
});

test("🔴 a specific group is NOT combined with the wildcard group", () => {
  // Google: "User agent specific groups and global groups (*) are not combined."
  const g = selectGroup(parseGroups(BLOCKS_US_ONLY), "Googlebot");
  assert.equal(g.matchedBy, "SPECIFIC");
  assert.ok(!g.rules.some((r) => r.type === "disallow"), "the wildcard's Disallow leaked into the specific group");
});

test("longest path wins, and Allow beats Disallow on an equal-length tie", () => {
  const groups = parseGroups("User-agent: *\nDisallow: /a\nAllow: /a/b\n");
  const g = selectGroup(groups, "AnyBot");
  assert.equal(decide(g, "https://e.example.com/a/x").allowed, false);
  assert.equal(decide(g, "https://e.example.com/a/b").allowed, true);

  const tie = selectGroup(parseGroups("User-agent: *\nDisallow: /p\nAllow: /p\n"), "AnyBot");
  assert.equal(decide(tie, "https://e.example.com/p").allowed, true, "on a tie the LEAST restrictive rule wins");
});

test("wildcards and $ anchors match as the guidance describes", () => {
  assert.equal(ruleMatches("/exam/*/from/", "/exam/celi/from/cuba"), true);
  assert.equal(ruleMatches("/exam/*/from/", "/exam/celi/to/cuba"), false);
  assert.equal(ruleMatches("/p$", "/p"), true);
});

test("a host with no group at all is not treated as blocked", () => {
  const g = selectGroup(parseGroups("Sitemap: https://e.example.com/s.xml\n"), "AnyBot");
  assert.equal(g.matchedBy, "NO_GROUP");
  assert.equal(decide(g, "https://e.example.com/x").allowed, true);
});

/* ================================================================== *
 * CHECK 2 — DNS FAMILIES. FIRING **AND** CLEAN CONTROL.
 * ================================================================== */

test("🔴 FIRING: AAAA_ONLY raises a finding", () => {
  const v = assessFamilies({ hostname: "ghost.example.com", state: "AAAA_ONLY", hasA: false, hasAAAA: true, resolvers: DEFAULT_RESOLVERS });
  assert.equal(v.raise, true);
  assert.equal(v.verdict, "FAIL");
  assert.match(v.summary, /does NOT establish whether Googlebot reaches the host/, "the check must not overclaim");
});

test("🔴 CLEAN CONTROL: A_AND_AAAA and A_ONLY must NOT fire", () => {
  for (const state of ["A_AND_AAAA", "A_ONLY"]) {
    const v = assessFamilies({ hostname: "ok.example.com", state, hasA: true, hasAAAA: state === "A_AND_AAAA" });
    assert.equal(v.raise, false, `🔴 FALSE POSITIVE: the check fired on ${state}`);
  }
});

test("🔴 LAW-ABSENT-1: a resolver failure is UNKNOWN naming the resolver, never a finding about the host", () => {
  const v = assessFamilies({ hostname: "x.example.com", state: "UNKNOWN", hasA: null, hasAAAA: null, error: "ECONNREFUSED", resolvers: ["127.0.0.1"] });
  assert.equal(v.verdict, "UNKNOWN");
  assert.equal(v.reasonCode, "TOOL_FAILED");
  assert.match(v.summary, /127\.0\.0\.1/, "the reason must name the resolver");
  assert.match(v.summary, /fact about our resolver, not about the host/);
});

test("NEITHER is not the same as AAAA_ONLY, and does not fire", () => {
  assert.equal(assessFamilies({ hostname: "n.example.com", state: "NEITHER", hasA: false, hasAAAA: false }).raise, false);
  assert.deepEqual([...FAMILY_STATES], ["A_AND_AAAA", "A_ONLY", "AAAA_ONLY", "NEITHER", "UNKNOWN"]);
});

/* ================================================================== *
 * PART 0 — 🔴 THE SEALED CORPUS CENSUS.
 * ================================================================== */

test("🔴 SEALED: no module under src/audit/ references the case study corpus", () => {
  const c = sealedCorpusCensus(REPO);
  assert.ok(c.filesScanned > 0, "no audit files scanned — the census would be vacuous");
  assert.deepEqual(c.breaches, [], renderCensus(c));
});

test("🔴 SEALED: the census can actually CATCH a breach — proved against a fixture", () => {
  // A census only ever run against a clean tree is indistinguishable from one
  // that returns 0 unconditionally.
  const dir = tmp();
  try {
    mkdirSync(join(dir, AUDIT_DIR), { recursive: true });
    writeFileSync(join(dir, AUDIT_DIR, "peeker.mjs"), `import x from "../../${SEALED_DIR}/corpus/MANIFEST.md";\n`);
    const c = sealedCorpusCensus(dir);
    assert.equal(c.breaches.length, 1, "the census failed to see a module reading the sealed corpus");
    assert.match(renderCensus(c), /A DETECTOR HAS SEEN THE ANSWER SHEET/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * AGAINST THE REAL STORED EVIDENCE — LAW-FIXTURE-1 says the hand-written
 * fixtures above must not be the only witness.
 * ================================================================== */

const ROBOTS_FILE = `${REPO}runs/evidence/robots.jsonl`;

/** The four hosts whose crawl produced robots-blocked URLs. */
const CORRIDOR_HOSTS = [
  "almiitalian.almiworld.com", "almidutch.almiworld.com",
  "almiportuguese.almiworld.com", "almiicelandic.almiworld.com",
];

test("🔴 REAL: all four CORRIDOR robots.txt files put Googlebot in a SPECIFIC group that repeats the Disallow", { skip: !existsSync(ROBOTS_FILE) }, () => {
  const all = createJsonlStore(ROBOTS_FILE).readAll().filter((r) => r.record_type === "observation");
  const records = all.filter((r) => CORRIDOR_HOSTS.includes(r.value.host));
  assert.equal(records.length, 4, `expected the 4 corridor robots.txt files, found ${records.length}`);
  for (const r of records) {
    assert.equal(r.value.httpStatus, 200, `${r.value.host}: robots.txt did not return 200`);
    const g = selectGroup(parseGroups(r.value.body), "Googlebot");
    assert.equal(g.matchedBy, "SPECIFIC", `${r.value.host}: Googlebot is not in a specific group`);
    assert.ok(g.rules.some((x) => x.type === "disallow"), `${r.value.host}: the Googlebot group carries no Disallow`);
  }

  /* 🔴 almioet is stored too and is DIFFERENT: a bare `User-agent: *` with
   * `Allow: /` and NO Googlebot group at all. Asserted so the contrast is
   * visible — the corridor pattern is not universal across the estate. */
  const oet = all.find((r) => r.value.host === "almioet.almiworld.com");
  if (oet) {
    const g = selectGroup(parseGroups(oet.value.body), "Googlebot");
    assert.equal(g.matchedBy, "WILDCARD", "almioet has no Googlebot-specific group");
    assert.equal(g.rules.filter((x) => x.type === "disallow").length, 0, "almioet disallows nothing");
  }
});

test("🔴 REAL: every one of the 106 blocked URLs is blocked for GOOGLEBOT too", { skip: !existsSync(ROBOTS_FILE) }, () => {
  const robots = new Map();
  for (const r of createJsonlStore(ROBOTS_FILE).readAll()) {
    if (r.record_type === "observation") robots.set(r.value.host, r.value.body);
  }
  const blocked = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl"))
    .readAll()
    .filter((r) => r.record_type === "observation" && r.value?.skipped)
    .map((r) => r.value.requested_url);

  assert.equal(blocked.length, 106);
  const verdicts = blocked.map((url) => assessUrl({ body: robots.get(new URL(url).hostname), url }).verdict);
  const forGoogle = verdicts.filter((v) => v === "BLOCKED_FOR_GOOGLEBOT").length;
  assert.equal(forGoogle, 106, "the answer is 106 of 106 — if this changes, the robots.txt files changed");
});
