/**
 * 🔴 RR-194 · T-2 · THE RE-ASSESSMENT OF THE VERSION-1 CONTENT-SUPPLY FINDINGS (RTP-1 §17 S10, P20, P21, P24; the owner's PG-A1,
 * _handoffs b5b616e; RR-193's plan, _handoffs cd973c6). PURE — records in, records out; bin/t2-reassess.mjs does the scope, the
 * permission and the writes, so every rule below is driven by a test (a rule living in bin/ is a rule no test drives).
 *
 * Version 2 of thin-content, near-duplicate and template-dominance decides nothing on 350, 0.9 or 0.75 (src/audit/content-checks.mjs).
 * So every OPEN version-1 FAIL of theirs is no longer supported by the method that is live, and F90 can no longer hold it. Each one is
 * SUPERSEDED — never deleted, never edited (src/evidence/lifecycle.mjs): a NEW record by the version-2 detector names it in `supersedes`,
 * and an issue_state_change OPEN → SUPERSEDED names the new one. The new record is a REVIEW SIGNAL (src/audit/check.mjs reviewSignal):
 * UNKNOWN, never FAIL, carrying the measured value the version-1 finding recorded, so the page stays visible for review (the owner's
 * RR-194 decision 2). No member is re-recorded as a FAIL: a percentage alone never gives a verdict (P20) and completeness is judged for a
 * need (P21) — RR-193 measured 0 thin pages with no body text of their own.
 *
 * ONE TENANT PER RUN (F02): the findings stores are SHARED — the 125 findings sit on pages of 15 tenants (RR-193) — so a run touches only
 * the findings whose page is in its own tenant's partition of the crawl batch, and re-checks each page's own origin against its tenant.
 * BOTH STORES TOGETHER: a finding with copies in two stores moves in both, so F90 always reads one finding one way.
 *
 * REFUSES (the whole run, nothing written): a selected finding whose page resolves to another tenant; copies of one finding that read
 * differently across the stores; a version-1 finding whose recorded value cannot be read back.
 */
import { createHash } from "node:crypto";
import { lifecycleOf, makeIssueStateChange } from "../evidence/lifecycle.mjs";
import { reviewSignal } from "./check.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { THIN_UNIQUE_WORD_FLOOR } from "./shell.mjs";
import { NEAR_DUPLICATE_THRESHOLD, TEMPLATE_DOMINANCE_THRESHOLD, REVIEW_SIGNAL_JUSTIFICATIONS, T2_VERSION } from "./content-checks.mjs";

export const T2_DETECTORS = Object.freeze(["thin-content", "near-duplicate", "template-dominance"]);
export const SUPERSEDED_VERSION = "1";
export const RE_ASSESSMENT_AUTHORITY = Object.freeze([
  "_handoffs:AlmiVisibility_OWNER_RULING_2026-10-06_PG-A1_PAGE_GENERATOR_AMENDMENT_1.md",
  "_handoffs:AlmiVisibility_RTP-1_Rev6_FINAL_DRAFT_Research_to_Page_2026-10-05.md#S10,P20,P21,P24",
  `engine:src/audit/content-checks.mjs@T2_VERSION=${T2_VERSION}`,
]);

/** The value each version-1 finding RECORDED, read back from its own summary — never re-measured. */
const VALUE = Object.freeze({
  "thin-content": { name: "unique-body-words", bound: THIN_UNIQUE_WORD_FLOOR, read: (s) => { const m = s.match(/^(\d+) unique body words/); return m ? Number(m[1]) : null; } },
  "near-duplicate": { name: "body-similarity", bound: NEAR_DUPLICATE_THRESHOLD, read: (s) => { const m = s.match(/body similarity ([0-9]*\.[0-9]+) to /); return m ? Number(m[1]) : null; } },
  "template-dominance": { name: "shell-share", bound: TEMPLATE_DOMINANCE_THRESHOLD, read: (s) => { const m = s.match(/shell is (\d+)% of the page's words/); return m ? Number(m[1]) / 100 : null; } },
});
export const REASON = Object.freeze({
  "thin-content": "SUPERSEDED by the version-2 check (RR-194 T-2): 350 unique body words no longer decides anything (RTP-1 S10; the owner's PG-A1) — completeness is judged for a need (P21), never by a word count. Not deleted: the replacement keeps the measured count as a REVIEW SIGNAL, so the page stays visible for review.",
  "near-duplicate": "SUPERSEDED by the version-2 check (RR-194 T-2): a body similarity at or above 0.9 is a REVIEW SIGNAL only (RTP-1 P20) — a percentage alone never gives the verdict; a recorded substance review decides, and none is recorded. The replacement keeps the measured similarity as that signal.",
  "template-dominance": "SUPERSEDED by the version-2 check (RR-194 T-2): 0.75 has no recorded justification and was never a value the owner set (RTP-1 P20), so it decides nothing. The replacement keeps the measured shell share as a REVIEW SIGNAL.",
});
export const REFUSAL = Object.freeze({
  OTHER_TENANT: "T2_REASSESS_FINDING_RESOLVES_TO_ANOTHER_TENANT",
  COPIES_DIFFER: "T2_REASSESS_COPIES_DIFFER_ACROSS_STORES",
  VALUE_UNREADABLE: "T2_REASSESS_RECORDED_VALUE_UNREADABLE",
});

const fp = (i) => createHash("sha256").update(JSON.stringify([i.issue_class, i.target_page_id, i.verdict, i.detector, i.detector_version, i.summary ?? null, [...(i.evidence ?? [])]])).digest("hex");

/**
 * @param {{ stores: { name: string, records: object[] }[], tenantId: string, pagesOfTenant: Map<string,string>,
 *           tenantOfUrl: (url: string) => string|null, now: string, actor: string, action: string }} input
 *   pagesOfTenant  page_id → canonical URL, for the pages in the run's OWN partition of the crawl batch
 *   tenantOfUrl    the production resolver's tenant for a URL's own origin (SITE_ORIGIN) — the per-finding re-check
 */
export function planReassessment({ stores, tenantId, pagesOfTenant, tenantOfUrl, now, actor, action }) {
  if (typeof tenantId !== "string" || tenantId === "") throw new TypeError("a re-assessment is planned for the run's decided tenant — there is no default");
  for (const [k, v] of Object.entries({ now, actor, action })) if (typeof v !== "string" || v === "") throw new TypeError(`${k} is required`);
  const refused = [];
  /* every OPEN version-1 FAIL of a T-2 detector, by finding id, with each store's copy */
  const found = new Map();
  for (const { name, records } of stores) {
    const { issues } = lifecycleOf(records);
    for (const [id, e] of issues) {
      const i = e.issue;
      if (!T2_DETECTORS.includes(i.detector) || i.detector_version !== SUPERSEDED_VERSION || i.verdict !== "FAIL") continue;
      const cur = found.get(id) ?? { id, issue: i, copies: [] };
      cur.copies.push({ store: name, state: e.state, fingerprint: fp(i) });
      found.set(id, cur);
    }
  }
  const mine = [];
    let skipped = 0;
  for (const f of found.values()) {
    const url = pagesOfTenant.get(f.issue.target_page_id);
    if (url === undefined) { skipped += 1; continue; } // another tenant's page — another run's
    const owner = tenantOfUrl(url);
    /* F02: the relationship between the page's tenant and the run's reaches the ONE decision — never compared here */
    if (owner === null || !decideResolvedTenants(owner, tenantId).allowed) { refused.push({ code: REFUSAL.OTHER_TENANT, id: f.id, owner: owner ?? "UNRESOLVED" }); continue; }
    const states = new Set(f.copies.map((c) => c.state));
    const prints = new Set(f.copies.map((c) => c.fingerprint));
    if (states.size !== 1 || prints.size !== 1) { refused.push({ code: REFUSAL.COPIES_DIFFER, id: f.id, stores: f.copies.map((c) => `${c.store}:${c.state}`) }); continue; }
    if ([...states][0] !== "OPEN") continue; // already moved — a re-run appends nothing for it
    const v = VALUE[f.issue.detector].read(f.issue.summary ?? "");
    if (v === null || !Number.isFinite(v)) { refused.push({ code: REFUSAL.VALUE_UNREADABLE, id: f.id }); continue; }
    mine.push({ ...f, value: v });
  }
  if (refused.length) return Object.freeze({ refused: Object.freeze(refused), writes: Object.freeze([]), selected: 0, skipped });

  const byStore = new Map(stores.map((s) => [s.name, { replacements: [], changes: [] }]));
  const pairs = [];
  for (const f of mine) {
    const old = f.issue;
    const def = VALUE[old.detector];
    const replacement = reviewSignal({
      issueClass: old.issue_class,
      targetPageId: old.target_page_id,
      evidence: [...old.evidence],
      detector: old.detector,
      detectorVersion: T2_VERSION,
      openedAt: now,
      supersedes: old.issue_id,
      signal: { name: def.name, value: f.value, bound: def.bound, justification: REVIEW_SIGNAL_JUSTIFICATIONS[old.detector] },
      summary: `REVIEW SIGNAL (re-assessed from version 1, RR-194 T-2): ${def.name} ${f.value} [review signal: ${def.bound} — decides nothing]. ${REVIEW_SIGNAL_JUSTIFICATIONS[old.detector]}.`,
    });
    const change = makeIssueStateChange({
      issue_id: old.issue_id, from: "OPEN", to: "SUPERSEDED", changed_at: now,
      reason: REASON[old.detector], evidence: [...old.evidence], action, actor, superseded_by: replacement.issue_id,
    });
    for (const c of f.copies) { const w = byStore.get(c.store); w.replacements.push(replacement); w.changes.push(change); }
    pairs.push({ old, replacement });
  }
  const writes = [...byStore.entries()].filter(([, w]) => w.replacements.length).map(([store, w]) => Object.freeze({ store, replacements: Object.freeze(w.replacements), changes: Object.freeze(w.changes) }));
  return Object.freeze({ refused: Object.freeze([]), writes: Object.freeze(writes), pairs: Object.freeze(pairs), selected: mine.length, skipped,
    byDetector: Object.freeze(Object.fromEntries(T2_DETECTORS.map((d) => [d, mine.filter((f) => f.issue.detector === d).length]))) });
}
