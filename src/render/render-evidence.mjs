/**
 * 🔴 RR-138 §2 · SHARED RENDER EVIDENCE — ONE COLLECTION, STORED ONCE, READ BY NAMED ROWS, EACH ROW STILL JUDGED ON ITS OWN.
 *
 * One live same-origin collection renders each page up to three ways, and the evidence is stored ONCE through the governed path:
 *   SOURCE   JavaScript OFF, desktop viewport, served only from what the page's own renders fetched (F22's source side)
 *   DESKTOP  JavaScript ON, desktop viewport (F22's rendered side, and F25's desktop render)
 *   MOBILE   JavaScript ON, mobile viewport (F25)
 * Every record names WHICH ROWS READ IT (`readBy`), so no row can later claim evidence it never read. Shared evidence never means a
 * shared verdict: each row's audit reads the records it is named in and judges its own frozen clauses (bin/render-audit.mjs,
 * bin/mobile-audit.mjs with --evidence-batch).
 *
 * The record carries counts, hashes, the render's state and reason, the declared viewport and the layout boxes — never page content.
 * The rendered DOM and its visible text go to the local corpus (git-ignored) through the governed body write, each verifiable against
 * the hash its record carries. Generic: nothing here names a client, host or path.
 */
import { makeObservation } from "../evidence/records.mjs";
import { sha256Hex } from "../evidence/ids.mjs";
import { RENDERER_COLLECTOR, RENDERER_VERSION } from "./renderer.mjs";

export const RENDER_KINDS = Object.freeze({ SOURCE: "SOURCE", DESKTOP: "DESKTOP", MOBILE: "MOBILE" });
/** Which rows read which kind — fixed here, so a record's readers are never chosen by the caller. */
export const READERS_OF = Object.freeze({ SOURCE: Object.freeze(["F22"]), DESKTOP: Object.freeze(["F22", "F25"]), MOBILE: Object.freeze(["F25"]) });
export const MOBILE_VIEWPORT = Object.freeze({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
export const DESKTOP_VIEWPORT = Object.freeze({ width: 1366, height: 768, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
export const VIEWPORT_OF = Object.freeze({ SOURCE: DESKTOP_VIEWPORT, DESKTOP: DESKTOP_VIEWPORT, MOBILE: MOBILE_VIEWPORT });

/**
 * One render of one page, as a RENDERED observation of the page's own source observation.
 * @param {{ sourceObservation: object, kind: string, result: object, observedAt: string, liveDocumentSha256: string|null }} o
 */
export function renderEvidenceObservation({ sourceObservation, kind, result, observedAt, liveDocumentSha256 = null }) {
  if (!Object.hasOwn(RENDER_KINDS, kind)) throw new TypeError(`renderEvidenceObservation: kind ${kind} is not one of ${Object.keys(RENDER_KINDS).join("|")}`);
  if (sourceObservation?.record_type !== "observation" || !sourceObservation.observation_id) throw new TypeError("renderEvidenceObservation: the source must be a stored observation");
  return makeObservation({
    observed_at: observedAt,
    method: `render.chromium.${kind.toLowerCase()}:${result.renderState}`,
    target: sourceObservation.target,
    content_sha256: result.html == null ? sha256Hex(`<no-render:${kind}:${result.reason}>`) : sha256Hex(result.html),
    journey: null,
    collector: RENDERER_COLLECTOR,
    collector_version: RENDERER_VERSION,
    value: {
      renderMode: "RENDERED",
      kind,
      readBy: [...READERS_OF[kind]],
      viewport: { ...VIEWPORT_OF[kind] },
      javaScript: kind !== "SOURCE",
      renderState: result.renderState,
      reason: result.reason,
      source_observation_id: sourceObservation.observation_id,
      source_content_sha256: sourceObservation.content_sha256,
      live_document_sha256: liveDocumentSha256,
      visible_text_sha256: result.visibleText == null ? null : sha256Hex(result.visibleText),
      layout: result.layout ?? null,
      bytes: result.html == null ? null : Buffer.byteLength(result.html, "utf8"),
      duration_ms: result.duration_ms ?? null,
      timedOut: Boolean(result.timedOut),
      requests: result.requests ?? null,
    },
  });
}

/** The run's own record: its bounds, what it spent, how it paced, and what was refused — counts only. */
export function renderRunRecord({ runId, startedAt, finishedAt, pages, bounds, requestsIssued, pacing, refusedByReason, renderStates, sourceBatch }) {
  return {
    record_type: "render_run",
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    source_batch: sourceBatch,
    pages,
    readBy: ["F22", "F25"],
    bounds,
    requestsIssued,
    pacing,
    refusedByReason,
    renderStates,
    cost: { provider: "self-operated-renderer", amount: null, amountState: "UNKNOWN", basis: "self-operated; no paid provider; the crawled host's hosting cost is not measured (U-COST-5)" },
  };
}
