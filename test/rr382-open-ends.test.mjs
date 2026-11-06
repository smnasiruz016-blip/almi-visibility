/**
 * RR-382 (owner, 6 Nov 2026: "finish the open ends"): a new bad review alerts (first screen + Windows notification, reply draft ready);
 * Merchant Center through the client's own Google sign-in; the monthly report's search numbers live from Search Console; the data lists for
 * AlmiJob, AlmiSalary, AlmiStudy and AlmiHalal; no speech-to-text, said in the Guide. Every answer is the services' DOCUMENTED shape
 * (DataForSEO, Google Merchant API, Search Console, ESCO, ILOSTAT, World Bank, Wikidata, College Scorecard, AlAdhan); nothing is paid.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { seoJobs } from "../desktop/seo-jobs.mjs";
import { googleConnect, merchantIssues, MERCHANT_SCOPE } from "../desktop/google-connect.mjs";
import { searchFromLive, monthlyReport } from "../src/report/monthly-report.mjs";
import { monthReport } from "../desktop/seo-pages.mjs";
import { escoRole, iloEarnings, priceLevels, universitiesOf, scorecardRows, prayerOf, runLists, units, LISTS, COUNTRIES, ROLES } from "../site/data-lists.mjs";
import { PRODUCT_DATA } from "../site/product-data.mjs";
import { MC_CRONS } from "../tools/bundle-site.mjs";
import { COLLECTORS } from "../site/health.mjs";
import { HELP_GUIDES } from "../desktop/guides.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const res = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => (typeof o === "string" ? o : JSON.stringify(o)), headers: { get: () => null } });
function deps(over = {}) {
  const files = {}, ledger = { spent: [] }; let t = Date.parse("2026-11-06T12:00:00Z");
  const d = { pread: (id, f, dflt = null) => (f in files ? JSON.parse(JSON.stringify(files[f])) : dflt), pwrite: (id, f, x) => { files[f] = x; }, productOf: () => ({ name: "Café Ex", site: "https://ex.com/" }), sitePages: () => [], gscSite: () => null, phrases: () => [], asked: () => [],
    keys: { get: () => "k", saved: () => false }, ai: { key: () => "k", allowed: () => true, add: () => {} }, dfs: { ledger: () => ledger, save: () => {}, settings: () => ({ on: true, capDay: 1, capMonth: 31 }), creds: { login: () => "l", password: () => "p" } },
    engines: { read: () => ({ spent: [] }), write: () => {}, cap: () => 5 }, pace: () => Promise.resolve(), dfsWait: { waitMs: 0, everyMs: 0 }, now: () => t, ...over };
  return { d, files, ledger, later: (days) => { t += days * 864e5; } };
}

/* ── 1a: alerts on a new bad review ── */
test("1a · ALERT: the first read only learns; a NEW 1–2 star review on Google is an alert with a reply draft; the daily watch reads fresh (never the 7-day copy); a pasted review never alerts; 'seen' puts alerts away", async () => {
  let reviews = [{ review_id: "a", rating: { value: 5 }, review_text: "Lovely coffee" }, { review_id: "b", rating: { value: 1 }, review_text: "Old bad review" }];
  const fetchImpl = async (u) => { const p = new URL(u).pathname; if (/task_post$/.test(p)) return res({ status_code: 20000, tasks: [{ id: "t1", status_code: 20100, cost: 0.0015 }] }); if (/google\/reviews\/task_get\//.test(p)) return res({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ reviews_count: reviews.length, rating: { value: 4 }, items: reviews }] }] }); return res({}, 404); };
  const asked = []; const { d, ledger, later } = deps({ fetchImpl, askJson: async (o) => { asked.push(o); return { data: { replies: o.body.reviews.map((r) => ({ id: r.id, reply: "We are sorry; please tell us more through our contact page." })) }, usage: { input: 1, output: 1, model: o.model } }; } });
  const J = seoJobs(d);
  const first = await J.press("p", "reviews", "read", { name: "Café Ex", city: "Leeds", country: "gb", pasted: "Facebook | 1 | rude" });
  assert.ok(first.ok, first.refused); assert.deepEqual(first.alerts, [], "the first read learns what is there (no flood of old reviews)"); assert.deepEqual(J.alerts("p"), []);
  assert.equal(await J.reviewsDue("p"), null, "not again the same day");
  await J.press("p", "reviews", "save", { pasted: "Facebook | 1 | rude\nFacebook | 1 | a NEW pasted one" }); /* a pasted review is not a connected source: never an alert */
  reviews = [{ review_id: "c", rating: { value: 2 }, review_text: "Cold food today" }, ...reviews]; later(1);
  const a = await J.reviewsDue("p"); assert.deepEqual(a, [{ source: "Google", stars: 2 }]);
  assert.equal(ledger.spent.length, 2, "the daily read bought fresh reviews (the 7-day copy was not used)");
  const al = J.alerts("p"); assert.equal(al.length, 1); assert.match(al[0].reply, /sorry/); assert.equal(asked.at(-1).model, "claude-sonnet-5-5");
  const v = J.view("p", "reviews"); assert.match(v.sections[0].title, /⚠ 1 new bad review/); assert.ok(v.sections[0].ready.length === 1);
  later(1); assert.deepEqual(await J.reviewsDue("p"), [], "the same review never alerts twice");
  await J.press("p", "reviews", "seen", {}); assert.deepEqual(J.alerts("p"), []);
  await J.press("p", "reviews", "watch", { watch: "off" }); later(1); assert.equal(await J.reviewsDue("p"), null, "the watch can be switched off");
});
test("1a · IN THE APP: the first screen's card carries the alert count; the hourly round runs the watch and sends a Windows notification", () => {
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(main, /reviewAlerts: \(pread\(s\.id, "seo-reviews\.json", \{\}\)\?\.alerts \?\? \[\]\)\.length/);
  assert.match(main, /JOBS_RUN\(\)\.reviewsDue\(p\.id\); if \(a\?\.length && CONFIG\.toasts !== false\) windowsToast\(/);
  assert.match(ui, /data-revalert="\$\{esc\(p\.id\)\}"/); assert.match(ui, /new bad review/);
});

/* ── 1b: Merchant Center ── */
test("1b · MERCHANT: the sign-in asks for Merchant Center only when ticked (keeping earlier grants); the Merchant API's documented products → problems by Google's own words", async () => {
  const keys = { get: (n) => (n === "GOOGLE_CLIENT_SECRET" || n === "GOOGLE_REFRESH_TOKEN" ? "x" : null), set: () => ({ ok: true }) };
  const g0 = googleConnect({ keys, config: { googleClientId: "id.apps.googleusercontent.com" } });
  const u1 = new URL(g0.start("http://127.0.0.1:5/oauth/google").url), u2 = new URL(g0.start("http://127.0.0.1:5/oauth/google", { merchant: true }).url);
  assert.ok(!u1.searchParams.get("scope").includes(MERCHANT_SCOPE)); assert.ok(u2.searchParams.get("scope").includes(MERCHANT_SCOPE)); assert.equal(u2.searchParams.get("include_granted_scopes"), "true");
  const products = [{ name: "accounts/1/products/en~GB~A", offerId: "A", productAttributes: { title: "Wool scarf" }, productStatus: { destinationStatuses: [{ reportingContext: "SHOPPING_ADS", disapprovedCountries: ["GB"] }], itemLevelIssues: [{ code: "missing_gtin", severity: "DISAPPROVED", attribute: "gtin", description: "Missing GTIN", detail: "Add a GTIN", resolution: "MERCHANT_ACTION", documentation: "https://support.google.com/merchants/answer/6324461" }] } }, { offerId: "B", productAttributes: { title: "Hat" }, productStatus: { itemLevelIssues: [{ code: "missing_gtin", severity: "DISAPPROVED", attribute: "gtin", description: "Missing GTIN" }, { code: "image_too_small", severity: "DEMOTED", description: "Image too small" }] } }];
  const m = merchantIssues(products); assert.equal(m.products, 2); assert.equal(m.disapproved, 1); assert.equal(m.issues[0].code, "missing_gtin"); assert.deepEqual(m.issues[0].products, ["Wool scarf", "Hat"]);
  const calls = []; const fetchImpl = async (u, i) => { calls.push(u); if (/token$/.test(u)) return res({ access_token: "t", expires_in: 3600 }); if (/accounts\/v1\/accounts/.test(u)) return res({ accounts: [{ name: "accounts/123", accountId: "123", accountName: "Ex Shop" }] }); if (/products\/v1\/accounts\/123\/products/.test(u)) return /pageToken/.test(u) ? res({ products: [products[1]] }) : res({ products: [products[0]], nextPageToken: "n2" }); return res({}, 404); };
  const g = googleConnect({ keys, config: { googleClientId: "id" }, fetchImpl });
  assert.deepEqual((await g.merchantAccounts()).accounts, [{ id: "123", name: "Ex Shop" }]);
  const p = await g.merchantProducts("123"); assert.equal(p.products.length, 2, "every page read"); assert.ok(calls.every((u) => /^https:\/\/(oauth2|merchantapi)\.googleapis\.com\//.test(u)), "Google's own addresses only");
  const { d } = deps({ google: g }); const J = seoJobs(d);
  const r = await J.press("p", "shop", "merchant", {}); assert.ok(r.ok, r.refused); assert.match(r.line, /Ex Shop: 2 products read; 1 disapproved/);
  const sec = J.view("p", "shop").sections[0]; assert.match(sec.title, /Merchant Center: Ex Shop/); assert.match(sec.lines[0].solution, /support\.google\.com\/merchants/);
  const refused = await seoJobs(deps({ google: googleConnect({ keys, config: { googleClientId: "id" }, fetchImpl: async (u) => (/token$/.test(u) ? res({ access_token: "t" }) : res({}, 403)) }) }).d).press("p", "shop", "merchant", {});
  assert.match(refused.refused, /Merchant Center was not allowed in this sign-in/);
});

/* ── 1c: live Search Console in the monthly report ── */
test("1c · MONTHLY REPORT: Search Console's live rows when connected (Google's numbers, the window said); the export file stays the fallback; never zero when not connected", () => {
  const live = searchFromLive({ site: "sc-domain:ex.com", from: "2026-10-07", to: "2026-11-03", pages: [{ keys: ["https://ex.com/a"], clicks: 12, impressions: 400 }, { keys: ["https://ex.com/b"], clicks: 3, impressions: 900 }], queries: [{ keys: ["wool scarf"], clicks: 5, impressions: 300 }] });
  assert.equal(live.clicks, 15); assert.equal(live.impressions, 1300); assert.equal(live.window.days, 28); assert.equal(live.topPages[0].url, "https://ex.com/b");
  const rep = monthReport({ product: "Ex", month: "2026-11", searchLive: live }); assert.ok(rep.lines.some((l) => /Search Console, live \(sc-domain:ex\.com\): 1300 impressions, 15 clicks over 28 days/.test(l))); assert.ok(rep.lines.some((l) => /wool scarf \(300 impressions, 5 clicks\)/.test(l)));
  assert.ok(monthReport({ product: "Ex", month: "2026-11" }).lines.some((l) => /NOT CONNECTED/.test(l)), "no connection, no export: said, never zero");
  assert.equal(searchFromLive({ site: "x", from: "a", to: "b" }), null, "no rows: the export file is used");
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"); assert.match(main, /const rep = monthReport\(\{ searchLive,/); assert.match(main, /searchRecord: sc\?\.record \?\? null/);
});

/* ── 1d: the data lists ── */
test("1d · LISTS: each open service's documented answer → rows; ILOSTAT's occupation groups (latest year); World Bank price level; Wikidata universities; College Scorecard; AlAdhan with its method", () => {
  const r = escoRole("nurse", { _embedded: { results: [{ uri: "http://data.europa.eu/esco/occupation/x", title: "specialist nurse" }] } }, { code: "2221.3", _links: { hasEssentialSkill: [{ title: "apply nursing care" }, { title: "promote health" }] } });
  assert.deepEqual([r.title, r.isco, r.skills], ["specialist nurse", "2221.3", ["apply nursing care", "promote health"]]);
  const csv = '﻿"ref_area","source","indicator","sex","classif1","time","obs_value"\n"PAK","BA:1","EAR_EHRA_SEX_OCU_NB","SEX_T","OCU_ISCO08_2","2024",200\n"PAK","BA:1","EAR_EHRA_SEX_OCU_NB","SEX_T","OCU_ISCO08_2","2025",233.27\n"PAK","BA:1","EAR_EHRA_SEX_OCU_NB","SEX_T","OCU_ISCO08_9","2025",90\n"PAK","BA:1","EAR_EHRA_SEX_OCU_NB","SEX_T","OCU_SKILL_L1","2025",80';
  assert.deepEqual(iloEarnings(csv), { year: "2025", groups: [{ group: "Professionals", hourly: 233.27 }, { group: "Elementary occupations", hourly: 90 }] });
  assert.equal(iloEarnings('"ref_area","classif1","time","obs_value"\n"CAN","OCU_SKILL_L1","2025",1'), null, "no occupation groups → no row (never a guess)");
  assert.deepEqual(priceLevels([{}, [{ countryiso3code: "PAK", date: "2025", value: 70 }]], [{}, [{ countryiso3code: "PAK", date: "2025", value: 280 }]]), [{ iso3: "PAK", level: 0.25, pppYear: "2025", fxYear: "2025" }]);
  assert.deepEqual(universitiesOf({ results: { bindings: [{ u: { value: "http://www.wikidata.org/entity/Q1" }, uLabel: { value: "Uni A" }, site: { value: "https://a.edu" }, inception: { value: "+1913-01-01T00:00:00Z" } }, { u: { value: "http://www.wikidata.org/entity/Q2" }, uLabel: { value: "Q2" } }] } }), [{ qid: "Q1", name: "Uni A", website: "https://a.edu", founded: "1913", founders: null }]);
  assert.equal(scorecardRows({ results: [{ id: 1, "school.name": "State U", "latest.cost.tuition.in_state": 9000 }] })[0].tuitionInState, 9000);
  assert.deepEqual(prayerOf({ code: 200, data: { timings: { Fajr: "05:08 (GMT)", Dhuhr: "11:44" }, date: { gregorian: { date: "06-11-2026" } }, meta: { method: { name: "Muslim World League" }, timezone: "Europe/London" } } }).method, "Muslim World League");
  assert.equal(units().filter((u) => u.kind === "fees").length, 0, "no key, no fees unit"); assert.equal(units({ hasScorecardKey: true }).filter((u) => u.kind === "fees").length, 3);
  assert.equal(ROLES.length, 20); assert.ok(COUNTRIES.some((c) => c.iso3 === "PAK"));
});
test("1d · LISTS RUN: off switch; every row has its source and date; a country with no official data is said once and waits its own clock; the fees wait for the free key (said)", async () => {
  const rows = [], settings = {}; const seo = { setting: async (k) => settings[k] ?? null, setSetting: async (k, v) => { settings[k] = v; }, putSearches: async (r) => rows.push(...r) };
  assert.match((await runLists({ seo, env: { ALMISEO_LISTS_OFF: "1" } })).why, /switched off \(ALMISEO_LISTS_OFF\)/);
  const fetchImpl = async (u) => { if (/esco\/api\/search/.test(u)) return res({ _embedded: { results: [{ uri: "http://data.europa.eu/esco/occupation/x", title: "x role" }] } }); if (/esco\/api\/resource/.test(u)) return res({ _links: { hasEssentialSkill: [{ title: "a skill" }] } });
    if (/rplumber/.test(u)) return res(/ref_area=PAK/.test(u) ? '"ref_area","classif1","time","obs_value"\n"PAK","OCU_ISCO08_1","2025","300"' : '"ref_area","classif1","time","obs_value"'); if (/worldbank/.test(u)) return res([{}, COUNTRIES.map((c) => ({ countryiso3code: c.iso3, date: "2025", value: 2 }))]);
    if (/wikidata/.test(u)) return res({ results: { bindings: [{ u: { value: "http://www.wikidata.org/entity/Q9" }, uLabel: { value: "Uni" }, site: { value: "https://u.edu" } }] } }); if (/aladhan/.test(u)) return res({ code: 200, data: { timings: { Fajr: "05:00" }, date: { gregorian: { date: "06-11-2026" } }, meta: { method: { name: "MWL" } } } }); return res({}, 404); };
  const r = await runLists({ seo, env: {}, fetchImpl, now: () => Date.parse("2026-11-06T10:00:00Z"), perRun: 100, cities: [["London", "GB"]], pace: () => Promise.resolve() });
  assert.ok(r.ok); assert.match(r.parked, /api\.data\.gov key \(DATA_GOV_API_KEY\)/);
  assert.ok(rows.length > 40 && rows.every((x) => x.data.source?.name && x.data.source?.url && x.data.source?.checked === "2026-11-06" && x.day === "2026-11-06"), "every row: source name, link and the day read");
  assert.ok(r.none.includes("salary|GBR") && !r.failed.includes("salary|GBR"), "no official data is not a failure to retry every run");
  assert.equal(settings["lists-done"]["salary|GBR"], "2026-11-06");
  const again = await runLists({ seo, env: {}, fetchImpl, now: () => Date.parse("2026-11-07T10:00:00Z"), perRun: 100, cities: [["London", "GB"]], pace: () => Promise.resolve() }); assert.equal(again.read.length, 0, "nothing is read again before its own clock");
});
test("1d · WIRED: the lists fill the data items that said 'not built'; their cron, health line and collector page; what has no open source still says so", () => {
  const item = (p, re) => PRODUCT_DATA.find((x) => x.key === p).data.find((d) => re.test(d.what));
  for (const [p, re] of [["jobs", /job titles/], ["salary", /occupation group/], ["salary", /price level/], ["study", /universities with website/], ["study", /tuition/], ["halal", /prayer times/]]) { const i = item(p, re); assert.ok(i?.built && i.job === "lists", `${p}: ${re}`); }
  assert.equal(item("salary", /cost of living by city/).built, false, "no official open source per city: said, never filled"); assert.equal(item("study", /accreditation/).built, false);
  assert.ok(MC_CRONS.some((c) => c.path === "/cron/lists")); assert.ok(COLLECTORS.lists); assert.equal(LISTS.offEnv, "ALMISEO_LISTS_OFF");
  assert.match(readFileSync(join(REPO, "site", "almiseo.mjs"), "utf8"), /lists: \(await seo\.searchCount\?\.\(`lists:\$\{p\}`\)/);
});

/* ── found by starting the built 1.15.37: every HELP guide page answered 500 (since RR-375) ── */
test("GUIDES: every guide page the app serves renders, each step's own words shown (a help guide's steps are plain sentences, with no drawing)", async () => {
  const { guidePage, guideList } = await import("../desktop/guides.mjs");
  for (const g of guideList()) { let h; assert.doesNotThrow(() => { h = guidePage(g.id); }, `${g.id} must not crash`); assert.ok(h && !/>undefined</.test(h), `${g.id}: every step has its words`); }
  assert.match(guidePage("seo-reviews"), /once a day while it is open/); assert.match(guidePage("data-screen"), /Step 1 of/);
});

/* ── the owner's 1.15.36 run (6 Nov 22:04): "0 of 208, no change", "Last run: 0 checked, $0.00" — every page left would not open ── */
test("TRUTH PASS: a page that would not open is kept with its reason and NOT read again the same day (free, no AI); the screen says why instead of '0 checked, $0.00'", async () => {
  const { truthAll } = await import("../desktop/truth-pass.mjs");
  const rows = [{ key: "k1", question: "q", answer: "a", link: "https://blocked.example/a" }, { key: "k2", question: "q", answer: "b", link: "https://gone.example/b" }];
  let reads = 0, ai = 0; const read = async (u) => { reads++; return { ok: false, why: /blocked/.test(u) ? "the page answered 403" : "the page answered 404" }; };
  const fetchImpl = async () => { ai++; return res({}); };
  const first = await truthAll({ rows, verdicts: {}, key: "k", read, today: "2026-11-06", fetchImpl });
  assert.equal(reads, 2); assert.equal(ai, 0); assert.deepEqual(first.unread.map((u) => u.why), ["the page answered 403", "the page answered 404"]);
  const unread = []; const again = await truthAll({ rows, verdicts: {}, key: "k", read, today: "2026-11-06", fetchImpl, skip: new Map(first.unread.map((u) => [u.link, u.why])), onUnread: (r) => unread.push(r.link), allowed: () => false });
  assert.equal(reads, 2, "not read again today"); assert.equal(again.unread.length, 2); assert.equal(again.stopped, null, "a page known not to open is not a money stop"); assert.equal(unread.length, 2, "the screen's counter moves");
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(main, /unreadLinks: t\.unread\.slice\(0, 500\)/); assert.match(main, /String\(was\?\.on \?\? ""\)\.slice\(0, 10\) === today \? \(was\.unreadLinks/);
  assert.match(ui, /lines were not checked because their source page would not open/); assert.match(ui, /money is not the reason/);
});

/* ── 1e ── */
test("1e · the Guide says plainly that speech is never turned into text (captions or the host's file only)", () => {
  assert.ok(HELP_GUIDES["seo-video"].steps.some((s) => /does not turn speech into text/.test(s))); assert.ok(HELP_GUIDES["seo-podcast"].steps.some((s) => /does not turn speech into text/.test(s)));
  assert.ok(HELP_GUIDES["seo-reviews"].steps.some((s) => /once a day[\s\S]*Windows notification/.test(s))); assert.ok(HELP_GUIDES["seo-shop"].steps.some((s) => /Also connect Merchant Center/.test(s)));
});
