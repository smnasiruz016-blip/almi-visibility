/* RR-371: the owner's file shows its answer and can be chosen twice; every council line its own page does not confirm is the honest office line; AlmiOET's pages go where its own code serves them */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { councilReads, splitAnswered, alreadyRead, keepReads, readsLine, fileRefusedLine, takeBrowserReads, BROWSER } from "../desktop/browser-list.mjs";
import { checkCouncil, councilFacts, councilKey } from "../desktop/council-truth.mjs";
import { withKnownFolder, previewOf, PUBLISH_FOLDERS, publishDraft } from "../desktop/publish.mjs";
import { servedPlace, taskFault } from "../desktop/dfs-task.mjs";
import { autoTask } from "../desktop/serp.mjs";
import { JUDGE } from "../desktop/qa-judge.mjs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const said = "Nursing Council of Kenya. The Council registers nurses and midwives in Kenya.", silent = "Welcome to our site. Contact us.", T = (m) => `2026-11-04T0${m}:00:00Z`;
const unread = (page) => ({ ok: false, why: "unread", page, on: "2026-11-03" });
const K = "Kenya|nursing|Nursing Council of Kenya", S = "Kenya|dentistry|Dental Board", G = "Kenya|pharmacy|Pharmacy Board";
const file = () => [{ url: "https://nck.example/", readAt: T(1), text: said }, { url: "https://dent.example/", readAt: T(2), text: silent }, { url: "https://ph.example/", readAt: T(3), text: "COULD NOT READ: site did not answer" }];
const start = () => ({ [K]: unread("https://nck.example/"), [S]: unread("https://dent.example/"), [G]: unread("https://ph.example/") });

test("choosing the same file again: the first answer comes back, nothing changes, and the page-by-page record is not wiped", async () => {
  const kept = start(), first = await councilReads({ pages: file(), kept, check: checkCouncil }); assert.deepEqual([first.confirmed, first.notSaid, first.gaps], [1, 1, 1]);
  const snapshot = JSON.stringify(kept), { again, rest } = splitAnswered(file(), kept); assert.equal(again.length, 3); assert.equal(rest.length, 0);
  const known = alreadyRead(again, kept); assert.deepEqual([known.confirmed, known.notSaid, known.gaps], [1, 1, 1], "the same numbers as the first time"); assert.equal(JSON.stringify(kept), snapshot, "not a word of what was kept changed");
  assert.deepEqual(known.pages.map((p) => p.state), ["read", "read", "could not read"]); assert.equal(known.pages[0].lines[0].result, "the page says it registers them"); assert.equal(known.pages[1].lines[0].result, "the page does not say it"); assert.equal(known.pages[2].reason, "site did not answer");
  const line = readsLine({ fresh: { pages: [], confirmed: 0, notSaid: 0, gaps: 0 }, again: known }); assert.match(line, /^This file was already added, and nothing changed\. 2 pages read in your browser, 1 could not be read: 1 council lines confirmed/); assert.doesNotMatch(line, /^Press/); assert.match(line, /Create SEO pages uses them\.$/);
  assert.equal(keepReads(first.pages, []).length, 3, "a file that adds nothing leaves the record"); assert.equal(keepReads(first.pages, [{ url: "https://nck.example/", on: "x", state: "read", lines: [] }]).length, 3, "the same page again is one row"); assert.equal(keepReads(first.pages, [{ url: "https://z.example/", on: "x", state: "read", lines: [] }]).length, 4, "another page is added");
});

test("one council line is one count: two pages of one site (his bmdc.org.bd and www.bmdc.org.bd) count it once, the first time and the second", async () => {
  const kept = { "Bangladesh|medicine|BMDC": unread("https://bmdc.org.bd/"), "Bangladesh|dentistry|BMDC": unread("https://www.bmdc.org.bd/") }, two = [{ url: "https://www.bmdc.org.bd/", readAt: T(1), text: "It registers doctors to practice in Bangladesh." }, { url: "https://bmdc.org.bd/", readAt: T(2), text: "It registers doctors to practice in Bangladesh." }], first = await councilReads({ pages: two, kept, check: checkCouncil }), { again } = splitAnswered(two, kept), second = alreadyRead(again, kept);
  assert.deepEqual([first.confirmed, first.notSaid, first.gaps], [1, 1, 0]); assert.deepEqual([second.confirmed, second.notSaid, second.gaps], [1, 1, 0]);
});

test("the line names a button the screen really has", () => { const ui = read("desktop/ui.html"), l = readsLine({ fresh: { pages: [{ state: "read", lines: [] }], confirmed: 0, notSaid: 0, gaps: 0 }, again: { pages: [] } }), b = /Press (.+?) to use them/.exec(l)[1]; assert.equal(b, "Create SEO pages"); assert.match(ui, new RegExp(`>${b}<|>🚀? ?${b}`), "the button's words are on the screen"); assert.doesNotMatch(ui, /Make your pages/); });

test("a refused file says why in plain words", () => { assert.equal(fileRefusedLine(["NO_DATE", "TOO_FAST"]), `Refused: it has no date; its pages were read less than ${BROWSER.minPauseSeconds} seconds apart. Nothing from this file is kept.`); assert.doesNotMatch(fileRefusedLine(["NOT_A_BROWSER_READ", "NO_DATE", "NOT_STARTED_BY_THE_CLIENT", "NO_NOTICE_GIVEN", "OVER_THE_DAILY_CAP", "TOO_FAST"]), /[A-Z]{2,}_/); });

test("a newer read of a page already answered is a new read, not 'already added'", async () => {
  const kept = start(); await councilReads({ pages: file(), kept, check: checkCouncil });
  const later = [{ url: "https://dent.example/", readAt: "2026-11-09T01:00:00Z", text: "The Board registers dentists in Kenya." }], { again, rest } = splitAnswered(later, kept); assert.equal(again.length, 0); assert.equal(rest.length, 1);
  await councilReads({ pages: rest, kept, check: checkCouncil }); assert.equal(kept[S].ok, true);
});

test("a file with nothing on the list says so, and tells no one to press a button", () => {
  const line = readsLine({ fresh: { pages: [] }, again: { pages: [] }, notOnList: ["https://z.example/"] }); assert.match(line, /^Nothing was added: none of this file's pages are on the list\. 1 pages/); assert.doesNotMatch(line, /Press /);
  const hand = { source: BROWSER.source, date: "2026-11-04", startedBy: { who: "CLIENT", record: "r" }, notice: { text: "n", givenAt: "t" }, pages: file(), stopped: null }; assert.equal(takeBrowserReads({ ...hand, source: "X" }, []).ok, false, "a refused file still refuses before anything else");
});

test("the screen: the file's name stands, 'reading' shows at once, the answer is brought into view open, a redraw keeps the line", () => {
  const ui = read("desktop/ui.html"), h = ui.slice(ui.indexOf('e.target?.id !== "handinfile"'), ui.indexOf("async function pagesBox"));
  assert.match(h, /\$\("#handinname"\)\.textContent = f\.name/); assert.match(h, /show\(null, `Reading \$\{f\.name\}…`\)/); assert.match(h, /scrollIntoView/); assert.match(h, /handinView\(r, line, true\)/); assert.ok(h.indexOf("await f.text()") < h.indexOf('input.value = ""'), "the file is read before the input is emptied");
  assert.match(ui, /id="handinname"/); assert.match(ui, /line \?\? r\?\.line/, "a redraw shows the kept line"); assert.match(ui, /replace\(\/\^\\uFEFF\//, "a file with a byte-order mark opens");
  assert.match(read("desktop/main.mjs"), /if \(rest\.length\) \{ pwrite\(id, "council-checks\.json", kept\); didIt\(id, line\); \}/, "only a file that adds something writes the checks or the Done list"); assert.match(read("desktop/main.mjs"), /pages = keepReads\(before\?\.pages, \[\.\.\.known\.pages, \.\.\.r\.pages\]\)/, "the server keeps what an earlier file showed");
});

const fact = (o = {}) => ({ part: "home-council", country: "Nepal", profession: "nursing", councilName: "Nepal Nursing Council", text: "Nepal Nursing Council registers nurses in Nepal.", link: "https://nnc.example/contact", on: "2026-10-01", verified: true, ...o }), key = councilKey("Nepal", "nursing", "Nepal Nursing Council"), opts = { peopleOf: () => "nurses", today: "2026-11-04" };

test("OWNER'S RULING: approved or never checked, a line its own page does not confirm never says registers", () => {
  for (const [what, f, checks] of [["approved, page silent", fact({ approved: true, website: "https://nnc.example/" }), { [key]: { ok: false, why: "not stated", page: "https://nnc.example/", on: "2026-11-01" } }], ["approved, unread", fact({ approved: true, address: "Bansbari, Kathmandu" }), { [key]: { ok: false, why: "unread", page: "https://nnc.example/", on: "2026-11-01" } }], ["approved, never checked", fact({ approved: true, website: "https://nnc.example/" }), { other: {} }], ["never checked", fact({ address: "Bansbari, Kathmandu" }), { other: {} }], ["no check at all", fact({ website: "https://nnc.example/" }), null]]) {
    const out = councilFacts([f], checks, opts); assert.doesNotMatch(out.facts[0].text, / registers /, what); assert.match(out.facts[0].text, /^Office for nurses in Nepal: Nepal Nursing Council.*Whether it is the registering body is not confirmed yet\./, what); assert.equal(out.facts[0].part, "home-council", what); assert.equal(out.changes.length, 1, `${what}: it is listed`); assert.equal(out.changes[0].kept, undefined, what);
  }
  const none = councilFacts([fact({ approved: true })], null, opts).facts[0]; assert.equal(none.part, "open-council", "no address and no contact: no office to show, an open question"); assert.match(none.text, /own page has not been checked yet\.$/, "and it does not claim a check that never happened"); assert.doesNotMatch(none.text, /does not say/);
});

test("what still says registers: its own page said so, or the owner's verified facts hold that page (listed, never silent)", () => {
  const yes = councilFacts([fact()], { [key]: { ok: true, evidence: "https://nnc.example/about", on: "2026-11-01" } }, opts); assert.match(yes.facts[0].text, / registers nurses/); assert.equal(yes.facts[0].link, "https://nnc.example/about");
  const held = councilFacts([fact(), { part: "councils", verified: true, country: "Nepal", profession: "nursing", link: "https://nnc.example/oet", on: "2026-10-02" }], null, opts); assert.match(held.facts[0].text, / registers nurses/); assert.match(held.changes[0].kept, /verified facts hold that page/); assert.equal(held.facts[0].link, "https://nnc.example/oet");
  assert.doesNotMatch(councilFacts([fact({ councilName: "Nepal Nurses Association", text: "Nepal Nurses Association registers nurses in Nepal." }), { part: "councils", verified: true, country: "Nepal", profession: "nursing", link: "https://nnc.example/oet", on: "2026-10-02" }], null, opts).facts[0].text, /^Nepal Nurses Association registers/, "the verified path never rescues an association");
});

test("Iran: no DataForSEO autocomplete; the judge is Opus and its verdicts are kept", () => {
  assert.equal(servedPlace("Iran"), false); assert.match(taskFault("auto", autoTask("oet iran", "Iran")[0]), /does not serve Iran/);
  assert.equal(JUDGE.model, "claude-opus-5-5"); assert.match(read("desktop/main.mjs"), /const rows = unjudged\(plan, verdicts\)/, "only pairs with no verdict go to the AI");
});

test("AlmiOET's folder: from its own code; a folder the client set stands; no other site is touched; the page lands where the route reads it", async () => {
  const oet = { kind: "github", repo: "smnasiruz016-blip/almi-oet", branch: "visibility-pages", folder: "", site: "https://almioet.almiworld.com" };
  assert.equal(withKnownFolder(oet).folder, "visibility-pages"); assert.deepEqual(previewOf(withKnownFolder(oet)), { branch: "visibility-pages", repo: oet.repo, folder: "visibility-pages" }); assert.equal(withKnownFolder({ ...oet, repo: "SMNasiruz016-blip/Almi-OET" }).folder, "visibility-pages");
  assert.equal(withKnownFolder({ ...oet, folder: "my/own" }).folder, "my/own"); assert.equal(withKnownFolder({ ...oet, repo: "someone/else" }).folder, ""); assert.equal(withKnownFolder({ kind: "wordpress" }).folder, undefined); assert.equal(withKnownFolder(null), null);
  assert.ok(PUBLISH_FOLDERS.every((r) => /VISIBILITY_DIR|src\//.test(r.source) && r.on), "each row says where it was read");
  const puts = [], r = await publishDraft({ target: withKnownFolder(oet), key: "stand-in", draft: { readyAsDraft: true, url: "https://almioet.almiworld.com/oet-for-nurses-in-nepal", title: "T", html: "<html><head><title>T</title></head><body><main>x</main></body></html>" }, fetchImpl: async (u, init) => { puts.push({ u, m: init.method }); return { ok: true, status: 200, json: async () => ({ content: { sha: "s" } }) }; } });
  assert.equal(r.ok, true); assert.match(puts[0].u, /\/repos\/smnasiruz016-blip\/almi-oet\/contents\/visibility-pages\/oet-for-nurses-in-nepal\/index\.html$/); assert.equal(r.live, null, "a preview is never said to be live");
  const m = read("desktop/main.mjs"); assert.match(m, /const conn = withKnownFolder\(pread\(id, "publish\.json"\)\);\n  if \(!conn\?\.kind\) return \{ ok: false, needsConnection/, "the publish itself uses it"); assert.match(m, /conn = withKnownFolder\(pread\(id, "publish\.json"\)\), keyName/, "the screen shows it");
  assert.match(read("desktop/ui.html"), /folder \$\{esc\(X\.preview\.folder\)\}/);
});
