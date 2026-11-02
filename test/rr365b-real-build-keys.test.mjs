/**
 * 🔴 RR-365b (owner, 2 Nov 2026): 1.15.18 refused every update and every licence answer: a proof's stand-in public key was inside its REAL Setup.
 * A REAL build, and a release, can no longer carry any key but the production one. Fingerprints of public keys only; every key here is thrown away after the test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTION_KEYS, fingerprintOf, keysFault, keysFolderFault, packageKeysFault, packedFile } from "../desktop/production-keys.mjs";
import { makeRelease } from "../site/owner-release.mjs";
import { verifyManifest } from "../desktop/updater.mjs";
import { tinyZip } from "./helpers/tiny-zip.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), ".."), BUILD = join(REPO, "desktop", "build.mjs");
const pair = () => { const k = generateKeyPairSync("ed25519"); return { pub: k.publicKey.export({ type: "spki", format: "pem" }), priv: k.privateKey.export({ type: "pkcs8", format: "pem" }) }; };
const inTemp = (fn) => { const root = mkdtempSync(join(tmpdir(), "rr365b-")); try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); } };
/** 1.15.18's own stand-in key, by fingerprint: the one that went out. */
const STAND_IN = "b914c7458670c328";

test("the production fingerprints: two different full SHA-256 values, and not the stand-in key that went out in 1.15.18", () => {
  assert.deepEqual(Object.keys(PRODUCTION_KEYS).sort(), ["licence-public.pem", "update-public.pem"]);
  for (const f of Object.values(PRODUCTION_KEYS)) { assert.match(f, /^[0-9a-f]{64}$/); assert.ok(!f.startsWith(STAND_IN)); }
  assert.notEqual(PRODUCTION_KEYS["licence-public.pem"], PRODUCTION_KEYS["update-public.pem"], "the two jobs have two keys");
});

test("keysFault: the expected key passes; another, a missing one and something that is no key are named, with no key text", () => {
  const a = pair(), b = pair(), want = { "update-public.pem": fingerprintOf(a.pub) };
  assert.equal(keysFault(() => a.pub, "here", want), null);
  const other = keysFault(() => b.pub, "here", want);
  assert.match(other, /update-public\.pem in here is not the production key/);
  assert.ok(!other.includes(b.pub.split("\n")[1]) && !other.includes("BEGIN"));
  assert.match(keysFault(() => null, "here", want), /is not in here/);
  assert.match(keysFault(() => "not a key", "here", want), /is not a public key/);
});

test("THE BUILD: a REAL build with any other key stops before it writes anything (not even the output folder)", () => inTemp((root) => {
  const keys = join(root, "keys"), out = join(root, "out"), a = pair(); mkdirSync(keys);
  writeFileSync(join(keys, "licence-public.pem"), a.pub); writeFileSync(join(keys, "update-public.pem"), a.pub);
  const r = spawnSync(process.execPath, [BUILD, "--version=9.9.9", `--out=${out}`, `--keys=${keys}`], { encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 4, `the build did not refuse: ${r.stderr}`);
  assert.match(r.stderr, /REFUSED — a REAL build carries only the production keys: licence-public\.pem .* is not the production key/);
  assert.ok(!existsSync(out), "a refused build wrote something");
  rmSync(join(keys, "licence-public.pem"));
  const gone = spawnSync(process.execPath, [BUILD, "--version=9.9.9", `--out=${out}`, `--keys=${keys}`], { encoding: "utf8", timeout: 30000 });
  assert.equal(gone.status, 4); assert.match(gone.stderr, /licence-public\.pem is not in/); assert.ok(!existsSync(out));
}));

test("THE BUILD: a proof says --test-keys out loud, never into a REAL or RELEASE folder, and its files are named for what they are", () => inTemp((root) => {
  for (const name of ["AlmiVisibility-9.9.9-REAL", "AlmiVisibility-9.9.9-RELEASE"]) {
    const out = join(root, name), r = spawnSync(process.execPath, [BUILD, "--version=9.9.9", `--out=${out}`, `--keys=${join(root, "none")}`, "--test-keys"], { encoding: "utf8", timeout: 30000 });
    assert.equal(r.status, 4, name); assert.match(r.stderr, /never goes into a REAL or RELEASE folder/); assert.ok(!existsSync(out));
  }
  const src = readFileSync(BUILD, "utf8");
  assert.match(src, /const MARK = TEST_KEYS \? "-TEST-KEYS" : ""/);
  assert.match(src, /AlmiVisibility-Setup-\$\{VERSION\}\$\{MARK\}\.exe/); assert.match(src, /AlmiVisibility-\$\{VERSION\}\$\{MARK\}\.zip/);
}));

test("THE BUILD also reads the keys back out of the package it wrote, before the Setup is made from it", () => {
  const src = readFileSync(BUILD, "utf8"), check = src.search(/if \(!TEST_KEYS\) \{ const fault = packageKeysFault\(readFileSync\(packageZip\), packageZip\); if \(fault\) \{ rmSync\(packageZip, \{ force: true \}\);[^\n]*process\.exit\(4\); \} \}/), setup = src.indexOf("compileSetup({ repo: REPO, out: setupExe");
  assert.ok(check > 0 && setup > check, "the package is not read back, refused and removed before the Setup is made");
  assert.ok(src.indexOf("keysFolderFault(KEYS)") < src.indexOf("rmSync(stage"), "the folder's keys are not checked before the first write");
});

test("the zip reader: stored and deflated, forward and back slashes (.NET's zip), a missing file, and not a zip", () => {
  const f = { "desktop/keys/update-public.pem": "hello key", "other.txt": "x" };
  for (const opts of [{}, { deflate: true }, { backslash: true }, { deflate: true, backslash: true }]) {
    const z = tinyZip(f, opts);
    assert.equal(packedFile(z, "desktop/keys/update-public.pem")?.toString("utf8"), "hello key", JSON.stringify(opts));
    assert.equal(packedFile(z, "nothing"), null);
  }
  assert.equal(packedFile(Buffer.from("this is no zip at all, only some words here"), "x"), null);
});

const world = (root, { packed, folder, setupHolds = true, name = "1.15.0" }) => {
  const from = join(root, "built"), keys = join(root, "keys"); mkdirSync(from); mkdirSync(keys);
  const zip = tinyZip({ "desktop/keys/licence-public.pem": packed.licence, "desktop/keys/update-public.pem": packed.update });
  writeFileSync(join(from, `AlmiVisibility-Setup-${name}.exe`), setupHolds ? Buffer.concat([Buffer.from("setup"), zip]) : Buffer.from("another build")); writeFileSync(join(from, `AlmiVisibility-${name}.zip`), zip);
  writeFileSync(join(keys, "update-public.pem"), folder.pub); writeFileSync(join(keys, "update-private.pem"), folder.priv);
  return { from, keys, out: join(root, "release") };
};

test("THE RELEASE: production keys in the package and the keys folder, the Setup holding that package: three files, signed", () => inTemp((root) => {
  const l = pair(), u = pair(), w = world(root, { packed: { licence: l.pub, update: u.pub }, folder: u });
  const r = makeRelease({ ...w, expected: { "licence-public.pem": fingerprintOf(l.pub), "update-public.pem": fingerprintOf(u.pub) } });
  assert.equal(r.ok, true, r.why); assert.ok(verifyManifest(JSON.parse(readFileSync(join(w.out, "manifest.json"), "utf8")), u.pub));
}));

test("THE RELEASE: 1.15.18's fault, a stand-in key in the package with a real keys folder (it passed the old tool), is refused, nothing written, private key not read", () => inTemp((root) => {
  const l = pair(), u = pair(), standIn = pair(), w = world(root, { packed: { licence: standIn.pub, update: standIn.pub }, folder: u });
  writeFileSync(join(w.keys, "update-private.pem"), "if this were read and used the tool would throw");
  const r = makeRelease({ ...w, expected: { "licence-public.pem": fingerprintOf(l.pub), "update-public.pem": fingerprintOf(u.pub) } });
  assert.equal(r.ok, false); assert.match(r.why, /this is not a release for clients: licence-public\.pem in AlmiVisibility-1\.15\.0\.zip is not the production key/);
  assert.ok(!existsSync(w.out), "a refused release wrote something");
}));

test("THE RELEASE: one wrong key is enough; a keys folder with another update key is refused too", () => inTemp((root) => {
  const l = pair(), u = pair(), other = pair(), expected = { "licence-public.pem": fingerprintOf(l.pub), "update-public.pem": fingerprintOf(u.pub) };
  const a = join(root, "a"), b = join(root, "b"); mkdirSync(a); mkdirSync(b);
  const w1 = world(a, { packed: { licence: l.pub, update: other.pub }, folder: u });
  assert.match(makeRelease({ ...w1, expected }).why, /update-public\.pem in AlmiVisibility-1\.15\.0\.zip is not the production key/);
  const w2 = world(b, { packed: { licence: l.pub, update: u.pub }, folder: other });
  assert.match(makeRelease({ ...w2, expected }).why, /update-public\.pem in .*keys is not the production key/);
  assert.ok(!existsSync(w1.out) && !existsSync(w2.out));
}));

test("THE RELEASE: a Setup that does not hold the package is refused (a good zip beside a bad Setup)", () => inTemp((root) => {
  const l = pair(), u = pair(), w = world(root, { packed: { licence: l.pub, update: u.pub }, folder: u, setupHolds: false });
  const r = makeRelease({ ...w, expected: { "licence-public.pem": fingerprintOf(l.pub), "update-public.pem": fingerprintOf(u.pub) } });
  assert.match(r.why, /does not hold AlmiVisibility-1\.15\.0\.zip/); assert.ok(!existsSync(w.out));
}));

test("THE RELEASE: a --test-keys build is no release, and the command line has no way round the check", () => inTemp((root) => {
  const u = pair(), from = join(root, "built"), keys = join(root, "keys"); mkdirSync(from); mkdirSync(keys);
  writeFileSync(join(from, "AlmiVisibility-Setup-1.15.0-TEST-KEYS.exe"), "x"); writeFileSync(join(from, "AlmiVisibility-1.15.0-TEST-KEYS.zip"), "x"); writeFileSync(join(keys, "update-public.pem"), u.pub); writeFileSync(join(keys, "update-private.pem"), u.priv);
  assert.match(makeRelease({ from, keys, out: join(root, "r") }).why, /no AlmiVisibility-Setup-<version>\.exe/);
  const src = readFileSync(join(REPO, "site", "owner-release.mjs"), "utf8");
  assert.match(src, /r = makeRelease\(\{ from: arg\("from"\), keys: arg\("keys"\), out \}\)/, "the command line must not pass `expected`");
  assert.ok(src.indexOf("packageKeysFault(packed") < src.indexOf('readFileSync(join(keys, "update-private.pem")'), "the private key is read before the package is checked");
}));

test("the production fingerprints refuse a folder with throwaway keys, and the real defaults are what the tools use", () => inTemp((root) => {
  const a = pair(); writeFileSync(join(root, "licence-public.pem"), a.pub); writeFileSync(join(root, "update-public.pem"), a.pub);
  assert.match(keysFolderFault(root), /licence-public\.pem .* is not the production key/);
  assert.match(packageKeysFault(tinyZip({ "desktop/keys/licence-public.pem": a.pub, "desktop/keys/update-public.pem": a.pub }), "the zip"), /is not the production key/);
  assert.deepEqual(readdirSync(root).sort(), ["licence-public.pem", "update-public.pem"], "nothing was written beside the keys");
}));
