/** RR-298 C · the first-run setup: the steps, one at a time, and the check of each answer (plain words when refused). Pure. */
import { chooseLanguages, LANGUAGES } from "../src/page/languages.mjs";
import { articleSettings, PUBLISH_MODE } from "../src/page/articles.mjs";

export const STEPS = Object.freeze([
  { n: 1, id: "product", title: "Your product", ask: "Its name, its website and what it does." },
  { n: 2, id: "searchData", title: "Search data", ask: "How Visibility sees your search data: 1 Search API key (your own key) · 2 Google Search Console (your own connection) · 3 Your AI search (your own AI account)." },
  { n: 3, id: "languages", title: "Languages", ask: `Which languages your pages are made in: ${LANGUAGES.map((l) => l.name).join(", ")}.` },
  { n: 4, id: "articlesPerDay", title: "Articles per day", ask: "How many articles a day (default 1; 0 pauses articles)." },
  { n: 5, id: "publishMode", title: "Publishing", ask: "Publish automatically after every gate passes (default), or show me first." },
  { n: 6, id: "aiConnection", title: "Your AI connection", ask: "The NAME of the environment variable that holds your own AI key (e.g. ANTHROPIC_API_KEY). Never type the key itself here." },
  { n: 7, id: "start", title: "Start", ask: "Check your answers and start." },
]);

/** Validate one setup answer — plain words when it is refused. */
export function checkStep(id, v) {
  switch (id) {
    case "product": return v && v.name?.trim() && /^https?:\/\/[^\s]+$/.test(v.site ?? "") && v.what?.trim() ? null : "Give the product's name, its website (https://…) and what it does.";
    case "searchData": return [1, 2, 3].includes(Number(v?.option)) ? null : "Choose option 1, 2 or 3.";
    case "languages": { const c = chooseLanguages(v?.codes ?? []); return c.valid ? null : c.faults.join("; "); }
    case "articlesPerDay": { const s = articleSettings({ articlesPerDay: Number(v?.perDay) }); return s.valid ? null : s.faults.join("; "); }
    case "publishMode": return Object.values(PUBLISH_MODE).includes(v?.mode) ? null : "Choose: publish automatically after the gates, or show me first.";
    /* a NAME only: a value that looks like a key is refused and never stored */
    case "aiConnection": return /^[A-Z][A-Z0-9_]{2,63}$/.test(v?.keyName ?? "") ? null : "Type the NAME of the variable (capital letters, digits and _), never the key itself.";
    case "start": return null;
    default: return "Unknown step.";
  }
}
