/**
 * RR-283 · OWNER DECISION 3 ON THE REAL RECORDS — "NO HUMAN CHECKER" (_handoffs AlmiVisibility_OWNER_DECISION_2026-10-17_RR-283.md, rules
 * 3a–3f; the amendment of F46 C3 and F62 in AlmiVisibility_F46_F62_ACCEPTANCE_AMENDMENT_DECISION_3_2026-10-17.md).
 *
 *   3a/3c  every published answer carries its source and its date, and nothing more about who checked it
 *   3e     no record says a person checked something no person checked: the checks the authoring AI recorded as `human:` are the engine's
 *
 * Read only: the client's fact registry and the batch's built pages are read, never written; nothing is fetched; the production trail is
 * not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { loadRegistry } from "../src/facts/registry.mjs";
import { FACT_CHECKED_BY_PATTERN } from "../src/facts/schema.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { subject } from "./support/subjects.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

/* the two records the owner verified himself against the official source on 21 Sep 2026 (the item-56 owner verification) — the only checks
 * a person made; every other recorded check was made by the authoring AI, and is the engine's */
const OWNER_VERIFIED = ["pk-pnmc.verification-fee.destination=domestic", "pk-pnmc.verification-fee.destination=foreign"];
const BATCH = "rr254-test-pages-2026-10-12";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Every checker id one record names: its check, the check before it, and the fact-check stamp its loader derives. */
const checkersOf = (r) => [
  ["verification", r?.verification?.checkedBy], ["verification.previous", r?.verification?.previous?.checkedBy], ["checks", r?.checks?.factCheckedBy],
].filter(([, v]) => typeof v === "string" && v !== "");

test("RR-283 · 3e REAL: no record of the client's registry says a person checked what no person checked — every human: check is one the owner made himself; every other names the engine; every id is typed", async () => {
  const p = await subject("almi-oet");
  const { records } = await loadRegistry(p.factsDir, p.productId);
  assert.ok(records.length > 40, `only ${records.length} records — too few to believe a zero`);
  const all = records.flatMap((r) => checkersOf(r).map(([at, id]) => ({ record: r.id, at, id })));
  assert.ok(all.length > 0, "no recorded check at all — this census would be vacuous");
  for (const c of all) assert.match(c.id, FACT_CHECKED_BY_PATTERN, `${c.record} (${c.at}): a checker id that is not typed`);
  const byPerson = all.filter((c) => c.id.startsWith("human:"));
  const falseClaims = byPerson.filter((c) => !OWNER_VERIFIED.includes(c.record));
  assert.deepEqual(falseClaims, [], "a record says a person checked something the owner did not check");
  assert.deepEqual([...new Set(byPerson.map((c) => c.record))].sort(), [...OWNER_VERIFIED].sort(), "the owner's own checks are not exactly the two he made");
  assert.equal(new Set(byPerson.map((c) => c.id)).size, 1, "the owner's checks name more than one person");
  const byEngine = all.filter((c) => c.id.startsWith("engine:"));
  assert.ok(byEngine.length >= 44, `the authoring AI's checks are not all relabelled as the engine (${byEngine.length})`);
  /* who acquired a record is not who checked it: the one record acquired by an unnamed reader is named apart, never counted as a check */
  const acquired = records.filter((r) => String(r?.provenance?.acquiredBy ?? "").startsWith("human:")).map((r) => r.id);
  console.log(`  REAL (count-only): checks ${all.length} · by the engine ${byEngine.length} · by the owner ${byPerson.length} on ${OWNER_VERIFIED.length} record(s) · by a model ${all.filter((c) => c.id.startsWith("model:")).length} · false person claims 0 · records acquired by an unnamed person (not a check) ${acquired.length}`);
});

test("RR-283 · 3e REAL: the batch's own reading records name an agent or the engine as the reader — never a person", () => {
  const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
  if (!existsSync(join(dir, "findings.json"))) return test.skip?.("the batch is not on this machine");
  const findings = JSON.parse(readFileSync(join(dir, "findings.json"), "utf8"));
  const kinds = findings.map((f) => (typeof f.readBy === "object" ? f.readBy?.kind : "TEXT"));
  assert.ok(findings.length > 100, "too few findings to believe a zero");
  assert.deepEqual([...new Set(kinds)].filter((k) => !["AGENT", "ENGINE", "TEXT"].includes(k)), [], "a finding names a person as its reader");
  assert.deepEqual(findings.filter((f) => typeof f.readBy === "string" && !/agent|actor:/i.test(f.readBy)).map((f) => f.findingId), [], "a finding's reader is neither an agent nor the engine");
});

test("RR-283 · 3a REAL: every answer on the 12 published guides carries its source and its date — the source shown on the page, the date beside it", () => {
  const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
  const file = join(dir, "joined-pages.jsonl");
  if (!existsSync(file)) return test.skip?.("the batch is not on this machine");
  const built = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === "joined_page_draft");
  const latest = [...new Map(built.map((r) => [r.value, r])).values()];
  const published = latest.filter((r) => typeof r.publishedUrl === "string");
  assert.equal(published.length, 12, "the 12 published guides are not all in the batch");
  let answers = 0;
  for (const r of published) {
    const claimIds = new Set(JSON.stringify(r.itemList).match(/"claimId":"[^"]+"/g)?.map((m) => m.slice(11, -1)) ?? []);
    const traced = new Map((r.trace ?? []).map((t) => [t.claimId, t]));
    assert.ok(claimIds.size > 0, `${r.value}: no answer at all — this check would be vacuous`);
    for (const id of claimIds) {
      const t = traced.get(id);
      assert.ok(t, `${r.value}: answer ${id} carries no source`);
      assert.ok(typeof t.source === "string" && t.source.trim() !== "" && /^https?:\/\//.test(t.link ?? ""), `${r.value}: answer ${id} names no source or no link`);
      assert.match(t.readOn ?? "", ISO, `${r.value}: answer ${id} carries no date`);
      assert.ok(r.html.includes(`Source: ${t.source.replace(/&/g, "&amp;")}`) || r.html.includes(`Source: ${t.source}`), `${r.value}: answer ${id}'s source is not shown on the page`);
      assert.ok(r.html.includes(`checked ${t.readOn}`), `${r.value}: answer ${id}'s date is not shown on the page`);
      answers++;
    }
    assert.doesNotMatch(r.html, /\b(checked|reviewed|verified) by\b/i, `${r.value}: the page says who checked it`);
  }
  console.log(`  REAL (count-only): published guides ${published.length} · answers ${answers} · each with its source and date shown · "checked by" on a page 0`);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
