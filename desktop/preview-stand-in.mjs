/**
 * 🔴 RR-404 · THE PREVIEW STAND-IN, AS THE PREVIEW WILL BE (the real proof: AlmiOET's 8 Nov 23:57 cycle held 118 pages back on
 * "Last checked" 16 — all 16 were pages the preview branch REMOVES; the stand-in read the live sitemap, found them there and scanned their
 * old live copies, while the preview itself lists and serves none of them).
 *
 * When Vercel's protection hides the preview, the scan reads the preview's app pages from the branch's own files and everything else from
 * the live site. A page the branch removes (in production's folder, not in the branch's) is answered as the preview answers it — 404 — and
 * the live sitemaps are read without it, because the site builds its sitemap from the same folder. Nothing is skipped: a page that still
 * links to a removed page fails "Internal links", as it would on the preview.
 *   previewStandIn({ live, held, gone, readPage, fetchImpl }) → fetch(u, init)
 *   removedSlugs(prodHeld, branchHeld) → Set of slugs
 *   scanPagesWritten(published, { preview, afterMerge }) → Set of urls the scan must find
 */
const slugOfPath = (pathname) => String(pathname ?? "").replace(/^\/+|\/+$/g, "");

/** the app pages production's folder holds that the branch's folder does not: the preview removes them */
export const removedSlugs = (prodHeld, branchHeld) => new Set([...(prodHeld?.keys?.() ?? [])].filter((s) => !branchHeld?.has?.(s)));

/** without a sitemap's <url> entries for the removed pages (a sitemap index is left as it is: its entries are sitemaps) */
export function withoutRemoved(xml, gone) {
  if (!gone?.size) return xml;
  return String(xml ?? "").replace(/<url>[\s\S]*?<\/url>\s*/gi, (block) => {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(block)?.[1];
    let slug = null; try { slug = slugOfPath(new URL(loc).pathname); } catch { slug = null; }
    return slug && gone.has(slug) ? "" : block;
  });
}

export function previewStandIn({ live, held, gone = new Set(), readPage, fetchImpl = fetch }) {
  return async (u, init) => {
    let p; try { p = new URL(u); } catch { return fetchImpl(u, init); }
    const slug = slugOfPath(p.pathname);
    if (p.origin === live && slug && !slug.includes("/")) {
      if (held.has(slug)) { const text = await Promise.resolve().then(() => readPage(slug)).catch(() => null); if (text != null) return new Response(text, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }); }
      else if (gone.has(slug)) return new Response("", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    const r = await fetchImpl(u.replace(/^https?:\/\/[^/]+/, live), init);
    if (!gone.size) return r;
    const ct = String(r.headers?.get?.("content-type") ?? "");
    if (!/xml/i.test(ct) && !/\.xml$/i.test(p.pathname)) return r;
    return new Response(withoutRemoved(await r.text(), gone), { status: r.status, headers: { "content-type": ct || "application/xml" } });
  };
}

/** 🔴 RR-404 (the 23:57 live scan: "Status 11" were the 11 new pages written only to the preview): a live scan looks for the pages that ARE
 *  live; the preview's pages count as live only on the preview, or on the live site right after the app merged them */
export const scanPagesWritten = (published, { preview = false, afterMerge = false } = {}) =>
  new Set((published ?? []).filter((x) => x.state === "LIVE" || (x.state === "PREVIEW" && (preview || afterMerge))).map((x) => x.url));
