/**
 * 🔴 RR-281 · THE LINK GUARD (src/facts/link-guard.mjs, wired into bin/build-joined-pages.mjs before anything is written).
 * beta-g's decision of 17 Oct 2026: the build FAILS for a page when a claim's fact is rechecked at a link other than the one the page shows
 * (LINK_DIFFERS), or none of its fact's quotations is word for word in a stored text of that link (QUOTE_NOT_IN_LINKED_TEXT).
 *   · FIRING CONTROLS over fixture records: the pass, each refusal, a link with no stored text, a fact with no quotation;
 *   · REAL: the batch's pages pass (every claim), and fact ahpra-2026 as it stood before RR-279 (rechecked at a web page while its pages link
 *     the PDF) is refused on every page that uses it;
 *   · PRODUCTION PATH: the builder's own entry point over a scratch copy — a planted registry link refuses the run, named, nothing written;
 *     without the private sources root (no stored text) it refuses every real build.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { linkGuard, LINK_GUARD } from "../src/facts/link-guard.mjs";
import { privateSourcesRoot, withPrivateTexts } from "../src/facts/private-texts.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { JOINED_RECORD } from "../src/page/joined-page.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { barredSources } from "../src/facts/licence-guard.mjs";
import { ensureSubjectHook } from "../src/subject-roots.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const rows = (f) => (existsSync(f) ? readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);

/* fixture records: two claims on one page, one through a registry fact, one a claim-level fact */
const PDF = "https://regulator.test/doc.pdf", WEB = "https://regulator.test/page", OTHER = "https://other.test/x";
const claim = (claimId, link, quotation) => ({ claimId, text: `claim ${claimId}`, source: { link, name: "A regulator" }, ...(quotation ? { quotation } : {}) });
const fixture = ({ regLink = PDF, readsOf = { [PDF]: "The minimum score is 350 in Listening. Other text.", [OTHER]: "Fees are 100 units each." }, q2 = "Fees are 100 units each" } = {}) => ({
  drafts: { pages: [{ combination: { kind: "alpha" }, needs: [{ answer: { claims: [claim("c1", PDF), claim("c2", OTHER, q2)] } }] }] },
  findings: [{ claimId: "c1", factId: "reg-1" }, { claimId: "c2", whatSupportsIt: "" }],
  registry: { facts: [{ factId: "reg-1", link: regLink, whatSupportsIt: "the document says \"The minimum score is 350 in Listening\"" }] },
  reads: Object.entries(readsOf).map(([url, text]) => ({ state: "READ", url, text })),
});

test("RR-281 · FIRING CONTROLS: a page passes only when each claim's fact is rechecked at the page's own link and its quotation is in a stored text of that link", () => {
  const ok = linkGuard(fixture());
  assert.deepEqual([ok.claims, ok.refused.length], [2, 0], JSON.stringify(ok.refused));
  /* 1 · the registry link differs from the page link */
  const differs = linkGuard(fixture({ regLink: WEB }));
  assert.deepEqual(differs.refused.map((r) => [r.claimId, r.code, r.factLink]), [["c1", LINK_GUARD.LINK_DIFFERS, WEB]]);
  /* 2 · the quotation is not in the linked text */
  const missing = linkGuard(fixture({ readsOf: { [PDF]: "The minimum score is 360 in Listening.", [OTHER]: "Fees are 100 units each." } }));
  assert.deepEqual(missing.refused.map((r) => [r.claimId, r.code]), [["c1", LINK_GUARD.QUOTE_NOT_IN_LINKED_TEXT]]);
  /* the quotation found only in ANOTHER link's text does not pass */
  const elsewhere = linkGuard(fixture({ readsOf: { [OTHER]: "Fees are 100 units each. The minimum score is 350 in Listening." } }));
  assert.deepEqual(elsewhere.refused.map((r) => [r.claimId, r.code, r.storedTexts]), [["c1", LINK_GUARD.QUOTE_NOT_IN_LINKED_TEXT, 0]]);
  /* a link with no stored text, and a fact with no recorded quotation, never pass: nothing is assumed */
  assert.deepEqual(linkGuard(fixture({ readsOf: {} })).refused.map((r) => r.code), [LINK_GUARD.QUOTE_NOT_IN_LINKED_TEXT, LINK_GUARD.QUOTE_NOT_IN_LINKED_TEXT]);
  assert.deepEqual(linkGuard(fixture({ q2: null })).refused.map((r) => [r.claimId, r.quotations]), [["c2", 0]]);
  /* a read that is not READ, or whose text is absent (a private text not joined), holds no stored text */
  const f = fixture();
  assert.equal(linkGuard({ ...f, reads: f.reads.map((r) => ({ ...r, state: "BLOCKED" })) }).refused.length, 2);
  assert.equal(linkGuard({ ...f, reads: f.reads.map((r) => ({ ...r, text: null })) }).refused.length, 2);
});

/* the declared real batch: the newest research batch that holds built pages and a fact registry */
const RESEARCH = () => lookupStore(rootIndexFor(process.env), "RESEARCH").dir;
const BATCH = (() => { const d = RESEARCH(); return (existsSync(d) ? readdirSync(d) : []).filter((b) => existsSync(join(d, b, "joined-pages.jsonl")) && readdirSync(join(d, b)).some((f) => /^facts-registry-/.test(f))).sort().at(-1) ?? null; })();
const realInputs = (dir, priv) => {
  const json = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
  return { drafts: json("page-drafts.json"), findings: json("findings.json"), intervals: json("recheck-intervals.json"), registry: json(readdirSync(dir).find((f) => /^facts-registry-/.test(f))),
    reads: withPrivateTexts(rows(join(dir, "source-reads.jsonl")), priv ? rows(join(priv, "source-reads.jsonl")) : [], { privateRoot: priv ? "DECLARED" : "ABSENT" }) };
};

test("RR-281 · REAL: every claim of the batch's pages passes; fact ahpra-2026 as it stood before RR-279 is refused on each page that uses it", async (t) => {
  if (!BATCH) { t.skip("no declared research batch with built pages and a fact registry"); return; }
  const P = privateSourcesRoot(process.env);
  if (P.state !== "DECLARED") { t.skip("RR-274: the stored texts are kept in the private sources root, which is not here"); return; }
  const dir = join(RESEARCH(), BATCH), priv = join(P.dir, "research", BATCH);
  const I = realInputs(dir, priv);
  /* RR-288: the sources whose licence forbids storing their words hold no stored text; their claims stand on the link alone */
  ensureSubjectHook();
  const subjectDir = lookupSubject(rootIndexFor(process.env), "almi-oet").dir;
  const barred = barredSources((await loadRegistry(join(subjectDir, "facts"), "almi-oet")).records);
  const now = linkGuard({ ...I, barred });
  assert.equal(now.linkOnly.length, 2, "the claims on a licence-barred link moved");
  assert.ok(now.claims >= 394, `EMPTY real population: ${now.claims} claim(s)`);
  assert.deepEqual(now.refused, [], `a real page cites a fact through a link it was not verified at: ${JSON.stringify(now.refused.slice(0, 3))}`);
  const reg = I.registry.facts.find((f) => f.factId === "ahpra-2026");
  if (!reg) { t.skip("the batch files no fact ahpra-2026"); return; }
  const WEB = "https://www.ahpra.gov.au/Registration/Registration-Standards/English-language-skills/Accepted-English-language-tests";
  const before = linkGuard({ ...I, barred, registry: { ...I.registry, facts: I.registry.facts.map((f) => (f.factId === "ahpra-2026" ? { ...f, link: WEB } : f)) } });
  assert.ok(before.refused.length >= 8 && before.refused.every((r) => r.factId === "ahpra-2026" && r.code === LINK_GUARD.LINK_DIFFERS && r.factLink === WEB), JSON.stringify(before.refused.slice(0, 3)));
  assert.equal(new Set(before.refused.map((r) => r.page)).size, before.refused.length, "a page was counted twice");
});

test("RR-281 · PRODUCTION PATH: the builder's own entry point over a scratch copy — a registry link that differs from its page's link refuses the run before anything is written; without the private sources root every real build is refused", (t) => {
  if (!BATCH) { t.skip("no declared research batch with built pages and a fact registry"); return; }
  const real = join(RESEARCH(), BATCH);
  const page = rows(join(real, "joined-pages.jsonl")).filter((r) => r.record_type === JOINED_RECORD).at(-1);
  const subject = page.subject, x = page.exception.record, on = page.recorded_at.slice(0, 10);
  const productId = String(lookupSubject(rootIndexFor(process.env), subject).entry?.members?.find((m) => m.resourceKind === "FACT_REGISTRY")?.resourceRef ?? "").split(":").pop().split("/")[0];
  const W = declaredWorld();
  const dir = join(W.root, "research", BATCH);
  const STORES = ["joined-pages.jsonl", "planning.jsonl"];
  const build = (env) => spawnSync(process.execPath, ["bin/build-joined-pages.mjs", ...W.argv([`--subject=${subject}`, `--product=${productId}`, `--research-batch=${BATCH}`, `--on=${on}`, `--test-exception=${x.repo}:${x.path}@${x.commit}`, "--confirm"])], { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), ...env } });
  try {
    const before = STORES.map((f) => sha(readFileSync(join(dir, f))));
    /* without the private sources root no stored text is there: every claim is refused, named */
    const none = build({ ALMIVISIBILITY_PRIVATE_SOURCES: join(tmpdir(), "rr281-no-private-root") });
    assert.equal(none.status, 3, none.stdout + none.stderr);
    /* RR-288: every claim is refused but the 2 on a licence-barred link, which stand on their link alone — never on a stored text */
    const m = /REFUSED — LINK_GUARD: (\d+) of (\d+) claim\(s\) \(QUOTE_NOT_IN_LINKED_TEXT \1\)/.exec(none.stderr);
    assert.ok(m && Number(m[2]) - Number(m[1]) === 2, none.stderr);
    assert.match(none.stderr, /the private sources root is not here/);
    assert.deepEqual(STORES.map((f) => sha(readFileSync(join(dir, f)))), before, "a store was written although the guard refused");
    if (privateSourcesRoot(process.env).state !== "DECLARED") { t.skip("RR-274: the planted-link limb needs the stored texts, kept in the private sources root, which is not here"); return; }
    /* a registry fact's link planted to differ from the link its pages show */
    const regFile = readdirSync(dir).find((f) => /^facts-registry-/.test(f));
    const reg = JSON.parse(readFileSync(join(dir, regFile), "utf8"));
    const used = new Set(rows(join(dir, "joined-pages.jsonl")).length ? JSON.parse(readFileSync(join(dir, "findings.json"), "utf8")).map((f) => f.factId).filter(Boolean) : []);
    const target = reg.facts.find((f) => used.has(f.factId));
    assert.ok(target, "EMPTY real population: no registry fact is cited by a page");
    writeFileSync(join(dir, regFile), JSON.stringify({ ...reg, facts: reg.facts.map((f) => (f.factId === target.factId ? { ...f, link: "https://planted.test/another-page" } : f)) }));
    const planted = build({});
    assert.equal(planted.status, 3, planted.stdout + planted.stderr);
    assert.match(planted.stderr, new RegExp(`REFUSED — LINK_GUARD: \\d+ of \\d+ claim\\(s\\) \\(LINK_DIFFERS \\d+\\)`));
    assert.ok(planted.stderr.includes(`fact ${target.factId}`) && planted.stderr.includes("rechecked at https://planted.test/another-page"), planted.stderr);
    assert.deepEqual(STORES.map((f) => sha(readFileSync(join(dir, f)))), before, "a store was written although the guard refused");
    /* CONTROL: the registry as recorded passes the guard (the run goes on past it) */
    writeFileSync(join(dir, regFile), JSON.stringify(reg));
    const ok = build({});
    assert.ok(!/LINK_GUARD/.test(ok.stderr) && /link guard\s+\d+ claim\(s\)/.test(ok.stdout), ok.stdout + ok.stderr);
  } finally { W.cleanup(); }
  assert.equal(existsSync(W.root), false, "the scratch copy was not removed");
});
