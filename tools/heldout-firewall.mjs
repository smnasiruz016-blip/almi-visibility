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
import { diagnosticGuardSink, resourceRef } from "../src/governance/guard-audit.mjs";

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
  if (/^(src|bin|tools|subjects)\//.test(path)) return "PRODUCTION_SOURCE";
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
/* 🔴 F08 §6.2, as repaired on 23 September 2026 — every decision this scan makes is emitted into the sink it is handed
 * (by default a DIAGNOSTIC sink the scan owns, which persists nothing). Handed the durable sink (bin/heldout-firewall.mjs),
 * the sink derives what the trail keeps: a clean classification is kept by the run only; a violation is appended.
 * `judge: false` is the firewall's existing REPORT-ONLY scan (product-content drafts under --extra-root are "reported,
 * not judged"): its rows are returned for printing, it returns no failures, and so it decides — and emits — nothing.
 * Found 24 September 2026: the first repair emitted a violation for every FAIL row, including 17 report-only rows. */
/* F07 Amendment 1: `payloadDisposition` names WHICH sealed role's content was found. Its default is the retired role's own
 * disposition, so every existing caller — and every existing retired-population result — is byte-for-byte unchanged. */
export function scan({ registry, root, base, files, members, fragments, evaluatorSources = [], read = (f) => readFileSync(f), audit = diagnosticGuardSink({ actor: "tools/heldout-firewall.mjs" }), judge = true, payloadDisposition = "FAIL_RETIRED_PAYLOAD" }) {
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
      const ex = judge ? observedDataExemption({ registry, root, path, read: () => read(file), evaluatorSources, audit }) : { exempt: false, code: "NOT_JUDGED" };
      disposition = ex.exempt ? "EXEMPT_REGISTERED_OBSERVED_DATA" : `FAIL_${ex.code}`;
    } else if (full && FAILING_CATEGORIES.includes(category)) disposition = payloadDisposition;
    else if (fragmentFails) disposition = "FAIL_HELD_OUT_FRAGMENT";
    else if (full) disposition = `FAIL_UNCATEGORISED_${category}`;
    else disposition = "FRAGMENT_OUTSIDE_HELD_OUT_CONTEXT";
    /* 🔴 A FIREWALL VIOLATION IS A DURABLE AUDIT EVENT (owner ruling, 23 September 2026). A DATA artefact is decided by
     * the observed-data guard, which emits its own decision; every OTHER failure was only a row in this run's output
     * and reached no trail at all (found by the sink repair's proof (d)). It now leaves through the same sink as one
     * metadata-only REFUSED decision — the disposition and a digest of the path, never the path or the match — which
     * the sink derives VIOLATION and appends. */
    if (judge && category !== "DATA" && disposition.startsWith("FAIL")) {
      audit.emit({
        eventType: "EVIDENCE_ROLE_DECISION", action: "HELD_OUT_PAYLOAD_FOUND", outcome: "REFUSED", reasonCode: disposition,
        metadata: { guard: "heldoutFirewallScan", classification: category, ruleEntry: "NONE", root: String(root), resourceRef: resourceRef(root, path) },
      });
    }
    rows.push({ path, category, full, frag, disposition });
  }
  const failures = judge ? rows.filter((r) => r.disposition.startsWith("FAIL")) : [];
  return { rows, failures, sealedExcluded, guardEvents: audit.events ?? [], guardDurable: audit.durable === true };
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

/* ═══ F07 AMENDMENT 1 (governance a0b7e4b) — THE LEAK CENSUS ENUMERATES EVERY REGISTERED SEALED HELD-OUT ROLE ══════════
 *
 * The frozen F07 text always claimed a leak census over ANY declared held-out set and its labels; the production entry
 * point enumerated only RETIRED_CONTAMINATED. `censusEntries` is now the one enumeration, and a registered HELD_OUT_EVIDENCE
 * or MARKING_KEY entry the census cannot read or verify FAILS the census — it is never skipped, and a failed read is never
 * treated as an empty population.
 *
 * WHERE A NEW ROLE'S MEMBERS COME FROM, INSIDE THE BOUNDARY:
 *   derived   `resource.derivation` { observationId, rule } — members from a registered deriver, verified against the
 *             entry's contentHash by the lifecycle's own commitment rule (populationCommitment). An unregistered rule fails.
 *   sealed    `resource.pathPrefixes` in a scanned root — every tracked file under the prefixes is read HERE, and only here;
 *             the read is recorded as a durable ACCESS (action HELDOUT_CENSUS_READ, never the evaluator's HELDOUT_ACCESS, so
 *             the lifecycle cannot mistake it for an evaluation access). Zero files under a declared prefix fails closed.
 *   A bare `resource.path` is refused: sealed-path refusal is by prefix (src/governance/sealed-paths.mjs), so a single
 *   path is not refused to ordinary loaders, and a census may not treat unprotected material as sealed.
 *
 * Members are the item text: each non-empty line, or — for a line that is JSON — each string it carries, at least
 * MIN_MEMBER_LENGTH characters, lower-cased. The detector reports path, category and counts; never a member. */
export const SEALED_CENSUS_ROLES = Object.freeze(["RETIRED_CONTAMINATED", "HELD_OUT_EVIDENCE", "MARKING_KEY"]);
export const NEW_SEALED_ROLES = Object.freeze(["HELD_OUT_EVIDENCE", "MARKING_KEY"]);
/** RR-246: a RETIRED set that stays sealed in a governed store (no derivation) is read and scanned inside the boundary like the new roles,
 * its findings named FAIL_RETIRED_PAYLOAD; a derived retired population keeps its own route (derivePopulation). */
export const isSealedRetiredInBoundary = (e) => e?.role === "RETIRED_CONTAMINATED" && e?.sealed === true && !e?.resource?.derivation;
export const scannedInBoundary = (e) => NEW_SEALED_ROLES.includes(e?.role) || isSealedRetiredInBoundary(e);
export const ROLE_DISPOSITION = Object.freeze({ RETIRED_CONTAMINATED: "FAIL_RETIRED_PAYLOAD", HELD_OUT_EVIDENCE: "FAIL_HELD_OUT_PAYLOAD", MARKING_KEY: "FAIL_MARKING_KEY_CONTENT" });
export const MIN_MEMBER_LENGTH = 8;
export const CENSUS_READ_ACTION = "HELDOUT_CENSUS_READ";

/** Every registered entry the leak census must cover. */
export const censusEntries = (registry) => (registry || []).filter((e) => SEALED_CENSUS_ROLES.includes(e?.role));

/** The members an item text carries (see above). */
export function extractMembers(text) {
  const out = new Set();
  const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let parsed = null;
    if (/^[{[]/.test(line)) { try { parsed = JSON.parse(line); } catch { parsed = null; } }
    for (const s of parsed === null ? [line] : strings(parsed)) { const m = s.trim().toLowerCase(); if (m.length >= MIN_MEMBER_LENGTH) out.add(m); }
  }
  return [...out];
}

/**
 * The population of one registered HELD_OUT_EVIDENCE or MARKING_KEY entry, read inside the boundary.
 *   roots      { rootName: absolute base } — the roots this census can read; an entry in any other root fails closed
 *   filesOf    (rootName) → tracked repository-relative paths of that root
 *   derivers   { ruleName: (observationId) → { members, others } }
 *   commitment the lifecycle's populationCommitment (injected, so the census uses the evaluator's own rule)
 * Returns { ok: true, members, others, source, files } or { ok: false, code, why } — never a member in `why`.
 */
export function sealedRolePopulation(entry, { roots = {}, filesOf, read = (f) => readFileSync(f), derivers = {}, commitment, audit = diagnosticGuardSink({ actor: "tools/heldout-firewall.mjs" }) } = {}) {
  const fail = (code, why) => ({ ok: false, code, why: `${entry?.id ?? "?"}: ${why}` });
  if (!scannedInBoundary(entry)) return fail("NOT_A_NEW_SEALED_ROLE", `role ${entry?.role} is not HELD_OUT_EVIDENCE, MARKING_KEY or a sealed retired set`);
  if (entry.sealed !== true) return fail("SEALED_ROLE_NOT_SEALED", "a held-out or marking-key entry must be registered sealed");
  const r = entry.resource ?? {};
  if (r.derivation) {
    const d = derivers[r.derivation.rule];
    if (typeof d !== "function") return fail("UNREGISTERED_DERIVATION", `derivation rule "${String(r.derivation.rule)}" has no registered deriver`);
    const got = d(r.derivation.observationId) ?? {};
    const members = [...new Set((got.members ?? []).map((m) => String(m).toLowerCase()))];
    if (!members.length) return fail("DERIVED_POPULATION_EMPTY", "the derivation yields no member — an empty population is never a clean census");
    if (typeof commitment !== "function" || commitment(members) !== entry.contentHash) return fail("DERIVATION_MISMATCH", "the derivation does not reproduce the registered commitment");
    return { ok: true, members, others: got.others ?? [], source: "DERIVED", files: 0 };
  }
  if (r.path && !r.pathPrefixes) return fail("SEALED_ROLE_NOT_BEHIND_A_PREFIX", "a bare path is not refused to ordinary loaders; a sealed role must be declared by path prefix");
  const prefixes = Array.isArray(r.pathPrefixes) ? r.pathPrefixes.filter((p) => typeof p === "string" && p.trim()) : [];
  if (!prefixes.length) return fail("SEALED_ROLE_LOCATION_UNDECLARED", "the entry declares neither a derivation nor a sealed path prefix");
  const base = roots[r.root];
  if (!base || typeof filesOf !== "function") return fail("SEALED_ROLE_ROOT_NOT_SCANNED", `root "${String(r.root)}" is not one this census reads`);
  const norm = (p) => String(p).replace(/\\/g, "/").replace(/\/?$/, "/");
  const inside = filesOf(r.root).filter((p) => prefixes.some((pre) => p.replace(/\\/g, "/").startsWith(norm(pre))));
  if (!inside.length) return fail("SEALED_CONTENT_UNREADABLE", "no tracked file under the declared prefix — a failed read is never an empty population");
  audit.emit({
    eventType: "EVALUATION", action: CENSUS_READ_ACTION, outcome: "ALLOWED", reasonCode: "LEAK_CENSUS_IN_BOUNDARY_READ",
    metadata: { guard: "heldoutFirewallCensus", classification: entry.role, ruleEntry: String(entry.id), role: entry.role, root: String(r.root), resourceRef: resourceRef(r.root, prefixes.join("|")) },
  });
  /* F07 Amendment 2: a marking key's declared label VOCABULARY (the protocol's own class and exclusion words) is public
   * protocol text, not a leak — without this, every document that used such a word would be reported as marking-key
   * content and the census could never be clean. Everything else in the key (its item identities, above all) stays a member. */
  const vocabulary = new Set((entry.role === "MARKING_KEY" && Array.isArray(entry.labelVocabulary) ? entry.labelVocabulary : []).map((v) => String(v).trim().toLowerCase()));
  const members = [...new Set(inside.flatMap((p) => extractMembers(read(join(base, p)).toString("utf8"))))].filter((m) => !vocabulary.has(m));
  if (!members.length) return fail("SEALED_CONTENT_CARRIES_NO_MEMBER", `${inside.length} file(s) under the prefix carry no member of at least ${MIN_MEMBER_LENGTH} characters`);
  return { ok: true, members, others: [], source: "SEALED_PREFIX", files: inside.length };
}

/**
 * THE NEW-ROLE CENSUS — the production entry point calls this, and so do the proofs: one code path, never a copy.
 * For every registered HELD_OUT_EVIDENCE and MARKING_KEY entry: its population inside the boundary, then the same scan with
 * the finding named by role. Returns counts and per-entry results (ids, codes, counts, rows of path/category/counts) and
 * the failures. It returns no member, ever.
 */
export function censusNewRoles({ registry, root, base, files, roots, filesOf, derivers, commitment, productionTexts = [], evaluatorSources = [], read = (f) => readFileSync(f), audit = diagnosticGuardSink({ actor: "tools/heldout-firewall.mjs" }) }) {
  const entries = censusEntries(registry);
  const counts = Object.fromEntries(SEALED_CENSUS_ROLES.map((r) => [r, entries.filter((e) => e.role === r).length]));
  const results = [];
  const failures = [];
  for (const entry of entries.filter(scannedInBoundary)) {
    const pop = sealedRolePopulation(entry, { roots, filesOf, read, derivers, commitment, audit });
    if (!pop.ok) { results.push({ id: entry.id, role: entry.role, ok: false, code: pop.code, why: pop.why }); failures.push(`${pop.code} ${entry.id}`); continue; }
    const fragments = pop.others.length ? distinctiveFragments(pop.members, pop.others, productionTexts) : [];
    const s = scan({ registry, root, base, files, members: pop.members, fragments, evaluatorSources, read, audit, payloadDisposition: ROLE_DISPOSITION[entry.role] });
    results.push({ id: entry.id, role: entry.role, ok: true, members: pop.members.length, source: pop.source, files: pop.files, fragments: fragments.length, rows: s.rows });
    for (const f of s.failures) failures.push(`${f.disposition} ${f.path}`);
  }
  return { counts, results, failures };
}

/**
 * 🔴 F07 AMENDMENT 2 — THE DISCOVERABLE MANIFEST. One row per registered HELD_OUT_EVIDENCE and MARKING_KEY entry: its id,
 * role, link, tenant-scope size, location SHAPE, whether that location can be read, how many files it holds, and the
 * registered commitment. Names, codes, counts and hashes only — never a member, a label, a path inside a store or its
 * directory. A location that cannot be read is reported as such; it is never a zero-file store.
 *   shape  DERIVED · GIT_TRACKED_PREFIX (a root listed from git — `trackedRoots`, by default the engine) · SEALED_STORE (a
 *          declared store outside any git tree)
 */
export function sealedManifest(registry, { roots = {}, filesOf, storeCodes = {}, trackedRoots = ["engine"] } = {}) {
  return censusEntries(registry).filter((e) => NEW_SEALED_ROLES.includes(e.role)).map((e) => {
    const r = e.resource ?? {};
    const shape = r.derivation ? "DERIVED" : trackedRoots.includes(r.root) ? "GIT_TRACKED_PREFIX" : "SEALED_STORE";
    const pre = (r.pathPrefixes ?? []).map((p) => String(p).replace(/\\/g, "/").replace(/\/?$/, "/"));
    const readable = shape === "DERIVED" ? true : Boolean(roots[r.root]) && typeof filesOf === "function";
    const files = shape === "DERIVED" || !readable ? null : filesOf(r.root).filter((p) => pre.some((x) => p.startsWith(x))).length;
    return Object.freeze({
      id: String(e.id), role: e.role, linkedSet: e.role === "MARKING_KEY" ? String(e.linkedSet ?? "NONE") : null,
      tenantScope: Array.isArray(e.tenantScope) ? e.tenantScope.length : 0, shape, root: String(r.root ?? "?"),
      location: shape === "DERIVED" ? "DERIVED_AT_RUNTIME" : readable ? "READABLE" : `UNREADABLE (${storeCodes[r.root] ?? "ROOT_NOT_LOCATED"})`,
      files, commitment: String(e.contentHash ?? "").slice(0, 16),
    });
  });
}

export { registryErrors, entryFor };
