/**
 * ITEM 25 — GATE A'S THREE OFFLINE CHECKS AS PER-PAGE MEASUREMENTS.
 * Each with a firing fixture and a silent clean control, using Gate A's own
 * functions and thresholds.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { measureExistingPages, templateGroupOf, factsPresentIn, MIN_VALUE_CHARS } from "../src/gate-a/existing-pages.mjs";

const shell = "<nav>home about contact login register pricing blog help</nav>";
const words = (seed, n) => Array.from({ length: n }, (_, i) => `w${seed}x${i}`).join(" ");
const page = (id, body) => ({ id, html: `<html><body>${shell}<main><p>${body}</p></main></body></html>` });
const fact = (value, id = value) => ({ id, verificationState: "VERIFIED", value: { value }, source: { url: "https://regulator.example.org/rules", tier: 1 }, checks: { linkCheckedOn: "2026-09-12", linkCheckOutcome: "pass" } });

test("template groups: same host, same first segment, same depth — and two templates are never siblings", () => {
  assert.equal(templateGroupOf("https://a.example.com/guide/x/y"), templateGroupOf("https://a.example.com/guide/p/q"));
  assert.notEqual(templateGroupOf("https://a.example.com/guide/x/y"), templateGroupOf("https://a.example.com/guide/x"));
  assert.notEqual(templateGroupOf("https://a.example.com/guide/x"), templateGroupOf("https://b.example.com/guide/x"));
});

test("🔴 UNIQUE VALUE — FIRES on a page that is shell plus a handful of words; SILENT on a page with 400 words of its own", () => {
  const m = measureExistingPages([page("https://s.example.com/g/a", words(1, 20)), page("https://s.example.com/g/b", words(2, 400)), page("https://s.example.com/g/c", words(3, 400))], []);
  const by = Object.fromEntries(m.results.map((r) => [r.id.slice(-1), r]));
  assert.equal(by.a.uniquePass, false, "a thin page passed unique value");
  assert.equal(by.b.uniquePass, true, "a page with 400 words of its own was flagged");
});

test("🔴 SIBLING OVERLAP — FIRES on two siblings whose bodies are the same; SILENT on a sibling with its own body", () => {
  const same = words(7, 300);
  const m = measureExistingPages([page("https://o.example.com/g/a", same), page("https://o.example.com/g/b", same), page("https://o.example.com/g/c", words(8, 300))], []);
  const by = Object.fromEntries(m.results.map((r) => [r.id.slice(-1), r]));
  assert.equal(by.a.overlapState, "MEASURED");
  assert.equal(by.a.overlapPass, false, "identical siblings were not flagged");
  assert.equal(by.b.overlapPass, false, "identical siblings were not flagged");
  assert.equal(by.c.overlapPass, true, "a sibling with its own body was flagged");
});

test("🔴 A GROUP OF ONE is VACUOUS and A GROUP OF TWO is UNMEASURABLE — neither collects a pass", () => {
  const alone = measureExistingPages([page("https://o.example.com/solo/x", words(10, 300))], []);
  assert.equal(alone.results[0].overlapState, "VACUOUS");
  assert.equal(alone.results[0].overlapPass, null, "a page with no sibling collected a free pass");
  // Two identical pages: Gate A's shell for two pages is their intersection, so they subtract to nothing.
  const same = words(11, 300);
  const pair = measureExistingPages([page("https://o.example.com/p/a", same), page("https://o.example.com/p/b", same)], []);
  for (const r of pair.results) {
    assert.equal(r.overlapState, "UNMEASURABLE_PAIR");
    assert.equal(r.overlapPass, null, "an identical pair was scored as distinct");
  }
});

test("🔴 VERIFIED-FACT PRESENCE — FIRES (fails) on a page carrying none; SILENT (passes) on a page carrying five; a short value never matches by accident", () => {
  const facts = ["minimum grade B in each part", "valid for two years", "fee of 350 pounds", "results within 16 days", "application through the portal"].map((v) => fact(v));
  const withFive = measureExistingPages([page("https://f.example.com/g/a", `${words(11, 50)} ${facts.map((f) => f.value.value).join(". ")}`)], facts);
  assert.equal(withFive.results[0].factsPresent.length, 5);
  assert.equal(withFive.results[0].factsPass, true);
  const without = measureExistingPages([page("https://f.example.com/g/a", words(12, 50))], facts);
  assert.equal(without.results[0].factsPresent.length, 0);
  assert.equal(without.results[0].factsPass, false);
  assert.deepEqual(factsPresentIn("<p>grade B</p>", [fact("B")]), [], `a value shorter than ${MIN_VALUE_CHARS} characters matched`);
  assert.deepEqual(factsPresentIn("<p>minimum grade B in each part</p>", [{ ...fact("minimum grade B in each part"), verificationState: "UNVERIFIED" }]), [], "an UNVERIFIED fact was counted");
});
