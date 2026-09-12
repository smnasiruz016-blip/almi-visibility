/**
 * OFFICIAL SOURCE — why `vercel.json` sets `git.deploymentEnabled: false`.
 *
 * 🔴 WE DO NOT ACT ON A REMEMBERED API. The setting in `vercel.json` is taken
 * from Vercel's own documentation as read on a named date, and this record says
 * who read it and what it said, so the setting can be re-checked against its
 * source rather than against anyone's memory.
 *
 * ⚠️ Read by the owner's technical lead in a browser on 12 September 2026 and
 * supplied in the brief. It was NOT re-fetched by this repository — that brief
 * permitted no live fetch beyond one preview URL — so the quote is carried as
 * given, and `reviewer` says exactly that.
 *
 * WHY THE SETTING EXISTS: waste, not security. This repository has no web
 * application, and Vercel Authentication ("Require Log In", Standard Protection)
 * was already on — see U-DEP-3 in PHASE_0_FROZEN_GAP_REGISTER.md.
 */

import { makeSource } from "../../src/evidence/records.mjs";

export const VERCEL_GIT_CONFIGURATION = Object.freeze({
  record: makeSource({
    source_id: "vercel-docs-git-configuration",
    source_url: "https://vercel.com/docs/project-configuration/git-configuration",
    source_tier: "OFFICIAL",
    publisher: "Vercel",
    retrieved_at: "2026-09-12",
    recheck_after: null,
    reviewer: "beta-g (owner's technical lead), read in a browser 2026-09-12; not re-fetched by this repository",
    excerpt_ref: "git.deploymentEnabled",
    confidence: null,
  }),
  quote: "To turn off automatic deployments for all branches, set the property value to false.",
  governs: Object.freeze({ file: "vercel.json", path: "git.deploymentEnabled", value: false }),
});
