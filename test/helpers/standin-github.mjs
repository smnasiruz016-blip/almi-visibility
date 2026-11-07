/**
 * RR-386 · A STAND-IN GITHUB on this computer, for the autopilot's tests and its proof on a copy: a small git model (commits, trees,
 * branches) behind GitHub's documented REST shapes — git refs/commits/trees/blobs, contents, repos, merges, compare, pulls (list, open,
 * merge), check-runs, statuses and deployments (each commit gets a Ready preview, and a Ready production deployment on the live branch).
 * Nothing leaves this computer. Options: checks ("success" | "failure" | "pending"), preview ("success" | "failure"), url (the address a
 * deployment reports), outsideFile (a file outside the pages folder the preview branch also changes).
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";

export const blobSha = (content) => { const b = Buffer.from(String(content), "utf8"); return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest("hex"); };
export async function standinGithub({ repo = "o/r", live = "main", preview = "visibility-pages", files = new Map(), liveFiles = null, checks = "success", previewState = "success", url = "https://example.invalid", outsideFile = null } = {}) {
  const commits = new Map(), refs = new Map(), trees = new Map(), pulls = []; let n = 0;
  const mk = (tree, parents) => { const sha = createHash("sha1").update(`c${++n}${Math.random()}`).digest("hex"); commits.set(sha, { tree: new Map(tree), parents }); trees.set(`t${sha}`, commits.get(sha).tree); return sha; };
  refs.set(live, mk(liveFiles ?? files, [])); refs.set(preview, mk(files, [refs.get(live)]));
  if (outsideFile) { const t = new Map(commits.get(refs.get(preview)).tree); t.set(outsideFile, "changed"); refs.set(preview, mk(t, [refs.get(preview)])); }
  const log = [], st = { merged: [], rolledBack: [], prOpened: 0 };
  const treeOf = (x) => (refs.has(x) ? commits.get(refs.get(x)).tree : commits.has(x) ? commits.get(x).tree : trees.get(x) ?? null);
  const diff = (a, b) => [...new Set([...a.keys(), ...b.keys()])].filter((p) => a.get(p) !== b.get(p));
  const srv = createServer((req, res) => { let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    const send = (s, o) => { res.writeHead(s, { "content-type": "application/json" }); res.end(o === null ? "" : JSON.stringify(o)); }, j = body ? JSON.parse(body) : {}, U = new URL(req.url, "http://x"), p = decodeURIComponent(U.pathname), m = req.method, R = `/repos/${repo}`;
    log.push(`${m} ${p}`);
    if (!p.startsWith(R)) return send(404, { message: "Not Found" });
    const q = p.slice(R.length);
    if (m === "GET" && q === "") return send(200, { default_branch: live, full_name: repo });
    let x;
    if (m === "GET" && (x = /^\/git\/trees\/(.+)$/.exec(q))) { const t = treeOf(x[1]); if (!t) return send(404, { message: "Not Found" }); if (U.searchParams.get("recursive")) return send(200, { truncated: false, tree: [...t.entries()].map(([path, c]) => ({ path, type: "blob", sha: blobSha(c) })) }); const tops = new Map(); for (const k of t.keys()) { const top = k.split("/")[0]; if (k.includes("/")) tops.set(top, "tree"); else tops.set(top, "blob"); } return send(200, { tree: [...tops].map(([path, type]) => ({ path, type, sha: type === "tree" ? `dir:${x[1]}:${path}` : blobSha(t.get(path)) })) }); }
    if (m === "GET" && (x = /^\/git\/blobs\/([0-9a-f]+)$/.exec(q))) { for (const c of commits.values()) for (const v of c.tree.values()) if (blobSha(v) === x[1]) return send(200, { sha: x[1], encoding: "base64", content: Buffer.from(v, "utf8").toString("base64") }); return send(404, { message: "Not Found" }); }
    if (m === "GET" && (x = /^\/git\/ref\/heads\/(.+)$/.exec(q))) return refs.has(x[1]) ? send(200, { object: { sha: refs.get(x[1]) } }) : send(404, { message: "Not Found" });
    if (m === "GET" && (x = /^\/git\/commits\/(.+)$/.exec(q))) return commits.has(x[1]) ? send(200, { sha: x[1], tree: { sha: `t${x[1]}` } }) : send(404, { message: "Not Found" });
    if (m === "POST" && q === "/git/trees") { const base = new Map(trees.get(j.base_tree) ?? []); for (const e of j.tree ?? []) { if (e.type === "tree") { for (const k of [...base.keys()]) if (k.startsWith(`${e.path}/`)) base.delete(k); if (e.sha) { const [, from, dir] = String(e.sha).split(":"); for (const [k, v] of treeOf(from) ?? []) if (k.startsWith(`${dir}/`)) base.set(k, v); } } else if (e.sha === null) base.delete(e.path); else base.set(e.path, e.content); } const id = `t${createHash("sha1").update(`${Math.random()}`).digest("hex")}`; trees.set(id, base); return send(201, { sha: id }); }
    if (m === "POST" && q === "/git/commits") { const t = trees.get(j.tree); if (!t) return send(422, { message: "tree" }); return send(201, { sha: mk(t, j.parents ?? []) }); }
    if (m === "PATCH" && (x = /^\/git\/refs\/heads\/(.+)$/.exec(q))) { const c = commits.get(j.sha); if (!c) return send(422, { message: "no commit" }); if (!j.force && !c.parents.includes(refs.get(x[1]))) return send(422, { message: "Update is not a fast forward" }); refs.set(x[1], j.sha); if (x[1] === live && /Undo/.test(String(c.msg ?? ""))) st.rolledBack.push(j.sha); return send(200, { object: { sha: j.sha } }); }
    if (m === "GET" && (x = /^\/branches\/(.+)$/.exec(q))) return refs.has(x[1]) ? send(200, { name: x[1], commit: { sha: refs.get(x[1]), commit: { tree: { sha: `t${refs.get(x[1])}` } } } }) : send(404, { message: "Branch not found" });
    if (m === "POST" && q === "/merges") { const a = treeOf(j.base), b = treeOf(j.head); if (!a || !b) return send(404, { message: "Not Found" }); const out = new Map(a); let changed = false; for (const [k, v] of b) if (!a.has(k) && !k.startsWith("visibility-pages/")) { out.set(k, v); changed = true; } for (const [k, v] of b) if (a.has(k) && a.get(k) !== v && !k.startsWith("visibility-pages/")) { out.set(k, v); changed = true; } if (!changed) return send(204, null); const sha = mk(out, [refs.get(j.base), refs.get(j.head)]); refs.set(j.base, sha); return send(201, { sha }); }
    if (m === "GET" && (x = /^\/compare\/(.+)\.\.\.(.+)$/.exec(q))) { const a = treeOf(x[1]), b = treeOf(x[2]); const f = diff(a, b).map((filename) => ({ filename, status: !a.has(filename) ? "added" : !b.has(filename) ? "removed" : "modified" })); return send(200, { ahead_by: f.length ? 1 : 0, files: f, commits: f.length ? [{ sha: refs.get(x[2]) }] : [] }); }
    if (m === "GET" && q === "/pulls") return send(200, pulls.filter((pr) => pr.state === "open"));
    if (m === "POST" && q === "/pulls") { const pr = { number: pulls.length + 1, state: "open", head: j.head, base: j.base }; pulls.push(pr); st.prOpened++; return send(201, pr); }
    if (m === "PUT" && (x = /^\/pulls\/(\d+)\/merge$/.exec(q))) { const pr = pulls[Number(x[1]) - 1]; if (!pr || pr.state !== "open") return send(405, { message: "Pull Request is not mergeable" }); const sha = mk(treeOf(pr.head), [refs.get(pr.base), refs.get(pr.head)]); refs.set(pr.base, sha); pr.state = "closed"; st.merged.push({ pr: pr.number, sha }); return send(200, { sha, merged: true }); }
    if (m === "GET" && (x = /^\/commits\/([0-9a-f]+)\/check-runs$/.exec(q))) return send(200, { check_runs: [{ name: "verify", status: checks === "pending" ? "in_progress" : "completed", conclusion: checks === "pending" ? null : checks }] });
    if (m === "GET" && (x = /^\/commits\/([0-9a-f]+)\/status$/.exec(q))) return send(200, { statuses: [] });
    if (m === "GET" && q === "/deployments") { const sha = U.searchParams.get("sha"), env = U.searchParams.get("environment"); if (!commits.has(sha)) return send(200, []); if (env === "Production" && !st.merged.some((mm) => mm.sha === sha) && refs.get(live) !== sha) return send(200, []); return send(200, [{ id: `${env}:${sha}`, environment: env, sha }]); }
    if (m === "GET" && (x = /^\/deployments\/([^/]+)\/statuses$/.exec(q))) { const env = x[1].split(":")[0]; return send(200, [{ state: env === "Preview" ? previewState : "success", environment_url: url }]); }
    if (m === "GET" && (x = /^\/contents\/(.+)$/.exec(q))) { const t = treeOf(U.searchParams.get("ref") ?? preview), v = t?.get(x[1]); return v === undefined ? send(404, { message: "Not Found" }) : send(200, { sha: blobSha(v), content: Buffer.from(v).toString("base64"), encoding: "base64" }); }
    if (m === "PUT" && (x = /^\/contents\/(.+)$/.exec(q))) { const br = j.branch ?? preview, t = new Map(treeOf(br)); t.set(x[1], Buffer.from(j.content, "base64").toString("utf8")); const sha = mk(t, [refs.get(br)]); refs.set(br, sha); return send(200, { content: { path: x[1], sha: blobSha(t.get(x[1])) }, commit: { sha } }); }
    return send(404, { message: "Not Found" });
  }); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { base: `http://127.0.0.1:${srv.address().port}`, refs, commits, treeOf, pulls, log, st, close: () => new Promise((r) => srv.close(r)), filesOf: (branch) => treeOf(branch) };
}
