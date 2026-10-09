/**
 * 🔴 AN AUTHORITY RECORD FROM A COMMITTED FILE'S STRUCTURED IDENTITY — AND THE CENSUS OVER THEM (F05 §7).
 *
 * Generic: the inclusion rule and the scope root are handed in (config/authority/inclusion.mjs); nothing here names a
 * subject, product or client. Every field comes from the file's name, its declared date, its committed bytes and its
 * first commit — never from prose. The census resolves each record for its OWN proposition and scope and gives it
 * exactly one disposition; the counts must reconcile with remainder zero.
 */
import { createHash } from "node:crypto";
import { resolve, DISPOSITIONS } from "./register.mjs";

export const contentHashOf = (text) => createHash("sha256").update(String(text).replace(/\r\n/g, "\n"), "utf8").digest("hex");
const DATE = /\d{4}-\d{2}-\d{2}/;

/** Which declared rule includes this file name, if any (first match wins). An excluded name is taken by no rule. */
export const ruleFor = (rules, name, exclude = null) => (exclude && exclude.test(name) ? null : rules.find((r) => r.re.test(name)) ?? null);

/**
 * RR-243 · how a change of rules moved the admitted set over `names`: every name whose admitting rule differs between `before` and
 * `after`, each with `allowed` true ONLY when `before` admitted nothing and one of `allowedNew` admits it now. Any other move — a name
 * dropped, a name taken from one rule by another, a name newly admitted by any other rule — is a change that is not allowed.
 */
export function admissionChanges(names, { before, after, exclude = null, allowedNew = [] }) {
  const out = [];
  for (const name of names) {
    const was = ruleFor(before, name, exclude)?.id ?? null, now = ruleFor(after, name, exclude)?.id ?? null;
    if (was !== now) out.push({ name, before: was, after: now, allowed: was === null && allowedNew.includes(now) });
  }
  return out;
}

/** Proposition id: the file name without extension, its repository prefix and its date token(s), upper-cased. */
export function propositionOf(name, prefix = "") {
  return name.replace(/\.md$/i, "").replace(new RegExp(`^${prefix}`), "").replace(/_?\d{4}-\d{2}-\d{2}_?/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").toUpperCase();
}

/** Scope: the root, narrowed to a ROW or F-row named in the proposition, else the root alone. Never a wildcard. */
export function scopeOf(propositionId, root) {
  const row = propositionId.match(/(?:^|_)ROW(\d+)(?:_|$)/);
  const f = propositionId.match(/(?:^|_)(F\d{2})(?:_|$)/);
  return row ? [root, `ROW${row[1]}`] : f ? [root, f[1]] : [root];
}

export function recordFromFile({ rule, repo, path, name, prefix, commit, blob, text, firstCommitAt, root }) {
  const nameDate = name.match(DATE)?.[0] ?? null;
  const issuedAt = nameDate ?? (firstCommitAt ? firstCommitAt.slice(0, 10) : null);
  let issuerClass = rule.issuer;
  if (!issuerClass && rule.issuerTokens) for (const [tok, cls] of Object.entries(rule.issuerTokens)) if (name.includes(tok)) { issuerClass = cls; break; }
  const propositionId = propositionOf(name, prefix);
  return {
    authorityId: `${repo}:${path}`,
    propositionId,
    scope: scopeOf(propositionId, root),
    issuer: { class: issuerClass ?? null, declaredBy: issuerClass ? (rule.issuer ? `inclusion rule ${rule.id}` : "a token in the file name") : "NOT DECLARED" },
    issuedAt,
    issuedAtSource: nameDate ? "FILE_NAME" : firstCommitAt ? "FIRST_COMMIT" : "NONE",
    effectiveFrom: issuedAt,
    sourceRef: { kind: "GOVERNANCE_RECORD", repo, path, commit, blob },
    status: "CURRENT",
    supersedes: [],
    supersededBy: [],
    contentHash: contentHashOf(text),
    recordedAt: firstCommitAt ?? null,
    inclusionRule: rule.id,
  };
}

/** Resolve every record for its own proposition and scope; exactly one disposition each; remainder must be zero. */
export function census(records, now) {
  const dispositions = records.map((r) => {
    const res = resolve({ records, propositionId: r.propositionId, scope: r.scope ?? [], now });
    const line = res.candidates.find((c) => c.authorityId === r.authorityId);
    return { authorityId: r.authorityId, disposition: line ? line.disposition : res.outcome === "INVALID" ? "INVALID" : "UNACCOUNTED", outcome: res.outcome, reason: line?.reason ?? (res.reasons ?? []).join(", ") };
  });
  const counts = Object.fromEntries(DISPOSITIONS.map((d) => [d, dispositions.filter((x) => x.disposition === d).length]));
  const accounted = Object.values(counts).reduce((a, b) => a + b, 0);
  return { total: records.length, counts, remainder: records.length - accounted, dispositions };
}
