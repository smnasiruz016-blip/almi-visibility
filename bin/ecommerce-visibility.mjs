#!/usr/bin/env node
/**
 * F96 · E-COMMERCE VISIBILITY (acceptance _handoffs AlmiVisibility_F96_ACCEPTANCE_2026-10-18.md; RR-290 T3) — READ-ONLY; nothing fetched,
 * crawled, edited, sent or written.
 *
 *   node bin/ecommerce-visibility.mjs --subject=<id> --tenant=<id> --actor=<id>
 *
 * One declared project at a time: its own commerce declaration (commerce.json in its subject directory). APPLICABLE only when it declares that
 * it sells listed products and names its own feed or listing files; then its feed against its verified facts, its listing export against its
 * feed, and the paginated and filter pages of its own crawl — each from the files its declaration names, inside its own subject directory.
 * NOT APPLICABLE prints one line, the name and the reason, and no number (C5).
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupSubject } from "../src/tenancy/root-registry.mjs";
import { applicability, feedAgainstFacts, listingsAgainstFeed, classFacetPages, f96Lines, F96_STATE } from "../src/commerce/ecommerce-visibility.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject");
if (!SUBJECT) { console.error("usage: node bin/ecommerce-visibility.mjs --subject=<id> --tenant=<id> --actor=<id> — nothing read"); process.exit(2); }
scopedEntryPoint({ entry: "bin/ecommerce-visibility.mjs", governed: false, resources: [RESOURCES.subject(SUBJECT)] });
const subject = lookupSubject(rootIndexFor(process.env), SUBJECT);
if (subject.state !== "DECLARED") { console.error(`🔴 REFUSED — the subject is not declared (${subject.state}); nothing read`); process.exit(3); }
/* a declared file is read only from inside the project's own subject directory */
const inside = (f) => { const p = resolve(subject.dir, f); const r = relative(subject.dir, p); return r && !r.startsWith("..") && !isAbsolute(r) ? p : null; };
const json = (f) => { const p = f ? inside(f) : null; return p && existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; };
const declaration = json("commerce.json");
const verdict = applicability({ projectId: SUBJECT, declaration });
let feed = null, listings = null, facets = null;
if (verdict.state === F96_STATE.APPLICABLE) {
  const rowsOf = (list) => list.flatMap((f) => { const v = json(f); return Array.isArray(v) ? v : Array.isArray(v?.products) ? v.products : []; });
  const feedRows = rowsOf(verdict.feedFiles), listingRows = rowsOf(verdict.listingFiles);
  const facts = json(declaration.factsFile);
  const crawl = json(declaration.crawlFile);
  if (feedRows.length && Array.isArray(facts?.products)) feed = feedAgainstFacts({ feed: feedRows, facts: facts.products });
  if (feedRows.length && listingRows.length) listings = listingsAgainstFeed({ feed: feedRows, listings: listingRows });
  if (Array.isArray(crawl?.pages)) facets = classFacetPages({ pages: crawl.pages });
}
console.log("F96 · E-COMMERCE VISIBILITY — the project's own declaration and files only; nothing fetched, crawled, edited or written");
for (const l of f96Lines({ verdict, feed, listings, facets })) console.log(`  ${l}`);
