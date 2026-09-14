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
/* 🔴 RE-PINNED 13 September 2026 (was 4d0dea70…): the owner's dated ADDENDUM — WORTHINESS to row 7's
 * deferred half, and a v0.1-half four-part contract for rows 3 and 7 — is now part of the body. */
export const AMENDMENT_4_BODY_SHA256 = "c802429e46d60a2d6c75e0122054a642045c7362fa20ab2944283ae5b8702390";
export const AMENDMENT_4_MOVES = Object.freeze({ 3: "S", 4: "P", 5: "P", 6: "P", 7: "S" });
export const AMENDMENT_4_KEPT_DEFERRED = Object.freeze([2]);
/** The splits the addendum gave a v0.1-half contract — read out of the body, and compared to this. */
export const AMENDMENT_4_HALF_CONTRACT_IDS = Object.freeze([3, 7]);

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
  /* The addendum's v0.1-half contracts, read the way Amendment 2's are: the block starts AFTER its heading
   * line and runs to the next heading or the END line. `deferred` names the half that stays out. */
  const contracts = {};
  for (const h of body.matchAll(/^### (\d+) · (.+?) — v0\.1 half$/gm)) {
    const rest = body.slice(h.index);
    const afterHeading = rest.indexOf("\n") + 1;
    const next = rest.slice(afterHeading).search(/^(?:#{2,3} |\*\*END)/m);
    const block = next === -1 ? rest : rest.slice(0, afterHeading + next);
    const parts = {};
    for (const m of block.matchAll(/^\| \*\*(INPUT|EXPECTED|FAILURE|EVIDENCE|deferred)\*\* \| (.+?) \|$/gm)) {
      parts[m[1] === "deferred" ? "deferred" : m[1].toLowerCase()] = m[2].trim().replace(/\s+/g, " ");
    }
    contracts[Number(h[1])] = parts;
  }
  return { sha, matches: sha === AMENDMENT_4_BODY_SHA256, moves, kept, contracts, deferred: count("DEFERRED"), inScope: count("in scope") };
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
 * 🔴 AMENDMENT 5 — the owner's ruling on safe local page construction. It ADDS row 61 and moves no text.
 *
 * Rows 59 and 60 exist nowhere, so row 61 is RESERVED rather than created (the brief's own instruction:
 * "reserve 61 and report it. Never renumber"). The 58-row frozen ledger is untouched; row 61 is read out
 * of §4 of the amendment — its class and its four parts — and counted toward scope beside it.
 */
/**
 * 🔴 AMENDMENT 3 — rows 59 and 60, ruled 13 September 2026, re-issued 14 September 2026 with dated corrections.
 *
 * The rows sit in the brief as fenced plain text, not tables: a label line (`INPUT     …`) followed by
 * continuation lines indented ten spaces. The parser reads each part from its label to its last continuation
 * line and never retypes it. The brief's own in-scope number (32) is stale and is NOT checked here — the
 * ledger census below is.
 */
export const AMENDMENT_3_BODY_SHA256 = "e400bf06bf0980c1d94a85a38e86f0a3d9df47aea179e45e3f2054cc7fe3aa31";
export const AMENDMENT_3_ROWS = Object.freeze([59, 60]);

export function amendment3(path) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const idx = text.indexOf(BODY_MARKER);
  const body = idx === -1 ? text : text.slice(idx + BODY_MARKER.length);
  const sha = createHash("sha256").update(body, "utf8").digest("hex");
  const rows = [];
  const heads = [...body.matchAll(/^ROW (\d+) · (.+?)\s+— ([PSD])$/gm)];
  for (let i = 0; i < heads.length; i += 1) {
    const end = i + 1 < heads.length ? heads[i + 1].index : body.indexOf("LEDGER AND REPORTING", heads[i].index);
    const lines = body.slice(heads[i].index, end === -1 ? undefined : end).split("\n");
    const contract = {};
    let current = null;
    for (const line of lines) {
      const label = /^(INPUT|EXPECTED|FAILURE|EVIDENCE)\s{2,}(.*)$/.exec(line);
      if (label) {
        current = label[1].toLowerCase();
        contract[current] = label[2].trim();
      } else if (current && /^ {10}\S/.test(line)) {
        contract[current] = `${contract[current]} ${line.trim()}`;
      } else {
        current = null;
      }
    }
    for (const k of Object.keys(contract)) contract[k] = contract[k].replace(/\s+/g, " ");
    rows.push({ id: Number(heads[i][1]), name: heads[i][2].trim(), class: heads[i][3], contract });
  }
  return {
    sha,
    matches: sha === AMENDMENT_3_BODY_SHA256,
    rows,
    corrected: /^## 🔴 CORRECTIONS · 14 SEPTEMBER 2026/m.test(body),
    admitOnly: /\*\*ADMITTED ONLY\*\*/.test(body),
  };
}

/**
 * 🔴 THE LEDGER CENSUS — every row the ledger holds: the 58 frozen rows as amended, plus the rows admitted by
 * ruling (59 and 60 by Amendment 3; 61 by Amendment 5, created once 59 and 60 existed). All three are P, so
 * in scope is P + S = 38. Checked against the loaded ledger, not asserted from a brief.
 */
export const EXPECTED_LEDGER_CLASS_COUNTS = Object.freeze({ P: 30, S: 8, D: 23 });
export const EXPECTED_LEDGER_ROWS = 61;

export const AMENDMENT_5_BODY_SHA256 = "cab59fe7b78f37931ed4461d97f4646d2c23b880b3352c7eca56bfa12938cb11";
export const AMENDMENT_5_ROW = 61;

export function amendment5(path) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const idx = text.indexOf(BODY_MARKER);
  const body = idx === -1 ? text : text.slice(idx + BODY_MARKER.length);
  const sha = createHash("sha256").update(body, "utf8").digest("hex");
  const head = /^## 4 · ROW (\d+) · (.+)$/m.exec(body);
  const section = head ? body.slice(head.index, body.indexOf("\n## ", head.index + 1) === -1 ? undefined : body.indexOf("\n## ", head.index + 1)) : "";
  const contract = {};
  for (const m of section.matchAll(/^\| \*\*(INPUT|EXPECTED|FAILURE|EVIDENCE)\*\* \| (.+?) \|$/gm)) contract[m[1].toLowerCase()] = m[2].trim().replace(/\s+/g, " ");
  const klass = /^Class `([PSD])`\. (NOT-STARTED)\./m.exec(section);
  const scope = /\*\*In scope: (\d+) → (\d+)\.\*\*/.exec(section);
  return {
    sha,
    matches: sha === AMENDMENT_5_BODY_SHA256,
    row: head ? { id: Number(head[1]), name: head[2].trim(), class: klass?.[1] ?? null, state: klass?.[2] ?? null, contract } : null,
    reserveIfAbsent: /reserve 61/.test(section),
    inScope: scope ? { before: Number(scope[1]), after: Number(scope[2]) } : null,
  };
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
  const a4HalfIds = Object.keys(a4.contracts).map(Number).sort((x, y) => x - y);
  const a4HalfComplete = a4HalfIds.filter((id) => ["input", "expected", "failure", "evidence"].every((p) => a4.contracts[id][p]));
  console.log(`  addendum    : v0.1-half contracts for item ${a4HalfIds.join(", ")} — ${a4HalfComplete.length}/${a4HalfIds.length} carry all four parts`);

  const a5 = amendment5(at("PASS_BOUNDARIES_AMENDMENT_5.md"));
  const a5Parts = a5.row ? ["input", "expected", "failure", "evidence"].filter((p) => a5.row.contract[p]).length : 0;
  const a5Scope = a5.inScope?.before === eff.P + eff.S && a5.inScope?.after === eff.P + eff.S + 1;
  console.log("PASS_BOUNDARIES_AMENDMENT_5.md");
  console.log(`  body sha256 : ${a5.sha}`);
  console.log(`  matches     : ${a5.matches ? "YES" : "🔴 NO — the amendment has changed"}`);
  console.log(`  row         : ${a5.row?.id} · ${a5.row?.name} · class ${a5.row?.class} · ${a5.row?.state} · ${a5Parts}/4 parts · reserved until rows 59 and 60 existed; created by Amendment 3`);
  console.log(`  in scope    : ${a5.inScope?.before} → ${a5.inScope?.after} · the census in force P+S=${eff.P + eff.S}, plus row ${a5.row?.id}  ${a5Scope ? "agree" : "🔴 DISAGREE"}`);

  const a3 = amendment3(at("PASS_BOUNDARIES_AMENDMENT_3.md"));
  const a3Complete = a3.rows.filter((row) => ["input", "expected", "failure", "evidence"].every((p) => row.contract[p]));
  const ledger = { ...eff };
  for (const row of [...a3.rows, a5.row].filter(Boolean)) ledger[row.class] += 1;
  const ledgerRows = 58 + a3.rows.length + (a5.row ? 1 : 0);
  const ledgerOk = ["P", "S", "D"].every((k) => ledger[k] === EXPECTED_LEDGER_CLASS_COUNTS[k]) && ledgerRows === EXPECTED_LEDGER_ROWS;
  console.log("PASS_BOUNDARIES_AMENDMENT_3.md");
  console.log(`  body sha256 : ${a3.sha}`);
  console.log(`  matches     : ${a3.matches ? "YES" : "🔴 NO — the amendment has changed"}`);
  console.log(`  rows        : ${a3.rows.map((row) => `${row.id} · ${row.name} · ${row.class}`).join(" | ")} — ${a3Complete.length}/${a3.rows.length} carry all four parts`);
  console.log(`  corrections : ${a3.corrected ? "recorded (the stale 'tonight' and 'in scope 32' lines)" : "🔴 NOT FOUND"} · admit-only: ${a3.admitOnly ? "yes" : "🔴 no"}`);
  console.log(`  ledger      : ${ledgerRows} rows · P=${ledger.P} S=${ledger.S} D=${ledger.D} · in scope ${ledger.P + ledger.S}  ${ledgerOk ? "as expected" : "🔴 DISAGREES"}`);

  const bad =
    !r.matches || !r.classesMatch || r.features.count !== EXPECTED_FEATURE_COUNT || !r.features.ok ||
    !a.matches || ids.length !== 6 || complete.length !== 6 ||
    ids.join(",") !== AMENDMENT_1_SPLIT_IDS.join(",") ||
    !a2.matches || !a2.definesFailed || a2ids.join(",") !== AMENDMENT_2_REPLACED_IDS.join(",") ||
    a2complete.length !== a2ids.length ||
    !a4.matches || !a4Census ||
    JSON.stringify(a4Moves) !== JSON.stringify(AMENDMENT_4_MOVES) ||
    Object.keys(a4.kept).map(Number).join(",") !== AMENDMENT_4_KEPT_DEFERRED.join(",") ||
    a4HalfIds.join(",") !== AMENDMENT_4_HALF_CONTRACT_IDS.join(",") || a4HalfComplete.length !== a4HalfIds.length ||
    !a5.matches || a5.row?.id !== AMENDMENT_5_ROW || a5.row?.class !== "P" || a5.row?.state !== "NOT-STARTED" || a5Parts !== 4 ||
    !a5.reserveIfAbsent || !a5Scope ||
    !a3.matches || a3.rows.map((row) => row.id).join(",") !== AMENDMENT_3_ROWS.join(",") || a3Complete.length !== a3.rows.length ||
    a3.rows.some((row) => row.class !== "P") || !a3.corrected || !a3.admitOnly || !ledgerOk;

  console.log(bad ? "\n🔴 VERIFICATION FAILED" : "\nall six frozen texts verified");
  process.exit(bad ? 1 : 0);
}
