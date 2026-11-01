/**
 * 🔴 OWNER'S RULINGS AFTER RR-360 (1 Nov 2026), in the app, for real, under an outside client's licence:
 *   2 finished pages only: no keyword, volume, list, coverage or raw data on its computer or on its screens;
 *   3 no screen says where AlmiWorld's data comes from;
 *   5 the client's own optional DataForSEO switch stays as it is.
 * The service is a stand-in of the server's documented answers. A throwaway signing key; secrets in memory; no network, no paid search.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { generateKeyPairSync, sign } from "node:crypto";
import { licenceBytes } from "../desktop/licence.mjs";
import { productStore } from "../desktop/products.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), ".."), DAY = new Date().toISOString().slice(0, 10), AT = new Date().toISOString(), SITE = "https://fixture.invalid";
const NAMES = /Google Ads|Keyword Planner|DataForSEO|Ads API|keyword service|search volumes?/i;

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), "rr361-client-")), st = productStore(dir), kp = generateKeyPairSync("ed25519"), account = "av_client_test000000000000000";
  const licence = { account, plan: "visibility_5", status: "ACTIVE", periodEnd: new Date(Date.now() + 30 * 864e5).toISOString(), issuedAt: AT }, signed = { licence, signature: sign(null, licenceBytes(licence), kp.privateKey).toString("base64") };
  st.setCompany({ name: "PetCo", site: SITE, logoFile: null });
  const a = st.create({ name: "PetCo", site: SITE }), s = st.read(a.id); s.started = true; s.setup.product = { name: "PetCo", site: SITE, what: "Pet insurance.", subject: "Pet Insurance", cta: { label: "Try it", href: `${SITE}/signup` } }; st.write(a.id, s);
  const pd = join(dir, "products", a.id);
  writeFileSync(join(pd, "check.json"), JSON.stringify({ on: AT, score: 50, areas: [], pagesRead: 1 }));
  writeFileSync(join(pd, "site-read.json"), JSON.stringify({ ok: true, origin: SITE, start: SITE, on: AT, readOn: AT, pages: [{ url: `${SITE}/`, title: "PetCo", h1: "PetCo", h2: [], qa: [], facts: [], lead: [], prices: [], text: "PetCo" }], shell: { header: "<header data-site-shell>x</header>", footer: "<footer data-site-shell>x</footer>", head: "" } }));
  const asked = [], kit = { ok: true, outside: true, subject: "Pet Insurance", topic: { name: "PetCo" }, on: DAY, plan: [{ kind: "country", country: "Pakistan", title: "Pet Insurance in Pakistan" }], countries: { Pakistan: { country: "Pakistan", parts: { rules: [{ source: "https://secp.gov.pk/rules", readOn: DAY, value: { text: "Pet cover is sold only by licensed insurers, the regulator says, for 12 months at a time." } }], questions: [{ source: "https://secp.gov.pk/q", readOn: DAY, value: { question: "What should people in Pakistan know about Pet Insurance?", answer: "The regulator's page says cover is optional for 12 months.", answerKind: "official" } }] } } } };
  const srv = createServer((q, r) => { let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => { const u = new URL(q.url, "http://x"); r.setHeader("content-type", "application/json"); asked.push(`${u.pathname}${u.searchParams.get("part") ? `:${u.searchParams.get("part")}` : ""}`); if (u.pathname === "/v1/licence") return r.end(JSON.stringify(signed)); if (u.pathname === "/v1/almiseo/topic") return r.end(JSON.stringify({ ok: true, started: true, joined: false })); if (u.pathname === "/v1/almiseo") { const part = u.searchParams.get("part"); if (part === "summary") return r.end(JSON.stringify({ ok: true, outside: true, subject: "Pet Insurance", topic: { name: "PetCo" }, on: DAY, pages: 1 })); if (part === "pages") return r.end(JSON.stringify(kit)); r.statusCode = 403; return r.end(JSON.stringify({ ok: false, why: "not part of the plan" })); } r.statusCode = 403; r.end(JSON.stringify({ ok: false, why: "refused" })); }); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${srv.address().port}/`; writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: dir, licenceUrl: url, keywordServiceUrl: url, updateChannelUrl: "http://127.0.0.1:9/", tourSeen: true, account, almiSeoFirstMs: 300, weeklyFirstMs: 864e5 }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const call = async (u, o) => { const r = await fetch(root + u, o ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) } : {}); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* a page */ } return { http: r.status, t, j }; };
  return { dir, pd, id: a.id, asked, call, stop: () => { p.kill(); srv.close(); try { rmSync(dir, { recursive: true, force: true }); } catch { /* let go a moment later */ } } };
}

test("RULINGS 2 + 3 + 5, under an outside client's licence: finished pages only, on its screens and on its computer; no source named; its own switch still there", async () => {
  const b = await boot();
  try {
    await b.call("/api/licence"); await b.call("/api/home");
    /* it signs in with its own check, then reads by itself or on its click */
    for (let i = 0; i < 60 && !existsSync(join(b.pd, "almiseo.json")); i++) { await b.call(`/api/products/${b.id}/almiseo/sync`, {}).catch(() => null); if (existsSync(join(b.pd, "almiseo.json"))) break; await new Promise((r) => setTimeout(r, 100)); }
    assert.ok(existsSync(join(b.pd, "almiseo.json")), "read");
    /* RULING 2 · only page content is asked for and kept */
    assert.ok(!b.asked.some((x) => /:(keywords|questions|countries|plan|coverage)$/.test(x)), JSON.stringify([...new Set(b.asked)]));
    assert.ok(!b.asked.includes("/v1/keywords"), "the keyword route is not called");
    assert.ok(!existsSync(join(b.pd, "almiseo-keywords.json")), "no keyword file on its computer");
    const v = await b.call(`/api/products/${b.id}/almiseo`);
    assert.equal(v.j.view.state, "PAGES"); assert.equal(v.j.view.pages, 1); assert.deepEqual(Object.keys(v.j.view).sort(), ["line", "pages", "readOn", "state", "subject"]);
    /* the finished pages */
    const run = await b.call(`/api/products/${b.id}/do`, { what: "create-pages" }); assert.equal(run.http, 200, run.t.slice(0, 300));
    const pages = JSON.parse(readFileSync(join(b.pd, "pages.json"), "utf8"));
    assert.deepEqual(pages.drafts.map((d) => d.title), ["Pet Insurance in Pakistan"]); assert.match(pages.drafts[0].html, /secp\.gov\.pk/);
    assert.equal(pages.drafts[0].recipe.almiseo, null, "no count of AlmiSEO Data in its ledger");
    /* its keyword panel's route is closed */
    const svc = await b.call(`/api/products/${b.id}/keywords/service`, { seeds: "pet", location: "ALL" }); assert.equal(svc.http, 403); assert.match(svc.j.refused, /finished pages/);
    /* RULING 3 · no screen says where AlmiWorld's data comes from */
    for (const u of [`/api/products/${b.id}/overview`, `/api/products/${b.id}/almiseo`, `/api/products/${b.id}/pages-view`]) { const r = await b.call(u); const hit = NAMES.exec(r.t.split("A search-data file (Bing or Keyword Planner)").join("") /* the client's OWN optional file, like ruling 5 */); assert.equal(hit?.[0] ?? null, null, `${u}: …${hit ? r.t.slice(Math.max(0, hit.index - 80), hit.index + 80) : ""}…`); }
    const all = readdirSync(b.pd).filter((f) => /^(almiseo|pages|auto-plan)\.json$/.test(f)).map((f) => readFileSync(join(b.pd, f), "utf8")).join(" ");
    assert.equal(NAMES.exec(all)?.[0] ?? null, null, "nor the files on its computer");
    /* RULING 5 · the client's own optional switch stays exactly where it was */
    const sd = await b.call("/api/search-data"); assert.equal(sd.http, 200, sd.t.slice(0, 200)); assert.equal(sd.j.on, false, "off by default"); assert.match(JSON.stringify(sd.j), /DataForSEO/, "that screen names the client's own account");
  } finally { b.stop(); }
});
test("RULING 2: the screens are written for it: the keyword panel is not drawn for an outside client", () => {
  const UI = readFileSync(join(REPO, "desktop/ui.html"), "utf8");
  assert.match(UI, /K\.service\.outside \? "" : `<h4>AlmiWorld keyword service/); assert.match(UI, /if \(K\.service\.plan && !K\.service\.outside\)/); assert.match(UI, /you need no other service/); assert.ok(!/you do not need DataForSEO/.test(UI));
});
