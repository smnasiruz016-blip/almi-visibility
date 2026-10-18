/**
 * 🔴 RR-248 · A HARNESS'S EVIDENCE GOES TO A NEW, TIMESTAMPED FILE — NEVER OVER AN EARLIER RUN'S.
 *
 * Until RR-248, 54 harnesses wrote their evidence to ONE fixed, dated name (runs/audit/<harness>-2026-09-30.txt and the like), so a
 * re-run silently replaced the committed evidence of the run that proved them. writeEvidenceOnce writes
 * runs/audit/<base>-<yyyy-mm-dd>T<hhmm>.txt with flag "wx" — and when that name is taken (a second run in the same minute) the next free
 * -2, -3 … — and returns the path it wrote. An earlier file is never opened for writing.
 * Run on its own (a bare `node --test` discovers this file) it defines a function and does nothing.
 */
import { badFindingsFirst } from "../../src/report/owner-workflows.mjs"; // RR-287 (F88 C5): bad findings and NOT DONE first
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function writeEvidenceOnce(repo, base, text) {
  const stamp = new Date().toISOString().slice(0, 16).replace(":", "");
  mkdirSync(join(repo, "runs", "audit"), { recursive: true });
  for (let n = 1; n < 100; n++) {
    const rel = `runs/audit/${base}-${stamp}${n > 1 ? `-${n}` : ""}.txt`;
    try { writeFileSync(join(repo, rel), badFindingsFirst(text), { flag: "wx" }); return rel; }
    catch (e) { if (e?.code !== "EEXIST") throw e; }
  }
  throw new Error(`no free evidence name for ${base}-${stamp} — nothing was written`);
}
