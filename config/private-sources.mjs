/**
 * 🔴 RR-274 · WHERE THE FULL TEXTS OF OTHER ORGANISATIONS' PAGES ARE KEPT — PRIVATELY, beside this repository.
 *
 * The owner's decision of 16 Oct 2026 (_handoffs AlmiVisibility_OWNER_DECISION_2026-10-16_RR-274_DATA_REPOSITORY_PUBLIC.md) makes the data
 * repository public; a stored source read's full text, a browser capture and a client's file stay private. They live in the PRIVATE
 * repository that held the data before it was cleaned (smnasiruz016-blip/almi-visibility-data), checked out beside this one as
 * ../almi-visibility-sources, with the same layout as the data root (research/<batch>/...). src/facts/private-texts.mjs reads it.
 *
 * `ALMIVISIBILITY_PRIVATE_SOURCES` overrides the path (absolute, or relative to this repository) — CI and fixtures use it.
 */
export const PRIVATE_SOURCES_ENV = "ALMIVISIBILITY_PRIVATE_SOURCES";

export const PRIVATE_SOURCES = Object.freeze({
  id: "almi-visibility-sources",
  path: "../almi-visibility-sources",
  why: "the full texts of other organisations' pages, kept privately (owner decision RR-274, 16 October 2026)",
});
