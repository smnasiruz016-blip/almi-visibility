/**
 * 🔴 F10 ACCEPTANCE AMENDMENT 2 (governance 370a3b3, contract be7f7386) — THE TWO DECLARED EVIDENCE SCOPES OF THE HELD-OUT CENSUS.
 *
 *   PRODUCTION  every real registered sealed role, on the machine that locates the owner's store. The DEFAULT. It never applies a
 *               synthetic fixture: a fixture cannot satisfy a production registration. A missing store, an unreadable role or an
 *               omitted registration FAILS CLOSED. Its passing result, with its durable ACCESS evidence, is the proof of the REAL
 *               registration — recorded before owner labelling and again before scoring.
 *   SYNTHETIC   CI: the SAME governed paths over the synthetic fixture's OWN declared stores only. Honoured only inside a verified
 *               test context. The real sealed-store roles are NOT scanned, and are NAMED as not measured — never silently omitted;
 *               the real stores' references are never resolved. Its passing result proves the CODE and the synthetic controls,
 *               never the owner's store.
 *
 * THE SCOPE TRAVELS WITH THE RESULT: the census prints its scope as its FIRST line and in its final verdict line, and a SYNTHETIC
 * result says REAL REGISTERED POPULATION NOT MEASURED IN CI. `claimFaults` refuses a claim a report cannot support — a report with
 * no scope, a SYNTHETIC report presented as PRODUCTION proof, a failing report presented as a pass.
 *
 * THE PRODUCTION CENSUS'S OWN LIMIT (stated in the contract): for a set held inside a sealed store the census reads, enumerates and
 * scans its members but does NOT verify them against the registered commitment (D-CENSUS-STORE-COMMITMENT); a changed member is
 * caught by the evaluator's pre-scoring check (SET_CHANGED_SINCE_REGISTRATION), before the once-only run is claimed.
 */
import { inVerifiedTestContext } from "./governed-run.mjs";

export const CENSUS_SCOPES = Object.freeze(["PRODUCTION", "SYNTHETIC"]);
export const NOT_MEASURED_IN_CI = "REAL REGISTERED POPULATION NOT MEASURED IN CI";

export class CensusScopeRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "CensusScopeRefused"; this.code = code; }
}

/** The declared scope from argv: --scope=production|synthetic; ABSENT is PRODUCTION (the fail-closed default). */
export function censusScopeOf(argv = []) {
  const raw = argv.find((a) => a.startsWith("--scope="))?.slice("--scope=".length);
  if (raw === undefined) return "PRODUCTION";
  const s = String(raw).toUpperCase();
  if (!CENSUS_SCOPES.includes(s)) throw new CensusScopeRefused("CENSUS_SCOPE_UNKNOWN", "a census scope is PRODUCTION or SYNTHETIC — never guessed");
  return s;
}

/**
 * Apply a scope to the effective registry and store declarations.
 *   realDeclared  the REAL store descriptors (config)            effective  withSyntheticSealedFixture's result
 * Returns { scope, registry, declared, notMeasured: [ids of real sealed-store roles NOT scanned in this scope] }.
 */
export function applyCensusScope({ scope, realDeclared, effective, env = process.env }) {
  const realStores = new Set(Object.keys(realDeclared ?? {}));
  const inRealStore = (e) => realStores.has(e?.resource?.root);
  if (scope === "PRODUCTION") {
    /* NO SUBSTITUTION: a production census never runs with a synthetic configuration. */
    if (effective.synthetic) throw new CensusScopeRefused("SYNTHETIC_FIXTURE_IN_PRODUCTION_SCOPE", "a synthetic fixture cannot satisfy a production registration");
    return { scope, registry: effective.registry, declared: effective.declared, notMeasured: [] };
  }
  if (!inVerifiedTestContext(env)) throw new CensusScopeRefused("SYNTHETIC_SCOPE_OUTSIDE_TEST_CONTEXT", "the SYNTHETIC scope runs only inside a verified test context");
  const declared = Object.fromEntries(Object.entries(effective.declared ?? {}).filter(([name]) => !realStores.has(name)));
  /* CROSS-SCOPE: a synthetic store that resolves to the directory the real store's reference names is the real store in disguise. */
  const realDirs = new Set([...realStores].map((n) => env?.[realDeclared[n]?.name]).filter((v) => typeof v === "string" && v.trim() !== "").map((v) => v.replace(/[\\/]+$/, "").toLowerCase()));
  for (const [name, ref] of Object.entries(declared)) {
    const dir = env?.[ref?.name];
    if (typeof dir === "string" && realDirs.has(dir.replace(/[\\/]+$/, "").toLowerCase())) throw new CensusScopeRefused("CROSS_SCOPE_STORE", `the synthetic store ${name} resolves to the real store's directory`);
  }
  return {
    scope,
    registry: effective.registry.filter((e) => !inRealStore(e)),
    declared,
    notMeasured: effective.registry.filter(inRealStore).map((e) => String(e.id)),
  };
}

/** The scope a census report states, from its FIRST line; null when it states none. */
export function reportScope(stdout) {
  const m = String(stdout ?? "").match(/^CENSUS SCOPE: (PRODUCTION|SYNTHETIC)\b/m);
  return m ? m[1] : null;
}

/**
 * Whether a report supports a claim. `claim` is { scope: "PRODUCTION"|"SYNTHETIC", pass: true|false }. Returns fault codes:
 *   SCOPE_ABSENT       the report states no scope — no claim about what it scanned can be made from it
 *   FALSE_SCOPE_CLAIM  a SYNTHETIC report presented as PRODUCTION proof (or the reverse)
 *   SCOPE_NOT_CARRIED  the verdict line does not carry the scope (the scope must travel WITH the result)
 *   NOT_A_PASS         a failing report presented as a pass
 */
export function claimFaults(stdout, claim) {
  const text = String(stdout ?? "");
  const scope = reportScope(text);
  if (!scope) return ["SCOPE_ABSENT"];
  const faults = [];
  if (claim?.scope && claim.scope !== scope) faults.push("FALSE_SCOPE_CLAIM");
  const verdict = text.match(/^FAILURES: (\d+) · SCOPE (PRODUCTION|SYNTHETIC)(.*)$/m);
  if (!verdict || verdict[2] !== scope || (scope === "SYNTHETIC" && !verdict[3].includes(NOT_MEASURED_IN_CI))) faults.push("SCOPE_NOT_CARRIED");
  if (claim?.pass === true && (!verdict || Number(verdict[1]) !== 0)) faults.push("NOT_A_PASS");
  return faults;
}
