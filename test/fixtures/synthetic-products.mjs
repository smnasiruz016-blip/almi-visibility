/**
 * TWO SYNTHETIC PRODUCTS WITH DIFFERENT LAYOUTS — the portability fixture for the discovery layer.
 *
 * 🔴 NOTHING HERE IS COPIED OR DERIVED FROM ANY CORPUS. The hosts are `.invalid` (reserved, resolves
 * nowhere), the subjects are colours, shapes and tools, and the two products disagree about
 * everything a product-specific rule could latch onto:
 *
 *   product P   app-router layout   src/app/<route>/page.tsx      routes /… from directory names
 *   product Q   pages + content     pages/<route>.tsx, content/…  routes /… from filenames
 *
 * If discovery only worked on one of them, it would be fitted to a layout rather than generic, and
 * the six proofs below would not both hold.
 */

/* ── PRODUCT P — app router ─────────────────────────────────────────────────────────────────── */
export const PRODUCT_P = Object.freeze({
  files: Object.freeze([
    { path: "src/lib/palette.ts", text: `export const SWATCHES = Object.freeze(["red", "amber", "green"]);\nexport const TOOLS = Object.freeze(["saw", "plane", "chisel", "rasp"]);\n` },
    /* A · DEFECT — states four swatches while the producer it names can only make three. */
    { path: "src/app/swatches/page.tsx", text: `import { SWATCHES } from "../../lib/palette";\nexport default function P(){ return <p>Available in "red, amber, green, indigo" today. {SWATCHES.length}</p>; }\n` },
    /* A · CLEAN — states a subset of the same producer. */
    { path: "src/app/swatches-ok/page.tsx", text: `import { SWATCHES } from "../../lib/palette";\nexport default function P(){ return <p>Available in "red, amber" today. {SWATCHES.length}</p>; }\n` },
    /* B · a citation the document itself carries. */
    { path: "src/app/standards/page.tsx", text: `export default function P(){ return <a href="https://board-p.invalid/rules/v2">the governing board</a>; }\n` },
    { path: "src/app/standards-ok/page.tsx", text: `export default function P(){ return <a href="https://known-p.invalid/spec">the published spec</a>; }\n` },
    /* E · DEFECT — says three, the collection it names holds four. */
    { path: "src/app/tools/page.tsx", text: `import { TOOLS } from "../../lib/palette";\nexport default function P(){ return <p>"Choose from three tools"</p>; }\n` },
    /* E · CLEAN — says four, the collection holds four. */
    { path: "src/app/tools-ok/page.tsx", text: `import { TOOLS } from "../../lib/palette";\nexport default function P(){ return <p>"Choose from four tools"</p>; }\n` },
    /* F · DEFECT — declares two internal links; the render carries one. */
    { path: "src/app/hub/page.tsx", text: `export default function P(){ return (<nav><a href="/hub/one">one</a><a href="/hub/two">two</a></nav>); }\n` },
    /* F · CLEAN — declares two, the render carries both. */
    { path: "src/app/hub-ok/page.tsx", text: `export default function P(){ return (<nav><a href="/hub/one">one</a><a href="/hub/two">two</a></nav>); }\n` },
    /* C · DEFECT — declares a cached route; the stored responses miss three times running. */
    { path: "src/app/cached/page.tsx", text: `export const revalidate = 3600;
export default function P(){ return <p>Cached.</p>; }
` },
    /* C · CLEAN — declares the same, and is served from cache. */
    { path: "src/app/cached-ok/page.tsx", text: `export const revalidate = 3600;
export default function P(){ return <p>Cached.</p>; }
` },
    /* An input carrying nothing of any kind — the NOT_APPLICABLE case. */
    { path: "src/app/quiet/page.tsx", text: `export default function P(){ return <p>A short greeting.</p>; }\n` },
  ]),
  pages: Object.freeze([
    { url: "https://p.invalid/swatches", html: `<html><body><p>Available in "red, amber, green, indigo" today.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT", "cache-control": "public, max-age=60" } }] } },
    { url: "https://p.invalid/swatches-ok", html: `<html><body><p>Available in "red, amber" today.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://p.invalid/standards", html: `<html><body><a href="https://board-p.invalid/rules/v2">board</a></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://p.invalid/standards-ok", html: `<html><body><a href="https://known-p.invalid/spec">spec</a></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://p.invalid/tools", html: `<html><body><p>Choose from three tools</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://p.invalid/tools-ok", html: `<html><body><p>Choose from four tools</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://p.invalid/hub", html: `<html><body><nav><a href="/hub/one">one</a></nav></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://p.invalid/hub-ok", html: `<html><body><nav><a href="/hub/one">one</a><a href="/hub/two">two</a></nav></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://p.invalid/cached", html: `<html><body><p>Cached.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } }, { status: 200, headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } }, { status: 200, headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } }] } },
    { url: "https://p.invalid/cached-ok", html: `<html><body><p>Cached.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT", "cache-control": "public, max-age=60" } }, { status: 200, headers: { "x-vercel-cache": "HIT", "cache-control": "public, max-age=60" } }, { status: 200, headers: { "x-vercel-cache": "HIT", "cache-control": "public, max-age=60" } }] } },
    /* D · DEFECT — advertised in the sitemap, fetched, and it does not resolve. */
    { url: "https://p.invalid/dead", html: `<html><body>not found</body></html>`, headersRecord: { requests: [{ status: 404, headers: {} }] } },
    { url: "https://p.invalid/quiet", html: `<html><body><p>A short greeting.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
  ]),
  sitemapXml: Object.freeze([`<urlset><url><loc>https://p.invalid/swatches</loc></url><url><loc>https://p.invalid/quiet</loc></url><url><loc>https://p.invalid/dead</loc></url></urlset>`]),
  registry: Object.freeze({ readable: true, records: Object.freeze([{ authority: "known-p.invalid", predicate: "cited-as-authority", value: "known-p.invalid" }]) }),
  missRunRequired: 3,
});

/* ── PRODUCT Q — pages router + content collection, different names throughout ───────────────── */
export const PRODUCT_Q = Object.freeze({
  files: Object.freeze([
    { path: "lib/catalogue.js", text: `export const SIZES = Object.freeze(["sm", "md", "lg"]);\nexport const ROUTESET = Object.freeze(["alpha", "beta", "gamma", "delta", "epsilon"]);\n` },
    { path: "pages/sizes.tsx", text: `import { SIZES } from "../lib/catalogue";\nexport default function Q(){ return <p>"sm, md, lg, xl" in stock. {SIZES.length}</p>; }\n` },
    { path: "pages/sizes-ok.tsx", text: `import { SIZES } from "../lib/catalogue";\nexport default function Q(){ return <p>"sm, md" in stock. {SIZES.length}</p>; }\n` },
    { path: "pages/refs.tsx", text: `export default function Q(){ return <a href="https://council-q.invalid/register">the council</a>; }\n` },
    { path: "pages/refs-ok.tsx", text: `export default function Q(){ return <a href="https://listed-q.invalid/list">the list</a>; }\n` },
    { path: "pages/routes.tsx", text: `import { ROUTESET } from "../lib/catalogue";\nexport default function Q(){ return <p>"We publish four routes"</p>; }\n` },
    { path: "pages/routes-ok.tsx", text: `import { ROUTESET } from "../lib/catalogue";\nexport default function Q(){ return <p>"We publish five routes"</p>; }\n` },
    { path: "content/index.md", text: `See [alpha](/docs/alpha) and [beta](/docs/beta).\n` },
    { path: "content/index-ok.md", text: `See [alpha](/docs/alpha) and [beta](/docs/beta).\n` },
    { path: "pages/warm.tsx", text: `export const revalidate = 60;
export default function Q(){ return <p>Warm.</p>; }
` },
    { path: "pages/warm-ok.tsx", text: `export const revalidate = 60;
export default function Q(){ return <p>Warm.</p>; }
` },
    { path: "pages/still.tsx", text: `export default function Q(){ return <p>Nothing notable.</p>; }\n` },
  ]),
  pages: Object.freeze([
    { url: "https://q.invalid/sizes", html: `<html><body><p>"sm, md, lg, xl" in stock.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://q.invalid/sizes-ok", html: `<html><body><p>"sm, md" in stock.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://q.invalid/refs", html: `<html><body><a href="https://council-q.invalid/register">council</a></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://q.invalid/refs-ok", html: `<html><body><a href="https://listed-q.invalid/list">list</a></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://q.invalid/routes", html: `<html><body><p>We publish four routes</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://q.invalid/routes-ok", html: `<html><body><p>We publish five routes</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://q.invalid/index", html: `<html><body><a href="/docs/alpha">a</a></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://q.invalid/index-ok", html: `<html><body><a href="/docs/alpha">a</a><a href="/docs/beta">b</a></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
    { url: "https://q.invalid/warm", html: `<html><body><p>Warm.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } }, { status: 200, headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } }, { status: 200, headers: { "x-vercel-cache": "MISS", "cache-control": "private, no-store" } }] } },
    { url: "https://q.invalid/warm-ok", html: `<html><body><p>Warm.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT", "cache-control": "public, max-age=60" } }, { status: 200, headers: { "x-vercel-cache": "HIT", "cache-control": "public, max-age=60" } }, { status: 200, headers: { "x-vercel-cache": "HIT", "cache-control": "public, max-age=60" } }] } },
    { url: "https://q.invalid/dead", html: `<html><body>not found</body></html>`, headersRecord: { requests: [{ status: 404, headers: {} }] } },
    { url: "https://q.invalid/still", html: `<html><body><p>Nothing notable.</p></body></html>`, headersRecord: { requests: [{ status: 200, headers: { "x-vercel-cache": "HIT" } }] } },
  ]),
  sitemapXml: Object.freeze([`<urlset><url><loc>https://q.invalid/sizes</loc></url><url><loc>https://q.invalid/still</loc></url><url><loc>https://q.invalid/dead</loc></url></urlset>`]),
  registry: Object.freeze({ readable: true, records: Object.freeze([{ authority: "listed-q.invalid", predicate: "cited-as-authority", value: "listed-q.invalid" }]) }),
  missRunRequired: 3,
});
