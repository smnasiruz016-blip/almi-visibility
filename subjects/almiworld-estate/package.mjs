/**
 * SUBJECT PACKAGE · almiworld-estate — one estate's host inventory and discovery candidates, relocated OUT of the shared
 * engine's configuration (F02, 24 September 2026).
 *
 *   Owner decision (b) RELOCATE: _handoffs/AlmiVisibility_OWNER_DECISION_2026-09-24_F02_RELOCATE_SINGLE_CLIENT_TOOLS.md
 *
 * The shared engine no longer reads a list of this estate's hosts. A run's hosts are the SITE_ORIGIN attachments DECLARED
 * to the tenant it was asked to run for (src/tenancy/scoped-run.mjs `declaredSiteHosts`). The discovery candidates are
 * read from this package only when a run names it (`--subject=almiworld-estate`), and the run still enters through the F02
 * tenant boundary: this location grants no tenant authority.
 */
/** The discovery configuration a run reads when it names this package (--subject=almiworld-estate). */
export * as AXIS_CANDIDATES from "./config/axis-candidates.mjs";
export * as INTENT_LEXICON from "./config/intent-lexicon.mjs";
export * as ESTATE_HOSTNAMES from "./config/estate-hostnames.mjs";
export { REPLAY_TARGETS } from "./config/replay-targets.mjs";

export const SUBJECT_PACKAGE = Object.freeze({
  subjectId: "almiworld-estate",
  owns: Object.freeze([
    Object.freeze({ file: "config/estate-hostnames.mjs", relocatedFrom: "config/estate-hostnames.mjs", state: "LIVE" }),
    Object.freeze({ file: "config/axis-candidates.mjs", relocatedFrom: "config/discovery/axis-candidates.mjs", state: "LIVE" }),
    /* Not in the owner's list by name: it is the same kind of material (occupation and intent words drawn from this
     * estate's own queries), and it was the one remaining subject word in shared config. Relocated — not edited — because
     * editing it would change discovery verdicts, which the decision forbids (rule 9). */
    Object.freeze({ file: "config/replay-targets.mjs", relocatedFrom: "bin/replay-crawl.mjs (its five named targets)", state: "LIVE" }),
    Object.freeze({ file: "config/intent-lexicon.mjs", relocatedFrom: "config/discovery/intent-lexicon.mjs", state: "LIVE" }),
  ]),
  /** Host fragments shared engine code must never contain. */
  vocabulary: Object.freeze(["almiworld.com"]),
});
