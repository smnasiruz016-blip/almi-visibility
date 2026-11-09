/**
 * 🔴 RR-386 §2.2 step 6 · GO LIVE BY ITSELF (GitHub + Vercel), only in Autopilot. The app opens and merges its OWN pull request from the
 * preview branch (visibility-pages) into the site's production branch, and only when:
 *   1. the branch is brought up to date with production first (the preview then runs the site's current code: notes item 4);
 *   2. the pull request changes files under the pages folder ONLY — any other file → stop and hold, said;
 *   3. the preview deployment is Ready and every check on the head is finished and green;
 *   4. the scan (desktop/site-scan.mjs) passes on the preview (read through Vercel's protection with the client's bypass secret, or —
 *      without it — on the branch's own files, said so);
 * then merges, waits for the production deployment to be Ready and scans the live site. A SERIOUS live failure (an app page that answers
 * 404, the home page noindex) is rolled back by itself: a commit on production that puts the pages folder back as it was before the merge
 * (only that folder; the way back is written down BEFORE the merge, in go-live.json). Everything else waits for the next cycle.
 * GitHub's documented REST shapes only; the token is handed in and never written anywhere.
 */
const API = "https://api.github.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function githubApi({ key, testBase = null, fetchImpl = fetch }) {
  const base = testBase ?? API;
  const call = async (method, path, body) => {
    const r = await fetchImpl(`${base}${path}`, { method, headers: { authorization: `Bearer ${key}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "AlmiVisibility", ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
    const j = r.status === 204 ? null : await r.json().catch(() => null);
    return { status: r.status, ok: r.ok, j, why: r.ok ? null : `GitHub answered ${r.status}${j?.message ? `: ${String(j.message).slice(0, 160)}` : ""}` };
  };
  return { get: (p) => call("GET", p), post: (p, b) => call("POST", p, b), put: (p, b) => call("PUT", p, b), patch: (p, b) => call("PATCH", p, b) };
}

/** the files a compare lists → those outside the pages folder (any one stops the go-live) */
export const outsideFolder = (files, folder) => (files ?? []).map((f) => f.filename ?? f).filter((n) => !String(n).startsWith(`${String(folder).replace(/\/+$/, "")}/`));

/** every check on a commit: finished and green? → { done, ok, pending: [names], failed: [names] } */
export async function checksOf(gh, repo, sha) {
  const [runs, st] = await Promise.all([gh.get(`/repos/${repo}/commits/${sha}/check-runs?per_page=100`), gh.get(`/repos/${repo}/commits/${sha}/status`)]);
  const pending = [], failed = [];
  for (const c of runs.j?.check_runs ?? []) { if (c.status !== "completed") pending.push(c.name); else if (!["success", "skipped", "neutral"].includes(c.conclusion)) failed.push(`${c.name} (${c.conclusion})`); }
  for (const s of st.j?.statuses ?? []) { if (s.state === "pending") pending.push(s.context); else if (s.state !== "success") failed.push(`${s.context} (${s.state})`); }
  return { done: !pending.length, ok: !pending.length && !failed.length, pending, failed };
}
/** the deployment of a commit in an environment ("Preview", "Production") → { state, url } or null */
export async function deploymentOf(gh, repo, sha, environment) {
  const d = await gh.get(`/repos/${repo}/deployments?sha=${sha}&environment=${encodeURIComponent(environment)}&per_page=5`);
  const dep = (d.j ?? [])[0]; if (!dep) return null;
  const s = await gh.get(`/repos/${repo}/deployments/${dep.id}/statuses?per_page=5`), top = (s.j ?? [])[0];
  return { id: dep.id, state: top?.state ?? "pending", url: top?.environment_url ?? top?.target_url ?? null };
}
async function waitFor(fn, { maxMs, everyMs, now = () => Date.now() }) { const t0 = now(); for (;;) { const r = await fn(); if (r.done) return r; if (now() - t0 >= maxMs) return { ...r, timedOut: true }; await sleep(everyMs); } }

/**
 * One go-live. conn = { repo, branch, folder, site }; scan(origin, { through, filesFrom }) → the scan; live (the production branch) is read from the repo.
 * → { ok, step, held?: why, merged?: { pr, sha }, preview, live, rolledBack, way }
 */
export async function goLive({ gh, conn, scan, save = () => {}, maxWaitMs = 30 * 60000, everyMs = 20000, now = () => Date.now(), bypass = false }) {
  const repo = conn.repo, branch = conn.branch, folder = conn.folder || "visibility-pages", out = { on: new Date(now()).toISOString(), steps: [] }, step = (name, ok, line, extra = {}) => { out.steps.push({ name, ok, line, ...extra }); save(out); };
  const r0 = await gh.get(`/repos/${repo}`); if (!r0.ok) return { ...out, ok: false, held: `The site's repository could not be read: ${r0.why}` };
  const prod = r0.j.default_branch; if (!prod || prod === branch) return { ...out, ok: false, held: "The pages are written straight to the live branch: there is nothing to take live." };
  /* 1 · the branch takes the site's current code first */
  const m = await gh.post(`/repos/${repo}/merges`, { base: branch, head: prod, commit_message: `Bring ${branch} up to date with ${prod} (AlmiVisibility autopilot)` });
  if (m.status === 409) { step("update", false, `${branch} cannot take ${prod}'s changes without a conflict.`); return { ...out, ok: false, held: `The preview branch has a conflict with ${prod}: it needs a person.` }; }
  if (!m.ok && m.status !== 204) { step("update", false, m.why); return { ...out, ok: false, held: m.why }; }
  step("update", true, m.status === 204 ? `${branch} already had ${prod}'s code.` : `${branch} took ${prod}'s newest code.`);
  /* 2 · ONLY the pages folder */
  const c = await gh.get(`/repos/${repo}/compare/${encodeURIComponent(prod)}...${encodeURIComponent(branch)}`); if (!c.ok) return { ...out, ok: false, held: c.why };
  const files = c.j.files ?? [], outside = outsideFolder(files, folder);
  if (outside.length) { step("only-pages", false, `${outside.length} file(s) outside ${folder}/ would change: ${outside.slice(0, 5).join(", ")}.`); return { ...out, ok: false, held: `Not taken live: the change touches ${outside.length} file(s) outside ${folder}/ (${outside.slice(0, 3).join(", ")}). Only pages may go live by themselves.` }; }
  if (!files.length || c.j.ahead_by === 0) { step("only-pages", true, "Nothing new to take live."); return { ...out, ok: true, nothing: true }; }
  step("only-pages", true, `${files.length} page file(s) to take live, all under ${folder}/.`);
  const head = c.j.commits?.at(-1)?.sha ?? (await gh.get(`/repos/${repo}/branches/${encodeURIComponent(branch)}`)).j?.commit?.sha;
  /* 3 · the app's own pull request */
  const owner = repo.split("/")[0], open = await gh.get(`/repos/${repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}&base=${encodeURIComponent(prod)}`);
  let pr = (open.j ?? [])[0]; if (!pr) { const p = await gh.post(`/repos/${repo}/pulls`, { title: `Pages from AlmiVisibility (${out.on.slice(0, 10)})`, head: branch, base: prod, body: `Opened by AlmiVisibility's autopilot. It changes only files under \`${folder}/\` and is merged by the app after the preview passes its scan.` }); if (!p.ok) return { ...out, ok: false, held: `The pull request could not be opened: ${p.why}` }; pr = p.j; }
  step("pr", true, `Pull request #${pr.number}.`, { pr: pr.number });
  /* 4 · the preview Ready, every check green */
  const pv = await waitFor(async () => { const d = await deploymentOf(gh, repo, head, "Preview"), k = await checksOf(gh, repo, head); return { done: (d?.state === "success" || d?.state === "failure" || d?.state === "error") && k.done, d, k }; }, { maxMs: maxWaitMs, everyMs, now });
  if (pv.timedOut) { step("preview", false, `The preview or its checks did not finish in ${Math.round(maxWaitMs / 60000)} minutes (${[...(pv.k?.pending ?? [])].slice(0, 3).join(", ") || "the preview"}).`); return { ...out, ok: false, held: "The preview did not finish in time: the next cycle goes on from here.", pr: pr.number }; }
  if (pv.d?.state !== "success") { step("preview", false, `The preview deployment ended ${pv.d?.state ?? "missing"}.`); return { ...out, ok: false, held: `The preview did not build (${pv.d?.state ?? "no deployment"}).`, pr: pr.number }; }
  if (!pv.k.ok) { step("preview", false, `Checks failed: ${pv.k.failed.join(", ")}.`); return { ...out, ok: false, held: `A check failed on the preview: ${pv.k.failed.slice(0, 3).join(", ")}.`, pr: pr.number }; }
  step("preview", true, `Preview Ready (${pv.d.url ?? "no address"}); every check green.`);
  out.preview = await scan(pv.d.url, { preview: true, bypass, head, prod });
  if (!out.preview?.ok) { step("preview-scan", false, `The scan failed on the preview: ${(out.preview?.rows ?? []).filter((r) => !r.ok).map((r) => `${r.check} ${r.count}`).join(", ") || out.preview?.why}.`); return { ...out, ok: false, held: "Not taken live: the preview failed the scan (the reasons are saved).", pr: pr.number }; }
  step("preview-scan", true, `The preview passed the scan (${out.preview.crawled} pages${out.preview.through ? `, ${out.preview.through}` : ""}).`);
  /* 5 · the way back, written BEFORE the merge */
  const before = await gh.get(`/repos/${repo}/branches/${encodeURIComponent(prod)}`); if (!before.ok) return { ...out, ok: false, held: before.why };
  out.way = { prod, before: before.j.commit.sha, folder, how: `To undo: a commit on ${prod} that puts ${folder}/ back as it was in ${before.j.commit.sha.slice(0, 7)} (the app does this itself on a serious failure; by hand: git checkout ${before.j.commit.sha.slice(0, 7)} -- ${folder} && git commit).` }; save(out);
  const mg = await gh.put(`/repos/${repo}/pulls/${pr.number}/merge`, { merge_method: "merge", sha: head, commit_title: `Pages from AlmiVisibility (#${pr.number})` });
  if (!mg.ok) { step("merge", false, mg.why); return { ...out, ok: false, held: `The pull request could not be merged: ${mg.why}`, pr: pr.number }; }
  out.merged = { pr: pr.number, sha: mg.j.sha }; step("merge", true, `Merged #${pr.number} (${mg.j.sha.slice(0, 7)}).`);
  /* 6 · production Ready, then the live scan */
  const pd = await waitFor(async () => { const d = await deploymentOf(gh, repo, mg.j.sha, "Production"); return { done: ["success", "failure", "error"].includes(d?.state), d }; }, { maxMs: maxWaitMs, everyMs, now });
  if (pd.d?.state !== "success") { step("production", false, pd.timedOut ? "The live deployment did not finish in time." : `The live deployment ended ${pd.d?.state ?? "missing"}.`); return { ...out, ok: false, held: "Merged, but the live deployment is not Ready: the next cycle scans it.", liveWaiting: true }; }
  step("production", true, "Live deployment Ready.");
  out.live = await scan(conn.site, { preview: false, afterMerge: true });
  if (out.live?.serious?.length) {
    const rb = await rollBack({ gh, repo, way: out.way }); out.rolledBack = rb; step("rollback", rb.ok, rb.ok ? `Rolled back (${rb.sha.slice(0, 7)}): ${out.live.serious.slice(0, 2).join("; ")}.` : `The rollback failed: ${rb.why}`);
    return { ...out, ok: false, held: `A serious failure on the live site (${out.live.serious[0]}): ${rb.ok ? "rolled back by itself" : "the rollback FAILED, a person must act"}.` };
  }
  step("live-scan", out.live?.ok === true, out.live?.ok ? "The live site passed the scan." : `The live scan found: ${(out.live?.rows ?? []).filter((r) => !r.ok).map((r) => `${r.check} ${r.count}`).join(", ")}. Fixed in the next cycle.`);
  return { ...out, ok: true };
}

/** the way back: production's tree with the pages folder as it was before the merge — one commit, fast-forward only */
export async function rollBack({ gh, repo, way }) {
  const head = await gh.get(`/repos/${repo}/branches/${encodeURIComponent(way.prod)}`); if (!head.ok) return { ok: false, why: head.why };
  const old = await gh.get(`/repos/${repo}/git/trees/${way.before}`), entry = (old.j?.tree ?? []).find((t) => t.path === way.folder && t.type === "tree");
  const tree = await gh.post(`/repos/${repo}/git/trees`, { base_tree: head.j.commit.commit.tree.sha, tree: [entry ? { path: way.folder, mode: "040000", type: "tree", sha: entry.sha } : { path: way.folder, mode: "040000", type: "tree", sha: null }] });
  if (!tree.ok) return { ok: false, why: tree.why };
  const commit = await gh.post(`/repos/${repo}/git/commits`, { message: `Undo the last AlmiVisibility pages (back to ${way.before.slice(0, 7)})`, tree: tree.j.sha, parents: [head.j.commit.sha] });
  if (!commit.ok) return { ok: false, why: commit.why };
  const ref = await gh.patch(`/repos/${repo}/git/refs/heads/${encodeURIComponent(way.prod)}`, { sha: commit.j.sha, force: false });
  return ref.ok ? { ok: true, sha: commit.j.sha } : { ok: false, why: ref.why };
}
