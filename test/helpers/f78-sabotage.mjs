/**
 * 🔴 F78 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs a1885de EVIDENCE; RR-93 §2 publication-date guard included).
 *
 *   node test/helpers/f78-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof files, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f78-sabotage-2026-09-29.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TA = "src/cost/tenant-attribution.mjs", CB = "src/cost/cost-by-tenant.mjs", PG = "src/cost/paid-provider-gate.mjs", EV = "src/page/content-decay-evidence.mjs", BIN = "bin/cost-by-tenant.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f78-cost-governor.test.mjs", "test/f43-content-decay.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 an unscoped refusal is never assigned a tenant", TA, `return typeof entry.scope?.tenantId === "string" && entry.scope.tenantId !== ""`, "return true", "C1 · FIRING CONTROL"],
  ["S2", "C1 a shared crawl batch is never assigned a tenant", TA, `if (entry.run_kind === "crawl") return out(ATTRIBUTION.UNATTRIBUTED, null, null,`, `if (entry.run_kind === "crawl") return out(ATTRIBUTION.ATTRIBUTED, "tenant:x", null,`, "C1 · FIRING CONTROL"],
  ["S3", "C1 an undeclared research batch is never assigned a tenant", TA, `return resolved(r) ? out(ATTRIBUTION.ATTRIBUTED, r.tenantId, "the declared research batch")`, `return true ? out(ATTRIBUTION.ATTRIBUTED, r.tenantId ?? "tenant:x", "the declared research batch")`, "C1 · FIRING CONTROL"],
  ["S4", "C6 a property spanning two tenants is given to neither", TA, "if (tenants.size === 1 && unresolved === 0)", "if (tenants.size >= 1 && unresolved === 0)", "C1 · a declared scope"],
  ["S5", "C1 a measurable-but-unrecorded gap is counted, never zero", TA, "s.measurableButNotRecorded += (gaps.get(a.entryId) ?? []).length;", "", "C1 · per-tenant totals"],
  ["S6", "C4 an approval authorises only its own tenant", PG, "if (!filled(auth?.tenantId) || !decideResolvedTenants(auth.tenantId, tenantId).allowed) problems.push", "if (false) problems.push", "C4/C6 ·"],
  ["S7", "C4 an expired approval authorises nothing", PG, "else if (Date.parse(`${auth.expiresOn}T23:59:59Z`) < now.getTime())", "else if (false)", "C4/C6 ·"],
  ["S8", "C4 an approval without expiry authorises nothing", PG, `if (!ISO_DATE.test(auth?.expiresOn ?? "")) problems.push("it carries no expiry");`, `if (false) problems.push("it carries no expiry");`, "C4/C6 ·"],
  ["S9", "C6 a refusal records the tenant it was made for", PG, "tenantId: spendAuthority.scope?.tenantId ?? null });", "tenantId: null });", "C4/C6 ·"],
  ["S10", "C2 paid providers are off by default", PG, `if (!auth) return refuse(provider, "NOT_AUTHORIZED"`, `if (false) return refuse(provider, "NOT_AUTHORIZED"`, "C2/C3 ·"],
  ["S11", "C3 the cap is enforced before the call", PG, "if (s.calls + 1 > auth.cap.maxCalls)", "if (false)", "C2/C3 ·"],
  ["S12", "C5 the kill switch refuses the next call", PG, "if (killSwitch.isOn()) return refuse(", "if (false) return refuse(", "C5 ·"],
  ["S13", "C6 a tenant's view never holds another tenant's totals", CB, `mine: (tenantId && tenantId !== "UNATTRIBUTED" ? r.totals.get(tenantId) : null) ?? null`, "mine: r.totals.get(tenantId) ?? [...r.totals.values()][0] ?? null", "C6 · REAL"],
  ["S14", "C6 the entry point shows its OWN tenant", BIN, "viewForTenant(r, SCOPE.tenantId);", `viewForTenant(r, [...r.totals.keys()].find((k) => k !== SCOPE.tenantId && k !== "UNATTRIBUTED"));`, "C7 · THE ENTRY POINT"],
  ["S15", "C7 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C7 · THE ENTRY POINT"],
  ["S16", "C1 research-batch costs are read under their batch", CB, "attributeCostEntry(entry, { resolve, evidenceById, origins, batch })", "attributeCostEntry(entry, { resolve, evidenceById, origins })", "REAL ·"],
  ["S17", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 · attribution"],
  ["S18", "RR-93 §2 a modified date is not a publication date", EV, "if (p?.kind !== PUBLICATION_KIND) return", "if (false) return", "RR-93 §2 ·"],
  ["S19", "RR-93 §2 only an authoritative source dates a publication", EV, "if (!AUTHORITATIVE_PUBLICATION_SOURCES.includes(p.source)) return", "if (false) return", "RR-93 §2 ·"],
  ["S20", "RR-93 §2 a publication date needs its ref", EV, `if (typeof p.ref !== "string" || p.ref === "") return "it carries no ref";`, `if (false) return "it carries no ref";`, "RR-93 §2 ·"],
  ["S22", "C6 the entry point reads only the research batches its scope gate named", BIN, "readCostByTenant({ resolve: createTenantResolver(), batches: BATCHES });", "readCostByTenant({ resolve: createTenantResolver(), batches: null });", "C7 · THE ENTRY POINT"],
  ["S21", "RR-93 §2 a refused publication never reaches the assessment", EV, "const publications = d.publications.filter((x) => !publicationProblem(x));", "const publications = d.publications;", "RR-93 §2 ·"],
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
  `F78 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
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
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f78-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
