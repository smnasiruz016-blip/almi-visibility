/**
 * GATE A, PART FOUR — A SPECIFIC WHY_THIS_URL_DESERVES_TO_EXIST, JUDGED ONLY AS FAR AS IT CAN BE MEASURED.
 *
 * ── 🔴 THE DEFECT THIS CLOSES, AND ONLY IN THE CONSTRUCTION PATH ────────────
 *
 *   GATE-4 (PHASE_0_FROZEN_GAP_REGISTER.md): "§4 asks for a SPECIFIC URL
 *   justification; the check accepts ANY non-empty string — a single character
 *   passes."
 *
 * `runGateA` in run.mjs still carries that non-empty check, and it is left as it
 * is: the calibration runners use it and nothing is removed from `src/`. This
 * module is what the construction path (src/page/construct.mjs) enforces.
 *
 * It is Gate A's own fourth frozen part, a gate already in scope — NOT row 21
 * (URL right-to-exist), which stays DEFERRED. Owner ruling, 14 September 2026.
 *
 * ── WHAT IS ENFORCED — each one measurable ─────────────────────────────────
 *
 *   PRESENT        the spec declares both halves: `humanNeed` and `distinctValue`
 *   NAMES A NEED   `humanNeed` says something beyond the variant's own name
 *   NOT A TEMPLATE the rationale is not a sibling's rationale with the variant
 *                  swapped — compared with EVERY declared variant masked out
 *   NOT NEAR-IDENTICAL its word shingles overlap no sibling's rationale by more
 *                  than WHY_NEAR_IDENTICAL
 *
 * A sibling that declares no rationale cannot be compared against, so this
 * candidate's distinctness is BLOCKED / NOT TESTED rather than passed. A family
 * of one has no sibling at all, and that is NOT TESTED too — never a pass.
 *
 * ── 🔴 WHAT IS NOT ENFORCED — stated, because an unstated limit reads as a pass ─
 *
 * WHY_NOT_ENFORCED below. Whether the need is real, whether the value is
 * genuinely distinct in substance, whether the page deserves to exist. That is
 * the residue of GATE-4, and it stays OPEN.
 *
 * ⚠️ DECLARED CHOICES, not calibrations: the near-identical bar reuses Gate A's
 * frozen MAX_SIBLING_OVERLAP rather than inventing a new number, and shingles are
 * three words because a rationale is a few sentences, not a page. Neither has
 * been measured against real rationales, because none exist yet.
 */
import { tokenise } from "./tokens.mjs";
import { shingles, jaccard } from "./overlap.mjs";
import { MAX_SIBLING_OVERLAP } from "./run.mjs";

export const WHY_FIELD = "whyThisUrlDeservesToExist";
export const WHY_PARTS = Object.freeze(["humanNeed", "distinctValue"]);
export const WHY_SHINGLE_N = 3;
export const WHY_NEAR_IDENTICAL = MAX_SIBLING_OVERLAP;
/* 🔴 LETTERS ONLY. The first mask was "⟨variant⟩" — and tokenise() strips edge punctuation, so it came out as
 * the ordinary word "variant": a humanNeed of nothing but a variant's name then "named a need", and the RED
 * test for exactly that case caught it. A mask must survive the tokeniser it is fed to. */
export const VARIANT_MASK = "zzvariantmaskzz";

export const WHY_NOT_ENFORCED =
  "NOT ENFORCED: whether the named need is real, whether the declared value is genuinely distinct in substance, " +
  "and whether the page deserves to exist — judging specificity beyond the four measurable checks is not done " +
  "here. The residue of GATE-4 stays OPEN.";

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tokens of a text with every declared variant — as written and with its hyphens as spaces — masked. */
export function maskedTokens(text, variants = []) {
  let s = String(text ?? "").toLowerCase();
  const forms = [...new Set(variants.flatMap((v) => [String(v).toLowerCase(), String(v).toLowerCase().replace(/[-_]+/g, " ")]))]
    .sort((a, b) => b.length - a.length);
  for (const form of forms) {
    s = s.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escape(form)}(?![\\p{L}\\p{N}])`, "gu"), ` ${VARIANT_MASK} `);
  }
  return tokenise(s);
}

const isDeclared = (why) => Boolean(why) && WHY_PARTS.every((p) => typeof why[p] === "string" && why[p].trim().length > 0);

/**
 * @param {string} slug
 * @param {object} spec           the candidate's page spec
 * @param {{slug: string, spec: object}[]} siblings every OTHER declared spec of the same product
 * @param {string[]} variants     the product's declared variants — what a one-variable swap would swap
 * @returns {{ state: "PASS"|"FAIL"|"BLOCKED / NOT TESTED", kind: string|null, reason: string|null, checks: object[], notEnforced: string }}
 */
export function judgeWhy(slug, spec, siblings = [], variants = []) {
  const why = spec?.[WHY_FIELD];
  const checks = [];
  const out = (state, kind, reason) => ({ state, kind, reason, checks, notEnforced: WHY_NOT_ENFORCED });

  if (!isDeclared(why)) {
    checks.push({ check: "present", state: "FAIL" });
    return out("FAIL", "DATA GAP", `${slug}: no ${WHY_FIELD} declared with both ${WHY_PARTS.join(" and ")}`);
  }
  checks.push({ check: "present", state: "PASS" });

  const need = maskedTokens(why.humanNeed, variants).filter((t) => t !== VARIANT_MASK);
  if (need.length === 0) {
    checks.push({ check: "names a human need", state: "FAIL" });
    return out("FAIL", "REJECT", `${slug}: humanNeed names nothing but the variant`);
  }
  checks.push({ check: "names a human need", state: "PASS" });

  const mine = maskedTokens(`${why.humanNeed} ${why.distinctValue}`, variants);
  const failures = [];
  const unmeasured = [];
  for (const s of siblings) {
    const theirs = s.spec?.[WHY_FIELD];
    if (!isDeclared(theirs)) {
      unmeasured.push(s.slug);
      continue;
    }
    const other = maskedTokens(`${theirs.humanNeed} ${theirs.distinctValue}`, variants);
    if (mine.join(" ") === other.join(" ")) {
      failures.push(`the same rationale as ${s.slug} with the variant swapped — a template, not a reason`);
      continue;
    }
    const n = Math.max(1, Math.min(WHY_SHINGLE_N, mine.length, other.length));
    const score = jaccard(shingles(mine, n), shingles(other, n));
    checks.push({ check: "near-identical", against: s.slug, score: Number(score.toFixed(4)), bar: WHY_NEAR_IDENTICAL });
    if (score > WHY_NEAR_IDENTICAL) failures.push(`near-identical to ${s.slug}'s rationale (${score.toFixed(4)} > ${WHY_NEAR_IDENTICAL})`);
  }

  if (failures.length) {
    checks.push({ check: "distinct from every sibling", state: "FAIL" });
    return out("FAIL", "REJECT", `${slug}: ${failures.join("; ")}`);
  }
  if (siblings.length === 0) {
    checks.push({ check: "distinct from every sibling", state: "BLOCKED / NOT TESTED" });
    return out("BLOCKED / NOT TESTED", null, `${slug}: no sibling spec is declared, so distinctness from siblings cannot be exercised`);
  }
  if (unmeasured.length) {
    checks.push({ check: "distinct from every sibling", state: "BLOCKED / NOT TESTED" });
    return out("BLOCKED / NOT TESTED", null, `${slug}: sibling(s) ${unmeasured.join(", ")} declare no rationale, so this one cannot be shown not to be a copy of theirs`);
  }
  checks.push({ check: "distinct from every sibling", state: "PASS" });
  return out("PASS", null, null);
}
