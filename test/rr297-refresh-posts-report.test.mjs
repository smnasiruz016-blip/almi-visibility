/* RR-297 · auto-refresh, social posts and the monthly client report — on the RR-296 test project (and, read-only, the stored Search Console
 * export as the real-numbers example). Nothing is written, posted or published. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { planNewPages, buildNewPages, gateInput } from "../src/page/one-builder.mjs";
import { refreshPlan, refreshRun } from "../src/page/refresh.mjs";
import { postsForArticle, checkPost, AUTO_POSTING } from "../src/page/social-posts.mjs";
import { monthlyReport, NOT_CONNECTED } from "../src/report/monthly-report.mjs";
import { HERE, ROBOTS, COST, P } from "./support/rr296-proof.mjs";
import { rr297Run, realNumbersReport } from "./support/rr297-proof.mjs";
import { GUIDANCE } from "../config/guidance/guidance-read.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SKIP = HERE ? false : "the stored guides are not on this machine";

test("REFRESH · REAL: the fee changes WB$120 → WB$135 — its page and its article are rebuilt with the new value, source date and card, pass the gates and follow the publish mode; every other page stays byte-identical; BLOCKED, REJECTED and unworded changes only reported", { skip: SKIP }, () => {
  const r = rr297Run();
  assert.deepEqual(r.refresh.rebuilt.map((p) => new URL(p.url).pathname), ["/guides/widgetry-exam-fee", "/articles/2026-10-22-how-many-times-can-i-sit-the-widgetry-licence-exam-in-a-year"]);
  for (const p of r.refresh.rebuilt) {
    assert.equal(p.gates, "PASS");
    assert.equal(p.publish.state, "QUEUED TO PUBLISH (held — no product is attached; nothing goes live)");
    assert.ok(p.html.includes("WB$135") && p.html.includes("2026-10-25") && !p.html.includes("WB$120"), p.url);
  }
  assert.equal(r.refresh.untouched.length, 3);
  for (const u of r.refresh.untouched) assert.equal(u.html, r.pages.find((p) => p.url === u.url).html, `${u.url} changed`);
  assert.deepEqual(r.refresh.notes, [`"WB$120" → "WB$135" (checked 2026-10-25) — rebuilt: ${r.refresh.rebuilt.map((p) => p.url).join(", ")}`]);
  assert.deepEqual(r.refresh.reported.map((x) => [x.claimId, x.state]), [["w-valid-1", "BLOCKED"], ["w-id-1", "REJECTED"], ["w-online-1", "CHANGED"]]);
  /* REVIEW FIRST: the rebuilt pages wait for the client */
  for (const p of rr297Run({ settings: { publishMode: "REVIEW_FIRST" } }).refresh.rebuilt) assert.equal(p.publish.state, "WAITING FOR THE CLIENT'S APPROVAL");
});

test("REFRESH · THE PUBLISH LINE (pure): a rebuilt page that does not pass every gate is NEVER put forward — whatever the publish mode", () => {
  const plan = planNewPages({ needs: P.NEEDS(null).slice(0, 2) });
  const built = buildNewPages({ plan, keyFacts: P.KEY_FACTS, quotationOf: P.quotationOf, design: P.DESIGN, stamp: null, on: "2026-10-20", site: P.SITE });
  const pages = built.map((p) => ({ url: p.url, title: p.title, items: p.items, questions: p.questions, html: p.html, gate: gateInput(p), related: built.filter((x) => x.url !== p.url).map((x) => ({ href: x.url, label: x.title })) }));
  /* no cost entry handed in: gate D cannot judge, so the rebuilt page cannot pass */
  const r = refreshRun({ rechecks: [P.RECHECKS[0]], pages, keyFacts: P.KEY_FACTS, quotationOf: P.quotationOf, design: P.DESIGN, on: "2026-10-25", guidance: GUIDANCE, robotsTxt: ROBOTS });
  assert.equal(r.rebuilt.length, 1);
  assert.match(r.rebuilt[0].gates, /^REFUSED — /);
  assert.deepEqual([r.rebuilt[0].publish.cohort, r.rebuilt[0].publish.state], ["REFUSED", "NOT PUT FORWARD — it did not pass every gate"]);
  /* CONTROL: with the cost entry, the same rebuild passes and is queued */
  const ok = refreshRun({ rechecks: [P.RECHECKS[0]], pages, keyFacts: P.KEY_FACTS, quotationOf: P.quotationOf, design: P.DESIGN, on: "2026-10-25", guidance: GUIDANCE, robotsTxt: ROBOTS, cost: COST });
  assert.equal(ok.rebuilt[0].publish.cohort, "MAY_PUBLISH", ok.rebuilt[0].gates);
  /* a BLOCKED or REJECTED recheck never changes a page */
  const blocked = refreshPlan({ rechecks: P.RECHECKS.slice(1, 3), pages });
  assert.deepEqual([blocked.changes.length, blocked.reported.length], [0, 2]);
});

test("SOCIAL POSTS: 2–3 ready-to-copy posts per article, each with the article's link and one sourced fact; a post that drops a fact's condition or its source, or promises a result, is REFUSED; nothing posts", { skip: SKIP }, () => {
  const r = rr297Run();
  for (const a of r.posts) {
    assert.ok(a.posts.length >= 2 && a.posts.length <= 3, a.url);
    assert.equal(a.refused.length, 0);
    for (const p of a.posts) assert.ok(["Facebook", "LinkedIn"].includes(p.network) && p.text.includes(a.url) && /Source: Widgetry Licensing Board, checked 2026-10-18/.test(p.text), p.text);
  }
  const art = { url: "https://x.example/a", question: "What score?", items: [{ claims: [{ claimId: "k", text: "An overall score of 1400 with no part below 300 is needed.", source: "A board", link: "https://board.example/s", readOn: "2026-10-18" }] }] };
  const c = art.items[0].claims[0];
  const good = postsForArticle(art);
  assert.equal(good.posts.length, 2);
  assert.equal(checkPost({ network: "Facebook", fact: c, said: "An overall score of 1400", text: `An overall score of 1400 is enough. (Source: A board, checked 2026-10-18) ${art.url}` }, art).ok, false, "a dropped condition passed");
  assert.match(checkPost({ network: "Facebook", fact: c, said: "An overall score of 1400", text: `An overall score of 1400 is enough. (Source: A board, checked 2026-10-18) ${art.url}` }, art).why, /no part below 300/);
  assert.match(checkPost({ network: "Facebook", fact: c, text: `${c.text} ${art.url}` }, art).why, /source and checked date/);
  assert.match(checkPost({ network: "LinkedIn", fact: c, text: `${c.text} (Source: A board, checked 2026-10-18) ${art.url} — you will rank first.` }, art).why, /promises/);
  assert.match(AUTO_POSTING, /^DEFERRED — posting is the client's own action/);
  const src = readFileSync(join(REPO, "src/page/social-posts.mjs"), "utf8");
  assert.doesNotMatch(src, /\bfetch\(|node:https?|node:net|token|password|oauth/i, "the posts module can post or holds a credential");
});

test("MONTHLY REPORT · the test project: one phone-readable page, bad news first; made, refreshed, NOT CONNECTED (never zero), next month's real topics", { skip: SKIP }, () => {
  const { report } = rr297Run();
  const heads = report.lines.filter((l) => l.startsWith("## "));
  assert.deepEqual(heads, ["## Needs your attention", "## Made this month", "## Refreshed this month", "## Search (your Search Console)", "## YouTube", "## Planned for next month"] /* RR-301: YouTube joins the report */);
  const t = report.lines.join("\n");
  assert.ok(t.includes(NOT_CONNECTED) && !/\b0 impressions\b/.test(t));
  assert.match(t, /Article \(2026-10-21\): Can I take the Widgetry licence exam online\?/);
  assert.match(t, /"WB\$120" → "WB\$135"/);
  assert.match(t, /Topic: How do I book the Widgetry licence exam\?/);
  assert.match(report.html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.doesNotMatch(t, /\bwill (rank|be cited)\b|guarantee/i);
});

test("MONTHLY REPORT · the real-numbers example: the stored Search Console export, read-only — impressions, clicks, top pages and the queries seen", { skip: SKIP }, () => {
  const t = realNumbersReport().lines.join("\n");
  assert.match(t, /507 impressions, 1 clicks over 112 days \(2026-06-26 to 2026-10-15\)/);
  assert.match(t, /Top page: https:\/\/\S+ — 37 impressions, 0 clicks/);
  assert.match(t, /Query seen: /);
  assert.match(t, /per-query numbers are not in the stored record/);
  assert.equal(monthlyReport({ product: "x", month: "m" }).lines.some((l) => l.includes(NOT_CONNECTED)), true);
});
