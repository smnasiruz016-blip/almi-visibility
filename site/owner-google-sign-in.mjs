#!/usr/bin/env node
/**
 * 🔴 RR-326 A · THE OWNER'S ONE-TIME GOOGLE SIGN-IN FOR THE KEYWORD FINDER — run BY THE OWNER, in his own terminal, from the deploy folder
 * (where his Vercel link is): `node owner-google-sign-in.mjs`. He types his Cloud project's OAuth client ID and secret (the secret is not
 * shown as he types), signs in on Google's OWN page in his own browser, and allows the Google Ads permission. Then the script puts these
 * into his Vercel project's PRODUCTION settings as SENSITIVE values, through his own Vercel CLI, each value on the CLI's standard input
 * (never on a command line, never printed, never written to a file):
 *   GOOGLE_ADS_CLIENT_ID · GOOGLE_ADS_CLIENT_SECRET · GOOGLE_ADS_REFRESH_TOKEN · CRON_SECRET (a new random value no one needs to see)
 * It prints only names, and the Google Ads account ids the sign-in can reach (so he can check his 10-digit customer id) — never a value.
 * He sets GOOGLE_ADS_CUSTOMER_ID and OWNER_ACCESS_KEY in Vercel himself, then redeploys.
 * Google's sign-in for an installed program: a loopback address on this computer (127.0.0.1) and PKCE — the same as the Visibility app.
 */
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";

export const AUTH = Object.freeze({ auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scope: "https://www.googleapis.com/auth/adwords", accounts: "https://googleads.googleapis.com/v26/customers:listAccessibleCustomers" });
export const VERCEL_CLI = "vercel@65.2.0";
const b64url = (b) => Buffer.from(b).toString("base64url");

/** a question in the terminal; `hidden`: nothing typed is shown */
export function ask(question, { hidden = false, input = process.stdin, output = process.stdout } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input, output, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) output.write(question); };
    rl.question(question, (a) => { rl.close(); if (hidden) output.write("\n"); resolve(a.trim()); });
  });
}
/** one Vercel setting, its value on standard input (never in the command line) */
export function addVercelEnv(name, value, { cwd = process.cwd() } = {}) {
  return new Promise((resolve) => {
    const p = spawn("npx", ["--yes", VERCEL_CLI, "env", "add", name, "--environment", "production", "--sensitive", "--force"], { cwd, stdio: ["pipe", "inherit", "inherit"], shell: process.platform === "win32" });
    p.on("error", () => resolve(false)); p.on("exit", (code) => resolve(code === 0));
    p.stdin.end(value);
  });
}
/** the owner's browser opens Google's page (explorer.exe on Windows: the address is never read by a command shell) */
export function openBrowser(url) { const [cmd, args] = process.platform === "win32" ? ["explorer.exe", [url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]]; try { spawn(cmd, args, { stdio: "ignore", detached: true }).unref(); } catch { /* the address is printed too */ } }

export async function main({ log = (s) => console.log(s), askFn = ask, open = openBrowser, fetchImpl = fetch, addEnv = addVercelEnv, cwd = process.cwd(), waitMs = 10 * 60000 } = {}) {
  if (!existsSync(`${cwd}/.vercel`)) { log("Run this from your deploy folder (the one you deploy with npx vercel@latest --prod) — its Vercel link is not here. Nothing was done."); return 2; }
  log("AlmiVisibility — Google sign-in for the keyword finder. Nothing you type is shown or saved on this computer.");
  const clientId = await askFn("Your Google Cloud OAuth client ID (…apps.googleusercontent.com): ");
  if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)) { log("That is not an OAuth client ID. Nothing was done."); return 2; }
  const secret = await askFn("Its client secret (not shown as you type): ", { hidden: true });
  if (secret.length < 10) { log("No client secret. Nothing was done."); return 2; }
  const verifier = b64url(randomBytes(32)), state = b64url(randomBytes(16));
  let done; const got = new Promise((r) => (done = r));
  const srv = createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    if (u.pathname !== "/oauth/google-ads") { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<!doctype html><meta charset=utf-8><title>AlmiVisibility</title><p style=\"font:16px system-ui;margin:40px\">Done — you can close this tab and go back to the terminal.</p>");
    done({ code: u.searchParams.get("code"), state: u.searchParams.get("state"), error: u.searchParams.get("error") });
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const redirect = `http://127.0.0.1:${srv.address().port}/oauth/google-ads`;
  try {
    const a = new URL(AUTH.auth);
    for (const [k, v] of Object.entries({ client_id: clientId, redirect_uri: redirect, response_type: "code", scope: AUTH.scope, access_type: "offline", prompt: "consent", state, code_challenge: b64url(createHash("sha256").update(verifier).digest()), code_challenge_method: "S256" })) a.searchParams.set(k, v);
    log("Your browser now opens Google's own sign-in page. Sign in with the Google account that runs your Google Ads, and allow the access.");
    log(`If it does not open, copy this address into your browser:\n${a.href}`);
    open(a.href);
    const timer = new Promise((r) => setTimeout(() => r({ error: "timeout" }), waitMs).unref());
    const cb = await Promise.race([got, timer]);
    if (cb.error) { log(cb.error === "timeout" ? "No answer from Google in 10 minutes. Nothing was saved." : "You did not allow the access. Nothing was saved."); return 1; }
    if (cb.state !== state || !cb.code) { log("That answer was not for this sign-in. Nothing was saved."); return 1; }
    const t = await fetchImpl(AUTH.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: cb.code, client_id: clientId, client_secret: secret, redirect_uri: redirect, grant_type: "authorization_code", code_verifier: verifier }) });
    const j = await t.json().catch(() => ({}));
    if (!t.ok || !j.refresh_token) { log("Google did not give a lasting sign-in (check the client ID and secret, then run this again). Nothing was saved."); return 1; }
    /* which Google Ads accounts this sign-in reaches — ids only (one operation) */
    try {
      const r = await fetchImpl(AUTH.accounts, { headers: { authorization: `Bearer ${j.access_token}` } });
      const x = await r.json().catch(() => ({}));
      if (r.ok) log(`Google Ads accounts this sign-in reaches: ${(x.resourceNames ?? []).map((n) => n.replace("customers/", "")).join(", ") || "none"}`);
      else log(`Google answered the account check with: ${x?.error?.status ?? r.status}${JSON.stringify(x).includes("AUTHORIZATION_ERROR") ? " (AUTHORIZATION_ERROR — Google names a known fault for projects upgraded after 9 Sep 2026 and is rolling out a fix)" : ""}. The sign-in itself is saved below.`);
    } catch { log("The account check did not answer — the sign-in itself is saved below."); }
    const values = [["GOOGLE_ADS_CLIENT_ID", clientId], ["GOOGLE_ADS_CLIENT_SECRET", secret], ["GOOGLE_ADS_REFRESH_TOKEN", j.refresh_token], ["CRON_SECRET", b64url(randomBytes(32))]];
    for (const [name, value] of values) { const ok = await addEnv(name, value, { cwd }); log(ok ? `Saved in Vercel (Production, sensitive): ${name}` : `NOT saved: ${name} — run this again`); if (!ok) return 1; }
    log("Next, in Vercel → Settings → Environment Variables (Production): add GOOGLE_ADS_CUSTOMER_ID (your 10-digit Google Ads id) and OWNER_ACCESS_KEY (a long random key of your own, at least 32 characters). Then run: npx vercel@latest --prod");
    return 0;
  } finally { srv.close(); }
}

if (process.argv[1] && /owner-google-sign-in\.mjs$/.test(process.argv[1])) main().then((c) => process.exit(c));
