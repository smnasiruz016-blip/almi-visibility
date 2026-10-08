/**
 * 🔴 RR-232 · THE CLIENT-IDENTITY GUARD (tools/client-identity-guard.mjs) — engine text names no client.
 *
 * G1   the census: every client identifier DERIVED from the declarations (names, domains and their labels, declared seed paths, channel
 *      handles once declared), searched in every tracked engine-text file; ZERO lines may hold one outside the two ruled exemptions.
 * G2   the exemptions are themselves guarded: every pinned acceptance still hashes to its pin (else the frozen-clause exemption fails);
 *      a governance name is exempt only when it is in the committed authority register.
 * G3   the declarations are guarded: ONE operator identity, never a client; no stoplist word is a client identifier.
 * CONTROLS (in memory, on copies — nothing is written): each kind of identifier is caught where the RR-230 leak was (board event text),
 * in a comment, in a tampered frozen clause, behind a fake governance name; a fake second operator, an operator equal to a client, and a
 * stoplist word naming a client are refused; a declared channel handle is derived and caught.
 * Identifiers are never printed — only counts and kinds.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { engineTextFiles, deriveClientIdentifiers, verifiedFrozenClauses, governanceNames, findLeaks, operatorStrings } from "../tools/client-identity-guard.mjs";
import { OPERATOR_IDENTITY, GENERIC_PATH_STOPLIST } from "../config/client-identity.mjs";
import * as ACCEPTANCE_MODULE from "../config/fboard/acceptances.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { DATA_ROOT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* derived once; a refusal (a broken pin, a second operator, a stoplist word naming a client) is held and ASSERTED in G1, never a crash */
const attempt = (fn, empty) => { try { return [fn(), null]; } catch (e) { return [empty, e]; } };
const [IDS, DERIVE_ERROR] = attempt(() => deriveClientIdentifiers({ dataRoot: DATA_ROOT, operator: OPERATOR_IDENTITY, stoplist: GENERIC_PATH_STOPLIST }), new Map());
const [FROZEN, FROZEN_ERROR] = attempt(() => verifiedFrozenClauses({ acceptances: ACCEPTANCE_MODULE, contractSha256 }), new Set());
const NAMES = governanceNames({ corpus: AUTHORITY_CORPUS });
const FILES = engineTextFiles();
const TEXTS = FILES.map((f) => [f, readFileSync(join(REPO, f), "utf8")]);
const leaksOf = (texts) => findLeaks({ texts, identifiers: IDS, frozen: FROZEN, names: NAMES });
const ofKind = (k) => [...IDS].filter(([, kind]) => kind === k).map(([v]) => v);
const replaceIn = (file, from, to) => TEXTS.map(([f, t]) => [f, f === file ? t.replace(from, to) : t]);

test("G1 · CENSUS · no client identifier in engine text outside the two ruled exemptions", () => {
  assert.equal(DERIVE_ERROR?.message ?? null, null, "the declarations could not be read lawfully (operator identity or stoplist refused)");
  assert.equal(FROZEN_ERROR?.message ?? null, null, "a frozen acceptance no longer hashes to its pin — its exemption cannot apply");
  const byKind = [...IDS.values()].reduce((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {});
  assert.ok(ofKind("name").length >= 1 && ofKind("domain").length >= 1 && ofKind("path").length >= 1, "the declarations yielded no names, domains or paths — an empty population proves nothing");
  const leaks = leaksOf(TEXTS);
  console.log(`[client-identity guard] identifiers ${IDS.size} ${JSON.stringify(byKind)} · engine-text files ${FILES.length} · frozen clauses exempt-able ${FROZEN.size} · governance names ${NAMES.size} · leaks ${leaks.length}`);
  assert.deepEqual(leaks.map((l) => `${l.file}:${l.line} [${l.kinds.join(",")}]`), [], "a client identifier is in engine text");
});

test("G2 · the frozen-clause exemption holds only while every pinned acceptance hashes to its pin; a governance name is exempt only from the register", () => {
  assert.ok(FROZEN.size > 100, "no frozen clause was verified — the exemption could not have applied");
  const tampered = Object.fromEntries(Object.entries(ACCEPTANCE_MODULE).map(([k, v]) => [k, v && typeof v === "object" && typeof v.input === "string" ? { ...v } : v]));
  const victim = Object.keys(tampered).find((k) => typeof tampered[k]?.input === "string" && typeof tampered[k]?.contractSha256 === "string");
  tampered[victim].input = tampered[victim].input.replace(/.$/, (c) => (c === "." ? "," : "."));
  assert.throws(() => verifiedFrozenClauses({ acceptances: tampered, contractSha256 }), /no longer hash to their pin/);
  const fileNames = [...NAMES].filter((n) => /^AlmiVisibility_.+\.md$/.test(n));
  assert.ok(fileNames.length > 100, "the register yielded no governance file names");
});

test("G3 · ONE operator identity, never a client; no stoplist word is a client identifier", () => {
  assert.equal(OPERATOR_IDENTITY.length, 1);
  assert.throws(() => operatorStrings({ operator: [...OPERATOR_IDENTITY, { name: "Second", domain: "second.invalid" }], subjects: [] }), /exactly ONE/);
  const name = ofKind("name")[0];
  assert.throws(() => operatorStrings({ operator: [{ name, domain: "x.invalid" }], subjects: [name] }), /equals a declared client subject/);
  assert.throws(() => deriveClientIdentifiers({ dataRoot: DATA_ROOT, operator: OPERATOR_IDENTITY, stoplist: [...GENERIC_PATH_STOPLIST, `/${ofKind("domain-label")[0]}`] }), /stoplist word is a declared client identifier/);
});

/* ── CONTROLS: each refusal shown on an in-memory copy of the engine text ── */
test("CONTROL · a declared client PATH put back into F19's board event text is caught (the RR-230 leak)", () => {
  const path = ofKind("path").find((p) => p.includes("-")) ?? ofKind("path")[0];
  const texts = replaceIn("config/fboard/f-board.mjs", "the declared part (one URL section of the site) is INCOMPLETE", `the ${path} part is INCOMPLETE`);
  assert.notDeepEqual(texts, TEXTS, "the control did not land");
  assert.ok(leaksOf(texts).some((l) => l.file === "config/fboard/f-board.mjs" && l.kinds.includes("path")), "a client path in board text was not caught");
});
test("CONTROL · a client DOMAIN and a client NAME put into a comment are caught", () => {
  const texts = replaceIn("src/write-law.mjs", "\n", `\n/* ${ofKind("domain")[0]} and ${ofKind("name")[0]} */\n`);
  const kinds = leaksOf(texts).filter((l) => l.file === "src/write-law.mjs").flatMap((l) => l.kinds);
  assert.ok(kinds.includes("domain") && kinds.includes("name"), "a client domain or name in a comment was not caught");
});
test("CONTROL · a frozen clause with ONE byte changed is no longer exempt", () => {
  /* the frozen clause lines the guard WOULD flag without exemption (i) — so the control tampers a line that truly needs it */
  const lines = readFileSync(join(REPO, "config/fboard/acceptances.mjs"), "utf8").replace(/\r\n/g, "\n").split("\n");
  const unexempt = findLeaks({ texts: [["config/fboard/acceptances.mjs", lines.join("\n")]], identifiers: IDS, frozen: new Set(), names: NAMES }).map((l) => lines[l.line - 1]);
  const line = unexempt.find((l) => /^\s*(input|expected|failure|evidence): "/.test(l));
  assert.ok(line, "no frozen clause holds a client identifier — the control has nothing to tamper");
  assert.ok(!leaksOf([["config/fboard/acceptances.mjs", lines.join("\n")]]).some((x) => lines[x.line - 1] === line), "CONTROL: the untampered clause must be exempt");
  const tamperedLine = line.replace(/"(,?)\s*$/, 'X"$1');
  assert.notEqual(tamperedLine, line, "the one-byte change did not land");
  const texts = replaceIn("config/fboard/acceptances.mjs", line, tamperedLine);
  assert.ok(leaksOf(texts).some((l) => l.file === "config/fboard/acceptances.mjs"), "a tampered frozen clause stayed exempt");
});
test("CONTROL · a governance file name that is NOT in the register is no exemption", () => {
  const texts = replaceIn("src/write-law.mjs", "\n", `\n/* see AlmiVisibility_FAKE_${ofKind("domain-label")[0].toUpperCase()}_RECORD.md */\n`);
  assert.ok(leaksOf(texts).some((l) => l.file === "src/write-law.mjs"), "a fake governance name exempted a client identifier");
});
test("CONTROL · a channel handle, once declared, is derived and caught", () => {
  const root = mkdtempSync(join(tmpdir(), "rr232-handle-"));
  try {
    mkdirSync(join(root, "tenancy"), { recursive: true });
    cpSync(join(DATA_ROOT, "roots.json"), join(root, "roots.json"));
    const att = JSON.parse(readFileSync(join(DATA_ROOT, "tenancy", "attachments.json"), "utf8"));
    att.attachments.push({ resourceKind: "YOUTUBE_CHANNEL", resourceRef: "@fixturechannelhandle", tenantId: att.attachments[0].tenantId });
    writeFileSync(join(root, "tenancy", "attachments.json"), JSON.stringify(att));
    const ids = deriveClientIdentifiers({ dataRoot: root, operator: OPERATOR_IDENTITY, stoplist: GENERIC_PATH_STOPLIST });
    assert.equal(ids.get("fixturechannelhandle"), "handle");
    const leaks = findLeaks({ texts: [["src/x.mjs", "// see @fixturechannelhandle"]], identifiers: ids, frozen: FROZEN, names: NAMES });
    assert.equal(leaks.length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
