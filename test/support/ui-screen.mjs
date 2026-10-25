import { readFileSync } from "node:fs";
import { join } from "node:path";
const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* RR-327 (PD-006): a screen that fails LATER (a promise of ui.html's own script nobody awaits) failed the whole test FILE — no test was named,
 * so a sabotage limb read "NOT RED" once and RED on its re-run. Such an error is kept for the screen's test (uiErrors) instead; any other
 * unhandled rejection is thrown on as before, so nothing else is hidden. */
let CURRENT = null;
process.on("unhandledRejection", (e) => { if (CURRENT && /evalmachine/.test(String(e?.stack ?? ""))) { CURRENT.push(e); return; } throw e; });
/* ── the SCREENS themselves (RR-307 fixes, owner 22 Oct): the app's own ui.html script, run against the real app with a stand-in page ──
 * Each element is a plain object; what a screen writes into #app is read back. A screen that throws is a failed test, not a blank page. */
export async function screen(base) {
  const { runInNewContext } = await import("node:vm");
  const html = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  const code = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
  const els = new Map(), errors = [], late = []; CURRENT = late;
  const el = (sel) => { if (!els.has(sel)) els.set(sel, { sel, innerHTML: "", textContent: "", value: "", checked: false, disabled: false, style: {}, dataset: {}, files: [], onclick: null, onchange: null, focus() {}, remove() {}, after() {}, scrollIntoView() {}, classList: { add() {}, remove() {}, contains: () => false }, prepend(x) { this.innerHTML = `${x.innerHTML ?? ""}${this.innerHTML}`; }, appendChild() {}, querySelector: () => el(`${sel} *`), querySelectorAll: () => [] }); return els.get(sel); };
  const document = { querySelector: (s) => el(s), querySelectorAll: () => [], createElement: () => el(`new-${els.size}`), body: el("body"), addEventListener() {} };
  const listeners = {};
  const window = { addEventListener: (k, f) => { if (k === "error" || k === "unhandledrejection") errors.push(f); (listeners[k] ??= []).push(f); }, open() {}, scrollTo() {} };
  /* RR-315 B: the window's own history (each screen is a step in it) */
  const history = { state: null, entries: [], pushState(s) { this.entries.push(s); this.state = s; }, replaceState(s) { this.entries[Math.max(0, this.entries.length - 1)] = s; this.state = s; }, back() {} };
  const ctx = { document, window, history, location: { hash: "" }, fetch: (p, o) => fetch(`${base}${p}`, o), console: { error() {}, log() {} }, setTimeout: () => 0, FileReader: class {}, URL, encodeURIComponent, decodeURIComponent, JSON, Math, String, Number, Array, Object, Promise, Set, Map, Boolean, Date, RegExp };
  runInNewContext(`${code}\n;globalThis.__api = { set: (p, s) => { P = p; S = s; }, youtubeSettings, youtubeTab, overview, work, setup, get, pagesBox, stepTo: (i) => { step = i; }, home, googleSignInScreen, here, post, typed: () => { DIRTY = true; }, nav: () => ({ DIRTY, CUR, P, step }) };`, ctx);
  await new Promise((r) => setTimeout(r, 300)); // the first screen (home) settles
  return { api: ctx.__api, app: () => el("#app").innerHTML, el, history, uiErrors: () => late.map((e) => String(e?.message ?? e)), popstate: (state) => (history.state = state, Promise.all((listeners.popstate ?? []).map((f) => f({ state })))) };
}

