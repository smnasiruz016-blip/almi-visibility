/**
 * 🔴 F16 · WHO LOOKED · ONE SABOTAGE PER SAFEGUARD (RR-125).
 *
 *   node test/helpers/f16-agent-observer-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span must exist EXACTLY ONCE in the code live now; one that does not is NOT PROVED, never skipped. Each sabotage
 * replaces its span ALONE, proves it LANDED, runs the proof files, requires the NAMED test to fail by an assertion, and restores by
 * raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f16-agent-observer-sabotage-rr126-2026-10-01.txt (RR-126 rerun after the boundary changed; earlier files kept).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HO = "src/research/human-observation.mjs", PQ = "src/research/public-questions.mjs", BIN = "bin/observe-question.mjs", SA = "src/research/source-adapter.mjs";
const T = ["test/f16-agent-observer.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const ONE_BAR = "§3 · FIRING CONTROL: AGENT_OBSERVED is NOT a lower bar", LEAD = "§3 · FIRING CONTROL: a search-result LEAD", RELABEL = "§3 · FIRING CONTROL: an agent record can NEVER surface";
const CLAIMS = "§3 · CLIENT_CLAIM and INFERRED stay their own types", SPLIT = "§3 · FIRING CONTROL: a report that counts OBSERVED without the split", ADAPTER = "§3 · a source adapter's record counts";
const FIELDS = "§4 · FIRING CONTROL: source and time window", PROD = "§4 · BOTH ROUTES, THE PRODUCTION PATH, TWO CLIENTS";

const SABOTAGES = [
  ["A1", "the observer type is required", HO, "\"observedAt\", \"observerType\", \"verifiedOn\"]),", "\"observedAt\", \"verifiedOn\"]),", ONE_BAR],
  ["A2", "the original-page attestation is required", HO, "\"observedAt\", \"observerType\", \"verifiedOn\"]),", "\"observedAt\", \"observerType\"]),", LEAD],
  ["A3", "only a person or an agent may be submitted", HO, "  if (category === \"RESEARCHER_OBSERVATION\" && present(s.observerType) && !SUBMITTABLE_OBSERVERS.includes(s.observerType)) refusals.push(\"OBSERVER_TYPE_UNKNOWN\");\n", "", ONE_BAR],
  ["A4", "a lead is refused by name", HO, "  if (category === \"RESEARCHER_OBSERVATION\" && present(s.verifiedOn) && s.verifiedOn !== VERIFIED_ON) refusals.push(\"LEAD_NOT_VERIFIED_ON_ORIGINAL_PAGE\");\n", "", LEAD],
  ["A5", "the label is derived from the type, never chosen", HO, "seenBy: category === \"RESEARCHER_OBSERVATION\" ? OBSERVER_TYPES[s.observerType] : null", "seenBy: category === \"RESEARCHER_OBSERVATION\" ? OBSERVER_TYPES.PERSON_OBSERVED : null", RELABEL],
  ["A6", "a claim or a suggestion is never an observer", HO, "observerType: category === \"RESEARCHER_OBSERVATION\" ? s.observerType : NOT_AN_OBSERVATION,", "observerType: s.observerType,", CLAIMS],
  ["A7", "a label that contradicts its type is refused by the reader", PQ, "return Object.hasOwn(OBSERVER_TYPES, t) && v.provenance.seenBy === OBSERVER_TYPES[t] ? t : null;", "return Object.hasOwn(OBSERVER_TYPES, t) ? t : null;", RELABEL],
  ["A8", "an unattributed observation is malformed, never counted", PQ, "  const kind = Object.hasOwn(KINDS, v.kind) && observer !== null ? v.kind : null;", "  const kind = Object.hasOwn(KINDS, v.kind) ? v.kind : null;", RELABEL],
  ["A9", "only OBSERVED records need an observer", PQ, "  const observer = v.kind === KINDS.OBSERVED ? observerTypeOf(v) : NOT_AN_OBSERVATION;", "  const observer = observerTypeOf(v);", CLAIMS],
  ["A10", "the split counts each observer type apart", PQ, "lists.OBSERVED.filter((q) => q.observerType === t).length", "lists.OBSERVED.length", RELABEL],
  ["A11", "a combined count without its split throws", PQ, "  if (bare.length) throw Object.assign(", "  if (false) throw Object.assign(", SPLIT],
  ["A12", "the report refuses a result whose split is missing", PQ, "  return assertObserverSplit(lines);", "  return lines;", SPLIT],
  ["A13", "the report line carries the split", PQ, "${k === KINDS.OBSERVED ? ` — by observer: ${Object.keys(OBSERVER_TYPES).map((o) => `${o} ${r.observerSplit[o]}`).join(\" · \")}` : \"\"}", "", RELABEL],
  ["A14", "the writer shows the split", BIN, "(by observer: ${Object.keys(OBSERVER_TYPES).map((o) => `${o} ${byObserver[o]}`).join(\" · \")})", "", PROD],
  ["A15", "the writer never says every observer was a person", BIN, "\"provenance: each observation names WHO looked — a person or an agent, never relabelled; the engine searched nothing, fetched nothing and opened no reference\",", "\"provenance: a person saw each observation; the engine searched nothing, fetched nothing and opened no reference\",", PROD],
  ["A16", "the writer is tenant-scoped to the batch", BIN, "RESOURCES.researchBatch(BATCH)", "RESOURCES.subject(SUBJECT)", PROD],
  ["A17", "an adapter record carries its own observer type", SA, "provenance: Object.freeze({ observerType: \"SOURCE_ADAPTER_OBSERVED\", seenBy:", "provenance: Object.freeze({ seenBy:", ADAPTER],
  ["A18", "the source field is required", HO, "const COMMON = [\"subject\", \"wording\", \"source\", ", "const COMMON = [\"subject\", \"wording\", ", FIELDS],
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
  `F16 who-looked sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
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
writeFileSync(join(REPO, "runs", "audit", "f16-agent-observer-sabotage-rr126-2026-10-01.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
