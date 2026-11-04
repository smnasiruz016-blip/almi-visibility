/* 🔴 RR-370b (owner, 4 Nov 2026: every page of almivisibility.almiworld.com answered 500 after the deploy; the update channel with it). The tests read the repository, where the file was; the function runs from the bundle, where it was not. So: build the real bundle, run it from that folder, ask it */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), ".."), SERVE = "const { default: h } = await import(process.argv[1]); const s = (await import('node:http')).createServer(h); s.listen(0, '127.0.0.1', () => console.log('PORT ' + s.address().port));";
/* no key of any kind reaches this server: only what node itself needs */
const CLEAN = Object.fromEntries(["PATH", "Path", "SystemRoot", "TEMP", "TMP", "windir", "HOME", "USERPROFILE"].filter((k) => process.env[k]).map((k) => [k, process.env[k]]));
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

test("the bundle, from its own folder: the function loads, the home, the update channel and the AlmiSEO routes answer; none is a 500", async () => {
  const out = join(mkdtempSync(join(tmpdir(), "rr370b-")), "site"); const b = spawnSync(process.execPath, ["tools/bundle-site.mjs", "--sales", out], { cwd: REPO, encoding: "utf8" }); assert.equal(b.status, 0, b.stderr);
  /* every data file a bundled module reads by its address is in the bundle */
  for (const f of walk(out).filter((x) => x.endsWith(".mjs"))) for (const m of readFileSync(f, "utf8").matchAll(/new URL\(\s*["'](\.{1,2}\/[^"']+\.json)["']\s*,\s*import\.meta\.url\s*\)/g)) { if (!existsSync(join(REPO, f.slice(out.length + 1), "..", m[1]))) continue; assert.ok(existsSync(join(dirname(f), m[1])), `${f.slice(out.length + 1)} reads ${m[1]}: not in the bundle`); }
  const p = spawn(process.execPath, ["--input-type=module", "-e", SERVE, pathToFileURL(join(out, "api", "index.mjs")).href], { cwd: out, env: CLEAN, stdio: ["ignore", "pipe", "pipe"] }); let said = "", err = ""; p.stderr.on("data", (d) => { err += d; });
  try {
    const port = await new Promise((ok, no) => { p.stdout.on("data", (d) => { said += d; const m = /PORT (\d+)/.exec(said); if (m) ok(m[1]); }); p.once("exit", (c) => no(new Error(`the function did not load (exit ${c}): ${err.slice(0, 400)}`))); }), ask = async (path, init) => (await fetch(`http://127.0.0.1:${port}${path}`, { redirect: "manual", ...init })).status, post = { method: "POST", headers: { "content-type": "application/json" }, body: "{}" };
    assert.equal(await ask("/"), 200, "the home");
    for (const [path, init] of [["/pricing"], ["/privacy"], ["/updates/manifest.json"], ["/v1/almiseo"], ["/v1/almiseo", post], ["/v1/almiseo/topic", post], ["/v1/almiseo/saved", post], ["/v1/almiseo/searches", post], ["/v1/almiseo/searches/held", post], ["/v1/licence", post]]) { const s = await ask(path, init); assert.ok(s < 500 || s === 503, `${init ? "POST" : "GET"} ${path} answered ${s}`); }
  } finally { p.kill(); rmSync(dirname(out), { recursive: true, force: true }); }
});
