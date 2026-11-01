/** RR-298 C · the first-run setup: the steps, one at a time, and the check of each answer (plain words when refused). Pure.
 *  RR-307 D (owner: "first time user ko kuch pata nahien chalta k kia kerna hay"): it starts with two plain questions — what do you want to
 *  grow, and do you have a website — and shows ONLY the steps that fit the answers ("show": always / website / youtube). Every choice says
 *  "Choose this if …", what it gives, what it costs and what it needs, and the best one for this client is marked "Recommended for you".
 *  No technical words on screen: a key is "your YouTube key", with a short how-to. Optional steps: "Skip for now — add later". */
import { chooseLanguages, LANGUAGES } from "../src/page/languages.mjs";
import { articleSettings, PUBLISH_MODE } from "../src/page/articles.mjs";
import { AI_PROVIDERS } from "./secrets.mjs";
import { socialFrom } from "./social-links.mjs"; // RR-353
const AI_PROVIDER_IDS = AI_PROVIDERS.map((p) => p.id);

export const GROW = Object.freeze(["website", "youtube", "shop", "several"]);
export const STEPS = Object.freeze([
  { n: 1, id: "goal", title: "What do you want to grow?", show: "always", ask: "Two quick questions, so Visibility shows you only what fits." },
  { n: 2, id: "product", title: "Your product", show: "always", ask: "Its name, its website if it has one, and what it does — in your own words. Visibility reads your website itself." },
  /* RR-302 C1 / RR-306: the client's own YouTube channel — optional; the key is pasted in the app (Windows' secure store) */
  { n: 3, id: "youtube", title: "Your YouTube channel", show: "youtube", optional: true, ask: "Your channel's @handle and your YouTube key. Before anything is read, Visibility shows you the channel and asks if it is yours." },
  /* RR-306 A2 / RR-307: optional steps can be skipped ("Skip for now — add later") and changed later from the product's Settings */
  { n: 4, id: "searchData", title: "What people search for", show: "website", optional: true, ask: "Where Visibility learns what people search before they find you. Choose one — you can add more later." },
  { n: 5, id: "languages", title: "Languages", show: "website", ask: `Which languages your pages are in: ${LANGUAGES.map((l) => l.name).join(", ")}.` },
  { n: 6, id: "articlesPerDay", title: "Articles per day", show: "website", ask: "How many articles a day Visibility prepares for you (1 is a good start; 0 pauses articles)." },
  { n: 7, id: "publishMode", title: "Publishing", show: "website", ask: "What happens to a page or article once it passes every check." },
  { n: 8, id: "aiConnection", title: "Your AI assistant (optional)", show: "always", optional: true, ask: "Connect your own AI account so Visibility can write with it. It is kept safely on this computer." },
  { n: 9, id: "start", title: "All set", show: "always", ask: "Check your answers — then Visibility checks your product straight away." },
]);
/** The steps that fit this product's answers to "What do you want to grow?" */
export function stepsFor(setup = {}) {
  const g = setup.goal ?? {};
  const site = g.hasWebsite === true || g.grow === "website" || g.grow === "shop";
  const yt = g.grow === "youtube" || g.grow === "several";
  return STEPS.filter((s) => s.show === "always" || (s.show === "website" && site) || (s.show === "youtube" && yt));
}

/* every choice in plain words: choose this if, what you get, cost, what you need; "recommended" picks the best for this client */
export const CHOICES = Object.freeze({
  grow: [
    { value: "website", label: "My website", chooseIf: "people find you through your website.", gives: "Checks, pages, articles and answers for your site.", cost: "Included in your plan.", needs: "Your website's address." },
    { value: "youtube", label: "My YouTube channel", chooseIf: "people find you through your videos.", gives: "Advice for every video, your channel, and new video ideas.", cost: "Included; uses your own free YouTube key.", needs: "Your channel's @handle and a YouTube key." },
    { value: "shop", label: "My online shop", chooseIf: "you sell online — your shop's pages are your website.", gives: "Checks and pages for your shop, prices read from your pages.", cost: "Included in your plan.", needs: "Your shop's address." },
    { value: "several", label: "Several of these", chooseIf: "you have a website and a YouTube channel.", gives: "Everything above, for both.", cost: "Included in your plan.", needs: "Your website's address and your channel's @handle." },
  ],
  searchData: [
    { value: 2, label: "Google Search Console", chooseIf: "your website is in Google Search Console (most sites are; it is free).", gives: "The real searches people make before they reach your pages.", cost: "Free.", needs: "To sign in to Google once — or its download file.", howTo: "Open search.google.com/search-console, pick your site, then Performance → Export → Download CSV. Or press \"Connect Google\" later on the product page." },
    /* RR-353 (owner): Bing next to Google — Bing Webmaster Tools' own searches, through the client's own Bing key or Bing's download file */
    { value: 4, label: "Bing Webmaster Tools", chooseIf: "your site is in Bing Webmaster Tools (free) — or you want Bing's searches too.", gives: "The real searches people make in Bing (and the AI search that reads Bing) before they reach your pages.", cost: "Free.", needs: "Your Bing key (made in Bing Webmaster Tools) — or its download file.", howTo: "Press \"Connect Bing\" on the product page (Search engines) — it shows where Bing keeps your key, step by step. Or: in Bing Webmaster Tools, Search Performance → Export, and add the file." },
    { value: 1, label: "A search service of your own", chooseIf: "you already pay a search-data service and have its key.", gives: "Wide search data: what people see for your topics.", cost: "You pay that service per search.", needs: "Your key from that service.", howTo: "Your search service's account page shows your key — copy it and paste it here." },
    { value: 3, label: "Your AI assistant's search", chooseIf: "you use an AI assistant account (Claude, ChatGPT, Gemini) for search.", gives: "How AI answers questions about your topics.", cost: "Your AI account's own price.", needs: "Your AI key (next steps).", howTo: "Connect your AI assistant in the step \"Your AI assistant\"." },
  ],
  publishMode: [
    { value: "AUTO_AFTER_GATES", label: "Automatically, once every check passes", chooseIf: "you trust the checks and want no extra work.", gives: "Pages go out without waiting for you.", cost: "Free.", needs: "Your site connected under Publish (WordPress, GitHub + Vercel or Shopify) — or choose export, posts or drafts only on Today's article." },
    { value: "REVIEW_FIRST", label: "Show me first", chooseIf: "you want to read every page before it goes out.", gives: "Nothing goes out until you approve it.", cost: "Free.", needs: "A few minutes of your time per page." },
  ],
});
export const HOWTO = Object.freeze({
  /* RR-357: DataForSEO's own names for the two keys, as its dashboard shows them (a provider's button names stay in the how-to) */
  dataForSeo: "In DataForSEO, open your Dashboard → \"API Access\". Your \"API login\" is the e-mail of your DataForSEO account; your \"API password\" is shown on that page (it is not the password you sign in with). Copy each one and paste it below.",
  youtube: "How to get a YouTube key (free, 5 minutes): open console.cloud.google.com → create a project → \"APIs & Services\" → Library → turn on \"YouTube Data API v3\" → Credentials → Create credentials → API key. Copy the key and paste it here.",
  anthropic: "How to get your Claude key: open console.anthropic.com → API Keys → Create key. Copy it and paste it here.",
  openai: "How to get your ChatGPT key: open platform.openai.com → API keys → Create new secret key. Copy it and paste it here.",
  gemini: "How to get your Gemini key: open aistudio.google.com → Get API key → Create key. Copy it and paste it here.",
  bing: "Bing Webmaster Tools: open bing.com/webmasters (add your site, or press Import from Google Search Console) → Settings (the gear) → API access → API Key → Generate, copy it and paste it on the Bing screen. Or add Bing's download file: Search Performance → Export.",
  google: "Google Search Console: press \"Connect Google\", sign in to Google in your browser and allow \"view\" access; then pick your site. Or add its download file: Performance → Export → Download CSV.",
});
/** The choice marked "Recommended for you" for this client. */
export function recommended(stepId, setup = {}) {
  const g = setup.goal ?? {};
  if (stepId === "searchData") return g.hasWebsite === false && g.grow === "youtube" ? null : 2;
  if (stepId === "publishMode") return "REVIEW_FIRST";
  if (stepId === "articlesPerDay") return 1;
  return null;
}

/**
 * RR-305 B1 · a website as people type it: "www.almiworld.com" or "almiworld.com" gets https:// added; a full http(s) address is kept as
 * typed. Null when it is not a web address (spaces, no dotted name when typed without https://). RR-307 E3: a "www." is NEVER added.
 */
export function webAddress(input) {
  const t = String(input ?? "").trim();
  if (!t || /\s/.test(t)) return null;
  if (/^https?:\/\/[^\s]+$/i.test(t)) return t;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return null;
  try { const u = new URL(`https://${t}`); return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname) ? `https://${t}` : null; } catch { return null; }
}

/*
 * 🔴 RR-351 (owner, 31 Oct 2026) · THE CLIENT'S OWN OFFER BUTTON — its words and its link, set in Settings → Your product. Every page's call
 * to act is this button; Visibility never makes one up, and with none set no page is made or published.
 */
export const NO_CTA = "Set your offer button first — Settings → Your product: the button's words (for example \"Try free for 48 hours\") and the page it opens on your site. Visibility makes and publishes no page without it.";
export const CTA_MAX = 80;
/** the product step's typed button (ctaLabel, ctaHref) → { cta } | { refused } | {} (none typed). The link is a full web address. */
export function ctaFrom(v = {}) {
  const label = String(v.ctaLabel ?? "").replace(/\s+/g, " ").trim(), href0 = String(v.ctaHref ?? "").trim();
  if (!label && !href0) return {};
  if (!label || !href0) return { refused: "Give the offer button both its words and its link — or leave both empty." };
  if (label.length < 3 || label.length > CTA_MAX) return { refused: `The button's words: 3 to ${CTA_MAX} characters.` };
  if (/[<>]/.test(label)) return { refused: "The button's words cannot hold < or >." };
  const href = webAddress(href0);
  if (!href || !/^https?:\/\/[^/]+\.[^/]+|^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(href)) return { refused: "The button's link: a full web address (for example https://yoursite.com/signup)." };
  return { cta: { label, href } };
}
/** the button a product's pages carry (null when none is set) */
export const ctaOfSetup = (setup = {}) => { const c = setup?.product?.cta; return c && typeof c.label === "string" && c.label.trim() && /^https?:\/\//i.test(String(c.href ?? "")) ? { label: c.label, href: c.href } : null; };

/** Validate one setup answer — plain words when it is refused. */
export function checkStep(id, v) {
  switch (id) {
    case "goal": return GROW.includes(v?.grow) && typeof v?.hasWebsite === "boolean" ? null : "Choose what you want to grow, and say whether this product has a website.";
    /* RR-307: the website is asked only when the product has one (a YouTube-only product may give its channel's address, or none) */
    case "product": return v && v.name?.trim() && (v.site === undefined || v.site === "" || v.site === null || webAddress(v.site)) && v.what?.trim() ? (ctaFrom(v).refused ?? socialFrom(v.social ?? {}).refused ?? null) : "Give the product's name, its website if it has one (for example almiworld.com) and what it does.";
    case "searchData": return v?.skipped === true || [1, 2, 3, 4].includes(Number(v?.option)) ? null : "Choose one — or Skip for now.";
    case "languages": { const c = chooseLanguages(v?.codes ?? []); return c.valid ? null : c.faults.join("; "); }
    case "articlesPerDay": { const s = articleSettings({ articlesPerDay: Number(v?.perDay) }); return s.valid ? null : s.faults.join("; "); }
    case "publishMode": return Object.values(PUBLISH_MODE).includes(v?.mode) ? null : "Choose: automatically once every check passes, or show me first.";
    /* RR-306: a provider (its key pasted and kept in Windows' secure store) — or skipped; the RR-298 form (a variable NAME) still reads,
     * and a key typed into that NAME field is refused and never stored */
    case "aiConnection": return v?.skipped === true || AI_PROVIDER_IDS.includes(v?.provider) ? null : v?.keyName !== undefined ? (/^[A-Z][A-Z0-9_]{2,63}$/.test(v.keyName) ? null : "Type the NAME of the variable (capital letters, digits and _), never the key itself.") : "Choose your AI assistant — or Skip for now.";
    case "youtube": return v?.skipped === true || (v?.handle ?? "") === "" ? null : !/^@[\w.-]{3,100}$/.test(v.handle) ? "Type the channel's @handle (for example @mychannel), or Skip for now." : v?.keyName !== undefined && !/^[A-Z][A-Z0-9_]{2,63}$/.test(v.keyName) ? "Type the NAME of the variable (capital letters, digits and _), never the key itself." : null;
    case "start": return null;
    default: return "Unknown step.";
  }
}
