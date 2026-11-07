/**
 * RR-388 · NEXT_ROUND_NOTES items 17 and 18 (owner, 7 Nov 2026).
 * 18 Q6: the product's OWN line ("AlmiOET is our own practice site: … Clear or Borderline …") is our product text (Q&A LAW 5A.5): never hidden,
 *        never judged against an outside source.
 * 18 Q1/Q4/Q5: the answers from the owner's research, re-sourced to OET's and CORU's own pages and judged PASS, are in the lists.
 * 17: while a check runs, Home redraws only the progress line (the window blinked on every poll).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const own = "AlmiOET is our own practice site: OET practice on the real 0–500 scale with a grade of A, B, C+ or C per sub-test — see if you're Clear or Borderline before exam day. All 12 healthcare professions. Original material.";

test("18 Q6: the product's own line is never hidden, under any question; an outside line still is", async () => {
  const { unfit, ownLine, textUnfit } = await import("../desktop/answer-fit.mjs");
  assert.equal(ownLine(own), true);
  for (const q of ["Who is OET Preparation for?", "What is the OET Practice Test?", "How do I prepare for OET?"]) assert.equal(unfit(q, own), false, q);
  assert.equal(ownLine("OET is our own practice site: x"), true, "the shape, whatever the product");
  assert.equal(ownLine("Ahpra says AlmiOET is our own practice site: x"), false, "only a line that STARTS as the product's own line");
  /* sabotage: the RR-387b text rule for the old CORU wording still hides it */
  assert.equal(textUnfit("Where do dietitians from Nepal go?", "In Ireland: CORU (Dietitians Registration Board) accepts OET (Dietetics): B (350) in three sub-tests and C+ (300) in one."), true);
  const j = JSON.parse(readFileSync(new URL("../desktop/lists/answer-fit.json", import.meta.url), "utf8"));
  assert.equal(Object.values(j.failText).some((r) => /our own practice site/.test(r.sample ?? "")), false, "no text rule for the own line is left");
});

test("18 Q6: the truth pass never judges our own product line against an outside page, and shows it", () => {
  const s = readFileSync(new URL("../desktop/truth-pass.mjs", import.meta.url), "utf8");
  assert.match(s, /!c\.filled [^;]*&& !c\.ownProduct/);
  assert.match(s, /const shown = \(question, c, page\) => \{ if \(c\.filled \|\| c\.ownProduct\) return true;/);
  const l = readFileSync(new URL("../desktop/answer-ladder.mjs", import.meta.url), "utf8");
  assert.match(l, /ownProduct: true/, "the ladder marks the line as the product's own");
});

test("18 Q1/Q4/Q5: the re-sourced answers are in the lists, each from the body's own page", () => {
  const k = JSON.parse(readFileSync(new URL("../desktop/lists/known-answers.json", import.meta.url), "utf8")).rows;
  const mds = k.filter((r) => /MDS graduate/.test(r.question));
  assert.equal(mds.length, 2); for (const r of mds) { assert.equal(r.link, "https://oet.com/test/oet-test"); assert.match(r.text, /dentistry/); assert.match(r.text, /does not name the MDS degree/); }
  const ke = k.find((r) => r.title === "OET for Doctors from Kenya");
  assert.equal(ke.link, "https://support.oet.com/articles/Knowledge/How-do-I-book-OET"); assert.doesNotMatch(ke.text, /e-oet/i, "the third-party site is not the answer");
  const f = JSON.parse(readFileSync(new URL("../desktop/lists/fact-corrections.json", import.meta.url), "utf8")).text.find((r) => /Dietitians Registration Board/.test(r.has));
  assert.match(f.link, /^https:\/\/www\.coru\.ie\//); assert.match(f.to, /grade B \(350\) in three components and a minimum of grade C\+ \(300\) in one/);
  assert.doesNotMatch(JSON.stringify(k) + JSON.stringify(f), /AI Overview|leapscholar|bandladder/i, "no AI summary and no prep site is a source");
});

test("17: while a check runs, Home redraws only the progress line, and the Issues box is not asked again on every poll", () => {
  const h = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8");
  assert.match(h, /return `<div id="ckprog"><p><b>Checking your product now…/);
  const fast = h.indexOf('if (O.checking && $("#ckprog") && $("#ov")?.dataset.pid === pid) { $("#ckprog").outerHTML = checkingHtml(O.progress);'), full = h.indexOf('  $("#ov").innerHTML = `${gscBar}');
  assert.ok(fast > 0 && fast < full, "the progress-only redraw comes BEFORE the full page is drawn");
  assert.match(h, /if \(Date\.now\(\) - was\.at < 60000\)/, "the Issues list is asked again at most once a minute");
  assert.match(h, /if \(on\.outerHTML !== html\) on\.outerHTML = html;/, "an Issues box that did not change is not drawn again");
  const tail = h.slice(full, full + 4000);
  assert.ok(tail.indexOf('dataset.pid = pid; // RR-388') < tail.indexOf("issuesCard(pid); // RR-387 PART D"), "the Issues box is drawn AFTER the page, so the page never wipes it");
});
