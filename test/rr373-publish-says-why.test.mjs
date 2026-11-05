/**
 * 🔴 RR-373 (owner, 5 Nov 2026: "0 of 5 published", twice, no reason, with a new token): the reason is saved and stays on the screen; Test connection writes nothing and says which part fails; GitHub's answers are read
 * rightly; the pages are built once per press; Publish all ready publishes all, one commit per group, can stop, and goes on from there. The token is a stand-in; it never reaches a file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { refusedWhy, publishDraft, publishPagesGithub, testGithubConnection, stopsTheRun, sitemapAddress, NO_COMMIT } from "../desktop/publish.mjs";
import { jobBoard } from "../desktop/jobs.mjs";
import { scrub } from "../desktop/crash-record.mjs";
import { readyLine } from "../desktop/qa-judge.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), read = (f) => readFileSync(join(REPO, f), "utf8");
const GOOD = "stand-in-token-may-write", T = (o = {}) => ({ kind: "github", site: "https://site.example", repo: "o/r", branch: "visibility-pages", folder: "vp", ...o });

/* GitHub as its documents and the real almi-oet answer: a public repository; each token as the owner could have made it */
function github({ tokens = { [GOOD]: "write", expired: "bad", readonly: "read", other: "other", limited: "rate" }, branches = ["visibility-pages"], moveHeadOnce = false, refusePath = null, delay = 0 } = {}) {
  const st = { head: "c0", commits: { c0: { tree: "t0" } }, files: {}, moved: 0, calls: [], commitsMade: 0, refs: [], moveHeadOnce };
  const srv = createServer((req, res) => { let b = ""; req.on("data", (c) => { b += c; }); req.on("end", async () => {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const send = (s, o) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(o)); }, j = b ? JSON.parse(b) : {}, kind = tokens[(req.headers.authorization ?? "").replace(/^Bearer /, "")], m = req.method, u = new URL(req.url, "http://x"), p = u.pathname; st.calls.push({ m, p, auth: req.headers.authorization, accept: req.headers.accept });
    if (kind === "bad" || !kind) return send(401, { message: "Bad credentials" });
    if (kind === "rate") return send(403, { message: "API rate limit exceeded for this token" });
    if (m === "GET") {
      if (p === "/repos/o/r") return send(200, { full_name: "o/r" });
      const br = /^\/repos\/o\/r\/branches\/(.+)$/.exec(p); if (br) return branches.includes(br[1]) ? send(200, { name: br[1], protected: false }) : send(404, { message: "Branch not found" });
      const ref = /^\/repos\/o\/r\/git\/ref\/heads\/(.+)$/.exec(p); if (ref) return branches.includes(ref[1]) ? send(200, { object: { sha: st.head } }) : send(404, { message: "Not Found" });
      const cm = /^\/repos\/o\/r\/git\/commits\/(.+)$/.exec(p); if (cm) return send(200, { tree: { sha: st.commits[cm[1]]?.tree ?? "t0" } });
      const ct = /^\/repos\/o\/r\/contents\/(.+)$/.exec(p); if (ct) return st.files[ct[1]] ? send(200, { sha: st.files[ct[1]].sha }) : send(404, { message: "Not Found" });
      return send(404, { message: "Not Found" });
    }
    if (kind === "read") return send(403, { message: "Resource not accessible by personal access token" });
    if (kind === "other") return send(404, { message: "Not Found" });
    if (m === "POST" && p === "/repos/o/r/git/refs") { if (j.sha === NO_COMMIT) return send(422, { message: "Object does not exist" }); st.refs.push(j.ref); return send(201, { ref: j.ref }); }
    if (m === "PUT") { const f = p.replace("/repos/o/r/contents/", ""); if (refusePath && f.includes(refusePath)) return send(409, { message: "Secret detected in content" }); if (!branches.includes(j.branch)) return send(404, { message: "Branch not found" }); if (st.files[f] && j.sha !== st.files[f].sha) return send(422, { message: "Invalid request. \"sha\" wasn't supplied." }); st.files[f] = { sha: "s" + (st.moved++), content: Buffer.from(j.content, "base64").toString() }; st.commitsMade++; return send(st.files[f].sha === "s0" ? 201 : 200, { content: { sha: st.files[f].sha } }); }
    if (m === "POST" && p === "/repos/o/r/git/trees") { if (refusePath && j.tree.some((x) => x.path.includes(refusePath))) return send(409, { message: "Secret detected in content" }); const t = "t" + (Object.keys(st.commits).length); st.commits["pending:" + t] = { files: j.tree, base: j.base_tree }; return send(201, { sha: t }); }
    if (m === "POST" && p === "/repos/o/r/git/commits") { const c = "c" + (Object.keys(st.commits).length); st.commits[c] = { tree: j.tree, parent: j.parents[0], files: st.commits["pending:" + j.tree].files }; return send(201, { sha: c }); }
    if (m === "PATCH") { const c = st.commits[j.sha]; if (st.moveHeadOnce) { st.moveHeadOnce = false; st.head = "c0-moved"; st.commits["c0-moved"] = { tree: "tm" }; return send(422, { message: "Update is not a fast forward" }); } if (c.parent !== st.head) return send(422, { message: "Update is not a fast forward" }); st.head = j.sha; st.commitsMade++; for (const x of c.files) st.files[x.path] = { sha: "s" + (st.moved++), content: x.content }; return send(200, { object: { sha: j.sha } }); }
    return send(404, { message: "Not Found" });
  }); });
  return { st, listen: () => new Promise((r) => srv.listen(0, "127.0.0.1", () => r("http://127.0.0.1:" + srv.address().port))), close: () => srv.close() };
}
const on = (base, key = GOOD, target = T()) => ({ target, key, testBase: base, allowLocal: true });
const page = (n) => ({ url: "https://site.example/page-" + n, title: "P" + n, html: "<html><head><title>P" + n + "</title></head><body><main>page " + n + "</main></body></html>", readyAsDraft: true });

test("item 4: GitHub's answers, read rightly", () => {
  const g = T();
  assert.match(refusedWhy(g, 401), /not valid or has expired/);
  assert.match(refusedWhy(g, 403), /cannot write files in o\/r/);
  for (const r of [refusedWhy(g, 403, { message: "API rate limit exceeded" }), refusedWhy(g, 403, { message: "You have exceeded a secondary rate limit" }), refusedWhy(g, 429)]) { assert.match(r, /limit/); assert.match(r, /your token is fine/); assert.doesNotMatch(r, /cannot write/); }
  const a = refusedWhy(g, 404, {}, "no-access"); assert.match(a, /no access to write in o\/r/); assert.doesNotMatch(a, /does not exist/);
  assert.match(refusedWhy(g, 409, { message: "Secret detected in content" }), /secret protection/);
  assert.match(refusedWhy(g, 422, { message: "Something else" }), /newest version \(422: Something else\)/);
  for (const [o, s] of [[{ status: 401 }, true], [{ status: 403 }, true], [{ status: 404 }, true], [{ status: 429 }, true], [{ status: 0 }, true], [{ status: 422 }, false], [{ status: 409 }, false], [{ status: 500 }, false]]) assert.equal(stopsTheRun(o), s, JSON.stringify(o));
});

test("one page: 404 while the repository can be read is NO ACCESS, never 'branch missing'; a really missing branch says so; 401 and 403 keep GitHub's own words; ok only when GitHub names the file", async () => {
  const g = github(), base = await g.listen();
  try {
    const d = page(1), other = await publishDraft({ draft: d, ...on(base, "other") }); assert.equal(other.ok, false); assert.equal(other.status, 404); assert.match(other.why, /no access to write/); assert.doesNotMatch(other.why, /branch "visibility-pages" does not exist/);
    const bad = await publishDraft({ draft: d, ...on(base, "expired") }); assert.equal(bad.status, 401); assert.equal(bad.message, "Bad credentials"); assert.ok(!("body" in bad));
    const ro = await publishDraft({ draft: d, ...on(base, "readonly") }); assert.equal(ro.status, 403); assert.equal(ro.message, "Resource not accessible by personal access token"); assert.match(ro.why, /Contents: Read and write/);
    const rate = await publishDraft({ draft: d, ...on(base, "limited") }); assert.equal(rate.rate, true); assert.match(rate.why, /your token is fine/);
    const none = await publishDraft({ draft: d, ...on(base, GOOD, T({ branch: "gone" })) }); assert.equal(none.status, 404); assert.match(none.why, /The branch "gone" does not exist/);
    const ok = await publishDraft({ draft: d, ...on(base) }); assert.equal(ok.ok, true); assert.equal(ok.remote.path, "vp/page-1/index.html");
    const empty = await publishDraft({ draft: d, target: T(), key: "K", testBase: "http://127.0.0.1:9", allowLocal: true, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }) }); assert.equal(empty.ok, false, "2xx with no file named is not published"); assert.match(empty.why, /without confirming/);
    const noBearer = g.st.calls.filter((c) => !c.auth.startsWith("Bearer ")); assert.equal(noBearer.length, 0); assert.equal(g.st.calls.at(-1).accept, "application/vnd.github+json");
  } finally { g.close(); }
});

test("item 4: 409 or 422 is tried once more with the newest sha; a page already there is updated", async () => {
  const g = github(), base = await g.listen();
  try {
    assert.equal((await publishDraft({ draft: page(1), ...on(base) })).ok, true);
    const again = await publishDraft({ draft: { ...page(1), html: page(1).html.replace("page 1", "page one") }, ...on(base) }); assert.equal(again.ok, true, JSON.stringify(again)); assert.match(g.st.files["vp/page-1/index.html"].content, /page one/);
    let puts = 0; const twice = await publishDraft({ draft: page(2), target: T(), key: "K", testBase: "http://127.0.0.1:9", allowLocal: true, fetchImpl: async (u, i) => { if (i.method === "GET") return { ok: true, status: 200, json: async () => ({ sha: "fresh" }) }; puts++; return puts === 1 ? { ok: false, status: 409, headers: new Headers(), json: async () => ({ message: "does not match" }) } : { ok: true, status: 200, json: async () => { assert.equal(JSON.parse(i.body).sha, "fresh"); return { content: { sha: "n" } }; } }; } }); assert.equal(twice.ok, true); assert.equal(puts, 2);
  } finally { g.close(); }
});

test("a key with a hidden character is said, not called 'your site did not answer'", async () => {
  const g = github(), base = await g.listen();
  try { const r = await publishDraft({ draft: page(1), ...on(base, "stand-in\u200Btoken") }); assert.equal(r.ok, false); assert.match(r.why, /hidden character/); const t = await testGithubConnection(on(base, "stand-in\u200Btoken")); assert.match(t.line, /hidden character/); assert.equal(g.st.calls.length, 0); } finally { g.close(); }
});

test("many pages are ONE commit; counted only when the branch moved; someone else moving the branch is tried once from the newest; a refusal keeps status and words", async () => {
  const g = github(), base = await g.listen();
  try {
    const r = await publishPagesGithub({ drafts: [page(1), page(2), page(3)], ...on(base) }); assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(g.st.commitsMade, 1); assert.equal(r.pages.length, 3); assert.deepEqual(Object.keys(g.st.files).sort(), ["vp/page-1/index.html", "vp/page-2/index.html", "vp/page-3/index.html"]); assert.equal(r.pages[0].preview.path, "vp/page-1/index.html"); assert.equal(r.pages[0].live, null);
    g.st.moveHeadOnce = true; const m = await publishPagesGithub({ drafts: [page(4)], ...on(base) }); assert.equal(m.ok, true, JSON.stringify(m)); assert.equal(g.st.commits[m.commit].parent, "c0-moved");
    for (const [k, s, w] of [["expired", 401, /expired/], ["readonly", 403, /cannot write/], ["other", 404, /no access to write/]]) { const x = await publishPagesGithub({ drafts: [page(9)], ...on(base, k) }); assert.equal(x.ok, false); assert.equal(x.status, s); assert.match(x.why, w); assert.equal(stopsTheRun(x), true); assert.ok(x.message); assert.equal(x.paths[0].path, "vp/page-9/index.html"); }
    const lie = await publishPagesGithub({ drafts: [page(1)], target: T(), key: "K", testBase: "http://127.0.0.1:9", allowLocal: true, fetchImpl: async (u, i) => ({ ok: true, status: 200, json: async () => (i.method === "PATCH" ? { object: { sha: "other" } } : /commits$/.test(u) ? { sha: "new" } : /trees$/.test(u) ? { sha: "t" } : /ref\/heads/.test(u) ? { object: { sha: "h" } } : { tree: { sha: "t" } }) }) }); assert.equal(lie.ok, false, "the branch did not move to the commit: nothing counted"); assert.match(lie.why, /Nothing is counted/);
  } finally { g.close(); }
});

test("item 3: Test connection says which part fails, and writes nothing", async () => {
  const g = github(), base = await g.listen();
  try {
    const row = (t, c) => t.rows.find((x) => x.check === c);
    const good = await testGithubConnection(on(base)); assert.equal(good.ok, true); assert.deepEqual(good.rows.map((x) => [x.check, x.ok]), [["token", true], ["repository", true], ["branch", true], ["write", true]]); assert.match(good.line, /Nothing was written/);
    assert.deepEqual(g.st.refs, [], "no branch made"); assert.equal(g.st.commitsMade, 0); assert.deepEqual(g.st.files, {});
    const check = g.st.calls.filter((c) => c.m !== "GET"); assert.equal(check.length, 1); assert.equal(check[0].p, "/repos/o/r/git/refs");
    const none = await testGithubConnection(on(base, null)); assert.equal(none.ok, false); assert.match(none.line, /No token is saved/);
    const bad = await testGithubConnection(on(base, "expired")); assert.equal(row(bad, "token").ok, false); assert.equal(row(bad, "token").status, 401); assert.match(bad.line, /wrong or has expired/);
    const ro = await testGithubConnection(on(base, "readonly")); assert.equal(row(ro, "branch").ok, true); assert.equal(row(ro, "write").ok, false); assert.equal(row(ro, "write").status, 403); assert.match(ro.line, /may read o\/r but not write/); assert.match(ro.line, /Contents: Read and write/);
    const other = await testGithubConnection(on(base, "other")); assert.equal(row(other, "write").status, 404); assert.match(other.line, /may read o\/r but not write/); assert.doesNotMatch(other.line, /does not exist/);
    const rate = await testGithubConnection(on(base, "limited")); assert.match(rate.line, /limit/); assert.match(rate.line, /not the problem/);
    const br = await testGithubConnection(on(base, GOOD, T({ branch: "gone" }))); assert.equal(row(br, "branch").ok, false); assert.match(br.line, /The branch "gone" does not exist/); assert.equal(row(br, "write"), undefined);
    assert.deepEqual(g.st.refs, []);
  } finally { g.close(); }
});

test("item 8: the sitemap the site names itself; a fine-grained token never reaches a record", () => {
  assert.equal(sitemapAddress("https://almioet.almiworld.com", "User-Agent: *\nAllow: /\n\nSitemap: https://almioet.almiworld.com/sitemap-index.xml\n"), "https://almioet.almiworld.com/sitemap-index.xml");
  assert.equal(sitemapAddress("https://a.example", "Sitemap: https://other.example/s.xml"), "https://a.example/sitemap.xml"); assert.equal(sitemapAddress("https://a.example", null), "https://a.example/sitemap.xml");
  const pat = ["github", "pat", "11AAAAAAA0abcdefgh_abcdefgh"].join("_"); assert.doesNotMatch(scrub("token " + pat), /abcdefgh/);
  const m = read("desktop/main.mjs"); assert.doesNotMatch(m, /\$\{(?:site\.)?origin\}\/sitemap\.xml/, "the app assumes no address");
});

test("item 7: the job line stops saying the run is checking once the AI has refused", () => {
  const b = jobBoard({ now: () => 1000 }), why = "Your AI refused the key: paste a new one.", drafts = [{ readyAsDraft: false, gates: [{ pass: false, failing: ["still being checked by your AI"] }] }];
  b.start("make:x", { label: "Making" }); b.finish("make:x", { ok: true, line: readyLine(drafts, { judging: true }) }); assert.match(b.list()[0].line, /This run is doing that now/);
  b.amend("make:x", (l) => l.replace("This run is doing that now.", why)); assert.doesNotMatch(b.list()[0].line, /doing that now/); assert.match(b.list()[0].line, /refused the key/);
  b.amend("nothing", (l) => l);
  assert.match(read("desktop/main.mjs"), /if \(why\) BOARD\.amend\(.make:\$\{id\}., \(l\) => l\.replace\("This run is doing that now\.", why\)\)/);
});

test("the screen: the reason stays until closed; the button goes on in the background and shows a Stop; Test connection beside Save; no redraw wipes it", () => {
  const u = read("desktop/ui.html");
  assert.doesNotMatch(u, /setTimeout\(\(\) => pagesBox\(waitingOnly\), 1800\)/); assert.match(u, /id="pubwhy"/); assert.match(u, /id="pubwhyok">Close</); assert.match(u, /publish\/last\/close/);
  assert.match(u, /what: "publish", approved: true, background: true \}\); if \(r\.open/); assert.match(u, /data-jobstop=/); assert.match(u, /publish\/stop/); assert.match(u, /id="tgtest"/); assert.match(u, /publish\/test/); assert.match(u, /PAGES_JOB = \/\^\(\?:make\|improve\|publish\)\$\//); assert.match(u, /nReady = X\.waiting/);
  const m = read("desktop/main.mjs"), all = m.slice(m.indexOf("async function publishAll("), m.indexOf("async function publishOne(")); assert.equal(all.split("readyToPublish(id)").length, 2, "the pages are built once per press"); assert.match(all, /publishOne\(id, d\.url, built\)/); assert.equal(m.split("const again = seoPages(").length, 2 + (m.slice(0, m.indexOf("function readyToPublish(")).split("const again = seoPages(").length - 1), "publishOne does not build");
  assert.doesNotMatch(m, /\.slice\(0, BATCH\) \/\* G19: a small batch at a time \*\/, pubKey/, "Publish all ready is no batch of five");
});

const RICH_QA = [
  ["How long does fixture exam practice online take for nurses?", "Fixture exam practice online for nurses takes about 4 weeks for most nurses, with 30 minutes of fixture exam practice online each day and one full practice test every week."],
  ["What does fixture exam practice online for nurses cover?", "Fixture exam practice online for nurses covers all 4 parts of the fixture exam, with 120 practice tasks in total, written for nurses who want online practice before the exam day."],
  ["Is fixture exam practice online for nurses marked?", "Every fixture exam practice online task for nurses is marked at once, and each marked answer shows what to change, so nurses see their progress in the fixture exam practice online."],
  ["How do speaking test role plays work for nurses?", "Speaking test role plays for nurses last 20 minutes in total, with 2 speaking test role plays for nurses, each with a card, a patient and a clear task to finish in the speaking test."],
  ["How often should nurses practise speaking test role plays?", "Nurses practise speaking test role plays 2 times a day in the course, and each of the speaking test role plays gets feedback on its language and its clinical communication in the speaking test."],
  ["What do speaking test role plays for nurses check?", "Speaking test role plays for nurses check 5 language skills and 4 clinical communication skills, so nurses in the speaking test role plays show how they speak with a patient."],
  ["Can nurses take fixture exam practice online on a phone?", "Fixture exam practice online for nurses works on a phone, a tablet or a computer, so nurses can take fixture exam practice online on a break at work or at home."],
  ["Who writes the speaking test role plays for nurses?", "Teachers who trained nurses write every one of the speaking test role plays for nurses, and each of the speaking test role plays follows a real clinical setting."],
];
function clientSite() {
  const st = { key: null, published: new Set(), indexnow: [], google: [] }; let base = "";
  const page = (t, b) => `<!doctype html><html lang="en"><head><title>${t}</title><style>body{font-family:Georgia,serif;color:#222}</style></head><body><header><nav><a href="/">Home</a> <a href="/pricing">Pricing</a> <a href="/course">Course</a></nav></header><main>${b}${RICH_QA.filter((_, i) => (t === "Fixture Prep" ? [0, 3] : t === "Course" ? [1, 2, 4, 5, 6, 7] : []).includes(i)).map(([q, a]) => `<h2>${q}</h2><p>${a}</p>`).join("")}</main><footer>F</footer></body></html>`;
  const srv = createServer((q, r) => { let body = ""; q.on("data", (c) => (body += c)); q.on("end", () => {
    const h = (s, type = "text/html", code = 200) => { r.writeHead(code, { "content-type": type }); r.end(s); };
    const u = new URL(q.url, "http://x");
    if (u.pathname === "/robots.txt") return h("User-agent: *\nAllow: /\n", "text/plain");
    if (u.pathname === "/sitemap.xml") return h(`<?xml version="1.0"?><urlset>${["/", "/pricing", "/course", ...[...st.published].map((s) => `/${s}/`)].map((p) => `<url><loc>${base}${p}</loc></url>`).join("")}</urlset>`, "application/xml");
    if (u.pathname === "/") return h(page("Fixture Prep", "<h1>Practise the Fixture exam</h1><p>Fixture exam practice online covers all 4 parts of the test for nurses, with 120 tasks in total.</p><p>The speaking test role plays last 20 minutes, with 2 role plays for nurses.</p>"));
    if (u.pathname === "/pricing") return h(page("Pricing", "<h1>Pricing</h1><p>Fixture exam practice online costs $12/month for nurses after a free week.</p>"));
    if (u.pathname === "/course") return h(page("Course", "<h1>Course</h1><p>Fixture exam practice online takes about 4 weeks for most nurses before the test.</p><p>Speaking test role plays are practised 2 times a day by nurses in the course.</p>"));
    if (st.key && u.pathname === `/${st.key}.txt`) return h(st.key, "text/plain");
    if (u.pathname === "/wp-json/wp/v2/pages" && q.method === "POST") { const j = JSON.parse(body); st.published.add(j.slug); return h(JSON.stringify({ id: 7, link: `${base}/${j.slug}/` }), "application/json", 201); }
    if (u.pathname.startsWith("/wp-json/")) return h(JSON.stringify({ id: 7, link: base }), "application/json");
    if (u.pathname === "/indexnow" && q.method === "POST") { st.indexnow.push(JSON.parse(body)); return h("", "text/plain", 200); }
    if (u.pathname === "/token") return h(JSON.stringify({ access_token: "fake-access", expires_in: 3600, refresh_token: "fake-refresh-rr310", scope: "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/webmasters" }), "application/json");
    if (u.pathname.startsWith("/gapi/")) { st.google.push({ method: q.method, path: decodeURIComponent(u.pathname) }); if (/searchAnalytics/.test(u.pathname)) return h(JSON.stringify({ rows: [{ keys: ["fixture exam practice online for nurses"], clicks: 3, impressions: 40 }, { keys: ["speaking test role plays nurses"], clicks: 1, impressions: 20 }] }), "application/json"); return h("{}", "application/json"); }
    const slug = u.pathname.replace(/^\/|\/$/g, ""); if (st.published.has(slug)) return h(page(slug, "<h1>Published</h1>"));
    h("", "text/plain", 404); }); });
  return { st, listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}
async function app(extra = {}, dir = mkdtempSync(join(tmpdir(), "rr373-app-"))) {
  if (!existsSync(join(dir, "config.json"))) {
    const kp = generateKeyPairSync("ed25519");
    writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
    const { makeOwnerLicence } = await import("../services/licence/service.mjs");
    writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, keysDir: dir, downloadsDir: join(dir, "downloads"), weeklyFirstMs: 2147483647, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", ...extra }));
  } else { const c = JSON.parse(readFileSync(join(dir, "config.json"), "utf8")); writeFileSync(join(dir, "config.json"), JSON.stringify({ ...c, ...extra })); rmSync(join(dir, "run.json"), { force: true }); }
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|APP_PASSWORD/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  const raw = (path) => fetch(`${url}${path}`);
  return { url, dir, post, get, raw, stop: () => p.kill(), close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}
const settle = async (a, id) => { let o; for (let i = 0; i < 300; i++) { o = await a.get(`/api/products/${id}/overview`); if (!o.checking && o.card && o.plan) return o; await new Promise((r) => setTimeout(r, 200)); } return o; };

const waitFor = async (f, ms = 60000) => { const t0 = Date.now(); for (;;) { const v = await f(); if (v) return v; if (Date.now() - t0 > ms) throw new Error("waited too long"); await new Promise((r) => setTimeout(r, 40)); } };
test("IN THE APP: a refused token saves the reason, stops at once, shows it until closed; a new token: Test connection, all the pages, one commit per group, Stop, and on from there; no token in any file", async () => {
  const s = clientSite(), base = await s.listen(), g = github({ delay: 60 }), ghBase = await g.listen(), a = await app({ testPublishBase: ghBase, testPublishGroup: 1, indexNowEndpoint: base + "/indexnow", googleTestEndpoints: { auth: base + "/auth", token: base + "/token", api: base + "/gapi/" } });
  try {
    const id = (await a.post("/api/products", { name: "Fixture Prep", site: base, goal: { grow: "website", hasWebsite: true } })).product.id; await settle(a, id);
    assert.equal((await a.post("/api/products/" + id + "/setup", { id: "product", value: { name: "Fixture Prep", site: base, what: "Fixture exam practice online.", ctaLabel: "Try the fixture free", ctaHref: base + "/signup" } })).http, 200);
    assert.equal((await a.post("/api/google/client", { clientId: "rr373.apps.googleusercontent.com", secret: "fake-client-secret" })).http, 200);
    const st = await a.post("/api/products/" + id + "/google/start", { submit: true }); await a.raw("/oauth/google?code=one-time&state=" + new URL(st.url).searchParams.get("state")); assert.equal((await a.post("/api/products/" + id + "/google/site", { site: base + "/" })).http, 200);
    await a.post("/api/products/" + id + "/plan", {}); assert.match((await a.post("/api/products/" + id + "/do", { what: "create-pages" })).line, /[1-9]d* drafts? made/);
    const P = "/api/products/" + id, target = { kind: "github", repo: "o/r", branch: "visibility-pages", folder: "vp", site: base }, X0 = await a.get(P + "/publish");
    const hidden = await a.post(P + "/publish/connect", { ...target, key: "stand-in\u200Bhidden" }); assert.equal(hidden.http, 400); assert.match(hidden.refused, /hidden character/);
    assert.match((await a.post(P + "/publish/connect", { ...target, key: "expired" })).refused ?? "", /look like a key/, "too short for a key");
    /* the old token: GitHub refuses it */
    g.st; const oldKey = "expired-token-stand-in"; const c0 = await a.post(P + "/publish/connect", { ...target, key: oldKey }); assert.match(c0.line, /The new key is saved\. Press Test connection/);
    assert.equal(X0.waiting >= 2, true, JSON.stringify(X0.drafts.map((d) => [d.url.slice(-20), d.readyAsDraft, d.improve])) + JSON.stringify(await a.get(P + "/pages-view")).slice(0, 900)); const N = X0.waiting;
    const t0 = await a.post(P + "/publish/test", {}); assert.equal(t0.ok, false); assert.equal(t0.rows[0].status, 401);
    const before = g.st.calls.length, no = await a.post(P + "/do", { what: "publish", approved: true }); assert.equal(no.ok, false); assert.equal(no.written, 0); assert.match(no.line, new RegExp("^0 of " + N)); assert.match(no.line, /not valid or has expired/); assert.match(no.line, /401: "Bad credentials"/);
    assert.equal(g.st.calls.length - before, 1, "stopped at the first answer, not once per page");
    const J = (await a.get("/api/jobs")).jobs.find((j) => j.kind === "publish"); assert.equal(J.ok, false); assert.match(J.line, /expired/);
    let X = await a.get(P + "/publish"); assert.match(X.lastPublish.line, /401/); assert.equal(X.lastPublish.status, 401);
    X = await a.get(P + "/publish"); assert.ok(X.lastPublish, "still there: nothing wipes it"); await a.post(P + "/publish/last/close", {}); assert.equal((await a.get(P + "/publish")).lastPublish, null);
    const log = JSON.parse(readFileSync(join(a.dir, "products", id, "publish-log.json"), "utf8")), row = log.find((x) => x.status === 401 && x.url); assert.equal(row.message, "Bad credentials"); assert.equal(row.ok, false); assert.match(row.path, /^vp\/.+\/index\.html$/);
    /* the new token; the saved one replaced (GitHub would not take the old) */
    const c1 = await a.post(P + "/publish/connect", { ...target, key: GOOD }); assert.match(c1.line, /The new key is saved/); const c2 = await a.post(P + "/publish/connect", { ...target, key: "" }); assert.match(c2.line, /The saved key was kept/);
    assert.equal((await a.post(P + "/publish/test", {})).ok, true); assert.equal(g.st.commitsMade, 0, "the test wrote nothing");
    /* Stop after the first: what is written stays, and the next press goes on */
    const started = await a.post(P + "/do", { what: "publish", approved: true, background: true }); assert.equal(started.started, true);
    const treesBefore = g.st.calls.filter((c) => c.p.endsWith("/git/trees")).length; await waitFor(async () => g.st.calls.filter((c) => c.p.endsWith("/git/trees")).length > treesBefore); const live = (await a.get("/api/jobs")).jobs.find((j) => j.kind === "publish"); assert.equal(live.running, true); assert.equal(live.stoppable, true); assert.equal(live.of, N); assert.equal(live.done, 0, "the count moves when pages are written");
    await a.post(P + "/publish/stop", {}); const end = await waitFor(async () => { const j = (await a.get("/api/jobs")).jobs.find((x) => x.kind === "publish"); return j && !j.running ? j : null; });
    const firstPart = g.st.commitsMade; assert.ok(firstPart < N, "stopped before the end: " + firstPart + " of " + N); assert.equal(end.ok, false); assert.match(end.line, /Stopped by you/);
    X = await a.get(P + "/publish"); assert.equal(X.waiting, N - firstPart, "the button counts what is left"); assert.equal(X.lastPublish.stopped, true);
    const rest = await a.post(P + "/do", { what: "publish", approved: true }); assert.equal(rest.ok, true, JSON.stringify(rest)); assert.equal(rest.written, N - firstPart); assert.match(rest.line, /written to the preview \(branch visibility-pages\)\. Not live\./);
    assert.equal(g.st.commitsMade, N, "one commit per group of one here; no page sent twice"); assert.equal(Object.keys(g.st.files).length, N);
    X = await a.get(P + "/publish"); assert.equal(X.waiting, 0); assert.equal(X.lastPublish, null, "good: no red line"); assert.equal(X.records.filter((r) => r.state === "PREVIEW").length, N);
    const nothing = await a.post(P + "/do", { what: "publish", approved: true }); assert.match(nothing.line, /Nothing new to publish/); assert.equal(g.st.commitsMade, N);
    const folder = join(a.dir, "products", id), all = readdirSync(folder).map((f) => { try { return readFileSync(join(folder, f), "utf8"); } catch { return ""; } }).join("\n") + (existsSync(join(a.dir, "crash", "app.log")) ? readFileSync(join(a.dir, "crash", "app.log"), "utf8") : ""); for (const k of [GOOD, oldKey]) assert.ok(!all.includes(k), "the token reached a file");
  } finally { a.close(); g.close(); await s.close?.(); }
});
