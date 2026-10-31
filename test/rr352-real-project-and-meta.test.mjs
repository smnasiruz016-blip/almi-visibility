/**
 * 🔴 RR-352 (owner, 31 Oct 2026 — the first real run):
 *   1 · "AlmiOET is now a REAL project": an AlmiWorld product the owner marks REAL (Settings → Your product, default OFF) is published and
 *       submitted from the app like a client's; unmarked, it stays "plan only". Its YouTube channel is never changed from here either way.
 *   2 · the home page's meta description "option 1" is one natural sentence — never "Inside: why AlmiOET? Compare for yourself; …"
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isAlmiWorld, publishBlocked, realProject } from "../desktop/action-plan.mjs";
import { writtenDescriptions } from "../desktop/web-text.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const AW = { product: { site: "https://almioet.almiworld.com" }, setup: {} };

test("RR-352 · the rule: an AlmiWorld product is plan-only until the owner marks it real; a client's product is never blocked", () => {
  assert.deepEqual([isAlmiWorld(AW), realProject(AW), publishBlocked(AW)], [true, false, true]);
  const real = { ...AW, setup: { realProject: { on: true, markedOn: "2026-10-31T20:00:00Z" } } };
  assert.deepEqual([isAlmiWorld(real), realProject(real), publishBlocked(real)], [true, true, false], "still AlmiWorld's (its built-in lists), no longer blocked");
  assert.equal(publishBlocked({ ...AW, setup: { realProject: { on: false } } }), true);
  assert.equal(publishBlocked({ ...AW, setup: { realProject: { on: "yes" } } }), true, "only true marks it");
  assert.equal(publishBlocked({ product: { site: "https://client.example" }, setup: {} }), false);
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");
  assert.equal((main.match(/publishBlocked\(/g) ?? []).length, 11, "publish, auto-publish, submit, weekly, Do it for me, the plan's lines and the screens read the RULE");
  /* the YouTube channel rule and the built-in lists still read the KIND */
  assert.ok(main.includes(`if (isAlmiWorld(s)) return send(200, { ok: false, refused: "AlmiWorld's own channel: nothing is changed on YouTube from here (owner's rule)." });`));
  assert.ok(main.includes("const listOf = (s, subject, id = null) => (isAlmiWorld(s) &&"));
});

test("RR-352 · option 1 is one natural sentence: no question, slogan or brand heading; 'a, b and c'", () => {
  const home = { url: "https://almioet.almiworld.com/", h1: "Practise the OET for healthcare with honest AI feedback.", description: null,
    h2: ["Why AlmiOET? Compare for yourself", "An honest estimate, not a fake score", "The four OET sub-tests", "All 12 healthcare professions", "Honest scoring on the real scale", "Simple, honest pricing", "Common questions", "Practise honestly. Walk in ready."], qa: [] };
  const [o1] = writtenDescriptions(home, { siteName: "AlmiOET" });
  assert.equal(o1.text, "Practise the OET for healthcare with honest AI feedback. Read about the four OET sub-tests, all 12 healthcare professions and honest scoring on the real scale.");
  assert.ok(o1.text.length <= 160);
  assert.doesNotMatch(o1.text, /Inside:|\?|;/);
  const two = writtenDescriptions({ ...home, h2: ["Fees", "Dates"] }, { siteName: "AlmiOET" })[0];
  assert.equal(two.text, "Practise the OET for healthcare with honest AI feedback. Read about fees and dates.");
  assert.equal(writtenDescriptions({ ...home, h2: ["About AlmiOET", "AlmiOET plans", "Is it free?"] }, { siteName: "AlmiOET" }).length, 0, "brand and question headings are no topics");
});

test("RR-352 · THE APP: an AlmiWorld product refuses publishing until marked real in Settings; marked, the AlmiWorld refusal is gone (the next need answers); the flag is shown and kept", async () => {
  const { productStore } = await import("../desktop/products.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr352-app-"));
  const st = productStore(dir); st.setCompany({ name: "AlmiWorld", site: "https://almiworld.com", logoFile: null });
  st.create({ name: "Almioet", site: "https://almioet.almiworld.com" }); const id = st.list()[0].id;
  const kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: dir, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/" }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const base = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}/api/products/${id}`;
    const call = async (u, o, method = "POST") => { const r = await fetch(base + u, method === "GET" ? {} : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(o) }); return { status: r.status, j: await r.json() }; };
    let s = (await call("/state", null, "GET")).j; assert.deepEqual([s.almiworld, s.realProject], [true, false]);
    const product = { name: "Almioet", site: "https://almioet.almiworld.com", saveAnyway: true, what: "OET practice. Try free for 48 hours — then $12/month.", ctaLabel: "Try free for 48 hours — then $12/month", ctaHref: "https://almioet.almiworld.com/signup" };
    assert.equal((await call("/setup", { id: "product", value: product })).status, 200);
    assert.match((await call("/do", { what: "publish" })).j.refused, /^AlmiWorld's own product: nothing is published or submitted from here .*mark it a real project in Settings → Your product\.$/);
    assert.match((await call("/do", { what: "submit" })).j.refused ?? "", /AlmiWorld's own product/);
    /* the owner marks it REAL */
    assert.equal((await call("/setup", { id: "product", value: { ...product, realProject: true } })).status, 200);
    s = (await call("/state", null, "GET")).j; assert.deepEqual([s.almiworld, s.realProject], [true, true]);
    assert.ok(!("realProject" in s.setup.product), "kept beside the product's answers, not inside them");
    assert.match(s.setup.realProject.markedOn, /^\d{4}-\d{2}-\d{2}T/);
    const pub = (await call("/do", { what: "publish" })).j;
    assert.ok(!/AlmiWorld's own product/.test(pub.refused ?? ""), JSON.stringify(pub));
    assert.equal(pub.open, "publish-settings", "the next need: where the site is built");
    /* a save without the box keeps the mark; unticked, it is plan-only again */
    assert.equal((await call("/setup", { id: "product", value: product })).status, 200); assert.equal((await call("/state", null, "GET")).j.realProject, true);
    assert.equal((await call("/setup", { id: "product", value: { ...product, realProject: false } })).status, 200); assert.equal((await call("/state", null, "GET")).j.realProject, false);
    assert.match((await call("/do", { what: "publish" })).j.refused, /^AlmiWorld's own product/);
  } finally { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
});

test("RR-352 · the UI: the 'real project' box only for an AlmiWorld product, sent with the product's answers", () => {
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.ok(ui.includes('${S.almiworld ? `<h3 style="margin-top:14px">AlmiWorld\'s own product</h3><label class="check"><input type="checkbox" id=f6 ${S.realProject ? "checked" : ""}> This is a real project'));
  assert.ok(ui.includes('...($("#f6") ? { realProject: $("#f6").checked } : {})'));
});
