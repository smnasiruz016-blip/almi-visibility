/**
 * F55 · AI CRAWLER ACCESS AUDIT (acceptance _handoffs 7323446, RR-93).
 *
 * Every expected verdict below is written by hand from its fixture. The C5 plant runs on a CONFINED COPY of the shared robots store in
 * a temp dir, never the production store. Nothing is fetched; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, copyFileSync, appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { robotsPolicy, pageDirectives, declaredAiCrawlers, auditAiCrawlerAccess, summarise, POLICY } from "../src/audit/ai-crawler-access.mjs";
import { readClientAiCrawlerAccess } from "../src/audit/ai-crawler-access-reader.mjs";
import { ROBOTS_STORE } from "../src/audit/indexability-reader.mjs";
import { declaredOrigins } from "../src/evidence/evidence-cache-real.mjs";
import { BLOCKED_CRAWLERS } from "../config/blocked-crawlers.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { declaredWorld, FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const robots = (body, httpStatus = 200, extra = {}) => ({ observation_id: "r1", observed_at: "2026-09-12T00:00:00Z", value: { url: "https://a.example/robots.txt", httpStatus, body, ...extra } });
const at = (rec, token, url) => robotsPolicy(rec, token).decide(url);

/* ================= C1 — policy per crawler and page, by RFC 9309 ================= */

test("C1 · RFC 9309's own cases: specific group over the wildcard, longest match, an allow-wins tie, 4xx, 5xx, a failed fetch, none", () => {
  const body = "User-agent: *\nDisallow: /private\n\nUser-agent: GPTBot\nDisallow: /\nAllow: /public\n\nUser-agent: CCBot\nDisallow: /a\nAllow: /a\n";
  const rec = robots(body);
  assert.deepEqual([at(rec, "GPTBot", "https://a.example/public/x").state, at(rec, "GPTBot", "https://a.example/public/x").group], [POLICY.ALLOWED, "SPECIFIC"], "the longest rule did not win inside the specific group");
  assert.equal(at(rec, "GPTBot", "https://a.example/other").state, POLICY.DISALLOWED, "the specific group was not applied");
  assert.deepEqual([at(rec, "ClaudeBot", "https://a.example/private/y").state, at(rec, "ClaudeBot", "https://a.example/private/y").group], [POLICY.DISALLOWED, "WILDCARD"]);
  assert.equal(at(rec, "ClaudeBot", "https://a.example/open").state, POLICY.ALLOWED);
  assert.equal(at(rec, "CCBot", "https://a.example/a").state, POLICY.ALLOWED, "an equal-length tie went to disallow");
  assert.equal(at(robots(null, 404), "GPTBot", "https://a.example/x").state, POLICY.ALLOWED, "an unavailable (4xx) robots.txt did not read ALLOWED");
  assert.equal(at(robots(null, 503), "GPTBot", "https://a.example/x").state, POLICY.DISALLOWED, "an unreachable (5xx) robots.txt did not read DISALLOWED");
  assert.equal(at(robots(null, 200, { fetchError: "timeout" }), "GPTBot", "https://a.example/x").state, POLICY.DISALLOWED, "a failed fetch did not read DISALLOWED");
  assert.equal(at(null, "GPTBot", "https://a.example/x").state, POLICY.NOT_MEASURED, "no recorded robots.txt read ALLOWED or DISALLOWED");
  assert.equal(at(robots(null, 301), "GPTBot", "https://a.example/x").state, POLICY.NOT_MEASURED);
});

/* ================= C2 — policy is not retrieval ================= */

test("C2 · FIRING CONTROL: a policy of ALLOWED still reports retrieval NOT_MEASURED; only a recorded retrieval by that crawler, dated, is OBSERVED", () => {
  const crawlers = [{ token: "GPTBot", category: "AI_TRAINING" }, { token: "ClaudeBot", category: "AI_TRAINING" }];
  const pages = [{ pageId: "p1", url: "https://a.example/x", html: "" }];
  const none = auditAiCrawlerAccess({ crawlers, robotsFor: () => robots("User-agent: *\nAllow: /\n"), pages, retrievals: [] });
  for (const r of none.rows) assert.deepEqual([r.policy.state, r.retrieval.state], [POLICY.ALLOWED, "NOT_MEASURED"], "retrieval was inferred from policy");
  assert.deepEqual(summarise(none).retrieval, { NOT_MEASURED: 2 }, "retrieval was reported as a number other than NOT MEASURED");
  const seen = auditAiCrawlerAccess({ crawlers, robotsFor: () => robots("User-agent: *\nAllow: /\n"), pages, retrievals: [{ token: "GPTBot", pageId: "p1", at: "2026-09-20T10:00:00Z", ref: "log-1" }, { token: "GPTBot", pageId: "p1", at: "2026-09-21T10:00:00Z", ref: "log-2" }] });
  assert.deepEqual(seen.rows.map((r) => [r.token, r.retrieval.state, r.retrieval.at ?? null]), [["GPTBot", "OBSERVED", "2026-09-21T10:00:00Z"], ["ClaudeBot", "NOT_MEASURED", null]], "a retrieval was credited to another crawler, or undated");
  /* a retrieval with no ref is not a recorded retrieval */
  assert.equal(auditAiCrawlerAccess({ crawlers, robotsFor: () => null, pages, retrievals: [{ token: "GPTBot", pageId: "p1", at: "2026-09-20T10:00:00Z" }] }).rows[0].retrieval.state, "NOT_MEASURED");
  assert.throws(() => auditAiCrawlerAccess({ crawlers, robotsFor: () => null, pages }), /passed explicitly/);
});

/* ================= C3 — page directives beside, not merged ================= */

test("C3 · a recorded meta robots directive to all robots or to this crawler is reported beside the policy and never changes it", () => {
  const html = '<head><meta name="robots" content="noindex, nofollow"><meta name="GPTBot" content="none"><meta name="OtherBot" content="noindex"></head>';
  assert.deepEqual(pageDirectives(html, "GPTBot"), { meta: [{ addressedTo: "ALL_ROBOTS", content: ["noindex", "nofollow"] }, { addressedTo: "THIS_CRAWLER", content: ["none"] }], header: "NOT_RECORDED" });
  assert.deepEqual(pageDirectives(html, "ClaudeBot").meta.map((d) => d.addressedTo), ["ALL_ROBOTS"], "a directive for another crawler was attributed to this one");
  const crawlers = [{ token: "GPTBot", category: "AI_TRAINING" }];
  const rb = () => robots("User-agent: *\nAllow: /\n");
  const withD = auditAiCrawlerAccess({ crawlers, robotsFor: rb, pages: [{ pageId: "p", url: "https://a.example/x", html }], retrievals: [] }).rows[0];
  const withoutD = auditAiCrawlerAccess({ crawlers, robotsFor: rb, pages: [{ pageId: "p", url: "https://a.example/x", html: "" }], retrievals: [] }).rows[0];
  assert.deepEqual(withD.policy, withoutD.policy, "a page directive changed the reach verdict");
  assert.equal(withD.directives.meta.length, 2);
});

/* ================= C4 — declared crawlers only ================= */

test("C4 · only the declared AI crawlers are audited, each by its declared token; an empty declaration is COULD-NOT-PROVE", () => {
  const declared = declaredAiCrawlers(BLOCKED_CRAWLERS);
  const expected = BLOCKED_CRAWLERS.filter((c) => ["AI_TRAINING", "AI_SEARCH", "AI_USER_FETCH"].includes(c.category) && c.tier === "OFFICIAL").map((c) => c.agent);
  assert.deepEqual(declared.map((c) => c.token), expected);
  assert.ok(declared.length > 0);
  assert.ok(!declared.some((c) => BLOCKED_CRAWLERS.find((b) => b.agent === c.token).category === "SEO_BACKLINK"), "a non-AI crawler was audited");
  assert.ok(!declared.some((c) => c.token === "anthropic-ai"), "an undocumented (UNKNOWN) agent was audited");
  const empty = auditAiCrawlerAccess({ crawlers: declaredAiCrawlers([]), robotsFor: () => null, pages: [{ pageId: "p", url: "https://a.example/x", html: "" }], retrievals: [] });
  assert.deepEqual([empty.verdict, empty.rows.length], ["COULD_NOT_PROVE", 0], "an empty declaration passed");
});

/* ================= REAL ================= */

const clientOf = (resolve) => resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;

test("REAL · every declared crawler x every inventory page has exactly one policy, from the client's own recorded robots.txt; retrieval NOT MEASURED throughout", () => {
  const resolve = createTenantResolver();
  const r = readClientAiCrawlerAccess({ tenantId: clientOf(resolve), resolve });
  const n = declaredAiCrawlers(BLOCKED_CRAWLERS).length;
  const pages = new Set(r.audit.rows.map((x) => x.pageId)).size;
  assert.ok(pages > 0, "EMPTY page population");
  assert.equal(r.summary.pairs, n * pages, "a crawler-page pair has no policy, or two");
  assert.equal(Object.values(r.summary.policy).reduce((a, b) => a + b, 0), r.summary.pairs);
  assert.deepEqual(r.summary.retrieval, { NOT_MEASURED: r.summary.pairs }, "a retrieval was reported without a recorded retrieval");
  assert.match(r.bound, /recorded retrievals 0 · X-Robots-Tag not recorded · nothing fetched/);
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify(r.summary)}`);
});

test("C5 · REAL: another client's robots.txt never decides this client's policy — a planted disallow-all for another declared client changes nothing; the same plant at the client's own origin (the control) decides it", () => {
  const resolve = createTenantResolver();
  const client = clientOf(resolve);
  const base = readClientAiCrawlerAccess({ tenantId: client, resolve });
  const origins = declaredOrigins();
  const other = origins.find((o) => o.tenantId !== client && o.host);
  const own = base.pageOrigins[0]; /* the client's own page origin, derived at run time — never typed */
  assert.ok(other, "no second real declared client — this proof would be vacuous");
  assert.ok(own && own !== `https://${other.host}`);
  const dir = mkdtempSync(join(tmpdir(), "f55-"));
  try {
    const plant = (origin) => {
      const p = join(dir, `robots-${Math.random().toString(36).slice(2)}.jsonl`);
      copyFileSync(ROBOTS_STORE, p);
      appendFileSync(p, JSON.stringify({ record_type: "observation", observation_id: "planted", measurement_key: "planted", observed_at: "2099-01-01T00:00:00Z", method: "robots", target: { kind: "url", ref: `${origin}/robots.txt` }, content_sha256: "0", raw_ref: null, value: { url: `${origin}/robots.txt`, host: new URL(origin).host, httpStatus: 200, bytes: 25, body: "User-agent: *\nDisallow: /\n" }, collector: "test", collector_version: "0" }) + "\n");
      return p;
    };
    const theirs = readClientAiCrawlerAccess({ tenantId: client, resolve, robotsPath: plant(`https://${other.host}`) });
    assert.deepEqual(theirs.summary.policy, base.summary.policy, "another client's robots.txt decided this client's policy");
    const mine = readClientAiCrawlerAccess({ tenantId: client, resolve, robotsPath: plant(own) });
    assert.deepEqual(mine.summary.policy, { DISALLOWED: base.summary.pairs }, "the control did not fire: a disallow-all at the client's own origin did not decide its policy");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= C6 — recorded data only ================= */

test("C6 · THE ENTRY POINT: in a declared world it prints this tenant's counts with its bound, retrieval NOT MEASURED, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/ai-crawler-access.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const r = readClientAiCrawlerAccess({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), env });
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ declared AI crawler\(s\)/);
    assert.match(ok.stdout, new RegExp(`over ${r.summary.pairs} crawler-page pair`), "the entry point printed another tenant's audit");
    assert.match(ok.stdout, /retrieval\s+NOT_MEASURED \d+ — policy is never reported as retrieval/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C6 · the audit and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/audit/ai-crawler-access.mjs", "src/audit/ai-crawler-access-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
