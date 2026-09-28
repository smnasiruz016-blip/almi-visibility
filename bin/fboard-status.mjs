#!/usr/bin/env node
/**
 * 🔴 THE ACTIVE F-BOARD'S PRODUCTION ENTRY POINT — F01–F90, the state split (summing to 90) and F-progress.
 *
 *   node bin/fboard-status.mjs [--check] [--now=YYYY-MM-DD]
 *
 * Builds the board from the specification's capabilities and the declared rows, and checks it — including that every
 * frozen acceptance is the CURRENT authority in the migrated corpus (§6A: the register resolves its own defining ruling
 * like any other record). The historical 61/38 ledger is reported apart and never counted. `--check` exits 1 on any
 * board error.
 */
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress } from "../src/fboard/board.mjs";

const now = process.argv.find((a) => a.startsWith("--now="))?.slice(6) ?? CORPUS_PROVENANCE.now;
export function fboardStatus(now) {
  const board = buildBoard(CAPABILITIES, DECLARED);
  const errors = boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now } });
  return { board, errors, ...progress(board) };
}
const s = fboardStatus(now);
console.log(`F-board: ${s.total} rows · ${Object.entries(s.split).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(" · ")} · sum ${Object.values(s.split).reduce((a, b) => a + b, 0)}`);
console.log(`F-progress: ${s.passed}/${s.denominator}`);
for (const r of s.board.filter((x) => x.state !== "UNASSESSED")) console.log(`  ${r.featureId} ${r.state}${r.blocker ? ` — ${r.blocker}` : ""}`);
for (const e of s.errors) console.log(`  ERROR ${e.code} ${e.id ?? ""} — ${e.why}`);
if (process.argv.includes("--check") && s.errors.length) process.exit(1);
