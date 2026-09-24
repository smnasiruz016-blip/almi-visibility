#!/usr/bin/env node
/**
 * Print the product-boundary census: which files under src/ still name a
 * product, in code and in comments, file by file.
 *
 * The test in test/product-boundary.test.mjs enforces the law. This prints the
 * same numbers from the SAME scanner so the report and the gate can never
 * disagree — a second implementation here would eventually give the quieter
 * answer, and the quieter answer is the one that gets believed.
 */
import { neutralityCensus, SHARED_SCOPE } from "../tools/product-boundary.mjs";
import { sealedCorpusCensus, renderCensus } from "../tools/sealed-corpus-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 F02 (24 Sep 2026): the SHARED ENGINE — src/, bin/ and config/ — scanned by the same census the test enforces
 * (tools/product-boundary.mjs neutralityCensus). It printed src/ only, and that is how bin/ and config/ went unseen. */
const r = await neutralityCensus({ repo: REPO });
const byFile = new Map();
for (const b of r.breaches) byFile.set(b.file, (byFile.get(b.file) ?? 0) + 1);
console.log(`PRODUCT BOUNDARY — the shared engine (${SHARED_SCOPE.join("/, ")}/): ${r.files.length} file(s) scanned\n`);
for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${f} 🔴`);
for (const b of r.breaches.slice(0, 40)) console.log(`        ${b.file}:${b.line} [${b.word}] ${b.text.slice(0, 96)}`);
for (const x of r.pinned) console.log(`  PINNED ${x.file}:${x.line} — ${x.why}`);
for (const x of r.stale) console.log(`  🔴 STALE PIN ${x.file} — it matches no line any more`);
const codeLines = r.breaches.length + r.stale.length;
console.log(`\ncode lines naming a client: ${r.breaches.length} · pinned historical lines: ${r.pinned.length} · stale pins: ${r.stale.length} · comment lines: ${r.commentLines} — allowed`);
console.log(codeLines === 0 ? "\n✅ the shared engine names no client in code." : "\n🔴 the shared engine still knows which client it is serving.");

/**
 * 🔴 THE SEALED CORPUS CENSUS — REPLACING THE DETECTOR COUNT, 12 SEPTEMBER 2026.
 *
 * The old rule was "zero detectors", and it ended because checklist items 10,
 * 12 and 13 ARE detectors: keeping it would have forbidden the product.
 *
 * What that rule was really protecting was never "no code" — it was that a
 * detector must not be built from the answers. So the ceiling on FILES is
 * replaced by a seal on the CORPUS: the build fails if anything under
 * src/audit/ so much as names a path inside the case study directory.
 *
 * Printed by the same function the test uses, so report and gate cannot
 * disagree.
 */
const sealed = sealedCorpusCensus(REPO);
console.log("");
console.log(renderCensus(sealed));

process.exit(codeLines === 0 && sealed.breaches.length === 0 ? 0 : 1);
