/**
 * 🔴 F06 CORRECTION (owner ruling, 24 September 2026) · THE COMPATIBILITY READING OF A HISTORICAL ARTEFACT.
 *
 * ── WHAT THIS IS FOR ─────────────────────────────────────────────────────────
 *
 * Row 7's market measurement of 15 September 2026 is byte-pinned evidence. It was written before F06 and labels three
 * dimensions it never measured UNKNOWN. Under F06, UNKNOWN means "the check was reached and could not be established";
 * a measurement that was never performed is NOT_MEASURED. The artefact is NOT edited, regenerated, replaced or
 * re-dated. Its UNKNOWN is superseded for canonical interpretation only, and only through this reading.
 *
 * ── THE RULE — POSITIVE STRUCTURE, NEVER THE LABEL, NEVER AN ABSENCE ─────────
 *
 * Every labelled element keeps its `originalState` exactly as stored. `canonicalEvidenceState` is NOT_MEASURED only
 * where the artefact's own stored structure INDEPENDENTLY proves the measurement was not performed: for the deferred
 * dimensions that is the declared boolean `measured: false`, written by the producer on each dimension it did not
 * measure. Everything else is UNMAPPED, with its reason. The old label never decides, and an empty or absent field is
 * never proof: `measured` missing, or anything but the boolean false, is UNMAPPED.
 *
 * The reading is bound to the exact bytes by their full sha256. Other bytes are refused rather than read, so the
 * tolerance can never be borrowed by a new artefact.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { UNMAPPED } from "./evidence-state.mjs";

export const LEGACY_MARKET_MEASUREMENT = Object.freeze({
  path: "runs/discovery/market-measurement-2026-09-15.json",
  sha256: "34bcac0714db248e16a342a0a57f2b72bc97be9e41fffff71eb3f67fd152d2bd",
  writtenOn: "2026-09-15",
  predates: "F06 (canonical evidence states, merged to main e11d143 on 24 September 2026)",
  supersededFor: "canonical interpretation only — the bytes stand as recorded",
});

/** Every labelled element of the 15 September artefact: where it is, and the field that carries the label. */
export const LEGACY_MARKET_ELEMENTS = Object.freeze([
  Object.freeze({ path: "$.coverage.label", at: (a) => a?.coverage, field: "label" }),
  Object.freeze({ path: "$.coverage.explanation.label", at: (a) => a?.coverage?.explanation, field: "label" }),
  Object.freeze({ path: "$.discrepancy.observed.label", at: (a) => a?.discrepancy?.observed, field: "label" }),
  Object.freeze({ path: "$.discrepancy.explanation.label", at: (a) => a?.discrepancy?.explanation, field: "label" }),
  Object.freeze({ path: "$.dataLag.label", at: (a) => a?.dataLag, field: "label" }),
  Object.freeze({ path: "$.dataLag.final.label", at: (a) => a?.dataLag?.final, field: "label" }),
  ...["SUPPLY", "AUDIENCE_NEED", "WORTHINESS"].map((k) =>
    Object.freeze({ path: `$.dimensions.${k}.state`, at: (a) => a?.dimensions?.[k], field: "state", deferred: true }),
  ),
]);

export const NOT_PERFORMED_BASIS = "DECLARED_MEASURED_FALSE";

const sha = (text) => createHash("sha256").update(text).digest("hex");

/** One element, read. Lossless: `originalState` is the stored literal, unchanged. */
function readElement(artefact, el) {
  const node = el.at(artefact);
  const originalState = node?.[el.field];
  const base = { path: el.path, originalState: originalState === undefined ? null : originalState };
  if (el.deferred && node && node.measured === false) {
    return Object.freeze({ ...base, canonicalEvidenceState: "NOT_MEASURED", basis: NOT_PERFORMED_BASIS, noMeasurementReason: node.why ?? null });
  }
  const why = el.deferred
    ? `no positive record that the measurement was not performed — "measured" reads ${JSON.stringify(node?.measured)}, and only the declared boolean false proves it`
    : "the 15 September label pre-dates F06, and nothing in the stored structure independently proves which canonical state it is";
  return Object.freeze({ ...base, canonicalEvidenceState: UNMAPPED, unmapped: true, why });
}

/** The compatibility reading of a parsed artefact. The caller is responsible for having verified its bytes. */
export function marketMeasurementCompat(artefact) {
  return Object.freeze(LEGACY_MARKET_ELEMENTS.map((el) => readElement(artefact, el)));
}

/** True only for the exact 15 September bytes (the text as `JSON.stringify(x, null, 2)` plus a newline writes it). */
export function isLegacyMarketBytes(text) {
  return typeof text === "string" && sha(text.replace(/\r\n/g, "\n")) === LEGACY_MARKET_MEASUREMENT.sha256;
}
export const isLegacyMarketArtefact = (artefact) => isLegacyMarketBytes(`${JSON.stringify(artefact, null, 2)}\n`);

/** Read the pinned artefact from a repository root, refusing any other bytes. */
export function readLegacyMarketMeasurement(repoRoot) {
  const text = readFileSync(join(repoRoot, LEGACY_MARKET_MEASUREMENT.path), "utf8");
  if (!isLegacyMarketBytes(text)) {
    throw new Error(`${LEGACY_MARKET_MEASUREMENT.path} is not the pinned 15 September bytes (sha256 ${LEGACY_MARKET_MEASUREMENT.sha256}) — the historical artefact is never rewritten, and other bytes are not read as it`);
  }
  const artefact = JSON.parse(text);
  return Object.freeze({ artefact, elements: marketMeasurementCompat(artefact) });
}
