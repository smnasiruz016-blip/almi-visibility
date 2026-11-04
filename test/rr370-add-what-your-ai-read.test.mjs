/* RR-370 ADDITION: "Add what your AI read". The texts below are the shape of the owner's real file of 4 Nov 2026 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { takeBrowserReads, councilReads, shortReason, stillFresh, BROWSER } from "../desktop/browser-list.mjs";
import { checkCouncil, statesRegistration, councilFacts } from "../desktop/council-truth.mjs";
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const EMS = "Egyptian Medical Syndicate (Arabic site; translated by us). A professional syndicate of doctors. Digital services listed: new membership; issue certificates. The page does not say it licenses doctors to practise.";
const BMDC = "Official website of Bangladesh Medical & Dental Council (BM&DC). It registers doctors to practice in Bangladesh, in order to protect the public.";
const unread = (page) => ({ ok: false, why: "unread", page, on: "2026-11-03" });

test("registers is true only when the page's own text says it: not by the body's name, not by a reader's note", () => {
  assert.equal(statesRegistration(EMS, "medicine", { name: "Egyptian Medical Syndicate" }), false);
  assert.equal(statesRegistration("The page does not say it registers doctors.", "medicine"), false, "a reader's note is not the page");
  assert.equal(statesRegistration(BMDC, "dentistry", { name: "Bangladesh Medical & Dental Council" }), false, "the word Dental in its name is not the page saying it registers dentists");
  assert.equal(statesRegistration(BMDC, "dentistry", { name: "Bangladesh Medical and Dental Council (BMDC)" }), false, "& and 'and' are one name");
  assert.equal(statesRegistration(BMDC, "medicine", { name: "Bangladesh Medical & Dental Council" }), true, "it does say doctors");
  assert.equal(statesRegistration("The Council registers nurses and midwives in Kenya.", "nursing", { name: "Nursing Council of Kenya" }), true);
});

test("each page read is checked like a page our reader opened, with the date it was read; each COULD NOT READ is an honest gap with its reason", async () => {
  const kept = { "Egypt|medicine|Egyptian Medical Syndicate": unread("https://ems.org.eg/"), "Bangladesh|medicine|Bangladesh Medical and Dental Council (BMDC)": unread("https://bmdc.org.bd/"), "Bangladesh|dentistry|Bangladesh Medical & Dental Council": unread("https://www.bmdc.org.bd/"), "Ireland|veterinary science|Veterinary Council of Ireland": unread("https://www.vci.ie/Utility/Contact"), "Kenya|nursing|Other": { ok: true, evidence: "https://x.example/", on: "2026-10-01" } };
  const r = await councilReads({ kept, check: checkCouncil, pages: [{ url: "https://ems.org.eg/", readAt: "2026-11-04T04:08:14Z", text: EMS }, { url: "https://www.bmdc.org.bd/", readAt: "2026-11-05T03:59:57Z", text: BMDC }, { url: "https://www.vci.ie/Utility/Contact", readAt: "2026-11-04T03:54:18Z", text: "COULD NOT READ: the page says 404 Page not found (Veterinary Council of Ireland site works; this address is old). Site menu shows: Registration, Find a Vet, Get in touch." }] });
  assert.deepEqual(kept["Egypt|medicine|Egyptian Medical Syndicate"], { ok: false, why: "not stated", page: "https://ems.org.eg/", on: "2026-11-04", via: "read in your browser" });
  assert.equal(kept["Bangladesh|medicine|Bangladesh Medical and Dental Council (BMDC)"].ok, true, "the same site with or without www"); assert.equal(kept["Bangladesh|medicine|Bangladesh Medical and Dental Council (BMDC)"].on, "2026-11-05", "the date it was read, not the file's");
  assert.equal(kept["Bangladesh|dentistry|Bangladesh Medical & Dental Council"].ok, false);
  const g = kept["Ireland|veterinary science|Veterinary Council of Ireland"]; assert.equal(g.why, "unread"); assert.equal(g.reason, "the page says 404 Page not found"); assert.equal(g.via, "read in your browser"); assert.doesNotMatch(JSON.stringify(g), /Find a Vet/, "nothing of a page is kept");
  assert.equal(r.gaps, 1); assert.equal(r.confirmed, 1); assert.equal(r.notSaid, 2); assert.equal(r.pages[2].state, "could not read"); assert.equal(r.pages[0].lines[0].result, "the page does not say it");
  assert.doesNotMatch(JSON.stringify(kept), /licenses doctors/, "the page's text is not kept");
});

test("a COULD NOT READ never undoes what is already known, and its reason reads plainly", async () => {
  const kept = { "X|nursing|Body": { ok: false, why: "not stated", page: "https://b.example/", on: "2026-10-01" } }; await councilReads({ kept, check: checkCouncil, pages: [{ url: "https://b.example/", readAt: "2026-11-04T00:00:00Z", text: "COULD NOT READ: timed out" }] }); assert.equal(kept["X|nursing|Body"].why, "not stated");
  assert.equal(shortReason("COULD NOT READ: 403 Forbidden from the site (outside India). Note: PCI's own page says something."), "403 Forbidden from the site"); assert.equal(shortReason("COULD NOT READ: blocked by the browser's security software: the site's security certificate is not trusted; not opened"), "blocked by the browser's security software: the site's security certificate is not trusted");
});

test("the page decides: a line the review approved says registers only if what your AI read says so; a line not read in the browser stands as before", () => {
  const f = (o = {}) => ({ part: "home-council", country: "Egypt", profession: "medicine", councilName: "Egyptian Medical Syndicate", text: "Egyptian Medical Syndicate registers doctors in Egypt.", link: "https://ems.org.eg/", website: "https://ems.org.eg/", on: "2026-10-01", approved: true, ...o }), key = "Egypt|medicine|Egyptian Medical Syndicate", opts = { peopleOf: () => "doctors", today: "2026-11-04" };
  const said = councilFacts([f()], { [key]: { ok: false, why: "not stated", page: "https://ems.org.eg/", on: "2026-11-04", via: "read in your browser" } }, opts).facts[0]; assert.doesNotMatch(said.text, /registers doctors/); assert.match(said.text, /not confirmed yet/);
  const stood = councilFacts([f()], { [key]: { ok: false, why: "not stated", page: "https://ems.org.eg/", on: "2026-11-03" } }, opts).facts[0]; assert.match(stood.text, /registers doctors/, "the owner's approval stands for a page no one read in the browser");
  const gap = councilFacts([f()], { [key]: { ok: false, why: "unread", page: "https://ems.org.eg/", on: "2026-11-04", via: "read in your browser", reason: "site did not answer" } }, opts).facts[0]; assert.match(gap.text, /could not be read on 2026-11-04: site did not answer/);
  const noSite = councilFacts([f({ website: null })], { [key]: { ok: false, why: "unread", page: "https://ems.org.eg/", on: "2026-11-04", via: "read in your browser", reason: "site did not answer" } }, opts).facts[0]; assert.match(noSite.text, /could not be read on 2026-11-04 \(site did not answer\)/); assert.equal(noSite.part, "open-council");
});

test("the file's checks stand: a wrong source, no notice, too fast: nothing kept; a page not on the list is not used; an answered page leaves the day's list", () => {
  const hand = { source: BROWSER.source, date: "2026-11-04", startedBy: { who: "CLIENT", record: "r" }, notice: { text: "n", givenAt: "t" }, pages: [{ url: "https://a.example/", readAt: "2026-11-04T00:00:00Z", text: "x" }, { url: "https://z.example/", readAt: "2026-11-04T00:01:00Z", text: "y" }], stopped: null }, items = [{ kind: "council", url: "https://a.example/" }];
  const t = takeBrowserReads(hand, items); assert.equal(t.ok, true); assert.deepEqual(t.pages.map((p) => p.url), ["https://a.example/"]); assert.deepEqual(t.notOnList, ["https://z.example/"]);
  assert.equal(takeBrowserReads({ ...hand, source: "OTHER" }, items).ok, false); assert.equal(takeBrowserReads({ ...hand, notice: {} }, items).ok, false); assert.equal(takeBrowserReads({ ...hand, pages: hand.pages.map((p, i) => ({ ...p, readAt: `2026-11-04T00:00:0${i}Z` })) }, items).ok, false);
  const now = Date.parse("2026-11-04T12:00:00Z"); assert.equal(stillFresh({ via: "x", on: "2026-11-04" }, 30, now), true); assert.equal(stillFresh({ on: "2026-11-04" }, 30, now), false); assert.equal(stillFresh({ via: "x", on: "2026-09-01" }, 30, now), false); assert.equal(stillFresh({ via: "x", on: "2026-09-01", recheckedOn: "2026-11-01" }, 30, now), true);
});

test("one office is one line on a page listing every profession; its own words stay; other lines are left alone", async () => {
  const { mergeOffices } = await import("../desktop/council-truth.mjs"), o = (who, rest = "AHPC, G-5/2, Islamabad. Whether it is the registering body is not confirmed yet.") => ({ text: `Office for ${who} in Pakistan: ${rest}`, link: "https://a.example/" }), r = { text: "PNMC registers nurses in Pakistan." };
  const got = mergeOffices([r, o("physiotherapists"), o("radiographers"), o("dietitians"), o("vets", "Another, elsewhere. Whether it is the registering body is not confirmed yet.")]);
  assert.equal(got.length, 3); assert.equal(got[0], r); assert.equal(got[1].text, "Office for physiotherapists, radiographers and dietitians in Pakistan: AHPC, G-5/2, Islamabad. Whether it is the registering body is not confirmed yet."); assert.match(got[2].text, /^Office for vets in Pakistan: Another/);
  assert.match(read("desktop/exam-plan.mjs"), /it\.part === "councils"\) it\.claims = mergeOffices\(it\.claims\)/);
});

test("the page's gate reads every profession on a merged office line", async () => {
  const { professionsRegistered } = await import("../desktop/page-plan.mjs"); assert.deepEqual(professionsRegistered("Office for doctors and nurses in the Philippines: PRC, Manila. Whether it is the registering body is not confirmed yet."), ["medicine", "nursing"]); assert.deepEqual(professionsRegistered("Office for pharmacists, dietitians and vets in X: Y."), ["pharmacy", "dietetics", "veterinary science"]); assert.deepEqual(professionsRegistered("Pakistan Nursing and Midwifery Council registers nurses in Pakistan."), ["nursing"]);
  assert.match(read("desktop/page-quality.mjs"), /professionsRegistered\(l\)\.includes\(k\)/);
});

test("the wiring: the button beside the list; the route is async; a day's list skips what was tried; our reader failing again keeps what your AI read", () => {
  const ui = read("desktop/ui.html"), m = read("desktop/main.mjs");
  assert.match(ui, /<b>Add what your AI read<\/b> <input type="file" id="handinfile" accept="\.json,application\/json"/); assert.match(ui, /e\.target\?\.id !== "handinfile"/); assert.match(ui, /councils\/browser`, hand\)/); assert.match(ui, /could not read: \$\{esc\(p\.reason\)\}/);
  assert.match(m, /const v = await takeCouncilBrowser\(id, json\(\)\)/); assert.match(m, /stillFresh\(v, COUNCIL_KEEP_DAYS\)/); assert.match(m, /v\.why === "unread" && kept\[r\.key\]\?\.via \? \{ \.\.\.kept\[r\.key\], recheckedOn: today \}/); assert.match(read("desktop/council-truth.mjs"), /f\.approved && !c\?\.via &&/);
});
