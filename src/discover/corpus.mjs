/**
 * THE INPUT BUNDLE, LOADED FROM GENERIC ROOTS — and nothing else is ever supplied.
 *
 * 🔴 WHAT MAY BE HANDED IN: a repository tree, a directory of archived responses, a directory of
 * rendered DOMs, sitemap material, a declared source registry. Roots, not locations. No suspected
 * file, no route, no component, no authority list, no expected class and no count.
 *
 * 🔴 AND NOTHING HERE MAY RECOGNISE A PRODUCT. Every rule below is either a filesystem fact (an
 * extension, a directory depth) or a published FRAMEWORK convention that holds for any repository
 * using that framework. A rule that fires only on one company's folder names would make the
 * examination meaningless, and `test/discover-portability.test.mjs` runs the whole layer over two
 * synthetic products with different layouts precisely so that cannot pass unnoticed.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";

/** Files worth reading as source. An extension list is a filesystem fact, not a product fact. */
export const SOURCE_EXTENSIONS = Object.freeze([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".md", ".mdx", ".json", ".yaml", ".yml"]);

/** Directories no repository means as source. Generic build/dependency noise. */
export const SKIP_DIRECTORIES = Object.freeze(["node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".turbo", ".vercel"]);

const MAX_FILE_BYTES = 512 * 1024;

/** Walk a tree, bounded, skipping build noise. Returns `{path, text}` with repo-relative paths. */
export function readTree(root, { maxFileBytes = MAX_FILE_BYTES } = {}) {
  if (typeof root !== "string" || root === "") throw new TypeError("readTree(root): a root is required — there is no default tree");
  const files = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith(".") && e.name !== ".well-known") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRECTORIES.includes(e.name)) walk(full); continue; }
      if (!SOURCE_EXTENSIONS.includes(extname(e.name))) continue;
      let st; try { st = statSync(full); } catch { continue; }
      if (st.size > maxFileBytes) continue;
      let text; try { text = readFileSync(full, "utf8"); } catch { continue; }
      files.push({ path: relative(root, full).split(sep).join("/"), text });
    }
  };
  walk(root);
  return files;
}

/**
 * ── 🔴 ROUTE DERIVATION: A FRAMEWORK CONVENTION, DECLARED AS ONE ────────────────────────────────
 *
 * File-based routing is published behaviour of several frameworks, and the mapping below is that
 * behaviour written down — not a guess about one repository. Each rule states the convention it
 * implements, so a reader can check it against that framework's documentation rather than against
 * the repository it happens to be pointed at.
 *
 * A path matching no rule yields NO route. That is deliberate: inventing a route for an
 * unrecognised layout is how a binder starts manufacturing relationships.
 */
export const ROUTE_CONVENTIONS = Object.freeze([
  Object.freeze({ name: "app-router page file", test: /^(?:src\/)?app\/(.*\/)?page\.(?:t|j)sx?$/, strip: /^(?:src\/)?app\//, drop: /page\.(?:t|j)sx?$/ }),
  Object.freeze({ name: "pages-router file", test: /^(?:src\/)?pages\/(?!api\/).*\.(?:t|j)sx?$/, strip: /^(?:src\/)?pages\//, drop: /(?:\/index)?\.(?:t|j)sx?$/ }),
  Object.freeze({ name: "content collection document", test: /^(?:src\/)?content\/.*\.mdx?$/, strip: /^(?:src\/)?content\//, drop: /\.mdx?$/ }),
  Object.freeze({ name: "routes directory", test: /^(?:src\/)?routes\/.*\.(?:t|j)sx?$/, strip: /^(?:src\/)?routes\//, drop: /(?:\/index)?\.(?:t|j)sx?$/ }),
]);

/** A route group segment `(name)` is not part of the URL — an app-router convention. */
const dropGroups = (s) => s.split("/").filter((seg) => !(seg.startsWith("(") && seg.endsWith(")"))).join("/");

/** Derive the route a source file serves, or null. Dynamic segments are kept as their bracket form. */
export function routeOf(path) {
  for (const c of ROUTE_CONVENTIONS) {
    if (!c.test.test(path)) continue;
    let rest = path.replace(c.strip, "").replace(c.drop, "");
    rest = dropGroups(rest).replace(/\/+$/, "");
    return { route: "/" + rest.replace(/^\/+/, ""), convention: c.name };
  }
  return null;
}

/** A URL's path, normalised the way routes are, so the two can be compared without guessing. */
export function pathOfUrl(url) {
  try { const u = new URL(url); return u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : u.pathname; }
  catch { const s = String(url ?? ""); return s.startsWith("/") ? s.replace(/\/+$/, "") || "/" : ""; }
}

/**
 * Load every archived response in a directory: `<name>.html` beside an optional `<name>.headers.json`.
 * The pairing is by filename stem — a filesystem fact. Nothing here reads which page is which.
 */
export function readArchivedPages(dir) {
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir).filter((f) => f.endsWith(".html")).sort();
  return names.map((f) => {
    const stem = f.slice(0, -".html".length);
    const headersPath = join(dir, `${stem}.headers.json`);
    let headers = null;
    if (existsSync(headersPath)) { try { headers = JSON.parse(readFileSync(headersPath, "utf8")); } catch { headers = null; } }
    return { stem, html: readFileSync(join(dir, f), "utf8"), headersRecord: headers };
  });
}

/** Every `<a href>` in a body. One extractor, shared, so two callers cannot disagree about a link. */
export function renderedLinksOf(html) {
  const out = [];
  for (const m of String(html ?? "").matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)) out.push(m[1]);
  return out;
}

/** Sitemap URLs from any `<loc>` set. Shape is the sitemap standard, not a product's. */
export function sitemapUrlsOf(xml) {
  return [...String(xml ?? "").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
}
