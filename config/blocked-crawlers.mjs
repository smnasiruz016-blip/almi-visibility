/**
 * THE 16 BLOCKED USER-AGENTS, CLASSIFIED FROM THE OPERATORS' OWN DOCUMENTATION.
 *
 * ── 🔴 WHY THIS EXISTS ──────────────────────────────────────────────────────
 *
 * 13 repositories carry an identical 16-agent block list and **no commit
 * explains why those 16**. The list mixes two completely different kinds of
 * bot, and that mixture is the whole finding:
 *
 *   · SEO backlink scrapers — blocking them saves money and costs nothing.
 *   · AI answer engines — blocking them removes the product from AI answers
 *     entirely, which is half of what AlmiVisibility exists to improve.
 *
 * ── 🔴 §832: NEVER INVENT A CRAWLER'S NAME, PURPOSE OR RULES ────────────────
 *
 * Every row cites the OPERATOR'S OWN page and the date it was read. Where the
 * operator publishes nothing, the row is **UNKNOWN** — not filled in from
 * third-party articles or from recollection.
 *
 * ⚠️ NO RECOMMENDATION IS MADE HERE about which to unblock. That is the
 * owner's, and it is deliberately not this file's business.
 */

export const READ_DATE = "2026-09-12";

export const CATEGORIES = Object.freeze([
  "AI_TRAINING",
  "AI_SEARCH",
  "AI_USER_FETCH",
  "SEO_BACKLINK",
  "SEARCH_INDEX",
  "UNKNOWN",
]);

export const BLOCKED_CRAWLERS = Object.freeze([
  {
    agent: "GPTBot", operator: "OpenAI", category: "AI_TRAINING",
    purpose: "Crawls content that may be used to train OpenAI's foundation models.",
    quote: "crawl content that may be used in training our generative AI foundation models",
    source: "https://developers.openai.com/api/docs/bots", tier: "OFFICIAL",
  },
  {
    agent: "OAI-SearchBot", operator: "OpenAI", category: "AI_SEARCH",
    purpose: "Surfaces sites in ChatGPT's search results.",
    quote: "used to surface websites in search results in ChatGPT's search features",
    source: "https://developers.openai.com/api/docs/bots", tier: "OFFICIAL",
    remarks: "Blocking it removes the site from ChatGPT search answers.",
  },
  {
    agent: "ChatGPT-User", operator: "OpenAI", category: "AI_USER_FETCH",
    purpose: "Visits a page when a ChatGPT user's own action requires it.",
    quote: "for certain user actions in ChatGPT and Custom GPTs",
    source: "https://developers.openai.com/api/docs/bots", tier: "OFFICIAL",
    remarks: "The doc says it is 'not used for crawling the web in an automatic fashion'.",
  },
  {
    agent: "ClaudeBot", operator: "Anthropic", category: "AI_TRAINING",
    purpose: "Collects web content that may contribute to training Claude models.",
    quote: "helps enhance the utility and safety of our generative AI models",
    source: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler",
    tier: "OFFICIAL",
    remarks: "The same page documents Claude-User and Claude-SearchBot, neither of which is on the block list.",
  },
  {
    /* 🔴 THE ONE HONEST UNKNOWN. Anthropic's current crawler page names only
     * ClaudeBot, Claude-User and Claude-SearchBot. `anthropic-ai` is not on it.
     * Third parties call it legacy; that is not recorded as fact. */
    agent: "anthropic-ai", operator: "UNKNOWN", category: "UNKNOWN",
    purpose: "UNKNOWN — operator documentation not found.",
    quote: null, source: null, tier: "UNKNOWN",
    remarks: "Not named on Anthropic's current crawler page. No operator source found; nothing substituted.",
  },
  {
    agent: "CCBot", operator: "Common Crawl Foundation", category: "AI_TRAINING",
    purpose: "Builds a free, open repository of web crawl data.",
    quote: "producing and maintaining an open repository of web crawl data",
    source: "https://commoncrawl.org/ccbot", tier: "OFFICIAL",
    /* ⚠️ A FORCED FIT, FLAGGED AS OURS. Common Crawl's pages describe an open
     * research dataset and never claim model training. AI_TRAINING is the
     * nearest bulk-corpus bucket in our taxonomy — it is not their claim. */
    forcedFit: true,
    remarks: "TAXONOMY GAP, not an operator claim. Their pages say 'research and analysis', never training.",
  },
  {
    agent: "Bytespider", operator: "ByteDance (Toutiao Search)", category: "SEARCH_INDEX",
    purpose: "Toutiao Search's index crawler.",
    quote: "头条搜索的爬虫UA为“Bytespider”",
    source: "https://zhanzhang.toutiao.com/docs/intro/26899", tier: "OFFICIAL",
    remarks:
      "🔴 The operator doc contradicts its popular reputation: it documents a conventional search-index " +
      "crawler and makes NO AI-training claim anywhere on the page.",
  },
  {
    agent: "Amazonbot", operator: "Amazon", category: "AI_TRAINING",
    purpose: "Improves Amazon products and services; may feed model training.",
    quote: "may be used to train Amazon AI models",
    source: "https://developer.amazon.com/amazonbot", tier: "OFFICIAL",
    remarks: "The same page splits out Amzn-SearchBot, which 'does not crawl content for generative AI model training'.",
  },
  {
    agent: "PerplexityBot", operator: "Perplexity", category: "AI_SEARCH",
    purpose: "Indexes pages so they can be surfaced and linked in Perplexity answers.",
    quote: "surface and link websites in search results on Perplexity",
    source: "https://docs.perplexity.ai/guides/bots", tier: "OFFICIAL",
    remarks: "The doc states explicitly it is 'not used to crawl content for AI foundation models'.",
  },
  {
    agent: "Google-Extended", operator: "Google", category: "AI_TRAINING",
    purpose: "Publisher control over use of crawled content for Gemini training and grounding.",
    quote: "may be used for training future generations of Gemini models",
    source: "https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers", tier: "OFFICIAL",
    secondaryCategory: "AI_SEARCH",
    remarks: "A standalone product token, not a fetching crawler. Does NOT affect Google Search ranking.",
  },
  {
    agent: "AhrefsBot", operator: "Ahrefs", category: "SEO_BACKLINK",
    purpose: "Builds the Ahrefs marketing-intelligence database.",
    quote: "Powers the database for both Ahrefs, a marketing intelligence platform, and Yep",
    source: "https://ahrefs.com/robot", tier: "OFFICIAL", secondaryCategory: "SEARCH_INDEX",
  },
  {
    agent: "SemrushBot", operator: "Semrush", category: "SEO_BACKLINK",
    purpose: "Collects web data for Semrush's SEO tools and backlink index.",
    quote: "discover and collect new and updated web data",
    source: "https://www.semrush.com/bot/", tier: "OFFICIAL",
  },
  {
    agent: "MJ12bot", operator: "Majestic-12 Ltd", category: "SEO_BACKLINK",
    purpose: "Maps link relationships for Majestic's backlink index.",
    quote: "added to the largest public backlinks search engine index",
    source: "https://mj12bot.com/", tier: "OFFICIAL", secondaryCategory: "SEARCH_INDEX",
  },
  {
    agent: "DotBot", operator: "Moz", category: "SEO_BACKLINK",
    purpose: "Gathers web data for the Moz Link Index.",
    quote: "gathers web data for the Moz Link Index",
    source: "https://moz.com/help/moz-procedures/crawlers/dotbot", tier: "OFFICIAL",
  },
  {
    agent: "DataForSeoBot", operator: "DataForSEO", category: "SEO_BACKLINK",
    purpose: "Builds and refreshes DataForSEO's backlink database.",
    quote: "constantly crawling the web to add new links to our backlink database",
    source: "https://dataforseo.com/dataforseo-bot", tier: "OFFICIAL",
  },
  {
    agent: "PetalBot", operator: "Huawei (Aspiegel SE)", category: "SEARCH_INDEX",
    purpose: "Indexes sites for the Petal search engine.",
    quote: "an automatic program of the Petal search engine",
    source: "https://aspiegel.com/petalbot", tier: "OFFICIAL",
    remarks: "The index also powers Huawei Assistant and its AI Search services.",
  },
]);

/** Counts, so a reader sees the mixture rather than inferring it. */
export function categoryCensus() {
  const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0]));
  for (const a of BLOCKED_CRAWLERS) c[a.category] += 1;
  return c;
}
