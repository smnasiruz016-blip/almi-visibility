/**
 * RR-384 (owner's 1.15.40, 6 Nov 23:35: 0 new pages, so no "Publish all ready", so the RR-383 mirror never ran and the preview kept ~180 older
 * pages): the button is there whenever the site differs from the app, it lists the pages to remove and asks Start, and a second press changes
 * nothing. GitHub answers are the documented git/trees, git/commits, git/refs shapes; nothing leaves this machine. The same run on a copy of the
 * owner's real state is Desktop\oet test\RR-379 proof\proof-rr384-mirror.mjs (0 new, 162 rewritten, 18 removed, 5 refreshed, then nothing).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gitBlobSha, mirrorContent, notYetEqual, mirrorPlan, githubFolderPages, mirrorGithub, asNoindex, unsafeIndexable, githubBlobText } from "../desktop/publish.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const res = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => JSON.stringify(o), headers: { get: () => null } });
const qa = (n) => Array.from({ length: n }, (_, i) => `<details data-need-id="q${i}"><summary>Question ${i}?</summary><p>Answer ${i}. <a class="src" href="https://s.example/${i}">S</a> checked 2026-11-06</p></details>`).join("");
const page = (n) => `<!doctype html><html><head><title>t</title><meta name="robots" content="noindex, nofollow"></head><body><main><h2>Questions and answers</h2>${qa(n)}<a data-cta>Go</a><p>Last checked 2026-11-06</p></main></body></html>`;
const target = { kind: "github", repo: "o/r", branch: "visibility-pages", folder: "vp", site: "https://ex.com" };

test("Git's own name for a file: sha1 of 'blob <bytes>\\0<content>' (the known hash of \"hello\\n\"), so 'already equal' is GitHub's own word", () => {
  assert.equal(gitBlobSha("hello\n"), "ce013625030ba8dba906f756967f9e9ca394464a");
  assert.equal(gitBlobSha("é"), gitBlobSha(Buffer.from("é", "utf8").toString()), "bytes, not characters");
  const x = { url: "https://ex.com/a", path: "vp/a/index.html", html: asNoindex(page(2)) };
  assert.deepEqual(notYetEqual([x], new Map([["vp/a/index.html", gitBlobSha(mirrorContent(x))]])), [], "a file already equal is not written again");
  assert.equal(notYetEqual([x], new Map([["vp/a/index.html", "different"]])).length, 1);
});
test("THE BUTTON'S WORK, TWICE: the first press rewrites, refreshes and removes in ONE commit; the second finds the site equal and sends nothing", async () => {
  const branch = new Map([["vp/ready/index.html", page(5).replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow">')], ["vp/ok/index.html", page(8).replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow"><!-- written by an earlier rebuild -->')], ["vp/thin/index.html", "<old 01:59 version>"], ["vp/dup/index.html", "<old>"]]);
  let head = "c0", n = 0; const pending = {}, commits = {}; let patches = 0;
  const fetchImpl = async (u, i = {}) => { const p = new URL(u).pathname, m = i.method ?? "GET", b = i.body ? JSON.parse(i.body) : null;
    if (m === "GET" && /\/git\/trees\/visibility-pages$/.test(p)) return res({ truncated: false, tree: [...branch.entries()].map(([path, c]) => ({ path, type: "blob", sha: gitBlobSha(c) })) });
    if (m === "GET" && /\/git\/blobs\//.test(p)) { const sha = p.split("/").pop(), hit = [...branch.values()].find((c) => gitBlobSha(c) === sha); return hit == null ? res({}, 404) : res({ sha, encoding: "base64", content: Buffer.from(hit).toString("base64") }); }
    if (m === "GET" && /\/git\/ref\/heads\//.test(p)) return res({ object: { sha: head } }); if (m === "GET" && /\/git\/commits\//.test(p)) return res({ tree: { sha: "t" } });
    if (m === "POST" && /\/git\/trees$/.test(p)) { const t = `t${++n}`; pending[t] = b.tree; return res({ sha: t }, 201); }
    if (m === "POST" && /\/git\/commits$/.test(p)) { const c = `c${++n}`; commits[c] = { parent: b.parents[0], tree: pending[b.tree] }; return res({ sha: c }, 201); }
    if (m === "PATCH") { const c = commits[b.sha]; if (c.parent !== head) return res({ message: "not a fast forward" }, 422); for (const x of c.tree) { if (x.sha === null) branch.delete(x.path); else branch.set(x.path, x.content); } head = b.sha; patches++; return res({ object: { sha: b.sha } }); }
    return res({}, 404); };
  const drafts = [{ url: "https://ex.com/ready", html: page(5), readyAsDraft: true, gates: [] }, { url: "https://ex.com/ok", html: page(8), readyAsDraft: true, gates: [] }, { url: "https://ex.com/thin", html: page(2), readyAsDraft: false, gates: [{ words: "answers its core questions", pass: false, failing: ["x"] }] }, { url: "https://ex.com/dup", html: page(8), readyAsDraft: false, gates: [{ words: "not a duplicate", pass: false, failing: ["x"] }] }];
  const press = async () => { const f = await githubFolderPages({ target, key: "k", fetchImpl }), plan = mirrorPlan({ held: f.held, drafts, readyUrls: new Set(["https://ex.com/ready", "https://ex.com/ok"]) }), rewrite = notYetEqual(plan.rewrite, f.shas), refresh = [];
    for (const x of notYetEqual(plan.keepItems ?? [], f.shas)) { const text = await githubBlobText({ target, key: "k", sha: f.shas.get(x.path), fetchImpl }); if (text && unsafeIndexable(text)) refresh.push(x); } /* as main.mjs mirrorTarget */
    const r = await mirrorGithub({ target, key: "k", fetchImpl, rewrite: [...rewrite, ...refresh], remove: plan.remove }); return { rewrite: rewrite.length, refresh: refresh.length, remove: plan.remove.length, commit: r.commit }; };
  assert.deepEqual(await press(), { rewrite: 1, refresh: 1, remove: 1, commit: "c2" }); assert.equal(patches, 1, "one commit");
  assert.match(branch.get("vp/ready/index.html"), /content="noindex,follow"/, "a ready page with 5 real answers, written before the guard, is refreshed as noindex"); assert.match(branch.get("vp/thin/index.html"), /content="noindex,follow"/); assert.equal(branch.has("vp/dup/index.html"), false);
  assert.match(branch.get("vp/ok/index.html"), /written by an earlier rebuild/, "a ready page that is safe as it stands is never rewritten from the saved draft (no flip-flop with the publish's own rebuild)");
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"); assert.match(main, /if \(text && \(unsafeIndexable\(text\) \|\| wrongIndexState\(text, x\) \|\| oldestLastChecked\(text\) !== text\)\) refresh\.push\(x\);/, "the app uses the same rule (RR-385: and a file in the wrong index state; RR-386: and a \"Last checked\" newer than its oldest fact)");
  const second = await press(); assert.deepEqual([second.rewrite, second.refresh], [0, 0]); assert.equal(patches, 1, "the second press sends nothing");
});
test("IN THE APP: the box asks the site even with 0 new pages; the button names what changes; the removals are listed and Start is asked; the server refuses without Start", () => {
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"), main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");
  assert.match(ui, /<div id="mirrorbox"><\/div>`;\n  topicPlansCard\(\); pageList\(\); mirrorBox\(\);/, "drawn on every Pages screen, not only when new pages wait");
  assert.match(ui, /Make my site equal the app \(\$\{M\.rewrite\} to rewrite as noindex, \$\{M\.remove\} to remove/); assert.match(ui, /will be removed from your site:/); assert.match(ui, /<b>Start\?<\/b>/); assert.match(ui, /\{ start: true \}/);
  assert.match(main, /publish\\\/mirror\|draft\\\/edit\)\$\//); assert.match(main, /if \(json\(\)\.start !== true\) return send\(400, \{ refused: "Say Start first/);
  assert.match(main, /await mirrorTarget\(id, conn, \{ dry: true \}\)/); assert.match(main, /const rewrite = notYetEqual\(plan\.rewrite, f\.shas\)/, "the app skips what is already equal"); assert.match(main, /Your site already equals the app — nothing was changed\./);
});
