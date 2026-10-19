/**
 * RR-291 · F16 C7 and F63 through the engine's own browser route (owner decision 2 of RR-291). Pure rules on fixtures with firing controls,
 * and REAL on the batch's stored observations when they exist (count-only).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { surfacesOf, formSurfaceQueries, planRefusals, webSearchSeen, ownPosition, aiAnswerSeen, observationRecord, surfaceCensus, BOUNDS, OBS } from "../src/research/answer-surfaces.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const descriptor = { productDimensions: { services: ["nursing", "speech-pathology"] } };
const surfaces = { topic: "TOPIC", locations: ["Town"] };
const q = { queryId: "q1", text: "TOPIC centre Town" };
const S = surfacesOf({ surfaces: { "web-search": { kind: "WEB_SEARCH", at: "https://search.example/s?q={q}" } } });

test("C20 / F63 · the queries come from the declaration only; a missing part is named; the owner's bounds refuse a larger plan", () => {
  const f = formSurfaceQueries({ descriptor, surfaces });
  assert.deepEqual(f.topical.map((x) => x.text), ["TOPIC nursing", "TOPIC speech pathology"]);
  assert.deepEqual(f.local.map((x) => [x.text, x.location]), [["TOPIC centre Town", "Town"], ["TOPIC preparation Town", "Town"]]);
  assert.ok(formSurfaceQueries({ descriptor, surfaces: { topic: "TOPIC" } }).missing.some((m) => /locations/.test(m)));
  /* FIRING CONTROL: 21 web searches are refused */
  assert.equal(planRefusals({ web: Array(BOUNDS.webSearches).fill(q) }).length, 0);
  assert.match(planRefusals({ web: Array(BOUNDS.webSearches + 1).fill(q) })[0], /WEB_SEARCHES_OVER/);
  assert.match(planRefusals({ ai: Array(BOUNDS.aiQuestions + 1).fill(q) })[0], /AI_QUESTIONS_OVER/);
});

test("C7 · a result page gives its domains in order, its features and formats — no text kept; F63 · the own position or NOT_IN_THE_RESULTS_SHOWN", () => {
  const text = "People also ask\nOne Site\nhttps://www.one.example › a\nTwo\nhttps://two.example › b\nClient\nhttps://client.example\nSponsored\nhttps://www.search.example/x";
  const s = webSearchSeen(text, { surfaceHost: "www.search.example" });
  assert.deepEqual(s.results.map((r) => r.domain), ["one.example", "two.example", "client.example"]);
  assert.deepEqual([...s.features].sort(), ["ADS", "QUESTIONS_PEOPLE_ASK"]);
  assert.ok(s.formats.includes("QUESTION_LIST"));
  assert.ok(!JSON.stringify(s).includes("One Site"), "page text kept");
  assert.deepEqual(ownPosition(s.results, ["client.example"]), { state: "RANKED", position: 3, of: 3 });
  /* FIRING CONTROL: a client absent from the page is never a rank of 0 */
  assert.deepEqual(ownPosition(s.results, ["absent.example"]), { state: "NOT_IN_THE_RESULTS_SHOWN", of: 3 });
});

test("C19 · an AI answer page keeps only the addresses it names, each an UNVERIFIED LEAD; its own host and its prose are dropped", () => {
  const s = aiAnswerSeen("The answer says many things. See https://forum.example/t/1 and https://ai.example/x and https://news.example/a.", { surfaceHost: "ai.example" });
  assert.deepEqual(s.leads.map((l) => l.address), ["https://forum.example/t/1", "https://news.example/a"]);
  assert.ok(s.leads.every((l) => l.state === "UNVERIFIED_LEAD"));
  assert.ok(!JSON.stringify(s).includes("many things"), "provider prose kept");
});

test("records · keyed for the store, placed in an evidence state (OBSERVED, or UNKNOWN when BLOCKED); a census of 0 observed pages is COULD-NOT-PROVE", () => {
  const ok = observationRecord({ surfaces: S, tenantId: "t", subject: "s", surfaceId: "web-search", query: q, on: "2026-10-19", at: "2026-10-19T10:00:00Z", run: "r", read: { state: "READ" }, seen: webSearchSeen("https://a.example › x"), location: "Town" });
  const blocked = observationRecord({ surfaces: S, tenantId: "t", subject: "s", surfaceId: "web-search", query: q, on: "2026-10-19", at: "2026-10-19T10:00:01Z", run: "r", read: { state: "BLOCKED", reason: "ROBOTS_DISALLOWED", detail: "d" } });
  assert.match(ok.measurement_key, /^answer_surface_observation:/);
  assert.equal(evidenceStateOf(ok).state, "OBSERVED");
  assert.equal(evidenceStateOf(blocked).state, "UNKNOWN");
  assert.equal(blocked.results, undefined, "a BLOCKED read carries no result");
  assert.equal(surfaceCensus([blocked]).verdict, "COULD-NOT-PROVE");
  assert.equal(surfaceCensus([ok, blocked]).verdict, "PROVED");
  /* FIRING CONTROL: a surface is only what the declaration holds — an address without {q}, or an undeclared surface, is refused */
  assert.throws(() => surfacesOf({ surfaces: { x: { kind: "WEB_SEARCH", at: "https://search.example/s" } } }));
  assert.throws(() => observationRecord({ surfaces: S, tenantId: "t", subject: "s", surfaceId: "ai-answer-a", query: q, on: "2026-10-19", at: "x", run: "r", read: {} }));
  /* FIRING CONTROL: a record with no run is refused */
  assert.throws(() => observationRecord({ surfaces: S, tenantId: "t", subject: "s", surfaceId: "web-search", query: q, on: "2026-10-19", at: "x", run: "", read: {} }));
});

const STORE = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12", "answer-surface-observations.jsonl");
test("REAL · the stored observations of the owner-GREENed browser-route run: every one keyed and placed; the web search BLOCKED by the host's robots file, never read past", { skip: existsSync(STORE) ? false : "no observation stored on this machine" }, () => {
  const rows = readFileSync(STORE, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(rows.length >= 1, "EMPTY real population");
  assert.ok(rows.every((r) => evidenceStateOf(r).state !== null), "a record with no evidence state");
  assert.ok(rows.every((r) => r.text === undefined && r.answer === undefined), "a page text was kept");
  const web = rows.filter((r) => r.surfaceId === "web-search"), ai = rows.filter((r) => r.surface === "AI_ANSWER");
  assert.ok(web.length <= BOUNDS.webSearches && ai.length <= BOUNDS.aiQuestions);
  const c = surfaceCensus(rows);
  console.log(`  REAL: web ${web.length} (OBSERVED ${web.filter((r) => r.state === OBS.OBSERVED).length}, BLOCKED ${JSON.stringify(c.blockedBy)}) · AI ${ai.length} (OBSERVED ${ai.filter((r) => r.state === OBS.OBSERVED).length}, leads ${ai.reduce((s, r) => s + (r.leads?.length ?? 0), 0)}) · C7 ${c.verdict}`);
});
