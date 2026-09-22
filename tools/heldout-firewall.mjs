/**
 * 🔴 THE HELD-OUT FIREWALL — ROLE AND EXPOSURE, NOT MERE STRING EXISTENCE (owner rulings of 22 September 2026:
 * _handoffs a5452ee, clarified by f4367b1).
 *
 * A retired held-out population may not appear in anything a person or agent is REQUIRED to read, or in anything that
 * could act as an expected answer. So, over the declared population of tracked files:
 *   FAIL  when a retired member occurs in mandatory governance, command or ruling text, the ledger, a generated
 *         document, active test source, configuration or production source;
 *   FAIL  when a DISTINCTIVE held-out fragment (below) occurs in active test source, the ledger, a generated document,
 *         expected-answer configuration or the engine's own governance documents;
 *   EXEMPT ONLY a registered OBSERVED_DATA artefact that meets every condition of `observedDataExemption`;
 *   FAIL CLOSED on an unregistered match, a hash mismatch, an invalid registry, or a population that does not
 *         re-derive to its registered fingerprint;
 *   NEVER READ a sealed path — it is excluded by prefix before any file is opened.
 * It reports ONLY path, category and counts. It never prints, stores or returns matched text.
 *
 * A DISTINCTIVE FRAGMENT is a word that occurs in a retired member, in no non-retired row of the same observation,
 * is at least 5 letters, and occurs in no production source or configuration file — so ordinary words the engine itself
 * uses are not fragments. Computed at runtime; never listed anywhere.
 *
 * Generic: it knows no subject, product or client. The population comes from the registry's derivation.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { registryErrors, observedDataExemption, entryFor } from "../src/governance/evidence-roles.mjs";
import { isSealed } from "../src/governance/sealed-paths.mjs";

/** The held-out evaluators: modules that SCORE generalisation against expected answers. Row 3's traceability sample is not one. */
export const HELD_OUT_EVALUATORS = Object.freeze(["src/discovery/intent-clusters.mjs"]);
export const FAILING_CATEGORIES = Object.freeze(["MANDATORY_GOVERNANCE", "LEDGER", "GENERATED_DOCUMENT", "ACTIVE_TEST", "EXPECTED_ANSWER_CONFIG", "CONFIGURATION", "PRODUCTION_SOURCE"]);
export const FRAGMENT_CATEGORIES = Object.freeze(["ACTIVE_TEST", "LEDGER", "GENERATED_DOCUMENT", "EXPECTED_ANSWER_CONFIG", "MANDATORY_GOVERNANCE"]);
const TEXT = /\.(md|txt|mjs|js|json|jsonl|csv|html|yml|yaml)$/i;

/** A repository-relative path → its category. Order matters: the first matching rule wins. */
export function categoryOf(path) {
  if (path === "src/checklist/classification.mjs") return "LEDGER";
  if (/^test\//.test(path)) return "ACTIVE_TEST";
  if (/^config\/discovery\//.test(path)) return "EXPECTED_ANSWER_CONFIG";
  if (/^config\//.test(path)) return "CONFIGURATION";
  if (/^(src|bin|tools)\//.test(path)) return "PRODUCTION_SOURCE";
  if (path === "CHECKLIST_BOUNDARIES.md" || /^runs\/.*\.(txt|md|html)$/i.test(path)) return "GENERATED_DOCUMENT";
  if (/\.md$/i.test(path)) return "MANDATORY_GOVERNANCE";
  return "DATA";
}

const fingerprint = (members) => createHash("sha256").update([...new Set(members.map((m) => m.toLowerCase()))].sort().join("\n")).digest("hex").slice(0, 16);
const surfaceWords = (s) => ` ${s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()} `;

/**
 * Re-derive a retired population from its registered derivation and prove it is the same population (fingerprint).
 * `derive(observationId)` returns { members, others } — the retired members and the same observation's other rows.
 */
export function derivePopulation(entry, derive) {
  const { members, others } = derive(entry.resource.derivation.observationId);
  const fp = fingerprint(members);
  if (fp !== entry.contentHash) return { ok: false, code: "DERIVATION_MISMATCH", why: `${entry.id}: the derivation yields fingerprint ${fp}, not the registered ${entry.contentHash}` };
  return { ok: true, members: [...new Set(members.map((m) => m.toLowerCase()))], others };
}

/** Distinctive fragments: words only the retired members carry, that no production source or configuration uses. */
export function distinctiveFragments(members, others, productionTexts) {
  const tok = (s) => surfaceWords(s).trim().split(" ").filter(Boolean);
  const elsewhere = new Set(others.flatMap(tok));
  const prod = productionTexts.map(surfaceWords).join(" ");
  return [...new Set(members.flatMap(tok))].filter((t) => t.length >= 5 && /^[a-z]+$/.test(t) && !elsewhere.has(t) && !prod.includes(` ${t} `));
}

/** Count members (full, case-insensitive) and fragments (whole words) in a text. Counts only. */
export function countIn(text, members, fragments) {
  const low = text.toLowerCase();
  const full = members.filter((m) => low.includes(m)).length;
  const words = surfaceWords(text);
  const frag = fragments.filter((f) => words.includes(` ${f} `)).length;
  return { full, frag };
}

/**
 * THE SCAN. `files` are repository-relative paths in `root` at `base`. Returns rows of { path, category, full, frag,
 * disposition } and the failures — never any matched text.
 */
export function scan({ registry, root, base, files, members, fragments, evaluatorSources = [], read = (f) => readFileSync(f) }) {
  const rows = [];
  let sealedExcluded = 0;
  for (const path of files) {
    if (isSealed(registry, root, path)) { sealedExcluded += 1; continue; } // never opened
    if (!TEXT.test(path)) continue;
    const file = join(base, path);
    if (!existsSync(file)) continue;
    const text = read(file).toString("utf8");
    const category = categoryOf(path);
    const { full, frag } = countIn(text, members, fragments);
    if (!full && !frag) continue;
    /* 🔴 A FRAGMENT IS PAYLOAD ONLY WHERE A DOCUMENT TREATS IT AS A HELD-OUT ITEM. In active test source, the ledger and
     * expected-answer configuration it always fails. In a generated or governance document it fails when the same
     * document carries held-out context; elsewhere the same word is ordinary language (measured 22 Sep 2026: the four
     * distinctive words occur in dozens of product drafts and crawled page bodies that concern nothing held out).
     * In DATA a single word is ordinary vocabulary: data is judged on full retired members only. */
    const heldOutContext = /held[\s-]?out/i.test(text);
    const fragmentFails = frag > 0 && (["ACTIVE_TEST", "LEDGER", "EXPECTED_ANSWER_CONFIG"].includes(category) || (["GENERATED_DOCUMENT", "MANDATORY_GOVERNANCE"].includes(category) && heldOutContext));
    let disposition;
    if (category === "DATA") {
      if (!full) continue;
      const ex = observedDataExemption({ registry, root, path, read: () => read(file), evaluatorSources });
      disposition = ex.exempt ? "EXEMPT_REGISTERED_OBSERVED_DATA" : `FAIL_${ex.code}`;
    } else if (full && FAILING_CATEGORIES.includes(category)) disposition = "FAIL_RETIRED_PAYLOAD";
    else if (fragmentFails) disposition = "FAIL_HELD_OUT_FRAGMENT";
    else if (full) disposition = `FAIL_UNCATEGORISED_${category}`;
    else disposition = "FRAGMENT_OUTSIDE_HELD_OUT_CONTEXT";
    rows.push({ path, category, full, frag, disposition });
  }
  const failures = rows.filter((r) => r.disposition.startsWith("FAIL"));
  return { rows, failures, sealedExcluded };
}

/** Every registered engine artefact must still match its hash — changed without re-registration fails closed. */
export function registeredHashErrors({ registry, root, base, read = (f) => readFileSync(f), hashOf }) {
  const errs = [];
  for (const e of registry.filter((x) => x.resource?.root === root && x.resource?.path && x.role !== "SEALED")) {
    const file = join(base, e.resource.path);
    if (!existsSync(file)) { errs.push({ code: "REGISTERED_ARTEFACT_MISSING", id: e.id }); continue; }
    if (hashOf(read(file)) !== e.contentHash) errs.push({ code: "HASH_MISMATCH", id: e.id });
  }
  return errs;
}

/** Tracked files of a git work tree (the declared population). */
export const trackedFiles = (base) => execFileSync("git", ["-C", base, "ls-files"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);

export { registryErrors, entryFor };
