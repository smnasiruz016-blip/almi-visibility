/**
 * 🔴 F10 (owner ruling S, _handoffs 84abe3d) · THE ISOLATED SYNTHETIC SEALED FIXTURE — HOW CI EXERCISES THE EXTERNAL-STORE PATH
 * WITHOUT THE OWNER'S KEY.
 *
 * The production census (bin/heldout-firewall.mjs) and the production evaluator (bin/heldout-evaluation.mjs) read the real
 * registry and the real store descriptors. To drive THOSE entry points over a sealed store outside git, a test hands them a
 * SYNTHETIC configuration: a JSON file named by ALMIVISIBILITY_SYNTHETIC_SEALED_FIXTURE, holding synthetic registry entries
 * (and, optionally, synthetic store descriptors). It is honoured under three laws, each failing closed:
 *
 *   1 · ONLY IN A VERIFIED TEST CONTEXT — Node's own two runner-set signals (governed-run.mjs inVerifiedTestContext). Outside
 *       one, naming a fixture REFUSES the run: production never reads a synthetic configuration.
 *   2 · ADDITIVE ONLY — every entry id starts "synthetic:", every synthetic store name starts "synthetic-", no id or store
 *       name may equal a real one, and the real registry and real descriptors are never replaced, filtered or reordered. A
 *       fixture can therefore ADD a required store, never remove one: it cannot turn a real missing store green.
 *   3 · LABELLED — the entry points print that a synthetic fixture was applied, and how many entries it added.
 *
 *   4 · ISOLATED (27 Sep 2026) — a synthetic entry lives ONLY in a synthetic store the fixture itself declares, NEVER in a real
 *       declared store. Before any real entry was registered, a synthetic entry could share the real store; once the real F10
 *       sets were registered there it resolved to the REAL entries (ITEM_OUTSIDE_GRANTED_SET), and pointing the real store's
 *       reference at a scratch directory is a synthetic store SUBSTITUTED for the real one. A synthetic store is resolved by the
 *       very same descriptor code (ENV_REFERENCE, sealedStoreDescriptorRefusal, sealedStoreStatus) — the same external-store
 *       path C3 requires CI to exercise, on an ISOLATED store. Generic: no subject, client or host.
 */
import { readFileSync } from "node:fs";
import { inVerifiedTestContext } from "./governed-run.mjs";

export const SYNTHETIC_SEALED_FIXTURE_ENV = "ALMIVISIBILITY_SYNTHETIC_SEALED_FIXTURE";

export class SyntheticFixtureRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "SyntheticFixtureRefused"; this.code = code; }
}

/**
 * The effective registry and store declarations for a run: the real ones, plus a synthetic fixture when (and only when) one
 * is lawfully named. Returns { registry, declared, synthetic: { entries, stores } | null }.
 */
export function withSyntheticSealedFixture({ registry, declared, env = process.env, read = (p) => readFileSync(p, "utf8") }) {
  const path = env?.[SYNTHETIC_SEALED_FIXTURE_ENV];
  if (path === undefined || path === "") return { registry, declared, synthetic: null };
  if (!inVerifiedTestContext(env)) throw new SyntheticFixtureRefused("SYNTHETIC_FIXTURE_OUTSIDE_TEST_CONTEXT", "a synthetic sealed configuration is honoured only inside a verified test context");
  let doc;
  try { doc = JSON.parse(read(path)); } catch { throw new SyntheticFixtureRefused("SYNTHETIC_FIXTURE_UNREADABLE", "the named synthetic fixture could not be read"); }
  const entries = Array.isArray(doc?.entries) ? doc.entries : [];
  const stores = doc?.stores && typeof doc.stores === "object" && !Array.isArray(doc.stores) ? doc.stores : {};
  const realIds = new Set((registry ?? []).map((e) => e?.id));
  for (const e of entries) {
    if (typeof e?.id !== "string" || !e.id.startsWith("synthetic:")) throw new SyntheticFixtureRefused("SYNTHETIC_ENTRY_NOT_LABELLED", "every synthetic entry id starts with synthetic:");
    if (realIds.has(e.id)) throw new SyntheticFixtureRefused("SYNTHETIC_ENTRY_OVERRIDES_REAL", "a synthetic entry may never replace a real one");
  }
  for (const e of entries) {
    const root = e?.resource?.root;
    if (typeof root === "string" && Object.hasOwn(declared ?? {}, root)) throw new SyntheticFixtureRefused("SYNTHETIC_ENTRY_IN_REAL_STORE", "a synthetic entry lives only in a synthetic store its fixture declares — never in a real one");
  }
  for (const name of Object.keys(stores)) {
    if (!name.startsWith("synthetic-")) throw new SyntheticFixtureRefused("SYNTHETIC_STORE_NOT_LABELLED", "every synthetic store name starts with synthetic-");
    if (Object.hasOwn(declared ?? {}, name)) throw new SyntheticFixtureRefused("SYNTHETIC_STORE_OVERRIDES_REAL", "a synthetic store may never replace a real descriptor");
  }
  return {
    registry: Object.freeze([...(registry ?? []), ...entries.map((e) => Object.freeze({ ...e }))]),
    declared: Object.freeze({ ...(declared ?? {}), ...stores }),
    synthetic: Object.freeze({ entries: entries.length, stores: Object.keys(stores).length }),
  };
}
