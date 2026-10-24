/**
 * 🔴 RR-321 F2 · AN EXPLICIT MODE FOR A SABOTAGE HARNESS (owner: "give the 4 older crawl sabotage harnesses an explicit mode, so all of
 * them can run"). Imported right after harness-gate.mjs; the run says what it is, every time:
 *
 *   SAB_MODE=dry node test/helpers/<harness>.mjs --deliberate    the PRE-FLIGHT only — each limb's span found exactly once in the code
 *                                                                live now; NOTHING is written, no test is run
 *   SAB_MODE=run node test/helpers/<harness>.mjs --deliberate    the real run
 *
 * No SAB_MODE (or another value) refuses with exit 2 and changes nothing — a harness never decides its own mode (RR-310: a DRY=1 that a
 * harness did not read ran it for real).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SAB_MODES = Object.freeze(["dry", "run"]);
export function sabMode(env = process.env, { exit = (c) => process.exit(c), write = (s) => process.stderr.write(s) } = {}) {
  const m = env.SAB_MODE;
  if (SAB_MODES.includes(m)) return m;
  write(`REFUSED — set SAB_MODE=dry (the pre-flight only: each span found once, nothing written, no test run) or SAB_MODE=run (the real run). Got: ${m === undefined ? "none" : JSON.stringify(m)}. Nothing was changed.\n`);
  exit(2);
  return null;
}
/** the dry run: `spans` = [{ id, file, from }] — each `from` counted in its file as it is now; → exits 0 when every one occurs once */
export function dryPreflight(spans, repo, { log = console.log, exit = (c) => process.exit(c) } = {}) {
  /* both read with LF, as the harnesses apply them (rr227's inEol) and as RR-248's span reader counts — a CRLF file on disk is no stale span */
  const lf = (s) => String(s).replace(/\r\n/g, "\n"), count = (t, s) => (s ? lf(t).split(lf(s)).length - 1 : 0);
  const rows = spans.map((s) => ({ ...s, n: count(readFileSync(join(repo, s.file), "utf8"), s.from) }));
  for (const r of rows) log(`DRY ${r.id} ${r.file}: span found ${r.n} time${r.n === 1 ? "" : "s"}${r.n === 1 ? "" : " — NOT EXACTLY ONCE"}`);
  const ok = rows.every((r) => r.n === 1);
  log(`DRY · ${rows.length} limb span(s) · all exactly once: ${ok} · nothing was written, no test was run`);
  exit(ok ? 0 : 1);
  return ok;
}
