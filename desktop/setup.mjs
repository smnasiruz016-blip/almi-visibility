/** RR-298 C · the first-run setup: the steps, one at a time, and the check of each answer (plain words when refused). Pure. */
import { chooseLanguages, LANGUAGES } from "../src/page/languages.mjs";
import { articleSettings, PUBLISH_MODE } from "../src/page/articles.mjs";
import { AI_PROVIDERS } from "./secrets.mjs";
const AI_PROVIDER_IDS = AI_PROVIDERS.map((p) => p.id);

export const STEPS = Object.freeze([
  { n: 1, id: "product", title: "Your product", ask: "Its name, its website and what it does." },
  /* RR-306 A2: optional steps can be skipped ("Skip / not now") and changed later from the product's Settings; A3: a key is pasted here and kept in Windows' secure store, never as a variable name */
  { n: 2, id: "searchData", title: "Search data", optional: true, ask: "How Visibility sees your search data: 1 Search API key (your own key) · 2 Google Search Console (your own connection) · 3 Your AI search (your own AI account). You can skip this now." },
  { n: 3, id: "languages", title: "Languages", ask: `Which languages your pages are made in: ${LANGUAGES.map((l) => l.name).join(", ")}.` },
  { n: 4, id: "articlesPerDay", title: "Articles per day", ask: "How many articles a day (default 1; 0 pauses articles)." },
  { n: 5, id: "publishMode", title: "Publishing", ask: "Publish automatically after every gate passes (default), or show me first." },
  { n: 6, id: "aiConnection", title: "Your AI connection", optional: true, ask: "Choose your AI provider and paste your own AI key. It is kept in Windows' secure store on this computer. You can skip this now." },
  /* RR-302 C1: the client's own YouTube channel — optional; RR-306: the key is pasted in the app (Windows' secure store) */
  { n: 7, id: "youtube", title: "YouTube (optional)", optional: true, ask: "Your YouTube channel's @handle and your own YouTube key. Before anything is read, Visibility shows you the channel and asks if it is yours. You can skip this now." },
  { n: 8, id: "start", title: "Start", ask: "Check your answers and start." },
]);

/**
 * RR-305 B1 · a website as people type it: "www.almiworld.com" or "almiworld.com" gets https:// added; a full http(s) address is kept as
 * typed. Null when it is not a web address (spaces, no dotted name when typed without https://).
 */
export function webAddress(input) {
  const t = String(input ?? "").trim();
  if (!t || /\s/.test(t)) return null;
  if (/^https?:\/\/[^\s]+$/i.test(t)) return t;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return null;
  try { const u = new URL(`https://${t}`); return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname) ? `https://${t}` : null; } catch { return null; }
}

/** Validate one setup answer — plain words when it is refused. */
export function checkStep(id, v) {
  switch (id) {
    case "product": return v && v.name?.trim() && webAddress(v.site) && v.what?.trim() ? null : "Give the product's name, its website (for example almiworld.com) and what it does.";
    case "searchData": return v?.skipped === true || [1, 2, 3].includes(Number(v?.option)) ? null : "Choose option 1, 2 or 3 — or Skip / not now.";
    case "languages": { const c = chooseLanguages(v?.codes ?? []); return c.valid ? null : c.faults.join("; "); }
    case "articlesPerDay": { const s = articleSettings({ articlesPerDay: Number(v?.perDay) }); return s.valid ? null : s.faults.join("; "); }
    case "publishMode": return Object.values(PUBLISH_MODE).includes(v?.mode) ? null : "Choose: publish automatically after the gates, or show me first.";
    /* a NAME only: a value that looks like a key is refused and never stored */
    /* RR-306: a provider (its key pasted and kept in Windows' secure store) — or skipped; the RR-298 form (a variable NAME) still reads */
    case "aiConnection": return v?.skipped === true || AI_PROVIDER_IDS.includes(v?.provider) ? null : v?.keyName !== undefined ? (/^[A-Z][A-Z0-9_]{2,63}$/.test(v.keyName) ? null : "Type the NAME of the variable (capital letters, digits and _), never the key itself.") : "Choose your AI provider — or Skip / not now.";
    /* RR-302 C1: an empty handle skips YouTube; a handle is @name or a UC… channel id; the key's NAME only — a value that looks like a key is refused, never stored */
    /* a key typed into a NAME field (the RR-298 form, still read) is refused and never stored */
    case "youtube": return v?.skipped === true || (v?.handle ?? "") === "" ? null : !/^@[\w.-]{3,100}$/.test(v.handle) ? "Type the channel's @handle (for example @mychannel), or Skip / not now." : v?.keyName !== undefined && !/^[A-Z][A-Z0-9_]{2,63}$/.test(v.keyName) ? "Type the NAME of the variable (capital letters, digits and _), never the key itself." : null;
    case "start": return null;
    default: return "Unknown step.";
  }
}
