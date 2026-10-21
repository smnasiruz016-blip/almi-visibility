/* RR-304 · THE OWNER LICENCE (owner decision): AlmiWorld's own licence — the unlimited plan, no expiry, no Stripe, no payment — verified by
 * the app with the public key it shipped with, listed in the admin as "Owner — AlmiWorld", revocable there. LOCAL only: every key here is
 * made for the test, and no request leaves the machine. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../site/app.mjs";
import { hashPassword, FOUNDER_EMAIL } from "../site/leads.mjs";
import { applyEvent, signedLicence, makeOwnerLicence, ownerRecord } from "../services/licence/service.mjs";
import { licenceState, licenceBytes, mayAddProduct, ownerLicenceText, readOwnerLicenceText, verifyLicence, OWNER } from "../desktop/licence.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const pair = () => { const k = generateKeyPairSync("ed25519"); return { PRIV: k.privateKey.export({ type: "pkcs8", format: "pem" }), PUB: k.publicKey.export({ type: "spki", format: "pem" }) }; };
const TEST_KEYS = pair(), REAL_KEYS = pair();
const NOW = Date.parse("2026-10-21T12:00:00Z"), YEARS_LATER = Date.parse("2046-10-21T12:00:00Z");

test("THE LICENCE · an owner licence is the unlimited plan with NO expiry and no offline limit; one made with another signing key (the test key on a real build) never verifies; tampered text never verifies; a paid licence's signed bytes are unchanged", async () => {
  const owner = makeOwnerLicence({ privateKeyPem: TEST_KEYS.PRIV, now: NOW });
  assert.deepEqual([owner.licence.kind, owner.licence.licensee, owner.licence.plan, owner.licence.status, owner.licence.periodEnd], ["OWNER", "AlmiWorld (owner)", "visibility_unlimited", "ACTIVE", null]);
  assert.match(owner.licence.account, /^av_owner_[A-Za-z0-9_-]{24}$/);
  /* twenty years later, never having reached the licence service */
  const st = licenceState({ now: YEARS_LATER, check: { reached: false }, last: null, publicKeyPem: TEST_KEYS.PUB, owner });
  assert.deepEqual([st.state, st.mayStartNewWork, st.plan.id, st.plan.products, st.owner], ["ACTIVE", true, "visibility_unlimited", Infinity, true]);
  assert.match(st.line, /Owner — AlmiWorld — unlimited products, no expiry/);
  assert.equal(mayAddProduct(st, 5000).ok, true, "the owner licence limited the products");
  /* the real build ships another public key: the test-made owner licence is not an owner licence there */
  const real = licenceState({ now: NOW, check: { reached: false }, last: null, publicKeyPem: REAL_KEYS.PUB, owner });
  assert.deepEqual([real.state, real.mayStartNewWork], ["NO_PLAN", false], "a licence made with the test key worked on a build with another key");
  assert.equal(verifyLicence(owner, REAL_KEYS.PUB), false);
  /* a hand-changed licensee or a hand-added expiry breaks the signature */
  for (const change of [{ licensee: "Someone else" }, { periodEnd: "2027-01-01T00:00:00.000Z" }, { plan: "visibility_1" }]) {
    const forged = { ...owner, licence: { ...owner.licence, ...change } };
    assert.notEqual(licenceState({ now: NOW, check: { reached: false }, last: null, publicKeyPem: TEST_KEYS.PUB, owner: forged }).owner, true, JSON.stringify(change));
  }
  /* even signed with the right key, an OWNER-kind licence with an expiry, or not ACTIVE, is not the owner licence */
  const { sign, createPrivateKey } = await import("node:crypto");
  for (const change of [{ periodEnd: "2027-01-01T00:00:00.000Z" }, { status: "REVOKED" }]) {
    const licence = { ...owner.licence, ...change };
    const signed = { licence, signature: sign(null, licenceBytes(licence), createPrivateKey(TEST_KEYS.PRIV)).toString("base64") };
    assert.equal(verifyLicence(signed, TEST_KEYS.PUB), true);
    assert.notEqual(licenceState({ now: NOW, check: { reached: false }, last: null, publicKeyPem: TEST_KEYS.PUB, owner: signed }).owner, true, JSON.stringify(change));
  }
  /* the paste text round-trips; anything else is not an owner licence */
  const text = ownerLicenceText(owner);
  assert.match(text, /^avo_[A-Za-z0-9_-]+$/);
  assert.deepEqual(readOwnerLicenceText(` ${text} `), owner);
  for (const bad of ["", "av_fixtureLicenceKeyForThisTest01", "avo_short", `avo_${Buffer.from("not json").toString("base64url").repeat(8)}`]) assert.equal(readOwnerLicenceText(bad), null, bad);
  /* a paid licence (no kind) signs exactly the RR-298 fields — every licence signed before RR-304 still verifies */
  const paid = { account: "av_x", plan: "visibility_5", status: "ACTIVE", periodEnd: "2026-11-21T00:00:00.000Z", issuedAt: "2026-10-21T00:00:00.000Z" };
  assert.equal(licenceBytes(paid).toString(), JSON.stringify(paid));
});

test("REVOKE · a verified site answer for the same licence that says REVOKED ends it, and it stays ended offline; a later ACTIVE answer restores it; an answer for another licence, or a forged one, changes nothing", () => {
  const owner = makeOwnerLicence({ privateKeyPem: TEST_KEYS.PRIV, now: NOW });
  const accounts = { [owner.licence.account]: ownerRecord(owner.licence) };
  const answer = () => signedLicence({ accounts, account: owner.licence.account, privateKeyPem: TEST_KEYS.PRIV, now: NOW });
  assert.deepEqual([answer().licence.kind, answer().licence.status, answer().licence.periodEnd, verifyLicence(answer(), TEST_KEYS.PUB)], ["OWNER", "ACTIVE", null, true]);
  const on = licenceState({ now: NOW, check: { reached: true, signed: answer() }, last: null, publicKeyPem: TEST_KEYS.PUB, owner });
  assert.equal(on.state, "ACTIVE");
  accounts[owner.licence.account] = { ...accounts[owner.licence.account], status: "REVOKED" };
  const off = licenceState({ now: NOW, check: { reached: true, signed: answer() }, last: on.last, publicKeyPem: TEST_KEYS.PUB, owner });
  assert.deepEqual([off.state, off.mayStartNewWork], ["ENDED", false]);
  assert.match(off.line, /revoked in AlmiWorld's admin — new work is paused\. Nothing is deleted\./);
  const offline = licenceState({ now: YEARS_LATER, check: { reached: false }, last: off.last, publicKeyPem: TEST_KEYS.PUB, owner });
  assert.deepEqual([offline.state, offline.mayStartNewWork], ["ENDED", false], "a revoked owner licence came back by going offline");
  accounts[owner.licence.account] = { ...accounts[owner.licence.account], status: "ACTIVE" };
  assert.equal(licenceState({ now: NOW, check: { reached: true, signed: answer() }, last: offline.last, publicKeyPem: TEST_KEYS.PUB, owner }).state, "ACTIVE");
  /* a REVOKED answer for ANOTHER licence, or one signed with another key, is not this licence's answer */
  const other = makeOwnerLicence({ privateKeyPem: TEST_KEYS.PRIV, now: NOW });
  const otherRevoked = signedLicence({ accounts: { [other.licence.account]: { ...ownerRecord(other.licence), status: "REVOKED" } }, account: other.licence.account, privateKeyPem: TEST_KEYS.PRIV, now: NOW });
  const forgedRevoked = signedLicence({ accounts: { [owner.licence.account]: { ...ownerRecord(owner.licence), status: "REVOKED" } }, account: owner.licence.account, privateKeyPem: REAL_KEYS.PRIV, now: NOW });
  for (const signed of [otherRevoked, forgedRevoked]) assert.equal(licenceState({ now: NOW, check: { reached: true, signed }, last: null, publicKeyPem: TEST_KEYS.PUB, owner }).state, "ACTIVE");
});

test("STRIPE · no Stripe event ever changes the owner licence — not a subscription event, not a cancel, not a failed payment that names it", () => {
  const owner = makeOwnerLicence({ privateKeyPem: TEST_KEYS.PRIV, now: NOW });
  const account = owner.licence.account;
  for (const event of [
    { type: "customer.subscription.updated", data: { object: { id: "sub_x", status: "active", metadata: { almiworld_account: account, plan: "visibility_1" }, current_period_end: 1 } } },
    { type: "customer.subscription.deleted", data: { object: { id: "sub_x", status: "canceled", metadata: { almiworld_account: account, plan: "visibility_1" } } } },
    { type: "checkout.session.completed", data: { object: { client_reference_id: account, metadata: { almiworld_account: account, plan: "visibility_1" } } } },
    { type: "invoice.payment_failed", data: { object: { subscription_details: { metadata: { almiworld_account: account } } } } },
  ]) {
    const accounts = { [account]: ownerRecord(owner.licence) };
    assert.equal(applyEvent(accounts, event), null, event.type);
    assert.deepEqual(accounts[account], ownerRecord(owner.licence), event.type);
  }
});

test("THE ADMIN · the owner licence is added by pasting its text (checked against the site's own signing key; one from another key is refused and nothing is saved), listed as \"Owner — AlmiWorld\" with no expiry, revoked with a button — the licence id never appears in the page", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr304-site-"));
  const env = { SITE_ADMIN_PASSWORD_HASH: hashPassword("a-test-password-only"), ADMIN_EMAILS: "", VISIBILITY_SITE_DATABASE_URL: "", LICENCE_SIGNING_KEY: TEST_KEYS.PRIV };
  const h = createApp({ env, dataDir: dir, fetchImpl: async () => { throw new Error("no outside call in this test"); } });
  const srv = createServer((q, r) => { h(q, r); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const form = (o, cookie) => ({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) }, body: new URLSearchParams(o).toString(), redirect: "manual" });
  try {
    const owner = makeOwnerLicence({ privateKeyPem: TEST_KEYS.PRIV, now: NOW });
    const text = ownerLicenceText(owner);
    assert.equal((await fetch(`${base}/admin/licences/owner`, form({ licence: text }))).headers.get("location"), "/admin", "the owner licence was added without a login");
    const ck = (await fetch(`${base}/admin/login`, form({ email: FOUNDER_EMAIL, password: "a-test-password-only" }))).headers.get("set-cookie").split(";")[0];
    const sales = async () => (await fetch(`${base}/admin/sales`, { headers: { cookie: ck } })).text();
    assert.match(await sales(), /Add the owner licence/);
    assert.match(await sales(), /Not connected yet/, "the paid part claimed a connection");
    /* from another signing key: refused, nothing saved */
    const foreign = await fetch(`${base}/admin/licences/owner`, form({ licence: ownerLicenceText(makeOwnerLicence({ privateKeyPem: REAL_KEYS.PRIV, now: NOW })) }, ck));
    assert.equal(foreign.status, 400);
    assert.match(await foreign.text(), /not made with this site's signing key/);
    assert.doesNotMatch(await sales(), /Owner — AlmiWorld<\/td>/);
    /* the right one: listed, ACTIVE, no expiry; the app's licence check answers it */
    assert.equal((await fetch(`${base}/admin/licences/owner`, form({ licence: text }, ck))).headers.get("location"), "/admin/sales");
    const page = await sales();
    assert.match(page, /<td>Owner — AlmiWorld<\/td><td>Unlimited<\/td><td>ACTIVE<\/td><td>No expiry<\/td>/);
    assert.ok(!page.includes(owner.licence.account) && !page.includes(text), "the admin page showed the licence id or text");
    const check = async () => (await (await fetch(`${base}/v1/licence?account=${owner.licence.account}`)).json());
    assert.deepEqual([(await check()).licence.kind, (await check()).licence.status, verifyLicence(await check(), TEST_KEYS.PUB)], ["OWNER", "ACTIVE", true]);
    /* revoke: the button's ref, never the id */
    const ref = /name="ref" value="([0-9a-f]{16})"/.exec(page)[1];
    assert.equal((await fetch(`${base}/admin/licences/revoke`, form({ ref: "0000000000000000" }, ck))).status, 400);
    assert.equal((await fetch(`${base}/admin/licences/revoke`, form({ ref }, ck))).headers.get("location"), "/admin/sales");
    assert.match(await sales(), /<td>Owner — AlmiWorld<\/td><td>Unlimited<\/td><td>REVOKED<\/td><td>No expiry<\/td><td>Revoked<\/td>/);
    const revoked = await check();
    assert.equal(revoked.licence.status, "REVOKED");
    assert.equal(licenceState({ now: NOW, check: { reached: true, signed: revoked }, last: null, publicKeyPem: TEST_KEYS.PUB, owner }).state, "ENDED");
  } finally { srv.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("THE APP · \"Your plan — add your licence key\" takes the owner licence: verified with the app's own public key, saved, never echoed; the plan is unlimited with no expiry; one made with another key is refused", async () => {
  const { productStore } = await import("../desktop/products.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr304-app-"));
  productStore(dir).setCompany({ name: "Fixture Co", site: "https://fixture.invalid", logoFile: null });
  writeFileSync(join(dir, "licence-public.pem"), TEST_KEYS.PUB);
  /* the licence and update addresses point at nothing on this machine; the trusted public key is the test's */
  writeFileSync(join(dir, "config.json"), JSON.stringify({ licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", keysDir: dir }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    for (let i = 0; i < 80 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const base = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const post = (o) => fetch(`${base}/api/account`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) });
    assert.equal((await (await fetch(`${base}/api/licence`)).json()).state, "NO_PLAN");
    const foreign = await post({ licenceKey: ownerLicenceText(makeOwnerLicence({ privateKeyPem: REAL_KEYS.PRIV, now: NOW })) });
    assert.equal(foreign.status, 400);
    assert.match((await foreign.json()).refused, /could not be verified by this copy of Visibility/);
    const owner = makeOwnerLicence({ privateKeyPem: TEST_KEYS.PRIV, now: NOW });
    const text = ownerLicenceText(owner);
    const saved = await post({ licenceKey: text });
    assert.equal(saved.status, 200);
    const said = await saved.text();
    assert.match(said, /Owner — AlmiWorld — unlimited products, no expiry/);
    const lic = await (await fetch(`${base}/api/licence`)).json();
    assert.deepEqual([lic.state, lic.mayStartNewWork, lic.plan], ["ACTIVE", true, "$80 a month — unlimited products"]);
    const home = await (await fetch(`${base}/api/home`)).text();
    assert.ok(![said, home, JSON.stringify(lic)].some((s) => s.includes(text) || s.includes(owner.licence.account)), "the owner licence was echoed");
    assert.equal(JSON.parse(home).mayAdd, true);
  } finally { p.kill(); rmSync(dir, { recursive: true, force: true }); }
});

test("THE TOOL · tools/make-owner-licence.mjs writes the licence file, reads it back and verifies it, prints no licence text, and never overwrites a file", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr304-tool-"));
  try {
    writeFileSync(join(dir, "licence-private.pem"), TEST_KEYS.PRIV);
    writeFileSync(join(dir, "licence-public.pem"), TEST_KEYS.PUB);
    const out = join(dir, "AlmiVisibility_OWNER_licence.txt");
    const run = () => spawnSync(process.execPath, [join(REPO, "tools", "make-owner-licence.mjs"), `--keys=${dir}`, `--out=${out}`], { encoding: "utf8" });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /read back and verified/);
    const line = readFileSync(out, "utf8").split(/\r?\n/).find((l) => l.startsWith("avo_"));
    assert.ok(!first.stdout.includes(line) && !first.stdout.includes("av_owner_"), "the tool printed the licence");
    const signed = readOwnerLicenceText(line);
    assert.deepEqual([signed.licence.licensee, signed.licence.plan, signed.licence.periodEnd, verifyLicence(signed, TEST_KEYS.PUB)], [OWNER.licensee, OWNER.plan, null, true]);
    const second = run();
    assert.equal(second.status, 2);
    assert.match(second.stderr, /never overwritten/);
    assert.equal(readFileSync(out, "utf8").split(/\r?\n/).find((l) => l.startsWith("avo_")), line);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
