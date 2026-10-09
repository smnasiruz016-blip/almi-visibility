/**
 * 🔴 F78 · ACCEPTANCE AMENDMENT 1 (A1) — THE FROZEN PRE-BOUNDARY GAP LIST, copied byte for byte from the amendment's canonical JSON
 * (_handoffs d2bfd22, AlmiVisibility_F78_ACCEPTANCE_AMENDMENT_1_2026-10-09.md). Its canonical JSON — JSON.stringify of the list below —
 * hashes to PRE_BOUNDARY_GAP_LIST_SHA256, the hash C1's frozen words name; test/rr243-f78-cost.test.mjs re-derives it.
 *
 * A gap dated before BOUNDARY that this list names is reported on every F78 read and never disproves C1; one it does not name is
 * UNLISTED and disproves C1; any gap dated on or after BOUNDARY disproves C1. The list only ever changes by a later amendment.
 * Kinds: a ledger part read MEASURABLE_BUT_NOT_RECORDED (ref: "<entry_id> · <part>"); a run whose trail records an opened connector and
 * no cost entry (ref: its run id); a committed run record from before the connectors existed (ref: its blob sha256 — never a name).
 */
export const BOUNDARY = "2026-10-09";
export const PRE_BOUNDARY_GAP_LIST_SHA256 = "a38fd23ee10d9d3c84397d74eb894bfa6d4d7a7bd78c766fb21874270c49dacb";
export const GAP_KINDS = Object.freeze(["LEDGER_PART_NOT_RECORDED", "CONNECTOR_RUN_NOT_LEDGERED", "PRE_CONNECTOR_RUN_NOT_LEDGERED"]);
export const PRE_BOUNDARY_GAPS = Object.freeze([
  Object.freeze({"id":"PBG-01","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-11T22:58:51.912Z · founderTime"}),
  Object.freeze({"id":"PBG-02","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T00:15:14.660Z · founderTime"}),
  Object.freeze({"id":"PBG-03","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T00:15:15.685Z · founderTime"}),
  Object.freeze({"id":"PBG-04","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T00:15:15.685Z · providerCalls"}),
  Object.freeze({"id":"PBG-05","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T00:16:19.426Z · founderTime"}),
  Object.freeze({"id":"PBG-06","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T00:16:19.426Z · providerCalls"}),
  Object.freeze({"id":"PBG-07","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T00:16:20.518Z · founderTime"}),
  Object.freeze({"id":"PBG-08","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T00:16:20.518Z · providerCalls"}),
  Object.freeze({"id":"PBG-09","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T00:36:17.340Z · founderTime"}),
  Object.freeze({"id":"PBG-10","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T00:36:17.340Z · providerCalls"}),
  Object.freeze({"id":"PBG-11","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T02:44:15.609Z · founderTime"}),
  Object.freeze({"id":"PBG-12","kind":"LEDGER_PART_NOT_RECORDED","date":"2026-09-12","ref":"gsc-ingest:2026-09-12T22:06:42.662Z · founderTime"}),
  Object.freeze({"id":"PBG-13","kind":"CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-30","ref":"run:bin/crawl.mjs:tenant-scope:2026-09-30T22:59:48Z"}),
  Object.freeze({"id":"PBG-14","kind":"CONNECTOR_RUN_NOT_LEDGERED","date":"2026-10-03","ref":"run:bin/render-collect.mjs:tenant-scope:2026-10-03T01:25:55Z"}),
  Object.freeze({"id":"PBG-15","kind":"CONNECTOR_RUN_NOT_LEDGERED","date":"2026-10-04","ref":"run:bin/collect-public-questions.mjs:tenant-scope:2026-10-04T01:16:18Z"}),
  Object.freeze({"id":"PBG-16","kind":"CONNECTOR_RUN_NOT_LEDGERED","date":"2026-10-08","ref":"run:bin/crawl.mjs:tenant-scope:2026-10-08T18:17:00Z"}),
  Object.freeze({"id":"PBG-17","kind":"PRE_CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-10","ref":"engine:sha256:34d5d0feb4d89a6f70295efeed12116bfb97e19a696aa5795d72388365ce3d4d"}),
  Object.freeze({"id":"PBG-18","kind":"PRE_CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-10","ref":"engine:sha256:5db8e851896633d38f61a1667f0b221ffc85ca1af35b59ee0961530e4c1dcee3"}),
  Object.freeze({"id":"PBG-19","kind":"PRE_CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-10","ref":"engine:sha256:649959c5de6e2761f525fa22a1a3fdb2ffcc20a3cb033e76af1b66ba8ee41199"}),
  Object.freeze({"id":"PBG-20","kind":"PRE_CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-10","ref":"engine:sha256:b76328409f080cff5d9296c9832dd8ef97a7b508ad8e455da4d15f946c3c34db"}),
  Object.freeze({"id":"PBG-21","kind":"PRE_CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-10","ref":"engine:sha256:c653ef921f928ecf49d3f7e829a8fefd935709a1232c258bffd73b4a22dc8dc5"}),
  Object.freeze({"id":"PBG-22","kind":"PRE_CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-10","ref":"engine:sha256:dcc316b8e49c4aade6953df29343554eff4a5588df1a6b6cc59cb851818d294f"}),
  Object.freeze({"id":"PBG-23","kind":"PRE_CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-10","ref":"engine:sha256:eaed6c70448f18fe3b17b8102b8eac4aaed8cd1d3ca34d502e5e141f1841243d"}),
  Object.freeze({"id":"PBG-24","kind":"PRE_CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-15","ref":"engine:sha256:520c311e89c3832c7a69c973ccb56e20eb7cdb604215eef81fa86f597c3b303d"}),
  Object.freeze({"id":"PBG-25","kind":"PRE_CONNECTOR_RUN_NOT_LEDGERED","date":"2026-09-21","ref":"data:sha256:9a3f030752162969dd42c57d77bce6b1d73c0e8dce6fdab682ea9ae120d5ebb6"}),
]);
