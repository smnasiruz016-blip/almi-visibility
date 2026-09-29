/**
 * 🔴 F35 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs da659bd EVIDENCE; RR-88 §4).
 *
 *   node test/helpers/f35-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f35-sabotage-2026-09-29.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AD = "src/page/action-decision.mjs", BIN = "bin/page-actions.mjs", CP = "tools/need-coverage-call-paths.mjs", SI = "src/crawl/scope-inventory.mjs";
const T = "test/f35-action-decision.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C3 CREATE needs strong demand", AD, `if (strongDemand(demand)) actions.push(chosen("CREATE",`, `if (true) actions.push(chosen("CREATE",`, "C3 ·"],
  ["S2", "C3 strong means three agreeing categories", AD, `const strongDemand = (d) => d?.outcome === "STRONG" && Number(d.independentCategories) >= 3 && d.conflict !== true;`, `const strongDemand = (d) => d?.outcome === "STRONG";`, "C3 ·"],
  ["S3", "C3 CREATE needs an established right", AD, `if (rte?.outcome === "ESTABLISHED" && ex?.mayProduce === true) {`, "if (ex?.mayProduce === true) {", "C3 ·"],
  ["S4", "C3 the missing demand is named", AD, "else if (demand === null || demand === undefined) missing.push(", "else if (false) missing.push(", "C3 ·"],
  ["S5", "C4 IMPROVE on a covering page with a defect", AD, `if (ex?.outcome === "IMPROVE") actions.push(`, "if (false) actions.push(", "C4 ·"],
  ["S6", "C4/C5 KEEP never without recorded quality", AD, "if (e.quality?.satisfiesIntent === true) actions.push(", "if (true) actions.push(", "C5 · the existing-page rules"],
  ["S7", "C5 REJECT only for a doorway-like reason", AD, `if (rte?.parts?.specific?.state === "FAIL" && rte.parts.specific.kind === "REJECT") {`, `if (rte?.parts?.specific?.state === "FAIL") {`, "C5 · REJECT only"],
  ["S8", "C5 FIX on a recorded contradiction", AD, `if (e.signals?.state === "CONTRADICTED") fixEvidence.push(`, "if (false) fixEvidence.push(", "C5 · the existing-page rules"],
  ["S9", "C5 FIX on a non-successful served state", AD, `if (e.servedState?.state === "OBSERVED" && !served) fixEvidence.push(`, "if (false) fixEvidence.push(", "C5 · the existing-page rules"],
  ["S10", "RR-89 a properly evidenced MERGE is chosen (suppression control)", AD, "if (successor) actions.push(chosen(\"MERGE\",", "if (false) actions.push(chosen(\"MERGE\",", "RR-89 · REAL, both controls"],
  ["S11", "C5 LINK only over a COMPLETE inventory", AD, `if (e.completeness === "COMPLETE") actions.push(chosen("LINK"`, `if (true) actions.push(chosen("LINK"`, "C5 · the existing-page rules"],
  ["S12", "C5 REFRESH on a stale fact", AD, "if ((e.staleFacts ?? []).length) actions.push(", "if (false) actions.push(", "C5 · the existing-page rules"],
  ["S13", "C5 NOINDEX needs the owner-approval path", AD, "if (e.postPublication?.weakResult === true && e.postPublication.ownerApprovalPath === true)", "if (e.postPublication?.weakResult === true)", "C5 · the existing-page rules"],
  ["S14", "C5 REMOVE needs all three facts", AD, "if (e.removal?.notServed === true && e.removal.noSuccessor === true && e.removal.noDemand === true)", "if (e.removal?.notServed === true && e.removal.noSuccessor === true)", "C5 · the existing-page rules"],
  ["S15", "C5 REDIRECT on not served with a REVIEWED successor", AD, "if (notServed && successor) actions.push(chosen(\"REDIRECT\"", "if (false) actions.push(chosen(\"REDIRECT\"", "C2 ·"],
  ["S16", "C2 contradicting actions cannot decide", AD, "return names.length > 1 && names.some((n) => EXCLUSIVE.includes(n));", "return false;", "C2 ·"],
  ["S17", "C2 CANNOT DECIDE names its missing facts", AD, `missing: Object.freeze(why.length ? why : ["no action's evidence rule is met"]) });`, "missing: Object.freeze([]) });", "C2 ·"],
  ["S18", "C6 every action is a recommendation", AD, `export const STANDING = "RECOMMENDATION";`, `export const STANDING = "APPROVED";`, "C1/C6 ·"],
  ["S19", "C6 the four owner-approval actions", AD, `export const OWNER_APPROVAL = Object.freeze(["MERGE", "NOINDEX", "REMOVE", "REDIRECT"]);`, `export const OWNER_APPROVAL = Object.freeze(["NOINDEX", "REMOVE", "REDIRECT"]);`, "C1/C6 ·"],
  ["S20", "C1 every action carries its evidence", AD, "evidence: Object.freeze([...new Set(evidence.filter(Boolean))]) });", "evidence: Object.freeze([]) });", "C1/C6 ·"],
  ["S21", "RR-89 a shared need alone is no successor (unreviewed-pair control)", AD, "const successor = reviewed.length > 0;", "const successor = (e.sameNeedPeers ?? []).length > 0;", "RR-89 · FIRING CONTROL"],
  ["S22", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 ·"],
  ["S23", "C6/C7 the entry point declares the shared store it reads", BIN, `RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), RESOURCES.evidenceStore()] });`, `RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID)] });`, "C6/C7 · THE ENTRY POINT"],
  ["S24", "C5 LINK's input counts the recorded inbound links", SI, "inboundLinks: Array.isArray(p.inbound_edges) ? p.inbound_edges.length : null,", "inboundLinks: Array.isArray(p.inbound_edges) ? 0 : null,", "C5 · LINK's input"],
  ["S25", "C5 an absent inbound list is unknown, never 0", SI, "inboundLinks: Array.isArray(p.inbound_edges) ? p.inbound_edges.length : null,", "inboundLinks: Array.isArray(p.inbound_edges) ? p.inbound_edges.length : 0,", "C5 · LINK's input"],
  ["S26", "RR-89 a review must compare every aspect", AD, "SEMANTIC_ASPECTS.every((a) => review.compared?.includes(a)) && ", "", "RR-89 · what a review must show"],
  ["S27", "RR-89 a review must find one intent duplicated or split", AD, "(review.duplicate === true || review.splitsOneIntent === true)", "(review.duplicate !== undefined)", "RR-89 · what a review must show"],
  ["S28", "RR-89 the missing review is named", AD, "else if (unreviewed.length) missing.push(", "else if (false) missing.push(", "RR-89 · FIRING CONTROL"],
  ["S29", "RR-89 the reader keeps only qualifying reviews", "src/page/action-evidence.mjs", "x.pair.includes(peer) && reviewShowsOneIntent(x));", "x.pair.includes(peer));", "RR-89 · what a review must show"],
  ["S30", "RR-89 reviews are passed, never defaulted", "src/page/action-evidence.mjs", "if (!Array.isArray(reviews)) throw", "if (false) throw", "RR-89 · what a review must show"],
  ["S31", "RR-89 MERGE carries the review that justifies it", AD, "const reviewEvidence = reviewed.flatMap((p) => [p.pageId, p.reviewRef]);", "const reviewEvidence = reviewed.map((p) => p.pageId);", "RR-89 · FIRING CONTROL"],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F35 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [];
  try {
    const r = spawnSync(process.execPath, ["--test", T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f35-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
