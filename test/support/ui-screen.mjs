import { readFileSync } from "node:fs";
import { join } from "node:path";
const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* ── the SCREENS themselves (RR-307 fixes, owner 22 Oct): the app's own ui.html script, run against the real app with a stand-in page ──
 * Each element is a plain object; what a screen writes into #app is read back. A screen that throws is a failed test, not a blank page. */
export async function screen(base) {
  const { runInNewContext } = await import("node:vm");
  const html = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  const code = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
  const els = new Map(), errors = [];
  const el = (sel) => { if (!els.has(sel)) els.set(sel, { sel, innerHTML: "", textContent: "", value: "", checked: false, disabled: false, style: {}, dataset: {}, files: [], onclick: null, onchange: null, focus() {}, remove() {}, scrollIntoView() {}, prepend(x) { this.innerHTML = `${x.innerHTML ?? ""}${this.innerHTML}`; }, appendChild() {}, querySelector: () => el(`${sel} *`), querySelectorAll: () => [] }); return els.get(sel); };
  const document = { querySelector: (s) => el(s), querySelectorAll: () => [], createElement: () => el(`new-${els.size}`), body: el("body") };
  const window = { addEventListener: (k, f) => { if (k === "error" || k === "unhandledrejection") errors.push(f); }, open() {}, scrollTo() {} };
  const ctx = { document, window, location: { hash: "" }, fetch: (p, o) => fetch(`${base}${p}`, o), console: { error() {}, log() {} }, setTimeout: () => 0, FileReader: class {}, URL, encodeURIComponent, decodeURIComponent, JSON, Math, String, Number, Array, Object, Promise, Set, Map, Boolean, Date, RegExp };
  runInNewContext(`${code}\n;globalThis.__api = { set: (p, s) => { P = p; S = s; }, youtubeSettings, youtubeTab, overview, work, setup, get, pagesBox, stepTo: (i) => { step = i; } };`, ctx);
  await new Promise((r) => setTimeout(r, 300)); // the first screen (home) settles
  return { api: ctx.__api, app: () => el("#app").innerHTML, el };
}

