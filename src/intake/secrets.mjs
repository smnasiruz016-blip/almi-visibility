/**
 * 🔴 F01 §9 · THE SECRET FIREWALL — VALUE-SHAPED DETECTION, NEVER A WORD LIST (24 September 2026).
 *
 * A declaration is refused when any string in it — a value or a key, at any depth — has the SHAPE of a credential.
 * A word alone is never a secret: a label reading "rotate the token monthly" passes, because nothing in it is
 * shaped like a token. A value shaped like one fails, whatever field it sits in.
 *
 * 🔴 WHAT A FINDING CARRIES: the JSON path where it sits and the detector's name. NEVER the value, a prefix, a
 * suffix, a length or a hash of it (standing owner ruling). A caller that needs to report a refusal reports these
 * two fields and nothing else, so a secret cannot reach an error, a log, an audit event or a report through here.
 */

/** Each detector is a SHAPE. Order is irrelevant; every match is reported by name. */
export const SECRET_DETECTORS = Object.freeze([
  Object.freeze({ id: "PRIVATE_KEY_BLOCK", re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ }),
  Object.freeze({ id: "AUTHORIZATION_HEADER", re: /\bauthorization\s*:\s*\S+/i }),
  Object.freeze({ id: "BEARER_CREDENTIAL", re: /\bbearer\s+[A-Za-z0-9._~+/=-]{12,}/i }),
  Object.freeze({ id: "BASIC_CREDENTIAL", re: /\bbasic\s+[A-Za-z0-9+/]{12,}={0,2}(?![A-Za-z0-9+/=])/i }),
  Object.freeze({ id: "COOKIE_HEADER", re: /\b(set-)?cookie\s*:\s*[^=\s;]+=[^;\s]+/i }),
  Object.freeze({ id: "JSON_WEB_TOKEN", re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/ }),
  Object.freeze({ id: "URL_WITH_CREDENTIALS", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/i }),
  Object.freeze({ id: "CONNECTION_STRING", re: /(^|[;\s])(password|pwd)\s*=\s*[^;\s]+/i }),
  Object.freeze({ id: "SECRET_ASSIGNMENT", re: /\b[A-Za-z0-9_]*(secret|passw(or)?d|token|api_?key|private_?key|credential)[A-Za-z0-9_]*\s*[=:]\s*["']?[^\s"']{8,}/i }),
  Object.freeze({ id: "PROVIDER_KEY_PREFIX", re: /\b(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|xox[abposr]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|glpat-[A-Za-z0-9_-]{20,})\b/ }),
]);

/**
 * A long token with mixed character classes and no spaces is how an issued key looks, whatever it is called.
 * 🔴 Three classes are required (upper, lower, digit): an all-lowercase hex identifier — the shape every declared id
 * in this contract uses — is two classes and is never flagged, so identifiers cannot trip the firewall by design.
 */
const HIGH_ENTROPY_TOKEN = /(?:^|[\s"'=:,])([A-Za-z0-9+/_-]{32,}={0,2})(?=$|[\s"',;])/g;
function highEntropy(s) {
  for (const m of s.matchAll(HIGH_ENTROPY_TOKEN)) {
    const t = m[1];
    if (/[A-Z]/.test(t) && /[a-z]/.test(t) && /[0-9]/.test(t)) return true;
  }
  return false;
}

/** The detector names that fire on one string. */
export function secretShapesIn(s) {
  if (typeof s !== "string" || s === "") return [];
  const hits = SECRET_DETECTORS.filter((d) => d.re.test(s)).map((d) => d.id);
  if (highEntropy(s)) hits.push("HIGH_ENTROPY_TOKEN");
  return hits;
}

/**
 * Every secret-shaped string in a value, with WHERE it is and WHICH detector fired — and nothing of the value.
 * Keys are checked as well as values: a secret pasted as a property name is still a secret.
 */
export function findSecrets(value, path = "$") {
  const out = [];
  const visit = (v, p) => {
    if (typeof v === "string") { for (const d of secretShapesIn(v)) out.push(Object.freeze({ path: p, detector: d })); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => visit(x, `${p}[${i}]`)); return; }
    if (v !== null && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        for (const d of secretShapesIn(k)) out.push(Object.freeze({ path: `${p}{key}`, detector: d }));
        visit(x, /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? `${p}.${k}` : `${p}[key]`);
      }
    }
  };
  visit(value, path);
  return out;
}
