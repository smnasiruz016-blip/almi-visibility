/**
 * 🔴 RR-272 §2 · EVENT_ID_CONFLICT ON EVERY RECORD RUN — the cause, the fix and its proof.
 *
 * The cause: bin/authority-migrate.mjs had a hidden default day (2026-09-22). Run without --now on 16 Oct 2026, it judged every record
 * committed after that day NOT_APPLICABLE; the record run admitted six of them so. Every later record run re-derived those admissions
 * from the corrected corpus (CURRENT) with the same event id and a different content, and the trail refused each one (EVENT_ID_CONFLICT)
 * — as it did for a record admitted CURRENT and SUPERSEDED since. The fix: --now is required; an admission already on the trail is
 * never offered again (src/audit-trail/population.mjs); the six wrong admissions are represented by ONE correction event
 * (config/known-wrong-admissions.mjs, src/audit-trail/wrong-admissions.mjs), never rewritten.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createAuditStore } from "../src/audit-trail/store.mjs";
import { recordCandidates } from "../src/audit-trail/recorder.mjs";
import { familyACandidates } from "../src/audit-trail/population.mjs";
import { census } from "../src/authority/corpus.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { KNOWN_WRONG_ADMISSIONS } from "../config/known-wrong-admissions.mjs";
import { WRONG_ADMISSIONS_EVENT, wrongAdmissionsFaults, wrongAdmissionsEventDraft, wrongAdmissionsNotOnTrail, correctedAdmissionIds } from "../src/audit-trail/wrong-admissions.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const realTrail = () => readFileSync(TRAIL, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));

test("ADMISSIONS · FIRING CONTROL (RR-272): an admission already on the trail is never offered again — a disposition that changed since is accounted as already audited and named, never an EVENT_ID_CONFLICT; without the trail the same run conflicts", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr272-"));
  try {
    const store = createAuditStore({ eventsPath: join(dir, "events.jsonl"), headPath: join(dir, "head.json") });
    const corpus = AUTHORITY_CORPUS.slice(0, 2);
    const at = (disposition) => corpus.map(() => ({ disposition }));
    const prov = { governanceCommit: "a".repeat(40), engineCommit: "b".repeat(40), now: "2026-10-16" };
    const offer = (disposition, recorded) => familyACandidates({ corpus, dispositions: at(disposition), provenance: prov, softwareVersion: "test", correlationId: "migration:test", migratedAt: "2026-10-16T00:00:00Z", recorded }).filter((c) => !String(c.sourceId).startsWith("authority-corpus-migration:"));
    /* the wrong day: both admitted NOT_APPLICABLE */
    const first = recordCandidates({ store, candidates: offer("NOT_APPLICABLE", []), corpus: AUTHORITY_CORPUS });
    assert.deepEqual([first.counts.migrated, first.counts.invalid], [2, 0]);
    /* CONTROL: the corrected corpus, offered with no regard for the trail — the store refuses both (the old behaviour) */
    const blind = recordCandidates({ store, candidates: offer("CURRENT", []), corpus: AUTHORITY_CORPUS });
    assert.deepEqual([blind.counts.invalid, [...new Set(blind.invalid.flatMap((i) => i.codes))]], [2, ["EVENT_ID_CONFLICT"]], "CONTROL: the conflict did not reproduce — the fix could not be shown");
    /* the fix: the trail's admissions are read first; nothing is offered again, each named with its disposition since */
    const held = store.readAll().events;
    const seen = offer("CURRENT", held);
    assert.deepEqual(seen.map((c) => [Boolean(c.draft), c.alreadyAudited === held.find((e) => e.metadata?.authorityBlob === corpus[seen.indexOf(c)].sourceRef?.blob)?.eventId, c.dispositionSince]),
      [[false, true, { stored: "NOT_APPLICABLE", inForce: "CURRENT" }], [false, true, { stored: "NOT_APPLICABLE", inForce: "CURRENT" }]]);
    const fixed = recordCandidates({ store, candidates: seen, corpus: AUTHORITY_CORPUS });
    assert.deepEqual([fixed.counts.invalid, fixed.counts.alreadyAudited, fixed.remainder, store.readAll().events.length], [0, 2, 0, 2]);
    /* an unchanged disposition carries no "since" */
    assert.equal(offer("NOT_APPLICABLE", held).some((c) => c.dispositionSince), false);
    /* a record NOT on the trail is still offered */
    assert.equal(offer("CURRENT", held.slice(0, 1)).filter((c) => c.draft).length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("CORRECTION · FIRING CONTROL (RR-272): the declared correction names each wrong admission by id, stored and in-force disposition; each fault refuses a draft; the draft rewrites nothing; once on the trail it is never pending again", () => {
  const [c] = KNOWN_WRONG_ADMISSIONS;
  assert.deepEqual(wrongAdmissionsFaults(c), []);
  const codes = (x) => wrongAdmissionsFaults(x).map((f) => f.code);
  assert.ok(codes({ ...c, wrongAdmissions: 5 }).includes("CORRECTION_COUNT_MISMATCH"));
  assert.ok(codes({ ...c, admissions: [c.admissions[1], ...c.admissions.slice(1)] }).includes("CORRECTION_ADMISSION_MALFORMED"), "a misnumbered admission passed");
  assert.ok(codes({ ...c, admissions: [c.admissions[0].replace("-> CURRENT", "-> NOT_APPLICABLE"), ...c.admissions.slice(1)] }).includes("CORRECTION_NAMES_NO_DIFFERENCE"));
  assert.ok(codes({ ...c, treatment: "REWRITTEN" }).includes("CORRECTION_CLAIMS_REWRITE"));
  assert.ok(codes({ ...c, evidenceSha256: "x" }).includes("CORRECTION_EVIDENCE_UNPINNED"));
  assert.ok(codes({ ...c, cause: "" }).includes("CORRECTION_FIELD_ABSENT"));
  /* the trail refuses a metadata value over its ceiling: such a declaration is refused here first (found by the first real run) */
  assert.ok(codes({ ...c, cause: "x".repeat(201) }).includes("CORRECTION_VALUE_TOO_LONG"));
  assert.throws(() => wrongAdmissionsEventDraft({ correction: { ...c, treatment: "REWRITTEN" }, occurredAt: "2026-10-16T00:00:00Z", softwareVersion: "t", authorityRef: { propositionId: "P", scope: ["S"] }, authorityHash: "0".repeat(64), correlationId: "r" }), /CORRECTION_REFUSED/);
  const d = wrongAdmissionsEventDraft({ correction: c, occurredAt: "2026-10-16T00:00:00Z", softwareVersion: "t", authorityRef: { propositionId: "P", scope: ["S"] }, authorityHash: "0".repeat(64), correlationId: "r" });
  assert.deepEqual([d.eventType, d.action, d.outcome, d.migration, d.metadata.wrongAdmissions, d.metadata.admission6, d.metadata.treatment], [WRONG_ADMISSIONS_EVENT.eventType, WRONG_ADMISSIONS_EVENT.action, "RECORDED", false, 6, c.admissions[5], "REPRESENTED_NOT_REWRITTEN"]);
  assert.equal(correctedAdmissionIds(c).length, 6);
  /* the real declaration's draft is one the production store accepts — appended once; offered again, nothing is added */
  const dir = mkdtempSync(join(tmpdir(), "rr272-c-"));
  try {
    const s = createAuditStore({ eventsPath: join(dir, "events.jsonl"), headPath: join(dir, "head.json") });
    const real = wrongAdmissionsEventDraft({ correction: c, occurredAt: "2026-10-16T00:00:00Z", softwareVersion: "t", authorityRef: { propositionId: "P", scope: ["S"] }, authorityHash: "0".repeat(64), correlationId: "r" });
    assert.deepEqual([s.append(real).status, s.append(real).status, s.readAll().events.length], ["APPENDED", "IDEMPOTENT_RETRY", 1]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.deepEqual([wrongAdmissionsNotOnTrail([c], []).length, wrongAdmissionsNotOnTrail([c], [{ ...d, eventId: "x" }]).length], [1, 0]);
});

test("MIGRATE · PRODUCTION PATH (RR-272): bin/authority-migrate.mjs takes no default day — without --now, or with a day that does not exist, it is a usage refusal before anything is read or written; with a day it goes past usage", () => {
  const run = (...extra) => spawnSync(process.execPath, ["bin/authority-migrate.mjs", "--governance-root=.", "--governance-commit=0000000", "--engine-commit=0000000", ...extra], { cwd: REPO, encoding: "utf8" });
  for (const [why, args] of [["no --now", []], ["a month 13", ["--now=2026-13-01"]], ["a 31 April", ["--now=2026-04-31"]], ["not a day", ["--now=today"]]]) {
    const r = run(...args);
    assert.deepEqual([r.status, /--now=YYYY-MM-DD/.test(r.stderr)], [2, true], `${why}: ${r.stdout}${r.stderr}`);
  }
  const control = run("--now=2026-10-16");
  assert.notEqual(control.status, 2, "CONTROL: a valid day was refused as usage — the refusal could not tell");
  assert.equal(trailSha(), TRAIL_BEFORE, "the production trail moved");
});

test("REAL (RR-272): each wrong admission the correction names is on the trail with the disposition it says was stored, and the corpus in force gives the one it says; the real record run offers no admission already on the trail; every disposition changed since is named", () => {
  const events = realTrail();
  const [c] = KNOWN_WRONG_ADMISSIONS;
  const d = census(AUTHORITY_CORPUS, CORPUS_PROVENANCE.now).dispositions;
  for (const a of c.admissions) {
    const [, id, stored, , inForce, authorityId] = String(a).split(" ");
    const e = events.find((x) => x.eventId === id);
    assert.ok(e && e.action === "ADMIT_AUTHORITY_RECORD" && e.metadata.disposition === stored, `${id} is not on the trail as a ${stored} admission`);
    const i = AUTHORITY_CORPUS.findIndex((r) => r.authorityId === authorityId);
    assert.ok(i >= 0 && AUTHORITY_CORPUS[i].sourceRef.blob === e.metadata.authorityBlob && d[i].disposition === inForce, `${authorityId}: the corpus in force does not give ${inForce}`);
  }
  /* the correction itself is on the trail, once, under F08's authority, naming the six */
  const corr = events.filter((e) => e.action === WRONG_ADMISSIONS_EVENT.action && e.metadata?.correctionId === c.correctionId);
  assert.deepEqual([corr.length, corr[0]?.eventType, corr[0]?.authorityRef?.propositionId, corr[0]?.metadata?.wrongAdmissions, corr[0]?.metadata?.admission1], [1, "AUDIT_CORRECTION", "OWNER_RULING_F08_ACCEPTANCE", 6, c.admissions[0]], "the correction is not on the trail, once");
  assert.equal(wrongAdmissionsNotOnTrail(KNOWN_WRONG_ADMISSIONS, events).length, 0);
  const cands = familyACandidates({ corpus: AUTHORITY_CORPUS, dispositions: d, provenance: CORPUS_PROVENANCE, softwareVersion: "t", correlationId: "c", migratedAt: "2026-10-16T00:00:00Z", recorded: events });
  const held = new Set(events.map((e) => e.eventId));
  assert.equal(cands.filter((x) => x.family === "A" && x.draft && x.draft.action === "ADMIT_AUTHORITY_RECORD").length, AUTHORITY_CORPUS.length - cands.filter((x) => x.alreadyAudited).length);
  assert.equal(cands.filter((x) => x.alreadyAudited && !held.has(x.alreadyAudited)).length, 0, "an admission was read as audited but is not on the trail");
  const since = cands.filter((x) => x.dispositionSince);
  const corrected = new Set(correctedAdmissionIds(c));
  assert.ok(since.length >= 6 && [...corrected].every((id) => since.some((x) => x.alreadyAudited === id)), "a corrected admission is not named as changed since");
  for (const x of since.filter((y) => !corrected.has(y.alreadyAudited))) assert.equal(x.dispositionSince.inForce, "SUPERSEDED", `${x.sourceId}: a change since that is neither corrected nor a supersession`);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
