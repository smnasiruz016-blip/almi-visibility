/* RR-370b: DataForSEO's 40501. Each field against the endpoint's own documentation; a bad task is never sent; a refused one is not posted again */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { taskFault, keywordField, servedPlace, refusedLine, DFS_LOCATIONS } from "../desktop/dfs-task.mjs";
import { queueSearches, serpTask, autoTask, autoKey, tryAgain, notForReading, readSerp, AUTOCOMPLETE } from "../desktop/serp.mjs";
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8"), NOW = "2026-11-04T01:04:00.000Z", ON = { on: true, capDay: 1, capMonth: 10 };
const answer = (fn) => { const posts = []; return { posts, fetchImpl: async (url, init) => { const body = JSON.parse(init.body); posts.push({ url, body }); return { json: async () => ({ status_code: 20000, tasks: body.map((t, i) => fn(t, i)) }) }; } }; };
const created = () => ({ status_code: 20100, id: "t1", cost: 0.0006 });
const auto = (k, c) => ({ key: autoKey(k, c), q: k, kind: "auto", task: autoTask(k, c) });

test("each field against DataForSEO's own documentation", () => {
  assert.equal(taskFault("serp", serpTask("oet fees in pakistan")[0]), null); assert.equal(taskFault("auto", autoTask("oet nepal", "Nepal")[0]), null); assert.equal(servedPlace("Iran"), false); assert.equal(servedPlace("Pakistan"), true); assert.ok(DFS_LOCATIONS.countries.length > 200);
  assert.match(taskFault("auto", autoTask("oet iran", "Iran")[0]), /does not serve Iran/); assert.match(taskFault("auto", { ...autoTask("x", "Nepal")[0], depth: 10 }), /does not take \(depth\)/, "autocomplete has no depth"); assert.match(taskFault("serp", serpTask("  ")[0]), /no words/); assert.match(taskFault("serp", serpTask("x".repeat(701))[0]), /700/); assert.equal(taskFault("serp", serpTask("x".repeat(700))[0]), null);
  assert.match(taskFault("serp", { ...serpTask("x")[0], depth: 701 }), /depth/); assert.match(taskFault("serp", { ...serpTask("x")[0], priority: 3 }), /priority/); assert.match(taskFault("serp", { ...serpTask("x")[0], tag: "t".repeat(256) }), /tag/); assert.match(taskFault("serp", { ...serpTask("x")[0], language_code: "" }), /language/);
  assert.equal(keywordField("OET C+ grade 100% pass"), "OET C%2B grade 100%25 pass", "the service decodes + and %"); assert.equal(keywordField(" a\n b  "), "a b");
});

test("every country in the app's own lists is served, or is the one named exception: this fails when a new one is added that is not", () => { const facts = JSON.parse(read("desktop/lists/almiworld-oet-origin-facts.json")), names = new Set(JSON.stringify(facts).match(/"country":"[^"]+"/g)?.map((x) => x.slice(11, -1)) ?? []); for (const c of names) if (c !== "Iran") assert.ok(servedPlace(c), c); });

test("a bad task is never sent, costs nothing, is counted in plain words; the good ones in the same batch go", async () => {
  const a = answer(created), ledger = {}, q = await queueSearches({ wanted: [auto("oet iran", "Iran"), auto("oet nepal", "Nepal")], settings: ON, ledger, login: "l", password: "p", now: NOW, fetchImpl: a.fetchImpl });
  assert.equal(a.posts.length, 1); assert.deepEqual(a.posts[0].body.map((t) => t.location_name), ["Nepal"]); assert.equal(a.posts[0].url, AUTOCOMPLETE.url); assert.equal(q.posted, 1); assert.equal(ledger.refused[autoKey("oet iran", "Iran")].by, "us"); assert.equal((ledger.spent ?? []).filter((x) => x.q === "oet iran").length, 0, "nothing is booked");
  assert.equal(refusedLine(ledger), "1 search was not sent and cost nothing: 1 because DataForSEO does not serve Iran as a location."); assert.equal(refusedLine({}), null);
  const again = answer(created); await queueSearches({ wanted: [auto("oet iran", "Iran")], settings: ON, ledger, login: "l", password: "p", now: NOW, fetchImpl: again.fetchImpl }); assert.equal(again.posts.length, 0);
});

test("one DataForSEO refuses is booked at $0, remembered, and not posted on the next run: never a stop; another search still goes", async () => {
  const a = answer((t) => (t.keyword === "bad" ? { status_code: 40501, status_message: "Invalid Field: 'keyword'.", cost: 0 } : created())), ledger = {}, wanted = [{ key: "bad||", q: "bad", task: serpTask("bad") }, { key: "good||", q: "good", task: serpTask("good") }], q = await queueSearches({ wanted, settings: ON, ledger, login: "l", password: "p", now: NOW, fetchImpl: a.fetchImpl });
  assert.equal(q.stop, null); assert.equal(q.posted, 1); assert.equal(ledger.refused["bad||"].by, "DataForSEO"); assert.deepEqual(ledger.spent.filter((x) => x.q === "bad").map((x) => [x.ok, x.cost, x.code]), [[false, 0, 40501]]);
  const next = answer(created); await queueSearches({ wanted, settings: ON, ledger: { ...ledger, pending: {} }, login: "l", password: "p", now: "2026-11-04T02:00:00.000Z", fetchImpl: next.fetchImpl }); assert.deepEqual(next.posts[0].body.map((t) => t.keyword), ["good"], "only the good one");
  const later = answer(created); await queueSearches({ wanted: [wanted[0]], settings: ON, ledger: { refused: ledger.refused }, login: "l", password: "p", now: "2027-06-01T00:00:00.000Z", fetchImpl: later.fetchImpl }); assert.equal(later.posts.length, 1, "after the keep days it is tried again");
});

test("a request that is wrong is not sent again in a retry; a server's trouble still is", () => { for (const code of [40501, 40502, 40503]) assert.equal(tryAgain({ ok: false, code, why: "Invalid Field" }), false); assert.equal(tryAgain({ ok: false, code: 50000, why: "Internal Error" }), true); });

test("the 8 page reads: a breadcrumb with a date is no address, is not read, and is not paid", () => {
  const google = "https://www.google.com/url?q=x", got = readSerp({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.0006, result: [{ items: [{ type: "organic", url: google, title: "T", breadcrumb: "https://www.dvidshub.net · Feb 24, 2025" }, { type: "organic", url: google, title: "U", breadcrumb: "https://www.example.org › a › b" }] }] }] });
  assert.equal(got.results[0].url, google, "the redirect stays, and is left unread"); assert.equal(got.results[1].url, "https://www.example.org/a/b"); assert.equal(notForReading("https://www.dvidshub.net · Feb 24, 2025"), true); assert.equal(notForReading("https://www.example.org/a"), false);
});

test("the wiring: the collector checks before it posts; the count reaches the screen's line", () => { assert.match(read("site/top-pages.mjs"), /if \(taskFault\("serp", serpTask\(intent,[^\n]*out\.refused = /); assert.match(read("desktop/main.mjs"), /refused: refusedLine\(led\)/); assert.match(read("desktop/almiseo.mjs"), /line: `\$\{refused \? `\$\{refused\} ` : ""\}Searches:/); });
