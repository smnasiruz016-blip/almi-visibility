// ONE DIRECTORY, ONE SOURCE OF TRUTH, THREE CONSUMERS.
//
//   content/learn/*.md  ->  the routes      (generateStaticParams)
//                       ->  the /learn hub  (derived, never hand-maintained)
//                       ->  the sitemap     (via src/app/sitemap.ts)
//
// Fifth port of this system: almi-celpip -> almi-prep-v2 (#85) -> almi-pte (#79) ->
// almi-cv-v2 (#99) -> here. Same schema, same ordering rules, AlmiItalian naming.
//
// ── WHY THE HUB IS DERIVED AND NOT A LIST ───────────────────────────────────
// AlmiOET's register pages were orphaned because /register returned 404: Google had no path to
// any of them and none were ever indexed — 144,266 pages behind a door that did not open. A
// hand-maintained hub fails the same way one article at a time: someone adds article 41 and
// forgets the hub line. Deriving the hub from the directory makes orphaning IMPOSSIBLE rather
// than remembered, and "remembered" is exactly what failed there.
//
// ── WHY STRUCTURE IS FRONTMATTER AND NOT PROSE ──────────────────────────────
// title, description, CTA, related links and sources are IDENTICAL in shape on every article.
// Identical things can be typed, and typed things can be gated: a build can assert every
// article declares a CTA and fail the day article 41 forgets one. The same CTA written as a
// line of prose is unreachable by any check, and by article 40 it will have drifted into six
// shapes. Body prose stays markdown, because prose is not identical in shape and must not be
// forced to be.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { renderTokens } from "./tokens";

export const LEARN_BASE = "/learn";
export const CONTENT_DIR = join(process.cwd(), "content", "learn");

/** A slug is the filename. It is also the URL, so it is constrained. */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const linkSchema = z.strictObject({
  label: z.string().min(1),
  /** Another article's slug. Optional: an article may point at one not yet written, which is
   *  normal while a set is being authored. The template renders the label either way and links
   *  only when it resolves. */
  slug: z.string().regex(slugPattern).optional(),
});

const sourceSchema = z.strictObject({
  label: z.string().min(1),
  url: z.url(),
});

/** strictObject, not object: an unrecognised key is a FAILURE, not ignored silence. `ctas:`
 *  instead of `cta:` would otherwise parse as "cta missing" in one place and "harmless extra"
 *  in another; here it is one loud error naming the file. */
export const frontmatterSchema = z.strictObject({
  title: z.string().min(1),
  /** Single line — it becomes the meta description, where a newline is a defect. */
  description: z.string().min(1).refine((s) => !s.includes("\n"), "must be a single line"),
  /** Hub grouping, e.g. "CILS B1 Cittadinanza". */
  section: z.string().min(1),
  /** Position within the section on the hub. */
  order: z.number().int().nonnegative(),
  cta: z.strictObject({
    label: z.string().min(1),
    /** Must resolve to a REAL route — the content gate checks it against routes it ENUMERATES
     *  from the app directory at runtime, not against a hardcoded list. */
    href: z.string().startsWith("/"),
    note: z.string().optional(),
  }),
  related: z.array(linkSchema).default([]),
  sources: z.array(sourceSchema).default([]),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export type Article = Frontmatter & {
  slug: string;
  /** Markdown body, frontmatter stripped. */
  body: string;
  /** Derived, never declared — a declared word count drifts from its prose. */
  wordCount: number;
  /** Path relative to the site root. */
  path: string;
};

function parseOne(file: string): Article {
  const slug = file.replace(/\.md$/, "");
  if (!slugPattern.test(slug)) {
    throw new Error(`content/learn/${file}: filename is not a valid slug`);
  }
  const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
  const { data, content } = matter(raw);
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    // Loud and specific: a build must not ship an article with missing structure.
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`content/learn/${file}: invalid frontmatter — ${issues}`);
  }
  // Engine numbers resolve HERE, in the loader, not in the page — so the routes, the hub, the
  // sitemap, the content gate and the token gate all read the same resolved text and none of them
  // can disagree about what a page says. renderTokens THROWS on an unknown token: a build that
  // stops beats a public page reading "{{CILS_B1C_FLOR}}".
  //
  // title and description are tokenised too, not just the body: /guides/cils-b1-cittadinanza
  // renders CILS_B1C_SECTION_MAX and CILS_B1C_TOTAL_MAX inside its meta DESCRIPTION today, and a
  // body-only mechanism would have silently dropped that in the migration.
  const where = `content/learn/${file}`;
  const body = renderTokens(content.trim(), where);
  return {
    ...parsed.data,
    title: renderTokens(parsed.data.title, where),
    description: renderTokens(parsed.data.description, where),
    slug,
    body,
    wordCount: body.split(/\s+/).filter(Boolean).length,
    path: `${LEARN_BASE}/${slug}`,
  };
}

let cache: Article[] | null = null;

/**
 * The order a reader meets the problem in, with orientation first.
 *
 * THIS IS A PREFERENCE, NOT AN ALLOWLIST. A section not listed here still appears on the hub:
 * it sorts after every listed section, alphabetically among the other unlisted ones. Dropping
 * an unlisted section would let a typo in one `section:` line silently delete a page from the
 * hub — exactly the orphaning this system exists to prevent. A page must never disappear
 * because it was filed under a name nobody had thought of yet.
 */
export const SECTION_ORDER: readonly string[] = [
  "Start here",
  "CILS B1 Cittadinanza",
  "CILS beyond citizenship",
  "CELI",
  "Citizenship & residence",
  "Preparing honestly",
];

/** Listed sections rank by position; unlisted ones share the rank just past the end, so they
 *  land after the list and tie — the tie falls through to an alphabetical compare. */
function sectionRank(section: string): number {
  const i = SECTION_ORDER.indexOf(section);
  return i === -1 ? SECTION_ORDER.length : i;
}

export function compareSections(a: string, b: string): number {
  const ra = sectionRank(a);
  const rb = sectionRank(b);
  return ra === rb ? a.localeCompare(b) : ra - rb;
}

/** Every article, sorted for the hub: section (SECTION_ORDER), then order, then slug. */
export function getAllArticles(): Article[] {
  if (cache) return cache;
  if (!existsSync(CONTENT_DIR)) return (cache = []);
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md")).sort();
  const all = files.map(parseOne);
  all.sort((a, b) =>
    a.section === b.section
      ? a.order === b.order
        ? a.slug.localeCompare(b.slug)
        : a.order - b.order
      : compareSections(a.section, b.section),
  );
  return (cache = all);
}

export function getArticle(slug: string): Article | null {
  return getAllArticles().find((a) => a.slug === slug) ?? null;
}

/** Articles grouped by section, in hub order. */
export function getSections(): { section: string; articles: Article[] }[] {
  const out: { section: string; articles: Article[] }[] = [];
  for (const a of getAllArticles()) {
    const last = out[out.length - 1];
    if (last && last.section === a.section) last.articles.push(a);
    else out.push({ section: a.section, articles: [a] });
  }
  return out;
}

/** Every /learn URL — the hub itself plus one per article. src/app/sitemap.ts calls THIS, so
 *  the directory scan is the only source of these URLs and the sitemap cannot drift from the
 *  routes. */
export function learnUrls(): string[] {
  return [LEARN_BASE, ...getAllArticles().map((a) => a.path)];
}
