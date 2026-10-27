#!/usr/bin/env node
/**
 * 🔴 RR-326 A · THE OWNER'S ONE-TIME GOOGLE SIGN-IN FOR THE KEYWORD FINDER — run BY THE OWNER, in his own terminal, from the deploy folder
 * (where his Vercel link is):
 *     node owner-google-sign-in.mjs "<the Google client JSON file>"      (or without it: the script asks, and he drags the file in)
 * The owner never copies or types the client ID or secret: the script reads client_id and client_secret from the JSON file Google gave
 * him (its "installed" or "web" part), at run time, on his computer — never printed, logged or saved, and the file is never copied.
 * He signs in on Google's OWN page in his own browser and allows the Google Ads permission. Then the script puts these into his Vercel
 * project's PRODUCTION settings as SENSITIVE values, through his own Vercel CLI, each value on the CLI's standard input (never on a
 * command line, never printed, never written to a file):
 *   GOOGLE_ADS_CLIENT_ID · GOOGLE_ADS_CLIENT_SECRET · GOOGLE_ADS_REFRESH_TOKEN · CRON_SECRET (a new random value no one needs to see)
 * It prints only names, and the Google Ads account ids the sign-in can reach (so he can check his 10-digit customer id) — never a value.
 * Google's address (which carries the client ID) is never printed either: the browser opens a local address that forwards to it.
 * He sets GOOGLE_ADS_CUSTOMER_ID and OWNER_ACCESS_KEY in Vercel himself, then redeploys.
 * Google's sign-in for an installed program: a loopback address on this computer (127.0.0.1) and PKCE — the same as the Visibility app.
 */
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

/* RR-331: the same sign-in also allows Search Console, READ ONLY (webmasters.readonly) — the queries people use to reach our own sites */
export const AUTH = Object.freeze({ auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scope: "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/webmasters.readonly", accounts: "https://googleads.googleapis.com/v26/customers:listAccessibleCustomers", sites: "https://www.googleapis.com/webmasters/v3/sites" });
export const VERCEL_CLI = "vercel@65.2.0";
const b64url = (b) => Buffer.from(b).toString("base64url");

/** a question in the terminal (a path — nothing secret is ever asked) */
export function ask(question, { input = process.stdin, output = process.stdout } = {}) {
  return new Promise((resolve) => { const rl = createInterface({ input, output, terminal: true }); rl.question(question, (a) => { rl.close(); resolve(a); }); });
}
/** a path as PowerShell types it when a file is dragged in: quotes, a leading "& ", spaces around */
export const cleanPath = (p) => String(p ?? "").trim().replace(/^&\s+/, "").replace(/^(["'])(.*)\1$/, "$2").trim();

/* RR-331 B: the file's bytes as text — UTF-8 with or without its byte-order mark, or UTF-16 (a file saved again by an editor); a value
 * is never printed, only which of these went wrong */
export function textOfBytes(b) {
  const buf = Buffer.isBuffer(b) ? b : Buffer.from(String(b ?? ""), "utf8");
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString("utf16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) { const s = Buffer.from(buf.subarray(2)); s.swap16(); return s.toString("utf16le"); }
  if (buf.length >= 2 && buf[1] === 0x00 && buf[0] !== 0x00) return buf.toString("utf16le"); // UTF-16 LE without its mark
  return buf.toString("utf8").replace(/^﻿/, "");
}
/** the client from Google's JSON file → { ok, clientId, secret } | { ok: false, why } — the why never carries a value */
export function clientFromFile(path, { read = (f) => readFileSync(f) } = {}) {
  const p = cleanPath(path);
  if (!p) return { ok: false, why: "No file was given." };
  if (!/\.json$/i.test(p)) return { ok: false, why: "That is not a .json file — give the client file you downloaded from Google Cloud." };
  if (!existsSync(p)) return { ok: false, why: "That file is not there — drag the file itself into this window." };
  let raw; try { raw = read(p); } catch (e) { return { ok: false, why: `That file is there but could not be opened (${e?.code ?? "no access"}) — if it is in OneDrive, right-click it → "Always keep on this device", wait until its cloud icon turns into a green tick, then run this again.` }; }
  const text = textOfBytes(raw).trim();
  if (!text) return { ok: false, why: "That file is empty — if it is in OneDrive, let it finish downloading (right-click → \"Always keep on this device\"), then run this again." };
  let j; try { j = JSON.parse(text); } catch { return { ok: false, why: `That file is not Google's client file (its text is not JSON${text.startsWith("{") ? " — it may have been changed when it was opened in an editor; download it again from Google Cloud → Credentials" : ""}).` }; }
  const c = j?.installed ?? j?.web ?? null;
  if (!c) return { ok: false, why: "That file has no client in it (Google's client file has an \"installed\" or \"web\" part)." };
  if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(String(c.client_id ?? ""))) return { ok: false, why: "That file's client ID is not a Google OAuth client ID." };
  if (String(c.client_secret ?? "").length < 10) return { ok: false, why: "That file has no client secret." };
  return { ok: true, clientId: String(c.client_id), secret: String(c.client_secret), kind: j.installed ? "Desktop app" : "Web application" };
}
/** one Vercel setting, its value on standard input (never in the command line) */
export function addVercelEnv(name, value, { cwd = process.cwd() } = {}) {
  return new Promise((resolve) => {
    const p = spawn("npx", ["--yes", VERCEL_CLI, "env", "add", name, "--environment", "production", "--sensitive", "--force"], { cwd, stdio: ["pipe", "inherit", "inherit"], shell: process.platform === "win32" });
    p.on("error", () => resolve(false)); p.on("exit", (code) => resolve(code === 0));
    p.stdin.end(value);
  });
}
/** the owner's browser opens an address (explorer.exe on Windows: the address is never read by a command shell) */
export function openBrowser(url) { const [cmd, args] = process.platform === "win32" ? ["explorer.exe", [url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]]; try { spawn(cmd, args, { stdio: "ignore", detached: true }).unref(); } catch { /* the local address is printed too */ } }

export async function main({ argv = process.argv.slice(2), log = (s) => console.log(s), askFn = ask, open = openBrowser, fetchImpl = fetch, addEnv = addVercelEnv, cwd = process.cwd(), read, waitMs = 10 * 60000 } = {}) {
  if (!existsSync(`${cwd}/.vercel`)) { log("Run this from your deploy folder (the one you deploy with npx vercel@latest --prod) — its Vercel link is not here. Nothing was done."); return 2; }
  log("AlmiVisibility — Google sign-in for the keyword finder. Nothing from your client file is shown, saved on this computer or copied.");
  const path = argv[0] ?? (await askFn("Drag your Google client JSON file into this window, then press Enter: "));
  const c = clientFromFile(path, read ? { read } : {});
  if (!c.ok) { log(`${c.why} Nothing was done.`); return 2; }
  if (c.kind === "Web application") log("Note: this is a \"Web application\" client. If Google says the address does not match, make a \"Desktop app\" client in the same project and use its file.");
  const { clientId, secret } = c;
  const verifier = b64url(randomBytes(32)), state = b64url(randomBytes(16));
  let done; const got = new Promise((r) => (done = r));
  let google = null; // Google's own address — handed to the browser by a local forward, never printed
  const srv = createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    if (u.pathname === "/start" && google) { res.writeHead(302, { location: google, "cache-control": "no-store" }); return res.end(); }
    if (u.pathname !== "/oauth/google-ads") { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<!doctype html><meta charset=utf-8><title>AlmiVisibility</title><p style=\"font:16px system-ui;margin:40px\">Done — you can close this tab and go back to the terminal.</p>");
    done({ code: u.searchParams.get("code"), state: u.searchParams.get("state"), error: u.searchParams.get("error") });
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const local = `http://127.0.0.1:${srv.address().port}`, redirect = `${local}/oauth/google-ads`;
  try {
    const a = new URL(AUTH.auth);
    for (const [k, v] of Object.entries({ client_id: clientId, redirect_uri: redirect, response_type: "code", scope: AUTH.scope, access_type: "offline", prompt: "consent", state, code_challenge: b64url(createHash("sha256").update(verifier).digest()), code_challenge_method: "S256" })) a.searchParams.set(k, v);
    google = a.href;
    log("Your browser now opens Google's own sign-in page. Sign in with the Google account that runs your Google Ads, and allow the access.");
    log(`If it does not open, open this address in your browser: ${local}/start`);
    open(`${local}/start`);
    const timer = new Promise((r) => setTimeout(() => r({ error: "timeout" }), waitMs).unref());
    const cb = await Promise.race([got, timer]);
    if (cb.error) { log(cb.error === "timeout" ? "No answer from Google in 10 minutes. Nothing was saved." : "You did not allow the access. Nothing was saved."); return 1; }
    if (cb.state !== state || !cb.code) { log("That answer was not for this sign-in. Nothing was saved."); return 1; }
    const t = await fetchImpl(AUTH.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: cb.code, client_id: clientId, client_secret: secret, redirect_uri: redirect, grant_type: "authorization_code", code_verifier: verifier }) });
    const j = await t.json().catch(() => ({}));
    if (!t.ok || !j.refresh_token) { log("Google did not give a lasting sign-in (check that the client file is the right one, then run this again). Nothing was saved."); return 1; }
    /* which Google Ads accounts this sign-in reaches — ids only (one operation) */
    try {
      const r = await fetchImpl(AUTH.accounts, { headers: { authorization: `Bearer ${j.access_token}` } });
      const x = await r.json().catch(() => ({}));
      if (r.ok) log(`Google Ads accounts this sign-in reaches: ${(x.resourceNames ?? []).map((n) => n.replace("customers/", "")).join(", ") || "none"}`);
      else log(`Google answered the account check with: ${x?.error?.status ?? r.status}${JSON.stringify(x).includes("AUTHORIZATION_ERROR") ? " (AUTHORIZATION_ERROR — Google names a known fault for projects upgraded after 9 Sep 2026 and is rolling out a fix)" : ""}. The sign-in itself is saved below.`);
    } catch { log("The account check did not answer — the sign-in itself is saved below."); }
    /* RR-331: did he allow Search Console (read only) too, and how many of our sites does it reach — a count only */
    if (!String(j.scope ?? "").split(" ").includes("https://www.googleapis.com/auth/webmasters.readonly")) log("Search Console was NOT allowed in this sign-in (the box was not ticked) — run this again and tick it, or Search Console stays off.");
    else try { const r = await fetchImpl(AUTH.sites, { headers: { authorization: `Bearer ${j.access_token}` } }); const x = await r.json().catch(() => ({})); log(r.ok ? `Search Console sites this sign-in reaches: ${(x.siteEntry ?? []).filter((e) => /almiworld\.com/.test(e.siteUrl)).length} almiworld.com site(s)` : `Search Console answered ${r.status}${r.status === 403 ? " — switch on \"Google Search Console API\" in the same Google Cloud project" : ""}.`); } catch { log("The Search Console check did not answer — the sign-in itself is saved below."); }
    const values = [["GOOGLE_ADS_CLIENT_ID", clientId], ["GOOGLE_ADS_CLIENT_SECRET", secret], ["GOOGLE_ADS_REFRESH_TOKEN", j.refresh_token], ["CRON_SECRET", b64url(randomBytes(32))]];
    for (const [name, value] of values) { const ok = await addEnv(name, value, { cwd }); log(ok ? `Saved in Vercel (Production, sensitive): ${name}` : `NOT saved: ${name} — run this again`); if (!ok) return 1; }
    log("Next, in Vercel → Settings → Environment Variables (Production): add GOOGLE_ADS_CUSTOMER_ID (your 10-digit Google Ads id) and OWNER_ACCESS_KEY (a long random key of your own, at least 32 characters). Then run: npx vercel@latest --prod");
    return 0;
  } finally { srv.close(); }
}

if (process.argv[1] && /owner-google-sign-in\.mjs$/.test(process.argv[1])) main().then((c) => process.exit(c));
