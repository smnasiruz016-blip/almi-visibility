/**
 * 🔴 THE FROZEN PASS BOUNDARIES VERIFY THEMSELVES.
 *
 * `PASS_BOUNDARIES_SOURCE.md` is the owner's ruling on exactly when each of the
 * 58 features may be ticked. Its whole value depends on the text being the text
 * he ruled. A provenance header saying "verbatim" is a claim; a recomputed hash
 * is that claim made falsifiable.
 *
 * ── WHY THE HASH COVERS THE BODY AND NOT THE WHOLE FILE ─────────────────────
 *
 * Header + body. If the hash covered the whole file, correcting a typo in OUR
 * header would look identical to tampering with HIS ruling — and the only way to
 * fix it would be to edit the recorded hash, which is the exact move the hash
 * exists to detect. Hashing the body alone keeps the two separable.
 *
 * ── AND WHY THE CENSUS IS SEPARATE ──────────────────────────────────────────
 *
 * A hash catches a changed byte. It does not tell a reader WHAT the document is
 * supposed to contain. The counts below are asserted independently, and they are
 * counted INSIDE §6 only: a first pass counted every `### N · ` heading in the
 * file and got 65, because §4 and §5 re-head seven items to rule on them. A
 * whole-document grep is wider than the section, and it inflated the number.
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

/** Everything after the first line that is exactly `---` on its own. */
export const BODY_MARKER = "\n---\n\n";

export const EXPECTED_BODY_SHA256 = "16c580160391eabb14a4d6754edfe18fe1def936384cf831d300640ef73d9e5c";
export const EXPECTED_FEATURE_COUNT = 58;

/**
 * 🔴 AMENDMENT 1 — 12 September 2026. Frozen the same way, for the same reason.
 *
 * It gives the six split features the four-part contract they were never given,
 * so that they can be tested and, if the evidence is not there, failed. It
 * amends the ruling above; it does not replace it. Both are law.
 */
export const AMENDMENT_1_BODY_SHA256 = "ef874f095048938a095613d140aba10451237afa26e6ea14a8aef07a962cc723";
export const AMENDMENT_1_SPLIT_IDS = Object.freeze([10, 12, 13, 14, 25, 38]);

/** The six v0.1-half contracts, read out of the amendment. */
export function amendmentContracts(path) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const idx = text.indexOf(BODY_MARKER);
  const body = idx === -1 ? text : text.slice(idx + BODY_MARKER.length);
  const sha = createHash("sha256").update(body, "utf8").digest("hex");

  const heads = [...body.matchAll(/^### (\d+) · (.+?) — v0\.1 half$/gm)];
  const out = {};
  for (let i = 0; i < heads.length; i += 1) {
    const id = Number(heads[i][1]);
    const block = body.slice(heads[i].index, i + 1 < heads.length ? heads[i + 1].index : body.length);
    const parts = {};
    for (const m of block.matchAll(/^\| \*\*(INPUT|EXPECTED|FAILURE|EVIDENCE)\*\* \| (.+?) \|$/gm)) {
      parts[m[1].toLowerCase()] = m[2].trim().replace(/\s+/g, " ");
    }
    out[id] = parts;
  }
  return { sha, matches: sha === AMENDMENT_1_BODY_SHA256, contracts: out };
}

/**
 * 🔴 AMENDMENT 2 — 12 September 2026, night. Frozen the same way.
 *
 * Two rulings: a seventh state, FAILED; and item 14's v0.1-half contract
 * REPLACED — narrowed to product-repository writes and publishing, and given
 * teeth in a declared register of permitted writers. Unlike Amendment 1 it does
 * not fill a gap, it overwrites a contract, so the loader must REPLACE item
 * 14's four parts rather than add the missing ones.
 */
export const AMENDMENT_2_BODY_SHA256 = "e799fedf5260940bc3835e7a3080cc003a550fb5ef1b03824c2ee029a9efa25e";
export const AMENDMENT_2_REPLACED_IDS = Object.freeze([14]);

/** The seventh state as the amendment spells it, read out rather than assumed. */
export function amendment2(path) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const idx = text.indexOf(BODY_MARKER);
  const body = idx === -1 ? text : text.slice(idx + BODY_MARKER.length);
  const sha = createHash("sha256").update(body, "utf8").digest("hex");

  const contracts = {};
  for (const h of body.matchAll(/^### Item (\d+) · v0\.1 half\b.*$/gm)) {
    /* 🔴 The block starts AFTER the heading line. A first version searched from
     * one character in — `rest.slice(1)` — which turned "### Item 14" into
     * "## Item 14", matched it at once, and yielded an EMPTY block: 0 of 4 parts
     * parsed, and the clean run exited 1 exactly like the corrupted one. */
    const rest = body.slice(h.index);
    const afterHeading = rest.indexOf("\n") + 1;
    const next = rest.slice(afterHeading).search(/^#{2,3} /m);
    const block = next === -1 ? rest : rest.slice(0, afterHeading + next);
    const parts = {};
    for (const m of block.matchAll(/^\| \*\*(INPUT|EXPECTED|FAILURE|EVIDENCE)\*\* \| (.+?) \|$/gm)) {
      parts[m[1].toLowerCase()] = m[2].trim().replace(/\s+/g, " ");
    }
    contracts[Number(h[1])] = parts;
  }
  return {
    sha,
    matches: sha === AMENDMENT_2_BODY_SHA256,
    contracts,
    definesFailed: /^🔴 FAILED\s+← NEW$/m.test(body),
  };
}

/**
 * 🔴 AMENDMENT 4 — 13 September 2026. Frozen the same way.
 *
 * The first amendment that changes a CLASS. It leaves every boundary's text alone — the frozen source
 * above still hashes byte for byte — and moves rows 4, 5 and 6 D → P and rows 3 and 7 D → S, keeping
 * row 2 D with its reason. The moves are READ out of the body's verdict table, never typed here, so a
 * move the owner did not rule cannot appear, and the census they produce is checked against the
 * body's own before/after count table rather than against a number in this file alone.
 */
export const AMENDMENT_4_BODY_SHA256 = "4d0dea705dbfb27e25263bca5bbc0c1efa79546b02dd6c7805e77380825f61d1";
export const AMENDMENT_4_MOVES = Object.freeze({ 3: "S", 4: "P", 5: "P", 6: "P", 7: "S" });
export const AMENDMENT_4_KEPT_DEFERRED = Object.freeze([2]);

/** The class moves, the rows kept deferred, and the count table — as the amendment's body states them. */
export function amendment4(path) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const idx = text.indexOf(BODY_MARKER);
  const body = idx === -1 ? text : text.slice(idx + BODY_MARKER.length);
  const sha = createHash("sha256").update(body, "utf8").digest("hex");

  const moves = {};
  const kept = {};
  const verdictRow = /^\| \*\*(\d+) · (.+?)\*\* \| (.+?) \| (.+?) \| \*\*(?:D → ([PS])(?: \(split\))?|(stays D))\*\* \|$/gm;
  for (const m of body.matchAll(verdictRow)) {
    const row = { name: m[2], inputClause: m[3].trim(), inputPresent: m[4].trim() };
    if (m[5]) moves[Number(m[1])] = { to: m[5], ...row };
    else kept[Number(m[1])] = row;
  }
  const count = (label) => {
    const m = new RegExp(`^\\| ${label} \\| (\\d+) \\| \\*\\*(\\d+)\\*\\* \\|$`, "m").exec(body);
    return m ? { before: Number(m[1]), after: Number(m[2]) } : null;
  };
  return { sha, matches: sha === AMENDMENT_4_BODY_SHA256, moves, kept, deferred: count("DEFERRED"), inScope: count("in scope") };
}

/**
 * The classes in force: the frozen §6 letters with Amendment 4's moves applied. Refuses a move off a row
 * the frozen text does not class D — Amendment 4 opens deferred rows; it never re-classes an in-scope one.
 */
export function effectiveClasses(frozen, a4) {
  const out = { ...frozen };
  for (const [id, m] of Object.entries(a4.moves)) {
    if (frozen[id] !== "D") throw new Error(`Amendment 4 moves item ${id}, which the frozen ruling classes ${frozen[id]}, not D`);
    out[id] = m.to;
  }
  return out;
}

export const EXPECTED_EFFECTIVE_CLASS_COUNTS = Object.freeze({ P: 27, S: 8, D: 23 });

/**
 * 🔴 THE CLASS CENSUS IS PART OF THE FROZEN TEXT, NOT A DERIVED CONVENIENCE.
 *
 * `D` decides which rows may be DEFERRED, and the deferral law says a row is
 * DEFERRED only where this document says so. If the D-count ever moves, the set
 * of rows we are allowed to defer has moved with it, and that must not happen
 * quietly. Note S = 6, not the five named in §4: item 25 carries its own inline
 * split in §6.
 */
export const EXPECTED_CLASS_COUNTS = Object.freeze({ P: 24, S: 6, D: 28 });

export function splitSource(text) {
  const idx = text.indexOf(BODY_MARKER);
  if (idx === -1) throw new Error("PASS_BOUNDARIES_SOURCE.md has no body marker");
  return { header: text.slice(0, idx), body: text.slice(idx + BODY_MARKER.length) };
}

/** The §6 slice — the only section that claims to hold all 58. */
export function sectionSix(body) {
  const at = body.indexOf("## 6 · ALL 58");
  if (at === -1) throw new Error("§6 heading not found — refusing to census a document I cannot locate");
  return body.slice(at);
}

/**
 * Count the boundary sections as a SEQUENCE 1..N rather than as "headings that
 * look numeric", so a stray or duplicated number cannot inflate the count.
 */
export function countFeatures(body) {
  const ids = [...sectionSix(body).matchAll(/^### (\d+) · /gm)].map((m) => Number(m[1]));
  let n = 0;
  for (const id of ids) {
    if (id !== n + 1) return { count: ids.length, sequential: n, ok: false };
    n += 1;
  }
  return { count: ids.length, sequential: n, ok: ids.length === n };
}

/** Every feature's class letter, read from §6 rather than assumed. */
export function classesOf(body) {
  const out = {};
  for (const m of sectionSix(body).matchAll(/^### (\d+) · .*?— \*\*([PSD])(?: \(.*?\))?\*\*/gm)) {
    out[Number(m[1])] = m[2];
  }
  return out;
}

export function verify(path) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const { body } = splitSource(text);
  const sha = createHash("sha256").update(body, "utf8").digest("hex");
  const features = countFeatures(body);
  const classes = classesOf(body);
  const counts = { P: 0, S: 0, D: 0 };
  for (const c of Object.values(classes)) counts[c] += 1;
  return {
    sha,
    matches: sha === EXPECTED_BODY_SHA256,
    features,
    classes,
    counts,
    classesMatch: ["P", "S", "D"].every((k) => counts[k] === EXPECTED_CLASS_COUNTS[k]),
  };
}

/**
 * 🔴 THE MAIN GUARD IS COMPARED AS A RESOLVED PATH, NOT AS A STRING.
 *
 * The obvious form — `import.meta.url === "file://" + argv[1]` — is DEAD ON
 * WINDOWS: `import.meta.url` is `file:///C:/...` with three slashes and the
 * concatenation makes two. The block never runs, the tool prints nothing, and
 * **it exits 0**, which reads exactly like a pass.
 *
 * `tools/verify-checklist-source.mjs` has no main block at all, so running it
 * from a shell has always been a no-op that exits 0. Its real verification is
 * in `test/checklist-status.test.mjs`. This one is wired into a test too — the
 * CLI is a convenience, and the test is the guard.
 */
const invokedDirectly =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href;

if (invokedDirectly) {
  const at = (f) => new URL(`../${f}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

  const r = verify(at("PASS_BOUNDARIES_SOURCE.md"));
  console.log("PASS_BOUNDARIES_SOURCE.md");
  console.log(`  body sha256 : ${r.sha}`);
  console.log(`  matches     : ${r.matches ? "YES" : "🔴 NO — the owner's text has changed"}`);
  console.log(`  features    : ${r.features.count} (sequence 1..${r.features.sequential})`);
  console.log(`  classes     : P=${r.counts.P} S=${r.counts.S} D=${r.counts.D}  ${r.classesMatch ? "as frozen" : "🔴 CHANGED"}`);

  const a = amendmentContracts(at("PASS_BOUNDARIES_AMENDMENT_1.md"));
  const ids = Object.keys(a.contracts).map(Number).sort((x, y) => x - y);
  const complete = ids.filter((id) => ["input", "expected", "failure", "evidence"].every((p) => a.contracts[id][p]));
  console.log("PASS_BOUNDARIES_AMENDMENT_1.md");
  console.log(`  body sha256 : ${a.sha}`);
  console.log(`  matches     : ${a.matches ? "YES" : "🔴 NO — the amendment has changed"}`);
  console.log(`  v0.1 halves : ${ids.length} — ${ids.join(", ")}`);
  console.log(`  complete    : ${complete.length}/6 carry all four parts`);

  const a2 = amendment2(at("PASS_BOUNDARIES_AMENDMENT_2.md"));
  const a2ids = Object.keys(a2.contracts).map(Number).sort((x, y) => x - y);
  const a2complete = a2ids.filter((id) => ["input", "expected", "failure", "evidence"].every((p) => a2.contracts[id][p]));
  console.log("PASS_BOUNDARIES_AMENDMENT_2.md");
  console.log(`  body sha256 : ${a2.sha}`);
  console.log(`  matches     : ${a2.matches ? "YES" : "🔴 NO — the amendment has changed"}`);
  console.log(`  replaces    : item ${a2ids.join(", ")} — ${a2complete.length}/${a2ids.length} carry all four parts`);
  console.log(`  FAILED state: ${a2.definesFailed ? "defined" : "🔴 NOT FOUND"}`);

  const a4 = amendment4(at("PASS_BOUNDARIES_AMENDMENT_4.md"));
  const inForce = effectiveClasses(r.classes, a4);
  const eff = { P: 0, S: 0, D: 0 };
  for (const c of Object.values(inForce)) eff[c] += 1;
  const a4Moves = Object.fromEntries(Object.entries(a4.moves).map(([id, m]) => [id, m.to]));
  const a4Census =
    ["P", "S", "D"].every((k) => eff[k] === EXPECTED_EFFECTIVE_CLASS_COUNTS[k]) &&
    a4.deferred?.before === r.counts.D && a4.deferred?.after === eff.D &&
    a4.inScope?.before === r.counts.P + r.counts.S && a4.inScope?.after === eff.P + eff.S;
  console.log("PASS_BOUNDARIES_AMENDMENT_4.md");
  console.log(`  body sha256 : ${a4.sha}`);
  console.log(`  matches     : ${a4.matches ? "YES" : "🔴 NO — the amendment has changed"}`);
  console.log(`  moves       : ${Object.entries(a4Moves).map(([id, c]) => `${id} D→${c}`).join(" · ")} · kept D: ${Object.keys(a4.kept).join(", ")}`);
  console.log(`  in force    : P=${eff.P} S=${eff.S} D=${eff.D} · the body's table: DEFERRED ${a4.deferred?.before}→${a4.deferred?.after}, in scope ${a4.inScope?.before}→${a4.inScope?.after}  ${a4Census ? "agree" : "🔴 DISAGREE"}`);

  const bad =
    !r.matches || !r.classesMatch || r.features.count !== EXPECTED_FEATURE_COUNT || !r.features.ok ||
    !a.matches || ids.length !== 6 || complete.length !== 6 ||
    ids.join(",") !== AMENDMENT_1_SPLIT_IDS.join(",") ||
    !a2.matches || !a2.definesFailed || a2ids.join(",") !== AMENDMENT_2_REPLACED_IDS.join(",") ||
    a2complete.length !== a2ids.length ||
    !a4.matches || !a4Census ||
    JSON.stringify(a4Moves) !== JSON.stringify(AMENDMENT_4_MOVES) ||
    Object.keys(a4.kept).map(Number).join(",") !== AMENDMENT_4_KEPT_DEFERRED.join(",");

  console.log(bad ? "\n🔴 VERIFICATION FAILED" : "\nall four frozen texts verified");
  process.exit(bad ? 1 : 0);
}
