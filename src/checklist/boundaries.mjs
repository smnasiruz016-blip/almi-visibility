/**
 * THE FOUR-PART PASS BOUNDARY FOR EVERY ONE OF THE 58 FEATURES.
 *
 * ── 🔴 WHY THIS PARSES THE FROZEN SOURCE INSTEAD OF RESTATING IT ────────────
 *
 * The owner's ruling requires each row to carry its boundary VERBATIM — not
 * summarised, not paraphrased, copied. The obvious implementation is to type
 * all 58 × 4 parts into a data file. That would be 232 opportunities to
 * paraphrase, and every one of them would look fine in review.
 *
 * So nothing is retyped. The boundaries are READ OUT of
 * `PASS_BOUNDARIES_SOURCE.md`, whose body is sha256-verified against the
 * owner's file. "Verbatim" is then a property of the mechanism rather than a
 * promise about my typing, and the hash is what enforces it.
 *
 * ── THE THREE SHAPES THE DOCUMENT USES ──────────────────────────────────────
 *
 *   1. most items    — four `- **INPUT/EXPECTED/FAILURE/EVIDENCE**` bullets
 *                      in §6, sometimes plus NOTE / BLOCKER TODAY / RULE.
 *   2. `— see §4`    — a split item whose halves are ruled in §4 as a table.
 *   3. `— see §5`    — items 53 and 56, whose four parts are a table in §5.
 *
 * Item 25 is a fourth shape and it is NOT normalised away: it is split inline
 * in §6 with `v0.1 PASS boundary` / `deferred` and **no INPUT and no EXPECTED
 * of its own**. That gap is reported, not filled in. Inventing the two missing
 * parts so the row looks complete is exactly what the contract forbids.
 */

import { readFileSync } from "node:fs";

import {
  splitSource, sectionSix, verify, amendmentContracts, amendment2, amendment4, effectiveClasses, amendment3, amendment5,
  amendment6, applySplitAmendment,
} from "../../tools/verify-pass-boundaries-source.mjs";

const AMENDMENT_6 = new URL("../../PASS_BOUNDARIES_AMENDMENT_6.md", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const AMENDMENT_3 = new URL("../../PASS_BOUNDARIES_AMENDMENT_3.md", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const AMENDMENT_5 = new URL("../../PASS_BOUNDARIES_AMENDMENT_5.md", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const SOURCE = new URL("../../PASS_BOUNDARIES_SOURCE.md", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const AMENDMENT_1 = new URL("../../PASS_BOUNDARIES_AMENDMENT_1.md", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const AMENDMENT_2 = new URL("../../PASS_BOUNDARIES_AMENDMENT_2.md", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const AMENDMENT_4 = new URL("../../PASS_BOUNDARIES_AMENDMENT_4.md", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * 🔴 A SPLIT WITH NO v0.1-HALF CONTRACT CANNOT BE TICKED. Amendment 4 split rows 3 and 7 and, at first, gave
 * their owned half no four-part contract; the guard refused a VERIFIED-PASS on either. The owner's dated
 * addendum (13 September 2026) stated both contracts, and they are READ from the amendment's body. A split
 * whose contract is absent or incomplete still reports the missing half-parts — never filled in from here.
 */
export const HALF_CONTRACT_PARTS = Object.freeze(["v0.1-half input", "v0.1-half expected", "v0.1-half failure", "v0.1-half evidence"]);

/** The four parts a VERIFIED-PASS requires. Frozen; adding a fifth is a ruling. */
export const CONTRACT_PARTS = Object.freeze(["input", "expected", "failure", "evidence"]);

const LABELS = {
  INPUT: "input",
  EXPECTED: "expected",
  FAILURE: "failure",
  EVIDENCE: "evidence",
  NOTE: "note",
  RULE: "rule",
  "BLOCKER TODAY": "blockerToday",
  "v0.1 PASS boundary": "v01PassBoundary",
  deferred: "deferred",
  "FAILURE (v0.1 half)": "failure",
};

const clean = (s) => s.trim().replace(/\s+/g, " ");

/** Pull `- **LABEL** text` bullets out of one §6 section. */
function bulletsOf(block) {
  const out = {};
  for (const m of block.matchAll(/^- \*\*([^*]+)\*\*\s*([\s\S]*?)(?=\n- \*\*|\n### |\n---|$)/gm)) {
    const key = LABELS[m[1].trim()];
    if (key) out[key] = clean(m[2]);
  }
  return out;
}

/** Pull `| **LABEL** | text |` rows out of a §4 or §5 table. */
function tableOf(block) {
  const out = {};
  for (const m of block.matchAll(/^\| \*\*([^*]+)\*\* \| (.+?) \|$/gm)) {
    const key = LABELS[m[1].trim()];
    if (key) out[key] = clean(m[2]);
  }
  return out;
}

/** The §4 / §5 block for one feature id, or null. */
function referencedBlock(body, id, heading) {
  const at = body.indexOf(`## ${heading}`);
  if (at === -1) return null;
  const section = body.slice(at, body.indexOf("\n## ", at + 1) === -1 ? undefined : body.indexOf("\n## ", at + 1));
  const h = section.search(new RegExp(`^### ${id} · `, "m"));
  if (h === -1) return null;
  const rest = section.slice(h + 1);
  const next = rest.search(/^### /m);
  return section.slice(h, next === -1 ? undefined : h + 1 + next);
}

let cached = null;

/**
 * Every feature's boundary, keyed by id.
 *
 * 🔴 THE HASH IS CHECKED ON LOAD. If the frozen source has been edited, these
 * boundaries are not the owner's and nothing downstream may rely on them — so
 * this throws rather than returning text that merely looks official.
 */
export function loadBoundaries() {
  if (cached) return cached;

  const check = verify(SOURCE);
  if (!check.matches) {
    throw new Error(
      "PASS_BOUNDARIES_SOURCE.md does not match its recorded hash. The boundaries below would not " +
        "be the owner's ruling, and a boundary changes only by owner ruling recorded with its date and reason.",
    );
  }

  /**
   * 🔴 AMENDMENT 1 — the six v0.1 halves that had no testable contract.
   *
   * PR #46 reported that items 10, 12, 13, 14, 25 and 38 were ruled as
   * two-column tables and could therefore never be ticked. The owner accepted
   * that and amended the ruling rather than letting the gap be filled in from
   * this side — which is the difference between a boundary changing by owner
   * ruling and a boundary being worked around.
   *
   * The amendment's contracts are OVERLAID onto §4's halves, never replacing
   * the deferred half: that stays exactly as §4 and §5 record it, because a
   * deferred half cannot be run and needs no testable contract.
   */
  const amendment = amendmentContracts(AMENDMENT_1);
  if (!amendment.matches) {
    throw new Error(
      "PASS_BOUNDARIES_AMENDMENT_1.md does not match its recorded hash. The six v0.1-half " +
        "contracts below would not be the owner's, and six features' tickability depends on them.",
    );
  }

  const amendment2Result = amendment2(AMENDMENT_2);
  if (!amendment2Result.matches) {
    throw new Error(
      "PASS_BOUNDARIES_AMENDMENT_2.md does not match its recorded hash. Item 14's contract and the " +
        "seventh state would not be the owner's.",
    );
  }

  const a4 = amendment4(AMENDMENT_4);
  if (!a4.matches) {
    throw new Error(
      "PASS_BOUNDARIES_AMENDMENT_4.md does not match its recorded hash. The classes of rows 2–7 would not " +
        "be the owner's, and which rows may be DEFERRED depends on them.",
    );
  }

  const text = readFileSync(SOURCE, "utf8").replace(/\r\n/g, "\n");
  const { body } = splitSource(text);
  const six = sectionSix(body);

  const heads = [...six.matchAll(/^### (\d+) · (.+?)$/gm)];
  const out = {};

  for (let i = 0; i < heads.length; i += 1) {
    const id = Number(heads[i][1]);
    const headline = heads[i][2];
    const start = heads[i].index;
    const end = i + 1 < heads.length ? heads[i + 1].index : six.length;
    const block = six.slice(start, end);

    const klass = /— \*\*([PSD])(?: \(([^)]*)\))?\*\*/.exec(headline);
    const parts = bulletsOf(block);
    let via = "§6";

    // `— see §4` / `— see §5`: the ruling lives in the earlier section.
    const ref = /— see §(\d)/.exec(headline);
    if (ref) {
      const refBlock = referencedBlock(body, id, `${ref[1]} · `);
      if (refBlock) {
        Object.assign(parts, tableOf(refBlock), parts);
        via = `§${ref[1]}`;
      }
    }

    // The amendment supplies the four parts §4 never stated. It adds; it does
    // not overwrite a part the frozen ruling already gave.
    const amended = amendment.contracts[id];
    if (amended) {
      for (const [k, v] of Object.entries(amended)) if (!parts[k]) parts[k] = v;
      via = `${via}+A1`;
    }

    // 🔴 Amendment 2 REPLACES rather than adds: its heading says "replaces the
    // contract in Amendment 1". Adding only missing parts here would silently
    // keep the old contract — every part was already filled by A1.
    const replaced = amendment2Result.contracts[id];
    if (replaced) {
      for (const [k, v] of Object.entries(replaced)) parts[k] = v;
      via = `${via}+A2`;
    }

    out[id] = {
      id,
      name: clean(headline.replace(/ — \*\*[PSD].*$/, "")),
      class: klass ? klass[1] : null,
      classNote: klass && klass[2] ? klass[2] : null,
      via,
      amendedByA1: Boolean(amended),
      replacedByA2: Boolean(replaced),
      ...parts,
      /* 🔴 Which of the four the DOCUMENT does not supply. Reported, never
       * filled in — a row cannot be VERIFIED-PASS without all four, and the
       * honest way to fail that test is to leave the gap visible. */
      missingParts: CONTRACT_PARTS.filter((p) => !parts[p]),
    };
  }

  /* 🔴 AMENDMENT 4 — the CLASS changes, the text does not. `frozenClass` keeps what §6 says on every row, so
   * a reader can always see a class that moved by ruling; `class` is the one in force. effectiveClasses()
   * refuses a move off any row §6 does not class D. */
  /* 🔴 AMENDMENT 6 — the D2 mixed-limb split (OWNER-RULING-D2-2026-09-19). It is applied BESIDE
   * Amendment 4, never through it: A4's mechanism reads `D → …` only, and its D-only refusal is
   * left intact. applySplitAmendment has its own refusal and admits `P → S` alone. */
  const a6 = amendment6(AMENDMENT_6);
  if (!a6.matches) throw new Error("PASS_BOUNDARIES_AMENDMENT_6.md does not match its recorded hash. The D2 split would not be the owner's.");

  const frozen = Object.fromEntries(Object.values(out).map((r) => [r.id, r.class]));
  const inForce = applySplitAmendment(effectiveClasses(frozen, a4), a6);
  for (const r of Object.values(out)) {
    r.frozenClass = r.class;
    r.class = inForce[r.id];
    const moved = a4.moves[r.id];
    const kept = a4.kept[r.id];
    r.classByA4 = Boolean(moved);
    if (moved || kept) r.a4 = { inputClause: (moved ?? kept).inputClause, inputPresent: (moved ?? kept).inputPresent, verdict: moved ? `D → ${moved.to}` : "stays D" };
    if (moved?.to === "S") {
      /* 🔴 The tickable parts of a split are its v0.1 HALF. The §6 four parts are the FINAL boundary — the
       * public half included — so they are kept on the row as `finalBoundary` for when the phase opens, and
       * the addendum's contract becomes what a VERIFIED-PASS would be measured against. */
      const half = a4.contracts[r.id] ?? {};
      const missing = CONTRACT_PARTS.filter((p) => !half[p]);
      if (missing.length === 0) {
        r.finalBoundary = Object.fromEntries(CONTRACT_PARTS.map((p) => [p, r[p]]));
        for (const p of CONTRACT_PARTS) r[p] = half[p];
        if (half.deferred) r.deferred = half.deferred;
        r.via = `${r.via}+A4`;
        r.halfContractByA4 = true;
      }
      r.missingParts = [...r.missingParts, ...HALF_CONTRACT_PARTS.filter((_, i) => missing.includes(CONTRACT_PARTS[i]))];
    }

    /* 🔴 AMENDMENT 6's splits, handled the same way A4's are: the §6 four parts are the FINAL
     * boundary and stay on the row; the v0.1 half becomes what a VERIFIED-PASS is measured
     * against. A half whose contract is incomplete is REPORTED, never filled in from here. */
    const split6 = a6.moves[r.id];
    if (split6) {
      const half = a6.contracts[r.id] ?? {};
      const missing6 = CONTRACT_PARTS.filter((p) => !half[p]);
      if (missing6.length === 0) {
        r.finalBoundary = Object.fromEntries(CONTRACT_PARTS.map((p) => [p, r[p]]));
        for (const p of CONTRACT_PARTS) r[p] = half[p];
        if (half.deferred) r.deferred = half.deferred;
        r.via = `${r.via}+A6`;
        r.halfContractByA6 = true;
      }
      r.classByA6 = true;
      r.a6 = { applicable: split6.applicable, deferredLimb: split6.deferredLimb, verdict: "P → S" };
      r.missingParts = [...r.missingParts, ...HALF_CONTRACT_PARTS.filter((_, i) => missing6.includes(CONTRACT_PARTS[i]))];
      /* 🔴 BOUNDARY-LAW CLAUSE 5 — the deferred limb as DATA, not only as prose. */
      if (half.deferredLimbs) r.deferredLimbs = half.deferredLimbs.split(/\s*·\s*|\s*,\s*/).filter(Boolean);
    }
  }

  /* 🔴 BOUNDARY-LAW CLAUSE 5, APPLIED TO EVERY SPLIT — "every deferred limb must remain visible in
   * durable, machine-readable status data as well as human-readable boundary prose."
   *
   * The prose already exists for seven of the eight pre-D2 splits as `deferred`. What did not exist
   * anywhere was a STRUCTURED list. It is derived here only where the amendment declared one; where
   * no declaration exists the row is marked UNDECLARED and SAYS SO. 🔴 It is never inferred from the
   * prose — parsing a sentence into limbs would be exactly the invention this file refuses. */
  for (const r of Object.values(out)) {
    if (r.class !== "S") continue;
    if (!r.deferredLimbs) r.deferredLimbs = null;
    r.deferredLimbsDeclared = Array.isArray(r.deferredLimbs) && r.deferredLimbs.length > 0;
  }

  /* 🔴 ROWS ADMITTED BY OWNER RULING — not among the frozen 58, so read out of the amendment that admitted each:
   * 59 and 60 from Amendment 3; 61 from Amendment 5 §4, reserved there until 59 and 60 existed. Never retyped,
   * and each carries the amendment that admitted it. A missing part is reported, never filled in. */
  const a3 = amendment3(AMENDMENT_3);
  if (!a3.matches) throw new Error("PASS_BOUNDARIES_AMENDMENT_3.md does not match its recorded hash. Rows 59 and 60 would not be the owner's.");
  const a5 = amendment5(AMENDMENT_5);
  if (!a5.matches) throw new Error("PASS_BOUNDARIES_AMENDMENT_5.md does not match its recorded hash. Row 61 would not be the owner's.");
  for (const [row, via] of [...a3.rows.map((row) => [row, "A3"]), [a5.row, "A5"]]) {
    if (out[row.id]) throw new Error(`row ${row.id} is admitted by ${via} but already exists — a number is never reused`);
    out[row.id] = {
      id: row.id,
      name: row.name,
      class: row.class,
      frozenClass: null,
      classNote: null,
      via,
      admittedBy: via,
      amendedByA1: false,
      replacedByA2: false,
      classByA4: false,
      ...Object.fromEntries(CONTRACT_PARTS.filter((p) => row.contract[p]).map((p) => [p, row.contract[p]])),
      missingParts: CONTRACT_PARTS.filter((p) => !row.contract[p]),
    };
  }

  cached = Object.freeze(out);
  return cached;
}

/** Ids the frozen document marks deferred, in whole (`D`) or in half (`S`). */
export function deferrableIds(boundaries = loadBoundaries()) {
  return Object.values(boundaries)
    .filter((b) => b.class === "D" || b.class === "S")
    .map((b) => b.id);
}
