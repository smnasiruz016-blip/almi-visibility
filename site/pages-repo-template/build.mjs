// AlmiVisibility's own pages: the build Vercel runs on every push (RR-388 A2). The app publishes visibility-pages/<slug>/index.html here;
// this copies them to out/ and writes visibility-pages/index.json (the list the main site's sitemap reads). Plain Node, no dependency.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const DIR = "visibility-pages", OUT = "out";
rmSync(OUT, { recursive: true, force: true }); mkdirSync(join(OUT, DIR), { recursive: true });
/* only an indexable page goes on the list the sitemap reads: a page marked noindex (fewer than 6 real Q&A) stays served, never listed */
const indexable = (f) => !/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(readFileSync(f, "utf8"));
const slugs = existsSync(DIR) ? readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && /^[a-z0-9][a-z0-9-]{1,90}$/.test(d.name) && existsSync(join(DIR, d.name, "index.html")) && indexable(join(DIR, d.name, "index.html"))).map((d) => d.name).sort() : [];
if (existsSync(DIR)) cpSync(DIR, join(OUT, DIR), { recursive: true });
writeFileSync(join(OUT, DIR, "index.json"), JSON.stringify({ on: new Date().toISOString(), pages: slugs.map((slug) => ({ slug })) }, null, 1));
writeFileSync(join(OUT, "index.html"), "<!doctype html><meta name=robots content=noindex><title>AlmiVisibility pages</title><p>These pages are served at almivisibility.almiworld.com.</p>");
console.log(`${slugs.length} pages`);
