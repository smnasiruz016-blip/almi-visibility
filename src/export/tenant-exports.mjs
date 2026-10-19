/**
 * 🔴 F80 · READ-ONLY EXPORTS PER TENANT, ON A VERSIONED SCHEMA (acceptance _handoffs AlmiVisibility_F80_ACCEPTANCE_2026-10-19.md, RR-291;
 * owner answer Q7: "the first version is READ-ONLY exports (JSON and CSV files); no write actions through the API").
 *
 * One tenant's check results as JSON and CSV, built by the engine's own exporters (src/export/exporters.mjs: the provenance rides inside the
 * file, a state is never upgraded, null is an empty cell). Every row is checked against EXPORT_SCHEMA before it is exported, and the schema
 * version is in the file. This module builds text only: it has no write, delete or update action — the API's first version reads. Which
 * tenant's records reach it is decided by the scope gate of the entry point that reads them (F02), never here.
 * Generic: it names no client, product or host.
 */
import { provenanceBlock, toJson, toCsv } from "./exporters.mjs";

export const EXPORT_SCHEMA = Object.freeze({
  name: "visibility-check-results",
  version: "1.0.0",
  fields: Object.freeze([
    Object.freeze({ name: "url", type: "string", required: true }),
    Object.freeze({ name: "check", type: "string", required: true }),
    Object.freeze({ name: "category", type: "string", required: true }),
    Object.freeze({ name: "weight", type: "number", required: true }),
    Object.freeze({ name: "result", type: "string", required: true, oneOf: Object.freeze(["PASS", "FAIL", "NOT MEASURED"]) }),
    Object.freeze({ name: "finding", type: "string", required: false }),
    Object.freeze({ name: "action", type: "string", required: false }),
    Object.freeze({ name: "evidenceId", type: "string", required: false }),
  ]),
});
/** The API's actions in this version — read only. */
export const API_ACTIONS = Object.freeze(["EXPORT_JSON", "EXPORT_CSV"]);

/** Every row against the schema: a missing required field, a wrong type, a value outside oneOf, or an unknown field is a fault, named. */
export function schemaFaults(rows, schema = EXPORT_SCHEMA) {
  const names = new Set(schema.fields.map((f) => f.name));
  const faults = [];
  rows.forEach((r, i) => {
    for (const f of schema.fields) {
      const v = r[f.name];
      if (v === undefined || v === null) { if (f.required) faults.push(`row ${i}: ${f.name} missing`); continue; }
      if (typeof v !== f.type) faults.push(`row ${i}: ${f.name} is ${typeof v}, not ${f.type}`);
      if (f.oneOf && !f.oneOf.includes(v)) faults.push(`row ${i}: ${f.name} "${v}" is not one of ${f.oneOf.join(" / ")}`);
    }
    for (const k of Object.keys(r)) if (!names.has(k)) faults.push(`row ${i}: ${k} is not in schema ${schema.version}`);
  });
  return faults;
}

/** The export of one tenant's results: JSON and CSV, each with its provenance and schema version. Refused when any row breaks the schema. */
export function tenantExport({ tenantId, results, generatedAt, bounds }) {
  const rows = results.map((r) => Object.fromEntries(EXPORT_SCHEMA.fields.map((f) => [f.name, r[f.name] ?? null]).filter(([, v]) => v !== null)));
  const faults = schemaFaults(rows);
  if (faults.length) return Object.freeze({ state: "REFUSED", faults });
  const provenance = provenanceBlock({ title: `${EXPORT_SCHEMA.name} ${EXPORT_SCHEMA.version} · ${tenantId}`, generatedAt, covers: [`the check results of tenant ${tenantId} only`], doesNotCover: ["any other tenant's records", "any write action — this export is read-only"], states: { schema: EXPORT_SCHEMA.version }, bounds });
  return Object.freeze({
    state: "EXPORTED",
    rows: rows.length,
    json: toJson({ provenance, data: { schema: { name: EXPORT_SCHEMA.name, version: EXPORT_SCHEMA.version }, rows } }),
    csv: toCsv({ provenance, columns: EXPORT_SCHEMA.fields.map((f) => f.name), rows }),
  });
}
