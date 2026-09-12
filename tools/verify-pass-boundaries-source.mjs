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

  const bad =
    !r.matches || !r.classesMatch || r.features.count !== EXPECTED_FEATURE_COUNT || !r.features.ok ||
    !a.matches || ids.length !== 6 || complete.length !== 6 ||
    ids.join(",") !== AMENDMENT_1_SPLIT_IDS.join(",");

  console.log(bad ? "\n🔴 VERIFICATION FAILED" : "\nboth frozen texts verified");
  process.exit(bad ? 1 : 0);
}
