/**
 * F42 · DRAFT REPAIR ASSISTANT (acceptance _handoffs 1fcee4a, AlmiVisibility_F42_ACCEPTANCE_2026-10-17.md, RR-283 item 6).
 *
 * Every proof starts from a REAL draft of the batch as built (each published page's latest built record) and the client's declared filler
 * phrases; the drafts are made to fail the gate the approved text names ("to the point") only as firing controls. The repairs are the
 * agent's proposals, written here as functions. Read only: nothing fetched, nothing written; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { repairDraft, gateFailures, protectedPart, approvalFor, REPAIR, REPAIR_GATE, REPAIR_REFUSAL, MAX_REPAIR_ROUNDS } from "../src/page/draft-repair.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const DIR = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(DIR, "joined-pages.jsonl"));
const SKIP = HERE ? false : "the batch's built pages are not on this machine";
const drafts = () => {
  const built = readFileSync(join(DIR, "joined-pages.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === "joined_page_draft");
  return [...new Map(built.map((r) => [r.value, r])).values()].filter((r) => typeof r.publishedUrl === "string");
};
const FILLER = () => JSON.parse(readFileSync(join(DIR, "page-filler-phrases.json"), "utf8"));
/* a real draft holding a general view and an owner-approved product card */
const realDraft = () => structuredClone(drafts().find((r) => r.itemList.some((it) => it.generalView) && r.itemList.some((it) => (it.statements ?? []).length > 0)));
const gvItem = (d) => d.itemList.find((it) => it.generalView);
const claimsJson = (d) => JSON.stringify(d.itemList.map((it) => (it.claims ?? []).map((c) => [c.claimId, c.text, c.quotation ?? null, c.source ?? null, c.supports ?? null])));
const cardsJson = (d) => JSON.stringify(d.itemList.map((it) => it.statements ?? []));

/* the plants that make a real draft fail "to the point" — firing controls only */
const plantFiller = (d, phrases) => { gvItem(d).generalView.text = `${phrases.map((p) => `${p[0].toUpperCase()}${p.slice(1)},`).join(" ")} ${gvItem(d).generalView.text}`; return d; };
const plantLongLine = (d) => { const c = d.itemList.find((it) => (it.claims ?? []).length > 0).claims[0]; c.text = `${c.text} It also adds a second sentence here.`; return d; };
/* the agent's proposals */
const removeOneFiller = (filler) => (d) => {
  const next = structuredClone(d), gv = gvItem(next).generalView;
  const hit = filler.find((p) => gv.text.toLowerCase().includes(`${p},`));
  if (hit) { const at = gv.text.toLowerCase().indexOf(`${hit},`); gv.text = (gv.text.slice(0, at) + gv.text.slice(at + hit.length + 1)).replace(/^\s+/, ""); gv.text = gv.text[0].toUpperCase() + gv.text.slice(1); }
  return next;
};

test("C1 · CLAIMS AND SOURCES KEPT: a real draft made to fail 'to the point' is repaired with every claim, quotation, source link and evidence state byte-equal; a proposal that touches a claim is refused", { skip: SKIP }, () => {
  const filler = FILLER();
  const base = realDraft();
  assert.deepEqual(gateFailures(base, { fillerPhrases: filler }), [], "the real draft fails before any plant");
  const broken = plantFiller(structuredClone(base), [filler.find((p) => /^[a-z ]+$/.test(p))]);
  const before = gateFailures(broken, { fillerPhrases: filler });
  assert.equal(before.length, 1, `the plant did not make exactly one named failure: ${JSON.stringify(before)}`);
  const r = repairDraft({ draft: broken, propose: removeOneFiller(filler), fillerPhrases: filler });
  assert.deepEqual([r.state, r.rounds, r.after.length], [REPAIR.REPAIRED, 1, 0]);
  assert.equal(claimsJson(r.draft), claimsJson(base), "a claim's text, quotation, source or evidence changed in the repair");
  assert.equal(protectedPart(r.draft), protectedPart(base));
  /* a proposal that "repairs" by rewriting a claim is refused, and changes nothing */
  const long = plantLongLine(structuredClone(base));
  const rewrite = (d) => { const n = structuredClone(d); const c = n.itemList.find((it) => (it.claims ?? []).length > 0).claims[0]; c.text = c.text.split(". ")[0] + "."; return n; };
  const t = repairDraft({ draft: long, propose: rewrite, fillerPhrases: filler });
  assert.deepEqual([t.state, t.reason, t.rounds], [REPAIR.PARKED, REPAIR_REFUSAL.TOUCHED_PROTECTED, 1], "a repair that changed a claim was taken");
  assert.equal(claimsJson(t.draft), claimsJson(long));
});

test("C2 · TWO ROUNDS AT MOST: a real draft that cannot be repaired in two rounds stops after round 2 — the repair is never asked a third time", { skip: SKIP }, () => {
  const filler = FILLER().filter((p) => /^[a-z ']+$/.test(p)).slice(0, 3);
  const broken = plantFiller(realDraft(), filler);
  assert.equal(gateFailures(broken, { fillerPhrases: FILLER() }).length, 3);
  let asked = 0;
  const r = repairDraft({ draft: broken, propose: (d) => { asked += 1; return removeOneFiller(filler)(d); }, fillerPhrases: FILLER() });
  assert.equal(MAX_REPAIR_ROUNDS, 2);
  assert.deepEqual([asked, r.rounds, r.state, r.reason, r.after.length], [2, 2, REPAIR.PARKED, REPAIR_REFUSAL.ROUNDS_SPENT, 1], "a third round ran, or the draft was not parked after two");
});

test("C3 · NO PROGRESS STOPS EARLY: a real draft whose round 1 fixes nothing stops after round 1", { skip: SKIP }, () => {
  const broken = plantLongLine(realDraft());
  let asked = 0;
  const r = repairDraft({ draft: broken, propose: (d) => { asked += 1; return structuredClone(d); }, fillerPhrases: FILLER() });
  assert.deepEqual([asked, r.rounds, r.state, r.reason], [1, 1, REPAIR.PARKED, REPAIR_REFUSAL.NO_PROGRESS], "a round that removed no named failure was followed by another");
});

test("C4 · STILL FAILING IS PARKED: the parked record of C2's draft names its gate and its remaining failure; no approval can be made for it — a repaired draft can be offered", { skip: SKIP }, () => {
  const filler = FILLER().filter((p) => /^[a-z ']+$/.test(p)).slice(0, 3);
  const r = repairDraft({ draft: plantFiller(realDraft(), filler), propose: removeOneFiller(filler), fillerPhrases: FILLER() });
  assert.equal(r.state, REPAIR.PARKED);
  assert.equal(r.gate, REPAIR_GATE);
  assert.equal(r.after.length, 1);
  assert.match(r.after[0], new RegExp(`filler phrase\\(s\\): "${filler[2]}"`), "the parked record does not name its exact remaining failure");
  assert.deepEqual(approvalFor(r), { refused: REPAIR_REFUSAL.PARKED_NOT_APPROVABLE, gate: REPAIR_GATE, remaining: r.after }, "an approval could be made for a parked draft");
  const ok = repairDraft({ draft: plantFiller(realDraft(), [filler[0]]), propose: removeOneFiller(filler), fillerPhrases: FILLER() });
  assert.deepEqual(approvalFor(ok), { offered: true, gate: REPAIR_GATE }, "CONTROL: a repaired draft could not be offered");
});

test("C5 · OWNER BOUNDARY: a real draft holding a product card — a repair that edits the card is refused and the card is byte-equal; a lawful repair leaves it byte-equal too", { skip: SKIP }, () => {
  const filler = FILLER().filter((p) => /^[a-z ']+$/.test(p));
  const base = realDraft();
  assert.ok(base.itemList.some((it) => (it.statements ?? []).length > 0), "the real draft holds no product card — this proof would be vacuous");
  const broken = plantFiller(structuredClone(base), [filler[0]]);
  const editCard = (d) => { const n = removeOneFiller(filler)(d); const s = n.itemList.find((it) => (it.statements ?? []).length > 0).statements[0]; s.text = `${s.text} Try it free today.`; return n; };
  const r = repairDraft({ draft: broken, propose: editCard, fillerPhrases: FILLER() });
  assert.deepEqual([r.state, r.reason], [REPAIR.PARKED, REPAIR_REFUSAL.TOUCHED_PROTECTED], "a repair that edited an owner-approved statement was taken");
  assert.equal(cardsJson(r.draft), cardsJson(base));
  const ok = repairDraft({ draft: broken, propose: removeOneFiller(filler), fillerPhrases: FILLER() });
  assert.equal(ok.state, REPAIR.REPAIRED);
  assert.equal(cardsJson(ok.draft), cardsJson(base), "a lawful repair changed a product card");
});

test("REAL · the 12 published drafts as built pass the gate: no repair is needed on any of them", { skip: SKIP }, () => {
  const all = drafts();
  assert.equal(all.length, 12);
  const r = all.map((d) => repairDraft({ draft: d, propose: () => { throw new Error("asked to repair a draft that passes"); }, fillerPhrases: FILLER() }));
  assert.deepEqual([...new Set(r.map((x) => x.state))], [REPAIR.NOT_NEEDED]);
  console.log(`  REAL (count-only): published drafts 12 · gate "${REPAIR_GATE}" PASS 12 · repairs needed 0 · filler phrases declared ${FILLER().length}`);
});

test("the repair names no product and loads no module that can make a network, process, connector or paid call — and each control fires", () => {
  const F = "src/page/draft-repair.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
