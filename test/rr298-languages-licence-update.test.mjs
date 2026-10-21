/* RR-298 · languages, plans + licence, the update path and the first-run setup — in memory and on 127.0.0.1 only. The install → first
 * run → update → uninstall cycle on a real machine is proved by its own run (evidence in _handoffs); nothing here installs anything. */
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createHmac, sign, createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LANGUAGES, chooseLanguages, checkTranslation, numbersOf } from "../src/page/languages.mjs";
import { PLANS, FREE_TRIAL, licenceState, mayAddProduct, verifyLicence, licenceBytes, OFFLINE_DAYS } from "../desktop/licence.mjs";
import { verifyStripeSignature, applyEvent, signedLicence, licenceService } from "../services/licence/service.mjs";
import { newer, verifyManifest, signedBytes, installUpdate, downloadUpdate } from "../desktop/updater.mjs";
import { checkStep, STEPS } from "../desktop/setup.mjs";
import { HERE } from "./support/rr296-proof.mjs";
import { languagesRun } from "./support/rr298-languages-proof.mjs";

const pem = () => { const k = generateKeyPairSync("ed25519"); return { pub: k.publicKey.export({ type: "spki", format: "pem" }), priv: k.privateKey.export({ type: "pkcs8", format: "pem" }) }; };
const K = pem();
const DAY = 86400000, NOW = Date.parse("2026-10-20T12:00:00Z");
const signed = (l, priv = K.priv) => ({ licence: l, signature: sign(null, licenceBytes(l), priv).toString("base64") });
const active = (plan = "visibility_5") => signed({ account: "a", plan, status: "ACTIVE", periodEnd: new Date(NOW + 30 * DAY).toISOString(), issuedAt: new Date(NOW).toISOString() });

/* ---- A · languages ---- */
test("A · the ten languages; the client picks per product; Arabic and Urdu are right-to-left; a code outside the ten is refused", () => {
  assert.deepEqual(LANGUAGES.map((l) => l.code), ["en", "es", "de", "it", "fr", "pt", "ar", "ur", "hi", "zh"]);
  assert.deepEqual(LANGUAGES.filter((l) => l.dir === "rtl").map((l) => l.code), ["ar", "ur"]);
  assert.equal(chooseLanguages(["en", "ar"]).valid, true);
  assert.equal(chooseLanguages(["en", "xx"]).valid, false);
  assert.deepEqual(numbersOf("WB$١٢٠ و 1,400 و ۳"), numbersOf("WB$120 and 1400 and 3"));
});

test("A · CHECK (pure): a translation keeps every number, currency and fact — a changed number, a dropped fact or a changed currency is REFUSED, named", () => {
  const src = { question: "Q", claims: [{ claimId: "c", text: "It costs WB$120, valid 2 years." }], cards: [{ claimId: "c", value: "WB$120" }] };
  const ok = { lang: "es", question: "P", claims: [{ claimId: "c", text: "Cuesta WB$120, válido 2 años." }], cards: [{ claimId: "c", value: "WB$120" }] };
  assert.deepEqual(checkTranslation(src, ok), { ok: true, why: null });
  assert.match(checkTranslation(src, { ...ok, claims: [{ claimId: "c", text: "Cuesta WB$102, válido 2 años." }] }).why, /a number changed/);
  assert.match(checkTranslation(src, { ...ok, claims: [{ claimId: "c", text: "Cuesta US$120, válido 2 años." }] }).why, /currency/);
  assert.match(checkTranslation(src, { ...ok, claims: [] }).why, /same facts/);
  assert.match(checkTranslation(src, { ...ok, cards: [{ claimId: "c", value: "WB$12" }] }).why, /card's number/);
});

test("A · REAL: 2 pages + 1 article of the test project in English, Spanish and Arabic (right-to-left) — all pass the gates within their language; hreflang siblings; in the sitemap; a translation that changes a number is refused and that version not published", { skip: HERE ? false : "the stored guides are not on this machine" }, () => {
  const r = languagesRun({ withBad: true });
  assert.equal(r.gates.results.length, 9);
  for (const g of r.gates.results) assert.equal(g.pass, true, `${g.lang} ${g.url}: ${g.failed.join(" | ")}`);
  assert.deepEqual(r.refused.map((x) => [x.lang, x.why]), [["es", "w-fee-1: a number changed or was dropped (120 → 102)"]]);
  const ar = r.versions.find((v) => v.lang === "ar" && /widgetry-exam-fee/.test(v.url));
  assert.match(ar.html, /<html lang="ar" dir="rtl">/);
  for (const l of ["en", "es", "ar", "x-default"]) assert.match(ar.html, new RegExp(`<link rel="alternate" hreflang="${l}" href="https://widgetry\\.example/`));
  assert.ok(ar.html.includes("https://board.widgetry.example/fees") && ar.html.includes("2026-10-18"), "the source and its date are not the page's own");
  assert.equal(r.gates.sitemap.length, 9);
  assert.ok(r.versions.filter((v) => v.lang !== "en").every((v) => /^TEST — translated by CC's own session/.test(v.by)));
});

/* ---- B · plans + licence ---- */
test("B · PLANS: $30 = 1 · $40 = 5 · $60 = 10 · $80 = unlimited; no free trial; the product count is enforced", () => {
  assert.deepEqual(PLANS.map((p) => [p.priceUsd, p.products]), [[30, 1], [40, 5], [60, 10], [80, Infinity]]);
  assert.equal(FREE_TRIAL, false);
  const st = licenceState({ now: NOW, check: { reached: true, signed: active("visibility_5") }, publicKeyPem: K.pub });
  assert.equal(mayAddProduct(st, 4).ok, true);
  assert.match(mayAddProduct(st, 5).line, /allows 5 product\(s\); you have 5/);
  const un = licenceState({ now: NOW, check: { reached: true, signed: active("visibility_unlimited") }, publicKeyPem: K.pub });
  assert.equal(mayAddProduct(un, 10000).ok, true);
  assert.equal(licenceState({ now: NOW, check: { reached: false }, publicKeyPem: K.pub }).state, "NO_PLAN");
});

test("B · LICENCE: a signed licence verifies; a forged one does not; OFFLINE — 7 days of work from the last good check, then NEW work pauses (nothing deleted); a lapsed plan pauses", () => {
  const good = active();
  assert.equal(verifyLicence(good, K.pub), true);
  assert.equal(verifyLicence({ ...good, licence: { ...good.licence, plan: "visibility_unlimited" } }, K.pub), false, "a hand-edited licence verified");
  assert.equal(verifyLicence(signed(good.licence, pem().priv), K.pub), false, "a licence signed by another key verified");
  assert.equal(licenceState({ now: NOW, check: { reached: true, signed: { ...good, licence: { ...good.licence, plan: "visibility_unlimited" } } }, publicKeyPem: K.pub }).state, "INVALID");
  const last = { at: NOW, signed: good };
  const at = (days) => licenceState({ now: NOW + days * DAY, check: { reached: false }, last, publicKeyPem: K.pub });
  assert.deepEqual([at(0).state, at(OFFLINE_DAYS).state, at(OFFLINE_DAYS + 0.01).state], ["OFFLINE_GRACE", "OFFLINE_GRACE", "OFFLINE_PAUSED"]);
  assert.equal(at(OFFLINE_DAYS).mayStartNewWork, true);
  assert.equal(at(8).mayStartNewWork, false);
  assert.match(at(8).line, /new work is paused until it can check your plan again\. Nothing is deleted\./);
  const lapsed = signed({ ...good.licence, status: "CANCELED" });
  assert.equal(licenceState({ now: NOW, check: { reached: true, signed: lapsed }, publicKeyPem: K.pub }).state, "ENDED");
});

test("B · THE SERVICE (local, Stripe TEST MODE shapes): a Stripe-signed event sets the plan; a forged or stale signature is refused; the answer is signed; live Stripe is DEFERRED with no test key (named, never asked for)", async () => {
  const secret = `whsec_test_${"ab".repeat(16)}`, body = JSON.stringify({ type: "customer.subscription.created", data: { object: { id: "sub_1", status: "active", current_period_end: Math.floor(NOW / 1000) + 30 * 86400, metadata: { almiworld_account: "acct" }, items: { data: [{ price: { lookup_key: "visibility_10" } }] } } } });
  const t = Math.floor(NOW / 1000), sig = (s) => `t=${t},v1=${createHmac("sha256", s).update(`${t}.${body}`).digest("hex")}`;
  assert.equal(verifyStripeSignature({ header: sig(secret), body, secret, nowS: t }).ok, true);
  assert.equal(verifyStripeSignature({ header: sig("whsec_other"), body, secret, nowS: t }).ok, false);
  assert.equal(verifyStripeSignature({ header: sig(secret), body, secret, nowS: t + 3600 }).ok, false, "a stale event was trusted");
  const accounts = {};
  assert.equal(applyEvent(accounts, JSON.parse(body)), "acct");
  assert.equal(accounts.acct.plan, "visibility_10");
  const s = signedLicence({ accounts, account: "acct", privateKeyPem: K.priv, now: NOW });
  assert.equal(verifyLicence(s, K.pub), true);
  assert.equal(signedLicence({ accounts, account: "nobody", privateKeyPem: K.priv, now: NOW }).licence.status, "NO_PLAN");
  const dir = mkdtempSync(join(tmpdir(), "rr298-licence-"));
  try {
    const svc = licenceService({ env: {}, dataDir: dir });
    const port = await svc.listen();
    const r = await (await fetch(`http://127.0.0.1:${port}/v1/checkout`, { method: "POST" })).json();
    assert.match(r.deferred, /^DEFERRED — no Stripe test key in the environment \(STRIPE_SECRET_KEY\)/);
    assert.equal((await fetch(`http://127.0.0.1:${port}/v1/stripe/webhook`, { method: "POST", headers: { "stripe-signature": sig(secret) }, body })).status, 400, "an event was trusted with no configured secret");
    await svc.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ---- C · the update path and the setup ---- */
test("C · UPDATE: only a NEWER, signed version is offered; a tampered package or manifest is refused; nothing installs without the client's agreement", async () => {
  assert.deepEqual([newer("1.0.1", "1.0.0"), newer("1.0.0", "1.0.0"), newer("0.9.9", "1.0.0"), newer("1.10.0", "1.9.9")], [true, false, false, true]);
  const bytes = Buffer.from("package"), m0 = { version: "1.0.1", package: "packages/p.zip", sha256: createHash("sha256").update(bytes).digest("hex") };
  const m = { ...m0, signature: sign(null, signedBytes(m0), K.priv).toString("base64") };
  assert.equal(verifyManifest(m, K.pub), true);
  assert.equal(verifyManifest({ ...m, version: "9.9.9" }, K.pub), false);
  const dir = mkdtempSync(join(tmpdir(), "rr298-upd-"));
  try {
    writeFileSync(join(dir, "p.zip"), Buffer.from("tampered"));
    const { createServer } = await import("node:http");
    const srv = createServer((q, s) => { s.end(Buffer.from("tampered")); });
    await new Promise((r) => srv.listen(0, "127.0.0.1", r));
    const d = await downloadUpdate({ channelUrl: `http://127.0.0.1:${srv.address().port}/`, manifest: m, dataDir: dir, publicKeyPem: K.pub });
    srv.close();
    assert.deepEqual([d.ok, d.why], [false, "the downloaded package does not match its signed sha256 — refused, not installed"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.match(installUpdate({ agreed: false, verified: true, file: "x", launcher: "x" }).why, /has not agreed/);
  assert.match(installUpdate({ agreed: true, verified: false, file: "x", launcher: "x" }).why, /not verified/);
});

test("C · FIRST RUN: seven steps, one at a time; the AI connection takes a key NAME only — a key value is refused and never stored", () => {
  assert.deepEqual(STEPS.map((s) => s.id), ["product", "searchData", "languages", "articlesPerDay", "publishMode", "aiConnection", "youtube", "start"]); /* RR-302 C1: the optional YouTube step */
  assert.equal(checkStep("youtube", { handle: "" }), null);
  assert.equal(checkStep("youtube", { handle: "@Almiworld-world", keyName: "YOUTUBE_API_KEY" }), null);
  for (const v of ["AIzaSyFakeLookingValue123", "my key"]) assert.match(checkStep("youtube", { handle: "@x-channel", keyName: v }), /NAME of the variable/);
  assert.match(checkStep("youtube", { handle: "https://youtube.com/@x" }), /@handle/);
  assert.equal(checkStep("product", { name: "Widgetry Prep", site: "https://widgetry.example", what: "a test project" }), null);
  /* RR-305 B1 (owner decision, 21 Oct 2026): an address typed without https:// is ACCEPTED (https:// is added); not-an-address is still refused */
  assert.equal(checkStep("product", { name: "x", site: "widgetry.example", what: "y" }), null);
  for (const site of ["widgetry", "not a site", "ftp://widgetry.example", "javascript:alert(1)", ""]) assert.ok(checkStep("product", { name: "x", site, what: "y" }), site);
  assert.equal(checkStep("searchData", { option: 2 }), null);
  assert.equal(checkStep("languages", { codes: ["en", "ur"] }), null);
  assert.ok(checkStep("articlesPerDay", { perDay: -1 }));
  assert.equal(checkStep("publishMode", { mode: "REVIEW_FIRST" }), null);
  assert.equal(checkStep("aiConnection", { keyName: "ANTHROPIC_API_KEY" }), null);
  for (const v of ["sk-ant-api03-abc", "sk_test_123456", "my key"]) assert.match(checkStep("aiConnection", { keyName: v }), /NAME of the variable/);
});
