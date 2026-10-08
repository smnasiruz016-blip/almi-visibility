/**
 * F31 · THE CLIENT'S EXISTING-PAGE INVENTORY — identity, fingerprints, served state, ownership and evidence per known URL
 * (acceptance _handoffs 3a8f7ba, RR-85; spec row: "Maintain stable identity, fingerprints, served state, ownership and evidence for
 * known URLs").
 *
 * Built from ONE client's partition of the recorded batch — its page and observation records and its own stored bodies — so every
 * page here is owned by that client's tenant through the one tenant decision the partition already made (F02). What the partition
 * could not place (an undeclared or ambiguous origin) is counted, never absorbed.
 *
 *   identity      the stored page_id, CHECKED against the id derived from its canonical URL; a URL claimed by two ids, or an id that
 *                 does not derive from its URL, is a CONFLICT and is reported, never merged
 *   fingerprints  each observation's recorded content_sha256, VERIFIED against the stored body when one exists (true / false), or
 *                 null when no body was stored — never recomputed from nothing and never invented
 *   servedState   the latest observation that came back with a status: status, whether it redirected, observed time; a page never
 *                 observed with a status is UNKNOWN
 *   evidence      the batch and the observation ids every attribute came from
 *
 * Pure. Nothing here prints a URL; the canonical URL is kept for identity checks only.
 */
import { createHash } from "node:crypto";
import { canonicalUrl, targetPageId } from "../evidence/ids.mjs";
import { hasServedState } from "./scope-completeness.mjs";

const sha = (s) => createHash("sha256").update(String(s), "utf8").digest("hex");

export function scopeInventory({ tenantId, batchId, records, bodies = new Map(), unplaced = { undeclared: 0, ambiguous: 0 }, batchOf = null }) {
  const observations = new Map(records.filter((r) => r.record_type === "observation").map((o) => [o.observation_id, o]));
  const pageRecords = records.filter((r) => r.record_type === "page");
  const idsByUrl = new Map();
  for (const p of pageRecords) {
    let c = null;
    try { c = canonicalUrl(p.canonical_url); } catch { /* reported below */ }
    const key = c ?? `\u0000unparseable:${p.page_id}`;
    if (!idsByUrl.has(key)) idsByUrl.set(key, new Set());
    idsByUrl.get(key).add(p.page_id);
  }
  const conflicts = [];
  const pages = pageRecords.map((p) => {
    let derived = null;
    try { derived = targetPageId(canonicalUrl(p.canonical_url)); } catch { /* no derivable id */ }
    if (derived !== p.page_id) conflicts.push({ pageId: p.page_id, code: "IDENTITY_NOT_DERIVED_FROM_URL" });
    const shared = [...idsByUrl.values()].find((ids) => ids.has(p.page_id) && ids.size > 1);
    if (shared) conflicts.push({ pageId: p.page_id, code: "URL_CLAIMED_BY_TWO_IDENTITIES" });
    const obs = (p.observations ?? []).map((id) => observations.get(id)).filter(Boolean).sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at)));
    const fingerprints = obs.filter((o) => typeof o.content_sha256 === "string" && o.content_sha256 !== "").map((o) => ({
      observationId: o.observation_id,
      sha256: o.content_sha256,
      verified: bodies.has(o.observation_id) ? sha(bodies.get(o.observation_id)) === o.content_sha256 : null,
      observedAt: o.observed_at,
    }));
    /* F31 C9 (RR-223): the NEWEST recorded observation decides the served state; an older served one stays in the evidence */
    const newest = obs.at(-1);
    const last = newest && hasServedState(newest) ? newest : null;
    return Object.freeze({
      pageId: p.page_id,
      owner: tenantId,
      fingerprints: Object.freeze(fingerprints),
      servedState: last
        ? Object.freeze({ state: "OBSERVED", status: last.value.status, redirected: Array.isArray(last.value.redirect_chain) && last.value.redirect_chain.length > 0, observedAt: last.observed_at })
        : Object.freeze({ state: "UNKNOWN" }),
      evidence: Object.freeze({ batchId, observationIds: Object.freeze(obs.map((o) => o.observation_id)), ...(batchOf ? { batches: Object.freeze(obs.map((o) => batchOf.get(o.observation_id) ?? batchId)) } : {}) }),
      /* F35 (RR-88): the page's recorded inbound links within the crawled set — a count, read by LINK only over a COMPLETE inventory */
      inboundLinks: Array.isArray(p.inbound_edges) ? p.inbound_edges.length : null,
    });
  });
  return Object.freeze({ tenantId, pages: Object.freeze(pages), conflicts: Object.freeze(conflicts), unplaced: Object.freeze({ ...unplaced }) });
}
