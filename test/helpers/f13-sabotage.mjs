/**
 * 🔴 F13 · CONTEXT AND AXIS DISCOVERY · ONE SABOTAGE PER SAFEGUARD (RR-131 §3).
 *
 *   node test/helpers/f13-sabotage.mjs      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f13-sabotage-rr131-2026-10-02.txt (its own file).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { PRODUCT_WORDS } from "../../tools/product-boundary.mjs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AX = "src/discovery/context-axes.mjs", RD = "src/discovery/context-axes-reader.mjs", B = "bin/context-axes.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f13-context-axes.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C1 = "C1 · FIRING CONTROL", C2 = "C2 · FIRING CONTROL", C3 = "C3 · FIRING CONTROL", C4 = "C4 · FIRING CONTROL", C5 = "C5 · FIRING CONTROL", C6 = "C6 · FIRING CONTROL", TWO = "C6 · TWO UNRELATED PRODUCTS", REAL = "REAL ·", ENTRY = "C6 · THE ENTRY POINT", NET = "the discovery and its reader";
const PW = PRODUCT_WORDS[0];

const SABOTAGES = [
  ["X1", "C1 a record counts once per key, however often the key repeats", AX, "for (const [k, vs] of byKey) { add(k, KIND.FACT_QUALIFIER, vs[0], r?.verificationState === \"VERIFIED\");", "for (const [k, vs] of byKey) { for (const v of vs) add(k, KIND.FACT_QUALIFIER, v, r?.verificationState === \"VERIFIED\");", C1],
  ["X2", "C1 a value's text never leaves the discovery", AX, "distinctValues: d.values.size, verified: d.verifiedRecords > 0 }))", "distinctValues: d.values.size, values: [...d.values], verified: d.verifiedRecords > 0 }))", C1],
  ["X3", "C1 the declared page language is read from the body", AX, "const LANG = /<html\\b[^>]*?\\blang\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))/i;", "const LANG = /(?!)()()()/;", C1],
  ["X4", "C2 a declared dimension is EVIDENCED only with a carrying record", AX, "status: keys.has(key) ? STATUS.EVIDENCED : STATUS.NOT_EVIDENCED", "status: STATUS.EVIDENCED", C2],
  ["X5", "C2 a candidate is a discovered dimension NOT declared", AX, "candidates: [...keys].filter((k) => !declaredSet.includes(k)).sort()", "candidates: [...keys].sort()", C2],
  ["X6", "C3 VERIFIED records are counted apart", AX, "d[verified ? \"verifiedRecords\" : \"unverifiedRecords\"] += 1;", "d.verifiedRecords += 1;", C3],
  ["X7", "C3 a served page is never a VERIFIED record", AX, "add(\"lang\", KIND.PAGE_LANGUAGE, lang, false);", "add(\"lang\", KIND.PAGE_LANGUAGE, lang, true);", C3],
  ["X8", "C4 an unread registry is NOT MEASURED and named", AX, "  if (facts === null) notMeasured.push({ kind: KIND.FACT_QUALIFIER, missing: MISSING.registry });", "  if (facts === null) facts = [];", C4],
  ["X9", "C4 an empty page set is NOT MEASURED, never a measured zero", AX, "pages: pages === null || pages.length === 0 ? NOT_MEASURED : pageCounts,", "pages: pageCounts,", C4],
  ["X10", "C4 a truncated body is NOT MEASURED, never read", AX, "      if (p.truncated) { pageCounts.truncatedNotMeasured += 1; continue; }", "", C4],
  ["X11", "C4 a page declaring no language is never assigned one", AX, "if (lang === null) { pageCounts.declaringNone += 1; continue; }", "if (lang === null) { pageCounts.declaringNone += 1; }", C4],
  ["X12", "C5 no minimum decides discovery", AX, "  const discovered = [...dims.values()]\n", "  const discovered = [...dims.values()].filter((d) => d.records >= 2)\n", C5],
  ["X13", "C6 the code names no product", AX, "export const NOT_MEASURED = \"NOT MEASURED\";", `const PLANTED = "${PW}";\nexport const NOT_MEASURED = "NOT MEASURED";`, C6],
  ["X14", "C6 the code names no dimension", AX, "export const NOT_MEASURED = \"NOT MEASURED\";", "const PLANTED_DIM = \"profession\";\nexport const NOT_MEASURED = \"NOT MEASURED\";", C6],
  ["X15", "C2 the declared dimensions come from the product's own descriptor", RD, "  ...(product?.axis?.key ? [product.axis.key] : []),\n", "", C2],
  ["X16", "C6 each product's evidence comes from its own registry only", RD, "  try { facts = (await loadRegistry(product.factsDir, product.productId)).records; } catch { facts = null; }", "  try { facts = [...(await loadRegistry(product.factsDir, product.productId)).records, { claim: { qualifier: \"planted=1\" }, verificationState: \"UNVERIFIED\" }]; } catch { facts = null; }", TWO],
  ["X17", "C6 the entry point says values are not printed", B, "· ${d.distinctValues} distinct value(s) (values not printed)", "· ${d.distinctValues} distinct value(s)", ENTRY],
  ["X18", "C6 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, NET],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F13 axis discovery sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [], reasons = "";
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
    reasons = [...new Set([...`${r.stdout}${r.stderr}`.matchAll(/^\s+(AssertionError|TypeError|ReferenceError|SyntaxError|Error)\b/gm)].map((m) => m[1]))].join("/") || "none";
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored && !/SyntaxError/.test(reasons);
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f13-sabotage-rr131-2026-10-02.txt"), lines.join("\n").split(PRODUCT_WORDS[0]).join("<planted product word>") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
