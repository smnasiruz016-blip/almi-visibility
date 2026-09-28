/**
 * 🔴 DEFERRED LIMBS — a limb an owner ruling took OUT of a row's current scope, with the CHECKABLE event that reopens it.
 *
 * A limb here is NOT MEASURED: never PASS, never zero. Its row's verdict does not cover it, and no output may describe that verdict
 * as proof about it. The reopening event is checked by code, not remembered: `deferredLimbFaults` (tools/paid-metered-call-census.mjs)
 * fails as soon as the event has happened while the limb still stands NOT MEASURED.
 *
 * Copied from committed rulings, never authored here.
 */
export const DEFERRED_LIMBS = Object.freeze([
  Object.freeze({
    featureId: "F77",
    limb: "R2P",
    name: "paid providers",
    state: "NOT_MEASURED",
    /* the event that reopens it — measured by the paid and metered call-path census */
    reopensWhen: "REAL_PAID_PROVIDER_DECLARED",
    scopeSentence: "Today's F77 verdict does not cover any paid provider or any paid call path: that limb is NOT MEASURED, and no F77 verdict is proof about a paid provider.",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-28_RR-82_F77/RULINGS_2_1_2_2_2_3.txt", commit: "a726cc3", sha256: "cd920432e28b3b764818baa14962e897e271101012341ff0f6fa90bb14c964a8" }),
  }),
]);
