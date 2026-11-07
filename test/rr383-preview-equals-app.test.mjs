/**
 * RR-383 (owner, 6 Nov 2026: "make the PREVIEW exactly equal to what the app has checked"; beta-g's scan of the AlmiOET preview at 22:40:
 * the app held 131 pages as ready, the branch 311; 180 kept their 01:59 version; every page "index, follow"; "confirm with" on 16 pages;
 * "(Source: X.)" twice on 6). GitHub answers are the documented shapes (git/trees, git/commits, git/refs); nothing leaves this machine.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mirrorPlan, rewriteRefusal, asNoindex, githubFolderPages, mirrorGithub, sitemapNoindexed, realQa, asPublishedGuarded, REAL_QA_MIN, REWRITE_GATES } from "../desktop/publish.mjs";
import { withoutNotes, noteOnPage } from "../desktop/empty-answers.mjs";
import { THIN_MARK } from "../src/page/one-builder.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const res = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => JSON.stringify(o), headers: { get: () => null } });
const qa = (n, { fee = false } = {}) => Array.from({ length: n }, (_, i) => `<details data-need-id="q${i}"><summary>${fee && i === 0 ? "How much does the exam cost?" : `Question ${i}?`}</summary><p>Answer ${i}. <a class="src" href="https://src.example/${i}">Source</a> checked 2026-11-06</p></details>`).join("");
const page = (url, n, extra = "") => `<!doctype html><html><head><title>${url}</title><meta name="robots" content="noindex, nofollow"></head><body><main><h2>Questions and answers</h2>${qa(n)}${extra}<a data-cta>Try free</a><p>Last checked 2026-11-06</p></main></body></html>`;
const target = { kind: "github", repo: "o/r", branch: "visibility-pages", folder: "visibility-pages", site: "https://ex.com" };

test("1 · PUBLISH MIRRORS THE APP: ready+written is kept; a draft that only lacks answers is REWRITTEN (only its checked lines, noindex); a duplicate, a work note, a page-law fault or no draft at all is REMOVED", () => {
  const drafts = [
    { url: "https://ex.com/ready", html: page("r", 8), readyAsDraft: true, gates: [] },
    { url: "https://ex.com/thin", html: page("t", 3), readyAsDraft: false, gates: [{ words: "answers its core questions", pass: false, failing: ["x"] }, { words: "technically ready for search and AI engines", pass: false, failing: [] }] },
    { url: "https://ex.com/dup", html: page("d", 8), readyAsDraft: false, gates: [{ words: "not a duplicate", pass: false, failing: ["same as /ready"] }] },
    { url: "https://ex.com/tech", html: page("x", 8), readyAsDraft: false, gates: [{ words: "technically ready for search and AI engines", pass: false, failing: ["no canonical"] }] },
    { url: "https://ex.com/note", html: page("n", 3, "<p>Confirm with your regulator before booking.</p>"), readyAsDraft: false, gates: [{ words: "answers its core questions", pass: false, failing: ["x"] }] },
    { url: "https://ex.com/law", html: page("l", 3), readyAsDraft: false, gates: [{ words: "answers its core questions", pass: false, failing: ["x"] }] },
  ];
  const held = new Map(["ready", "thin", "dup", "tech", "note", "law", "gone"].map((s) => [s, `visibility-pages/${s}/index.html`]));
  const p = mirrorPlan({ held, drafts, readyUrls: new Set(["https://ex.com/ready"]), noteOf: noteOnPage, faultsOf: (html, url) => (url.endsWith("/law") ? ["the FAQ data asks a question the page does not show"] : []) });
  assert.deepEqual(p.keep, ["visibility-pages/ready/index.html"]);
  /* RR-385: a failing check is no longer a reason to remove (the page goes out noindex); a superseded "Confirm with" sentence is taken out, not a reason */
  assert.deepEqual(p.rewrite.map((x) => x.path), ["visibility-pages/thin/index.html", "visibility-pages/tech/index.html", "visibility-pages/note/index.html"]); assert.ok(p.rewrite.every((x) => x.html.includes(THIN_MARK)), "rewritten pages go out noindex");
  assert.ok(!p.rewrite[2].html.includes("Confirm with"), "the superseded sentence is gone from the rewrite");
  assert.deepEqual(Object.fromEntries(p.remove.map((x) => [x.slug, x.why])), { dup: "a true duplicate (not a duplicate)", law: "the page law: the FAQ data asks a question the page does not show", gone: "the app no longer makes this page" });
  assert.equal(p.keep.length + p.rewrite.length + p.remove.length + p.blocked.length, held.size, "nothing older stays: every page there is kept, rewritten, removed or held back");
  assert.deepEqual(p.broken, []);
  assert.deepEqual([...REWRITE_GATES], ["answers its core questions", "technically ready for search and AI engines"]);
  assert.equal(rewriteRefusal({ url: "u", html: "<main>no button</main>", gates: [] }), "it has no offer button");
});
test("1 · GITHUB: one tree read lists the folder; the rewrites and removals go as ONE commit (a removal is sha:null); counted only when the branch moved", async () => {
  const calls = []; let head = "c0";
  const fetchImpl = async (u, i = {}) => { const p = new URL(u).pathname, m = i.method ?? "GET", body = i.body ? JSON.parse(i.body) : null; calls.push({ m, p, body });
    if (m === "GET" && /\/git\/trees\/visibility-pages$/.test(p)) return res({ truncated: false, tree: [{ path: "visibility-pages/a/index.html", type: "blob" }, { path: "visibility-pages/b/index.html", type: "blob" }, { path: "src/app.tsx", type: "blob" }, { path: "visibility-pages/c", type: "tree" }, { path: "visibility-pages/d/index.html", type: "commit" /* a submodule, not a page file */ }] });
    if (m === "GET" && /\/git\/ref\/heads\//.test(p)) return res({ object: { sha: head } }); if (m === "GET" && /\/git\/commits\//.test(p)) return res({ tree: { sha: "t0" } });
    if (m === "POST" && /\/git\/trees$/.test(p)) return res({ sha: "t1" }, 201); if (m === "POST" && /\/git\/commits$/.test(p)) return res({ sha: "c1" }, 201);
    if (m === "PATCH") { head = body.sha; return res({ object: { sha: body.sha } }); } return res({}, 404); };
  const f = await githubFolderPages({ target, key: "k", fetchImpl }); assert.ok(f.ok); assert.deepEqual([...f.held.entries()], [["a", "visibility-pages/a/index.html"], ["b", "visibility-pages/b/index.html"]]);
  const r = await mirrorGithub({ target, key: "k", fetchImpl, rewrite: [{ url: "https://ex.com/a", path: "visibility-pages/a/index.html", html: asNoindex(page("a", 2)) }], remove: [{ path: "visibility-pages/b/index.html", slug: "b" }] });
  assert.deepEqual([r.ok, r.rewritten, r.removed, r.commit], [true, 1, 1, "c1"]);
  const tree = calls.find((c) => c.m === "POST" && /\/git\/trees$/.test(c.p)).body.tree;
  assert.deepEqual(tree.find((x) => x.path.endsWith("b/index.html")), { path: "visibility-pages/b/index.html", mode: "100644", type: "blob", sha: null });
  assert.match(tree.find((x) => x.path.endsWith("a/index.html")).content, /<meta name="robots" content="noindex,follow">/);
  assert.equal(calls.filter((c) => c.m === "PATCH").length, 1, "one commit");
  assert.deepEqual(await mirrorGithub({ target, key: "k", fetchImpl }), { ok: true, rewritten: 0, removed: 0, commit: null }, "nothing to change, nothing sent");
});
test("2 · NOINDEX REACHES THE PAGE: fewer than 6 real Q&A (the fee question not counted) → the published page itself says noindex,follow; 6 real ones → indexable", () => {
  assert.equal(REAL_QA_MIN, 6);
  const five = page("f", 5).replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="noindex, nofollow">'), six = page("s", 6), sixWithFee = page("x", 0, qa(6, { fee: true }));
  assert.equal(realQa(five), 5); assert.equal(realQa(sixWithFee), 5, "the fee question is not counted");
  assert.match(asPublishedGuarded(five, "https://ex.com/f"), /content="noindex,follow"/); assert.match(asPublishedGuarded(sixWithFee, "https://ex.com/x"), /content="noindex,follow"/);
  assert.doesNotMatch(asPublishedGuarded(six, "https://ex.com/s"), /noindex/);
  const pub = readFileSync(join(REPO, "desktop", "publish.mjs"), "utf8"); assert.equal((pub.match(/asPublishedGuarded\((?:d|draft|f)\.html/g) ?? []).length, 3, "every way a page leaves goes through the guard");
  assert.deepEqual(sitemapNoindexed("<urlset><url><loc>https://ex.com/a</loc></url><url><loc>https://ex.com/b/</loc></url></urlset>", new Set(["https://ex.com/b", "https://ex.com/c"])), ["https://ex.com/b"]);
});
test("3 · the superseded rules leave no words: a 'Confirm with …' sentence and '(Source: X.)' are taken out of answers; a page still holding them is a work note (not published, not rewritten)", () => {
  assert.equal(withoutNotes("Probably not: OET is for 12 professions. Confirm with your regulator or the OET office before booking."), "Probably not: OET is for 12 professions.");
  assert.equal(withoutNotes("The council sends it directly to AHPRA/APC. (Source: Academically.)"), "The council sends it directly to AHPRA/APC.");
  assert.equal(withoutNotes("Applicants must confirm with the council in writing."), "Applicants must confirm with the council in writing.", "a sentence that only CONTAINS the words stays");
  assert.equal(noteOnPage("<main><p>OET is for 12 professions. Confirm with your regulator.</p></main>"), "Confirm with"); assert.match(noteOnPage("<main><p>It is sent. (Source: Academically.)</p></main>"), /\(Source: Academically\.\)/);
});
test("4 + 5 · FAQ = visible Q&A is the page law's (a rewrite is held to it too); the truth check's unopened pages are listed on the Read-these-pages card, with their question", () => {
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"), truth = readFileSync(join(REPO, "desktop", "truth-pass.mjs"), "utf8");
  assert.match(main, /faultsOf: \(html, url\) => pageFaults\(asPublishedPage\(html, url\), \{ url \}\)/);
  assert.match(main, /truthUnread: \(pread\(id, TRUTH_RUN, null\)\?\.unreadLinks \?\? \[\]\)/); assert.match(main, /question: String\(u\.question \?\? ""\)\.slice\(0, 200\)/);
  assert.match(truth, /why: page\?\.why \?\? "it did not open", question: r\.question/);
  assert.match(ui, /id="truthreadcard"/); assert.match(ui, /they stay <b>hidden<\/b>/);
});
test("1 · IN THE APP: every Publish all ready ends with the mirror (also when nothing new is ready); the Pages screen shows kept, rewritten, removed; only the sitemap the site names is read", () => {
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(main, /if \(!stop && !stopped\) \{ BOARD\.step\(key, \{ what: "Making the site equal to the app/); assert.match(main, /RR-383: nothing new is ready, but what the site holds must still equal the app/);
  assert.match(main, /mirror: pread\(id, PUBLISH_MIRROR, null\)/); assert.match(ui, /<b>\$\{M\.rewritten \?\? 0\} rewritten<\/b> with only checked lines and noindex/);
  assert.match(main, /if \(!first\.length\) return null; \/\* RR-373 item 8/);
});
