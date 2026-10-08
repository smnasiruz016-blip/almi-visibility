/**
 * 🔴 RR-232 · THE CLIENT-IDENTITY GUARD — no client-identifying string in engine text.
 *
 * WHY. RR-230: F19's VERIFIED event text carried a client's URL path, and the full suite passed (3464/3464). The neutrality test then
 * policed only a list of owned modules and knew no client paths at all; only a manual review caught it.
 *
 * WHAT IT DERIVES (never hard-coded — every identifier comes from the tenant declarations in the data root):
 *   names        every declared subject id, with and without its hyphens
 *   domains      the host of every SITE_ORIGIN attached to a tenant, and that host's first label — except an origin reached only by a
 *                non-PUBLIC_SITE connector (a third-party source a subject reads, not the client's identity)
 *   paths        the first path segment of every declared research-batch seed, minus the declared generic stoplist
 *   handles      a declared channel's handle (an attachment of a channel kind, or a reference starting "@"), once any is declared
 * minus the ONE declared operator identity (config/client-identity.mjs).
 *
 * WHERE IT LOOKS: engine text — every tracked file under src/, bin/, config/, tools/, .github/, and package.json.
 *
 * THE ONLY EXEMPTIONS (technical ruling RR-232 REV2, Q2), each itself guarded:
 *   (i)  a line of config/fboard/acceptances.mjs that is a byte-exact frozen acceptance clause (input / expected / failure / evidence) of
 *        an acceptance whose clauses still hash to its pinned contractSha256 — a tampered clause is neither exempt nor silent: the pin
 *        check fails;
 *   (ii) a governance record's NAME — its file name, authority id or proposition id — present in the committed authority register
 *        (config/authority/corpus.mjs). A name that is not in the register is not exempt.
 * Every other line — board EVENT text included — is guarded.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return null; } };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The engine text the guard reads: tracked files only, the same everywhere (CI included). */
export function engineTextFiles({ repo = REPO } = {}) {
  return execFileSync("git", ["-C", repo, "ls-files", "src", "bin", "config", "tools", ".github", "package.json"], { encoding: "utf8" })
    .split("\n").filter((f) => f && !/\.(png|jpg|jpeg|gif|br|gz|pdf|ico|woff2?)$/i.test(f));
}

/** The operator identity, checked: exactly one entry, and never a declared client subject. Returns the strings it removes. */
export function operatorStrings({ operator, subjects }) {
  if (!Array.isArray(operator) || operator.length !== 1) throw Object.assign(new Error(`OPERATOR_IDENTITY must hold exactly ONE entry; it holds ${operator?.length ?? 0}`), { code: "OPERATOR_NOT_ONE" });
  const [o] = operator;
  const domain = String(o.domain ?? "").toLowerCase();
  const out = new Set([String(o.name ?? "").toLowerCase(), domain, domain.split(".")[0]].filter(Boolean));
  for (const s of subjects) for (const v of [s.toLowerCase(), s.toLowerCase().replace(/-/g, "")]) if (out.has(v)) throw Object.assign(new Error("the operator identity equals a declared client subject"), { code: "OPERATOR_IS_A_CLIENT" });
  return out;
}

/** The client identifiers, derived from the declarations at `dataRoot`. Map: identifier → kind. */
export function deriveClientIdentifiers({ dataRoot, operator, stoplist }) {
  const roots = JSON.parse(readFileSync(join(dataRoot, "roots.json"), "utf8"));
  const att = JSON.parse(readFileSync(join(dataRoot, "tenancy", "attachments.json"), "utf8")).attachments ?? [];
  const subjects = (roots.subjects ?? []).map((s) => s.subjectId).filter(Boolean);
  const op = operatorStrings({ operator, subjects });
  const ids = new Map();
  const add = (kind, v) => { const x = String(v ?? "").toLowerCase(); if (x.length >= 4 && !op.has(x)) ids.set(x, kind); };
  for (const s of subjects) { add("name", s); add("name", s.replace(/-/g, "")); }
  const thirdParty = new Set((roots.subjects ?? []).flatMap((s) => (s.connectors ?? []).filter((c) => c.kind !== "PUBLIC_SITE").flatMap((c) => (c.reaches ?? []).map((r) => hostOf(r.resourceRef)))));
  for (const a of att) {
    if (a.resourceKind === "SITE_ORIGIN") { const h = hostOf(a.resourceRef); if (!h || thirdParty.has(h)) continue; add("domain", h); add("domain-label", h.split(".")[0]); }
    if (/CHANNEL/.test(String(a.resourceKind)) || String(a.resourceRef).startsWith("@")) add("handle", String(a.resourceRef).replace(/^@/, ""));
  }
  const stop = new Set(stoplist.map((w) => w.toLowerCase()));
  const research = (roots.stores ?? []).find((s) => s.store === "RESEARCH");
  const dir = research ? join(dataRoot, research.path) : null;
  for (const b of dir && existsSync(dir) ? readdirSync(dir) : []) {
    const p = join(dir, b, "seeds.txt");
    if (!existsSync(p)) continue;
    for (const l of readFileSync(p, "utf8").split(/\r?\n/)) {
      let seg = null;
      try { seg = new URL(l.trim()).pathname.split("/")[1] || null; } catch { seg = null; }
      if (seg && !stop.has(`/${seg.toLowerCase()}`)) add("path", `/${seg}`);
    }
  }
  /* a stoplist word may never be a client's identity */
  for (const w of stop) { const bare = w.replace(/^\//, ""); for (const [id, kind] of ids) if (kind !== "path" && id === bare) throw Object.assign(new Error(`a stoplist word is a declared client identifier (${kind})`), { code: "STOPLIST_NAMES_A_CLIENT" }); }
  return ids;
}

/** Exemption (i): the frozen clause strings whose acceptance still hashes to its pin. Throws when any pinned acceptance does not. */
export function verifiedFrozenClauses({ acceptances, contractSha256 }) {
  const values = new Set();
  const broken = [];
  for (const [name, a] of Object.entries(acceptances)) {
    if (!a || typeof a !== "object" || typeof a.contractSha256 !== "string" || typeof a.input !== "string") continue;
    if (contractSha256(a) !== a.contractSha256) { broken.push(name); continue; }
    for (const k of ["input", "expected", "failure", "evidence"]) values.add(a[k]);
  }
  if (broken.length) throw Object.assign(new Error(`frozen acceptance(s) no longer hash to their pin: ${broken.join(", ")}`), { code: "FROZEN_CLAUSE_NOT_ITS_PIN" });
  return values;
}

/** Exemption (ii): every governance record name in the committed authority register. */
export function governanceNames({ corpus }) {
  const s = new Set();
  for (const r of corpus) {
    for (const v of [r?.authorityId, r?.propositionId, r?.sourceRef?.path]) if (typeof v === "string" && v) s.add(v);
    if (typeof r?.authorityId === "string") s.add(r.authorityId.replace(/^[^:]+:/, ""));
  }
  return s;
}

/** One line, with its exempt parts removed: governance names found in the register. A name NOT in the register stays in the line. */
export function strippedLine(line, names) {
  return line.replace(/(?:_handoffs:)?AlmiVisibility_[A-Za-z0-9_.\-]+\.md|\b[A-Z][A-Z0-9_\-]{6,}\b/g, (tok) => (names.has(tok) ? " " : tok));
}

/** Every leak: { file, line, kinds }. `texts` is [[file, text]]; `frozen` the verified clause strings; `names` the governance names. */
export function findLeaks({ texts, identifiers, frozen, names, acceptancesFile = "config/fboard/acceptances.mjs" }) {
  const res = [...identifiers].map(([v, kind]) => [kind, new RegExp(kind === "path" ? `${esc(v)}(?![a-z0-9-])` : `(?<![a-z0-9])${esc(v)}(?![a-z0-9])`, "i")]);
  const leaks = [];
  for (const [file, text] of texts) {
    text.replace(/\r\n/g, "\n").split("\n").forEach((raw, i) => {
      if (file === acceptancesFile) {
        const m = raw.match(/^\s*(input|expected|failure|evidence):\s*("(?:[^"\\]|\\.)*")\s*,?\s*$/);
        if (m) { let v = null; try { v = JSON.parse(m[2]); } catch { v = null; } if (v !== null && frozen.has(v)) return; }
      }
      const line = strippedLine(raw, names);
      const kinds = res.filter(([, re]) => re.test(line)).map(([k]) => k);
      if (kinds.length) leaks.push({ file, line: i + 1, kinds: [...new Set(kinds)] });
    });
  }
  return leaks;
}
