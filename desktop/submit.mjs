/**
 * 🔴 RR-310 D3 · SUBMITTING PUBLISHED PAGES (owner, 21 Oct 2026): to Google through the client's OWN Search Console connection (the
 * sitemap — Google has no URL-by-URL submit for ordinary pages), and to Bing through IndexNow (which AI search assistants that use Bing's
 * index, like ChatGPT search and Copilot, also draw on). IndexNow proves the site is the client's by a KEY FILE on the site itself
 * (https://<site>/<key>.txt holding the key) — the key is public by design; Visibility makes it, says in plain words where to put it, and
 * checks it is there before every submit. Each page keeps its state: Submitted ✓ (date) · Not yet · Failed (why).
 * Never for AlmiWorld's own products (main.mjs refuses before this runs). Only published (LIVE) pages are submitted.
 */
import { randomBytes } from "node:crypto";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const newIndexNowKey = () => randomBytes(16).toString("hex");
export const keyFileUrl = (origin, key) => `${String(origin).replace(/\/$/, "")}/${key}.txt`;
export const keyFileHowTo = (origin, key) => [
  `Make a plain text file named ${key}.txt that holds only this text: ${key}`,
  `Put it at the top of your site, so that ${keyFileUrl(origin, key)} opens and shows that text.`,
  "WordPress: upload it with your host's file manager into the main folder (where wp-config.php is). GitHub + Vercel: add it to the folder your site serves as its root (often public/). Shopify: Bing's own Webmaster Tools page is the easier way for a shop.",
  "Then press \"Check my key file\".",
];
const WHY = { 400: "Bing said the request was not right", 403: "Bing could not find your key file, or it does not hold the key", 422: "these addresses are not on your site", 429: "too many submissions — Bing asks to wait; try again tomorrow" };

/** is the key file there and does it hold the key? */
export async function checkKeyFile({ origin, key, fetchImpl = fetch }) {
  try {
    const r = await fetchImpl(keyFileUrl(origin, key), { redirect: "follow", signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { ok: false, why: `${keyFileUrl(origin, key)} does not open (HTTP ${r.status}).` };
    return String(await r.text()).trim() === key ? { ok: true } : { ok: false, why: `${keyFileUrl(origin, key)} opens, but it does not hold the key text.` };
  } catch { return { ok: false, why: `${keyFileUrl(origin, key)} could not be opened.` }; }
}

/** submit live pages to IndexNow — one request for the batch; 200/202 = received */
export async function indexNow({ urls, key, origin, endpoint = INDEXNOW_ENDPOINT, fetchImpl = fetch }) {
  const host = new URL(origin).host;
  const mine = urls.filter((u) => { try { return new URL(u).host === host; } catch { return false; } });
  if (!mine.length) return { ok: false, why: "No published page of this site to submit." };
  try {
    const r = await fetchImpl(endpoint, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ host, key, keyLocation: keyFileUrl(origin, key), urlList: mine }), signal: AbortSignal.timeout(15000) });
    if (r.status === 200 || r.status === 202) return { ok: true, urls: mine, line: r.status === 202 ? "Received by Bing — it is still checking your key file." : "Received by Bing ✓" };
    return { ok: false, urls: mine, why: WHY[r.status] ?? `Bing answered HTTP ${r.status}` };
  } catch { return { ok: false, urls: mine, why: "Bing (IndexNow) could not be reached now." }; }
}

/** is the page in the site's sitemap? (Google reads new pages from the sitemap) */
export async function inSitemap({ origin, url, fetchImpl = fetch }) {
  try { const r = await fetchImpl(`${String(origin).replace(/\/$/, "")}/sitemap.xml`, { signal: AbortSignal.timeout(10000) }); return r.ok && String(await r.text()).includes(url); } catch { return false; }
}

/** each published page's submission state, in plain words */
export function submissionLines(records = [], submitted = {}) {
  const word = (x) => (!x ? "Not yet" : x.state === "SUBMITTED" ? `Submitted ✓ (${String(x.on).slice(0, 10)})${x.note ? ` — ${x.note}` : ""}` : `Failed — ${x.why}`);
  return records.filter((r) => r.state === "LIVE" && r.live).map((r) => ({ url: r.live, title: r.title, google: word(submitted[r.live]?.google), bing: word(submitted[r.live]?.bing) }));
}
