/**
 * 🔴 ITEM 55 — NO SECRET VALUE IS EVER PRINTED, LOGGED, HASHED OR LENGTH-MEASURED.
 * PROVED BY EXECUTION, NOT BY GREP.
 *
 * The boundary names the failure precisely: "the no-leak property proved only by
 * a manual grep, which would not catch a future change." So this test PLANTS a
 * fake secret carrying an unmistakable marker, drives every code path that
 * touches the credential — the adapter, the ingest, and the CLI in a child
 * process — and looks for the marker, and for material derived from it,
 * everywhere output can go: console, stdout and stderr (of the child), error
 * messages, stack traces, stored records and returned results.
 *
 * 🔴 A FAKE SECRET, GENERATED HERE. The real key file is never read, never named
 * and never needed. No network: every request goes to an injected fake, and the
 * child process has fetch replaced by a thrower.
 *
 * ── HOW A LEAK IS SEEN ─────────────────────────────────────────────────────
 *
 *   · any EIGHT consecutive characters of the marker — the first run of this
 *     test used whole 12-character needles and was blind to a real leak that
 *     quoted ten;
 *   · a line of the private key, and its sha256, sha1 and md5 digests, whole;
 *   · the LENGTH of the secret and of its file, as whole numbers. They are made
 *     unmistakable by PADDING the secret to exactly SECRET_LENGTH characters —
 *     a number no count in this pipeline produces. 🔴 The first version of this
 *     clause computed the lengths and never searched for them: a sabotage that
 *     logged the key's length passed, and that is how the gap was found.
 *
 * ⚠️ Declared limit: in-process capture covers the console, not raw writes to
 * process.stdout — patching those swallows the test runner's own protocol — and
 * raw stream output is covered instead by the child-process case, which captures
 * both streams whole.
 */
import test from "node:test";
import { declaredWorld } from "./helpers/declared-world.mjs";
/* F02: every entry point decides its tenant first — the runs below go through a DECLARED FIXTURE WORLD (never the real population). */
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
import assert from "node:assert/strict";
import { generateKeyPairSync, createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { createGoogleSearchConsoleProvider } from "../src/search/google-search-console.mjs";
import { runIngest } from "../src/search/ingest.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { createCostGovernor } from "../src/cost/governor.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const MARKER = "ALMIVIS-PLANTED-FAKE-SECRET-3b7e1c9d";
/** The planted private key is padded to exactly this many characters, so its length is unmistakable. */
export const SECRET_LENGTH = 48611;
const WINDOW = 8;

/** A fake service-account key. The marker lives INSIDE the private key (explanatory text before BEGIN, which the signer accepts). */
function plantKey({ shape = "valid" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "almivis-leak-"));
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const body = shape === "bad-pem" ? `-----BEGIN PRIVATE KEY-----\n${MARKER}\n-----END PRIVATE KEY-----\n` : pem;
  // Explanatory text before the PEM block: the marker, padded so the whole secret is exactly SECRET_LENGTH characters.
  const preamble = `${MARKER}${"x".repeat(SECRET_LENGTH - MARKER.length - 1 - body.length)}\n`;
  const secret = `${preamble}${body}`;
  assert.equal(secret.length, SECRET_LENGTH, "the planted secret is not the unmistakable length");
  const json = JSON.stringify({
    type: "service_account",
    project_id: "fake-project",
    private_key_id: `${MARKER}-key-id`,
    private_key: secret,
    client_email: "fake@fake-project.iam.gserviceaccount.com",
  });
  // A key file that is not JSON at all — the shape an operator produces by pointing the variable at the wrong file.
  const text = shape === "not-json" ? `${MARKER} ${json.slice(1)}` : json;
  const path = join(dir, "planted-key.json");
  writeFileSync(path, text);
  const keyLine = pem.split("\n").find((l) => l.length >= 60);
  const digests = (s) => ["sha256", "sha1", "md5"].map((a) => createHash(a).update(s).digest("hex"));
  return {
    dir,
    path,
    whole: [keyLine, ...digests(secret), ...digests(text), ...digests(pem), Buffer.from(MARKER).toString("base64")],
    lengths: [secret.length, text.length],
  };
}

/** What of the planted secret appears in the text: any 8-character window of the marker, a key line or digest whole, or a secret's length as a whole number. */
export function leaksIn(text, whole = [], lengths = []) {
  const s = String(text);
  const hits = [];
  for (let i = 0; i + WINDOW <= MARKER.length; i += 1) {
    const w = MARKER.slice(i, i + WINDOW);
    if (s.includes(w)) hits.push(`marker window "${w}"`);
  }
  for (const n of whole) if (typeof n === "string" && n.length >= WINDOW && s.includes(n)) hits.push(`derived material ${n.slice(0, 6)}…`);
  for (const n of lengths) if (new RegExp(`(^|\\D)${n}(\\D|$)`).test(s)) hits.push(`a secret's length (${n})`);
  return hits;
}

/** Everything printed through the console while `fn` runs. */
async function captureConsole(fn) {
  const chunks = [];
  const saved = {};
  for (const m of ["log", "info", "warn", "error", "debug", "trace", "dir"]) {
    saved[m] = console[m];
    console[m] = (...args) => chunks.push(args.map((a) => (typeof a === "string" ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })())).join(" "));
  }
  let value = null;
  let thrown = null;
  try {
    value = await fn();
  } catch (e) {
    thrown = e;
  } finally {
    Object.assign(console, saved);
  }
  return { printed: chunks.join("\n"), value, thrown };
}

function fakeGoogle({ tokenStatus = 200 } = {}) {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push(url);
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
    if (url.includes("oauth2")) return tokenStatus === 200 ? json(200, { access_token: "fake-access-token" }) : json(tokenStatus, { error: "invalid_grant", error_description: "fake refusal" });
    if (url.endsWith("/sites")) return json(200, { siteEntry: [{ siteUrl: "sc-domain:example.com", permissionLevel: "siteFullUser" }] });
    if (url.includes(encodeURIComponent("https://control.invalid/"))) return json(403, { error: { message: "forbidden" } });
    return json(200, { rows: [{ keys: ["x"], clicks: 0, impressions: 1, ctr: 0, position: 1 }] });
  };
  return { fetchImpl, requests };
}

async function ingestWith(key, fake) {
  const dir = mkdtempSync(join(tmpdir(), "almivis-leak-store-"));
  try {
    const store = createJsonlStore(join(dir, "e.jsonl"));
    const governor = createCostGovernor({ label: "leak test", maxApiCalls: 100, maxWallClockMs: 60000 });
    const provider = createGoogleSearchConsoleProvider({ keyFilePath: key.path, fetchImpl: fake.fetchImpl, governor });
    const cap = await captureConsole(() => runIngest({ provider, store, propertyId: "sc-domain:example.com", estateHostnames: ["a.example.com"], controlProperty: "https://control.invalid/" }));
    const surfaces = [
      cap.printed,
      cap.thrown ? `${cap.thrown.message}\n${cap.thrown.stack}\n${JSON.stringify(cap.thrown)}\n${String(cap.thrown.cause ?? "")}\n${cap.thrown.cause?.stack ?? ""}` : "",
      JSON.stringify(cap.value),
      existsSync(store.path) ? readFileSync(store.path, "utf8") : "",
      JSON.stringify(governor.snapshot()),
    ].join("\n");
    return { ...cap, surfaces, requests: fake.requests };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ---- the detector can see a leak ----------------------------------------- */

test("CONTROL: the leak detector FINDS a ten-character slice of the marker, a key line, a digest and a LENGTH — and nothing in clean text", () => {
  const key = plantKey();
  try {
    assert.deepEqual(leaksIn("token exchange failed: HTTP 401 invalid_grant · 20 rows · 1741 ms", key.whole, key.lengths), []);
    assert.ok(leaksIn(`Unexpected token 'A', "${MARKER.slice(0, 10)}"... is not valid JSON`, key.whole, key.lengths).length > 0, "a 10-character quote of the secret file was not seen");
    assert.ok(leaksIn(`oops ${key.whole[0]}`, key.whole, key.lengths).length > 0, "a line of the private key was not seen");
    assert.ok(leaksIn(`digest ${key.whole[1]}`, key.whole, key.lengths).length > 0, "a HASH of the secret was not seen");
    assert.ok(leaksIn(`key material: ${SECRET_LENGTH} chars`, key.whole, key.lengths).length > 0, "the secret's LENGTH was not seen");
  } finally {
    rmSync(key.dir, { recursive: true, force: true });
  }
});

/* ---- the credential paths, executed ------------------------------------- */

test("🔴 a SUCCESSFUL ingest with the planted key prints, returns and stores NOTHING derived from the secret — not even its length", async () => {
  const key = plantKey();
  try {
    const r = await ingestWith(key, fakeGoogle());
    assert.equal(r.thrown, null, `the ingest did not complete: ${r.thrown?.message}`);
    assert.ok(r.requests.some((u) => u.includes("oauth2")), "the key was never used — the test would be vacuous");
    assert.deepEqual(leaksIn(r.surfaces, key.whole, key.lengths), [], "planted secret material reached an output");
  } finally {
    rmSync(key.dir, { recursive: true, force: true });
  }
});

test("🔴 a REFUSED token exchange fails without the secret in its message or its stack", async () => {
  const key = plantKey();
  try {
    const r = await ingestWith(key, fakeGoogle({ tokenStatus: 401 }));
    assert.ok(r.thrown, "a refused token exchange did not fail");
    assert.deepEqual(leaksIn(r.surfaces, key.whole, key.lengths), []);
  } finally {
    rmSync(key.dir, { recursive: true, force: true });
  }
});

test("🔴 a key file that is NOT JSON fails without quoting any of the file", async () => {
  const key = plantKey({ shape: "not-json" });
  try {
    const r = await ingestWith(key, fakeGoogle());
    assert.ok(r.thrown, "a non-JSON key file did not fail");
    assert.equal(r.requests.length, 0, "a request was issued with an unreadable key");
    assert.deepEqual(leaksIn(r.surfaces, key.whole, key.lengths), [], "the parse error quoted the secret file");
  } finally {
    rmSync(key.dir, { recursive: true, force: true });
  }
});

test("🔴 a key whose PEM is broken fails without the secret in its message or its stack", async () => {
  const key = plantKey({ shape: "bad-pem" });
  try {
    const r = await ingestWith(key, fakeGoogle());
    assert.ok(r.thrown, "a broken PEM did not fail");
    assert.equal(r.requests.length, 0, "a request was issued with an unusable key");
    assert.deepEqual(leaksIn(r.surfaces, key.whole, key.lengths), []);
  } finally {
    rmSync(key.dir, { recursive: true, force: true });
  }
});

/* 🔴 THE FIRST VERSION OF THIS CASE PASSED WITHOUT TESTING ANYTHING. Its network
 * stub was an inline data: URL in NODE_OPTIONS, which splits on spaces — the
 * child died loading the stub, before it ever read the key, and "nothing leaked"
 * was true of a process that never ran. Now the stub is a FILE, and the case
 * must prove the child reached the key before its silence counts. */
test("🔴 THE CLI, in a child process: a planted non-JSON key and a planted broken PEM — nothing on stdout or stderr, and no request made", () => {
  for (const shape of ["not-json", "bad-pem"]) {
    const key = plantKey({ shape });
    try {
      const stub = join(key.dir, "no-network.mjs");
      writeFileSync(stub, 'globalThis.fetch = () => { throw new Error("NETWORK ATTEMPTED IN LEAK TEST"); };\n');
      /* 🔴 THE STORE PATH IS INSIDE THE REPOSITORY, SINCE GAP 2 (16 September 2026).
       * It used to be the planted key's tmpdir. `bin/gsc-ingest.mjs` now confines --store BEFORE
       * anything is read, so a destination outside this repository is REFUSED and the child exits
       * without ever reaching the credential — and this case's own guard below caught exactly that:
       * silence from a process that died early proves nothing. The key itself stays in its tmpdir;
       * only the destination moves, and the case still drives the CLI into the key-handling path. */
      mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
      const storeDir = mkdtempSync(join(REPO, ".test-scratch", "leak-"));
      /* F03: the live ingest names its subject, so it opens the SEARCH_CONSOLE_API connector whose declaration names the key variable. */
      const r = spawnSync(process.execPath, WORLD.argv(["--import", pathToFileURL(stub).href, "bin/gsc-ingest.mjs", "--property=sc-domain:example.com", `--store=${join(storeDir, "e.jsonl")}`, WORLD.subjectArg]), {
        cwd: REPO,
        encoding: "utf8",
        env: WORLD.envWith({ ...process.env, GSC_SERVICE_ACCOUNT_KEY_FILE: key.path }),
      });
      rmSync(storeDir, { recursive: true, force: true });
      const output = `${r.stdout}\n${r.stderr}`;
      assert.notEqual(r.status, 0, `${shape}: the CLI succeeded with a planted broken key`);
      assert.doesNotMatch(output, /NETWORK ATTEMPTED IN LEAK TEST/, `${shape}: a request was attempted before the key was rejected`);
      assert.match(output, /google-search-console\.mjs|key file|GSC_SERVICE_ACCOUNT_KEY_FILE/i, `${shape}: the child never reached the key-handling path — its silence proves nothing`);
      assert.deepEqual(leaksIn(output, key.whole, key.lengths), [], `${shape}: the CLI printed planted secret material`);
    } finally {
      rmSync(key.dir, { recursive: true, force: true });
    }
  }
});
